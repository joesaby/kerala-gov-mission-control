import { HttpError, page } from "fresh";
import { define } from "../../../utils.ts";
import { t } from "../../../data/lang.ts";
import {
  getAppointment,
  getDepartment,
  getGovernmentOrder,
  listAppointmentsByGo,
} from "../../../data/db.ts";
import { Header } from "../../../components/Header.tsx";
import { Footer } from "../../../components/Footer.tsx";
import type {
  Appointment,
  Department,
  GovernmentOrder,
} from "../../../data/types.ts";

interface Data {
  appt: Appointment;
  dept: Department | null;
  sourceGo: GovernmentOrder | null;
  /** Other appointees named in the same order. */
  siblings: Appointment[];
}

export const handler = define.handlers<Data>({
  async GET(ctx) {
    const appt = await getAppointment(ctx.params.id);
    if (!appt) throw new HttpError(404, "Appointment not found");
    const [dept, sourceGo, siblings] = await Promise.all([
      appt.deptId ? getDepartment(appt.deptId) : Promise.resolve(null),
      getGovernmentOrder(appt.goId),
      listAppointmentsByGo(appt.goId),
    ]);
    return page({
      appt,
      dept,
      sourceGo,
      siblings: siblings.filter((s) => s.id !== appt.id),
    });
  },
});

const BRANCH_LABEL: Record<string, { en: string; ml: string }> = {
  executive: { en: "Executive", ml: "എക്സിക്യൂട്ടീവ്" },
  bureaucratic: { en: "Bureaucratic", ml: "ഉദ്യോഗസ്ഥതലം" },
  judiciary: { en: "Judiciary", ml: "നീതിന്യായം" },
  board: { en: "Boards & bodies", ml: "ബോർഡുകൾ" },
};

const ACTION_LABEL: Record<string, { en: string; ml: string }> = {
  "appointment": { en: "Appointment", ml: "നിയമനം" },
  "transfer": { en: "Transfer", ml: "സ്ഥലംമാറ്റം" },
  "promotion": { en: "Promotion", ml: "സ്ഥാനക്കയറ്റം" },
  "additional-charge": { en: "Additional charge", ml: "അധിക ചുമതല" },
  "extension": { en: "Extension", ml: "നീട്ടൽ" },
  "deputation": { en: "Deputation", ml: "ഡെപ്യൂട്ടേഷൻ" },
  "reinstatement": { en: "Reinstatement", ml: "പുനഃസ്ഥാപനം" },
  "relieved": { en: "Relieved", ml: "ഒഴിവാക്കൽ" },
};

