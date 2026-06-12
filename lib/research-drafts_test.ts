import { generateResearchDraft } from "./research-drafts.ts";
import type { Department, Kpi } from "../data/types.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const DEPT: Department = {
  id: "dept.finance",
  slug: "finance",
  name: "Finance",
  nameMl: "ധനകാര്യം",
  domains: ["fiscal"],
  dataStatus: "verified",
};

const KPI: Kpi = {
  id: "fiscal.test-spend",
  title: "Test Spend",
  titleMl: "ടെസ്റ്റ് ചെലവ്",
  domain: "fiscal",
  ownerDeptId: "dept.finance",
  value: 1000,
  unit: " ₹ crore",
  target: 800,
  direction: "lower-better",
  trend: "down",
  trendDelta: -2,
  trendWindow: "YoY",
  status: "on-track",
  comparators: [{ label: "India avg", value: 1200 }],
  meta: {
    definition: "Test definition.",
    definitionMl: "ടെസ്റ്റ് നിർവചനം.",
    source: "Finance Accounts",
    sourceUrl: "https://finance.kerala.gov.in/test",
    owner: "Principal Secretary (Finance)",
    updateFrequency: "annual",
    lastRefreshed: "2026-06-01T00:00:00+05:30",
  },
  timeSeries: [
    { year: 2024, value: 1100, kind: "actual" },
    { year: 2030, value: 800, kind: "target" },
  ],
};

const BASE = {
  kpis: [KPI],
  departments: [DEPT],
  todayStr: "1 June 2026",
  usdRate: 80,
};

Deno.test("blog draft (en) includes title, USD conversion, and source line", () => {
  const md = generateResearchDraft({ ...BASE, lang: "en", tone: "blog" });
  assert(md.includes("# ANALYSIS"), "missing blog title");
  assert(md.includes("Test Spend"), "missing KPI title");
  // 1000 crore at ₹80/USD = $125.0M
  assert(md.includes("$125.0M"), "missing/incorrect USD conversion");
  assert(md.includes("Kerala Mission Control"), "missing attribution");
});

Deno.test("blog draft (ml) uses Malayalam title and definition", () => {
  const md = generateResearchDraft({ ...BASE, lang: "ml", tone: "blog" });
  assert(md.includes("ടെസ്റ്റ് ചെലവ്"), "missing Malayalam KPI title");
  assert(md.includes("ടെസ്റ്റ് നിർവചനം."), "missing Malayalam definition");
});

Deno.test("briefing draft tabulates the KPI and cites the source URL", () => {
  const md = generateResearchDraft({ ...BASE, lang: "en", tone: "briefing" });
  assert(md.includes("BRIEFING NOTE"), "missing briefing header");
  assert(md.includes("| Test Spend |"), "missing table row");
  assert(
    md.includes("https://finance.kerala.gov.in/test"),
    "missing source URL",
  );
  assert(!md.includes("seeds"), "stray 'seeds' wording");
});

Deno.test("factsheet draft lists comparators", () => {
  const md = generateResearchDraft({ ...BASE, lang: "en", tone: "factsheet" });
  assert(md.includes("FACT SHEET"), "missing factsheet header");
  assert(md.includes("India avg: 1200"), "missing comparator");
});

Deno.test("non-currency units get no USD approximation", () => {
  const pct: Kpi = { ...KPI, unit: "%", value: 42 };
  const md = generateResearchDraft({
    ...BASE,
    kpis: [pct],
    lang: "en",
    tone: "blog",
  });
  assert(!md.includes("approx. $"), "USD added to non-currency unit");
});
