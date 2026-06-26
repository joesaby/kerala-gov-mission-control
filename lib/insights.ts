/**
 * Pure computation functions for the /gov/insights activity-signals page.
 *
 * These functions derive factual counts from primary records — they do NOT
 * assert causal relationships between orders and outcomes.
 */

import type {
  Appointment,
  Department,
  GovernmentOrder,
  ManifestoGoal,
} from "../data/types.ts";

// ---------------------------------------------------------------------------
// 1. Manifesto coverage gaps
// ---------------------------------------------------------------------------

export interface ManifestoCoverageResult {
  /** Goals that have zero inbound IMPACTS edges (no backing GOs). */
  zeroCoverageGoals: ManifestoGoal[];
  /** Count of GOs that map to NO manifesto goal. */
  offManifestoCount: number;
  /** All orders with no manifesto goal IDs — for provenance display. */
  offManifestoOrders: GovernmentOrder[];
  /** Total GO count in the input. */
  totalOrders: number;
  /** Total manifesto goal count in the input. */
  totalGoals: number;
  /** Map from goal id -> list of backing GO ids (for provenance). */
  gosByGoalId: Map<string, string[]>;
}

/**
 * Given flat lists of goals and orders, compute manifesto coverage gaps.
 * Pure — no KV access.
 */
export function computeManifestoCoverage(
  goals: ManifestoGoal[],
  orders: GovernmentOrder[],
): ManifestoCoverageResult {
  const gosByGoalId = new Map<string, string[]>();
  const offManifestoOrders: GovernmentOrder[] = [];

  for (const goal of goals) {
    gosByGoalId.set(goal.id, []);
  }

  for (const order of orders) {
    const ids = order.manifestoGoalIds ?? [];
    if (ids.length === 0) {
      offManifestoOrders.push(order);
    } else {
      for (const goalId of ids) {
        if (!gosByGoalId.has(goalId)) {
          gosByGoalId.set(goalId, []);
        }
        gosByGoalId.get(goalId)!.push(order.id);
      }
    }
  }

  const zeroCoverageGoals = goals.filter(
    (g) => (gosByGoalId.get(g.id) ?? []).length === 0,
  );

  return {
    zeroCoverageGoals,
    offManifestoCount: offManifestoOrders.length,
    offManifestoOrders,
    totalOrders: orders.length,
    totalGoals: goals.length,
    gosByGoalId,
  };
}

// ---------------------------------------------------------------------------
// 2. Department GO velocity
// ---------------------------------------------------------------------------

export interface DeptMonthBucket {
  month: string; // "YYYY-MM"
  count: number;
}

export interface DeptVelocitySummary {
  dept: Department;
  monthlyBuckets: DeptMonthBucket[];
  trailingMean: number;
  trailingStdDev: number;
  /** Count in the most recent complete month. */
  mostRecentCount: number;
  /** True when mostRecentCount > trailingMean + 2 * trailingStdDev. */
  anomalous: boolean;
  /** Orders in the most recent month — for provenance links. */
  mostRecentOrders: GovernmentOrder[];
}

export interface DeptVelocityResult {
  summaries: DeptVelocitySummary[];
  /** Departments that are anomalously active (in descending order of z-score). */
  flagged: DeptVelocitySummary[];
  /**
   * True when no department yet has enough baseline history for anomaly
   * detection — so an empty `flagged` means "still building a baseline", not
   * "nothing unusual".
   */
  insufficientHistory: boolean;
}

/**
 * Months of baseline history required before a department can be flagged
 * anomalous. With only a month or two of data (cold start) the trailing mean is
 * ~0, so every active department would false-flag.
 */
const MIN_BASELINE_MONTHS = 3;

/** Extract "YYYY-MM" from an ISO date string. */
function toYearMonth(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/**
 * Compute sample mean and standard deviation from a list of numbers.
 * Returns mean=0, stdDev=0 if input is empty or a single value.
 */
function meanAndStdDev(values: number[]): { mean: number; stdDev: number } {
  if (values.length === 0) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (values.length < 2) return { mean, stdDev: 0 };
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) /
    (values.length - 1);
  return { mean, stdDev: Math.sqrt(variance) };
}

/**
 * Given a flat list of orders and departments, compute monthly GO velocity per
 * department and flag anomalously active departments.
 * Pure — no KV access.
 *
 * `trailingMonths` sets the look-back window for the baseline mean/stdDev.
 * The most recent month is EXCLUDED from the baseline so anomaly detection
 * compares the latest month against history.
 */
