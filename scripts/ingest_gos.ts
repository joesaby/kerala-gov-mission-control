/**
 * ingest_gos.ts — Kerala Government Order ingestion pipeline
 *
 * Stages:
 *   1. Scrape  — fetch GO listing from document.kerala.gov.in
 *   2. Download — cache PDFs locally in .cache/pdfs/
 *   3. Extract  — extract text from PDF via uv+pypdf, then pipe to
 *                 `claude -p` (Claude Code CLI) for structured JSON output
 *                 (goNumber, type, date, subject, subjectMl)
 *   4. Tag      — map GO number suffix to dept.id (high confidence) or
 *                 keyword match (medium), else low
 *   5. Merge    — skip GOs already in the fixture; preserve hand-curated
 *                 fields (manifestoGoalIds, etc.) in existing records
 *   6. Write    — prepend new records to data/government-orders.ts;
 *                 bump SEED_VERSION in data/db.ts
 *
 * Usage:
 *   deno task ingest-gos
 *   deno task ingest-gos --since 2026-05-18
 *   deno task ingest-gos --limit 20 --dry-run
 *
 * Env:
 *   KERALA_GO_URL   override the portal listing URL (optional)
 *
 * Requires:
 *   claude CLI (Claude Code) authenticated in PATH
 *   uv (for pypdf PDF text extraction)
 */

import { parseArgs } from "@std/cli/parse-args";
import { ensureDir } from "@std/fs/ensure-dir";
import { join } from "@std/path";

import type {
  DeptTagConfidence,
  GoOrderType,
  GovernmentOrder,
} from "../data/types.ts";
import { DEPARTMENTS } from "../data/departments.ts";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const REPO_ROOT = new URL("../", import.meta.url).pathname;
const CACHE_DIR = join(REPO_ROOT, ".cache", "pdfs");
const FIXTURE_PATH = join(REPO_ROOT, "data", "government-orders.ts");
const DB_PATH = join(REPO_ROOT, "data", "db.ts");

const PORTAL_BASE = "https://document.kerala.gov.in";

// Named document sources on the Kerala portal.
// Pass --source orders,cabinet (comma-separated) to restrict; default = all.
const KNOWN_SOURCES: Record<string, { url: string; hint: string }> = {
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

const DEFAULT_SINCE = "2026-05-18"; // Satheesan cabinet sworn in
const REQUEST_DELAY_MS = 1_000;

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; KeralaGovResearchBot/1.0; public accountability dashboard)",
  "Accept-Language": "en-IN,ml-IN,en;q=0.9",
};

// ---------------------------------------------------------------------------
// Stage 1 — Scrape document listing
// ---------------------------------------------------------------------------

interface Listing {
  goNumber: string; // GO/reference number, or URL-derived key for non-GO docs
  dateStr: string; // dd-mm-yyyy
  subjectRaw: string; // text from portal title attribute
  pdfUrl: string;
}

const GO_NUMBER_RE = /G\.O\.\s*\([A-Za-z/&]+\)\s*\d+\/\d{4}\/[A-Za-z&]+/gi;

