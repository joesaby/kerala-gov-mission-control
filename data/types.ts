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

export interface KpiMetadata {
  definition: string;
  definitionMl?: string;
  source: string;
  sourceUrl?: string;
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
  category:
    | "fiscal"
    | "health"
    | "education"
    | "livelihood"
    | "safety"
    | "trust"
    | "environment"
    | "delivery";
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
