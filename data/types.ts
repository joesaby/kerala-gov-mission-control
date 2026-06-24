export type KpiStatus = "on-track" | "slipping" | "off-track" | "improving";
export type KpiTrend = "up" | "down" | "flat";
export type UpdateFrequency =
  | "real-time"
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "annual";

export type KpiDirection = "higher-better" | "lower-better";

/**
 * Civic-status domains the citizen cares about. These are intentionally
 * cross-departmental — a single domain like "health" can roll up KPIs owned
 * by multiple departments (Health & FW, Local Self Government for primary
 * care, Social Justice for nutrition).
 */
export type CivicDomain =
  | "fiscal"
  | "health"
  | "education"
  | "livelihood"
  | "safety"
  | "transport"
  | "environment"
  | "sustainability"
  | "trust"
  | "delivery"
  | "other";

/**
 * Provenance of a record's `*Ml` strings. "machine-draft" = LLM-translated and
 * not yet reviewed by a Malayalam speaker; must be cleared (set to "human" or
 * removed after review) before the translation is treated as authoritative.
 * Absent = translation was human-authored. See
 * docs/specs/bilingual-localization.md Rule 2.4.
 */
export type TranslationStatus = "human" | "machine-draft";

export interface KpiMetadata {
  definition: string;
  definitionMl?: string;
  /** Provenance of the Malayalam strings on this KPI. */
  translationStatus?: TranslationStatus;
  source: string;
  sourceUrl?: string;
  /** Legacy free-text owner label. Prefer `ownerDeptId` going forward. */
  owner: string;
  updateFrequency: UpdateFrequency;
  lastRefreshed: string;
  methodologyUrl?: string;
}

export interface KpiComparator {
  label: string;
  value: number;
}

/**
 * One point in a KPI's history. `kind` distinguishes published values from
 * forward-looking targets so the chart layer can render them differently
 * (solid line for actuals, dashed for projections/targets).
 */
export interface KpiTimePoint {
  /** Calendar year (e.g. 2023) or fiscal-year start (e.g. 2023 means FY24). */
  year: number;
  value: number;
  kind: "actual" | "provisional" | "projection" | "target";
  /** Per-point source (if different from the KPI's headline source). */
  source?: string;
  sourceUrl?: string;
  note?: string;
}

export interface Kpi {
  id: string;
  title: string;
  titleMl: string;
  /** Civic-facing domain (what citizens look up). */
  domain: CivicDomain;
  /** Department primarily accountable. Optional until ownership is assigned. */
  ownerDeptId?: string;
  /** Secondary contributing departments. */
  contributingDeptIds?: string[];
  value: number;
  unit: string;
  target?: number;
  direction: KpiDirection;
  trend: KpiTrend;
  trendDelta: number;
  trendWindow: string;
  status: KpiStatus;
  comparators: KpiComparator[];
  meta: KpiMetadata;
  /** Optional history + forward projections, sorted by year ascending. */
  timeSeries?: KpiTimePoint[];
}

// ── Governance entities ─────────────────────────────────────────────────────

/**
 * A human individual. Stable across all tenures — minister, MLA, Speaker, CM.
 * One Person may have many Minister records (one per cabinet), many
 * MemberOfLegislative records (one per election), and at most one Speaker
 * record per assembly term.
 */
export interface Person {
  id: string; // person.pinarayi-vijayan
  slug: string;
  name: string;
  nameMl?: string;
  photoUrl?: string;
  photoCredit?: string;
  wikipediaUrl?: string;
  links?: {
    twitter?: string;
    facebook?: string;
    email?: string;
    officialPage?: string;
  };
  source?: string;
  sourceUrl?: string;
  dataStatus: "verified" | "unverified" | "tbd";
}

/**
 * A political party. Stable identity across coalition realignments.
 * `abbreviation` is the canonical short label used on badges ("CPI(M)", "INC").
 */
export interface Party {
  id: string; // party.cpim
  slug: string;
  name: string;
  nameMl?: string;
  abbreviation: string; // display label — must match PartyAffiliation values
  color?: string; // hex for UI (e.g. "#e63946")
  logoUrl?: string;
  websiteUrl?: string;
  founded?: string; // ISO date
  source?: string;
  sourceUrl?: string;
  dataStatus: "verified" | "unverified" | "tbd";
}

/**
 * Records a party's alliance membership at a given time.
 * Required because parties switch coalitions across election cycles:
 * RSP was LDF in 2006, UDF from 2011; KC(M) was UDF until 2020, LDF from 2021.
 * termStart/termEnd can be as short as days if a party walked out mid-term.
 */
