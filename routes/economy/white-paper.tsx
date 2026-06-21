import { page } from "fresh";
import { define } from "../../utils.ts";
import { convertTextInrToUsd, t } from "../../data/lang.ts";
import type { Lang } from "../../data/lang.ts";
import { listBudgets, listStatusPapers } from "../../data/db.ts";
import { getUsdInrRate } from "../../lib/fx.ts";
import { Header } from "../../components/Header.tsx";
import { Footer } from "../../components/Footer.tsx";
import { EconomyShell } from "../../components/EconomyShell.tsx";
import { MetricChart } from "../../components/MetricChart.tsx";
import type {
  AdoptionStatus,
  Budget,
  FiscalSeverity,
  StatusPaper,
} from "../../data/types.ts";

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

const SEV: Record<FiscalSeverity, { text: string; dot: string }> = {
  critical: { text: "text-error", dot: "bg-error" },
  warning: { text: "text-warning", dot: "bg-warning" },
  ok: { text: "text-success", dot: "bg-success" },
};

export default define.page<typeof handler>(function WhitePaperPage(
  { data, state },
) {
  const lang = state.lang;
  const { paper, budgets, usdRate = 83.5 } = data;

  if (!paper) {
    return (
      <>
        <Header lang={lang} path={state.path} />
        <EconomyShell lang={lang} path={state.path} budgets={budgets}>
          <p class="text-base-content/60 py-20 text-center">
            {t(lang, "No status report available yet.", "റിപ്പോർട്ട് ലഭ്യമല്ല.")}
          </p>
        </EconomyShell>
        <Footer lang={lang} />
      </>
    );
  }

  const immediate = paper.levers.filter((l) => l.horizon === "immediate");
  const structural = paper.levers.filter((l) => l.horizon === "structural");

  return (
    <>
      <Header lang={lang} path={state.path} />
      <EconomyShell lang={lang} path={state.path} budgets={budgets}>
        {/* Hero */}
        <section>
          <p class="eyebrow mb-2">
            {t(lang, "Economy · White Paper", "സമ്പദ്‌വ്യവസ്ഥ · ധവളപത്രം")}
          </p>
          <h1
            class={`font-display text-2xl md:text-3xl font-bold leading-tight ${
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
        </section>

        {/* Diagnosis */}
        <section id="diagnosis" class="mt-10 scroll-mt-20">
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
                    aria-label={convertTextInrToUsd(
                      pick(lang, f.heading, f.headingMl),
                      lang,
                      usdRate,
                    )}
                  />
                  <div class="collapse-title flex items-center gap-3 pr-10">
                    <span class={`status-dot ${sev.dot} shrink-0`}></span>
                    <span class="font-semibold leading-tight grow">
                      {convertTextInrToUsd(
                        pick(lang, f.heading, f.headingMl),
                        lang,
                        usdRate,
                      )}
                    </span>
                    {f.stat && (
                      <span
                        class={`metric-value !text-lg tabular-nums shrink-0 ${sev.text}`}
                      >
                        {convertTextInrToUsd(f.stat, lang, usdRate)}
                      </span>
                    )}
                  </div>
                  <div class="collapse-content">
                    <div class="md:flex md:items-start md:gap-5">
                      <div class="md:flex-1">
                        <p class="leading-relaxed text-base-content/85">
                          {convertTextInrToUsd(
                            pick(lang, f.detail, f.detailMl),
                            lang,
                            usdRate,
                          )}
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
                            usdRate={usdRate}
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

        {/* Way forward */}
        <section id="way-forward" class="mt-10 scroll-mt-20">
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
                          {convertTextInrToUsd(
                            pick(lang, l.heading, l.headingMl),
                            lang,
                            usdRate,
                          )}
                        </h3>
                        <span class={`badge badge-sm ${grp.badge} shrink-0`}>
                          {t(lang, grp.en, grp.ml)}
                        </span>
                      </div>
                      <p class="mt-2 text-sm leading-relaxed text-base-content/80">
                        {convertTextInrToUsd(
                          pick(lang, l.detail, l.detailMl),
                          lang,
                          usdRate,
                        )}
                      </p>
                      <div class="mt-3 flex items-center gap-1.5 text-[11px] font-medium">
                        <span class={`status-dot ${ADOPTION[l.adoption].dot}`}>
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

        {/* Sources */}
        <section id="sources" class="mt-10 scroll-mt-20">
          <h2 class="font-display text-xl md:text-2xl font-bold">
            {t(lang, "Source documents", "സ്രോത രേഖകൾ")}
          </h2>
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
          {paper.dataStatus !== "verified" && (
            <p class="mt-3 text-xs text-warning">
              {t(
                lang,
                "Malayalam translation of the long-form text is pending verification against the official Malayalam edition.",
                "ദീർഘ വിവരണത്തിന്റെ മലയാള പരിഭാഷ ഔദ്യോഗിക പതിപ്പിനെതിരെ പരിശോധിക്കാനുണ്ട്.",
              )}
            </p>
          )}
        </section>
      </EconomyShell>
      <Footer lang={lang} />
    </>
  );
});
