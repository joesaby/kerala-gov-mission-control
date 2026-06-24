import { page } from "fresh";
import { define } from "../../../utils.ts";
import { t } from "../../../data/lang.ts";
import { listAppointments, listDepartments } from "../../../data/db.ts";
import { Header } from "../../../components/Header.tsx";
import { Footer } from "../../../components/Footer.tsx";
import { EgoNetwork } from "../../../components/EgoNetwork.tsx";
import type { EgoGroup } from "../../../lib/ego-layout.ts";
import AppointmentsBrowser from "../../../islands/AppointmentsBrowser.tsx";
import type { Appointment, Department } from "../../../data/types.ts";

interface Data {
  appointments: Appointment[];
  depts: Department[];
}

export const handler = define.handlers<Data>({
  async GET() {
    const [appointments, depts] = await Promise.all([
      listAppointments(), // newest-first by termStart
      listDepartments(),
    ]);
    return page({ appointments, depts });
  },
});

/** Normalized office key for succession grouping (matches db.ts officeKey). */
function officeKey(a: Appointment): string {
  const office = a.office.toLowerCase().replace(/[^a-z0-9]/g, "");
  return [a.deptId ?? "", a.court ?? "", office].join("|");
}

/**
 * Build one tenure-succession ego map per department that has an office with more
 * than one dated holder — the visual proof that "the holder changes by date".
 * Center = department, group = office, leaves = holders oldest→newest.
 */
function buildTenureMaps(
  appointments: Appointment[],
  depts: Department[],
  lang: "en" | "ml",
): { id: string; label: string; href?: string; groups: EgoGroup[] }[] {
  const deptMap = new Map(depts.map((d) => [d.id, d]));
  const byDept = new Map<string, Appointment[]>();
  for (const a of appointments) {
    const key = a.deptId ?? "untagged";
    (byDept.get(key) ?? byDept.set(key, []).get(key)!).push(a);
  }

  const maps: {
    id: string;
    label: string;
    href?: string;
    groups: EgoGroup[];
  }[] = [];
  for (const [deptId, appts] of byDept) {
    const byOffice = new Map<string, Appointment[]>();
    for (const a of appts) {
      const key = officeKey(a);
      (byOffice.get(key) ?? byOffice.set(key, []).get(key)!).push(a);
    }
    // Only offices with real succession (≥2 holders) are interesting here.
    const groups: EgoGroup[] = [];
    for (const holders of byOffice.values()) {
      if (holders.length < 2) continue;
      const sorted = [...holders].sort((x, y) =>
        x.termStart.localeCompare(y.termStart)
      );
      const first = sorted[0];
      groups.push({
        id: officeKey(first),
        label: lang === "ml" && first.officeMl ? first.officeMl : first.office,
        leaves: sorted.map((h) => ({
          id: h.id,
          label: `${
            lang === "ml" && h.appointeeNameMl
              ? h.appointeeNameMl
              : h.appointeeName
          } · ${h.termStart.slice(0, 7)}`,
          href: `/gov/appointments/${h.id}`,
          tone: h.termEnd ? "off-track" : "on-track",
        })),
      });
    }
    if (groups.length === 0) continue;
    const d = deptMap.get(deptId);
    maps.push({
      id: deptId,
      label: d ? (lang === "ml" && d.nameMl ? d.nameMl : d.name) : deptId,
      href: d ? `/gov/departments/${d.slug}` : undefined,
      groups,
    });
  }
  return maps;
}

export default define.page<typeof handler>(function AppointmentsPage(
  { data, state },
) {
  const lang = state.lang;
  const { appointments, depts } = data;
  const tenureMaps = buildTenureMaps(appointments, depts, lang);

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
            {" · "}
            <a href="/gov/orders" class="hover:text-primary transition">
              {t(lang, "Orders", "ഉത്തരവുകൾ")}
            </a>
          </p>
          <h1
            class={`font-display text-3xl md:text-4xl font-bold mt-1 ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {t(lang, "Appointments", "നിയമനങ്ങൾ")}
          </h1>
          <p
            class={`text-base-content/70 mt-2 max-w-2xl leading-relaxed ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {t(
              lang,
              "Who holds which office — appointments, transfers, and postings extracted from Government Orders, across the executive, bureaucracy, judiciary, and public bodies.",
              "ആരാണ് ഏത് പദവിയിൽ — സർക്കാർ ഉത്തരവുകളിൽ നിന്ന് വേർതിരിച്ചെടുത്ത നിയമനങ്ങൾ, സ്ഥലംമാറ്റങ്ങൾ, പോസ്റ്റിംഗുകൾ.",
            )}
          </p>
          <p class="mt-4 text-xs text-base-content/50">
            <span class="tabular-nums font-semibold text-base-content">
              {appointments.length}
            </span>{" "}
            {t(lang, "appointment records · ", "നിയമന രേഖകൾ · ")}
            <a href="/gov/ingest-status" class="link link-hover text-primary">
              {t(lang, "pipeline status", "പൈപ്പ്‌ലൈൻ നില")}
            </a>
          </p>
          <p class="mt-2 text-[11px] text-base-content/40">
            {t(
              lang,
              "Machine-extracted from official PDFs and pending review — verify against the source order before relying on any record.",
              "ഔദ്യോഗിക PDF-കളിൽ നിന്ന് യന്ത്രസഹായത്താൽ വേർതിരിച്ചത്, പരിശോധന ബാക്കി — ആശ്രയിക്കും മുമ്പ് ഉറവിട ഉത്തരവുമായി ഒത്തുനോക്കുക.",
            )}
          </p>
        </section>

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
              {/* ── Tenure succession maps (only where an office changed hands) ── */}
              {tenureMaps.length > 0 && (
                <section class="mb-10">
                  <h2 class="font-display text-xl font-semibold mb-1">
                    {t(lang, "Who succeeded whom", "ആരുടെ പിൻഗാമി ആര്")}
                  </h2>
                  <p class="text-sm text-base-content/60 mb-4">
                    {t(
                      lang,
                      "Offices that changed hands — each holder dated by when they took charge.",
                      "കൈമാറിയ പദവികൾ — ഓരോ ഉദ്യോഗസ്ഥനും ചുമതലയേറ്റ തീയതി സഹിതം.",
                    )}
                  </p>
                  <div class="flex flex-col gap-6">
                    {tenureMaps.map((m) => (
                      <div
                        key={m.id}
                        class="rounded-box border border-base-300 p-3"
                      >
                        <EgoNetwork
                          center={{ label: m.label, href: m.href }}
                          groups={m.groups}
                          lang={lang}
                          ariaLabel={t(
                            lang,
                            "Office succession map",
                            "പദവി പിന്തുടർച്ച ഭൂപടം",
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Searchable list, grouped by branch ── */}
              <section>
                <h2 class="font-display text-xl font-semibold mb-4">
                  {t(lang, "All appointments", "എല്ലാ നിയമനങ്ങളും")}
                </h2>
                <AppointmentsBrowser
                  appointments={appointments}
                  depts={depts.map((d) => ({
                    id: d.id,
                    name: d.name,
                    nameMl: d.nameMl,
                    slug: d.slug,
                  }))}
                  lang={lang}
                />
              </section>
            </>
          )}
      </main>
      <Footer lang={lang} />
    </>
  );
});
