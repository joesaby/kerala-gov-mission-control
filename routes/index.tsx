import { define } from "../utils.ts";
import { HEADLINE_KPIS } from "../data/kpis.ts";
import { KpiCard } from "../components/KpiCard.tsx";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { StatusBadge } from "../components/StatusBadge.tsx";
import type { KpiStatus } from "../data/types.ts";

const STATUS_ORDER: KpiStatus[] = [
  "off-track",
  "slipping",
  "improving",
  "on-track",
];

export default define.page(function Home({ state }) {
  const lang = state.lang;
  const counts = HEADLINE_KPIS.reduce<Record<KpiStatus, number>>(
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

  return (
    <>
      <Header lang={lang} />
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
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

        <section
          aria-label="Headline indicators"
          class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {HEADLINE_KPIS.map((kpi) => (
            <KpiCard key={kpi.id} kpi={kpi} lang={lang} />
          ))}
        </section>

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
            href="/promises"
            class="card bg-base-100 border border-base-300 hover:border-primary hover:shadow-md transition"
          >
            <div class="card-body p-5">
              <h3 class="card-title text-base">Promises tracker</h3>
              <p class="text-sm text-base-content/70">
                Manifesto + budget commitments with public status — committed,
                started, on-track, slipping, completed, abandoned.
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
