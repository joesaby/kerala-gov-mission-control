import { HttpError, page } from "fresh";
import { define } from "../../utils.ts";
import { t } from "../../data/lang.ts";
import { getDepartment, getKpi, listMinistersByPerson } from "../../data/db.ts";
import {
  getKpiDepartmentOrders,
  getKpiLineage,
  type KpiDepartmentOrder,
} from "../../lib/graph.ts";
import { Header } from "../../components/Header.tsx";
import { Footer } from "../../components/Footer.tsx";
import { StatusBadge } from "../../components/StatusBadge.tsx";
import { TrendArrow } from "../../components/TrendArrow.tsx";
import {
  AccountabilityChain,
  type ChainLink,
} from "../../components/AccountabilityChain.tsx";
import type { Kpi } from "../../data/types.ts";

interface NamePair {
  name: string;
  nameMl?: string;
  slug: string;
}

interface ImpactingOrder {
  id: string;
  subject: string;
  subjectMl?: string;
  date: string;
}

interface Data {
  kpi: Kpi;
  ownerDept: NamePair | null;
  minister: NamePair | null;
  impactingOrders: ImpactingOrder[];
  /** Orders from the accountable department — administrative association, not causation. */
  departmentOrders: KpiDepartmentOrder[];
}

export const handler = define.handlers<Data>({
  async GET(ctx) {
    const kpi = await getKpi(ctx.params.id);
    if (!kpi) throw new HttpError(404, "KPI not found");

    let ownerDept: NamePair | null = null;
    let minister: NamePair | null = null;
    let impactingOrders: ImpactingOrder[] = [];
    let departmentOrders: KpiDepartmentOrder[] = [];

    // Primary path: traverse the knowledge graph for the accountability chain.
    try {
      const lin = await getKpiLineage(kpi.id);
      if (lin.ownerDept) {
        ownerDept = {
          name: lin.ownerDept.label,
          nameMl: lin.ownerDept.labelMl,
          slug: String(lin.ownerDept.properties?.slug ?? ""),
        };
      }
      if (lin.activeMinister) {
        const tenures = await listMinistersByPerson(lin.activeMinister.id);
        const current = tenures.find((m) => !m.termEnd) ?? tenures[0];
        if (current) {
          minister = {
            name: current.name,
            nameMl: current.nameMl,
            slug: current.slug,
          };
        }
      }
      impactingOrders = lin.impactingOrders.map(({ order, edge }) => ({
        id: order.id,
        subject: order.label,
        subjectMl: order.labelMl,
        date: String(order.properties?.date ?? edge.properties?.date ?? ""),
      }));
    } catch {
      // Graph unavailable — fall through to the direct FK lookup below.
    }

    // Fallback so the chain still renders if the graph projection is missing.
    if (!ownerDept && kpi.ownerDeptId) {
      const d = await getDepartment(kpi.ownerDeptId);
      if (d) ownerDept = { name: d.name, nameMl: d.nameMl, slug: d.slug };
    }

    // Department orders: best-effort, silent on graph miss.
    try {
      departmentOrders = await getKpiDepartmentOrders(kpi.id);
    } catch {
      // Graph unavailable — section will render empty state.
    }

    return page({
      kpi,
      ownerDept,
      minister,
      impactingOrders,
      departmentOrders,
    });
  },
});

function fmt(n: number): string {
  if (Number.isInteger(n) && Math.abs(n) >= 100) {
    return n.toLocaleString("en-IN");
  }
  return n.toFixed(1);
}

