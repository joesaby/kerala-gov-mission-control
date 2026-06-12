import { HttpError, page } from "fresh";
import type { ComponentChildren } from "preact";
import { define } from "../../../utils.ts";
import { t } from "../../../data/lang.ts";
import {
  getDepartmentBySlug,
  getMinister,
  listDepartments,
  listGovernmentOrdersByDept,
  listKpisByDept,
} from "../../../data/db.ts";
import { Header } from "../../../components/Header.tsx";
import { Footer } from "../../../components/Footer.tsx";
import { KpiCard } from "../../../components/KpiCard.tsx";
import { GovernmentOrderList } from "../../../components/GovernmentOrderList.tsx";
import type {
  Department,
  GovernmentOrder,
  Kpi,
  Minister,
} from "../../../data/types.ts";

interface Data {
  dept: Department;
  minister: Minister | null;
  kpis: Kpi[];
  orders: GovernmentOrder[];
  allDepts: Department[];
}

export const handler = define.handlers<Data>({
  async GET(ctx) {
    const dept = await getDepartmentBySlug(ctx.params.slug);
    if (!dept) throw new HttpError(404, "Department not found");
    const [minister, kpis, orders, allDepts] = await Promise.all([
      dept.ministerId ? getMinister(dept.ministerId) : Promise.resolve(null),
      listKpisByDept(dept.id),
      listGovernmentOrdersByDept(dept.id),
      listDepartments(),
    ]);
    return page({ dept, minister, kpis, orders, allDepts });
  },
});

export default define.page<typeof handler>(function DeptPage(
  { data, state },
) {
  const lang = state.lang;
  const { dept, minister, kpis, orders, allDepts } = data;

  return (
    <>
      <Header lang={lang} path={state.path} />
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <p class="text-xs">
          <a href="/gov" class="link link-hover text-base-content/60">
            ← {t(lang, "Government", "സർക്കാർ")}
          </a>
        </p>
        <h1
          class={`font-display text-3xl md:text-4xl font-bold mt-2 ${
            lang === "ml" ? "ml" : ""
          }`}
        >
          {lang === "ml" ? dept.nameMl ?? dept.name : dept.name}
        </h1>
        {(lang === "ml" && dept.summaryMl ? dept.summaryMl : dept.summary) && (
          <p class="text-base-content/70 mt-2 max-w-2xl">
            {lang === "ml" && dept.summaryMl ? dept.summaryMl : dept.summary}
          </p>
        )}

        <section class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard label={t(lang, "Minister", "മന്ത്രി")}>
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
              : (
                <span class="italic text-base-content/60">
                  {t(lang, "Pending", "നിശ്ചയിച്ചിട്ടില്ല")}
                </span>
              )}
            {minister && lang === "ml" && minister.nameMl && (
              <div class="text-xs text-base-content/50">{minister.name}</div>
            )}
            {minister?.constituency && (
              <div class="text-xs text-base-content/60 mt-0.5">
                {minister.constituency}
              </div>
            )}
          </InfoCard>
          <InfoCard label={t(lang, "Senior bureaucrat", "മുതിർന്ന ഉദ്യോഗസ്ഥൻ")}>
            <span class="italic text-base-content/60">
              {t(lang, "Pending", "നിശ്ചയിച്ചിട്ടില്ല")}
            </span>
          </InfoCard>
          <InfoCard label={t(lang, "Website", "വെബ്സൈറ്റ്")}>
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
          <h2 class="font-display text-xl font-semibold mb-4">
            {t(
              lang,
              "KPIs this department is accountable for",
              "ഈ വകുപ്പിന്റെ ഉത്തരവാദിത്തത്തിലുള്ള സൂചകങ്ങൾ",
            )}
          </h2>
          {kpis.length === 0
            ? (
              <p class="text-base-content/60 text-sm">
                {t(
                  lang,
                  "No headline KPIs are currently mapped to this department.",
                  "ഈ വകുപ്പിലേക്ക് ഇപ്പോൾ പ്രധാന സൂചകങ്ങളൊന്നും ചേർത്തിട്ടില്ല.",
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
                    dept={dept}
                  />
                ))}
              </div>
            )}
        </section>

        <section class="mt-12">
          <h2 class="font-display text-xl font-semibold mb-4">
            {lang === "ml"
              ? "സമീപകാല വകുപ്പ് ഉത്തരവുകളും തീരുമാനങ്ങളും"
              : "Recent Government Orders & Bills"}
          </h2>
          <div class="max-w-4xl">
            <GovernmentOrderList
              orders={orders}
              depts={allDepts}
              lang={lang}
              hideDepartment
            />
          </div>
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