export interface CoalitionMembership {
  id: string;
  partyId: string;
  coalition: "LDF" | "UDF" | "NDA" | "Other";
  termStart: string; // ISO date
  termEnd?: string; // ISO date — undefined = still current
  source?: string;
  sourceUrl?: string;
}

/**
 * An electoral assembly constituency. 140 seats for the Kerala Legislative
 * Assembly, numbered per the Delimitation Order.
 */
export interface Constituency {
  id: string; // constituency.dharmadam
  slug: string;
  name: string;
  nameMl?: string;
  district: string;
  reservedFor: "General" | "SC" | "ST";
  assemblyNumber?: number; // 1–140 per Delimitation Order
  source?: string;
  sourceUrl?: string;
  dataStatus: "verified" | "unverified" | "tbd";
}

/**
 * One MLA tenure. A re-elected person generates a new record per assembly term.
 * termStart = swearing-in; termEnd = dissolution, death, or resignation.
 * Both termStart and termEnd can be as short as days apart (e.g. elected on
 * a by-election seat that immediately becomes void on a court ruling).
 */
export interface MemberOfLegislative {
  id: string; // mla.pinarayi-vijayan-15
  personId: string;
  constituencyId: string;
  partyId: string; // party at time of election
  assemblyTerm: number; // 15 for the 15th KLA
  termStart: string; // ISO — swearing-in date
  termEnd?: string; // ISO — dissolution / vacancy / resignation
  electedOn: string; // ISO — election result date
  votes?: number;
  margin?: number; // winning margin in votes
  totalElectors?: number;
  source?: string;
  sourceUrl?: string;
  dataStatus: "verified" | "unverified" | "tbd";
}

/**
 * Assembly Speaker or Deputy Speaker tenure. A Speaker vacates party
 * membership on election to office. termStart/termEnd can span just a few
 * days in case of interim appointments or no-confidence.
 */
export interface Speaker {
  id: string; // speaker.an-shamseer-15
  slug: string;
  personId: string;
  assemblyTerm: number;
  rank: "Speaker" | "Deputy Speaker";
  termStart: string; // ISO
  termEnd?: string; // ISO — undefined = incumbent
  source?: string;
  sourceUrl?: string;
  dataStatus: "verified" | "unverified" | "tbd";
}

/**
 * A Government of Kerala department. The structure is stable across
 * governments; only Minister/Secretary assignments change.
 */
export interface Department {
  id: string;
  /** URL-safe slug used in routes. */
  slug: string;
  name: string;
  nameMl?: string;
  /** Short citizen-facing description. */
  summary?: string;
  summaryMl?: string;
  /** Provenance of the Malayalam strings on this record. */
  translationStatus?: TranslationStatus;
  /** Primary domains this department contributes to. */
  domains: CivicDomain[];
  /** Department website (if any). */
  websiteUrl?: string;
  /** Currently assigned minister, if known. */
  ministerId?: string;
  /** Senior bureaucrat (Principal Secretary / Additional Chief Secretary). */
  secretaryId?: string;
  /** Source for the department record itself (gazette / GO). */
  source?: string;
  sourceUrl?: string;
  /** Data verification status. */
  dataStatus: "verified" | "unverified" | "tbd";
}

/** Political party / coalition tags (denormalized abbreviation on Minister). */
export type PartyAffiliation =
  | "CPI(M)"
  | "CPI"
  | "INC"
  | "IUML"
  | "KC(M)"
  | "KC"
  | "RSP"
  | "JD(S)"
  | "NCP"
  | "BJP"
  | "CMP"
  | "Independent"
  | "Other";

export interface Minister {
  id: string;
  slug: string;
  /** FK → Person.id. Required — every cabinet tenure belongs to a human. */
  personId: string;
  /**
   * Denormalized display name. Kept on Minister so a single KV read gives a
   * renderable record without a join to Person.
   */
  name: string;
  nameMl?: string;
  /** Denormalized constituency display name. */
  constituency?: string;
  /** FK → Constituency.id — set when constituency entity exists. */
  constituencyId?: string;
  /** Denormalized party abbreviation for badge display. */
  party?: PartyAffiliation;
  /** FK → Party.id — set when Party entity exists. */
  partyId?: string;
  rank?: "CM" | "Deputy CM" | "Cabinet" | "MoS";
  /** FK → Government.id */
  governmentId?: string;
  /** ISO date this tenure started (swearing-in). */
  termStart?: string;
  /** ISO date this tenure ended. Undefined = still in office. */
  termEnd?: string;
  departmentIds: string[];
  /**
   * Direct image URL. Prefer Wikimedia Commons originals
   * (https://upload.wikimedia.org/...). Avoid /thumb/ URLs — they're unstable.
   */
  photoUrl?: string;
  photoCredit?: string;
  wikipediaUrl?: string;
  links?: {
    twitter?: string;
    facebook?: string;
    email?: string;
    officialPage?: string;
  };
  source?: string;
  sourceUrl?: string;
  dataStatus: "verified" | "unverified" | "tbd";
}

