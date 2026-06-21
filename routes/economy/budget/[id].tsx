import { HttpError, page } from "fresh";
import { define } from "../../../utils.ts";
import { t } from "../../../data/lang.ts";
import type { Lang } from "../../../data/lang.ts";
import { getBudget, listBudgets } from "../../../data/db.ts";
import { Header } from "../../../components/Header.tsx";
import { Footer } from "../../../components/Footer.tsx";
import { EconomyShell } from "../../../components/EconomyShell.tsx";
import { RupeeFlow } from "../../../components/RupeeFlow.tsx";
import type {
  Budget,
  BudgetVital,
  SectorAllocation,
  WhitePaperVerdict,
} from "../../../data/types.ts";

interface Data {
  budget: Budget;
  vsBudget: Budget | null;
  budgets: Budget[];
}

export const handler = define.handlers<Data>({
  async GET(ctx) {
    const budget = await getBudget(ctx.params.id);
    if (!budget) throw new HttpError(404, "Budget not found");
    const [vsBudget, budgets] = await Promise.all([
      budget.vsBudgetId ? getBudget(budget.vsBudgetId) : Promise.resolve(null),
      listBudgets(),
    ]);
    return page({ budget, vsBudget, budgets });
  },
});

function pick(lang: Lang, en: string, ml?: string): string {
  return lang === "ml" && ml ? ml : en;
}

function fmtDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/** "₹13,326 cr" from a crore number. */
function fmtCr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")} cr`;
}

const GOVT_BADGE: Record<string, string> = {
  LDF: "badge-error",
  UDF: "badge-info",
};

const VERDICT: Record<
  WhitePaperVerdict["verdict"],
  { en: string; ml: string; badge: string; dot: string }
> = {
  acted: {
    en: "Acted on",
    ml: "നടപടിയെടുത്തു",
    badge: "badge-success",
    dot: "bg-success",
  },
  partial: {
    en: "Partly",
    ml: "ഭാഗികമായി",
    badge: "badge-warning",
    dot: "bg-warning",
  },
  "not-addressed": {
    en: "Not addressed",
    ml: "പരിഗണിച്ചില്ല",
    badge: "badge-ghost",
    dot: "bg-base-300",
  },
  worsened: {
    en: "Worsened",
    ml: "വഷളായി",
    badge: "badge-error",
    dot: "bg-error",
  },
};

const VERDICT_ANCHOR: Record<WhitePaperVerdict["refType"], string> = {
  vital: "#vitals",
  finding: "#diagnosis",
  lever: "#way-forward",
};

/** A paired LDF → UDF headline with a delta. */
function CompareRow({ v, lang }: { v: BudgetVital; lang: Lang }) {
  const hasCompare = v.comparedValue !== undefined;
  const diff = hasCompare ? v.value - (v.comparedValue as number) : 0;
  const worse = v.direction === "lower-better" ? diff > 0 : diff < 0;
  const cls = diff === 0
    ? "text-base-content/60"
    : worse
    ? "text-error"
    : "text-success";
  const arrow = diff > 0 ? "▲" : "▼";
  return (
    <div class="surface-card p-4">
      <p class={`text-sm font-semibold ${lang === "ml" ? "ml" : ""}`}>
        {pick(lang, v.label, v.labelMl)}
      </p>
      <div class="mt-2 flex items-center gap-2 flex-wrap tabular-nums">
        {hasCompare && (
          <>
            <span class="text-base-content/55 line-through decoration-base-content/30">
              {v.comparedDisplay}
            </span>
            <span class="text-base-content/40" aria-hidden="true">→</span>
          </>
        )}
        <span class="font-display text-lg font-bold">{v.display}</span>
        {hasCompare && diff !== 0 && (
          <span class={`text-xs font-semibold ${cls}`}>
            {arrow} {fmtCr(Math.abs(diff))}
          </span>
        )}
      </div>
      <p class="mt-1 text-[10px] text-base-content/45">
        {t(lang, "Source", "ഉറവിടം")}: {v.source}
      </p>
    </div>
  );
}

