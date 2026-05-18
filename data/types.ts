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
}

// ----- Governance entities -------------------------------------------------

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

/** Political party / coalition tags. */
export type PartyAffiliation =
  | "CPI(M)"
  | "CPI"
  | "INC"
  | "IUML"
  | "KC(M)"
  | "KC"
  | "RJD"
  | "JD(S)"
  | "NCP"
  | "Independent"
  | "Other";

export interface Minister {
  id: string;
  slug: string;
  name: string;
  nameMl?: string;
  /** Constituency they represent. */
  constituency?: string;
  party?: PartyAffiliation;
  /** Cabinet rank: Chief Minister / Cabinet / Minister of State. */
  rank?: "CM" | "Deputy CM" | "Cabinet" | "MoS";
  /** Date they assumed office in the current cabinet (ISO). */
  inOfficeSince?: string;
  /** Department IDs currently held. */
  departmentIds: string[];
  photoUrl?: string;
  /** Contact handles. */
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