/**
 * A Kerala state cabinet — one record per government (e.g. Pinarayi I,
 * Pinarayi II, Oommen Chandy). Minister records reference this via
 * `governmentId` so we can ask "who was Health Minister in 2018?".
 */
export interface Government {
  id: string;
  slug: string;
  /** Display name, e.g. "Second Pinarayi Vijayan ministry". */
  name: string;
  nameMl?: string;
  /** Short label used in chips / breadcrumbs, e.g. "Pinarayi II". */
  shortName: string;
  shortNameMl?: string;
  coalition: "LDF" | "UDF" | "Other";
  /** Minister id of the Chief Minister (must be a Minister with rank="CM"). */
  cmMinisterId: string;
  /** State assembly term number, e.g. 15 for the 15th Kerala Legislative Assembly. */
  assemblyTerm?: number;
  termStart: string;
  /** Undefined if this is the incumbent government. */
  termEnd?: string;
  summary?: string;
  summaryMl?: string;
  /** Provenance of the Malayalam strings on this record. */
  translationStatus?: TranslationStatus;
  source?: string;
  sourceUrl?: string;
  dataStatus: "verified" | "unverified" | "tbd";
}

export interface Secretary {
  id: string;
  slug: string;
  name: string;
  nameMl?: string;
  /** IAS cadre year (allotment year). */
  cadreYear?: number;
  /** Current designation, e.g. "Principal Secretary (Finance)". */
  designation: string;
  /** Department IDs currently held. */
  departmentIds: string[];
  appointedOn?: string;
  source?: string;
  sourceUrl?: string;
  dataStatus: "verified" | "unverified" | "tbd";
}

// ── Public Speeches ──────────────────────────────────────────────────────────

export type SpeechType =
  | "press-meet"
  | "interview"
  | "assembly-speech"
  | "public-address"
  | "inauguration"
  | "debate";

export interface TranscriptSegment {
  /** Offset from video/audio start, in whole seconds. */
  timeSecs: number;
  text: string;
}

/**
 * A recorded public speech by a Person — press meets, interviews, assembly
 * floor speeches, public addresses, etc.
 * `personId` is the FK; one Person may accumulate many speeches across tenures.
 */
export interface PublicSpeech {
  id: string; // speech.<person-slug>-<YYYY-MM-DD>[-seq]
  personId: string; // FK → Person.id
  type: SpeechType;
  title: string;
  titleMl?: string;
  date: string; // ISO date
  videoUrl?: string;
  videoId?: string; // YouTube video ID for embedding
  channelName?: string;
  description?: string;
  descriptionMl?: string;
  tags?: string[];
  transcript?: TranscriptSegment[];
  source?: string;
  sourceUrl?: string;
  dataStatus: "verified" | "unverified" | "tbd";
}

// ── Manifesto Goals ──────────────────────────────────────────────────────────

export type ManifestoCategory =
  | "welfare"
  | "women"
  | "health"
  | "education"
  | "livelihood"
  | "infrastructure"
  | "governance"
  | "fiscal"
  | "tribal"
  | "environment";

export type ManifestoGoalStatus =
  | "committed"
  | "in-progress"
  | "fulfilled"
  | "dropped";

/**
 * A single commitment from a government's election manifesto.
 * `featured` marks the headline branded promises (e.g. "Indira Guarantees",
 * "Dream Projects") that the party explicitly numbered and named.
 */
export interface ManifestoGoal {
  id: string; // goal.<coalition><year>-<slug>
  governmentId: string; // FK → Government.id
  title: string;
  titleMl?: string;
  category: ManifestoCategory;
  summary?: string;
  summaryMl?: string;
  /** Branded grouping label, e.g. "Indira Guarantee", "Dream Project". */
  featuredLabel?: string;
  featuredLabelMl?: string;
  status: ManifestoGoalStatus;
  sourceUrl?: string;
  dataStatus: "verified" | "unverified" | "tbd";
}

