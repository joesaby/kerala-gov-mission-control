import { page } from "fresh";
import { define } from "../../../utils.ts";
import { t } from "../../../data/lang.ts";
import { listDepartments, listGovernmentOrders } from "../../../data/db.ts";
import { Header } from "../../../components/Header.tsx";
import { Footer } from "../../../components/Footer.tsx";
import { GovernmentOrderList } from "../../../components/GovernmentOrderList.tsx";
import type { Department, GovernmentOrder } from "../../../data/types.ts";

interface Data {
  cabinet: GovernmentOrder[];
  orders: GovernmentOrder[];
  depts: Department[];
}

export const handler = define.handlers<Data>({
  async GET() {
    const [all, depts] = await Promise.all([
      listGovernmentOrders(), // already newest-first
      listDepartments(),
    ]);
    const cabinet = all.filter((o) => o.type === "Cabinet");
    const orders = all.filter((o) => o.type !== "Cabinet");
    return page({ cabinet, orders, depts });
  },
});

export default define.page<typeof handler>(function OrdersPage(
  { data, state },
) {
  const lang = state.lang;
  const { cabinet, orders, depts } = data;
  const total = cabinet.length + orders.length;

  return (
    <>
      <Header lang={lang} path={state.path} />
      <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* ── Hero ── */}
        <section class="hero-band rounded-box border border-base-300 p-6 md:p-8 mb-8">
          <p class="eyebrow">
            <a href="/gov" class="hover:text-primary transition">
              {t(lang, "Government", "സർക്കാർ")}
            </a>
          </p>
          <h1
            class={`font-display text-3xl md:text-4xl font-bold mt-1 ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {lang === "ml"
              ? "സർക്കാർ ഉത്തരവുകളും മന്ത്രിസഭാ തീരുമാനങ്ങളും"
              : "Government Orders & Cabinet Decisions"}
          </h1>
          <p
            class={`text-base-content/70 mt-2 max-w-2xl leading-relaxed ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {lang === "ml"
              ? "ഔദ്യോഗിക സർക്കാർ ഉത്തരവുകളും മന്ത്രിസഭാ തീരുമാനങ്ങളും — ഓരോന്നും അതിന്റെ ഉറവിട രേഖയിലേക്ക് ലിങ്ക് ചെയ്തിരിക്കുന്നു."
              : "Official government orders and cabinet decisions — each linked to its source document, in English and Malayalam."}
          </p>
          <p class="mt-4 text-xs text-base-content/50">
            <span class="tabular-nums font-semibold text-base-content">
              {total}
            </span>{" "}
            {t(lang, "records ingested · ", "രേഖകൾ · ")}
            <a href="/gov/ingest-status" class="link link-hover text-primary">
              {t(lang, "pipeline status", "പൈപ്പ്‌ലൈൻ നില")}
            </a>
          </p>
        </section>

        {/* ── Cabinet decisions (featured; usually few) ── */}
        <section class="mb-10">
          <h2 class="font-display text-xl font-semibold mb-1">
            {t(lang, "Cabinet decisions", "മന്ത്രിസഭാ തീരുമാനങ്ങൾ")}
            <span class="ml-2 text-sm font-normal text-base-content/40 tabular-nums">
              {cabinet.length}
            </span>
          </h2>
          <p class="text-sm text-base-content/60 mb-4">
            {t(
              lang,
              "Decisions taken at the weekly Council of Ministers.",
              "ആഴ്ചതോറുമുള്ള മന്ത്രിസഭാ യോഗത്തിലെ തീരുമാനങ്ങൾ.",
            )}
          </p>
          {cabinet.length > 0
            ? <GovernmentOrderList orders={cabinet} depts={depts} lang={lang} />
            : (
              <div class="text-center py-8 px-4 rounded-box border border-dashed border-base-300 bg-base-100/50">
                <p class="text-sm text-base-content/50">
                  {t(
                    lang,
                    "No cabinet decisions recorded yet — we check every day.",
                    "ഇതുവരെ മന്ത്രിസഭാ തീരുമാനങ്ങളൊന്നും ഇല്ല — ഞങ്ങൾ ദിവസവും പരിശോധിക്കുന്നു.",
                  )}
                </p>
              </div>
            )}
        </section>

        {/* ── All other government orders ── */}
        <section>
          <h2 class="font-display text-xl font-semibold mb-4">
            {t(lang, "Government orders", "സർക്കാർ ഉത്തരവുകൾ")}
            <span class="ml-2 text-sm font-normal text-base-content/40 tabular-nums">
              {orders.length}
            </span>
          </h2>
          <GovernmentOrderList orders={orders} depts={depts} lang={lang} />
        </section>
      </main>
      <Footer lang={lang} />
    </>
  );
});
