import { page } from "fresh";
import { define } from "../../../utils.ts";
import { t } from "../../../data/lang.ts";
import { deptOptions, loadGovDocumentLanes } from "../../../lib/gov-records.ts";
import { listOffices } from "../../../data/db.ts";
import { Header } from "../../../components/Header.tsx";
import { Footer } from "../../../components/Footer.tsx";
import { GovSubnav } from "../../../components/GovSubnav.tsx";
import AppointmentsBands from "../../../islands/AppointmentsBands.tsx";

export const handler = define.handlers({
  async GET() {
    const [lanes, offices] = await Promise.all([
      loadGovDocumentLanes(),
      listOffices(),
    ]);
    return page({
      appointments: lanes.appointments,
      depts: lanes.depts,
      personSlugById: lanes.personSlugById,
      offices,
    });
  },
});

export default define.page<typeof handler>(function GovAppointmentsPage(
  { data, state },
) {
  const lang = state.lang;
  const { appointments, depts, personSlugById, offices } = data;

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
          {t(lang, "Appointments & postings", "നിയമനങ്ങളും പോസ്റ്റിംഗുകളും")}
        </h1>
        <p class="text-base-content/70 mt-2 max-w-2xl">
          {t(
            lang,
            "Who holds which office — extracted from Government Orders. Key posts first; full list is searchable below.",
            "ആരാണ് ഏത് പദവിയിൽ — സർക്കാർ ഉത്തരവുകളിൽ നിന്ന്. പ്രധാന പദവികൾ ആദ്യം; പൂർണ്ണ പട്ടിക താഴെ.",
          )}
        </p>
        <p class="mt-3 text-xs text-base-content/50">
          <a href="/gov/ingest-status" class="link link-hover text-primary">
            {t(lang, "Pipeline status", "പൈപ്പ്‌ലൈൻ നില")}
          </a>
        </p>

        <GovSubnav lang={lang} path={state.path} />

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
            <AppointmentsBands
              appointments={appointments}
              offices={offices}
              depts={deptOptions(depts)}
              personSlugById={personSlugById}
              lang={lang}
            />
          )}
      </main>
      <Footer lang={lang} />
    </>
  );
});