// ── Government Orders ────────────────────────────────────────────────────────

/**
 * The suffix code embedded in GO numbers, e.g. "P" in G.O.(P), "Ms" in G.O.(Ms).
 * "SRO" = Statutory Rules & Orders. "Circular" and "Bill" are non-GO document
 * types also processed by the ingest-go skill.
 */
export type GoOrderType =
  | "P"
  | "Ms"
  | "Rt"
  | "SRO"
  | "Circular"
  | "Bill"
  | "Cabinet";

/**
 * Confidence level of the department tag assigned by the ingest-go skill.
 * - "high"   → matched on the GO number suffix (e.g. "/Fin" → dept.finance)
 * - "medium" → matched via keyword fallback on subject / dept name
 * - "low"    → ambiguous; `deptId` may be null — do not render without caveat
 */
export type DeptTagConfidence = "high" | "medium" | "low";

/**
 * How a Government Order relates to another order it cites in its body. Set by
 * the ingest extractor when the PDF references a prior GO.
 * - "amends"      this order modifies the cited order
 * - "supersedes"  this order replaces / cancels the cited order
 * - "references"  this order cites the prior order for context (no change to it)
 * - "implements"  this order operationalises a cited framework / sanction order
 */
export type GoRelation = "amends" | "supersedes" | "references" | "implements";

/**
 * A cross-reference from one Government Order to another, extracted from the PDF
 * body during ingest. `goNumber` is always the raw cited number; `goId` is set
 * only when the cited order resolves to a known `GovernmentOrder.id` (derived
 * from the number). Unresolved citations still display, but draw no graph edge.
 */
export interface GoReference {
  /** Raw GO number exactly as cited in the document body. */
  goNumber: string;
  /** FK → GovernmentOrder.id when the cited order is known to us. */
  goId?: string;
  relation: GoRelation;
  /** Short English gloss of why the order is cited. */
  note?: string;
  /** Malayalam gloss (machine-draft, like the rest of the ingested record). */
  noteMl?: string;
}

/**
 * A single Kerala Government Order, Circular, or Legislative Bill.
 * Every record must carry `meta.sourceUrl` — a direct link to the PDF or
 * page on the official portal. No source URL = record does not ship.
 *
 * IDs are namespaced: go.<year>-<deptCode>-<number>
 * Example: go.2021-fin-162
 */
export interface GovernmentOrder {
  /** Namespaced stable id, e.g. "go.2021-fin-162". */
  id: string;
  /** Raw GO number as printed on the document, e.g. "G.O.(P) No.162/2021/Fin". */
  goNumber: string;
  type: GoOrderType;
  /** English subject line from the document. */
  subject: string;
  /**
   * Malayalam subject line. Ingest backfills it via LLM translation when the
   * document is English-only — such records are machine-drafted translations
   * pending native review (Rule 2.4 of the bilingual spec).
   */
  subjectMl?: string;
  /** AI-extracted summary or excerpt of the document's body. */
  summary?: string;
  /** Malayalam translation of the summary. */
  summaryMl?: string;
  /** FK → Department.id. Null when tagging is ambiguous (deptConfidence = "low"). */
  deptId?: string;
  /** How the department tag was assigned. */
  deptConfidence: DeptTagConfidence;
  /** ISO date the GO was issued. */
  date: string;
  /** ISO date the GO comes into force, if different from issue date. */
  effectiveDate?: string;
  /**
   * Semantic class of the order, orthogonal to `type` (the suffix code). Set by
   * the ingest extractor. "appointment" GOs spawn one or more `Appointment`
   * records and surface on /gov/appointments; absent ⇒ treat as "general".
   */
  category?: "appointment" | "general";
  /** FKs → ManifestoGoal.id — one GO may serve multiple goals. */
  manifestoGoalIds?: string[];
  /** How strongly this GO backs the listed manifesto goals. */
  manifestoConfidence?: "direct" | "supporting" | "weak";
  /**
   * Other Government Orders this one cites in its body (amendments,
   * supersessions, sanction orders it builds on). LLM-extracted during ingest;
   * each entry keeps the raw cited number and, when resolvable, the FK to the
   * cited order. Drives the order's relationship graph.
   */
  references?: GoReference[];
  meta: {
    /** Name of the portal / document from which this record was fetched. */
    source: string;
    /** Direct URL to the PDF or portal page — mandatory, no exceptions. */
    sourceUrl: string;
    /** ISO timestamp of when this record was fetched/ingested. */
    retrievedAt: string;
  };
  /**
   * "machine-draft" whenever ingest produced either language by LLM
   * translation (the usual case — source GOs are Malayalam-only or
   * English-only, so the other side is machine-generated). Per Rule 2.4 of
   * the bilingual spec, such records await native review.
   */
  translationStatus?: TranslationStatus;
  dataStatus: "verified" | "unverified" | "tbd";
}

