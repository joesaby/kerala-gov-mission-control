import { page } from "fresh";
import { define } from "../utils.ts";
import {
  getCurrentGovernment,
  listGovernmentOrders,
  listKpis,
  listManifestoGoals,
} from "../data/db.ts";
import { KpiCard } from "../components/KpiCard.tsx";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { StatusBadge } from "../components/StatusBadge.tsx";
import type {
  Government,
  GovernmentOrder,
  Kpi,
  KpiStatus,
  ManifestoGoal,
} from "../data/types.ts";

const STATUS_ORDER: KpiStatus[] = [
  "off-track",
  "slipping",
  "improving",
  "on-track",
];

interface Data {
  kpis: Kpi[];
  govt: Government | null;
  goals: ManifestoGoal[];
  recentOrders: GovernmentOrder[];
}

export const handler = define.handlers<Data>({
  async GET() {
    const [kpis, govt, allOrders] = await Promise.all([
      listKpis(),
      getCurrentGovernment(),
      listGovernmentOrders(),
    ]);
    const goals = govt ? await listManifestoGoals(govt.id) : [];
    // listGovernmentOrders() already returns sorted newest-first
    const recentOrders = allOrders.filter((o) =>
      !govt || (o.date >= govt.termStart &&
        (!govt.termEnd || o.date <= govt.termEnd))
    ).slice(0, 3);
    return page({ kpis, govt, goals, recentOrders });
  },
});

function daysInOffice(termStart: string): number {
  const start = new Date(termStart);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  P: "Policy",
  Ms: "Memo",
  Rt: "Routine",
  SRO: "SRO",
  Circular: "Circular",
  Bill: "Bill",
};