// Each document entry on the portal has a facebookcion <a> with:
//   title="[REFERENCE]-[SUBJECT]"  href1="[PDF_URL]"
// This pattern is consistent across orders, cabinet, circulars, and RTS pages.
const ENTRY_RE =
  /title="(\s*[^"]{5,}?)\s*"\s+href1="(https?:\/\/document\.kerala\.gov\.in\/documents\/[^"]+\.pdf)"\s+[^>]*class="facebookcion"/gis;

// Date in the calendar-day div that appears before each entry
const CALENDAR_DATE_RE = /calendar-day[^;]*?&nbsp;(\d{2}-\d{2}-\d{4})/gi;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

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

async function scrapeListings(
  listUrl: string,
  since: string,
): Promise<Listing[]> {
  console.error(`[1] Fetching listing: ${listUrl}`);
  const html = await (await politeGet(listUrl)).text();

  // Build ordered list of date positions for backwards lookup
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

    // Find the nearest calendar-day date before this entry
    let dateStr = "";
    for (let i = datePosMap.length - 1; i >= 0; i--) {
      if (datePosMap[i].pos < m.index) {
        dateStr = datePosMap[i].dateStr;
        break;
      }
    }
    if (!dateStr) continue;

    // Date filter
    if (toIso(dateStr) < since) continue;

    const titleRaw = decodeHtmlEntities(m[1].trim());

    // Extract GO number if present; else use reference from title or URL
    GO_NUMBER_RE.lastIndex = 0;
    const goMatch = GO_NUMBER_RE.exec(titleRaw);
    const goNumber = goMatch
      ? goMatch[0].trim()
      : (titleRaw.split(/\s{2,}/)[0].slice(0, 80).trim() ||
        pdfUrl.split("/").pop()!.replace(/[?#].*$/, ""));

    results.push({
      goNumber,
      dateStr,
      subjectRaw: titleRaw,
      pdfUrl,
    });
  }

  // Sort newest first
  results.sort((a, b) => toIso(b.dateStr).localeCompare(toIso(a.dateStr)));

  console.error(`[1] Found ${results.length} docs on or after ${since}`);
  return results;
}

// ---------------------------------------------------------------------------
// Stage 2 — Download PDFs
// ---------------------------------------------------------------------------

async function downloadPdf(pdfUrl: string): Promise<string | null> {
  await ensureDir(CACHE_DIR);
  const filename = pdfUrl.split("/").pop()!.split("?")[0];
  const localPath = join(CACHE_DIR, filename);

  try {
    await Deno.stat(localPath);
    return localPath; // already cached
  } catch {
    // not cached yet
  }

  console.error(`  [2] Downloading ${filename} …`);
  try {
    const r = await politeGet(pdfUrl);
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.includes("pdf")) {
      console.error(`  [2] Not a PDF (${ct}) — skipping`);
      return null;
    }
    await Deno.writeFile(localPath, new Uint8Array(await r.arrayBuffer()));
    return localPath;
  } catch (e) {
    console.error(`  [2] Download failed: ${e}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Stage 3 — Claude PDF extraction
// ---------------------------------------------------------------------------

interface Extracted {
  goNumber: string;
  type: GoOrderType;
  date: string; // YYYY-MM-DD
  subject: string | null;
  subjectMl: string | null;
}

const EXTRACT_PROMPT_BASE = `\
You are a structured data extractor for Kerala government documents.
Documents may be in Malayalam only, English only, or bilingual.
Extract fields exactly as they appear; never invent or paraphrase content.

Return ONLY a valid JSON object with these exact keys:
  goNumber   – document/order number as printed, or null if absent
  type       – one of: "P" | "Ms" | "Rt" | "SRO" | "Circular" | "Bill" | "Cabinet"
  date       – ISO date "YYYY-MM-DD" (Kerala uses dd/mm/yyyy or dd-mm-yyyy)
  subject    – English subject/title line, or null if only Malayalam is present
  subjectMl  – Malayalam subject/title in Unicode, or null if not present

Type mapping:
  G.O.(P)          → "P"        (Policy order)
  G.O.(Ms)         → "Ms"       (Memo / Subordinate)
  G.O.(Rt)         → "Rt"       (Routine / Routing)
  S.R.O.           → "SRO"      (Statutory Rules & Orders)
  Circular         → "Circular"
  Bill             → "Bill"
  Cabinet Decision → "Cabinet"

The subject is the main heading near the top of the document,
often after "Subject:" or "വിഷയം:".
If only Malayalam is present, return subjectMl and null for subject.`;

function buildPrompt(
  hint: string,
  pdfText: string,
  fallback: { goNumber: string; dateStr: string; subjectRaw: string },
): string {
  const cleanFallback = cleanPortalHtml(fallback.subjectRaw);
  return [
    EXTRACT_PROMPT_BASE,
    `Document source: ${hint}`,
    "",
    pdfText
      ? `PDF text (first 8000 chars):\n${pdfText.slice(0, 8000)}`
      : "No PDF text available — use fallback values.",
    "",
    `Fallback document number: ${fallback.goNumber}`,
    `Fallback date: ${fallback.dateStr}`,
    `Fallback subject from portal: ${cleanFallback}`,
    "",
    "Return ONLY a JSON object.",
  ].join("\n");
}

async function extractPdfText(pdfPath: string): Promise<string> {
  const script = "import pypdf, sys; r=pypdf.PdfReader(sys.argv[1]); " +
    'print("\\n".join(p.extract_text() or "" for p in r.pages))';
  const result = await new Deno.Command("uv", {
    args: ["run", "--with", "pypdf", "python", "-c", script, pdfPath],
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!result.success) return "";
  return new TextDecoder().decode(result.stdout).trim();
}

function cleanPortalHtml(s: string): string {
  return s.replace(/[">]|&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

async function claudeExtract(
  pdfPath: string | null,
  fallback: { goNumber: string; dateStr: string; subjectRaw: string },
  hint: string,
): Promise<Extracted> {
  let pdfText = "";
  if (pdfPath) {
    try {
      pdfText = await extractPdfText(pdfPath);
    } catch (e) {
      console.error(`  [3] PDF text extraction failed: ${e}`);
    }
  }

  const cleanFallback = cleanPortalHtml(fallback.subjectRaw);
  const prompt = buildPrompt(hint, pdfText, fallback);

  try {
    const result = await new Deno.Command("claude", {
      args: ["-p", prompt, "--model", "claude-haiku-4-5-20251001"],
      stdout: "piped",
      stderr: "piped",
    }).output();

    const raw = new TextDecoder().decode(result.stdout).trim();
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("No JSON in output");
    }
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

    return {
      goNumber: parsed.goNumber || fallback.goNumber,
      type: parsed.type || inferType(fallback.goNumber, hint),
      date: parsed.date || toIso(fallback.dateStr),
      subject: parsed.subject || null,
      subjectMl: parsed.subjectMl || null,
    };
  } catch (e) {
    console.error(`  [3] claude CLI extraction failed: ${e} — using fallbacks`);
    return {
      goNumber: fallback.goNumber,
      type: inferType(fallback.goNumber, hint),
      date: toIso(fallback.dateStr),
      subject: cleanFallback || null,
      subjectMl: null,
    };
  }
}

function toIso(ddmmyyyy: string): string {
  const parts = ddmmyyyy.split(/[-/]/);
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${
      parts[0].padStart(2, "0")
    }`;
  }
  return ddmmyyyy;
}

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

// ---------------------------------------------------------------------------
// Stage 4 — Department tagging
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

// ---------------------------------------------------------------------------
// Stage 5 — ID generation
// ---------------------------------------------------------------------------

function generateId(
  goNumber: string,
  type: GoOrderType,
  dateIso: string,
  index: number,
): string {
  const year = dateIso.slice(0, 4);
  const segments = goNumber.split("/");
  const suffix = segments[segments.length - 1]?.trim().toLowerCase();
  const numMatch = goNumber.match(/No\.(\d+)/i);
  const num = numMatch ? numMatch[1] : String(index);
  if (suffix && DEPT_CODE_MAP[suffix]) return `go.${year}-${suffix}-${num}`;
  if (type === "Bill") return `go.${year}-bill-${num}`;
  return `go.${year}-misc-${num}`;
}

// ---------------------------------------------------------------------------
// Stage 6 — Load existing fixture for idempotent merge
// ---------------------------------------------------------------------------

function loadExistingKeys(fixturePath: string): Set<string> {
  try {
    const text = Deno.readTextFileSync(fixturePath);
    const goNums = [...text.matchAll(/"goNumber":\s*"([^"]+)"/g)].map((m) =>
      m[1]
    );
    const urls = [...text.matchAll(/"sourceUrl":\s*"([^"]+)"/g)].map((m) =>
      m[1]
    );
    return new Set([...goNums, ...urls]);
  } catch {
    return new Set();
  }
}

// ---------------------------------------------------------------------------
// Stage 7 — Render TypeScript fixture records
// ---------------------------------------------------------------------------

function ts(v: string | null | undefined): string {
  if (v == null) return "undefined";
  return JSON.stringify(v);
}

function renderRecord(r: GovernmentOrder): string {
  const lines: string[] = ["  {"];
  lines.push(`    id: ${ts(r.id)},`);
  lines.push(`    goNumber: ${ts(r.goNumber)},`);
  lines.push(`    type: ${ts(r.type)},`);
  lines.push(`    subject: ${ts(r.subject)},`);
  if (r.subjectMl) lines.push(`    subjectMl: ${ts(r.subjectMl)},`);
  if (r.deptId) lines.push(`    deptId: ${ts(r.deptId)},`);
  lines.push(`    deptConfidence: ${ts(r.deptConfidence)},`);
  lines.push(`    date: ${ts(r.date)},`);
  if (r.manifestoGoalIds?.length) {
    const arr = r.manifestoGoalIds.map((g) => `"${g}"`).join(", ");
    lines.push(`    manifestoGoalIds: [${arr}],`);
    if (r.manifestoConfidence) {
      lines.push(`    manifestoConfidence: ${ts(r.manifestoConfidence)},`);
    }
  }
  lines.push(`    meta: {`);
  lines.push(`      source: ${ts(r.meta.source)},`);
  lines.push(`      sourceUrl: ${ts(r.meta.sourceUrl)},`);
  lines.push(`      retrievedAt: ${ts(r.meta.retrievedAt)},`);
  lines.push(`    },`);
  lines.push(`    dataStatus: "verified",`);
  lines.push(`  },`);
  return lines.join("\n");
}

const FIXTURE_HEADER = `import type { GovernmentOrder } from "./types.ts";

/**
 * Ingested Kerala Government Orders, Circulars, and Legislative Bills.
 * Generated by \`deno task ingest-gos\` — do not edit manually.
 *
 * Every record carries meta.sourceUrl — a verified link to the PDF on the
 * official Kerala Government Document Portal (document.kerala.gov.in).
 *
 * IDs: go.<year>-<deptCode>-<number>
 */
export const GOVERNMENT_ORDERS: GovernmentOrder[] = [
`;

// ---------------------------------------------------------------------------
// Stage 8 — Bump SEED_VERSION
// ---------------------------------------------------------------------------

function bumpSeedVersion(dbPath: string): void {
  let text = Deno.readTextFileSync(dbPath);
  const m = text.match(/const SEED_VERSION = (\d+);/);
  if (!m) {
    console.error("[8] Could not locate SEED_VERSION in db.ts");
    return;
  }
  const next = Number(m[1]) + 1;
  text = text.replace(
    /const SEED_VERSION = \d+;/,
    `const SEED_VERSION = ${next};`,
  );
  Deno.writeTextFileSync(dbPath, text);
  console.error(`[8] SEED_VERSION bumped to ${next}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const args = parseArgs(Deno.args, {
  string: ["since", "limit", "source"],
  boolean: ["dry-run", "help"],
  default: { since: DEFAULT_SINCE },
});

if (args.help) {
  const sourceNames = Object.keys(KNOWN_SOURCES).join(", ");
  console.log(`
deno task ingest-gos [options]

  --since YYYY-MM-DD        Only include docs on or after this date (default: ${DEFAULT_SINCE})
  --limit N                 Process at most N new documents total
  --source <name[,name]>    Sources to scrape: ${sourceNames}
                            Default: all sources
  --dry-run                 Skip downloads and fixture write; print what would change
  --help                    Show this help
  `);
  Deno.exit(0);
}

const since = args.since as string;
const limit = args.limit ? Number(args.limit) : undefined;
const dryRun = args["dry-run"] as boolean;

// Resolve which sources to process
const sourceArg = args.source as string | undefined;
const selectedSources = sourceArg
  ? sourceArg.split(",").map((s) => s.trim()).filter((s) => s in KNOWN_SOURCES)
  : Object.keys(KNOWN_SOURCES);

if (selectedSources.length === 0) {
  console.error(
    `[!] No valid sources. Choose from: ${
      Object.keys(KNOWN_SOURCES).join(", ")
    }`,
  );
  Deno.exit(1);
}

// Load existing keys once (goNumbers + sourceUrls, shared dedup across sources)
const existingKeys = loadExistingKeys(FIXTURE_PATH);
const newRecords: GovernmentOrder[] = [];
let globalIndex = 0;

for (const sourceName of selectedSources) {
  const { url, hint } = KNOWN_SOURCES[sourceName];
  console.error(`\n[source: ${sourceName}] ${hint}`);

  // Stage 1: scrape
  const listings = await scrapeListings(url, since);
  if (listings.length === 0) {
    console.error(`  [!] No listings found — skipping`);
    continue;
  }

  const remaining = limit ? limit - newRecords.length : undefined;
  const scoped = remaining !== undefined
    ? listings.slice(0, remaining)
    : listings;
  const newListings = scoped.filter(
    (l) => !existingKeys.has(l.goNumber) && !existingKeys.has(l.pdfUrl),
  );

  console.error(
    `  [+] ${newListings.length} new docs to process ` +
      `(${scoped.length - newListings.length} already in fixture)`,
  );

  // Stages 2–4: download + Claude extract + tag
  for (const listing of newListings) {
    if (limit && newRecords.length >= limit) break;
    console.error(`\n  → ${listing.goNumber} (${listing.dateStr})`);

    const pdfPath = dryRun ? null : await downloadPdf(listing.pdfUrl);

    const extracted = await claudeExtract(pdfPath, {
      goNumber: listing.goNumber,
      dateStr: listing.dateStr,
      subjectRaw: listing.subjectRaw,
    }, hint);

    if (!extracted.subject && !extracted.subjectMl) {
      console.error("  [!] No subject — skipping");
      continue;
    }

    const { deptId, deptConfidence } = tagDepartment(
      extracted.goNumber,
      extracted.subject ?? extracted.subjectMl ?? "",
    );

    globalIndex++;
    const id = generateId(
      extracted.goNumber,
      extracted.type,
      extracted.date,
      globalIndex,
    );

    existingKeys.add(extracted.goNumber); // prevent cross-source dupes
    existingKeys.add(listing.pdfUrl);
    newRecords.push({
      id,
      goNumber: extracted.goNumber,
      type: extracted.type,
      subject: extracted.subject ?? extracted.subjectMl ?? "",
      subjectMl: extracted.subjectMl ?? undefined,
      deptId,
      deptConfidence,
      date: extracted.date,
      meta: {
        source: "Document Portal, Government of Kerala",
        sourceUrl: listing.pdfUrl,
        retrievedAt: new Date().toISOString(),
      },
      dataStatus: "verified",
    });
  }
}

if (newRecords.length === 0) {
  console.error("[!] No records extracted.");
  Deno.exit(1);
}

if (dryRun) {
  console.log("\n[DRY RUN] Would add these records:");
  for (const r of newRecords) {
    console.log(`  ${r.id}  |  ${r.goNumber}  |  ${r.date}`);
    if (r.subject) console.log(`  subject:   ${r.subject}`);
    if (r.subjectMl) console.log(`  subjectMl: ${r.subjectMl}`);
  }
  Deno.exit(0);
}

// Stage 7: merge into fixture — prepend new records (newest first)
const existingText = await Deno.readTextFile(FIXTURE_PATH).catch(() => "");
const existingBodyMatch = existingText.match(
  /export const GOVERNMENT_ORDERS[^=]+=\s*\[([\s\S]*?)\];/,
);
const existingBody = existingBodyMatch?.[1]?.trim() ?? "";

const newBody = newRecords.map(renderRecord).join("\n");
const combined = existingBody ? `${newBody}\n${existingBody}` : newBody;

await Deno.writeTextFile(
  FIXTURE_PATH,
  FIXTURE_HEADER + combined + "\n];\n",
);
console.error(
  `[7] Wrote ${newRecords.length} new records → ${FIXTURE_PATH}`,
);

// Stage 8: bump SEED_VERSION
bumpSeedVersion(DB_PATH);

console.error(`\n✓ Done — ${newRecords.length} new GOs ingested.`);
