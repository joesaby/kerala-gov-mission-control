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

export interface KpiMetadata {
  definition: string;
  definitionMl?: string;
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
  coalition: "LDF" | "UDF" | "Other";
  /** Minister id of the Chief Minister (must be a Minister with rank="CM"). */
  cmMinisterId: string;
  /** State assembly term number, e.g. 15 for the 15th Kerala Legislative Assembly. */
  assemblyTerm?: number;
  termStart: string;
  /** Undefined if this is the incumbent government. */
  termEnd?: string;
  summary?: string;
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
  /** Malayalam subject line — add when available; never machine-translate. */
  subjectMl?: string;
  /** FK → Department.id. Null when tagging is ambiguous (deptConfidence = "low"). */
  deptId?: string;
  /** How the department tag was assigned. */
  deptConfidence: DeptTagConfidence;
  /** ISO date the GO was issued. */
  date: string;
  /** ISO date the GO comes into force, if different from issue date. */
  effectiveDate?: string;
  /** FKs → ManifestoGoal.id — one GO may serve multiple goals. */
  manifestoGoalIds?: string[];
  /** How strongly this GO backs the listed manifesto goals. */
  manifestoConfidence?: "direct" | "supporting" | "weak";
  meta: {
    /** Name of the portal / document from which this record was fetched. */
    source: string;
    /** Direct URL to the PDF or portal page — mandatory, no exceptions. */
    sourceUrl: string;
    /** ISO timestamp of when this record was fetched/ingested. */
    retrievedAt: string;
  };
  dataStatus: "verified" | "unverified" | "tbd";
}
