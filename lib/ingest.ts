/**
 * ingest.ts — Kerala Government Order ingestion core (runtime-safe).
 *
 * Pipeline (all `fetch` + Deno KV — runs on Deno Deploy, no subprocess/fs):
 *   1. Scrape   — fetch GO listings from document.kerala.gov.in
 *   2. Download — fetch each PDF's bytes
 *   3. Extract  — Gemini reads the PDF natively → goNumber/type/date/subject(+Ml)
 *                 AND maps it to a manifesto goal in the SAME call (saves quota)
 *   4. Tag      — GO-number suffix → dept.id (high), else keyword (medium/low)
 *   5. Persist  — putIngestedGovernmentOrder (KV + durable mirror), dedup vs KV
 *   6. Record   — write IngestStatus for the status page
 *
 * Used by both the daily Deno.cron (lib/cron.ts) and the manual CLI
 * (scripts/ingest_gos.ts).
 */

import type {
  DeptTagConfidence,
  GoOrderType,
  GovernmentOrder,
  ManifestoGoal,
} from "../data/types.ts";
import { DEPARTMENTS } from "../data/departments.ts";
import {
  appendIngestRun,
  type IngestStatus,
  listGovernmentOrderKeys,
  listManifestoGoals,
  putIngestedGovernmentOrder,
  setIngestLog,
  setIngestStatus,
} from "../data/db.ts";
import {
  geminiExtractFromPdf,
  geminiModel,
  parseJsonObject,
} from "./gemini.ts";
import { groqExtractFromPdf, groqKey, groqModel } from "./groq.ts";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORTAL_BASE = "https://document.kerala.gov.in";

/** Default earliest date — Satheesan cabinet sworn in 18 May 2026. */
export const DEFAULT_SINCE = "2026-05-18";
const REQUEST_DELAY_MS = 1_000;

export const KNOWN_SOURCES: Record<string, { url: string; hint: string }> = {
  orders: {
    url: `${PORTAL_BASE}/documentdetails/en/dDVtK21nV2l6c0RxcCtWTC9oTGcvZz09`,
    hint: "Kerala Government Orders (G.O.)",
  },
  cabinet: {
    url: `${PORTAL_BASE}/documentdetails/en/eHcyeDczNDR5WEtGRnlEbDg4NWlNQT09`,
    hint: "Kerala Cabinet Decisions",
  },
  circulars: {
    url: `${PORTAL_BASE}/documentdetails/en/TGxDdnM3eTYwSE0zanV1Tm53UW1EQT09`,
    hint: "Kerala Government Circulars",
  },
  rts: {
    url: `${PORTAL_BASE}/documentdetails/en/V0xnSVVqcm15MWpOZjF2MWJEcHVRdz09`,
    hint: "Kerala RTS (Right to Service) documents",
  },
};

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; KeralaGovResearchBot/1.0; public accountability dashboard)",
  "Accept-Language": "en-IN,ml-IN,en;q=0.9",
};

// ---------------------------------------------------------------------------
// Scrape
// ---------------------------------------------------------------------------

interface Listing {
  goNumber: string;
  dateStr: string; // dd-mm-yyyy
  subjectRaw: string;
  pdfUrl: string;
}

