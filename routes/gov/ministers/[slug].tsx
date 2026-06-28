import { HttpError, page } from "fresh";
import { define } from "../../../utils.ts";
import { t, translateParty } from "../../../data/lang.ts";
import {
  getGovernment,
  getMinisterBySlug,
  getPerson,
  listDepartments,
  listGovernmentOrders,
  listKpis,
} from "../../../data/db.ts";
import { Header } from "../../../components/Header.tsx";
import { Footer } from "../../../components/Footer.tsx";
import { KpiCard } from "../../../components/KpiCard.tsx";
import { MinisterAvatar } from "../../../components/MinisterAvatar.tsx";
import OrdersBrowser from "../../../islands/OrdersBrowser.tsx";
import type {
  Department,
  Government,
  GovernmentOrder,
  Kpi,
  Minister,
} from "../../../data/types.ts";

interface Data {
  minister: Minister;
  govt: Government | null;
  depts: Department[];
  kpis: Kpi[];
  /** Slug of the underlying Person, for the full-profile hub link. */
  personSlug: string | null;
  orders: GovernmentOrder[];
  allDepts: Department[];
}

export const handler = define.handlers<Data>({
  async GET(ctx) {
    const minister = await getMinisterBySlug(ctx.params.slug);
    if (!minister) throw new HttpError(404, "Minister not found");
    const [allDepts, allKpis, govt, person, allOrders] = await Promise.all([
      listDepartments(),
      listKpis(),
      minister.governmentId
        ? getGovernment(minister.governmentId)
        : Promise.resolve(null),
      getPerson(minister.personId),
      listGovernmentOrders(),
    ]);
    const depts = allDepts.filter((d) => minister.departmentIds.includes(d.id));
    const deptIdSet = new Set(minister.departmentIds);
    const kpis = allKpis.filter((k) =>
      (k.ownerDeptId && deptIdSet.has(k.ownerDeptId)) ||
      k.contributingDeptIds?.some((id) => deptIdSet.has(id))
    );
    const orders = allOrders.filter(
      (o) => o.deptId && deptIdSet.has(o.deptId),
    );
    return page({
      minister,
      govt,
      depts,
      kpis,
      personSlug: person?.slug ?? null,
      orders,
      allDepts,
    });
  },
});

