import { page } from "fresh";
import { define } from "../../utils.ts";
import {
  listAppointments,
  listDepartments,
  listGovernmentOrders,
  listManifestoGoals,
} from "../../data/db.ts";
import { Header } from "../../components/Header.tsx";
import { Footer } from "../../components/Footer.tsx";
import type {
  Department,
  GovernmentOrder,
  ManifestoGoal,
} from "../../data/types.ts";
import {
  computeDeptGoVelocity,
  computeManifestoCoverage,
  computeOfficeChurn,
  type DeptVelocitySummary,
  type ManifestoCoverageResult,
  type OfficeChurnResult,
} from "../../lib/insights.ts";

interface Data {
  coverage:
    & Omit<ManifestoCoverageResult, "gosByGoalId" | "offManifestoOrders">
    & {
      gosByGoalId: [string, string[]][];
      offManifestoSample: GovernmentOrder[];
    };
  velocity: {
    flagged: DeptVelocitySummary[];
    topByVolume: DeptVelocitySummary[];
  };
  churn: OfficeChurnResult;
  goals: ManifestoGoal[];
  depts: Department[];
}

export const handler = define.handlers<Data>({
  async GET() {
    const [orders, goals, depts, appointments] = await Promise.all([
      listGovernmentOrders(),
      listManifestoGoals(),
      listDepartments(),
      listAppointments(),
    ]);

    const coverageFull = computeManifestoCoverage(goals, orders);
    const coverage = {
      zeroCoverageGoals: coverageFull.zeroCoverageGoals,
      offManifestoCount: coverageFull.offManifestoCount,
      totalOrders: coverageFull.totalOrders,
      totalGoals: coverageFull.totalGoals,
      gosByGoalId: [...coverageFull.gosByGoalId.entries()],
      offManifestoSample: coverageFull.offManifestoOrders.slice(0, 10),
    };

    const velocityFull = computeDeptGoVelocity(orders, depts);
    const velocity = {
      flagged: velocityFull.flagged.slice(0, 10),
      topByVolume: velocityFull.summaries
        .slice()
        .sort((a, b) => b.mostRecentCount - a.mostRecentCount)
        .slice(0, 10),
    };

    const churn = computeOfficeChurn(appointments, 180);

    return page({ coverage, velocity, churn, goals, depts });
  },
});

function fmtMonth(ym: string, lang: "en" | "ml"): string {
  const [year, month] = ym.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
    month: "short",
    year: "numeric",
  });
}

