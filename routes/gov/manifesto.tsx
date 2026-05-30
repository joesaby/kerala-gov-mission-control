import { page } from "fresh";
import { define } from "../../utils.ts";
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
}

export const handler = define.handlers<Data>({
  async GET() {
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

    return page({ govt, goals, ordersByGoal });
  },
});

const STATUS_META: Record<
  ManifestoGoalStatus,
  { label: string; labelMl: string; cls: string }
> = {
  committed: {
    label: "Committed",
    labelMl: "പ്രതിജ്ഞ",
    cls: "badge-ghost",
  },
  "in-progress": {
    label: "In progress",
    labelMl: "നടന്നുവരുന്നു",
    cls: "badge-warning",
  },
  fulfilled: {
    label: "Fulfilled",
    labelMl: "നിറവേറ്റി",
    cls: "badge-success",
  },
  dropped: {
    label: "Dropped",
    labelMl: "ഉപേക്ഷിച്ചു",
    cls: "badge-error",
  },
};

const CONFIDENCE_LABEL: Record<
  string,
  { label: string; cls: string }
> = {
  direct: { label: "Direct", cls: "text-success" },
  supporting: { label: "Supporting", cls: "text-warning" },
  weak: { label: "Weak", cls: "text-base-content/40" },
};

const ORDER_TYPE_SHORT: Record<string, string> = {
  P: "Policy GO",
  Ms: "Memo GO",
  Rt: "Routine GO",
  SRO: "SRO",
  Circular: "Circular",
  Bill: "Bill",
};

export default define.page<typeof handler>(function ManifestoPage(
  { data, state },
) {
  const lang = state.lang;
  const { govt, goals, ordersByGoal } = data;

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
  const fulfilled = goals.filter((g) => g.status === "fulfilled").length;

  return (
    <>
      <Header lang={lang} />
      <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* ── Header ── */}
        <section class="mb-8">
          <p class="text-xs uppercase tracking-wider text-base-content/60 font-medium">
            <a href="/gov" class="hover:text-primary transition">
              {lang === "ml"
                ? govt?.nameMl ?? govt?.name ?? "സർക്കാർ"
                : govt?.name ?? "Government"}
            </a>
            {" · "}
            {lang === "ml" ? "മ്യാനിഫെസ്റ്റോ" : "Manifesto"}
          </p>
          <h1 class="text-3xl md:text-4xl font-bold mt-1">
            {lang === "ml" ? "വാഗ്ദാന ട്രാക്കർ" : "Promise Tracker"}
          </h1>
          <p class="text-base-content/70 mt-2 max-w-2xl">
            {lang === "ml"
              ? "UDF 2026 തിരഞ്ഞെടുപ്പ് പ്രകടനപത്രിക — ഓരോ വാഗ്ദാനവും അത് ബാക്കപ്പ് ചെയ്യുന്ന സർക്കാർ ഉത്തരവുകൾ സഹിതം."
              : "UDF 2026 election manifesto — every commitment mapped to the government orders that back it."}
          </p>

          {/* Summary chips */}
          <div class="mt-5 flex flex-wrap gap-3 text-sm">
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full border border-base-300 bg-base-100">
              <span class="font-bold tabular-nums text-base-content">
                {goalsWithAction}
                <span class="text-base-content/40 font-normal">
                  /{goals.length}
                </span>
              </span>
              <span class="text-base-content/60">
                {lang === "ml" ? "നടപ്പിലാക്കൽ" : "actioned"}
              </span>
            </div>
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full border border-success/30 bg-success/5">
              <span class="font-bold tabular-nums text-success">
                {fulfilled}
              </span>
              <span class="text-base-content/60">
                {lang === "ml" ? "നിറവേറ്റിയവ" : "fulfilled"}
              </span>
            </div>
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full border border-base-300 bg-base-100">
              <span class="font-bold tabular-nums text-base-content">
                {goals.length - goalsWithAction}
              </span>
              <span class="text-base-content/60">
                {lang === "ml" ? "തുടക്കമിടാത്തവ" : "not yet started"}
              </span>
            </div>
          </div>

          <p class="mt-4 text-xs text-base-content/50">
            {lang === "ml"
              ? "ഉത്തരവുകൾ ദിവസേന സ്വയമേവ ശേഖരിക്കുന്നു · "
              : "Backing orders are ingested automatically each day · "}
            <a href="/gov/ingest-status" class="link link-hover text-primary">
              {lang === "ml" ? "പൈപ്പ്‌ലൈൻ നില" : "pipeline status"}
            </a>
          </p>
        </section>

        {/* ── Indira Guarantees ── */}
        <GoalGroup
          title={lang === "ml" ? "ഇന്ദിര ഗ്യാരണ്ടികൾ" : "Five Indira Guarantees"}
          description={lang === "ml"
            ? "UDF-ന്റെ അഞ്ച് മുൻ‌ഗണനാ വാഗ്ദാനങ്ങൾ"
            : "The five flagship branded pledges of the UDF manifesto"}
          goals={indiraGuarantees}
          ordersByGoal={ordersByGoal}
          lang={lang}
          accentClass="border-l-primary"
        />

        {/* ── Dream Projects ── */}
        <GoalGroup
          title={lang === "ml" ? "ഡ്രീം പ്രോജക്ടുകൾ" : "Five Dream Projects"}
          description={lang === "ml"
            ? "ദീർഘകാല അടിസ്ഥാന സൗകര്യ, വികസന ലക്ഷ്യങ്ങൾ"
            : "Long-horizon infrastructure and development ambitions"}
          goals={dreamProjects}
          ordersByGoal={ordersByGoal}
          lang={lang}
          accentClass="border-l-secondary"
        />

        {/* ── Governance ── */}
        <GoalGroup
          title={lang === "ml"
            ? "ഭരണ സുതാര്യതയും ഉത്തരവാദിത്തവും"
            : "Governance & Accountability"}
          description={lang === "ml"
            ? "ഭരണ പരിഷ്കാരങ്ങൾ, ധന സുതാര്യത, ജുഡീഷ്യൽ മേൽനോട്ടം"
            : "Institutional reform, fiscal transparency, and oversight pledges"}
          goals={governance}
          ordersByGoal={ordersByGoal}
          lang={lang}
          accentClass="border-l-accent"
        />

        {/* ── Sector ── */}
        <GoalGroup
          title={lang === "ml" ? "മേഖലാ വാഗ്ദാനങ്ങൾ" : "Sector Pledges"}
          description={lang === "ml"
            ? "ആരോഗ്യം, ഗോത്രം, പരിസ്ഥിതി, ഭവനം"
            : "Health, tribal, environment, and housing commitments"}
          goals={sector}
          ordersByGoal={ordersByGoal}
          lang={lang}
          accentClass="border-l-info"
        />
      </main>
      <Footer lang={lang} />
    </>
  );
});

