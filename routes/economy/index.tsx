import { page } from "fresh";
import { define } from "../../utils.ts";
import { t } from "../../data/lang.ts";
import { listBudgets, listStatusPapers } from "../../data/db.ts";
import { getUsdInrRate } from "../../lib/fx.ts";
import { Header } from "../../components/Header.tsx";
import { Footer } from "../../components/Footer.tsx";
import { EconomyShell } from "../../components/EconomyShell.tsx";
import { VitalGauge } from "../../components/VitalGauge.tsx";
import { RupeeFlow } from "../../components/RupeeFlow.tsx";
import { TreasuryCalendar } from "../../components/TreasuryCalendar.tsx";
import type { Budget, RupeeSegment, StatusPaper } from "../../data/types.ts";

interface Data {
  paper: StatusPaper | null;
  budgets: Budget[];
  usdRate: number;
}

export const handler = define.handlers<Data>({
  async GET() {
    const [papers, budgets, usdRate] = await Promise.all([
      listStatusPapers(),
      listBudgets(),
      getUsdInrRate(),
    ]);
    return page({ paper: papers[0] ?? null, budgets, usdRate });
  },
});

export default define.page<typeof handler>(function FiscalStatusPage(
  { data, state },
) {
  const lang = state.lang;
  const { paper, budgets, usdRate = 83.5 } = data;
  const latestBudget = budgets[0] ?? null;

  if (!paper) {
    return (
      <>
        <Header lang={lang} path={state.path} />
        <EconomyShell lang={lang} path={state.path} budgets={budgets}>
          <p class="text-base-content/60 py-20 text-center">
            {t(lang, "No fiscal data available yet.", "വിവരങ്ങൾ ലഭ്യമല്ല.")}
          </p>
        </EconomyShell>
        <Footer lang={lang} />
      </>
    );
  }

  // Prefer the explicit per-segment breakdown; else derive the coarse buckets
  // from the committed-expenditure & interest vitals so nothing regresses.
  const committed = paper.vitals.find((v) =>
    v.key === "committed-exp"
  )?.baseline ?? 0;
  const interest = paper.vitals.find((v) => v.key === "interest")?.baseline ??
    0;
  const salaryPension = Math.max(
    0,
    Math.round((committed - interest) * 10) / 10,
  );
  const free = Math.max(0, Math.round((100 - committed) * 10) / 10);
  const rupeeSegments: RupeeSegment[] = paper.revenueRupee ?? [
    {
      key: "salary-pension",
      label: "Salaries & pensions",
      labelMl: "ശമ്പളവും പെൻഷനും",
      paise: salaryPension,
      severity: "critical",
      committed: true,
    },
    {
      key: "interest",
      label: "Interest on debt",
      labelMl: "കടത്തിന്റെ പലിശ",
      paise: interest,
      severity: "critical",
      committed: true,
    },
    {
      key: "rest",
      label: "Left for everything else",
      labelMl: "ബാക്കിയെല്ലാത്തിനും",
      paise: free,
      severity: "warning",
      committed: false,
    },
  ];

  return (
    <>
      <Header lang={lang} path={state.path} />
      <EconomyShell lang={lang} path={state.path} budgets={budgets}>
        {/* Hero */}
        <section>
          <p class="eyebrow mb-2">
            {t(lang, "Economy · State finances", "സമ്പദ്‌വ്യവസ്ഥ · സംസ്ഥാന ധനകാര്യം")}
          </p>
          <h1 class="font-display text-2xl md:text-3xl font-bold leading-tight">
            {t(lang, "Kerala's fiscal status", "കേരളത്തിന്റെ ധനസ്ഥിതി")}
          </h1>
          <p class="mt-2 text-base-content/70 max-w-2xl">
            {t(
              lang,
              "The numbers as they stand — the baseline the next five years are measured against. For how we got here, read the White Paper; for the annual plan, see the budgets.",
              "ഇപ്പോഴത്തെ കണക്കുകൾ — വരും അഞ്ച് വർഷം അളക്കാനുള്ള അടിസ്ഥാനം. എങ്ങനെ ഇവിടെ എത്തി എന്നറിയാൻ ധവളപത്രം; വാർഷിക പദ്ധതിക്ക് ബജറ്റുകൾ കാണുക.",
            )}
          </p>
        </section>

        {/* Vital signs */}
        <section id="vitals" class="mt-8 scroll-mt-20">
          <div class="flex items-baseline justify-between flex-wrap gap-2">
            <h2 class="font-display text-xl md:text-2xl font-bold">
              {t(lang, "Fiscal vital signs", "ധനകാര്യ സൂചകങ്ങൾ")}
            </h2>
            <p class="text-xs text-base-content/55">
              {t(
                lang,
                "Colour shows clinical severity, not direction.",
                "നിറം ഗുരുതരാവസ്ഥ കാണിക്കുന്നു.",
              )}
            </p>
          </div>

          <div class="mt-4 grid gap-4 grid-cols-2 lg:grid-cols-4">
            {paper.vitals.map((v) => (
              <VitalGauge key={v.key} v={v} lang={lang} />
            ))}
          </div>

          {/* Two hero graphics */}
          <div class="mt-6 grid gap-4 lg:grid-cols-2">
            <RupeeFlow segments={rupeeSegments} lang={lang} />
            {paper.treasury && (
              <TreasuryCalendar ty={paper.treasury} lang={lang} />
            )}
          </div>

          <div class="mt-4 alert bg-base-200 border border-base-300 text-sm">
            <span aria-hidden="true">🧭</span>
            <span>
              {t(
                lang,
                `These are the baseline. When a new budget is presented, each vital sign is tracked against this report — so we measure progress, not promises. Currency is shown in ₹ and $ at 1 USD = ₹${
                  usdRate.toFixed(2)
                } on the day of request.`,
                `ഇത് അടിസ്ഥാന നിലയാണ്. പുതിയ ബജറ്റ് വരുമ്പോൾ ഓരോ സൂചകവും ഈ റിപ്പോർട്ടിനെതിരെ വിലയിരുത്തും. മൂല്യങ്ങൾ ₹, $ എന്നിവയിൽ (1 USD = ₹${
                  usdRate.toFixed(2)
                }).`,
              )}
            </span>
          </div>
        </section>

        {/* Explore the section */}
        <section class="mt-10">
          <h2 class="font-display text-xl md:text-2xl font-bold">
            {t(lang, "Go deeper", "കൂടുതൽ അറിയാൻ")}
          </h2>
          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <a href="/economy/white-paper" class="surface-link p-5">
              <p class="eyebrow">{t(lang, "Diagnosis", "രോഗനിർണയം")}</p>
              <p class="mt-1 font-semibold">
                {t(lang, "The White Paper →", "ധവളപത്രം →")}
              </p>
              <p class="mt-1 text-sm text-base-content/65">
                {t(
                  lang,
                  "How Kerala's finances reached this point, and the way forward.",
                  "കേരളത്തിന്റെ ധനസ്ഥിതി ഇവിടെ എത്തിയത് എങ്ങനെ, മുന്നോട്ടുള്ള വഴിയും.",
                )}
              </p>
            </a>
            {latestBudget && (
              <a
                href={`/economy/budget/${latestBudget.id}`}
                class="surface-link p-5"
              >
                <p class="eyebrow">{t(lang, "Annual plan", "വാർഷിക പദ്ധതി")}</p>
                <p class="mt-1 font-semibold">
                  {t(
                    lang,
                    `Budget ${latestBudget.fy} →`,
                    `ബജറ്റ് ${latestBudget.fy} →`,
                  )}
                </p>
                <p class="mt-1 text-sm text-base-content/65">
                  {t(
                    lang,
                    "Where the money comes from and goes — promise vs revised.",
                    "പണം എവിടെ നിന്ന്, എങ്ങോട്ട് — വാഗ്ദാനവും പുതുക്കിയതും.",
                  )}
                </p>
              </a>
            )}
          </div>
        </section>
      </EconomyShell>
      <Footer lang={lang} />
    </>
  );
});
