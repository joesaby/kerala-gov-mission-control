import { define } from "../utils.ts";
import { t } from "../data/lang.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { PookalamMark } from "../components/PookalamMark.tsx";

export default define.page(function NotFound({ state }) {
  const lang = state.lang;
  return (
    <>
      <Header lang={lang} path={state.path} />
      <main class="max-w-3xl mx-auto px-4 py-20 text-center">
        <PookalamMark size={56} class="mx-auto mb-5" />
        <p class="eyebrow">404</p>
        <h1
          class={`font-display text-3xl font-bold mt-2 ${
            lang === "ml" ? "ml" : ""
          }`}
        >
          {t(lang, "Not built yet", "ഇതുവരെ തയ്യാറായിട്ടില്ല")}
        </h1>
        <p class={`mt-3 text-base-content/70 ${lang === "ml" ? "ml" : ""}`}>
          {lang === "ml"
            ? (
              <>
                ഈ പേജ് ഞങ്ങളുടെ പട്ടികയിലുണ്ട്. ഇപ്പോൾ ലഭ്യമായവ കാണാൻ{" "}
                <a href="/" class="link link-primary">ഇന്നത്തെ കേരളം</a> സന്ദർശിക്കൂ.
              </>
            )
            : (
              <>
                This dashboard is on the roadmap. Head back to{" "}
                <a href="/" class="link link-primary">Kerala Today</a>{" "}
                for what's live now.
              </>
            )}
        </p>
      </main>
      <Footer lang={lang} />
    </>
  );
});
