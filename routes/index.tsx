import { page } from "fresh";
import { define } from "../utils.ts";
import { t } from "../data/lang.ts";
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

/** Time-aware greeting in IST. */
function greeting(lang: "en" | "ml"): string {
  const hour = Number(
    new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hour12: false,
    }),
  );
  if (hour < 12) return t(lang, "Good morning", "സുപ്രഭാതം");
  if (hour < 17) return t(lang, "Good afternoon", "നമസ്കാരം");
  return t(lang, "Good evening", "ശുഭ സന്ധ്യ");
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
  const trendingWell = counts["on-track"] + counts["improving"];

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
      <Header lang={lang} path={state.path} />
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* ── Greeting hero ── */}
        <section class="hero-band rounded-box border border-base-300 p-6 md:p-8 mb-8">
          <p class="text-xs uppercase tracking-wider text-base-content/60 font-medium tabular-nums">
            {today} · {t(lang, "India Standard Time", "ഇന്ത്യൻ സമയം")}
          </p>
          <h1
            class={`font-display text-3xl md:text-4xl font-bold mt-1 ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {greeting(lang)} —{" "}
            {lang === "ml" ? "ഇന്നത്തെ കേരളം" : "here's Kerala today"}
          </h1>
          <p
            class={`text-base-content/70 mt-2 max-w-2xl leading-relaxed ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {lang === "ml"
              ? "സംസ്ഥാനത്തിന്റെ പ്രധാന 12 സൂചകങ്ങൾ — സാമ്പത്തികം, ആരോഗ്യം, വിദ്യാഭ്യാസം, സുരക്ഷ, വിശ്വാസ്യത, സേവനങ്ങൾ — ഒറ്റ കാഴ്ചയിൽ. ഓരോ കാർഡിലും നിർവചനവും ഉറവിടവും കാണാം."
              : "Twelve headline indicators — money, health, education, safety, trust and services — at a glance. Tap any card for what it means and where the number comes from."}
          </p>

          {/* At-a-glance summary */}
          <div class="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
            <p class={`text-sm font-medium ${lang === "ml" ? "ml" : ""}`}>
              {lang === "ml"
                ? `${kpis.length}-ൽ ${trendingWell} സൂചകങ്ങൾ നല്ല ദിശയിലാണ്.`
                : `${trendingWell} of ${kpis.length} indicators are trending well.`}
            </p>
            <dl class="flex flex-wrap items-center gap-3 text-sm">
              {STATUS_ORDER.map((s) => (
                <div class="flex items-center gap-1.5">
                  <StatusBadge status={s} lang={lang} />
                  <dd class="tabular-nums font-semibold">{counts[s]}</dd>
                </div>
              ))}
            </dl>
            <a
              href="/methodology"
              class="link link-hover text-base-content/60 text-sm ml-auto"
            >
              {t(lang, "How we score status →", "സ്കോറിങ് രീതി →")}
            </a>
          </div>
        </section>

        {/* ── Government context bar ── */}
        {govt && (
          <a
            href="/gov"
            class="surface-link flex flex-wrap items-center justify-between gap-3 mb-8 p-4 group"
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
              <span class="group-hover:text-primary transition font-medium">
                {lang === "ml" ? "മന്ത്രിസഭ കാണുക →" : "View cabinet →"}
              </span>
            </div>
          </a>
        )}

        {/* ── Promise Pulse ── */}
        {goals.length > 0 && (
          <section class="mb-10">
            <div class="flex items-center justify-between mb-3">
              <h2 class="eyebrow">
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
                href="/gov/orders"
              />
            </div>
          </section>
        )}

        {/* ── Recent Government Orders ── */}
        {recentOrders.length > 0 && (
          <section class="mb-10">
            <div class="flex items-center justify-between mb-3">
              <h2 class="eyebrow">
                {lang === "ml"
                  ? "സമീപകാല സർക്കാർ ഉത്തരവുകൾ"
                  : "Recent Government Orders"}
              </h2>
              <a
                href="/gov/orders"
                class="text-xs link link-hover text-primary"
              >
                {lang === "ml" ? "എല്ലാ ഉത്തരവുകളും →" : "All orders →"}
              </a>
            </div>
            <ul class="flex flex-col gap-2">
              {recentOrders.map((o) => {
                const goalIds = o.manifestoGoalIds ?? [];
                return (
                  <li
                    key={o.id}
                    class="surface-card flex flex-wrap items-start gap-3 p-3 text-sm"
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
                          <span class="badge badge-xs badge-accent gap-1">
                            ✦ {lang === "ml" ? "വാഗ്ദാനം" : "Manifesto linked"}
                          </span>
                        )}
                      </div>
                      <a
                        href={`/gov/orders/${o.id}`}
                        class="block text-base-content/90 leading-snug line-clamp-2 hover:text-primary transition"
                      >
                        {lang === "ml" && o.subjectMl ? o.subjectMl : o.subject}
                      </a>
                    </div>
                    <a
                      href={`/gov/orders/${o.id}`}
                      class="btn btn-xs btn-ghost shrink-0"
                    >
                      {t(lang, "Read →", "വായിക്കുക →")}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ── KPI grid ── */}
        <section
          aria-label={t(lang, "Headline indicators", "പ്രധാന സൂചകങ്ങൾ")}
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
          <ExploreCard
            href="/economy"
            title={t(
              lang,
              "Kerala's fiscal health",
              "കേരളത്തിന്റെ സാമ്പത്തിക ആരോഗ്യം",
            )}
            body={t(
              lang,
              "Vital signs of the State's finances — debt, deficits and committed spending — tracked against the 2026 Status Report baseline.",
              "സംസ്ഥാന ധനസ്ഥിതിയുടെ സൂചകങ്ങൾ — കടം, കമ്മി, ചെലവ് — 2026 തൽസ്ഥിതി റിപ്പോർട്ടിനെ അടിസ്ഥാനമാക്കി.",
            )}
            emoji="₹"
          />
          <ExploreCard
            href="/gov/manifesto"
            title={t(lang, "Promises tracker", "വാഗ്ദാന ട്രാക്കർ")}
            body={goals.length > 0
              ? t(
                lang,
                `${goalsWithAction} of ${goals.length} manifesto commitments have government orders backing them.`,
                `${goals.length}-ൽ ${goalsWithAction} വാഗ്ദാനങ്ങൾക്ക് സർക്കാർ ഉത്തരവുകളുടെ പിന്തുണയുണ്ട്.`,
              )
              : t(
                lang,
                "Manifesto commitments with live GO evidence — committed, in progress, fulfilled.",
                "സർക്കാർ ഉത്തരവുകളുടെ തെളിവോടെ വാഗ്ദാനങ്ങൾ — പ്രതിജ്ഞ, നടന്നുവരുന്നു, നിറവേറ്റി.",
              )}
            emoji="✓"
          />
          <ExploreCard
            href="/gov/orders"
            title={t(lang, "Orders & decisions", "ഉത്തരവുകൾ & തീരുമാനങ്ങൾ")}
            body={t(
              lang,
              "Government Orders auto-ingested daily — what the government is actually deciding, each with its source PDF.",
              "ദിവസവും ശേഖരിക്കുന്ന സർക്കാർ ഉത്തരവുകൾ — ഓരോന്നിനും ഉറവിട പിഡിഎഫ് സഹിതം.",
            )}
            emoji="📜"
          />
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
    <a href={href} class="surface-link flex flex-col gap-1 p-4">
      <span class="text-2xl font-bold tabular-nums text-base-content font-display">
        {value}
      </span>
      <span class="text-xs text-base-content/60 leading-tight">{label}</span>
    </a>
  );
}

function ExploreCard(
  { href, title, body, emoji }: {
    href: string;
    title: string;
    body: string;
    emoji: string;
  },
) {
  return (
    <a href={href} class="surface-link card">
      <div class="card-body p-5 gap-2">
        <div class="flex items-center gap-2">
          <span
            class="inline-flex items-center justify-center w-9 h-9 rounded-field bg-primary/10 text-primary text-lg font-bold"
            aria-hidden="true"
          >
            {emoji}
          </span>
          <h3 class="card-title text-base">{title}</h3>
        </div>
        <p class="text-sm text-base-content/70 leading-relaxed">{body}</p>
      </div>
    </a>
  );
}