function GoalGroup({
  title,
  description,
  goals,
  ordersByGoal,
  lang,
  accentClass,
}: {
  title: string;
  description: string;
  goals: ManifestoGoal[];
  ordersByGoal: Record<string, GovernmentOrder[]>;
  lang: "en" | "ml";
  accentClass: string;
}) {
  if (goals.length === 0) return null;
  return (
    <section class="mb-12">
      <h2 class="text-xl font-semibold mb-1">{title}</h2>
      <p class="text-sm text-base-content/60 mb-4">{description}</p>
      <ul class="flex flex-col gap-4">
        {goals.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            orders={ordersByGoal[g.id] ?? []}
            lang={lang}
            accentClass={accentClass}
          />
        ))}
      </ul>
    </section>
  );
}

function GoalCard(
  {
    goal,
    orders,
    lang,
    accentClass,
  }: {
    goal: ManifestoGoal;
    orders: GovernmentOrder[];
    lang: "en" | "ml";
    accentClass: string;
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
    <li
      class={`card bg-base-100 border border-base-300 border-l-4 ${accentClass} hover:shadow-md transition`}
    >
      <div class="card-body p-4 sm:p-5 gap-3">
        {/* Title row */}
        <div class="flex flex-wrap items-start justify-between gap-3">
          <h3
            class={`font-semibold text-base leading-snug flex-1 ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {displayTitle}
          </h3>
          <span
            class={`badge badge-sm ${status.cls} shrink-0`}
          >
            {lang === "ml" ? status.labelMl : status.label}
          </span>
        </div>

        {/* Summary */}
        {displaySummary && (
          <p
            class={`text-sm text-base-content/70 leading-relaxed ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {displaySummary}
          </p>
        )}

        {/* Backing GOs */}
        {orders.length > 0
          ? (
            <div class="pt-2 border-t border-base-200">
              <p class="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2">
                {lang === "ml"
                  ? "ഉത്തരവുകൾ / നടപടികൾ"
                  : "Backing orders & actions"}
              </p>
              <ul class="flex flex-col gap-2">
                {orders.map((o) => {
                  const conf = o.manifestoConfidence
                    ? CONFIDENCE_LABEL[o.manifestoConfidence]
                    : null;
                  return (
                    <li
                      key={o.id}
                      class="flex items-start justify-between gap-3 text-sm"
                    >
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap mb-0.5">
                          <span class="badge badge-xs badge-ghost font-mono">
                            {ORDER_TYPE_SHORT[o.type] ?? o.type}
                          </span>
                          <time class="text-xs text-base-content/50 tabular-nums">
                            {new Date(o.date).toLocaleDateString(
                              lang === "ml" ? "ml-IN" : "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                timeZone: "Asia/Kolkata",
                              },
                            )}
                          </time>
                          {conf && (
                            <span
                              class={`text-[10px] font-semibold uppercase ${conf.cls}`}
                            >
                              {conf.label}
                            </span>
                          )}
                        </div>
                        <p class="text-base-content/80 leading-snug line-clamp-2 text-xs">
                          {lang === "ml" && o.subjectMl
                            ? o.subjectMl
                            : o.subject}
                        </p>
                      </div>
                      <a
                        href={o.meta.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="btn btn-xs btn-ghost shrink-0"
                        title="View source PDF"
                      >
                        PDF ↗
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )
          : (
            <div class="pt-2 border-t border-base-200">
              <p class="text-xs text-base-content/40 italic">
                {lang === "ml"
                  ? "ഇതുവരെ ഉത്തരവുകളൊന്നും ഇല്ല"
                  : "No government orders recorded yet"}
              </p>
            </div>
          )}
      </div>
    </li>
  );
}
