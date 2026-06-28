import type { Kpi } from "../data/types.ts";
import type { KpiDepartmentOrder, KpiPromiseBackedOrder } from "./graph.ts";

export type TimelineEventKind = "data" | "promise-action" | "dept-order";

export interface TimelineEvent {
  id: string;
  /** ISO date or year string for sorting. */
  date: string;
  kind: TimelineEventKind;
  kindLabel: string;
  kindLabelMl: string;
  title: string;
  titleMl?: string;
  href?: string;
  /** Formatted value line for data points, e.g. "36.4 %". */
  valueLabel?: string;
  confidence?: string;
  goalHint?: string;
  goalHintMl?: string;
}

/** Merge KPI history, promise-backed GOs, and dept orders into one timeline. */
export function buildKpiTimeline(
  kpi: Kpi,
  promiseOrders: KpiPromiseBackedOrder[],
  deptOrders: KpiDepartmentOrder[],
  lang: "en" | "ml",
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const pt of kpi.timeSeries ?? []) {
    if (pt.kind !== "actual") continue;
    const valueLabel = `${pt.value}${kpi.unit === "%" ? "" : " "}${kpi.unit}`;
    events.push({
      id: `data-${pt.year}`,
      date: `${pt.year}-06-01`,
      kind: "data",
      kindLabel: "Published value",
      kindLabelMl: "പ്രസിദ്ധീകരിച്ച മൂല്യം",
      title: lang === "ml" ? kpi.titleMl : kpi.title,
      valueLabel,
    });
  }

  for (const o of promiseOrders) {
    const goal = o.goals[0];
    events.push({
      id: o.id,
      date: o.date,
      kind: "promise-action",
      kindLabel: "Promise-backed action",
      kindLabelMl: "വാഗ്ദാന-പിന്തുണയുള്ള നടപടി",
      title: lang === "ml" && o.subjectMl ? o.subjectMl : o.subject,
      titleMl: o.subjectMl,
      href: `/gov/orders/${o.id}`,
      confidence: o.confidence,
      goalHint: goal?.title,
      goalHintMl: goal?.titleMl,
    });
  }

  for (const o of deptOrders) {
    events.push({
      id: `dept-${o.id}`,
      date: o.date,
      kind: "dept-order",
      kindLabel: "Same department",
      kindLabelMl: "അതേ വകുപ്പ്",
      title: lang === "ml" && o.subjectMl ? o.subjectMl : o.subject,
      titleMl: o.subjectMl,
      href: `/gov/orders/${o.id}`,
    });
  }

  return events.sort((a, b) => b.date.localeCompare(a.date));
}
