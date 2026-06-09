import { page } from "fresh";
import { define } from "../utils.ts";
import { t } from "../data/lang.ts";
import { listDepartments, listKpis } from "../data/db.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import ResearchExplorer from "../islands/ResearchExplorer.tsx";
import type { Department, Kpi } from "../data/types.ts";

interface Data {
  kpis: Kpi[];
  departments: Department[];
}

export const handler = define.handlers<Data>({
  async GET() {
    const [kpis, departments] = await Promise.all([
      listKpis(),
      listDepartments(),
    ]);
    return page({ kpis, departments });
  },
});

export default define.page<typeof handler>(
  function ResearchPage({ data, state }) {
    const lang = state.lang;
    const { kpis, departments } = data;

    return (
      <>
        <Header lang={lang} path={state.path} />
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
          {/* Hero Banner */}
          <section class="hero-band rounded-box border border-base-300 p-6 md:p-8 mb-8">
            <p class="eyebrow">{t(lang, "Research Hub", "ഗവേഷണ കേന്ദ്രം")}</p>
            <h1
              class={`font-display text-3xl md:text-4xl font-bold mt-1 ${
                lang === "ml" ? "ml" : ""
              }`}
            >
              {t(lang, "Open Data & Writing Toolkit", "ഡാറ്റ ഗവേഷണവും എഴുത്തുസഹായിയും")}
            </h1>
            <p
              class={`text-base-content/70 mt-2 max-w-3xl leading-relaxed text-sm md:text-base ${
                lang === "ml" ? "ml" : ""
              }`}
            >
              {t(
                lang,
                "Expose state indicators as structured open data. Search, inspect, download timeseries CSV/JSON datasets, and automatically generate narrative blog drafts or formal policy briefings to fuel public writing and accountability.",
                "സംസ്ഥാനത്തിന്റെ വികസന സൂചകങ്ങൾ സുതാര്യമായി അപഗ്രഥിക്കുക. ഓരോ സൂചകത്തിന്റെയും മുഴുവൻ വിവരങ്ങളും പരിശോധിക്കാനും, CSV/JSON ഫയലുകൾ ഡൗൺലോഡ് ചെയ്യാനും, മാധ്യമപ്രവർത്തകർക്കും ഗവേഷകർക്കും പ്രയോജനപ്പെടുന്ന വിധത്തിൽ ബ്ലോഗുകളും നയരേഖകളും സ്വയം നിർമ്മിക്കാനും സാധിക്കും.",
              )}
            </p>
          </section>

          {/* Core Interactive Island */}
          <ResearchExplorer kpis={kpis} departments={departments} lang={lang} />
        </main>
        <Footer lang={lang} />
      </>
    );
  },
);
