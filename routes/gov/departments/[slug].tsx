import { HttpError, page } from "fresh";
import type { ComponentChildren } from "preact";
import { define } from "../../../utils.ts";
import {
  getDepartmentBySlug,
  getMinister,
  listKpisByDept,
} from "../../../data/db.ts";
import { Header } from "../../../components/Header.tsx";
import { Footer } from "../../../components/Footer.tsx";
import { KpiCard } from "../../../components/KpiCard.tsx";
import type { Department, Kpi, Minister } from "../../../data/types.ts";

interface Data {
  dept: Department;
  minister: Minister | null;
  kpis: Kpi[];
}

export const handler = define.handlers<Data>({
  async GET(ctx) {
    const dept = await getDepartmentBySlug(ctx.params.slug);
    if (!dept) throw new HttpError(404, "Department not found");
    const [minister, kpis] = await Promise.all([
      dept.ministerId ? getMinister(dept.ministerId) : Promise.resolve(null),
      listKpisByDept(dept.id),
    ]);
    return page({ dept, minister, kpis });
  },
});

export default define.page<typeof handler>(function DeptPage(
  { data, state },
) {
  const lang = state.lang;
  const { dept, minister, kpis } = data;

  return (
    <>
      <Header lang={lang} />
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <p class="text-xs">
          <a href="/gov" class="link link-hover text-base-content/60">
            ← Government
          </a>
        </p>
        <h1
          class={`text-3xl md:text-4xl font-bold mt-2 ${
            lang === "ml" ? "ml" : ""
          }`}
        >
          {lang === "ml" ? dept.nameMl ?? dept.name : dept.name}
        </h1>
        {dept.summary && (
          <p class="text-base-content/70 mt-2 max-w-2xl">{dept.summary}</p>
        )}

        <section class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard label="Minister">
            {minister
              ? (
                <a
                  href={`/gov/ministers/${minister.slug}`}
                  class="link link-hover font-medium"
                >
                  {lang === "ml" && minister.nameMl
                    ? minister.nameMl
                    : minister.name}
                </a>
              )
              : <span class="italic text-base-content/60">Pending</span>}
            {minister && lang === "ml" && minister.nameMl && (
              <div class="text-xs text-base-content/50">{minister.name}</div>
            )}
            {minister?.constituency && (
              <div class="text-xs text-base-content/60 mt-0.5">
                {minister.constituency}
              </div>
            )}
          </InfoCard>
          <InfoCard label="Senior bureaucrat">
            <span class="italic text-base-content/60">Pending</span>
          </InfoCard>
          <InfoCard label="Website">
            {dept.websiteUrl
              ? (
                <a
                  href={dept.websiteUrl}
                  class="link link-hover font-medium break-all"
                >
                  {dept.websiteUrl.replace(/^https?:\/\//, "")}
                </a>
              )
              : <span class="italic text-base-content/60">—</span>}
          </InfoCard>
        </section>

        <section class="mt-10">
          <h2 class="text-xl font-semibold mb-4">
            KPIs this department is accountable for
          </h2>
          {kpis.length === 0
            ? (
              <p class="text-base-content/60 text-sm">
                No headline KPIs are currently mapped to this department.
              </p>
            )
            : (
              <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {kpis.map((kpi) => (
                  <KpiCard
                    key={kpi.id}
                    kpi={kpi}
                    lang={lang}
                    dept={dept}
                  />
                ))}
              </div>
            )}
        </section>
      </main>
      <Footer lang={lang} />
    </>
  );
});

function InfoCard(
  { label, children }: { label: string; children: ComponentChildren },
) {
  return (
    <div class="rounded-lg border border-base-300 bg-base-100 p-4">
      <p class="text-[11px] uppercase tracking-wider text-base-content/60 font-medium">
        {label}
      </p>
      <div class="mt-1 text-sm">{children}</div>
    </div>
  );
}