const GO_NUMBER_RE = /G\.O\.\s*\([A-Za-z/&]+\)\s*\d+\/\d{4}\/[A-Za-z&]+/gi;
const ENTRY_RE =
  /title="(\s*[^"]{5,}?)\s*"\s+href1="(https?:\/\/document\.kerala\.gov\.in\/documents\/[^"]+\.pdf)"\s+[^>]*class="facebookcion"/gis;
const CALENDAR_DATE_RE = /calendar-day[^;]*?&nbsp;(\d{2}-\d{2}-\d{4})/gi;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function politeGet(url: string): Promise<Response> {
  await sleep(REQUEST_DELAY_MS);
  const r = await fetch(url, { headers: FETCH_HEADERS });
  if (!r.ok) throw new Error(`HTTP ${r.status} fetching ${url}`);
  return r;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function toIso(ddmmyyyy: string): string {
  const parts = ddmmyyyy.split(/[-/]/);
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${
      parts[0].padStart(2, "0")
    }`;
  }
  return ddmmyyyy;
}

async function scrapeListings(
  listUrl: string,
  since: string,
  log: (m: string) => void,
): Promise<Listing[]> {
  log(`[1] Fetching listing: ${listUrl}`);
  const html = await (await politeGet(listUrl)).text();

  const datePosMap: Array<{ pos: number; dateStr: string }> = [];
  CALENDAR_DATE_RE.lastIndex = 0;
  let dm: RegExpExecArray | null;
  while ((dm = CALENDAR_DATE_RE.exec(html)) !== null) {
    datePosMap.push({ pos: dm.index, dateStr: dm[1] });
  }

  const results: Listing[] = [];
  const seenUrls = new Set<string>();

  ENTRY_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ENTRY_RE.exec(html)) !== null) {
    const pdfUrl = m[2];
    if (seenUrls.has(pdfUrl)) continue;
    seenUrls.add(pdfUrl);

    let dateStr = "";
    for (let i = datePosMap.length - 1; i >= 0; i--) {
      if (datePosMap[i].pos < m.index) {
        dateStr = datePosMap[i].dateStr;
        break;
      }
    }
    if (!dateStr) continue;
    if (toIso(dateStr) < since) continue;

    const titleRaw = decodeHtmlEntities(m[1].trim());
    GO_NUMBER_RE.lastIndex = 0;
    const goMatch = GO_NUMBER_RE.exec(titleRaw);
    const goNumber = goMatch
      ? goMatch[0].trim()
      : (titleRaw.split(/\s{2,}/)[0].slice(0, 80).trim() ||
        pdfUrl.split("/").pop()!.replace(/[?#].*$/, ""));

    results.push({ goNumber, dateStr, subjectRaw: titleRaw, pdfUrl });
  }

  results.sort((a, b) => toIso(b.dateStr).localeCompare(toIso(a.dateStr)));
  log(`[1] Found ${results.length} docs on or after ${since}`);
  return results;
}

// ---------------------------------------------------------------------------
// Gemini extraction + manifesto mapping (single call)
// ---------------------------------------------------------------------------

interface Extracted {
  goNumber: string;
  type: GoOrderType;
  date: string;
  subject: string | null;
  subjectMl: string | null;
  manifestoGoalId: string | null;
  manifestoConfidence: "direct" | "supporting" | "weak" | null;
}

function cleanPortalHtml(s: string): string {
  return s.replace(/[">]|&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function buildPrompt(
  hint: string,
  fallback: Listing,
  goals: ManifestoGoal[],
): string {
  const goalLines = goals
    .map((g) => `  ${g.id} :: ${g.title}${g.summary ? ` — ${g.summary}` : ""}`)
    .join("\n");
  return `You are a structured data extractor for Kerala government documents.
Documents may be Malayalam-only, English-only, or bilingual.
Extract fields exactly as printed; never invent or paraphrase content.

Return ONLY a JSON object with these exact keys:
  goNumber             - document/order number as printed, or null
  type                 - one of: "P" | "Ms" | "Rt" | "SRO" | "Circular" | "Bill" | "Cabinet"
  date                 - ISO "YYYY-MM-DD"
  subject              - English subject/title line, or null if only Malayalam
  subjectMl            - Malayalam subject/title (Unicode), or null if not present
  manifestoGoalId      - the id of the ONE manifesto goal this order most directly
                         implements or supports, or null if none genuinely apply
  manifestoConfidence  - "direct" (the order enacts the pledge), "supporting"
                         (a related/enabling step), "weak" (tangential), or null

Type mapping: G.O.(P)->"P", G.O.(Ms)->"Ms", G.O.(Rt)->"Rt", S.R.O.->"SRO",
Circular->"Circular", Bill->"Bill", Cabinet Decision->"Cabinet".

Be strict about manifesto mapping: only set manifestoGoalId when the order has a
genuine substantive connection to that pledge. Routine administrative orders
(transfers, leave, fund release for unrelated bodies) map to null. When unsure,
return null.

Manifesto goals (id :: title — summary):
${goalLines}

Document source: ${hint}
Fallback document number: ${fallback.goNumber}
Fallback date: ${fallback.dateStr}
Fallback subject from portal: ${cleanPortalHtml(fallback.subjectRaw)}

Return ONLY the JSON object.`;
}

const VALID_TYPES = new Set<GoOrderType>([
  "P",
  "Ms",
  "Rt",
  "SRO",
  "Circular",
  "Bill",
  "Cabinet",
]);
const VALID_CONF = new Set(["direct", "supporting", "weak"]);

function inferType(goNumber: string, hint = ""): GoOrderType {
  if (hint.toLowerCase().includes("cabinet")) return "Cabinet";
  if (hint.toLowerCase().includes("circular")) return "Circular";
  const s = goNumber.toLowerCase();
  if (s.includes("(p)")) return "P";
  if (s.includes("(ms)")) return "Ms";
  if (s.includes("(rt)")) return "Rt";
  if (s.includes("s.r.o") || s.includes("sro")) return "SRO";
  if (s.includes("circular")) return "Circular";
  if (s.includes("bill")) return "Bill";
  return "Rt";
}

async function geminiExtract(
  pdfBytes: Uint8Array,
  fallback: Listing,
  hint: string,
  goals: ManifestoGoal[],
  goalIds: Set<string>,
  log?: (m: string) => void,
): Promise<{ extracted: Extracted; usedGroq: boolean }> {
  const prompt = buildPrompt(hint, fallback, goals);
  let raw: string;
  let usedGroq = false;
  try {
    raw = await geminiExtractFromPdf(pdfBytes, prompt);
  } catch (geminiErr) {
    if (!groqKey()) throw geminiErr;
    const msg = geminiErr instanceof Error
      ? geminiErr.message
      : String(geminiErr);
    log?.(`    [Gemini failed, falling back to GROQ] ${msg}`);
    raw = await groqExtractFromPdf(pdfBytes, prompt);
    usedGroq = true;
  }
  const p = parseJsonObject<Record<string, unknown>>(raw);

  const type = VALID_TYPES.has(p.type as GoOrderType)
    ? p.type as GoOrderType
    : inferType(fallback.goNumber, hint);

  // Only accept a mapping the model returned that is a real goal id.
  const mappedId = typeof p.manifestoGoalId === "string" &&
      goalIds.has(p.manifestoGoalId)
    ? p.manifestoGoalId
    : null;
  const conf = mappedId && VALID_CONF.has(p.manifestoConfidence as string)
    ? p.manifestoConfidence as "direct" | "supporting" | "weak"
    : (mappedId ? "supporting" : null);

  return {
    extracted: {
      goNumber: (p.goNumber as string) || fallback.goNumber,
      type,
      date: (p.date as string) || toIso(fallback.dateStr),
      subject: (p.subject as string) || null,
      subjectMl: (p.subjectMl as string) || null,
      manifestoGoalId: mappedId,
      manifestoConfidence: conf,
    },
    usedGroq,
  };
}

// ---------------------------------------------------------------------------
// Department tagging + id generation
// ---------------------------------------------------------------------------

const DEPT_CODE_MAP: Record<string, string> = {
  "fin": "dept.finance",
  "rev": "dept.revenue",
  "h&fwd": "dept.health-family-welfare",
  "hfwd": "dept.health-family-welfare",
  "hfw": "dept.health-family-welfare",
  "gad": "dept.cmo",
  "gen": "dept.cmo",
  "clad": "dept.cmo",
  "lsg": "dept.local-self-government",
  "edu": "dept.general-education",
  "gedn": "dept.general-education",
  "hedn": "dept.higher-education",
  "home": "dept.home",
  "pwd": "dept.public-works",
  "tran": "dept.transport",
  "trans": "dept.transport",
  "lab": "dept.labour-skills",
  "for": "dept.forest-wildlife",
  "ind": "dept.industries-commerce",
  "agri": "dept.agriculture-farmers-welfare",
  "coop": "dept.cooperation",
  "fish": "dept.fisheries-harbour",
  "pwr": "dept.power",
  "elec": "dept.power",
  "wr": "dept.water-resources",
  "irr": "dept.water-resources",
  "sc/st": "dept.scheduled-castes-tribes-bcd",
  "scstbcd": "dept.scheduled-castes-tribes-bcd",
  "wcd": "dept.women-child-development",
  "tur": "dept.tourism",
  "vig": "dept.vigilance",
  "exc": "dept.excise",
  "taxes": "dept.excise",
  "plan": "dept.planning-economic-affairs",
  "dev": "dept.devaswom",
  "devaswom": "dept.devaswom",
  "min": "dept.minority-welfare",
  "it": "dept.electronics-it",
  "ict": "dept.electronics-it",
  "cult": "dept.cultural-affairs",
  "port": "dept.ports",
  "yth": "dept.youth-welfare",
  "law": "dept.law",
};

function tagDepartment(
  goNumber: string,
  subject: string,
): { deptId?: string; deptConfidence: DeptTagConfidence } {
  const segments = goNumber.split("/");
  const suffix = segments[segments.length - 1]?.trim().toLowerCase();
  if (suffix && DEPT_CODE_MAP[suffix]) {
    return { deptId: DEPT_CODE_MAP[suffix], deptConfidence: "high" };
  }
  const subjectLower = subject.toLowerCase();
  for (const dept of DEPARTMENTS) {
    if (
      subjectLower.includes(dept.name.toLowerCase()) ||
      (dept.nameMl && subjectLower.includes(dept.nameMl.toLowerCase()))
    ) {
      return { deptId: dept.id, deptConfidence: "medium" };
    }
  }
  return { deptConfidence: "low" };
}

function generateId(
  goNumber: string,
  type: GoOrderType,
  dateIso: string,
  index: number,
): string {
  const year = dateIso.slice(0, 4);
  const segments = goNumber.split("/");
  const suffix = segments[segments.length - 1]?.trim().toLowerCase();
  // Serial number: prefer "No.162", else the digits right before "/YYYY/"
  // (handles "G.O. (M/S)11/2026/SJD"), else fall back to the run index.
  const numMatch = goNumber.match(/No\.?\s*(\d+)/i) ??
    goNumber.match(/(\d+)\s*\/\s*(?:19|20)\d{2}\b/);
  const num = numMatch ? numMatch[1] : String(index);
  if (suffix && DEPT_CODE_MAP[suffix]) return `go.${year}-${suffix}-${num}`;
  if (type === "Bill") return `go.${year}-bill-${num}`;
  return `go.${year}-misc-${num}`;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export interface IngestOptions {
  since?: string;
  /** Max new documents to process this run (quota guard). */
  limit?: number;
  /** Which KNOWN_SOURCES to scrape. Default: all. */
  sources?: string[];
  trigger?: "cron" | "manual";
  /** Extract + map but do not persist to KV or record status. */
  dryRun?: boolean;
  log?: (m: string) => void;
}

const MAX_ERRORS = 25;

/**
 * Run the ingest. Scrapes the selected sources, processes new documents through
 * Gemini, writes them to KV, and records an IngestStatus. Returns the status.
 */
export async function runIngest(
  opts: IngestOptions = {},
): Promise<IngestStatus> {
  const since = opts.since ?? DEFAULT_SINCE;
  const limit = opts.limit;
  const trigger = opts.trigger ?? "manual";
  const logLines: string[] = [];
  const log = (m: string) => {
    logLines.push(m);
    opts.log?.(m);
  };
  const sources =
    (opts.sources?.length ? opts.sources : Object.keys(KNOWN_SOURCES))
      .filter((s) => s in KNOWN_SOURCES);

  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  const addedIds: string[] = [];
  let scanned = 0;
  let skipped = 0;

  // Dedup keys + manifesto goals (one read each).
  const keys = await listGovernmentOrderKeys();
  const seenGoNumbers = new Set(keys.goNumbers);
  const seenUrls = new Set(keys.sourceUrls);
  const goals = await listManifestoGoals();
  const goalIds = new Set(goals.map((g) => g.id));

  let runOk = true;
  let groqFallbackUsed = false;
  try {
    for (const sourceName of sources) {
      const { url, hint } = KNOWN_SOURCES[sourceName];
      log(`\n[source: ${sourceName}] ${hint}`);

      const listings = await scrapeListings(url, since, log);
      scanned += listings.length;

      for (const listing of listings) {
        if (limit !== undefined && addedIds.length >= limit) break;
        if (
          seenGoNumbers.has(listing.goNumber) || seenUrls.has(listing.pdfUrl)
        ) {
          skipped++;
          continue;
        }

        log(`\n  → ${listing.goNumber} (${listing.dateStr})`);
        try {
          // Download PDF bytes.
          const r = await politeGet(listing.pdfUrl);
          const ct = r.headers.get("content-type") ?? "";
          if (!ct.includes("pdf")) {
            throw new Error(`not a PDF (content-type: ${ct || "unknown"})`);
          }
          const pdfBytes = new Uint8Array(await r.arrayBuffer());

          const { extracted: ex, usedGroq } = await geminiExtract(
            pdfBytes,
            listing,
            hint,
            goals,
            goalIds,
            log,
          );
          if (usedGroq) groqFallbackUsed = true;
          if (!ex.subject && !ex.subjectMl) {
            throw new Error("no subject extracted");
          }

          const subject = ex.subject ?? ex.subjectMl ?? "";
          const { deptId, deptConfidence } = tagDepartment(
            ex.goNumber,
            subject,
          );
          const id = generateId(ex.goNumber, ex.type, ex.date, scanned);

          const record: GovernmentOrder = {
            id,
            goNumber: ex.goNumber,
            type: ex.type,
            subject,
            subjectMl: ex.subjectMl ?? undefined,
            deptId,
            deptConfidence,
            date: ex.date,
            manifestoGoalIds: ex.manifestoGoalId
              ? [ex.manifestoGoalId]
              : undefined,
            manifestoConfidence: ex.manifestoConfidence ?? undefined,
            meta: {
              source: "Document Portal, Government of Kerala",
              sourceUrl: listing.pdfUrl,
              retrievedAt: new Date().toISOString(),
            },
            dataStatus: "verified",
          };

          if (!opts.dryRun) await putIngestedGovernmentOrder(record);
          seenGoNumbers.add(ex.goNumber);
          seenUrls.add(listing.pdfUrl);
          addedIds.push(id);
          log(
            `    ✓ ${id}${
              ex.manifestoGoalId
                ? ` → ${ex.manifestoGoalId} (${ex.manifestoConfidence})`
                : ""
            }`,
          );
        } catch (e) {
          const msg = `${listing.goNumber}: ${
            e instanceof Error ? e.message : e
          }`;
          if (errors.length < MAX_ERRORS) errors.push(msg);
          log(`    ✗ ${msg}`);
        }
      }
    }
  } catch (e) {
    runOk = false;
    const msg = e instanceof Error ? e.message : String(e);
    if (errors.length < MAX_ERRORS) errors.push(`run aborted: ${msg}`);
    log(`[!] run aborted: ${msg}`);
  }

  const status: IngestStatus = {
    startedAt,
    finishedAt: new Date().toISOString(),
    ok: runOk,
    trigger,
    model: groqFallbackUsed
      ? `${geminiModel()}+groq-fallback(${groqModel()})`
      : geminiModel(),
    scanned,
    added: addedIds.length,
    skipped,
    errors,
    addedIds,
  };
  log(
    `\n✓ Done — ${status.added} added, ${status.skipped} skipped, ${status.errors.length} errors.`,
  );
  if (!opts.dryRun) {
    await setIngestStatus(status);
    await appendIngestRun(status);
    await setIngestLog({
      finishedAt: status.finishedAt,
      trigger,
      lines: logLines,
    });
  }
  return status;
}