export default define.page<typeof handler>(function Home({ data, state }) {
  const lang = state.lang;
  const { kpis, govt, goals, recentOrders } = data;

  const counts = kpis.reduce<Record<KpiStatus, number>>(
    (acc, k) => {
      acc[k.status] = (acc[k.status] ?? 0) + 1;
      return acc;
    },
    { "off-track": 0, "slipping": 0, "on-track": 0, "improving": 0 },
  );

  const today = new Date().toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const goalsWithAction = goals.filter((g) =>
    g.status === "in-progress" || g.status === "fulfilled"
  ).length;
  const goalsFulfilled = goals.filter((g) => g.status === "fulfilled").length;
  const indiraGuarantees = goals.filter((g) =>
    g.featuredLabel === "Indira Guarantee"
  );
  const indiraInProgress = indiraGuarantees.filter((g) =>
    g.status === "in-progress" || g.status === "fulfilled"
  ).length;

  const days = govt ? daysInOffice(govt.termStart) : 0;

  return (
    <>
      <Header lang={lang} />
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* ── Government context bar ── */}
        {govt && (
          <a
            href="/gov"
            class="flex flex-wrap items-center justify-between gap-3 mb-8 p-4 rounded-xl border border-base-300 bg-base-100 hover:border-primary hover:shadow-sm transition group"
          >
            <div class="flex items-center gap-3">
              <span class="badge badge-sm badge-outline">{govt.coalition}</span>
              <span
                class={`font-semibold text-sm ${lang === "ml" ? "ml" : ""}`}
              >
                {lang === "ml" && govt.nameMl ? govt.nameMl : govt.name}
              </span>
            </div>
            <div class="flex items-center gap-4 text-xs text-base-content/60">
              <span>
                <span class="tabular-nums font-semibold text-base-content">
                  {days}
                </span>{" "}
                {lang === "ml" ? "ദിവസം അധികാരത്തിൽ" : "days in office"}
              </span>
              <span class="group-hover:text-primary transition">
                {lang === "ml" ? "മന്ത്രിസഭ കാണുക →" : "View cabinet →"}
              </span>
            </div>
          </a>
        )}

        {/* ── Page heading ── */}
        <section class="mb-8 md:mb-10">
          <p class="text-xs uppercase tracking-wider text-base-content/60 font-medium">
            {today} · India Standard Time
          </p>
          <h1
            class={`text-3xl md:text-4xl font-bold mt-1 ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {lang === "ml" ? "ഇന്നത്തെ കേരളം" : "Kerala Today"}
          </h1>
          <p
            class={`text-base-content/70 mt-2 max-w-2xl ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {lang === "ml"
              ? "സംസ്ഥാനത്തിന്റെ പ്രധാന 12 സൂചകങ്ങൾ — സാമ്പത്തികം, ആരോഗ്യം, വിദ്യാഭ്യാസം, സുരക്ഷ, വിശ്വാസ്യത, സേവനങ്ങൾ — ഒറ്റ കാഴ്ചയിൽ."
              : "Twelve headline indicators — fiscal, health, education, safety, trust, services — at a glance. Click any tile for definition, source, and methodology."}
          </p>

          <dl class="mt-5 flex flex-wrap items-center gap-4 text-sm">
            {STATUS_ORDER.map((s) => (
              <div class="flex items-center gap-2">
                <StatusBadge status={s} />
                <dd class="tabular-nums font-semibold">{counts[s]}</dd>
              </div>
            ))}
            <a
              href="/methodology"
              class="link link-hover text-base-content/60 ml-auto"
            >
              How we score status →
            </a>
          </dl>
        </section>

        {/* ── Promise Pulse ── */}
        {goals.length > 0 && (
          <section class="mb-10">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-sm font-semibold uppercase tracking-wider text-base-content/60">
                {lang === "ml" ? "വാഗ്ദാന ട്രാക്കർ" : "Promise Pulse"}
              </h2>
              <a
                href="/gov/manifesto"
                class="text-xs link link-hover text-primary"
              >
                {lang === "ml" ? "എല്ലാ വാഗ്ദാനങ്ങളും →" : "All commitments →"}
              </a>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatChip
                value={`${goalsWithAction} / ${goals.length}`}
                label={lang === "ml"
                  ? "വാഗ്ദാനങ്ങൾ നടപ്പിലാക്കൽ"
                  : "Commitments actioned"}
                href="/gov/manifesto"
              />
              <StatChip
                value={String(goalsFulfilled)}
                label={lang === "ml" ? "നിറവേറ്റിയവ" : "Fulfilled"}
                href="/gov/manifesto"
              />
              <StatChip
                value={`${indiraInProgress} / ${indiraGuarantees.length}`}
                label={lang === "ml" ? "ഇന്ദിര ഗ്യാരണ്ടികൾ" : "Indira Guarantees"}
                href="/gov/manifesto"
              />
              <StatChip
                value={String(
                  recentOrders.length > 0 ? recentOrders.length : "–",
                )}
                label={lang === "ml" ? "സമീപകാല ഉത്തരവുകൾ" : "Recent orders"}
                href="/gov"
              />
            </div>
          </section>
        )}

        {/* ── Recent Government Orders ── */}
        {recentOrders.length > 0 && (
          <section class="mb-10">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-sm font-semibold uppercase tracking-wider text-base-content/60">
                {lang === "ml"
                  ? "സമീപകാല സർക്കാർ ഉത്തരവുകൾ"
                  : "Recent Government Orders"}
              </h2>
              <a href="/gov" class="text-xs link link-hover text-primary">
                {lang === "ml" ? "എല്ലാ ഉത്തരവുകളും →" : "All orders →"}
              </a>
            </div>
            <ul class="flex flex-col gap-2">
              {recentOrders.map((o) => {
                const goalIds = o.manifestoGoalIds ?? [];
                return (
                  <li
                    key={o.id}
                    class="flex flex-wrap items-start gap-3 p-3 rounded-lg border border-base-300 bg-base-100 hover:border-primary/40 transition text-sm"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1 flex-wrap">
                        <span class="badge badge-xs badge-ghost font-mono">
                          {ORDER_TYPE_LABEL[o.type] ?? o.type}
                        </span>
                        <time class="text-xs text-base-content/50 tabular-nums">
                          {new Date(o.date).toLocaleDateString(
                            lang === "ml" ? "ml-IN" : "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              timeZone: "Asia/Kolkata",
                            },
                          )}
                        </time>
                        {goalIds.length > 0 && (
                          <span class="badge badge-xs badge-warning gap-1">
                            ✦ {lang === "ml" ? "വാഗ്ദാനം" : "Manifesto linked"}
                          </span>
                        )}
                      </div>
                      <p class="text-base-content/90 leading-snug line-clamp-2">
                        {lang === "ml" && o.subjectMl ? o.subjectMl : o.subject}
                      </p>
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
                );
              })}
            </ul>
          </section>
        )}

        {/* ── KPI grid ── */}
        <section
          aria-label="Headline indicators"
          class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {kpis.map((kpi) => (
            <KpiCard
              key={kpi.id}
              kpi={kpi}
              lang={lang}
              dept={null}
            />
          ))}
        </section>

        {/* ── Explore cards ── */}
        <section class="mt-12 grid gap-4 md:grid-cols-3">
          <a
            href="/money"
            class="card bg-base-100 border border-base-300 hover:border-primary hover:shadow-md transition"
          >
            <div class="card-body p-5">
              <h3 class="card-title text-base">Where my money goes</h3>
              <p class="text-sm text-base-content/70">
                Every rupee from source to scheme to district — sankey + tender
                drilldown.
              </p>
            </div>
          </a>
          <a
            href="/gov/manifesto"
            class="card bg-base-100 border border-base-300 hover:border-primary hover:shadow-md transition"
          >
            <div class="card-body p-5">
              <h3 class="card-title text-base">Promises tracker</h3>
              <p class="text-sm text-base-content/70">
                {goals.length > 0
                  ? `${goalsWithAction} of ${goals.length} manifesto commitments have government orders backing them.`
                  : "Manifesto commitments with live GO evidence — committed, in progress, fulfilled."}
              </p>
            </div>
          </a>
          <a
            href="/panchayat"
            class="card bg-base-100 border border-base-300 hover:border-primary hover:shadow-md transition"
          >
            <div class="card-body p-5">
              <h3 class="card-title text-base">My panchayat</h3>
              <p class="text-sm text-base-content/70">
                Geo-located view of your LSG's budget, projects, gram sabha
                decisions and grievances.
              </p>
            </div>
          </a>
        </section>
      </main>
      <Footer lang={lang} />
    </>
  );
});

function StatChip(
  { value, label, href }: { value: string; label: string; href: string },
) {
  return (
    <a
      href={href}
      class="flex flex-col gap-1 p-4 rounded-xl border border-base-300 bg-base-100 hover:border-primary hover:shadow-sm transition"
    >
      <span class="text-2xl font-bold tabular-nums text-base-content">
        {value}
      </span>
      <span class="text-xs text-base-content/60 leading-tight">{label}</span>
    </a>
  );
}
