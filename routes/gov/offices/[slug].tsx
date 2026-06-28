import { HttpError, page } from "fresh";
import { define } from "../../../utils.ts";
import { t } from "../../../data/lang.ts";
import { getDepartment, getOfficeBySlug } from "../../../data/db.ts";
import { getOfficeSuccession } from "../../../lib/graph.ts";
import { Header } from "../../../components/Header.tsx";
import { Footer } from "../../../components/Footer.tsx";
import { GovSubnav } from "../../../components/GovSubnav.tsx";
import { AutoLinkDisclaimer } from "../../../components/AutoLinkDisclaimer.tsx";
import type { Department, Office } from "../../../data/types.ts";

interface Data {
  office: Office;
  dept: Department | null;
  holders: Awaited<ReturnType<typeof getOfficeSuccession>>;
}

export const handler = define.handlers<Data>({
  async GET(ctx) {
    const office = await getOfficeBySlug(ctx.params.slug);
    if (!office) throw new HttpError(404, "Office not found");
    const [dept, holders] = await Promise.all([
      office.deptId ? getDepartment(office.deptId) : Promise.resolve(null),
      getOfficeSuccession(office.id),
    ]);
    return page({ office, dept, holders });
  },
});

function fmtDate(iso: string, lang: "en" | "ml"): string {
  return new Date(iso).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export default define.page<typeof handler>(function OfficePage(
  { data, state },
) {
  const lang = state.lang;
  const { office, dept, holders } = data;
  const title = lang === "ml" && office.titleMl ? office.titleMl : office.title;
  const current = holders.filter((h) => h.current);

  return (
    <>
      <Header lang={lang} path={state.path} />
      <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <p class="text-xs">
          <a
            href="/gov/appointments"
            class="link link-hover text-base-content/60"
          >
            ← {t(lang, "Appointments", "നിയമനങ്ങൾ")}
          </a>
        </p>

        <GovSubnav lang={lang} path={state.path} />

        <header class="mt-2">
          <span
            class={`badge badge-sm ${
              office.tier === "headline" ? "badge-primary" : "badge-ghost"
            }`}
          >
            {office.tier === "headline"
              ? t(lang, "Headline office", "പ്രധാന പദവി")
              : t(lang, "Routine", "സാധാരണ")}
          </span>
          <h1
            class={`font-display text-3xl md:text-4xl font-bold mt-2 ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {title}
          </h1>
          {dept && (
            <p class="mt-2 text-sm">
              <a
                href={`/gov/departments/${dept.slug}`}
                class="link link-hover text-primary"
              >
                {lang === "ml" && dept.nameMl ? dept.nameMl : dept.name}
              </a>
            </p>
          )}
        </header>

        {current.length > 0 && (
          <section class="mt-8">
            <h2 class="font-display text-xl font-semibold mb-3">
              {t(lang, "Current holder", "നിലവിലെ ഉദ്യോഗസ്ഥൻ")}
            </h2>
            <ul class="flex flex-col gap-3">
              {current.map((h) => (
                <li key={h.personId + h.termStart} class="text-sm">
                  {h.personSlug
                    ? (
                      <a
                        href={`/gov/people/${h.personSlug}`}
                        class="link link-hover font-semibold"
                      >
                        {lang === "ml" && h.personNameMl
                          ? h.personNameMl
                          : h.personName}
                      </a>
                    )
                    : <span class="font-semibold">{h.personName}</span>}
                  <span class="text-base-content/50 ml-2 tabular-nums">
                    {t(lang, "since", "മുതൽ")} {fmtDate(h.termStart, lang)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section class="mt-10">
          <h2 class="font-display text-xl font-semibold mb-1">
            {t(lang, "Succession", "പിന്തുടർച്ച")}
          </h2>
          <p class="text-sm text-base-content/60 mb-4">
            {t(
              lang,
              "Every dated holder on record, oldest first.",
              "രേഖപ്പെടുത്തിയ ഓരോ ഉദ്യോഗസ്ഥനും — പഴയത് ആദ്യം.",
            )}
          </p>
          {holders.length === 0
            ? (
              <p class="text-sm text-base-content/50 italic">
                {t(
                  lang,
                  "No holders on record yet.",
                  "ഇതുവരെ ഉദ്യോഗസ്ഥരൊന്നും ഇല്ല.",
                )}
              </p>
            )
            : (
              <ol class="relative border-s border-base-300 ms-3 flex flex-col gap-4">
                {holders.map((h) => (
                  <li key={h.personId + h.termStart} class="ms-4 text-sm">
                    <span
                      class="absolute -start-1.5 mt-1.5 w-3 h-3 rounded-full border-2 border-base-100 bg-primary"
                      aria-hidden="true"
                    />
                    <div class="font-medium">
                      {h.personSlug
                        ? (
                          <a
                            href={`/gov/people/${h.personSlug}`}
                            class="link link-hover"
                          >
                            {lang === "ml" && h.personNameMl
                              ? h.personNameMl
                              : h.personName}
                          </a>
                        )
                        : (lang === "ml" && h.personNameMl
                          ? h.personNameMl
                          : h.personName)}
                      {!h.termEnd && (
                        <span class="badge badge-xs badge-success badge-outline ml-2">
                          {t(lang, "Current", "നിലവിൽ")}
                        </span>
                      )}
                    </div>
                    <div class="text-xs text-base-content/50 tabular-nums mt-0.5">
                      {fmtDate(h.termStart, lang)}
                      {" – "}
                      {h.termEnd
                        ? fmtDate(h.termEnd, lang)
                        : t(lang, "present", "ഇതുവരെ")}
                    </div>
                    {h.appointmentId && (
                      <a
                        href={`/gov/appointments/${h.appointmentId}`}
                        class="text-xs link link-hover text-primary mt-1 inline-block"
                      >
                        {t(lang, "Source posting →", "ഉറവിട നിയമനം →")}
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            )}
        </section>

        <div class="mt-8">
          <AutoLinkDisclaimer lang={lang} />
        </div>
      </main>
      <Footer lang={lang} />
    </>
  );
});
