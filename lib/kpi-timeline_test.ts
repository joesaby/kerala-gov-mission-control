import { buildKpiTimeline } from "./kpi-timeline.ts";
import type { Kpi } from "../data/types.ts";
import type { KpiPromiseBackedOrder } from "./graph.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const KPI: Kpi = {
  id: "fiscal.debt-to-gsdp",
  title: "Debt to GSDP",
  titleMl: "കടം",
  domain: "fiscal",
  ownerDeptId: "dept.finance",
  value: 36.4,
  unit: "%",
  direction: "lower-better",
  trend: "down",
  trendDelta: -1,
  trendWindow: "YoY",
  status: "on-track",
  comparators: [],
  timeSeries: [{ year: 2024, value: 38, kind: "actual" }],
  meta: {
    definition: "d",
    source: "CAG",
    sourceUrl: "https://example.gov.in",
    owner: "PS Finance",
    updateFrequency: "annual",
    lastRefreshed: "2026-06-01T00:00:00+05:30",
  },
};

Deno.test("buildKpiTimeline merges data and promise events newest-first", () => {
  const promise: KpiPromiseBackedOrder[] = [{
    id: "go.2026-fin-42",
    goNumber: "G.O.42",
    subject: "Audit order",
    date: "2026-05-20",
    sourceUrl: "https://example.gov.in/42.pdf",
    confidence: "direct",
    goals: [{
      id: "goal.udf2026-fiscal-transparency",
      title: "Fiscal transparency",
    }],
  }];

  const events = buildKpiTimeline(KPI, promise, [], "en");
  assert(events.length === 2, "expected 2 events");
  assert(events[0].kind === "promise-action", "newest should be promise");
  assert(events[1].kind === "data", "older should be data point");
});

Deno.test("buildKpiTimeline excludes dept orders when passed empty", () => {
  const events = buildKpiTimeline(KPI, [], [], "en");
  assert(
    events.every((e) => e.kind !== "dept-order"),
    "dept orders should not appear",
  );
});