// ── Appointments ─────────────────────────────────────────────────────────────

/**
 * Which arm of the state an appointment sits in. Drives grouping on
 * /gov/appointments and the graph projection target.
 * - "executive"    — political / ministerial (rare in GOs; usually gazetted)
 * - "bureaucratic" — IAS/IPS/IFS, secretaries, Heads of Department, deputations
 * - "judiciary"    — High Court + district / subordinate judiciary (carries `court`)
 * - "board"        — boards, corporations, commissions, universities (VC / chair)
 */
export type AppointmentBranch =
  | "executive"
  | "bureaucratic"
  | "judiciary"
  | "board";

/** What the order does to the office holder. */
export type AppointmentAction =
  | "appointment"
  | "transfer"
  | "promotion"
  | "additional-charge"
  | "extension"
  | "deputation"
  | "reinstatement"
  | "relieved";

/**
 * One person taking (or leaving) one office, evidenced by a Government Order.
 *
 * `Appointment` is a tenure record in the same spirit as `Minister` / `Speaker`:
 * the holder of an office changes by date, so a transfer or fresh appointment to
 * the same office closes the prior open record (`termEnd` set) and opens a new
 * one. One GO may yield several appointments (a batch posting list).
 *
 * Ingested records are machine-extracted drafts: `translationStatus:
 * "machine-draft"` and `dataStatus: "unverified"` until a human reviews them.
 * `appointeeName` is always text; `personId` is set ONLY on a confident match to
 * an existing `Person` — ingest never auto-creates `Person` records.
 *
 * IDs are derived from the source GO id for idempotent re-extraction:
 * `appt.<go-suffix>-<n>`, e.g. go.2026-fin-162 → appt.2026-fin-162-0.
 */
export interface Appointment {
  id: string;
  /** FK → GovernmentOrder.id — the order that made this appointment. */
  goId: string;
  /** Appointee display name (English / transliterated). */
  appointeeName: string;
  /** Malayalam appointee name (names usually appear in Malayalam at source). */
  appointeeNameMl?: string;
  /** FK → Person.id — set only on a confident match to a known person. */
  personId?: string;
  /** Office / designation, English, e.g. "Principal Secretary (Finance)". */
  office: string;
  officeMl?: string;
  branch: AppointmentBranch;
  action: AppointmentAction;
  /** FK → Department.id. Reuses the GO department tagging. */
  deptId?: string;
  /** Court name for judiciary appointments, e.g. "High Court of Kerala". */
  court?: string;
  courtMl?: string;
  /** ISO — effective date of the appointment (GO effectiveDate ?? issue date). */
  termStart: string;
  /** ISO — set when superseded by a later holder or relieved; undefined = current. */
  termEnd?: string;
  /** Confidence of the structured extraction (mirrors DeptTagConfidence). */
  confidence: "high" | "medium" | "low";
  /** Portal / document the record was fetched from. */
  source: string;
  /** Direct PDF URL (mirrors the source GO's meta.sourceUrl). */
  sourceUrl: string;
  /** Provenance of the Malayalam strings. "machine-draft" for ingested records. */
  translationStatus?: TranslationStatus;
  dataStatus: "verified" | "unverified" | "tbd";
}

// ===========================================================================
// Status Paper — long-form economic/fiscal white papers tabled in the Assembly.
//
// Unlike a GovernmentOrder (a single dated decision), a StatusPaper is a whole
// report. We don't render the 195-page PDF; we render a human-friendly digest:
// a set of fiscal "vital signs", the report's key findings ("the diagnosis"),
// and its recommendations ("the way forward"), each anchored to the original
// EN + ML source PDFs. Source: docs/data/data-model.md.
// ===========================================================================

/** Clinical severity used to colour vital-sign gauges and finding cards. */
export type FiscalSeverity = "critical" | "warning" | "ok";