function AllocationBars(
  { allocations, lang }: { allocations: SectorAllocation[]; lang: Lang },
) {
  const max = Math.max(...allocations.map((a) => a.amountCr), 1);
  return (
    <div class="surface-card p-5 space-y-3">
      {allocations.map((a) => (
        <div key={a.key}>
          <div class="flex items-baseline justify-between gap-2 text-sm">
            <span class={lang === "ml" ? "ml" : ""}>
              {pick(lang, a.label, a.labelMl)}
            </span>
            <span class="font-semibold tabular-nums">{fmtCr(a.amountCr)}</span>
          </div>
          <div class="mt-1 h-2 w-full rounded-field bg-base-200 overflow-hidden">
            <div
              class="h-full bg-primary"
              style={`width:${(a.amountCr / max) * 100}%`}
            >
            </div>
          </div>
        </div>
      ))}
      <p class="text-[10px] text-base-content/45">
        {t(
          lang,
          "Selected major heads; figures pending primary-PDF verification.",
          "പ്രധാന ഇനങ്ങൾ; കണക്കുകൾ ഔദ്യോഗിക രേഖയുമായി പരിശോധിക്കാനുണ്ട്.",
        )}
      </p>
    </div>
  );
}

export default define.page<typeof handler>(function BudgetPage(
  { data, state },
) {
  const lang = state.lang;
  const { budget, vsBudget, budgets } = data;

  // Perspective-aware: this budget's own schemes vs the compared budget's.
  const thisSchemes = budget.schemes;
  const otherSchemes = vsBudget?.schemes ?? [];

  // The three-beat arc, with the step matching this budget highlighted.
  const here = budget.variant === "revised" ? "response" : "promise";
  const steps = [
    {
      key: "promise",
      label: t(lang, "Promise", "വാഗ്ദാനം"),
      doc: t(lang, "LDF budget · 29 Jan", "എൽഡിഎഫ് ബജറ്റ് · ജനു 29"),
      note: t(
        lang,
        "Projected central transfers nearly doubling.",
        "കേന്ദ്ര വിഹിതം ഏതാണ്ട് ഇരട്ടിയാകുമെന്ന് കണക്കാക്കി.",
      ),
      href: "/economy/budget/budget.2026-27-ldf",
    },
    {
      key: "reckoning",
      label: t(lang, "Reckoning", "കണക്കെടുപ്പ്"),
      doc: t(lang, "White Paper · 4 Jun", "ധവളപത്രം · ജൂൺ 4"),
      note: t(
        lang,
        "₹20,500 cr shortfall; debt ₹5.07 lakh cr.",
        "₹20,500 കോടി കുറവ്; കടം ₹5.07 ലക്ഷം കോടി.",
      ),
      href: "/economy/white-paper",
    },
    {
      key: "response",
      label: t(lang, "Response", "പ്രതികരണം"),
      doc: t(lang, "UDF revised · 19 Jun", "യുഡിഎഫ് പുതുക്കിയത് · ജൂൺ 19"),
      note: t(
        lang,
        "Plan cut to ₹30,370 cr to match reality.",
        "യാഥാർത്ഥ്യത്തിനൊത്ത് പദ്ധതി ₹30,370 കോടിയായി കുറച്ചു.",
      ),
      href: "/economy/budget/budget.2026-27-udf",
    },
  ];

  return (
    <>
      <Header lang={lang} path={state.path} />
      <EconomyShell lang={lang} path={state.path} budgets={budgets}>
        {/* Hero */}
        <section>
          <p class="eyebrow mb-2">
            {t(lang, "Economy · Budget", "സമ്പദ്‌വ്യവസ്ഥ · ബജറ്റ്")} {budget.fy}
          </p>
          <h1
            class={`font-display text-2xl md:text-3xl font-bold leading-tight ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {pick(lang, budget.title, budget.titleMl)}
          </h1>
          <p class="mt-2 flex items-center gap-2 text-sm text-base-content/60">
            <span
              class={`badge badge-sm ${GOVT_BADGE[budget.government] ?? ""}`}
            >
              {budget.government}
            </span>
            {fmtDate(budget.presentedOn, lang)}
            <span class="text-base-content/30">·</span>
            {budget.presentedBy}
          </p>
          <p class="mt-4 leading-relaxed text-base-content/85 max-w-3xl">
            {pick(lang, budget.summary, budget.summaryMl)}
          </p>
        </section>

        {/* The arc */}
        <section class="mt-10">
          <h2 class="font-display text-lg md:text-xl font-bold">
            {t(lang, "The story in three steps", "മൂന്ന് ഘട്ടങ്ങളിലെ കഥ")}
          </h2>
          <ol class="mt-3 grid gap-3 sm:grid-cols-3">
            {steps.map((s) => (
              <li key={s.key}>
                <a
                  href={s.href}
                  class={`block h-full surface-card p-4 transition-colors ${
                    s.key === here ? "ring-2 ring-primary" : "hover:bg-base-200"
                  }`}
                >
                  <p class="eyebrow">{s.label}</p>
                  <p class="mt-1 font-semibold text-sm">{s.doc}</p>
                  <p class="mt-1 text-xs text-base-content/65 leading-snug">
                    {s.note}
                  </p>
                </a>
              </li>
            ))}
          </ol>
        </section>

        {/* What changed */}
        <section class="mt-10">
          <h2 class="font-display text-lg md:text-xl font-bold">
            {t(lang, "What changed", "എന്ത് മാറി")}
          </h2>
          <p class="mt-1 text-sm text-base-content/60 max-w-2xl">
            {vsBudget
              ? t(
                lang,
                "Headline numbers vs the LDF's original January budget.",
                "എൽഡിഎഫിന്റെ ജനുവരി ബജറ്റുമായുള്ള താരതമ്യം.",
              )
              : t(lang, "Headline numbers.", "പ്രധാന കണക്കുകൾ.")}
          </p>
          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            {budget.headlines.map((v) => (
              <CompareRow key={v.key} v={v} lang={lang} />
            ))}
          </div>
        </section>

        {/* Where ₹100 goes */}
        {budget.rupeeOut && (
          <section class="mt-10">
            <h2 class="font-display text-lg md:text-xl font-bold mb-4">
              {t(lang, "Where the money goes", "പണം എങ്ങോട്ട് പോകുന്നു")}
            </h2>
            <RupeeFlow segments={budget.rupeeOut} lang={lang} />
          </section>
        )}

        {/* Allocations */}
        {budget.allocations.length > 0 && (
          <section class="mt-10">
            <h2 class="font-display text-lg md:text-xl font-bold mb-4">
              {t(lang, "Major allocations", "പ്രധാന വിഹിതങ്ങൾ")}
            </h2>
            <AllocationBars allocations={budget.allocations} lang={lang} />
          </section>
        )}

        {/* Graded against the white paper */}
        {budget.verdicts && budget.verdicts.length > 0 && (
          <section class="mt-10">
            <h2 class="font-display text-lg md:text-xl font-bold">
              {t(
                lang,
                "Graded against the White Paper",
                "ധവളപത്രവുമായി തുലനം ചെയ്യുമ്പോൾ",
              )}
            </h2>
            <p class="mt-1 text-sm text-base-content/60 max-w-2xl">
              {t(
                lang,
                "How far this budget acts on the white paper's diagnosis and recommendations.",
                "ധവളപത്രത്തിന്റെ കണ്ടെത്തലുകളിലും ശുപാർശകളിലും ഈ ബജറ്റ് എത്രമാത്രം നടപടിയെടുത്തു.",
              )}
            </p>
            <div class="mt-4 space-y-3">
              {budget.verdicts.map((vd) => {
                const m = VERDICT[vd.verdict];
                return (
                  <div key={vd.key} class="surface-card p-4">
                    <div class="flex items-start justify-between gap-3">
                      <p class="leading-relaxed text-base-content/85">
                        {pick(lang, vd.note, vd.noteMl)}
                      </p>
                      <span class={`badge badge-sm shrink-0 ${m.badge}`}>
                        {t(lang, m.en, m.ml)}
                      </span>
                    </div>
                    <a
                      href={`/economy/white-paper${VERDICT_ANCHOR[vd.refType]}`}
                      class="mt-2 inline-block text-xs link link-primary"
                    >
                      {t(lang, "see in the White Paper ↗", "ധവളപത്രത്തിൽ കാണുക ↗")}
                    </a>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* What it means for you */}
        <section class="mt-10">
          <h2 class="font-display text-lg md:text-xl font-bold">
            {t(lang, "What it means for you", "നിങ്ങൾക്കിത് എന്താണ്")}
          </h2>

          {[
            {
              key: "this",
              items: thisSchemes,
              en: "New in this budget",
              ml: "ഈ ബജറ്റിൽ പുതിയത്",
            },
            {
              key: "other",
              items: otherSchemes,
              en: `From the ${vsBudget?.government ?? ""} budget`,
              ml: `${vsBudget?.government ?? ""} ബജറ്റിൽ നിന്ന്`,
            },
          ].map((grp) =>
            grp.items.length > 0 && (
              <div key={grp.key} class="mt-4">
                <p class="eyebrow mb-2">{t(lang, grp.en, grp.ml)}</p>
                <div class="grid gap-3 sm:grid-cols-2">
                  {grp.items.map((s) => (
                    <div key={s.key} class="surface-card p-4">
                      <div class="flex items-start justify-between gap-2">
                        <h3 class="font-semibold leading-tight">
                          {pick(lang, s.heading, s.headingMl)}
                        </h3>
                        {s.amount && (
                          <span class="badge badge-sm badge-primary shrink-0">
                            {s.amount}
                          </span>
                        )}
                      </div>
                      <p class="mt-2 text-sm leading-relaxed text-base-content/80">
                        {pick(lang, s.detail, s.detailMl)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {budget.taxes.length > 0 && (
            <div class="mt-5">
              <p class="eyebrow mb-2">
                {t(lang, "Tax & fee changes", "നികുതി മാറ്റങ്ങൾ")}
              </p>
              <div class="grid gap-3 sm:grid-cols-2">
                {budget.taxes.map((tx) => (
                  <div key={tx.key} class="surface-card p-4">
                    <div class="flex items-start justify-between gap-2">
                      <h3 class="font-semibold leading-tight text-sm">
                        {pick(lang, tx.heading, tx.headingMl)}
                      </h3>
                      <span
                        class={`badge badge-sm shrink-0 ${
                          tx.kind === "relief"
                            ? "badge-success"
                            : tx.kind === "hike"
                            ? "badge-error"
                            : "badge-ghost"
                        }`}
                      >
                        {tx.kind === "relief"
                          ? t(lang, "relief", "ഇളവ്")
                          : tx.kind === "hike"
                          ? t(lang, "hike", "വർധന")
                          : t(lang, "settlement", "തീർപ്പ്")}
                      </span>
                    </div>
                    <p class="mt-2 text-sm leading-relaxed text-base-content/80">
                      {pick(lang, tx.detail, tx.detailMl)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Sources */}
        <section class="mt-10">
          <h2 class="font-display text-lg md:text-xl font-bold">
            {t(lang, "Sources", "സ്രോതസ്സുകൾ")}
          </h2>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            {budget.sources.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                class="surface-link p-4 flex items-center gap-3"
              >
                <span class="text-2xl" aria-hidden="true">📄</span>
                <span class="grow font-semibold text-sm">
                  {pick(lang, s.label, s.labelMl)}
                </span>
                <span class="text-primary shrink-0">↗</span>
              </a>
            ))}
          </div>
          {budget.dataStatus !== "verified" && (
            <p class="mt-3 text-xs text-warning">
              {t(
                lang,
                "Figures are from budget-speech coverage; line items are pending reconciliation against the primary budget PDFs.",
                "കണക്കുകൾ ബജറ്റ് വാർത്തകളിൽ നിന്നുള്ളവയാണ്; ഔദ്യോഗിക ബജറ്റ് രേഖകളുമായി പരിശോധിക്കാനുണ്ട്.",
              )}
            </p>
          )}
        </section>
      </EconomyShell>
      <Footer lang={lang} />
    </>
  );
});