export default define.page<typeof handler>(function KpiPage({ data, state }) {
  const lang = state.lang;
  const { kpi, ownerDept, minister, impactingOrders, departmentOrders } = data;

  const title = lang === "ml" ? kpi.titleMl : kpi.title;
  const definition = lang === "ml" && kpi.meta.definitionMl
    ? kpi.meta.definitionMl
    : kpi.meta.definition;

  const pick = (p: NamePair) => (lang === "ml" ? p.nameMl ?? p.name : p.name);

  // Build the accountability chain: Source → Department → Minister → Indicator.
  const chain: ChainLink[] = [
    {
      kind: "Source",
      kindMl: "ഉറവിടം",
      label: kpi.meta.source,
      href: kpi.meta.sourceUrl,
    },
  ];
  if (ownerDept && ownerDept.slug) {
    chain.push({
      kind: "Department",
      kindMl: "വകുപ്പ്",
      label: pick(ownerDept),
      href: `/gov/departments/${ownerDept.slug}`,
    });
  }
  if (minister) {
    chain.push({
      kind: "Minister",
      kindMl: "മന്ത്രി",
      label: pick(minister),
      href: `/gov/ministers/${minister.slug}`,
    });
  }
  chain.push({ kind: "Indicator", kindMl: "സൂചകം", label: title });

  return (
    <>
      <Header lang={lang} path={state.path} />
      <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <p class="text-xs">
          <a href="/data" class="link link-hover text-base-content/60">
            ← {t(lang, "All indicators", "എല്ലാ സൂചകങ്ങളും")}
          </a>
        </p>

        <header class="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <h1
            class={`font-display text-3xl md:text-4xl font-bold ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {title}
          </h1>
          <StatusBadge status={kpi.status} lang={lang} />
        </header>

        <div class="mt-4 flex items-baseline gap-2 flex-wrap">
          <span class="metric-value text-4xl font-bold tabular-nums">
            {fmt(kpi.value)}
          </span>
          <span class="text-base text-base-content/60 font-medium">
            {kpi.unit}
          </span>
          <span class="ml-2">
            <TrendArrow
              trend={kpi.trend}
              delta={kpi.trendDelta}
              unit={kpi.unit}
              direction={kpi.direction}
              window={kpi.trendWindow}
            />
          </span>
        </div>

        <div class="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-base-content/70">
          {kpi.target !== undefined && (
            <span>
              {t(lang, "Goal", "ലക്ഷ്യം")}:{" "}
              <span class="font-semibold tabular-nums text-base-content">
                {fmt(kpi.target)} {kpi.unit}
              </span>
            </span>
          )}
          {kpi.comparators.map((c) => (
            <span>
              {c.label}:{" "}
              <span class="font-semibold tabular-nums text-base-content">
                {fmt(c.value)} {kpi.unit}
              </span>
            </span>
          ))}
        </div>

        {/* Accountability chain — traces this number back to who answers for it. */}
        <section class="mt-8">
          <h2 class="text-[11px] font-semibold uppercase tracking-wider text-base-content/55 mb-2">
            {t(lang, "Accountability", "ഉത്തരവാദിത്തം")}
          </h2>
          <AccountabilityChain links={chain} lang={lang} />
        </section>

        {/* Definition + provenance. */}
        <section class="mt-8 rounded-box border border-base-300 bg-base-100 p-5">
          <p class={`text-sm leading-relaxed ${lang === "ml" ? "ml" : ""}`}>
            {definition}
          </p>
          <dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-base-content/70">
            <dt class="text-base-content/50">{t(lang, "Source", "ഉറവിടം")}</dt>
            <dd>
              {kpi.meta.sourceUrl
                ? (
                  <a
                    href={kpi.meta.sourceUrl}
                    class="link link-hover"
                    rel="external"
                  >
                    {kpi.meta.source}
                  </a>
                )
                : kpi.meta.source}
            </dd>
            <dt class="text-base-content/50">{t(lang, "Owner", "ഉത്തരവാദി")}</dt>
            <dd>{kpi.meta.owner}</dd>
            <dt class="text-base-content/50">
              {t(lang, "Updated", "പുതുക്കൽ")}
            </dt>
            <dd class="capitalize">{kpi.meta.updateFrequency}</dd>
          </dl>
        </section>

        {/* Time series. */}
        {kpi.timeSeries && kpi.timeSeries.length > 0 && (
          <section class="mt-8">
            <h2 class="font-display text-lg font-semibold mb-3">
              {t(lang, "History & projections", "ചരിത്രവും പ്രവചനങ്ങളും")}
            </h2>
            <div class="overflow-x-auto">
              <table class="table table-sm w-full max-w-md">
                <thead>
                  <tr>
                    <th>{t(lang, "Year", "വർഷം")}</th>
                    <th class="text-right">{t(lang, "Value", "മൂല്യം")}</th>
                    <th>{t(lang, "Kind", "തരം")}</th>
                  </tr>
                </thead>
                <tbody>
                  {kpi.timeSeries.map((pt) => (
                    <tr key={`${pt.year}-${pt.kind}`}>
                      <td class="tabular-nums">{pt.year}</td>
                      <td class="text-right tabular-nums">
                        {fmt(pt.value)} {kpi.unit}
                      </td>
                      <td class="capitalize text-base-content/60">{pt.kind}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Government orders linked to this indicator (graph IMPACTS edges). */}
        <section class="mt-8">
          <h2 class="font-display text-lg font-semibold mb-3">
            {t(
              lang,
              "Decisions affecting this metric",
              "ഈ സൂചകത്തെ ബാധിക്കുന്ന തീരുമാനങ്ങൾ",
            )}
          </h2>
          {impactingOrders.length > 0
            ? (
              <ul class="flex flex-col gap-2">
                {impactingOrders.map((o) => (
                  <li key={o.id}>
                    <a
                      href={`/gov/orders/${o.id}`}
                      class="surface-link block p-3"
                    >
                      <span class="text-xs tabular-nums text-base-content/50">
                        {o.date}
                      </span>
                      <div class={lang === "ml" && o.subjectMl ? "ml" : ""}>
                        {lang === "ml" && o.subjectMl ? o.subjectMl : o.subject}
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )
            : (
              <p class="text-sm text-base-content/60">
                {t(
                  lang,
                  "No Government Orders are directly linked to this indicator yet. Linked decisions appear here as they are ingested and tagged.",
                  "ഈ സൂചകവുമായി നേരിട്ട് ബന്ധിപ്പിച്ച സർക്കാർ ഉത്തരവുകളൊന്നും ഇതുവരെയില്ല. ടാഗ് ചെയ്യപ്പെടുന്ന മുറയ്ക്ക് അവ ഇവിടെ കാണാം.",
                )}
              </p>
            )}
        </section>

        {/* Department orders — administrative co-occurrence, NOT proven causation. */}
        <section class="mt-8">
          <h2 class="font-display text-lg font-semibold mb-1">
            {t(
              lang,
              "Orders from the accountable department",
              "ഉത്തരവാദ വകുപ്പിൽ നിന്നുള്ള ഉത്തരവുകൾ",
            )}
          </h2>
          <p class="text-xs text-base-content/55 mb-3 italic">
            {t(
              lang,
              "Co-movement, not proven causation — orders issued by the department accountable for this indicator.",
              "സഹ-ചലനം, തെളിയിക്കപ്പെട്ട കാര്യകാരണബന്ധമല്ല — ഈ സൂചകത്തിന് ഉത്തരവാദിത്തമുള്ള വകുപ്പ് പുറപ്പെടുവിച്ച ഉത്തരവുകൾ.",
            )}
          </p>
          {departmentOrders.length > 0
            ? (
              <ul class="flex flex-col gap-2">
                {departmentOrders.map((o) => (
                  <li key={o.id}>
                    <a
                      href={`/gov/orders/${o.id}`}
                      class="surface-link block p-3"
                    >
                      <div class="flex items-center gap-3 flex-wrap">
                        <span class="text-xs tabular-nums text-base-content/50 shrink-0">
                          {o.date}
                        </span>
                        {o.goNumber && (
                          <span class="text-xs font-mono text-base-content/40 shrink-0">
                            {o.goNumber}
                          </span>
                        )}
                      </div>
                      <div
                        class={`mt-0.5 ${
                          lang === "ml" && o.subjectMl ? "ml" : ""
                        }`}
                      >
                        {lang === "ml" && o.subjectMl ? o.subjectMl : o.subject}
                      </div>
                      {o.sourceUrl && (
                        <span class="mt-1 text-xs text-base-content/40 block">
                          {t(lang, "View PDF", "PDF കാണുക")} ↗
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            )
            : (
              <p class="text-sm text-base-content/60">
                {t(
                  lang,
                  "No orders from the accountable department have been ingested yet. They will appear here as the daily pipeline runs.",
                  "ഉത്തരവാദ വകുപ്പിൽ നിന്നുള്ള ഉത്തരവുകൾ ഇതുവരെ ഇൻജസ്റ്റ് ചെയ്തിട്ടില്ല. ദൈനംദിന പൈപ്പ്‌ലൈൻ പ്രവർത്തിക്കുന്ന മുറയ്ക്ക് അവ ഇവിടെ കാണാം.",
                )}
              </p>
            )}
        </section>
      </main>
      <Footer lang={lang} />
    </>
  );
});
