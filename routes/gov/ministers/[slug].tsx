import { HttpError, page } from "fresh";
import { define } from "../../../utils.ts";
import {
  getMinisterBySlug,
  listDepartments,
  listKpis,
} from "../../../data/db.ts";
import { Header } from "../../../components/Header.tsx";
import { Footer } from "../../../components/Footer.tsx";
import { KpiCard } from "../../../components/KpiCard.tsx";
import type { Department, Kpi, Minister } from "../../../data/types.ts";

interface Data {
  minister: Minister;
  depts: Department[];
  kpis: Kpi[];
}

export const handler = define.handlers<Data>({
  async GET(ctx) {
    const minister = await getMinisterBySlug(ctx.params.slug);
    if (!minister) throw new HttpError(404, "Minister not found");
    const [allDepts, allKpis] = await Promise.all([
      listDepartments(),
      listKpis(),
    ]);
    const depts = allDepts.filter((d) => minister.departmentIds.includes(d.id));
    const deptIdSet = new Set(minister.departmentIds);
    const kpis = allKpis.filter((k) =>
      (k.ownerDeptId && deptIdSet.has(k.ownerDeptId)) ||
      k.contributingDeptIds?.some((id) => deptIdSet.has(id))
    );
    return page({ minister, depts, kpis });
  },
});

export default define.page<typeof handler>(function MinisterPage(
  { data, state },
) {
  const lang = state.lang;
  const { minister, depts, kpis } = data;
  const deptById = new Map(depts.map((d) => [d.id, d]));

  return (
    <>
      <Header lang={lang} />
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <p class="text-xs">
          <a href="/gov" class="link link-hover text-base-content/60">
            ← Government
          </a>
        </p>
        <header class="mt-2 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 class="text-3xl md:text-4xl font-bold">{minister.name}</h1>
            <p class="text-base-content/70 mt-1">
              {minister.rank === "CM" ? "Chief Minister · " : "Minister · "}
              {minister.constituency}
              {minister.party && <>· {minister.party}</>}
            </p>
          </div>
          {minister.inOfficeSince && (
            <div class="text-xs text-base-content/60">
              In office since{" "}
              <span class="tabular-nums">{minister.inOfficeSince}</span>
            </div>
          )}
        </header>

        <section class="mt-8">
          <h2 class="text-xl font-semibold mb-3">Portfolios</h2>
          <ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {depts.map((d) => (
              <li>
                <a
                  href={`/gov/departments/${d.slug}`}
                  class="block p-3 rounded-lg border border-base-300 bg-base-100 hover:border-primary hover:shadow-sm transition"
                >
                  <div class="font-medium">{d.name}</div>
                  {d.summary && (
                    <div class="text-xs text-base-content/60 mt-0.5 line-clamp-2">
                      {d.summary}
                    </div>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section class="mt-10">
          <h2 class="text-xl font-semibold mb-4">
            KPIs under this minister's portfolios
          </h2>
          {kpis.length === 0
            ? (
              <p class="text-base-content/60 text-sm">
                No headline KPIs are currently mapped to these portfolios.
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

        {(minister.source || minister.sourceUrl) && (
          <p class="mt-10 text-xs text-base-content/60">
            Source: {minister.sourceUrl
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
