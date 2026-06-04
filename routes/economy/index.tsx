import { page } from "fresh";
import { define } from "../../utils.ts";
import { t } from "../../data/lang.ts";
import type { Lang } from "../../data/lang.ts";
import { listStatusPapers } from "../../data/db.ts";
import { Header } from "../../components/Header.tsx";
import { Footer } from "../../components/Footer.tsx";
import { MetricChart } from "../../components/MetricChart.tsx";
import type {
  AdoptionStatus,
  FiscalSeverity,
  FiscalVital,
  StatusPaper,
} from "../../data/types.ts";

interface Data {
  paper: StatusPaper | null;
}

export const handler = define.handlers<Data>({
  async GET() {
    const papers = await listStatusPapers();
    return page({ paper: papers[0] ?? null });
  },
});

/** Pick the Malayalam field when present and the lang is ml, else English. */
function pick(lang: Lang, en: string, ml?: string): string {
  return lang === "ml" && ml ? ml : en;
}

/** Adoption status → label + colour. Recommendations are advisory, so the
 * default is "not yet acted on"; bumped as Government Orders evidence action. */
const ADOPTION: Record<
  AdoptionStatus,
  { en: string; ml: string; dot: string; text: string }
> = {
  "not-started": {
    en: "Not yet acted on",
    ml: "ഇതുവരെ നടപടിയില്ല",
    dot: "bg-base-300",
    text: "text-base-content/50",
  },
  "acknowledged": {
    en: "Acknowledged",
    ml: "അംഗീകരിച്ചു",
    dot: "bg-info",
    text: "text-info",
  },
  "go-issued": {
    en: "Order issued",
    ml: "ഉത്തരവ് ഇറങ്ങി",
    dot: "bg-warning",
    text: "text-warning",
  },
  "implemented": {
    en: "Implemented",
    ml: "നടപ്പാക്കി",
    dot: "bg-success",
    text: "text-success",
  },
};

const SEV: Record<
  FiscalSeverity,
  {
    ring: string;
    text: string;
    badge: string;
    dot: string;
    en: string;
    ml: string;
  }
> = {
  critical: {
    ring: "text-error",
    text: "text-error",
    badge: "badge-error",
    dot: "bg-error",
    en: "Critical",
    ml: "ഗുരുതരം",
  },
  warning: {
    ring: "text-warning",
    text: "text-warning",
    badge: "badge-warning",
    dot: "bg-warning",
    en: "Watch",
    ml: "ശ്രദ്ധ വേണം",
  },
  ok: {
    ring: "text-success",
    text: "text-success",
    badge: "badge-success",
    dot: "bg-success",
    en: "Healthy",
    ml: "ആരോഗ്യകരം",
  },
};

function fmtDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/** Baseline → latest delta, or null while we're still at the baseline. */
function delta(
  v: FiscalVital,
): { txt: string; cls: string; improved: boolean } | null {
  if (v.latest === undefined) return null;
  const diff = Math.round((v.latest - v.baseline) * 10) / 10;
  if (diff === 0) {
    return { txt: "no change", cls: "text-base-content/60", improved: false };
  }
  const improved = v.direction === "lower-better" ? diff < 0 : diff > 0;
  const arrow = diff > 0 ? "▲" : "▼";
  return {
    txt: `${arrow} ${Math.abs(diff)} pp`,
    cls: improved ? "text-success" : "text-error",
    improved,
  };
}