export default define.page<typeof handler>(function InsightsPage(
  { data, state },
) {
  const lang = state.lang;
  const { coverage, velocity, churn, goals, depts } = data;

  const goalById = new Map(goals.map((g) => [g.id, g]));
  const deptById = new Map(depts.map((d) => [d.id, d]));
  const gosByGoalId = new Map(coverage.gosByGoalId);

  return (
    <>
      <Header lang={lang} path={state.path} />
      <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* ── Page header ── */}
        <section class="mb-8">
          <p class="text-xs uppercase tracking-wider text-base-content/60 font-medium">
            <a href="/gov" class="hover:text-primary transition">
              {lang === "ml" ? "സർക്കാർ" : "Government"}
            </a>
            {" · "}
            {lang === "ml" ? "പ്രവർത്തന സൂചകങ്ങൾ" : "Activity signals"}
          </p>
          <h1 class="text-3xl md:text-4xl font-bold mt-1">
            {lang === "ml" ? "സ്വയംപഠന നിരീക്ഷണങ്ങൾ" : "Automated learnings"}
          </h1>
          <p class="text-base-content/70 mt-2 max-w-2xl">
            {lang === "ml"
              ? "ഗവൺമെന്റ് ഉത്തരവുകൾ, വാഗ്ദാനങ്ങൾ, നിയമനങ്ങൾ എന്നിവയിൽ നിന്ന് കണക്കാക്കിയ യഥാർത്ഥ കണക്കുകൾ. ഇവ കാര്യകാരണ ബന്ധം ഉറപ്പിക്കുന്നില്ല."
              : "Factual counts derived from government orders, manifesto goals, and appointments. These signal activity, not causation."}
          </p>
        </section>

        {/* ── 1. Manifesto coverage gaps ── */}
        <section class="mb-10">
          <h2 class="text-xl font-semibold mb-1">
            {lang === "ml" ? "വാഗ്ദാന കവറേജ് വിടവുകൾ" : "Manifesto coverage gaps"}
          </h2>
          <p class="text-sm text-base-content/60 mb-4">
            {lang === "ml"
              ? `${coverage.totalGoals} വാഗ്ദാനങ്ങളും ${coverage.totalOrders} ഉത്തരവുകളും താരതമ്യം ചെയ്തു.`
              : `Compared ${coverage.totalGoals} manifesto goals against ${coverage.totalOrders} government orders.`}
          </p>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <StatCard
              label={lang === "ml"
                ? "ഉത്തരവ് ഇല്ലാത്ത വാഗ്ദാനങ്ങൾ"
                : "Goals with no backing GO"}
              value={coverage.zeroCoverageGoals.length}
              accent={coverage.zeroCoverageGoals.length > 0
                ? "text-warning"
                : "text-success"}
            />
            <StatCard
              label={lang === "ml" ? "വാഗ്ദാനേതര ഉത്തരവുകൾ" : "Off-manifesto GOs"}
              value={coverage.offManifestoCount}
            />
            <StatCard
              label={lang === "ml" ? "ആകെ വാഗ്ദാനങ്ങൾ" : "Total goals"}
              value={coverage.totalGoals}
            />
          </div>

          {coverage.zeroCoverageGoals.length > 0 && (
            <div class="mb-6">
              <h3 class="text-sm font-semibold text-base-content/80 mb-2">
                {lang === "ml"
                  ? "ഇതുവരെ ഉത്തരവ് ഇല്ലാത്ത വാഗ്ദാനങ്ങൾ"
                  : "Promised — no administrative action recorded yet"}
              </h3>
              <ul class="flex flex-col divide-y divide-base-200 border border-base-200 rounded-lg">
                {coverage.zeroCoverageGoals.map((g) => (
                  <li
                    key={g.id}
                    class="flex items-start justify-between gap-3 p-3 text-sm"
                  >
                    <div class="flex-1 min-w-0">
                      <span class="badge badge-xs badge-ghost mr-2">
                        {g.category}
                      </span>
                      <span class="text-base-content/80">
                        {lang === "ml" && g.titleMl ? g.titleMl : g.title}
                      </span>
                    </div>
                    <span
                      class={`badge badge-xs shrink-0 ${
                        g.status === "fulfilled"
                          ? "badge-success"
                          : g.status === "in-progress"
                          ? "badge-warning"
                          : "badge-ghost"
                      }`}
                    >
                      {g.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Goals with backing GOs — show top covered goals */}
          {gosByGoalId.size > 0 && (
            <details class="mb-4">
              <summary class="text-sm font-medium cursor-pointer text-base-content/70">
                {lang === "ml"
                  ? "ഏറ്റവും കൂടുതൽ ഉത്തരവുകൾ ഉള്ള വാഗ്ദാനങ്ങൾ"
                  : "Goals with the most backing GOs"}
              </summary>
              <ul class="mt-2 flex flex-col divide-y divide-base-200 border border-base-200 rounded-lg">
                {[...gosByGoalId.entries()]
                  .filter(([, ids]) => ids.length > 0)
                  .sort(([, a], [, b]) => b.length - a.length)
                  .slice(0, 8)
                  .map(([goalId, goIds]) => {
                    const g = goalById.get(goalId);
                    return (
                      <li
                        key={goalId}
                        class="flex items-center justify-between gap-3 p-3 text-sm"
                      >
                        <span class="text-base-content/80 truncate">
                          {g
                            ? (lang === "ml" && g.titleMl ? g.titleMl : g.title)
                            : goalId}
                        </span>
                        <span class="tabular-nums text-base-content/50 shrink-0">
                          {goIds.length} {lang === "ml" ? "ഉത്തരവ്" : "orders"}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </details>
          )}

          {coverage.offManifestoSample.length > 0 && (
            <details>
              <summary class="text-sm font-medium cursor-pointer text-base-content/70">
                {lang === "ml"
                  ? "വാഗ്ദാനവുമായി ബന്ധമില്ലാത്ത ഉത്തരവുകൾ (സാമ്പിൾ)"
                  : `Off-manifesto orders — sample of ${coverage.offManifestoSample.length}`}
              </summary>
              <ul class="mt-2 flex flex-col divide-y divide-base-200 border border-base-200 rounded-lg">
                {coverage.offManifestoSample.map((o) => (
                  <li
                    key={o.id}
                    class="flex items-start justify-between gap-3 p-3 text-sm"
                  >
                    <div class="flex-1 min-w-0">
                      <span class="badge badge-xs badge-ghost font-mono mr-2">
                        {o.type}
                      </span>
                      <span class="text-base-content/70 text-xs mr-2">
                        {o.date}
                      </span>
                      <span class="text-base-content/80 line-clamp-1">
                        {lang === "ml" && o.subjectMl ? o.subjectMl : o.subject}
                      </span>
                    </div>
                    <a
                      href={o.meta.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="btn btn-xs btn-ghost shrink-0"
                    >
                      PDF ↗
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        {/* ── 2. Department GO velocity ── */}
        <section class="mb-10">
          <h2 class="text-xl font-semibold mb-1">
            {lang === "ml" ? "വകുപ്പ് GO വേഗത" : "Department GO velocity"}
          </h2>
          <p class="text-sm text-base-content/60 mb-4">
            {lang === "ml"
              ? "ഓരോ മാസവും ഓരോ വകുപ്പിൽ നിന്നുള്ള ഉത്തരവുകളുടെ എണ്ണം. >2σ ആയ മാസങ്ങൾ ഫ്ലാഗ് ചെയ്തിരിക്കുന്നു."
              : "Count of orders per department per month. Months >2σ above trailing mean are flagged."}
          </p>

          {velocity.flagged.length > 0 && (
            <div class="mb-6">
              <h3 class="text-sm font-semibold text-base-content/80 mb-2 flex items-center gap-2">
                <span class="inline-block w-2 h-2 rounded-full bg-warning" />
                {lang === "ml"
                  ? "ഈ മാസം അതിസജീവ വകുപ്പുകൾ (>2σ)"
                  : "Anomalously active this period (>2σ above baseline)"}
              </h3>
              <ul class="flex flex-col divide-y divide-base-200 border border-base-200 rounded-lg">
                {velocity.flagged.map((s) => {
                  const deptName = lang === "ml" && s.dept.nameMl
                    ? s.dept.nameMl
                    : s.dept.name;
                  const recentMonth =
                    s.monthlyBuckets[s.monthlyBuckets.length - 1];
                  return (
                    <li
                      key={s.dept.id}
                      class="p-3 text-sm"
                    >
                      <div class="flex items-center justify-between gap-3 mb-1">
                        <a
                          href={`/gov/departments/${s.dept.slug}`}
                          class="font-medium hover:text-primary transition truncate"
                        >
                          {deptName}
                        </a>
                        <span class="badge badge-warning badge-sm shrink-0 tabular-nums">
                          {s.mostRecentCount}{" "}
                          {lang === "ml" ? "ഉത്തരവ്" : "orders"}
                        </span>
                      </div>
                      <div class="text-xs text-base-content/50">
                        {lang === "ml"
                          ? `ആദ്ഗ്ഗത്തിൽ ശരാശരി ${s.trailingMean.toFixed(1)}/മാസം`
                          : `Trailing mean ${s.trailingMean.toFixed(1)}/month`}
                        {recentMonth && (
                          <span class="ml-2">
                            · {fmtMonth(recentMonth.month, lang)}
                          </span>
                        )}
                      </div>
                      {/* Provenance: recent GO links */}
                      {s.mostRecentOrders.length > 0 && (
                        <ul class="mt-1 flex flex-wrap gap-1">
                          {s.mostRecentOrders.slice(0, 5).map((o) => (
                            <li key={o.id}>
                              <a
                                href={o.meta.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-[11px] text-primary/70 hover:text-primary underline underline-offset-2"
                                title={o.subject}
                              >
                                {o.goNumber}
                              </a>
                            </li>
                          ))}
                          {s.mostRecentOrders.length > 5 && (
                            <li class="text-[11px] text-base-content/40">
                              +{s.mostRecentOrders.length - 5}{" "}
                              {lang === "ml" ? "കൂടുതൽ" : "more"}
                            </li>
                          )}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {velocity.flagged.length === 0 && (
            <p class="text-sm text-base-content/40 italic mb-4">
              {lang === "ml"
                ? "ഈ കാലയളവിൽ അതിസജീവ വകുപ്പുകൾ ഒന്നുമില്ല."
                : "No anomalously active departments this period."}
            </p>
          )}

          {/* Top departments by recent volume */}
          {velocity.topByVolume.length > 0 && (
            <details>
              <summary class="text-sm font-medium cursor-pointer text-base-content/70">
                {lang === "ml"
                  ? "ഏറ്റവും കൂടുതൽ ഉത്തരവുകൾ ഈ മാസം"
                  : "Most active departments this month"}
              </summary>
              <ul class="mt-2 flex flex-col divide-y divide-base-200 border border-base-200 rounded-lg">
                {velocity.topByVolume.map((s) => {
                  const deptName = lang === "ml" && s.dept.nameMl
                    ? s.dept.nameMl
                    : s.dept.name;
                  const recentMonth =
                    s.monthlyBuckets[s.monthlyBuckets.length - 1];
                  return (
                    <li
                      key={s.dept.id}
                      class="flex items-center justify-between gap-3 p-3 text-sm"
                    >
                      <div class="flex-1 min-w-0">
                        <a
                          href={`/gov/departments/${s.dept.slug}`}
                          class="font-medium hover:text-primary transition truncate block"
                        >
                          {deptName}
                        </a>
                        {recentMonth && (
                          <span class="text-xs text-base-content/40">
                            {fmtMonth(recentMonth.month, lang)}
                          </span>
                        )}
                      </div>
                      <span class="tabular-nums text-base-content/70 shrink-0">
                        {s.mostRecentCount}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </section>

        {/* ── 3. Office churn ── */}
        <section class="mb-10">
          <h2 class="text-xl font-semibold mb-1">
            {lang === "ml" ? "ഓഫീസ് ചുഴലി" : "Office churn"}
          </h2>
          <p class="text-sm text-base-content/60 mb-2">
            {lang === "ml"
              ? `കഴിഞ്ഞ ${churn.windowDays} ദിവസത്തിനുള്ളിൽ അടഞ്ഞ കാലാവധി ഉള്ള നിയമനങ്ങൾ.`
              : `Appointments with a closed tenure in the last ${churn.windowDays} days.`}
          </p>
          <p class="text-xs text-base-content/40 italic mb-4">
            {lang === "ml"
              ? "കുറിപ്പ്: ഒരു Person-നോട് ബന്ധിപ്പിക്കപ്പെടാത്ത നിയമനങ്ങൾ ഇതിൽ ഉൾപ്പെടുന്നില്ല."
              : "Note: coverage is limited where appointees are not matched to a known Person record."}
          </p>

          {churn.noData
            ? (
              <p class="text-sm text-base-content/40 italic">
                {lang === "ml"
                  ? "ഇതുവരെ നിയമന ഡേറ്റ ഒന്നും ലഭ്യമല്ല."
                  : "No appointment data available yet."}
              </p>
            )
            : churn.totalClosed === 0
            ? (
              <p class="text-sm text-base-content/40 italic">
                {lang === "ml"
                  ? "ഈ കാലയളവിൽ അടഞ്ഞ കാലാവധി ഒന്നുമില്ല."
                  : `No closed tenures recorded in the last ${churn.windowDays} days.`}
              </p>
            )
            : (
              <>
                <div class="grid grid-cols-2 gap-3 mb-4">
                  <StatCard
                    label={lang === "ml" ? "അടഞ്ഞ കാലാവധികൾ" : "Closed tenures"}
                    value={churn.totalClosed}
                  />
                  <StatCard
                    label={lang === "ml" ? "അദ്വിതീയ ഓഫീസുകൾ" : "Unique offices"}
                    value={churn.entries.length}
                  />
                </div>

                <ul class="flex flex-col divide-y divide-base-200 border border-base-200 rounded-lg">
                  {churn.entries.slice(0, 20).map((e) => {
                    const dept = e.deptId ? deptById.get(e.deptId) : null;
                    const deptName = dept
                      ? (lang === "ml" && dept.nameMl ? dept.nameMl : dept.name)
                      : null;
                    return (
                      <li key={e.office} class="p-3 text-sm">
                        <div class="flex items-start justify-between gap-3">
                          <div class="flex-1 min-w-0">
                            <span class="font-medium text-base-content/80">
                              {lang === "ml" && e.officeMl
                                ? e.officeMl
                                : e.office}
                            </span>
                            <div class="flex flex-wrap gap-1 mt-1">
                              <span class="badge badge-xs badge-ghost">
                                {e.branch}
                              </span>
                              {deptName && (
                                <span class="text-xs text-base-content/50">
                                  {deptName}
                                </span>
                              )}
                              {e.recentActions.map((a) => (
                                <span
                                  key={a}
                                  class="badge badge-xs badge-outline"
                                >
                                  {a}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span class="tabular-nums font-bold text-base-content/60 shrink-0">
                            {e.closedCount}×
                          </span>
                        </div>
                        {/* Provenance links */}
                        {e.sourceUrls.length > 0 && (
                          <ul class="mt-1 flex flex-wrap gap-1">
                            {e.sourceUrls.slice(0, 3).map((url, i) => (
                              <li key={url}>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  class="text-[11px] text-primary/70 hover:text-primary underline underline-offset-2"
                                >
                                  {lang === "ml" ? "ഉത്തരവ്" : "GO"} {i + 1} ↗
                                </a>
                              </li>
                            ))}
                            {e.sourceUrls.length > 3 && (
                              <li class="text-[11px] text-base-content/40">
                                +{e.sourceUrls.length - 3}{" "}
                                {lang === "ml" ? "കൂടുതൽ" : "more"}
                              </li>
                            )}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
        </section>
      </main>
      <Footer lang={lang} />
    </>
  );
});

function StatCard(
  { label, value, accent }: {
    label: string;
    value: number;
    accent?: string;
  },
) {
  return (
    <div class="rounded-lg border border-base-200 bg-base-100 p-4">
      <dt class="text-xs text-base-content/60 mb-1">{label}</dt>
      <dd class={`text-2xl font-bold tabular-nums ${accent ?? ""}`}>{value}</dd>
    </div>
  );
}
