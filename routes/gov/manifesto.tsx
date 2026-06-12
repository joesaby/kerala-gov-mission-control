import { page } from "fresh";
import { define } from "../../utils.ts";
import { t } from "../../data/lang.ts";
import {
  getCurrentGovernment,
  listGovernmentOrders,
  listManifestoGoals,
} from "../../data/db.ts";
import { Header } from "../../components/Header.tsx";
import { Footer } from "../../components/Footer.tsx";
import type {
  Government,
  GovernmentOrder,
  ManifestoGoal,
  ManifestoGoalStatus,
} from "../../data/types.ts";

interface Data {
  govt: Government | null;
  goals: ManifestoGoal[];
  ordersByGoal: Record<string, GovernmentOrder[]>;
  activeTab: string;
  filterStatus: string;
  activeGoalId: string;
}

export const handler = define.handlers<Data>({
  async GET(ctx) {
    const url = new URL(ctx.req.url);
    const activeTab = url.searchParams.get("tab") || "all";
    const filterStatus = url.searchParams.get("status") || "all";
    const activeGoalId = url.searchParams.get("goal") || "";

    const [govt, allOrders] = await Promise.all([
      getCurrentGovernment(),
      listGovernmentOrders(),
    ]);
    const goals = govt ? await listManifestoGoals(govt.id) : [];

    const termOrders = govt
      ? allOrders.filter(
        (o) =>
          o.date >= govt.termStart &&
          (!govt.termEnd || o.date <= govt.termEnd),
      )
      : [];

    const ordersByGoal: Record<string, GovernmentOrder[]> = {};
    for (const o of termOrders) {
      for (const gid of o.manifestoGoalIds ?? []) {
        (ordersByGoal[gid] ??= []).push(o);
      }
    }

    return page({
      govt,
      goals,
      ordersByGoal,
      activeTab,
      filterStatus,
      activeGoalId,
    });
  },
});

const STATUS_META: Record<
  ManifestoGoalStatus,
  { label: string; labelMl: string; badgeCls: string; dotCls: string }
> = {
  committed: {
    label: "Committed",
    labelMl: "പ്രതിജ്ഞ",
    badgeCls: "badge-neutral/10 text-base-content/80 border-base-300",
    dotCls: "bg-base-content/40",
  },
  "in-progress": {
    label: "In progress",
    labelMl: "നടന്നുവരുന്നു",
    badgeCls: "badge-warning/15 text-warning-content border-warning/25",
    dotCls: "bg-warning animate-pulse",
  },
  fulfilled: {
    label: "Fulfilled",
    labelMl: "നിറവേറ്റി",
    badgeCls: "badge-success/15 text-success-content border-success/25",
    dotCls: "bg-success",
  },
  dropped: {
    label: "Dropped",
    labelMl: "ഉപേക്ഷിച്ചു",
    badgeCls: "badge-error/15 text-error-content border-error/25",
    dotCls: "bg-error",
  },
};

const CONFIDENCE_LABEL: Record<
  string,
  { en: string; ml: string; cls: string }
> = {
  direct: { en: "Direct Action", ml: "നേരിട്ടുള്ള നടപടി", cls: "text-success" },
  supporting: {
    en: "Supporting Action",
    ml: "പിന്തുണയ്ക്കുന്ന നടപടി",
    cls: "text-warning",
  },
  weak: {
    en: "Indirect Link",
    ml: "പരോക്ഷമായ ബന്ധം",
    cls: "text-base-content/40",
  },
};

const ORDER_TYPE_SHORT: Record<string, { en: string; ml: string }> = {
  P: { en: "Policy GO", ml: "നയപരമായ ജി.ഒ" },
  Ms: { en: "Memo GO", ml: "മെമ്മോറാണ്ടം ജി.ഒ" },
  Rt: { en: "Routine GO", ml: "സാധാരണ ജി.ഒ" },
  SRO: { en: "SRO", ml: "എസ്.ആർ.ഒ" },
  Circular: { en: "Circular", ml: "സർക്കുലർ" },
  Bill: { en: "Bill", ml: "ബിൽ" },
};