function VitalGauge({ v, lang }: { v: FiscalVital; lang: Lang }) {
  const sev = SEV[v.status];
  const d = delta(v);
  // radial-progress expects 0–100; clamp so tiny/large values still render.
  const gauge = Math.max(0, Math.min(100, v.baseline));
  return (
    <div class="surface-card kasavu-top p-5 flex flex-col items-center text-center">
      <div
        class={`radial-progress ${sev.ring}`}
        style={`--value:${gauge}; --size:6.5rem; --thickness:0.55rem;`}
        role="progressbar"
        aria-valuenow={v.baseline}
        aria-label={pick(lang, v.label, v.labelMl)}
      >
        <span class={`metric-value !text-2xl ${sev.text}`}>
          {v.baselineDisplay}
        </span>
      </div>
      <p
        class={`mt-3 font-semibold leading-tight ${lang === "ml" ? "ml" : ""}`}
      >
        {pick(lang, v.label, v.labelMl)}
      </p>
      <p class={`text-xs text-base-content/60 ${lang === "ml" ? "ml" : ""}`}>
        {pick(lang, v.unit, v.unitMl)} · {v.period}
      </p>
      {d
        ? (
          <p class={`mt-1 text-xs font-semibold tabular-nums ${d.cls}`}>
            {d.txt} → {v.latestDisplay}{" "}
            <span class="text-base-content/50 font-normal">
              ({v.latestPeriod})
            </span>
          </p>
        )
        : (
          <span class="mt-1 badge badge-ghost badge-xs">
            {t(lang, "baseline", "അടിസ്ഥാനം")}
          </span>
        )}
      {v.note && (
        <p class="mt-2 text-[11px] leading-snug text-base-content/55">
          {v.note}
        </p>
      )}
    </div>
  );
}