/**
 * One headline fiscal ratio rendered as a colour-coded gauge.
 *
 * `baseline` is the value at the report's baseline period — the fixed point the
 * report was written to be measured against. `latest` is intentionally optional:
 * it stays undefined until a newer budget / set of actuals lands, at which point
 * the page shows the baseline → latest delta. This is what makes the page a
 * living scorecard rather than a static snapshot.
 */
export interface FiscalVital {
  key: string;
  label: string;
  labelMl?: string;
  /** Gauge value (a percentage, 0–100) at the baseline period. */
  baseline: number;
  /** Formatted baseline figure, e.g. "33.2%" or "₹5.07L cr". */
  baselineDisplay: string;
  /** Baseline period this figure is for, e.g. "2025-26 RE". */
  period: string;
  /** Denominator / context, e.g. "of GSDP", "of total revenue". */
  unit: string;
  unitMl?: string;
  /** Which way is good — drives the delta colour once `latest` is set. */
  direction: "lower-better" | "higher-better";
  status: FiscalSeverity;
  /** Short caveat shown under the gauge, e.g. "lowest among Indian states". */
  note?: string;
  noteMl?: string;
  /** Filled when a later budget / actuals update arrives; undefined at baseline. */
  latest?: number;
  latestDisplay?: string;
  /** Period the `latest` figure is for, e.g. "2027-28 BE". */
  latestPeriod?: string;
}

/**
 * An optional time-series attached to a finding, so the diagnosis can be tracked
 * as a graph and updated each budget. Reuses `KpiTimePoint` (the same actual /
 * projection / target vocabulary the KPIs use).
 *
 * - "histogram" — a per-year level/flow (RBI-advance days, debt-to-GSDP, PSE
 *   losses, welfare share). Append one `actual` point each budget.
 * - "burndown"  — a stock to be paid down toward `target` (arrears, KIIFB
 *   liability). Starts as a single baseline point; the trajectory fills in.
 */
export interface FindingChart {
  kind: "histogram" | "burndown";
  /** Y-axis caption, e.g. "days / year", "% of GSDP", "₹ crore". */
  unit: string;
  unitMl?: string;
  /** History (and any projections/targets), sorted by year ascending. */
  points: KpiTimePoint[];
  /** Reference line — the goal (e.g. FRBM ceiling, or 0 for a burn-down). */
  target?: number;
  targetLabel?: string;
  /** Exact provenance of this series, e.g. "Status Report, Table 2.6". */
  source: string;
}

/** A key finding from the report — "the diagnosis". */
export interface StatusFinding {
  key: string;
  heading: string;
  headingMl?: string;
  /** Headline number for the card, e.g. "₹48,733 cr". */
  stat?: string;
  detail: string;
  detailMl?: string;
  severity: FiscalSeverity;
  /** Report chapter this finding is drawn from. */
  chapter: number;
  /** Optional trackable series — rendered as a chart, grows each budget. */
  chart?: FindingChart;
}

/**
 * How far the government has gone in acting on a recommendation. Tracked
 * separately from manifesto promises — these are advisory, not commitments.
 * Bump as evidence (typically a Government Order) appears; cite it in `goIds`.
 */
export type AdoptionStatus =
  | "not-started"
  | "acknowledged"
  | "go-issued"
  | "implemented";

/** A recommendation from the report — "the way forward". */
export interface RecoveryLever {
  key: string;
  heading: string;
  headingMl?: string;
  detail: string;
  detailMl?: string;
  /** Immediate (do now) vs structural (multi-year reform). */
  horizon: "immediate" | "structural";
  /** Government's progress in acting on this recommendation. */
  adoption: AdoptionStatus;
  /** FKs → GovernmentOrder.id evidencing adoption (drives the status above). */
  goIds?: string[];
}

/** A link to one language edition of the original PDF. */
export interface StatusSource {
  lang: "en" | "ml";
  label: string;
  labelMl?: string;
  url: string;
}

/**
 * One slice of "where every ₹100 of revenue goes" — a part-to-whole framing of
 * revenue receipts. `paise` values across the segments sum to ≈100.
 */
export interface RupeeSegment {
  key: string;
  label: string;
  labelMl?: string;
  /** Paise out of ₹100 of revenue receipts. */
  paise: number;
  /** Drives colour (critical = red, warning = amber, ok = green). */
  severity: FiscalSeverity;
  /** Pre-committed (salary / pension / interest) vs discretionary spend. */
  committed?: boolean;
  /** Exact provenance, e.g. "Status Report, Table 3.x". */
  source?: string;
}

