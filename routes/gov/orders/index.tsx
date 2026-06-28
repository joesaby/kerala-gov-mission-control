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
    const { orders, depts } = await loadGovDocumentLanes();
    return page({ orders, depts });
  },
});

export default define.page<typeof handler>(function GovOrdersPage(
  { data, state },
) {
  const lang = state.lang;
  const { orders, depts } = data;

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
          {t(lang, "Government Orders", "സർക്കാർ ഉത്തരവുകൾ")}
        </h1>
        <p class="text-base-content/70 mt-2 max-w-2xl">
          {t(
            lang,
            "Official G.O.s and circulars — each linked to its source PDF.",
            "ഔദ്യോഗിക ജി.ഒ.കളും സർക്കularുകളും — ഓരോന്നും ഉറവിട PDF-ലേക്ക് ബന്ധിപ്പിച്ചിരിക്കുന്നു.",
          )}
        </p>

        <GovSubnav lang={lang} path={state.path} />

        <OrdersBrowser
          orders={orders}
          depts={deptOptions(depts)}
          lang={lang}
        />
      </main>
      <Footer lang={lang} />
    </>
  );
});