export function computeDeptGoVelocity(
  orders: GovernmentOrder[],
  depts: Department[],
  trailingMonths = 12,
): DeptVelocityResult {
  const deptById = new Map<string, Department>(depts.map((d) => [d.id, d]));

  // Group orders by deptId → month
  const ordersByDeptMonth = new Map<string, Map<string, GovernmentOrder[]>>();
  for (const order of orders) {
    if (!order.deptId) continue;
    const month = toYearMonth(order.date);
    if (!ordersByDeptMonth.has(order.deptId)) {
      ordersByDeptMonth.set(order.deptId, new Map());
    }
    const monthMap = ordersByDeptMonth.get(order.deptId)!;
    if (!monthMap.has(month)) monthMap.set(month, []);
    monthMap.get(month)!.push(order);
  }

  const summaries: DeptVelocitySummary[] = [];

  for (const [deptId, monthMap] of ordersByDeptMonth) {
    const dept = deptById.get(deptId);
    if (!dept) continue;

    // Build a sorted list of all months seen for this dept
    const allMonths = [...monthMap.keys()].sort();
    if (allMonths.length === 0) continue;

    const mostRecentMonth = allMonths[allMonths.length - 1];
    const mostRecentOrders = monthMap.get(mostRecentMonth) ?? [];
    const mostRecentCount = mostRecentOrders.length;

    // Baseline: the months before the most recent, up to trailingMonths
    const baselineMonths = allMonths.slice(
      Math.max(0, allMonths.length - 1 - trailingMonths),
      allMonths.length - 1,
    );
    const baselineCounts = baselineMonths.map(
      (m) => (monthMap.get(m) ?? []).length,
    );
    const { mean, stdDev } = meanAndStdDev(baselineCounts);

    // Cold-start guard: only flag once there's a real baseline
    // (≥ MIN_BASELINE_MONTHS). Without it a department in its first month —
    // trailing mean ~0 — flags spuriously. With enough history, a flat baseline
    // (stdDev 0) still flags on a clear multiplicative jump.
    const hasBaseline = baselineMonths.length >= MIN_BASELINE_MONTHS;
    const anomalous = hasBaseline && (
      stdDev > 0
        ? mostRecentCount > mean + 2 * stdDev
        : mostRecentCount > mean * 2 && mostRecentCount > 1
    );

    const monthlyBuckets: DeptMonthBucket[] = allMonths.map((m) => ({
      month: m,
      count: (monthMap.get(m) ?? []).length,
    }));

    summaries.push({
      dept,
      monthlyBuckets,
      trailingMean: mean,
      trailingStdDev: stdDev,
      mostRecentCount,
      anomalous,
      mostRecentOrders,
    });
  }

  summaries.sort((a, b) => {
    const za = a.trailingStdDev > 0
      ? (a.mostRecentCount - a.trailingMean) / a.trailingStdDev
      : 0;
    const zb = b.trailingStdDev > 0
      ? (b.mostRecentCount - b.trailingMean) / b.trailingStdDev
      : 0;
    return zb - za;
  });

  const flagged = summaries.filter((s) => s.anomalous);
  // Baseline excludes the most recent month, so a dept needs
  // MIN_BASELINE_MONTHS + 1 total months before it can be flagged.
  const insufficientHistory = summaries.every(
    (s) => s.monthlyBuckets.length - 1 < MIN_BASELINE_MONTHS,
  );

  return { summaries, flagged, insufficientHistory };
}

// ---------------------------------------------------------------------------
// 3. Office churn
// ---------------------------------------------------------------------------

export interface OfficeChurnEntry {
  office: string;
  officeMl?: string;
  branch: Appointment["branch"];
  deptId?: string;
  /** Closed tenures in the window. */
  closedCount: number;
  /** Most recent action verbs seen. */
  recentActions: Appointment["action"][];
  /** Source GO ids for provenance. */
  goIds: string[];
  /** Source URLs for provenance. */
  sourceUrls: string[];
}

export interface OfficeChurnResult {
  entries: OfficeChurnEntry[];
  /** Total closed-tenure appointments in the window. */
  totalClosed: number;
  /** True when there were zero appointments in the window. */
  noData: boolean;
  windowDays: number;
}

/**
 * Compute office churn: per office string, count appointments with a closed
 * tenure (`termEnd` set) in the last `windowDays` days.
 * Pure — no KV access.
 *
 * NOTE: Coverage is limited when appointees are not matched to a `Person`;
 * the UI surfaces this caveat.
 */
export function computeOfficeChurn(
  appointments: Appointment[],
  windowDays = 180,
): OfficeChurnResult {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  // Only count closed-tenure appointments in the window
  const inWindow = appointments.filter(
    (a) =>
      a.termEnd !== undefined &&
      a.termStart >= cutoffStr,
  );

  const byOffice = new Map<string, OfficeChurnEntry>();

  for (const appt of inWindow) {
    const key = appt.office.toLowerCase();
    if (!byOffice.has(key)) {
      byOffice.set(key, {
        office: appt.office,
        officeMl: appt.officeMl,
        branch: appt.branch,
        deptId: appt.deptId,
        closedCount: 0,
        recentActions: [],
        goIds: [],
        sourceUrls: [],
      });
    }
    const entry = byOffice.get(key)!;
    entry.closedCount++;
    if (!entry.recentActions.includes(appt.action)) {
      entry.recentActions.push(appt.action);
    }
    if (!entry.goIds.includes(appt.goId)) entry.goIds.push(appt.goId);
    if (!entry.sourceUrls.includes(appt.sourceUrl)) {
      entry.sourceUrls.push(appt.sourceUrl);
    }
  }

  const entries = [...byOffice.values()].sort(
    (a, b) => b.closedCount - a.closedCount,
  );

  return {
    entries,
    totalClosed: inWindow.length,
    noData: appointments.length === 0,
    windowDays,
  };
}