/**
 * One year of treasury liquidity, rendered as a waffle calendar. A day sits in
 * exactly one bucket — the deepest RBI support tier it reached that day:
 * within-means, Ways & Means Advances, or Overdraft. `wmaDays` + `overdraftDays`
 * + within-means ≈ 365. The day-by-day sequence is not published, so the waffle
 * shows yearly totals (part-to-whole), never a timeline.
 */
export interface TreasuryYear {
  year: number;
  /** Days drawing Ways & Means Advances. */
  wmaDays: number;
  /** Days in outright Overdraft (the deepest tier). */
  overdraftDays: number;
  /** Within-means days; derived as 365 − wma − overdraft when omitted. */
  normalDays?: number;
  /** Historical norm for context (≈18 days/yr). */
  normDays?: number;
  /** Exact provenance, e.g. "Status Report, Table 2.6". */
  source: string;
  sourceUrl?: string;
}

/**
 * A long-form economic / fiscal report tabled in the Assembly, rendered as a
 * readable digest. IDs: statuspaper.<term>-<slug>.
 */
export interface StatusPaper {
  id: string;
  title: string;
  titleMl?: string;
  subtitle: string;
  subtitleMl?: string;
  /** Assembly term, e.g. "16kla". */
  term: string;
  /** ISO date the report was tabled / published. */
  tabledOn: string;
  /** One-paragraph plain-language summary of what the report is. */
  summary: string;
  summaryMl?: string;
  /** Provenance of the Malayalam strings on this record. */
  translationStatus?: TranslationStatus;
  vitals: FiscalVital[];
  /** Optional "where every ₹100 goes" breakdown; falls back to a derived bar. */
  revenueRupee?: RupeeSegment[];
  /** Optional treasury-liquidity year for the waffle calendar. */
  treasury?: TreasuryYear;
  findings: StatusFinding[];
  levers: RecoveryLever[];
  sources: StatusSource[];
  meta: {
    /** Publishing body, e.g. "Finance Department, Government of Kerala". */
    publishedBy: string;
    /** Portal the PDFs were retrieved from. */
    source: string;
    /** ISO timestamp the digest was compiled from source. */
    retrievedAt: string;
  };
  dataStatus: "verified" | "unverified" | "tbd";
}

// ===========================================================================
// Budget — the annual budget rendered as a story (Promise → Reckoning →
// Response), correlated to the white paper. IDs: budget.<fy>-<govt>.
// Source: docs/specs/budget-report.md.
// ===========================================================================

/** One headline budget figure, optionally paired with the compared budget. */
export interface BudgetVital {
  key: string;
  label: string;
  labelMl?: string;
  /** ₹ crore (or a % when `unit` says so). */
  value: number;
  /** Formatted, e.g. "₹1,69,646 cr" or "2.12%". */
  display: string;
  unit: string;
  unitMl?: string;
  /** Same metric in the budget being compared against (the LDF original). */
  comparedValue?: number;
  comparedDisplay?: string;
  /** Which way is good — drives the delta colour. */
  direction?: "lower-better" | "higher-better";
  source: string;
}

/** A sector allocation line, in ₹ crore. */
export interface SectorAllocation {
  key: string;
  label: string;
  labelMl?: string;
  amountCr: number;
  note?: string;
  noteMl?: string;
  source: string;
}

/** A flagship scheme announced in the budget. */
export interface BudgetScheme {
  key: string;
  heading: string;
  headingMl?: string;
  detail: string;
  detailMl?: string;
  /** Headline figure, e.g. "₹25 lakh/family", "₹400 cr". */
  amount?: string;
  /** Which government's document announced it. */
  origin: "ldf" | "udf";
  /** FK → GovernmentOrder.id evidencing the scheme has started. */
  goIds?: string[];
}

/** A revenue / tax measure. */
export interface TaxMeasure {
  key: string;
  heading: string;
  headingMl?: string;
  detail: string;
  detailMl?: string;
  kind: "relief" | "hike" | "settlement";
}

/**
 * How the budget grades against one white-paper item — the report card that
 * correlates the budget to the `/economy` status paper. `key` matches a
 * StatusFinding / RecoveryLever / FiscalVital key on the paper.
 */
export interface WhitePaperVerdict {
  key: string;
  refType: "vital" | "finding" | "lever";
  verdict: "acted" | "partial" | "not-addressed" | "worsened";
  note: string;
  noteMl?: string;
}

