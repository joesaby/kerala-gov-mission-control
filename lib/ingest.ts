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
  Appointment,
  AppointmentAction,
  AppointmentBranch,
  DeptTagConfidence,
  GoOrderType,
  GoReference,
  GoRelation,
  GovernmentOrder,
  ManifestoGoal,
  TranslationStatus,
} from "../data/types.ts";
import { DEPARTMENTS } from "../data/departments.ts";
import { PERSONS } from "../data/persons.ts";
import {
  appendIngestRun,
  type IngestStatus,
  listGovernmentOrderKeys,
  listGovernmentOrders,
  listManifestoGoals,
  putIngestedAppointment,
  putIngestedGovernmentOrder,
  setIngestLog,
  setIngestStatus,
} from "../data/db.ts";
import {
  geminiExtractFromPdf,
  geminiGenerate,
  geminiModel,
  parseJsonObject,
} from "./gemini.ts";
import {
  groqExtractFromPdf,
  groqGenerate,
  groqKey,
  groqModel,
} from "./groq.ts";
import {
  nvidiaExtractFromPdf,
  nvidiaGenerate,
  nvidiaKey,
  nvidiaModel,
} from "./nvidia.ts";

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

interface ExtractedAppointment {
  appointeeName: string | null;
  appointeeNameMl: string | null;
  office: string | null;
  officeMl: string | null;
  branch: AppointmentBranch | null;
  action: AppointmentAction | null;
  court: string | null;
  courtMl: string | null;
  effectiveDate: string | null;
}

/** One GO citation as returned by the extractor, before id resolution. */
interface ExtractedRef {
  goNumber: string;
  relation: GoRelation;
  note: string | null;
  noteMl: string | null;
}