export default define.page<typeof handler>(function ManifestoPage(
  { data, state },
) {
  const lang = state.lang;
  const { govt, goals, ordersByGoal, activeTab, filterStatus, activeGoalId } =
    data;

  // Categorise goals for stats and rendering
  const indiraGuarantees = goals.filter(
    (g) => g.featuredLabel === "Indira Guarantee",
  );
  const dreamProjects = goals.filter(
    (g) => g.featuredLabel === "Dream Project",
  );
  const governance = goals.filter(
    (g) =>
      !g.featuredLabel &&
      (g.category === "governance" || g.category === "fiscal"),
  );
  const sector = goals.filter(
    (g) =>
      !g.featuredLabel &&
      g.category !== "governance" &&
      g.category !== "fiscal",
  );

  const goalsWithAction = goals.filter(
    (g) => g.status === "in-progress" || g.status === "fulfilled",
  ).length;
  const fulfilledCount = goals.filter((g) => g.status === "fulfilled").length;
  const inProgressCount = goals.filter((g) => g.status === "in-progress")
    .length;
  const pendingCount = goals.length - goalsWithAction;

  const progressPct = goals.length > 0
    ? Math.round((goalsWithAction / goals.length) * 100)
    : 0;

  // Filter list based on selected Tab
  let filteredGoals = goals;
  if (activeTab === "guarantees") {
    filteredGoals = indiraGuarantees;
  } else if (activeTab === "dreams") {
    filteredGoals = dreamProjects;
  } else if (activeTab === "governance") {
    filteredGoals = governance;
  } else if (activeTab === "sector") {
    filteredGoals = sector;
  }

  // Filter list based on selected Status
  if (filterStatus === "fulfilled") {
    filteredGoals = filteredGoals.filter((g) => g.status === "fulfilled");
  } else if (filterStatus === "in-progress") {
    filteredGoals = filteredGoals.filter((g) => g.status === "in-progress");
  } else if (filterStatus === "committed") {
    filteredGoals = filteredGoals.filter((g) => g.status === "committed");
  }

  // Selected goal for the Drawer details
  const selectedGoal = goals.find((g) => g.id === activeGoalId) ?? null;
  const selectedGoalOrders = selectedGoal
    ? (ordersByGoal[selectedGoal.id] ?? [])
    : [];
  const displayDrawerSummary = selectedGoal
    ? (lang === "ml" && selectedGoal.summaryMl
      ? selectedGoal.summaryMl
      : selectedGoal.summary)
    : "";

  const closeUrl = selectedGoal
    ? `?tab=${activeTab}&status=${filterStatus}#${selectedGoal.id}`
    : `?tab=${activeTab}&status=${filterStatus}`;

  const renderSection = (
    title: string,
    titleMl: string,
    description: string,
    descriptionMl: string,
    groupGoals: ManifestoGoal[],
    accentColorClass: string,
  ) => {
    // Intersect groupGoals with filteredGoals to see what to render
    const matching = groupGoals.filter((g) => filteredGoals.includes(g));
    if (matching.length === 0) return null;

    return (
      <section class="mb-12">
        <div class="flex items-center gap-2.5 mb-2">
          <h2 class="font-display text-xl font-bold text-base-content">
            {lang === "ml" ? titleMl : title}
          </h2>
          <span class="badge badge-sm badge-neutral font-mono font-bold">
            {matching.length}
          </span>
        </div>
        <p class="text-xs md:text-sm text-base-content/60 mb-6">
          {lang === "ml" ? descriptionMl : description}
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matching.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              orders={ordersByGoal[g.id] ?? []}
              lang={lang}
              accentColorClass={accentColorClass}
              activeTab={activeTab}
              filterStatus={filterStatus}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div class="drawer drawer-end">
      <input
        id="manifesto-drawer"
        type="checkbox"
        class="drawer-toggle"
        checked={!!selectedGoal}
        readOnly
      />
      <div class="drawer-content flex flex-col min-h-screen">
        <Header lang={lang} path={state.path} />
        <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 flex-1 w-full">
          {/* ── Page Header ── */}
          <section class="mb-8">
            <p class="eyebrow">
              <a href="/gov" class="hover:text-primary transition">
                {lang === "ml"
                  ? govt?.nameMl ?? govt?.name ?? "സർക്കാർ"
                  : govt?.name ?? "Government"}
              </a>
              {" · "}
              {lang === "ml" ? "മ്യാനിഫെസ്റ്റോ" : "Manifesto"}
            </p>
            <h1 class="font-display text-3xl md:text-4xl font-bold mt-1">
              {lang === "ml" ? "വാഗ്ദാന ട്രാക്കർ" : "Promise Tracker"}
            </h1>
            <p class="text-sm md:text-base text-base-content/70 mt-2 max-w-2xl leading-relaxed">
              {lang === "ml"
                ? "UDF 2026 തിരഞ്ഞെടുപ്പ് പ്രകടനപത്രികയിലെ ഓരോ വാഗ്ദാനങ്ങളും അവയുടെ പുരോഗതിയും ഇവിടെ പരിശോധിക്കാം."
                : "Track the implementation of UDF 2026 election commitments against official, public-facing Government Orders."}
            </p>
          </section>

          {/* ── Overall progress Stats (daisyUI) ── */}
          {goals.length > 0 && (
            <div class="stats stats-vertical lg:stats-horizontal shadow bg-base-100 border border-base-200 w-full mb-8">
              <div class="stat flex items-center lg:items-start justify-between lg:block">
                <div>
                  <div class="stat-title text-xs uppercase tracking-wider font-semibold text-base-content/55">
                    {t(lang, "Overall Progress", "മൊത്തം പുരോഗതി")}
                  </div>
                  <div class="stat-value text-primary font-display tabular-nums mt-1 text-2xl lg:text-3xl">
                    {progressPct}%
                  </div>
                </div>
                <div class="stat-desc mt-1.5 self-center lg:self-auto">
                  <progress
                    class="progress progress-primary w-24 h-2 rounded-full"
                    value={progressPct}
                    max="100"
                    aria-label={t(lang, "Progress percent", "പുരോഗതി ശതമാനം")}
                  />
                </div>
              </div>

              <div class="stat flex items-center lg:items-start justify-between lg:block">
                <div>
                  <div class="stat-title text-xs uppercase tracking-wider font-semibold text-base-content/55">
                    {t(lang, "Fulfilled", "നിറവേറ്റിയവ")}
                  </div>
                  <div class="stat-value text-success font-display tabular-nums mt-1 text-2xl lg:text-3xl">
                    {fulfilledCount}
                  </div>
                </div>
                <div class="stat-desc mt-1.5 self-center lg:self-auto">
                  <span class="badge badge-success/15 border-success/20 badge-sm gap-1 text-success font-semibold px-2 py-2">
                    <svg
                      class="w-3 h-3 fill-current shrink-0"
                      viewBox="0 0 20 20"
                    >
                      <path d="M7.629 14.571L3.285 10.228 4.7 8.814l2.929 2.93 7.629-7.63 1.414 1.415-9.043 9.042z" />
                    </svg>
                    {t(lang, "Delivered", "പൂർത്തിയായി")}
                  </span>
                </div>
              </div>

              <div class="stat flex items-center lg:items-start justify-between lg:block">
                <div>
                  <div class="stat-title text-xs uppercase tracking-wider font-semibold text-base-content/55">
                    {t(lang, "Underway", "നടന്നുവരുന്നത്")}
                  </div>
                  <div class="stat-value text-warning font-display tabular-nums mt-1 text-2xl lg:text-3xl">
                    {inProgressCount}
                  </div>
                </div>
                <div class="stat-desc mt-1.5 self-center lg:self-auto">
                  <span class="badge badge-warning/15 border-warning/20 badge-sm gap-1 text-warning font-semibold animate-pulse px-2 py-2">
                    {t(lang, "Orders issued", "നടപടികൾ")}
                  </span>
                </div>
              </div>

              <div class="stat flex items-center lg:items-start justify-between lg:block">
                <div>
                  <div class="stat-title text-xs uppercase tracking-wider font-semibold text-base-content/55">
                    {t(lang, "Pending", "തുടങ്ങിയിട്ടില്ല")}
                  </div>
                  <div class="stat-value text-base-content/40 font-display tabular-nums mt-1 text-2xl lg:text-3xl">
                    {pendingCount}
                  </div>
                </div>
                <div class="stat-desc mt-1.5 self-center lg:self-auto">
                  <span class="badge badge-neutral/10 border-base-300 badge-sm text-base-content/60 font-medium px-2 py-2">
                    {t(lang, "Awaiting action", "ബാക്കിയുള്ളവ")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Filters and Tabs Toolbar ── */}
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 bg-base-100 p-2.5 rounded-2xl border border-base-200 shadow-sm">
            {/* Category Tabs */}
            <nav
              class="tabs tabs-box bg-base-200/50 p-1 rounded-xl flex-1 max-w-full overflow-x-auto flex-nowrap shrink-0"
              aria-label="Manifesto categories"
            >
              <a
                href={`?tab=all&status=${filterStatus}`}
                class={`tab whitespace-nowrap px-3 py-2 text-xs md:text-sm font-medium ${
                  activeTab === "all"
                    ? "tab-active bg-base-100 shadow-sm rounded-lg"
                    : ""
                }`}
              >
                {t(lang, "All Promises", "എല്ലാ വാഗ്ദാനങ്ങളും")}
              </a>
              <a
                href={`?tab=guarantees&status=${filterStatus}`}
                class={`tab whitespace-nowrap px-3 py-2 text-xs md:text-sm font-medium ${
                  activeTab === "guarantees"
                    ? "tab-active bg-base-100 shadow-sm rounded-lg"
                    : ""
                }`}
              >
                {t(lang, "Indira Guarantees", "ഇന്ദിര ഗ്യാരണ്ടികൾ")}
              </a>
              <a
                href={`?tab=dreams&status=${filterStatus}`}
                class={`tab whitespace-nowrap px-3 py-2 text-xs md:text-sm font-medium ${
                  activeTab === "dreams"
                    ? "tab-active bg-base-100 shadow-sm rounded-lg"
                    : ""
                }`}
              >
                {t(lang, "Dream Projects", "ഡ്രീം പ്രോജക്ടുകൾ")}
              </a>
              <a
                href={`?tab=governance&status=${filterStatus}`}
                class={`tab whitespace-nowrap px-3 py-2 text-xs md:text-sm font-medium ${
                  activeTab === "governance"
                    ? "tab-active bg-base-100 shadow-sm rounded-lg"
                    : ""
                }`}
              >
                {t(lang, "Governance", "ഭരണപരിഷ്കാരം")}
              </a>
              <a
                href={`?tab=sector&status=${filterStatus}`}
                class={`tab whitespace-nowrap px-3 py-2 text-xs md:text-sm font-medium ${
                  activeTab === "sector"
                    ? "tab-active bg-base-100 shadow-sm rounded-lg"
                    : ""
                }`}
              >
                {t(lang, "Sectors", "മേഖലകൾ")}
              </a>
            </nav>

            {/* Status Pills using Join */}
            <div class="join border border-base-200 bg-base-100 shadow-sm shrink-0 self-start lg:self-auto">
              <a
                href={`?tab=${activeTab}&status=all`}
                class={`join-item btn btn-xs md:btn-sm font-semibold border-0 ${
                  filterStatus === "all"
                    ? "btn-primary text-primary-content"
                    : "btn-ghost hover:bg-base-200 text-base-content/85"
                }`}
              >
                {t(lang, "All Status", "എല്ലാ നിലയും")}
              </a>
              <a
                href={`?tab=${activeTab}&status=fulfilled`}
                class={`join-item btn btn-xs md:btn-sm font-semibold border-0 ${
                  filterStatus === "fulfilled"
                    ? "btn-success text-success-content"
                    : "btn-ghost text-success hover:bg-base-200"
                }`}
              >
                {t(lang, "Fulfilled", "നിറവേറ്റിയവ")}
              </a>
              <a
                href={`?tab=${activeTab}&status=in-progress`}
                class={`join-item btn btn-xs md:btn-sm font-semibold border-0 ${
                  filterStatus === "in-progress"
                    ? "btn-warning text-warning-content"
                    : "btn-ghost text-warning hover:bg-base-200"
                }`}
              >
                {t(lang, "In Progress", "നടന്നുവരുന്നത്")}
              </a>
              <a
                href={`?tab=${activeTab}&status=committed`}
                class={`join-item btn btn-xs md:btn-sm font-semibold border-0 ${
                  filterStatus === "committed"
                    ? "btn-neutral text-neutral-content"
                    : "btn-ghost text-base-content/65 hover:bg-base-200"
                }`}
              >
                {t(lang, "Committed", "പ്രതിജ്ഞ")}
              </a>
            </div>
          </div>

          {/* ── Content Grid / Sections ── */}
          {filteredGoals.length === 0
            ? (
              <div class="surface-card p-16 text-center border border-dashed border-base-300 rounded-3xl flex flex-col items-center justify-center bg-base-100/50">
                <svg
                  class="w-14 h-14 text-base-content/25 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 class="font-display font-bold text-lg text-base-content">
                  {t(lang, "No promises match filters", "യോജിക്കുന്ന വാഗ്ദാനങ്ങൾ ഇല്ല")}
                </h3>
                <p class="text-sm text-base-content/50 mt-1 max-w-sm">
                  {t(
                    lang,
                    "Try selecting a different category or status filter to see other commitments.",
                    "മറ്റു വികസന വാഗ്ദാനങ്ങൾ കാണുന്നതിനായി വിഭാഗങ്ങളോ നിലയോ മാറ്റി നോക്കുക.",
                  )}
                </p>
              </div>
            )
            : (
              <div>
                {renderSection(
                  "Five Indira Guarantees",
                  "അഞ്ച് ഇന്ദിര ഗ്യാരണ്ടികൾ",
                  "The flagship social welfare promises pledged by the coalition.",
                  "കുടുംബങ്ങൾക്കും സാധാരണക്കാർക്കുമായി പ്രഖ്യാപിച്ച അഞ്ച് പ്രധാന ക്ഷേമ പദ്ധതികൾ.",
                  indiraGuarantees,
                  "border-l-primary",
                )}

                {renderSection(
                  "Five Dream Projects",
                  "അഞ്ച് ഡ്രീം പ്രോജക്ടുകൾ",
                  "High-horizon infrastructure and long-term development ambitions.",
                  "കേരളത്തിന്റെ ഭാവിക്കായുള്ള വൻകിട അടിസ്ഥാനസൗകര്യ വികസന പദ്ധതികൾ.",
                  dreamProjects,
                  "border-l-secondary",
                )}

                {renderSection(
                  "Governance & Accountability",
                  "ഭരണ സുതാര്യതയും ഉത്തരവാദിത്തവും",
                  "Anti-corruption, institutional reforms, and fiscal transparency.",
                  "അഴിമതി വിരുദ്ധ നടപടികൾ, സാമ്പത്തിക സുതാര്യത, ഭരണ പരിഷ്കാരങ്ങൾ.",
                  governance,
                  "border-l-accent",
                )}

                {renderSection(
                  "Sector Pledges",
                  "മേഖലാ വാഗ്ദാനങ്ങൾ",
                  "Targeted commitments in health, environment, education, and welfare.",
                  "ആരോഗ്യം, വിദ്യാഭ്യാസം, പരിസ്ഥിതി, ഗോത്രക്ഷേമം എന്നിവയിലെ വാഗ്ദാനങ്ങൾ.",
                  sector,
                  "border-l-info",
                )}
              </div>
            )}

          <footer class="mt-8 bg-base-200/40 p-4 rounded-xl flex items-center justify-between text-xs text-base-content/50 border border-base-200">
            <div>
              {t(
                lang,
                "Backing orders ingested automatically.",
                "സർക്കാർ ഉത്തരവുകൾ സ്വയമേവ ശേഖരിക്കുന്നു.",
              )}
            </div>
            <a
              href="/gov/ingest-status"
              class="link link-primary font-semibold hover:underline"
            >
              {lang === "ml"
                ? "പൈപ്പ്‌ലൈൻ നില പരിശോധിക്കുക →"
                : "Verify Pipeline Status →"}
            </a>
          </footer>
        </main>
        <Footer lang={lang} />
      </div>

      {/* ── Right-Side Detail Drawer (daisyUI) ── */}
      <div class="drawer-side z-50">
        <a
          href={closeUrl}
          class="drawer-overlay"
          aria-label={t(lang, "Close detail panel", "വിശദാംശങ്ങൾ അടയ്ക്കുക")}
        >
        </a>
        <div class="menu p-6 w-full max-w-lg min-h-full bg-base-100 text-base-content border-l border-base-200 flex flex-col gap-6 shadow-2xl overflow-y-auto">
          {/* Header row */}
          <div class="flex items-center justify-between border-b border-base-200 pb-4">
            <span class="text-xs uppercase font-bold tracking-widest text-base-content/40">
              {t(lang, "Promise Progress", "വാഗ്ദാന പുരോഗതി")}
            </span>
            <a href={closeUrl} class="btn btn-sm btn-circle btn-ghost">
              <svg
                class="w-4 h-4 fill-none stroke-current"
                stroke-width="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </a>
          </div>

          {selectedGoal
            ? (
              <div class="flex flex-col gap-6 pr-1">
                {/* Category label */}
                {selectedGoal.featuredLabel && (
                  <span
                    class={`text-[9px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-md self-start ${
                      selectedGoal.featuredLabel === "Indira Guarantee"
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-secondary/10 text-secondary border border-secondary/20"
                    }`}
                  >
                    {lang === "ml" && selectedGoal.featuredLabelMl
                      ? selectedGoal.featuredLabelMl
                      : selectedGoal.featuredLabel}
                  </span>
                )}

                {/* Title & status */}
                <div class="flex flex-col gap-3">
                  <h2 class="text-xl font-bold leading-snug text-base-content">
                    {lang === "ml" && selectedGoal.titleMl
                      ? selectedGoal.titleMl
                      : selectedGoal.title}
                  </h2>
                  {lang === "ml" && selectedGoal.titleMl && (
                    <p class="text-sm text-base-content/50 italic font-medium">
                      {selectedGoal.title}
                    </p>
                  )}
                  <div class="flex items-center gap-2 mt-1">
                    <span
                      class={`badge font-semibold gap-1.5 py-3 px-3 border ${
                        STATUS_META[selectedGoal.status].badgeCls
                      }`}
                    >
                      <span
                        class={`w-2 h-2 rounded-full ${
                          STATUS_META[selectedGoal.status].dotCls
                        }`}
                      >
                      </span>
                      {lang === "ml"
                        ? STATUS_META[selectedGoal.status].labelMl
                        : STATUS_META[selectedGoal.status].label}
                    </span>
                  </div>
                </div>

                {/* Summary */}
                {displayDrawerSummary && (
                  <div class="bg-base-200/35 border border-base-200 p-4 rounded-xl">
                    <p class="text-sm text-base-content/80 leading-relaxed font-medium">
                      {displayDrawerSummary}
                    </p>
                    {lang === "ml" && selectedGoal.summaryMl && (
                      <p class="text-xs text-base-content/50 leading-relaxed mt-2 pt-2 border-t border-base-200/60">
                        {selectedGoal.summary}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions Timeline */}
                <div class="flex flex-col gap-4">
                  <h3 class="text-sm font-bold uppercase tracking-wider text-base-content/60 flex items-center gap-2">
                    <svg
                      class="w-4 h-4 opacity-75 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    {lang === "ml"
                      ? "നടപടികളുടെ ചരിത്രം"
                      : "Action & Order History"}
                  </h3>

                  {selectedGoalOrders.length > 0
                    ? (
                      <ul class="timeline timeline-vertical timeline-compact p-1 bg-base-100 rounded-xl">
                        {selectedGoalOrders.map((o, idx) => {
                          const conf = o.manifestoConfidence
                            ? CONFIDENCE_LABEL[o.manifestoConfidence]
                            : null;
                          return (
                            <li key={o.id} class="w-full">
                              {idx > 0 && (
                                <hr class="bg-base-200/80 h-4 my-0.5" />
                              )}
                              <div class="timeline-middle text-success bg-success/10 p-1.5 rounded-full border border-success/20 shrink-0">
                                <svg
                                  class="w-3.5 h-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2.5"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                              <div class="timeline-end bg-base-200/40 p-4 rounded-xl border border-base-200/60 my-1 w-full flex flex-col gap-2">
                                <div class="flex items-center gap-2 flex-wrap">
                                  <span class="badge badge-xs badge-neutral font-mono font-bold text-[9px] px-1.5 py-1.5">
                                    {ORDER_TYPE_SHORT[o.type]
                                      ? (lang === "ml"
                                        ? ORDER_TYPE_SHORT[o.type].ml
                                        : ORDER_TYPE_SHORT[o.type].en)
                                      : o.type}
                                  </span>
                                  <span class="text-[10px] text-base-content/40 font-semibold tabular-nums">
                                    {new Date(o.date).toLocaleDateString(
                                      lang === "ml" ? "ml-IN" : "en-IN",
                                      {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                        timeZone: "Asia/Kolkata",
                                      },
                                    )}
                                  </span>
                                  {conf && (
                                    <span
                                      class={`text-[9px] font-extrabold uppercase tracking-wider px-1 bg-base-300/40 rounded ${conf.cls}`}
                                    >
                                      {lang === "ml" ? conf.ml : conf.en}
                                    </span>
                                  )}
                                </div>
                                <h4 class="text-xs font-semibold leading-snug text-base-content">
                                  {lang === "ml" && o.subjectMl
                                    ? o.subjectMl
                                    : o.subject}
                                </h4>
                                {lang === "ml" && o.subjectMl && (
                                  <p class="text-[11px] text-base-content/50 leading-normal border-t border-base-200/50 pt-1">
                                    {o.subject}
                                  </p>
                                )}
                                <a
                                  href={`/gov/orders/${o.id}`}
                                  class="btn btn-xs btn-primary text-[11px] self-start mt-1 gap-1.5 rounded-md hover:btn-active transition"
                                >
                                  {t(lang, "View Details →", "വിശദാംശങ്ങൾ കാണുക →")}
                                </a>
                              </div>
                              {idx < selectedGoalOrders.length - 1 && (
                                <hr class="bg-base-200/80 h-4 my-0.5" />
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )
                    : (
                      <div class="alert bg-warning/5 border border-warning/15 text-xs text-base-content/75 flex items-start gap-2.5 rounded-xl">
                        <svg
                          class="w-5 h-5 text-warning shrink-0"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <div>
                          <p class="font-bold">
                            {t(
                              lang,
                              "Awaiting Official Action",
                              "ഔദ്യോഗിക നടപടി കാത്തിരിക്കുന്നു",
                            )}
                          </p>
                          <p class="text-base-content/55 mt-0.5">
                            {lang === "ml"
                              ? "ഈ വാഗ്ദാനത്തെ സാധൂകരിക്കുന്ന സർക്കാർ ഉത്തരവുകളൊന്നും ഇതുവരെ പുറത്തിറങ്ങിയിട്ടില്ല. ഓരോ ദിവസവും ഗസറ്റ് പോർട്ടലുകൾ ഞങ്ങൾ നിരീക്ഷിക്കുന്നുണ്ട്."
                              : "No official Government Orders, Circulars, or Bills have been linked to this promise yet. Portals are scanned daily."}
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )
            : (
              <div class="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                <svg
                  class="w-12 h-12 mb-2"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p class="text-sm font-semibold">
                  {t(
                    lang,
                    "Select a promise to view timeline",
                    "വിശദാംശങ്ങൾക്കായി ഒരു വാഗ്ദാനം തിരഞ്ഞെടുക്കുക",
                  )}
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
});

function GoalCard(
  {
    goal,
    orders,
    lang,
    accentColorClass,
    activeTab,
    filterStatus,
  }: {
    goal: ManifestoGoal;
    orders: GovernmentOrder[];
    lang: "en" | "ml";
    accentColorClass: string;
    activeTab: string;
    filterStatus: string;
  },
) {
  const status = STATUS_META[goal.status];
  const displayTitle = lang === "ml" && goal.titleMl
    ? goal.titleMl
    : goal.title;
  const displaySummary = lang === "ml" && goal.summaryMl
    ? goal.summaryMl
    : goal.summary;

  return (
    <div
      id={goal.id}
      class={`card bg-base-100 border border-base-200 border-l-4 ${accentColorClass} hover:shadow-md transition-all duration-200 flex flex-col relative overflow-hidden h-full scroll-mt-24`}
    >
      <div class="card-body p-4 sm:p-5 flex flex-col gap-3 h-full">
        {/* Flagship Branding Label */}
        {goal.featuredLabel && (
          <span
            class={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md self-start ${
              goal.featuredLabel === "Indira Guarantee"
                ? "bg-primary/10 text-primary border border-primary/15"
                : "bg-secondary/10 text-secondary border border-secondary/15"
            }`}
          >
            {lang === "ml" && goal.featuredLabelMl
              ? goal.featuredLabelMl
              : goal.featuredLabel}
          </span>
        )}

        {/* Title row */}
        <div class="flex items-start justify-between gap-3">
          <h3
            class={`font-bold text-base leading-snug text-base-content flex-1 ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {displayTitle}
          </h3>
          <span
            class={`badge badge-sm font-semibold shrink-0 gap-1.5 py-2.5 px-2 ${status.badgeCls}`}
          >
            <span class={`w-1.5 h-1.5 rounded-full ${status.dotCls}`}></span>
            {lang === "ml" ? status.labelMl : status.label}
          </span>
        </div>

        {/* Summary */}
        {displaySummary && (
          <p
            class={`text-xs md:text-sm text-base-content/70 leading-relaxed mb-1 ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {displaySummary}
          </p>
        )}

        {/* Action Button at the bottom */}
        {orders.length > 0
          ? (
            <a
              href={`?tab=${activeTab}&status=${filterStatus}&goal=${goal.id}#${goal.id}`}
              class="btn btn-sm btn-ghost text-primary justify-between border border-base-200/80 mt-auto hover:bg-primary/5 transition rounded-lg"
            >
              <span class="flex items-center gap-1.5 text-xs font-semibold">
                <svg
                  class="w-3.5 h-3.5 opacity-80"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {lang === "ml"
                  ? `നടപടികൾ പരിശോധിക്കുക (${orders.length})`
                  : `View Actions (${orders.length})`}
              </span>
              <span>→</span>
            </a>
          )
          : (
            <a
              href={`?tab=${activeTab}&status=${filterStatus}&goal=${goal.id}#${goal.id}`}
              class="btn btn-sm btn-ghost text-base-content/50 justify-between border border-base-200/80 mt-auto hover:bg-base-200/50 transition rounded-lg"
            >
              <span class="text-xs font-semibold">
                {lang === "ml" ? "വിശദാംശങ്ങൾ കാണുക" : "View Details"}
              </span>
              <span>→</span>
            </a>
          )}
      </div>
    </div>
  );
}