function fmtDate(iso: string, lang: "en" | "ml"): string {
  return new Date(iso).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export default define.page<typeof handler>(function AppointmentDetail(
  { data, state },
) {
  const lang = state.lang;
  const { appt, dept, sourceGo, siblings } = data;
  const name = lang === "ml" && appt.appointeeNameMl
    ? appt.appointeeNameMl
    : appt.appointeeName;
  const office = lang === "ml" && appt.officeMl ? appt.officeMl : appt.office;
  const court = lang === "ml" && appt.courtMl ? appt.courtMl : appt.court;
  const deptName = dept
    ? (lang === "ml" && dept.nameMl ? dept.nameMl : dept.name)
    : null;
  const branch = BRANCH_LABEL[appt.branch] ??
    { en: appt.branch, ml: appt.branch };
  const action = ACTION_LABEL[appt.action] ??
    { en: appt.action, ml: appt.action };

  const Row = (
    { label, children }: { label: string; children: preact.ComponentChildren },
  ) => (
    <div class="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 py-2 border-b border-base-200">
      <dt class="shrink-0 w-44 text-xs uppercase tracking-wide text-base-content/50">
        {label}
      </dt>
      <dd class="flex-1 text-sm">{children}</dd>
    </div>
  );

  return (
    <>
      <Header lang={lang} path={state.path} />
      <main class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <p class="eyebrow">
          <a
            href="/gov/orders#appointments"
            class="hover:text-primary transition"
          >
            {t(lang, "Appointments", "നിയമനങ്ങൾ")}
          </a>
        </p>
        <h1
          class={`font-display text-2xl md:text-3xl font-bold mt-1 ${
            lang === "ml" ? "ml" : ""
          }`}
        >
          {name}
        </h1>
        <p class="text-base-content/70 mt-1">{office}</p>

        {/* Caveat banner — machine-extracted, unverified. */}
        <div class="mt-4 rounded-box border border-warning/40 bg-warning/5 px-4 py-2 text-xs text-base-content/70">
          {t(
            lang,
            "Machine-extracted from the source Government Order and pending review. Verify against the PDF before relying on it.",
            "ഉറവിട സർക്കാർ ഉത്തരവിൽ നിന്ന് യന്ത്രസഹായത്താൽ വേർതിരിച്ചത്, പരിശോധന ബാക്കി. ആശ്രയിക്കും മുമ്പ് PDF പരിശോധിക്കുക.",
          )}
        </div>

        <dl class="mt-6">
          <Row label={t(lang, "Branch", "വിഭാഗം")}>
            {lang === "ml" ? branch.ml : branch.en}
          </Row>
          <Row label={t(lang, "Action", "നടപടി")}>
            {lang === "ml" ? action.ml : action.en}
          </Row>
          {court && <Row label={t(lang, "Court", "കോടതി")}>{court}</Row>}
          {deptName && (
            <Row label={t(lang, "Department", "വകുപ്പ്")}>
              {dept
                ? (
                  <a
                    href={`/gov/departments/${dept.slug}`}
                    class="link link-hover text-primary"
                  >
                    {deptName}
                  </a>
                )
                : deptName}
            </Row>
          )}
          <Row label={t(lang, "Took charge", "ചുമതലയേറ്റത്")}>
            {fmtDate(appt.termStart, lang)}
          </Row>
          <Row label={t(lang, "Until", "വരെ")}>
            {appt.termEnd
              ? fmtDate(appt.termEnd, lang)
              : (
                <span class="text-success">
                  {t(lang, "Current (in office)", "നിലവിൽ (പദവിയിൽ)")}
                </span>
              )}
          </Row>
          {appt.personId && (
            <Row label={t(lang, "Person link", "വ്യക്തി ബന്ധം")}>
              <span class="text-primary">
                {t(lang, "Matched to a known person", "അറിയപ്പെടുന്ന വ്യക്തി")}
              </span>
            </Row>
          )}
        </dl>

        {/* Source order */}
        <section class="mt-8">
          <h2 class="font-display text-lg font-semibold mb-2">
            {t(lang, "Source order", "ഉറവിട ഉത്തരവ്")}
          </h2>
          <div class="rounded-box border border-base-300 p-4 text-sm">
            {sourceGo
              ? (
                <a
                  href={`/gov/orders/${sourceGo.id}`}
                  class="font-medium link link-hover text-primary"
                >
                  {sourceGo.goNumber}
                </a>
              )
              : <span class="text-base-content/50">{appt.goId}</span>}
            {sourceGo?.subject && (
              <p class="text-base-content/60 mt-1">{sourceGo.subject}</p>
            )}
            <a
              href={appt.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-block mt-2 text-primary hover:text-primary-focus"
            >
              {t(lang, "View source PDF ↗", "ഉറവിട PDF ↗")}
            </a>
          </div>
        </section>

        {/* Siblings */}
        {siblings.length > 0 && (
          <section class="mt-8">
            <h2 class="font-display text-lg font-semibold mb-2">
              {t(
                lang,
                "Others appointed by the same order",
                "അതേ ഉത്തരവിലെ മറ്റ് നിയമനങ്ങൾ",
              )}
            </h2>
            <ul class="divide-y divide-base-200 rounded-box border border-base-300">
              {siblings.map((s) => (
                <li key={s.id} class="px-4 py-2 text-sm">
                  <a
                    href={`/gov/appointments/${s.id}`}
                    class="link link-hover text-primary font-medium"
                  >
                    {lang === "ml" && s.appointeeNameMl
                      ? s.appointeeNameMl
                      : s.appointeeName}
                  </a>
                  <span class="text-base-content/60">
                    {" — "}
                    {lang === "ml" && s.officeMl ? s.officeMl : s.office}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <Footer lang={lang} />
    </>
  );
});