export default define.page<typeof handler>(function MinisterPage(
  { data, state },
) {
  const lang = state.lang;
  const { minister, govt, depts, kpis, personSlug, orders, allDepts } = data;
  const deptById = new Map(depts.map((d) => [d.id, d]));

  return (
    <>
      <Header lang={lang} path={state.path} />
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <p class="text-xs">
          <a
            href={govt && govt.termEnd ? `/gov?g=${govt.slug}` : "/gov"}
            class="link link-hover text-base-content/60"
          >
            ← {govt ? govt.shortName : t(lang, "Government", "സർക്കാർ")}
          </a>
        </p>
        <header class="mt-3 flex items-start gap-5 flex-wrap">
          <MinisterAvatar minister={minister} size={112} class="shrink-0" />
          <div class="min-w-0 flex-1">
            <h1
              class={`font-display text-3xl md:text-4xl font-bold ${
                lang === "ml" ? "ml" : ""
              }`}
            >
              {lang === "ml" && minister.nameMl
                ? minister.nameMl
                : minister.name}
            </h1>
            {lang === "ml" && minister.nameMl && (
              <p class="text-base-content/60 text-sm">{minister.name}</p>
            )}
            <p class="text-base-content/70 mt-1">
              {minister.rank === "CM"
                ? (lang === "ml" ? "മുഖ്യമന്ത്രി · " : "Chief Minister · ")
                : (lang === "ml" ? "മന്ത്രി · " : "Minister · ")}
              {minister.constituency}
              {minister.party && <>· {translateParty(minister.party, lang)}</>}
            </p>
            <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/60">
              {govt && (
                <span>
                  <a
                    href={govt.termEnd ? `/gov?g=${govt.slug}` : "/gov"}
                    class="link link-hover"
                  >
                    {lang === "ml" && govt.shortNameMl
                      ? govt.shortNameMl
                      : govt.shortName}
                  </a>
                  <span class="ml-1 tabular-nums">
                    ({govt.termStart.slice(0, 4)}–{govt.termEnd
                      ? govt.termEnd.slice(0, 4)
                      : (lang === "ml" ? "ഇതുവരെ" : "present")})
                  </span>
                </span>
              )}
              {minister.termStart && (
                <span>
                  {t(lang, "In office: ", "കാലയളവ്: ")}
                  <span class="tabular-nums">{minister.termStart}</span>
                  {minister.termEnd && (
                    <>
                      {" – "}
                      <span class="tabular-nums">
                        {minister.termEnd}
                      </span>
                    </>
                  )}
                </span>
              )}
              {minister.wikipediaUrl && (
                <a
                  href={minister.wikipediaUrl}
                  class="link link-hover"
                  rel="external"
                >
                  Wikipedia ↗
                </a>
              )}
              {personSlug && (
                <a
                  href={`/gov/people/${personSlug}`}
                  class="link link-hover text-primary"
                >
                  {t(lang, "Full profile & speeches →", "പൂർണ്ണ പ്രൊഫൈൽ →")}
                </a>
              )}
            </div>
          </div>
        </header>

        <section class="mt-8">
          <h2 class="font-display text-xl font-semibold mb-3">
            {t(lang, "Portfolios", "പോർട്ട്ഫോളിയോകൾ")}
          </h2>
          <ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {depts.map((d) => (
              <li>
                <a
                  href={`/gov/departments/${d.slug}`}
                  class="surface-link block p-3"
                >
                  <div class="font-medium">
                    {lang === "ml" && d.nameMl ? d.nameMl : d.name}
                  </div>
                  {(lang === "ml" && d.summaryMl ? d.summaryMl : d.summary) && (
                    <div class="text-xs text-base-content/60 mt-0.5 line-clamp-2">
                      {lang === "ml" && d.summaryMl ? d.summaryMl : d.summary}
                    </div>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section class="mt-10">
          <h2 class="font-display text-xl font-semibold mb-4">
            {t(
              lang,
              "KPIs under this minister's portfolios",
              "ഈ മന്ത്രിയുടെ വകുപ്പുകളിലെ സൂചകങ്ങൾ",
            )}
          </h2>
          {kpis.length === 0
            ? (
              <p class="text-base-content/60 text-sm">
                {t(
                  lang,
                  "No headline KPIs are currently mapped to these portfolios.",
                  "ഈ വകുപ്പുകളിലേക്ക് ഇപ്പോൾ പ്രധാന സൂചകങ്ങളൊന്നും ചേർത്തിട്ടില്ല.",
                )}
              </p>
            )
            : (
              <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {kpis.map((kpi) => (
                  <KpiCard
                    key={kpi.id}
                    kpi={kpi}
                    lang={lang}
                    dept={kpi.ownerDeptId
                      ? deptById.get(kpi.ownerDeptId) ?? null
                      : null}
                  />
                ))}
              </div>
            )}
        </section>

        <section class="mt-10">
          <h2 class="font-display text-xl font-semibold mb-4">
            {lang === "ml"
              ? "വകുപ്പുകളിലെ ഉത്തരവുകൾ"
              : "Orders & Circulars under Portfolio"}
          </h2>
          <div class="max-w-4xl">
            <OrdersBrowser orders={orders} depts={allDepts} lang={lang} />
          </div>
        </section>

        {(minister.source || minister.sourceUrl) && (
          <p class="mt-10 text-xs text-base-content/60">
            {t(lang, "Source: ", "ഉറവിടം: ")}
            {minister.sourceUrl
              ? (
                <a href={minister.sourceUrl} class="link link-hover">
                  {minister.source ?? minister.sourceUrl}
                </a>
              )
              : minister.source}
          </p>
        )}
      </main>
      <Footer lang={lang} />
    </>
  );
});
