import { page } from "fresh";
import { define } from "../../../utils.ts";
import { t } from "../../../data/lang.ts";
import {
  listAppointments,
  listDepartments,
  listGovernmentOrders,
  listPersons,
} from "../../../data/db.ts";
import { Header } from "../../../components/Header.tsx";
import { Footer } from "../../../components/Footer.tsx";
import OrdersBrowser from "../../../islands/OrdersBrowser.tsx";
import AppointmentsBrowser from "../../../islands/AppointmentsBrowser.tsx";
import type {
  Appointment,
  Department,
  GovernmentOrder,
} from "../../../data/types.ts";

interface Data {
  cabinet: GovernmentOrder[];
  orders: GovernmentOrder[];
  appointments: Appointment[];
  depts: Department[];
  /** Matched `personId` → Person slug, so appointment ★s link to the hub. */
  personSlugById: Record<string, string>;
}

export const handler = define.handlers<Data>({
  async GET() {
    const [all, appointments, depts, persons] = await Promise.all([
      listGovernmentOrders(), // already newest-first
      listAppointments(), // newest-first by termStart
      listDepartments(),
      listPersons(),
    ]);
    const personSlugById = Object.fromEntries(
      persons.map((p) => [p.id, p.slug]),
    );
    // A GO that re-surfaces as a (richer) Appointment record is shown only in
    // the Appointments tab — never duplicated into the order/decision lanes.
    // Keyed on real Appointment records (not the bare `category` flag) so a GO
    // can never vanish from every tab.
    const apptGoIds = new Set(appointments.map((a) => a.goId));
    const cabinet = all.filter((o) =>
      o.type === "Cabinet" && !apptGoIds.has(o.id)
    );
    const orders = all.filter((o) =>
      o.type !== "Cabinet" && !apptGoIds.has(o.id)
    );
    return page({ cabinet, orders, appointments, depts, personSlugById });
  },
});

