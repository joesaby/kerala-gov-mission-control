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
import {
  getDeptHeadlineHolders,
  getDeptOfficeSuccession,
} from "../../../lib/graph.ts";
import { Header } from "../../../components/Header.tsx";
import { Footer } from "../../../components/Footer.tsx";
import { KpiCard } from "../../../components/KpiCard.tsx";
import { AutoLinkDisclaimer } from "../../../components/AutoLinkDisclaimer.tsx";
import {
  type SuccessionBlock,
  SuccessionTimeline,
} from "../../../components/SuccessionTimeline.tsx";
import OrdersBrowser from "../../../islands/OrdersBrowser.tsx";
import type {
  Department,
  GovernmentOrder,
  Kpi,
  Minister,
} from "../../../data/types.ts";
import type {
  DeptHolderRow,
  DeptOfficeSuccession,
} from "../../../lib/graph.ts";

interface Data {
  dept: Department;
  minister: Minister | null;
  bureaucrats: DeptHolderRow[];
  succession: DeptOfficeSuccession[];
  kpis: Kpi[];
  orders: GovernmentOrder[];
  allDepts: Department[];
}

export const handler = define.handlers<Data>({
  async GET(ctx) {
    const dept = await getDepartmentBySlug(ctx.params.slug);
    if (!dept) throw new HttpError(404, "Department not found");
    const [minister, bureaucrats, succession, kpis, orders, allDepts] =
      await Promise.all([
        dept.ministerId ? getMinister(dept.ministerId) : Promise.resolve(null),
        getDeptHeadlineHolders(dept.id),
        getDeptOfficeSuccession(dept.id),
        listKpisByDept(dept.id),
        listGovernmentOrdersByDept(dept.id),
        listDepartments(),
      ]);
    return page({
      dept,
      minister,
      bureaucrats,
      succession,
      kpis,
      orders,
      allDepts,
    });
  },
});

export default define.page<typeof handler>(function DeptPage(
  { data, state },
) {
  const lang = state.lang;
  const { dept, minister, bureaucrats, succession, kpis, orders, allDepts } =
    data;

  // Office succession — only surface offices with history (a past + a present
  // holder); a lone current holder already shows under "Who runs this".
  const successionOffices = succession
    .map((o) => ({
      id: o.officeId,
      office: lang === "ml" && o.officeTitleMl
        ? o.officeTitleMl
        : o.officeTitle,
      holders: o.holders.map((h) => ({
        id: h.personId + h.termStart,
        label: lang === "ml" && h.personNameMl ? h.personNameMl : h.personName,
        href: h.personSlug
          ? `/gov/people/${h.personSlug}`
          : o.officeSlug
          ? `/gov/offices/${o.officeSlug}`
          : "#",
        termStart: h.termStart,
        current: h.current,
      })),
    }))
    .filter((o) => o.holders.length >= 2);
  const successionBlocks: SuccessionBlock[] = successionOffices.length > 0
    ? [{
      id: dept.id,
      deptLabel: lang === "ml" && dept.nameMl ? dept.nameMl : dept.name,
      offices: successionOffices,
    }]
    : [];

  function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  }

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

        <section class="mt-6">
          <h2 class="font-display text-xl font-semibold mb-3">
            {t(lang, "Who runs this", "ആരാണ് നയിക്കുന്നത്")}
          </h2>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoCard label={t(lang, "Accountable minister", "ഉത്തരവാദി മന്ത്രി")}>
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
            </InfoCard>
            {bureaucrats.length === 0
              ? (
                <InfoCard
                  label={t(lang, "Senior bureaucrat", "മുതിർന്ന ഉദ്യോഗസ്ഥൻ")}
                >
                  <span class="italic text-base-content/60 text-sm">
                    {t(
                      lang,
                      "No headline post matched from ingested orders yet.",
                      "ഉറവിട ഉത്തരവുകളിൽ നിന്ന് പ്രധാന പദവി ഇതുവരെ ബന്ധിപ്പിച്ചിട്ടില്ല.",
                    )}
                  </span>
                </InfoCard>
              )
              : bureaucrats.map((b) => (
                <InfoCard
                  key={b.personId + (b.officeSlug ?? "")}
                  label={b.officeTitle ?? t(lang, "Posting", "പദവി")}
                >
                  {b.personSlug
                    ? (
                      <a
                        href={`/gov/people/${b.personSlug}`}
                        class="link link-hover font-medium"
                      >
                        {lang === "ml" && b.personNameMl
                          ? b.personNameMl
                          : b.personName}
                      </a>
                    )
                    : <span class="font-medium">{b.personName}</span>}
                  {b.termStart && (
                    <div class="text-xs text-base-content/50 tabular-nums mt-0.5">
                      {t(lang, "since", "മുതൽ")} {fmtDate(b.termStart)}
                    </div>
                  )}
                  {b.officeSlug && (
                    <a
                      href={`/gov/offices/${b.officeSlug}`}
                      class="text-xs link link-hover text-primary mt-1 inline-block"
                    >
                      {t(lang, "Office →", "പദവി →")}
                    </a>
                  )}
                </InfoCard>
              ))}
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
          </div>
        </section>

        {successionBlocks.length > 0 && (
          <section class="mt-10">
            <h2 class="font-display text-xl font-semibold mb-1">
              {t(lang, "Office succession", "പദവികളുടെ പിന്തുടർച്ച")}
            </h2>
            <p class="text-sm text-base-content/60 mb-4">
              {t(
                lang,
                "Who has held this department's headline posts over time, oldest first.",
                "ഈ വകുപ്പിന്റെ പ്രധാന പദവികൾ വഹിച്ചവർ — പഴയത് ആദ്യം.",
              )}
            </p>
            <SuccessionTimeline blocks={successionBlocks} lang={lang} />
            <div class="mt-4">
              <AutoLinkDisclaimer lang={lang} />
            </div>
          </section>
        )}

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
            <OrdersBrowser
              orders={orders}
              depts={allDepts}
              lang={lang}
              hideDeptFilter
              hideDeptColumn
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