/**
 * A state budget, rendered as a story and correlated to the white paper.
 * IDs: budget.<fy>-<govt>, e.g. budget.2026-27-udf.
 */
export interface Budget {
  id: string;
  /** Financial year, e.g. "2026-27". */
  fy: string;
  variant: "original" | "revised";
  government: "LDF" | "UDF";
  /** ISO date presented in the Assembly. */
  presentedOn: string;
  /** Who presented it, e.g. "V.D. Satheesan (CM, Finance)". */
  presentedBy: string;
  title: string;
  titleMl?: string;
  summary: string;
  summaryMl?: string;
  headlines: BudgetVital[];
  /** Where every ₹100 of revenue comes from. */
  rupeeIn?: RupeeSegment[];
  /** Where every ₹100 of revenue goes. */
  rupeeOut?: RupeeSegment[];
  allocations: SectorAllocation[];
  schemes: BudgetScheme[];
  taxes: TaxMeasure[];
  /** The white-paper report card. */
  verdicts?: WhitePaperVerdict[];
  /** FK → the budget this one revises / compares against. */
  vsBudgetId?: string;
  sources: StatusSource[];
  translationStatus?: TranslationStatus;
  dataStatus: "verified" | "unverified" | "tbd";
}

// ===========================================================================
// Knowledge graph — a derived projection over the entities above.
//
// Nodes and edges are GENERATED from the typed fixtures (and the durable
// `["go_ingested"]` mirror), never hand-authored in parallel. The authoritative
// data stays in its own records; the graph just makes the relationships between
// them traversable (KPI ← department ← minister, GO → manifesto goal, etc.).
// Spec: docs/plans/kv-graph-spec.md.
// ===========================================================================

/** The kinds of entity a graph node can stand in for. */
export type GraphNodeType =
  | "kpi"
  | "department"
  | "person"
  | "government_order"
  | "manifesto_goal"
  | "status_paper_vital"
  | "appointment";

/**
 * The relationship vocabulary. Every edge type used in code must appear here.
 * - `OWNED_BY`       KPI → department primarily accountable for it
 * - `CONTRIBUTES_TO` KPI → a secondary department that also contributes to it
 * - `PORTFOLIO`      person (minister) → department they hold (carries tenure)
 * - `ISSUED_BY`      government order → issuing department
 * - `IMPACTS`        government order → manifesto goal it backs (LLM-derived)
 * - `REFERENCES`     government order → another order it cites (relation in props)
 * - `BASELINES`      status-paper vital → KPI it establishes a baseline for
 * - `APPOINTED_TO`   appointment → department it places the holder in (carries tenure)
 * - `APPOINTEE`      appointment → the person appointed (only on a confident match)
 * - `EVIDENCED_BY`   appointment → the government order that made it (provenance)
 */
export type GraphEdgeType =
  | "OWNED_BY"
  | "CONTRIBUTES_TO"
  | "PORTFOLIO"
  | "ISSUED_BY"
  | "IMPACTS"
  | "REFERENCES"
  | "BASELINES"
  | "APPOINTED_TO"
  | "APPOINTEE"
  | "EVIDENCED_BY";

/**
 * A node in the derived graph. `id` is the EXISTING entity id verbatim
 * (e.g. "dept.finance", "fiscal.debt-to-gsdp") so edges reference real records.
 */
export interface GraphNode {
  id: string;
  type: GraphNodeType;
  /** Human-readable display string (EN). */
  label: string;
  /** Malayalam display string (bilingual invariant). */
  labelMl?: string;
  /** JSON bag of extra display/query properties (may include `*Ml` fields). */
  properties?: Record<string, unknown>;
}

/** A directed, typed edge between two nodes. Written to both adjacency indexes. */
export interface GraphEdge {
  sourceId: string;
  targetId: string;
  type: GraphEdgeType;
  properties?: {
    /** Causal weight, 0.0 (negligible) → 1.0 (direct driver). */
    weight?: number;
    /** Tagging confidence carried over from the source record. */
    confidence?: string;
    /** ISO date the link occurred / the source record is dated. */
    date?: string;
    /** Tenure window for PORTFOLIO / APPOINTED_TO edges. */
    termStart?: string;
    /** Undefined termEnd = still in post (used to find the active holder). */
    termEnd?: string;
    /** Branch of state for APPOINTED_TO edges (AppointmentBranch). */
    branch?: string;
    /** Relation kind for REFERENCES edges (GoRelation). */
    relation?: string;
  };
}