export default define.page<typeof handler>(function OrdersPage(
  { data, state },
) {
  const lang = state.lang;
  const { cabinet, orders, appointments, depts, personSlugById } = data;
  const total = orders.length + cabinet.length + appointments.length;

  const deptOptions = depts.map((d) => ({
    id: d.id,
    name: d.name,
    nameMl: d.nameMl,
    slug: d.slug,
  }));

  const TABS = [
    { id: "orders", en: "Orders", ml: "ഉത്തരവുകൾ", count: orders.length },
    {
      id: "decisions",
      en: "Decisions",
      ml: "തീരുമാനങ്ങൾ",
      count: cabinet.length,
    },
    {
      id: "appointments",
      en: "Appointments",
      ml: "നിയമനങ്ങൾ",
      count: appointments.length,
    },
  ] as const;

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
              ? "ഉത്തരവുകൾ, തീരുമാനങ്ങൾ & നിയമനങ്ങൾ"
              : "Orders, Decisions & Appointments"}
          </h1>
          <p
            class={`text-base-content/70 mt-2 max-w-2xl leading-relaxed ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {lang === "ml"
              ? "ഔദ്യോഗിക സർക്കാർ ഉത്തരവുകൾ, മന്ത്രിസഭാ തീരുമാനങ്ങൾ, നിയമനങ്ങൾ — ഓരോന്നും അതിന്റെ ഉറവിട രേഖയിലേക്ക് ലിങ്ക് ചെയ്തിരിക്കുന്നു."
              : "Official government orders, cabinet decisions, and appointments — each linked to its source document, in English and Malayalam."}
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

        {
          /* ── Tabbed view: Orders · Decisions · Appointments ──
            CSS-only, hash-driven (see .gov-tabs in static/styles.css), so each
            tab is deep-linkable (#orders / #decisions / #appointments) with no
            client JS. */
        }
        <div class="gov-tabs">
          <div
            role="tablist"
            class="tabs tabs-boxed flex-wrap gap-y-1 w-fit mb-6"
            aria-label={t(lang, "Sections", "വിഭാഗങ്ങൾ")}
          >
            {TABS.map((tab) => (
              <a
                key={tab.id}
                role="tab"
                href={`#${tab.id}`}
                data-tab={tab.id}
                data-default={tab.id === "orders" ? "" : undefined}
                class="tab tab-link h-auto py-2 gap-1.5"
              >
                <span class={lang === "ml" ? "ml" : ""}>
                  {lang === "ml" ? tab.ml : tab.en}
                </span>
                <span class="text-xs opacity-50 tabular-nums">
                  {tab.count}
                </span>
              </a>
            ))}
          </div>

          {/* ── Panel: Orders ── */}
          <section
            id="orders"
            data-default=""
            class="tab-panel"
            role="tabpanel"
            aria-label={t(lang, "Government orders", "സർക്കാർ ഉത്തരവുകൾ")}
          >
            <OrdersBrowser orders={orders} depts={deptOptions} lang={lang} />
          </section>

          {/* ── Panel: Cabinet decisions ── */}
          <section
            id="decisions"
            class="tab-panel"
            role="tabpanel"
            aria-label={t(lang, "Cabinet decisions", "മന്ത്രിസഭാ തീരുമാനങ്ങൾ")}
          >
            <p class="text-sm text-base-content/60 mb-4">
              {t(
                lang,
                "Decisions taken at the weekly Council of Ministers.",
                "ആഴ്ചതോറുമുള്ള മന്ത്രിസഭാ യോഗത്തിലെ തീരുമാനങ്ങൾ.",
              )}
            </p>
            {cabinet.length > 0
              ? (
                <OrdersBrowser
                  orders={cabinet}
                  depts={deptOptions}
                  lang={lang}
                  hideTypeFilter
                  unit={{ en: "decisions", ml: "തീരുമാനങ്ങൾ" }}
                />
              )
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

          {/* ── Panel: Appointments ── */}
          <section
            id="appointments"
            class="tab-panel"
            role="tabpanel"
            aria-label={t(lang, "Appointments", "നിയമനങ്ങൾ")}
          >
            <p class="text-xs text-base-content/45 mb-4">
              {t(
                lang,
                "Who holds which office — appointments, transfers, and postings extracted from Government Orders. Machine-extracted and pending review; verify against the source order before relying on any record.",
                "ആരാണ് ഏത് പദവിയിൽ — സർക്കാർ ഉത്തരവുകളിൽ നിന്ന് വേർതിരിച്ചെടുത്ത നിയമനങ്ങൾ, സ്ഥലംമാറ്റങ്ങൾ, പോസ്റ്റിംഗുകൾ. യന്ത്രസഹായത്താൽ വേർതിരിച്ചത്, പരിശോധന ബാക്കി — ആശ്രയിക്കും മുമ്പ് ഉറവിട ഉത്തരവുമായി ഒത്തുനോക്കുക.",
              )}
            </p>
            {appointments.length === 0
              ? (
                <div class="text-center py-12 px-4 rounded-box border border-dashed border-base-300 bg-base-100/50">
                  <p class="text-sm text-base-content/50">
                    {t(
                      lang,
                      "No appointments ingested yet — we extract them from new Government Orders every day.",
                      "ഇതുവരെ നിയമനങ്ങളൊന്നും ലഭിച്ചിട്ടില്ല — പുതിയ സർക്കാർ ഉത്തരവുകളിൽ നിന്ന് ഞങ്ങൾ ദിവസവും ഇവ ശേഖരിക്കുന്നു.",
                    )}
                  </p>
                </div>
              )
              : (
                <>
                  {/* Office succession charts need normalized Office records (Phase 2). */}
                  <p class="mb-6 rounded-box border border-base-300 bg-base-200/40 px-4 py-3 text-xs text-base-content/60">
                    {t(
                      lang,
                      "Office succession charts (“who succeeded whom”) are paused until posts are normalized — raw ingest rows often show duplicate “current” holders for the same chair. Key offices and clean succession timelines ship with the Office model (see person-office-tenure-model spec).",
                      "പദവി പിന്തുടർച്ച (“ആരുടെ പിൻഗാമി ആര്”) ചാർട്ടുകൾ താൽക്കാലികമായി നിർത്തിയിട്ടുണ്ട് — ഉറവിട നിയമന വരികളിൽ ഒരേ പദവിക്ക് പല “നിലവിൽ” ഉദ്യോഗസ്ഥർ കാണാം. പ്രധാന പദവികളും വ്യക്തമായ പിന്തുടർച്ചയും Office മോഡൽ വരുമ്പോൾ ലഭ്യമാകും.",
                    )}
                  </p>

                  {/* Searchable list, grouped by branch */}
                  <section>
                    <h2 class="font-display text-xl font-semibold mb-4">
                      {t(lang, "All appointments", "എല്ലാ നിയമനങ്ങളും")}
                    </h2>
                    <AppointmentsBrowser
                      appointments={appointments}
                      depts={deptOptions}
                      personSlugById={personSlugById}
                      lang={lang}
                    />
                  </section>
                </>
              )}
          </section>
        </div>
      </main>
      <Footer lang={lang} />
    </>
  );
});