interface Extracted {
  goNumber: string;
  type: GoOrderType;
  date: string;
  subject: string | null;
  subjectMl: string | null;
  summary: string | null;
  summaryMl: string | null;
  manifestoGoalId: string | null;
  manifestoConfidence: "direct" | "supporting" | "weak" | null;
  /** Semantic class — "appointment" GOs carry `appointments`. */
  category: "appointment" | "general";
  /** One row per appointee for appointment GOs; null/[] otherwise. */
  appointments: ExtractedAppointment[] | null;
  /** Other GOs this document cites in its body; [] when none. */
  references: ExtractedRef[];
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
  return `You are a structured data extractor and translator for Kerala government documents.
Most of these documents are Malayalam-only (Kerala's "ഭരണഭാഷ — മാതൃഭാഷ" policy); some are
English-only or bilingual.
Extract goNumber, type, and date exactly as printed; never invent, guess, or paraphrase them.
The subject (title) and executive summary must be populated in BOTH English and Malayalam:
if the document provides them in only one language, translate to produce the other. Translate
faithfully — do not embellish, summarize away, or add content that is not in the document.

CRITICAL language rules — the keys are language-specific, not interchangeable:
  • "subject" and "summary" must be ENGLISH prose. They must NOT contain Malayalam script.
    If the source is Malayalam, you MUST translate — never copy the Malayalam into these fields.
  • "subjectMl" and "summaryMl" must be MALAYALAM (Unicode). They must NOT be in English.
  • The subject is a real descriptive title (what the order is about). It must NEVER be just the
    GO number, department code, or date. If you cannot read a real subject, return null for it.

Return ONLY a JSON object with these exact keys:
  goNumber             - document/order number as printed, or null
  type                 - one of: "P" | "Ms" | "Rt" | "SRO" | "Circular" | "Bill" | "Cabinet"
  date                 - ISO "YYYY-MM-DD"
  subject              - English subject/title line (English only). If the document subject is in Malayalam, translate it to English. Never the GO number.
  subjectMl            - Malayalam subject/title (Unicode, Malayalam only). If the document subject is in English only, translate it to Malayalam.
  summary              - A brief, one-paragraph English (English only) executive summary of the key directives, actions, or decisions in the document body. If the document body is in Malayalam only, write this summary in English.
  summaryMl            - Same executive summary in Malayalam (Unicode, Malayalam only). If the document body is in English only, write this summary in Malayalam.
  manifestoGoalId      - the id of the ONE manifesto goal this order most directly
                         implements or supports, or null if none genuinely apply
  manifestoConfidence  - "direct" (the order enacts the pledge), "supporting"
                         (a related/enabling step), "weak" (tangential), or null
  category             - "appointment" if the order's PRIMARY purpose is to appoint,
                         post, transfer, promote, give additional charge to, depute,
                         extend, reinstate, or relieve one or more named office
                         holders (Malayalam cues: നിയമനം, സ്ഥലംമാറ്റം, ചുമതല,
                         സ്ഥാനക്കയറ്റം, ഡെപ്യൂട്ടേഷൻ, വിരമിക്കൽ); otherwise "general".
  appointments         - when category is "appointment", an array with one object
                         per named person, each with EXACTLY these keys:
                           appointeeName    - person's name in English (transliterate if needed)
                           appointeeNameMl  - person's name in Malayalam (Unicode), or null
                           office           - the post/designation in English (e.g. "Principal Secretary, Finance")
                           officeMl         - the post in Malayalam, or null
                           branch           - one of: "executive" (minister), "bureaucratic"
                                              (IAS/IPS/IFS, secretary, HoD, civil servant),
                                              "judiciary" (judge, High Court, district court),
                                              "board" (corporation/board/commission/university chair, VC)
                           action           - one of: "appointment" | "transfer" | "promotion" |
                                              "additional-charge" | "extension" | "deputation" |
                                              "reinstatement" | "relieved"
                           court            - for judiciary only: the court name in English
                                              (e.g. "High Court of Kerala"), else null
                           courtMl          - the court name in Malayalam, or null
                           effectiveDate    - ISO "YYYY-MM-DD" the appointment takes effect, or null
                         When category is "general", return null or [].
  references           - an array of OTHER government orders this document explicitly
                         cites in its body (orders it amends, cancels/supersedes,
                         references for context, or implements). Malayalam cues:
                         ഭേദഗതി (amends), റദ്ദാക്കി/പിൻവലിച്ചു (supersedes),
                         പരാമർശം/സൂചന (references), പ്രകാരം/അടിസ്ഥാനത്തിൽ (implements).
                         Each item has EXACTLY these keys:
                           goNumber - the cited order's number, exactly as printed
                                      (e.g. "G.O.(P) No.45/2020/Fin"). Never invent one.
                           relation - one of: "amends" | "supersedes" | "references" | "implements"
                           note     - a short English gloss of the citation context
                           noteMl   - the same gloss in Malayalam, or null
                         Return [] when the document cites no other order. Do NOT list
                         the document's OWN number here.

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
const VALID_BRANCHES = new Set<AppointmentBranch>([
  "executive",
  "bureaucratic",
  "judiciary",
  "board",
]);
const VALID_ACTIONS = new Set<AppointmentAction>([
  "appointment",
  "transfer",
  "promotion",
  "additional-charge",
  "extension",
  "deputation",
  "reinstatement",
  "relieved",
]);
const VALID_RELATIONS = new Set<GoRelation>([
  "amends",
  "supersedes",
  "references",
  "implements",
]);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate + coerce the model's `appointments` array into ExtractedAppointment[]. */
function parseExtractedAppointments(raw: unknown): ExtractedAppointment[] {
  if (!Array.isArray(raw)) return [];
  const out: ExtractedAppointment[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const name = typeof r.appointeeName === "string"
      ? r.appointeeName.trim()
      : "";
    const office = typeof r.office === "string" ? r.office.trim() : "";
    // A usable row needs at least a name and an office.
    if (
      !name && !(typeof r.appointeeNameMl === "string" && r.appointeeNameMl)
    ) {
      continue;
    }
    const branch = VALID_BRANCHES.has(r.branch as AppointmentBranch)
      ? r.branch as AppointmentBranch
      : "bureaucratic";
    const action = VALID_ACTIONS.has(r.action as AppointmentAction)
      ? r.action as AppointmentAction
      : "appointment";
    const eff = typeof r.effectiveDate === "string" &&
        ISO_DATE_RE.test(r.effectiveDate)
      ? r.effectiveDate
      : null;
    out.push({
      appointeeName: name || null,
      appointeeNameMl: typeof r.appointeeNameMl === "string"
        ? r.appointeeNameMl.trim() || null
        : null,
      office: office || null,
      officeMl: typeof r.officeMl === "string"
        ? r.officeMl.trim() || null
        : null,
      branch,
      action,
      court: typeof r.court === "string" ? r.court.trim() || null : null,
      courtMl: typeof r.courtMl === "string" ? r.courtMl.trim() || null : null,
      effectiveDate: eff,
    });
  }
  return out;
}

/** Validate + coerce the model's `references` array into ExtractedRef[]. */
function parseExtractedRefs(raw: unknown): ExtractedRef[] {
  if (!Array.isArray(raw)) return [];
  const out: ExtractedRef[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const goNumber = typeof r.goNumber === "string" ? r.goNumber.trim() : "";
    // A citation is useless without the cited order's number.
    if (!goNumber) continue;
    const relation = VALID_RELATIONS.has(r.relation as GoRelation)
      ? r.relation as GoRelation
      : "references";
    out.push({
      goNumber,
      relation,
      note: typeof r.note === "string" ? r.note.trim() || null : null,
      noteMl: typeof r.noteMl === "string" ? r.noteMl.trim() || null : null,
    });
  }
  return out;
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

/** Which model actually produced an extraction (Gemini, or a fallback tier). */
type ExtractProvider = "gemini" | "groq" | "nvidia";

async function geminiExtract(
  pdfBytes: Uint8Array,
  fallback: Listing,
  hint: string,
  goals: ManifestoGoal[],
  goalIds: Set<string>,
  log?: (m: string) => void,
): Promise<{ extracted: Extracted; provider: ExtractProvider }> {
  const prompt = buildPrompt(hint, fallback, goals);
  let raw: string;
  let provider: ExtractProvider = "gemini";
  try {
    raw = await geminiExtractFromPdf(pdfBytes, prompt);
  } catch (geminiErr) {
    const msg = geminiErr instanceof Error
      ? geminiErr.message
      : String(geminiErr);
    // Fallback chain: Gemini → GROQ → NVIDIA. Both fallbacks are text-only
    // (they read PDF text, not the image), so they degrade on scanned GOs.
    if (groqKey()) {
      try {
        log?.(`    [Gemini failed, falling back to GROQ] ${msg}`);
        raw = await groqExtractFromPdf(pdfBytes, prompt);
        provider = "groq";
      } catch (groqErr) {
        if (!nvidiaKey()) throw groqErr;
        log?.(
          `    [GROQ failed, falling back to NVIDIA] ${
            groqErr instanceof Error ? groqErr.message : groqErr
          }`,
        );
        raw = await nvidiaExtractFromPdf(pdfBytes, prompt);
        provider = "nvidia";
      }
    } else if (nvidiaKey()) {
      log?.(`    [Gemini failed, falling back to NVIDIA] ${msg}`);
      raw = await nvidiaExtractFromPdf(pdfBytes, prompt);
      provider = "nvidia";
    } else {
      throw geminiErr;
    }
  }
  const p = parseJsonObject<Record<string, unknown>>(raw);

  const type = hint.toLowerCase().includes("cabinet")
    ? "Cabinet"
    : hint.toLowerCase().includes("circular")
    ? "Circular"
    : VALID_TYPES.has(p.type as GoOrderType)
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

  const appointments = parseExtractedAppointments(p.appointments);
  // Trust the appointee rows over the bare flag: a GO with named appointees is an
  // appointment even if the model labelled `category` "general", and vice versa.
  const category: "appointment" | "general" =
    p.category === "appointment" || appointments.length > 0
      ? "appointment"
      : "general";

  return {
    extracted: {
      goNumber: (p.goNumber as string) || fallback.goNumber,
      type,
      date: (p.date as string) || toIso(fallback.dateStr),
      subject: (p.subject as string) || null,
      subjectMl: (p.subjectMl as string) || null,
      summary: (p.summary as string) || null,
      summaryMl: (p.summaryMl as string) || null,
      manifestoGoalId: mappedId,
      manifestoConfidence: conf,
      category,
      appointments: category === "appointment" ? appointments : null,
      references: parseExtractedRefs(p.references),
    },
    provider,
  };
}

// ---------------------------------------------------------------------------
// Bilingual normalization + repair
//
// The source GOs are overwhelmingly Malayalam-only. The extractor is asked to
// translate, but in practice it often leaves Malayalam in the English fields
// (or echoes the GO number as the "subject"). These helpers detect the
// mis-slotting and repair it — correcting which field holds which language and
// translating the missing side with a focused text-only call.
// ---------------------------------------------------------------------------

const MALAYALAM_RE = /[ഀ-ൿ]/;
const LATIN_LETTER_RE = /[A-Za-z]/;

function countMatches(s: string, re: RegExp): number {
  return (s.match(new RegExp(re, "g")) || []).length;
}

/** A field that should be Malayalam but is really English (Latin-dominant). */
function isMostlyLatin(s: string): boolean {
  const ml = countMatches(s, MALAYALAM_RE);
  const latin = countMatches(s, LATIN_LETTER_RE);
  return latin > 0 && ml === 0;
}

/** A field that should be English but is really Malayalam. */
function isMostlyMalayalam(s: string): boolean {
  const ml = countMatches(s, MALAYALAM_RE);
  const latin = countMatches(s, LATIN_LETTER_RE);
  // Dept codes (LSGD, P&EA…) stay Latin even inside Malayalam text, so compare
  // counts rather than requiring zero Latin.
  return ml > 0 && ml >= latin;
}

/** Strip everything but alphanumerics for echo comparison. */
function squash(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9ഀ-ൿ]/g, "");
}

/**
 * True when `subject` is not a real title but an echo of the GO number / portal
 * fallback (e.g. subject === "G.O. (RT)118/2026/SJD"). Such "subjects" are the
 * failed-extraction marker we must reject.
 */
function isGoNumberEcho(
  subject: string,
  goNumber: string,
  fallback: Listing,
): boolean {
  const s = squash(subject);
  if (!s) return true;
  if (s === squash(goNumber)) return true;
  if (s === squash(fallback.goNumber)) return true;
  if (s === squash(cleanPortalHtml(fallback.subjectRaw))) return true;
  // Looks like a bare GO number with no descriptive words.
  return /^g?o?[a-z]{0,3}\d+\d{4}[a-z&]+$/.test(s);
}

/** Translate a short text (Gemini → GROQ → NVIDIA fallback chain). */
async function translateText(
  text: string,
  target: "English" | "Malayalam",
  log?: (m: string) => void,
): Promise<string | null> {
  const sys =
    `Translate the given Kerala government text into ${target}. Output ONLY a JSON object ` +
    `{"translation": "..."} with a faithful ${target} translation — no transliteration of the ` +
    `other language, no commentary, no added content.`;
  const user = `Text:\n${text}`;
  try {
    const raw = await geminiGenerate([{ text: `${sys}\n\n${user}` }], {
      json: true,
    });
    const t = parseJsonObject<{ translation?: unknown }>(raw).translation;
    if (typeof t === "string" && t.trim()) return t.trim();
  } catch (e) {
    log?.(
      `    [translate→${target} via Gemini failed] ${
        e instanceof Error ? e.message : e
      }`,
    );
  }
  if (groqKey()) {
    try {
      const raw = await groqGenerate(sys, user);
      const t = parseJsonObject<{ translation?: unknown }>(raw).translation;
      if (typeof t === "string" && t.trim()) return t.trim();
    } catch (e) {
      log?.(
        `    [translate→${target} via GROQ failed] ${
          e instanceof Error ? e.message : e
        }`,
      );
    }
  }
  if (nvidiaKey()) {
    try {
      const raw = await nvidiaGenerate(sys, user);
      const t = parseJsonObject<{ translation?: unknown }>(raw).translation;
      if (typeof t === "string" && t.trim()) return t.trim();
    } catch (e) {
      log?.(
        `    [translate→${target} via NVIDIA failed] ${
          e instanceof Error ? e.message : e
        }`,
      );
    }
  }
  return null;
}

interface NormalizedText {
  subject: string | null;
  subjectMl: string | null;
  summary: string | null;
  summaryMl: string | null;
  /** True if any field was produced/repaired by our translation pass. */
  machineTranslated: boolean;
}

/**
 * Repair one English/Malayalam field pair: re-slot by actual script, drop echoes
 * (for the subject), then translate the missing side. Returns the corrected
 * [english, malayalam] and whether a translation call was made.
 */
async function repairPair(
  english: string | null,
  malayalam: string | null,
  opts: {
    goNumber: string;
    fallback: Listing;
    isSubject: boolean;
    log?: (m: string) => void;
  },
): Promise<{ en: string | null; ml: string | null; translated: boolean }> {
  let en = english?.trim() || null;
  let ml = malayalam?.trim() || null;

  // Re-slot mis-placed languages.
  if (en && isMostlyMalayalam(en)) {
    if (!ml) ml = en;
    en = null;
  }
  if (ml && isMostlyLatin(ml)) {
    if (!en) en = ml;
    ml = null;
  }

  // Reject a "subject" that is just the GO number / portal echo.
  if (opts.isSubject) {
    if (en && isGoNumberEcho(en, opts.goNumber, opts.fallback)) en = null;
    if (ml && isGoNumberEcho(ml, opts.goNumber, opts.fallback)) ml = null;
  }

  // Fill the missing side by translation.
  let translated = false;
  if (en && !ml) {
    const t = await translateText(en, "Malayalam", opts.log);
    if (t) {
      ml = t;
      translated = true;
    }
  } else if (ml && !en) {
    const t = await translateText(ml, "English", opts.log);
    if (t) {
      en = t;
      translated = true;
    }
  }

  return { en, ml, translated };
}

/** Normalize/repair both the subject and summary pairs of an extraction. */
async function normalizeBilingual(
  ex: Extracted,
  fallback: Listing,
  log?: (m: string) => void,
): Promise<NormalizedText> {
  const subj = await repairPair(ex.subject, ex.subjectMl, {
    goNumber: ex.goNumber,
    fallback,
    isSubject: true,
    log,
  });
  const summ = await repairPair(ex.summary, ex.summaryMl, {
    goNumber: ex.goNumber,
    fallback,
    isSubject: false,
    log,
  });
  return {
    subject: subj.en,
    subjectMl: subj.ml,
    summary: summ.en,
    summaryMl: summ.ml,
    machineTranslated: subj.translated || summ.translated,
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

/**
 * Best-effort resolution of a cited GO number to a `GovernmentOrder.id`,
 * mirroring `generateId`'s scheme (`go.<year>-<deptCode>-<num>`). Returns
 * undefined when the number is too garbled to parse a year + serial — those
 * citations stay display-only and draw no graph edge. The returned id is a
 * candidate: the detail page only links it after confirming the record exists,
 * and the graph only writes an edge when the target node is present.
 */
function resolveReferenceId(goNumber: string): string | undefined {
  const yearMatch = goNumber.match(/\/\s*((?:19|20)\d{2})\b/) ??
    goNumber.match(/\b((?:19|20)\d{2})\b/);
  const numMatch = goNumber.match(/No\.?\s*(\d+)/i) ??
    goNumber.match(/(\d+)\s*\/\s*(?:19|20)\d{2}\b/);
  if (!yearMatch || !numMatch) return undefined;
  const year = yearMatch[1];
  const num = numMatch[1];
  const segments = goNumber.split("/");
  const suffix = segments[segments.length - 1]?.trim().toLowerCase();
  if (suffix && DEPT_CODE_MAP[suffix]) return `go.${year}-${suffix}-${num}`;
  if (inferType(goNumber) === "Bill") return `go.${year}-bill-${num}`;
  return `go.${year}-misc-${num}`;
}

/**
 * Resolve the extractor's raw citations into `GoReference[]`: attach a candidate
 * id where the cited number parses, drop self-citations, and dedupe (by resolved
 * id, else by squashed number). Returns undefined when nothing usable remains so
 * the field stays absent rather than an empty array.
 */
function buildReferences(
  refs: ExtractedRef[],
  selfId: string,
): GoReference[] | undefined {
  const seen = new Set<string>();
  const out: GoReference[] = [];
  for (const r of refs) {
    const goId = resolveReferenceId(r.goNumber);
    if (goId === selfId) continue; // never cite ourselves
    const key = goId ?? squash(r.goNumber);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      goNumber: r.goNumber,
      goId,
      relation: r.relation,
      note: r.note ?? undefined,
      noteMl: r.noteMl ?? undefined,
    });
  }
  return out.length ? out : undefined;
}

// ---------------------------------------------------------------------------
// Appointment mapping (extracted appointees -> Appointment records)
// ---------------------------------------------------------------------------

/** Squash a name to lowercase alphanumerics for matching (drops initials' dots). */
function squashName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9ഀ-ൿ]/g, "");
}

/**
 * Confident match of an extracted appointee to a seeded `Person`. Compares the
 * squashed English name against `Person.name` and the Malayalam name against
 * `Person.nameMl`. Returns the Person id ONLY on an exact squashed match — never
 * a fuzzy/substring guess — so ingest never invents a `personId`.
 */
export function matchPerson(
  name: string | null,
  nameMl: string | null,
): string | undefined {
  const en = name ? squashName(name) : "";
  const ml = nameMl ? squashName(nameMl) : "";
  if (!en && !ml) return undefined;
  for (const p of PERSONS) {
    if (en && squashName(p.name) === en) return p.id;
    if (ml && p.nameMl && squashName(p.nameMl) === ml) return p.id;
  }
  return undefined;
}

/**
 * Build `Appointment` records for one ingested GO. IDs are derived from the GO id
 * (`go.2026-fin-162` -> `appt.2026-fin-162-<n>`) so re-extraction overwrites the
 * same records. Judiciary rows default their dept to `dept.law`; everything else
 * reuses the GO's department tag. The appointment's `termEnd` is left undefined
 * (it opens the office); supersession of the prior holder happens in
 * `putIngestedAppointment`.
 */
export function buildAppointmentsForOrder(
  go: GovernmentOrder,
  rows: ExtractedAppointment[],
): Appointment[] {
  const apptBase = go.id.replace(/^go\./, "appt.");
  const out: Appointment[] = [];
  rows.forEach((r, i) => {
    const name = r.appointeeName ?? r.appointeeNameMl ?? "";
    if (!name) return;
    const office = r.office ?? r.officeMl ?? "";
    const branch = r.branch ?? "bureaucratic";
    const deptId = branch === "judiciary"
      ? (go.deptId ?? "dept.law")
      : go.deptId;
    out.push({
      id: `${apptBase}-${i}`,
      goId: go.id,
      appointeeName: name,
      appointeeNameMl: r.appointeeNameMl ?? undefined,
      personId: matchPerson(r.appointeeName, r.appointeeNameMl),
      office: office || name,
      officeMl: r.officeMl ?? undefined,
      branch,
      action: r.action ?? "appointment",
      deptId,
      court: r.court ?? undefined,
      courtMl: r.courtMl ?? undefined,
      termStart: r.effectiveDate ?? go.effectiveDate ?? go.date,
      confidence: go.deptConfidence,
      source: go.meta.source,
      sourceUrl: go.meta.sourceUrl,
      translationStatus: "machine-draft" satisfies TranslationStatus,
      dataStatus: "unverified",
    });
  });
  return out;
}

/** Persist appointments for a GO (best-effort: a failure must not fail GO ingest). */
async function persistAppointments(
  go: GovernmentOrder,
  ex: Extracted,
  log: (m: string) => void,
): Promise<number> {
  if (ex.category !== "appointment" || !ex.appointments?.length) return 0;
  const appts = buildAppointmentsForOrder(go, ex.appointments);
  let n = 0;
  for (const a of appts) {
    try {
      await putIngestedAppointment(a);
      n++;
      log(`      ↳ appointment ${a.id}: ${a.appointeeName} — ${a.office}`);
    } catch (e) {
      log(
        `      ↳ appointment ${a.id} failed: ${
          e instanceof Error ? e.message : e
        }`,
      );
    }
  }
  return n;
}

// ---------------------------------------------------------------------------
// Targeted repair of already-ingested records
//
// Unlike runIngest (which scrapes the portal's recent listings), this walks the
// records already in KV and re-extracts each one straight from its stored PDF
// URL. That covers orders that have since scrolled off the listing pages, and
// by default it only touches records whose fields look broken — saving quota.
// ---------------------------------------------------------------------------

/** True when a stored record's bilingual fields look wrong and need re-extract. */
function ingestedOrderNeedsRepair(o: GovernmentOrder): boolean {
  // Not yet re-processed by the language-aware pipeline.
  if (o.translationStatus !== "machine-draft") return true;
  // Not yet classified for appointments — a repair pass backfills `category`
  // and spawns any Appointment records (the retrospective categorization).
  if (o.category === undefined) return true;
  // English subject is empty, Malayalam, or a bare GO-number echo.
  if (!o.subject || isMostlyMalayalam(o.subject)) return true;
  if (squash(o.subject) === squash(o.goNumber)) return true;
  // Malayalam subject missing or actually English.
  if (!o.subjectMl || isMostlyLatin(o.subjectMl)) return true;
  return false;
}

export interface RepairOptions {
  /** Max records to repair this run. */
  limit?: number;
  /** Re-extract every ingested record, not just the broken ones. */
  force?: boolean;
  /** Re-extract but do not write. */
  dryRun?: boolean;
  log?: (m: string) => void;
}

export interface RepairResult {
  candidates: number;
  repaired: number;
  errors: string[];
}

/** Hint string for the extractor, derived from a record's properties. */
function hintForOrder(o: GovernmentOrder): string {
  const url = o.meta.sourceUrl.toLowerCase();
  if (o.type === "Cabinet" || url.includes("/cabinetdecisions/")) {
    return "Kerala Cabinet Decisions";
  }
  if (o.type === "Circular" || url.includes("/circulars/")) {
    return "Kerala Government Circulars";
  }
  return "Kerala Government Orders (G.O.)";
}

/**
 * Re-extract and overwrite already-ingested orders whose bilingual fields are
 * broken (English field holding Malayalam, missing translation, GO-number echo).
 * Reads each record's stored PDF URL — independent of portal pagination.
 */
export async function repairIngestedOrders(
  opts: RepairOptions = {},
): Promise<RepairResult> {
  const log = opts.log ?? (() => {});
  const goals = await listManifestoGoals();
  const goalIds = new Set(goals.map((g) => g.id));

  const all = await listGovernmentOrders();
  const candidates = all.filter((o) =>
    o.meta.sourceUrl.toLowerCase().endsWith(".pdf") &&
    (opts.force || ingestedOrderNeedsRepair(o))
  );
  log(
    `[repair] ${candidates.length} record(s) ${
      opts.force ? "(forced) " : "need repair "
    }of ${all.length} total`,
  );

  const errors: string[] = [];
  let repaired = 0;

  for (const o of candidates) {
    if (opts.limit !== undefined && repaired >= opts.limit) break;
    log(`\n  → ${o.id} (${o.goNumber})`);
    try {
      const r = await politeGet(o.meta.sourceUrl);
      const ct = r.headers.get("content-type") ?? "";
      if (!ct.includes("pdf")) {
        throw new Error(`not a PDF (content-type: ${ct || "unknown"})`);
      }
      const pdfBytes = new Uint8Array(await r.arrayBuffer());

      // Synthesize a Listing fallback from the stored record.
      const fallback: Listing = {
        goNumber: o.goNumber,
        dateStr: o.date.split("-").reverse().join("-"), // ISO → dd-mm-yyyy
        subjectRaw: o.subject || o.goNumber,
        pdfUrl: o.meta.sourceUrl,
      };
      const { extracted: ex } = await geminiExtract(
        pdfBytes,
        fallback,
        hintForOrder(o),
        goals,
        goalIds,
        log,
      );
      const norm = await normalizeBilingual(ex, fallback, log);
      if (!norm.subject && !norm.subjectMl) {
        throw new Error("no usable subject extracted");
      }

      const subject = norm.subject ?? norm.subjectMl ?? "";
      const { deptId, deptConfidence } = tagDepartment(ex.goNumber, subject);
      const updated: GovernmentOrder = {
        ...o,
        // Keep the stable id; refresh extracted/translated fields.
        goNumber: ex.goNumber,
        type: ex.type,
        subject,
        subjectMl: norm.subjectMl ?? undefined,
        summary: norm.summary ?? undefined,
        summaryMl: norm.summaryMl ?? undefined,
        deptId,
        deptConfidence,
        manifestoGoalIds: ex.manifestoGoalId ? [ex.manifestoGoalId] : undefined,
        manifestoConfidence: ex.manifestoConfidence ?? undefined,
        references: buildReferences(ex.references, o.id),
        category: ex.category,
        meta: { ...o.meta, retrievedAt: new Date().toISOString() },
        translationStatus: "machine-draft" satisfies TranslationStatus,
      };

      if (!opts.dryRun) {
        await putIngestedGovernmentOrder(updated);
        await persistAppointments(updated, ex, log);
      }
      repaired++;
      log(`    ✓ repaired ${o.id}`);
    } catch (e) {
      const msg = `${o.id}: ${e instanceof Error ? e.message : e}`;
      if (errors.length < MAX_ERRORS) errors.push(msg);
      log(`    ✗ ${msg}`);
    }
  }

  log(`\n[repair] done — ${repaired} repaired, ${errors.length} error(s)`);
  return { candidates: candidates.length, repaired, errors };
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
  /**
   * Re-fetch and re-extract orders already in KV (skips dedup). Overwrites the
   * existing record in place (same id). Use to repair previously-ingested data.
   */
  reprocess?: boolean;
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
  let nvidiaFallbackUsed = false;
  try {
    // Scrape every source up front, then process round-robin. With a single
    // global `limit`, processing sources front-to-back lets the first, highest-
    // volume source (orders) drain the entire budget before the loop ever
    // reaches low-volume sources such as cabinet decisions — so they never get
    // ingested. Round-robin shares the budget fairly across all sources.
    const queues: Array<{ hint: string; listings: Listing[] }> = [];
    for (const sourceName of sources) {
      const { url, hint } = KNOWN_SOURCES[sourceName];
      log(`\n[source: ${sourceName}] ${hint}`);
      const listings = await scrapeListings(url, since, log);
      scanned += listings.length;
      queues.push({ hint, listings });
    }

    const processListing = async (listing: Listing, hint: string) => {
      // In reprocess mode we re-fetch already-seen orders so their fields get
      // re-extracted and overwritten (same id → same record). Dedup is skipped.
      if (
        !opts.reprocess &&
        (seenGoNumbers.has(listing.goNumber) || seenUrls.has(listing.pdfUrl))
      ) {
        skipped++;
        return;
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

        // Re-slot mis-placed languages, drop GO-number echoes, and translate
        // the missing side so `subject`/`summary` are reliably English and
        // `subjectMl`/`summaryMl` reliably Malayalam.
        const norm = await normalizeBilingual(ex, listing, log);
        if (!norm.subject && !norm.subjectMl) {
          throw new Error("no usable subject extracted");
        }

        // Display falls back to `subject` for both languages, so it must hold
        // something real — prefer English, else the Malayalam title.
        const subject = norm.subject ?? norm.subjectMl ?? "";
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
          subjectMl: norm.subjectMl ?? undefined,
          summary: norm.summary ?? undefined,
          summaryMl: norm.summaryMl ?? undefined,
          deptId,
          deptConfidence,
          date: ex.date,
          manifestoGoalIds: ex.manifestoGoalId
            ? [ex.manifestoGoalId]
            : undefined,
          manifestoConfidence: ex.manifestoConfidence ?? undefined,
          references: buildReferences(ex.references, id),
          category: ex.category,
          meta: {
            source: "Document Portal, Government of Kerala",
            sourceUrl: listing.pdfUrl,
            retrievedAt: new Date().toISOString(),
          },
          // Both languages are LLM-extracted/translated, so flag as a
          // machine draft pending native Malayalam review (bilingual Rule 2.4).
          translationStatus: "machine-draft" satisfies TranslationStatus,
          dataStatus: "verified",
        };

        if (!opts.dryRun) {
          await putIngestedGovernmentOrder(record);
          await persistAppointments(record, ex, log);
        }
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
    };

    // Round-robin: take one listing from each source per round so the global
    // `limit` is shared across sources instead of consumed front-to-back.
    const maxLen = queues.reduce((m, q) => Math.max(m, q.listings.length), 0);
    for (let i = 0; i < maxLen; i++) {
      if (limit !== undefined && addedIds.length >= limit) break;
      for (const q of queues) {
        if (limit !== undefined && addedIds.length >= limit) break;
        const listing = q.listings[i];
        if (listing) await processListing(listing, q.hint);
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