export default define.page<typeof handler>(
  function EconomyPage({ data, state }) {
    const lang = state.lang;
    const { paper } = data;

    if (!paper) {
      return (
        <>
          <Header lang={lang} path={state.path} />
          <main class="max-w-3xl mx-auto px-4 py-20 text-center">
            <p class="text-base-content/60">
              {t(lang, "No status report available yet.", "റിപ്പോർട്ട് ലഭ്യമല്ല.")}
            </p>
          </main>
          <Footer lang={lang} />
        </>
      );
    }

    const committed =
      paper.vitals.find((v) => v.key === "committed-exp")?.baseline ?? 0;
    const interest = paper.vitals.find((v) => v.key === "interest")?.baseline ??
      0;
    const salaryPension = Math.max(
      0,
      Math.round((committed - interest) * 10) / 10,
    );
    const free = Math.max(0, Math.round((100 - committed) * 10) / 10);

    const immediate = paper.levers.filter((l) => l.horizon === "immediate");
    const structural = paper.levers.filter((l) => l.horizon === "structural");

    return (
      <>
        <Header lang={lang} path={state.path} />

        {/* ── Hero ── */}
        <section class="hero-band border-b border-base-300">
          <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            <p class="eyebrow mb-2">
              {t(lang, "Economy · State finances", "സമ്പദ്‌വ്യവസ്ഥ · സംസ്ഥാന ധനകാര്യം")}
            </p>
            <h1
              class={`font-display text-2xl md:text-4xl font-bold leading-tight ${
                lang === "ml" ? "ml" : ""
              }`}
            >
              {pick(lang, paper.title, paper.titleMl)}
            </h1>
            <p class="mt-2 text-base-content/70 max-w-2xl">
              {pick(lang, paper.subtitle, paper.subtitleMl)}
            </p>
            <p class="mt-3 text-sm text-base-content/55 tabular-nums">
              {t(lang, "Tabled", "സമർപ്പിച്ചത്")} {fmtDate(paper.tabledOn, lang)}
              <span class="mx-2 text-base-content/30">·</span>
              {paper.meta.publishedBy}
            </p>
            <p class="mt-5 leading-relaxed text-base-content/85 max-w-3xl">
              {pick(lang, paper.summary, paper.summaryMl)}
            </p>

            {/* In-page nav, styled as tabs (pure-CSS anchor links). */}
            <nav class="mt-6 tabs tabs-boxed bg-base-100/70 w-fit">
              <a href="#vitals" class="tab">
                {t(lang, "Vital signs", "സൂചകങ്ങൾ")}
              </a>
              <a href="#diagnosis" class="tab">
                {t(lang, "Diagnosis", "രോഗനിർണയം")}
              </a>
              <a href="#way-forward" class="tab">
                {t(lang, "Way forward", "മുന്നോട്ടുള്ള വഴി")}
              </a>
              <a href="#sources" class="tab">
                {t(lang, "Sources", "സ്രോതസ്സുകൾ")}
              </a>
            </nav>
          </div>
        </section>

        <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-12">
          {/* ── Vital signs ── */}
          <section id="vitals" class="scroll-mt-20">
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

            {/* Where each ₹100 of revenue goes */}
            <div class="mt-6 surface-card p-5">
              <p class="eyebrow mb-3">
                {t(
                  lang,
                  "Where each ₹100 of revenue goes",
                  "ഓരോ ₹100 വരുമാനവും എങ്ങോട്ട്",
                )}
              </p>
              <div class="flex h-9 w-full overflow-hidden rounded-field text-[11px] font-semibold text-white">
                <div
                  class="bg-error flex items-center justify-center"
                  style={`width:${salaryPension}%`}
                  title="Salaries & pensions"
                >
                  ₹{Math.round(salaryPension)}
                </div>
                <div
                  class="bg-warning flex items-center justify-center"
                  style={`width:${interest}%`}
                  title="Interest"
                >
                  ₹{Math.round(interest)}
                </div>
                <div
                  class="bg-success flex items-center justify-center"
                  style={`width:${free}%`}
                  title="Left for everything else"
                >
                  ₹{Math.round(free)}
                </div>
              </div>
              <div class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-base-content/70">
                <span class="flex items-center gap-1.5">
                  <span class="status-dot bg-error"></span>
                  {t(lang, "Salaries & pensions", "ശമ്പളവും പെൻഷനും")}{" "}
                  · ₹{Math.round(salaryPension)}
                </span>
                <span class="flex items-center gap-1.5">
                  <span class="status-dot bg-warning"></span>
                  {t(lang, "Interest on debt", "കടത്തിന്റെ പലിശ")}{" "}
                  · ₹{Math.round(interest)}
                </span>
                <span class="flex items-center gap-1.5">
                  <span class="status-dot bg-success"></span>
                  {t(lang, "Left for everything else", "ബാക്കിയെല്ലാത്തിനും")}{" "}
                  · ₹{Math.round(free)}
                </span>
              </div>
            </div>

            {/* Baseline-as-scorecard explainer */}
            <div class="mt-4 alert bg-base-200 border border-base-300 text-sm">
              <span aria-hidden="true">🧭</span>
              <span>
                {t(
                  lang,
                  "These are the baseline. When the next budget is presented, each vital sign will be tracked against this report — so we can measure progress, not just promises.",
                  "ഇത് അടിസ്ഥാന നിലയാണ്. അടുത്ത ബജറ്റ് അവതരിപ്പിക്കുമ്പോൾ ഓരോ സൂചകവും ഈ റിപ്പോർട്ടിനെതിരെ വിലയിരുത്തും.",
                )}
              </span>
            </div>
          </section>

          {/* ── Diagnosis ── */}
          <section id="diagnosis" class="scroll-mt-20">
            <h2 class="font-display text-xl md:text-2xl font-bold">
              {t(lang, "The diagnosis", "രോഗനിർണയം")}
            </h2>
            <p class="mt-1 text-sm text-base-content/60 max-w-2xl">
              {t(
                lang,
                "The report's key findings on how Kerala's finances reached this point.",
                "കേരളത്തിന്റെ ധനസ്ഥിതി ഇവിടെ എത്തിയത് എങ്ങനെ എന്നതിലെ പ്രധാന കണ്ടെത്തലുകൾ.",
              )}
            </p>

            <div class="mt-4 space-y-3">
              {paper.findings.map((f) => {
                const sev = SEV[f.severity];
                return (
                  <div key={f.key} class="collapse collapse-arrow surface-card">
                    <input
                      type="checkbox"
                      aria-label={pick(lang, f.heading, f.headingMl)}
                    />
                    <div class="collapse-title flex items-center gap-3 pr-10">
                      <span class={`status-dot ${sev.dot} shrink-0`}></span>
                      <span class="font-semibold leading-tight grow">
                        {pick(lang, f.heading, f.headingMl)}
                      </span>
                      {f.stat && (
                        <span
                          class={`metric-value !text-lg tabular-nums shrink-0 ${sev.text}`}
                        >
                          {f.stat}
                        </span>
                      )}
                    </div>
                    <div class="collapse-content">
                      <div class="md:flex md:items-start md:gap-5">
                        <div class="md:flex-1">
                          <p class="leading-relaxed text-base-content/85">
                            {pick(lang, f.detail, f.detailMl)}
                          </p>
                          <p class="mt-2 text-[11px] text-base-content/45">
                            {t(lang, "Report chapter", "അധ്യായം")} {f.chapter}
                          </p>
                        </div>
                        {f.chart && (
                          <div class="mt-3 md:mt-0 md:w-72 shrink-0">
                            <MetricChart
                              chart={f.chart}
                              severity={f.severity}
                              lang={lang}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Way forward ── */}
          <section id="way-forward" class="scroll-mt-20">
            <h2 class="font-display text-xl md:text-2xl font-bold">
              {t(lang, "The way forward", "മുന്നോട്ടുള്ള വഴി")}
            </h2>
            <p class="mt-1 text-sm text-base-content/60 max-w-2xl">
              {t(
                lang,
                "How Kerala can come out of this — the report's own prescription. Belt-tightening has limits; the durable fix is growth.",
                "കേരളത്തിന് ഇതിൽനിന്ന് എങ്ങനെ കരകയറാം എന്നതിന് റിപ്പോർട്ടിന്റെ നിർദേശങ്ങൾ.",
              )}
            </p>
            <p class="mt-1 text-xs text-base-content/45 max-w-2xl">
              {t(
                lang,
                "These are advisory recommendations, not the government's manifesto promises. We track each one's adoption as Government Orders give evidence of action.",
                "ഇവ ഉപദേശക നിർദേശങ്ങളാണ്, സർക്കാരിന്റെ വാഗ്ദാനങ്ങളല്ല. സർക്കാർ ഉത്തരവുകൾ വരുന്നതിനനുസരിച്ച് ഓരോന്നിന്റെയും നടപടി ട്രാക്ക് ചെയ്യുന്നു.",
              )}
            </p>

            {[
              {
                key: "now",
                items: immediate,
                en: "Do now",
                ml: "ഉടൻ ചെയ്യേണ്ടത്",
                badge: "badge-error",
              },
              {
                key: "reform",
                items: structural,
                en: "Structural reform",
                ml: "ഘടനാപരമായ പരിഷ്കാരം",
                badge: "badge-primary",
              },
            ].map((grp) =>
              grp.items.length > 0 && (
                <div key={grp.key} class="mt-5">
                  <p class="eyebrow mb-3">{t(lang, grp.en, grp.ml)}</p>
                  <div class="grid gap-3 md:grid-cols-2">
                    {grp.items.map((l) => (
                      <div key={l.key} class="surface-card p-5">
                        <div class="flex items-start justify-between gap-2">
                          <h3 class="font-semibold leading-tight">
                            {pick(lang, l.heading, l.headingMl)}
                          </h3>
                          <span class={`badge badge-sm ${grp.badge} shrink-0`}>
                            {t(lang, grp.en, grp.ml)}
                          </span>
                        </div>
                        <p class="mt-2 text-sm leading-relaxed text-base-content/80">
                          {pick(lang, l.detail, l.detailMl)}
                        </p>
                        <div class="mt-3 flex items-center gap-1.5 text-[11px] font-medium">
                          <span
                            class={`status-dot ${ADOPTION[l.adoption].dot}`}
                          >
                          </span>
                          <span class={ADOPTION[l.adoption].text}>
                            {t(
                              lang,
                              ADOPTION[l.adoption].en,
                              ADOPTION[l.adoption].ml,
                            )}
                          </span>
                          {l.goIds && l.goIds.length > 0 && (
                            <a
                              href={`/gov/orders/${l.goIds[0]}`}
                              class="link link-primary ml-1"
                            >
                              {t(lang, "evidence ↗", "തെളിവ് ↗")}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </section>

          {/* ── Sources ── */}
          <section id="sources" class="scroll-mt-20">
            <h2 class="font-display text-xl md:text-2xl font-bold">
              {t(lang, "Source documents", "സ്രോത രേഖകൾ")}
            </h2>
            <p class="mt-1 text-sm text-base-content/60 max-w-2xl">
              {t(
                lang,
                "Every figure on this page is drawn from the official report. Read the originals:",
                "ഈ പേജിലെ ഓരോ കണക്കും ഔദ്യോഗിക റിപ്പോർട്ടിൽ നിന്നുള്ളതാണ്:",
              )}
            </p>

            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              {paper.sources.map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="surface-link p-4 flex items-center gap-3"
                >
                  <span class="text-2xl" aria-hidden="true">📄</span>
                  <span class="grow">
                    <span class="block font-semibold">
                      {pick(lang, s.label, s.labelMl)}
                    </span>
                    <span class="block text-xs text-base-content/55 break-all">
                      {s.url.split("/").pop()}
                    </span>
                  </span>
                  <span class="text-primary shrink-0">↗</span>
                </a>
              ))}
            </div>

            {/* Provenance */}
            <dl class="mt-5 surface-card p-5 grid sm:grid-cols-[10rem_1fr] gap-x-4 gap-y-2 text-sm">
              <dt class="text-base-content/55">
                {t(lang, "Published by", "പ്രസിദ്ധീകരിച്ചത്")}
              </dt>
              <dd>{paper.meta.publishedBy}</dd>
              <dt class="text-base-content/55">
                {t(lang, "Portal", "പോർട്ടൽ")}
              </dt>
              <dd>{paper.meta.source}</dd>
              <dt class="text-base-content/55">
                {t(lang, "Compiled", "സമാഹരിച്ചത്")}
              </dt>
              <dd class="tabular-nums">
                {fmtDate(paper.meta.retrievedAt, lang)}
              </dd>
            </dl>

            {paper.dataStatus !== "verified" && (
              <p class="mt-3 text-xs text-warning">
                {t(
                  lang,
                  "Malayalam translation of the long-form text is pending verification against the official Malayalam edition.",
                  "ദീർഘ വിവരണത്തിന്റെ മലയാള പരിഭാഷ ഔദ്യോഗിക പതിപ്പിനെതിരെ പരിശോധിക്കാനുണ്ട്.",
                )}
              </p>
            )}

            {/* Optional inline original (escape hatch, behind a disclosure). */}
            <details class="mt-4">
              <summary class="cursor-pointer text-sm text-primary hover:underline">
                {t(
                  lang,
                  "Preview the English PDF inline",
                  "ഇംഗ്ലീഷ് പിഡിഎഫ് ഇവിടെ കാണുക",
                )}
              </summary>
              <object
                data={paper.sources.find((s) => s.lang === "en")?.url}
                type="application/pdf"
                class="mt-3 w-full rounded-box border border-base-300 bg-base-100"
                style="height: 75vh"
              >
                <p class="p-6 text-sm text-base-content/60">
                  {t(
                    lang,
                    "Use the link above to open the PDF.",
                    "മുകളിലെ ലിങ്ക് ഉപയോഗിക്കുക.",
                  )}
                </p>
              </object>
            </details>
          </section>
        </main>

        <Footer lang={lang} />
      </>
    );
  },
);
