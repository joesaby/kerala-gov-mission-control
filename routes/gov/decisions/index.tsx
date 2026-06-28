import { page } from "fresh";
import { define } from "../../../utils.ts";
import { t } from "../../../data/lang.ts";
import { deptOptions, loadGovDocumentLanes } from "../../../lib/gov-records.ts";
import { Header } from "../../../components/Header.tsx";
import { Footer } from "../../../components/Footer.tsx";
import { GovSubnav } from "../../../components/GovSubnav.tsx";
import OrdersBrowser from "../../../islands/OrdersBrowser.tsx";

export const handler = define.handlers({
  async GET() {
    const { cabinet, depts } = await loadGovDocumentLanes();
    return page({ cabinet, depts });
  },
});

export default define.page<typeof handler>(function GovDecisionsPage(
  { data, state },
) {
  const lang = state.lang;
  const { cabinet, depts } = data;

  return (
    <>
      <Header lang={lang} path={state.path} />
      <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <p class="text-xs">
          <a href="/gov" class="link link-hover text-base-content/60">
            ← {t(lang, "Government", "സർക്കാർ")}
          </a>
        </p>
        <h1
          class={`font-display text-3xl md:text-4xl font-bold mt-2 ${
            lang === "ml" ? "ml" : ""
          }`}
        >
          {t(lang, "Cabinet Decisions", "മന്ത്രിസഭാ തീരുമാനങ്ങൾ")}
        </h1>
        <p class="text-base-content/70 mt-2 max-w-2xl">
          {t(
            lang,
            "Decisions taken at the weekly Council of Ministers.",
            "ആഴ്ചതോറുമുള്ള മന്ത്രിസഭാ യോഗത്തിലെ തീരുമാനങ്ങൾ.",
          )}
        </p>

        <GovSubnav lang={lang} path={state.path} />

        {cabinet.length > 0
          ? (
            <OrdersBrowser
              orders={cabinet}
              depts={deptOptions(depts)}
              lang={lang}
              hideTypeFilter
              unit={{ en: "decisions", ml: "തീരുമാനങ്ങൾ" }}
            />
          )
          : (
            <div class="text-center py-12 px-4 rounded-box border border-dashed border-base-300 bg-base-100/50">
              <p class="text-sm text-base-content/50">
                {t(
                  lang,
                  "No cabinet decisions recorded yet — we check every day.",
                  "ഇതുവരെ മന്ത്രിസഭാ തീരുമാനങ്ങളൊന്നും ഇല്ല — ഞങ്ങൾ ദിവസവും പരിശോധിക്കുന്നു.",
                )}
              </p>
            </div>
          )}
      </main>
      <Footer lang={lang} />
    </>
  );
});
