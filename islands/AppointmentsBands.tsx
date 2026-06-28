import { useMemo, useState } from "preact/hooks";
import type { Appointment, Office } from "../data/types.ts";
import AppointmentsBrowser, { type DeptLite } from "./AppointmentsBrowser.tsx";
import { EventTimeline } from "../components/EventTimeline.tsx";
import { AutoLinkDisclaimer } from "../components/AutoLinkDisclaimer.tsx";

interface Props {
  appointments: Appointment[];
  offices: Office[];
  depts: DeptLite[];
  personSlugById: Record<string, string>;
  lang: "en" | "ml";
}

function t(lang: "en" | "ml", en: string, ml: string): string {
  return lang === "ml" ? ml : en;
}

function fmtDay(iso: string, lang: "en" | "ml"): string {
  return new Date(iso).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

const MS_90_DAYS = 90 * 24 * 60 * 60 * 1000;

export default function AppointmentsBands(
  { appointments, offices, depts, personSlugById, lang }: Props,
) {
  const officeById = useMemo(
    () => new Map(offices.map((o) => [o.id, o])),
    [offices],
  );
  const deptMap = useMemo(
    () => new Map(depts.map((d) => [d.id, d])),
    [depts],
  );

  const headline = useMemo(() => {
    const now = Date.now();
    const current = appointments.filter((a) => {
      if (a.termEnd) return false;
      if (!a.officeId) return false;
      return officeById.get(a.officeId)?.tier === "headline";
    });
    const recent = appointments.filter((a) => {
      if (!a.officeId) return false;
      if (officeById.get(a.officeId)?.tier !== "headline") return false;
      const start = new Date(a.termStart).getTime();
      return now - start <= MS_90_DAYS;
    });
    return { current, recent };
  }, [appointments, officeById]);

  const keyByOffice = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of headline.current) {
      const key = a.officeId ?? a.id;
      (map.get(key) ?? map.set(key, []).get(key)!).push(a);
    }
    return map;
  }, [headline.current]);

  const hasKeyOffices = keyByOffice.size > 0;
  // When no headline office has matched yet, the full list is the only real
  // content — show it open by default so the page isn't an empty apology.
  const [showAll, setShowAll] = useState(!hasKeyOffices);

  const recentEvents = useMemo(
    () =>
      [...headline.recent]
        .sort((a, b) => b.termStart.localeCompare(a.termStart))
        .slice(0, 12)
        .map((a) => {
          const office = a.officeId ? officeById.get(a.officeId) : undefined;
          const name = lang === "ml" && a.appointeeNameMl
            ? a.appointeeNameMl
            : a.appointeeName;
          const officeLabel = office
            ? (lang === "ml" && office.titleMl ? office.titleMl : office.title)
            : (lang === "ml" && a.officeMl ? a.officeMl : a.office);
          return {
            id: a.id,
            date: a.termStart,
            kind: "promise-action" as const,
            kindLabel: "Posting",
            kindLabelMl: "നിയമനം",
            title: `${name} — ${officeLabel}`,
            href: a.personId && personSlugById[a.personId]
              ? `/gov/people/${personSlugById[a.personId]}`
              : `/gov/appointments/${a.id}`,
          };
        }),
    [headline.recent, lang, officeById, personSlugById],
  );

  return (
    <div class="flex flex-col gap-10">
      {hasKeyOffices
        ? (
          <section>
            <h2 class="font-display text-xl font-semibold mb-1">
              {t(lang, "Key offices now", "പ്രധാന പദവികൾ — ഇപ്പോൾ")}
            </h2>
            <p class="text-sm text-base-content/60 mb-4">
              {t(
                lang,
                "Current holders of headline-tier posts (Principal Secretaries and similar), grouped by office.",
                "പ്രധാന പദവികളുടെ (പ്രിൻസിപ്പൽ സെക്രട്ടറി മുതലായ) നിലവിലെ ഉദ്യോഗസ്ഥർ — പദവി അനുസരിച്ച്.",
              )}
            </p>
            <ul class="flex flex-col gap-4">
              {[...keyByOffice.entries()].map(([officeId, holders]) => {
                const office = officeById.get(officeId);
                const dept = holders[0]?.deptId
                  ? deptMap.get(holders[0].deptId!)
                  : undefined;
                const title = office
                  ? (lang === "ml" && office.titleMl
                    ? office.titleMl
                    : office.title)
                  : holders[0].office;
                return (
                  <li
                    key={officeId}
                    class="rounded-box border border-base-300 p-4 bg-base-100/60"
                  >
                    <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      {office
                        ? (
                          <a
                            href={`/gov/offices/${office.slug}`}
                            class="font-semibold link link-hover text-primary"
                          >
                            {title}
                          </a>
                        )
                        : <span class="font-semibold">{title}</span>}
                      {dept && (
                        <a
                          href={`/gov/departments/${dept.slug}`}
                          class="text-xs text-base-content/50 link link-hover"
                        >
                          {lang === "ml" && dept.nameMl
                            ? dept.nameMl
                            : dept.name}
                        </a>
                      )}
                    </div>
                    <ul class="mt-2 flex flex-col gap-1">
                      {holders.map((a) => {
                        const name = lang === "ml" && a.appointeeNameMl
                          ? a.appointeeNameMl
                          : a.appointeeName;
                        const personSlug = a.personId
                          ? personSlugById[a.personId]
                          : undefined;
                        return (
                          <li key={a.id} class="text-sm flex flex-wrap gap-x-2">
                            {personSlug
                              ? (
                                <a
                                  href={`/gov/people/${personSlug}`}
                                  class="link link-hover font-medium"
                                >
                                  {name}
                                </a>
                              )
                              : (
                                <a
                                  href={`/gov/appointments/${a.id}`}
                                  class="link link-hover font-medium"
                                >
                                  {name}
                                </a>
                              )}
                            <span class="text-base-content/45 tabular-nums">
                              {t(lang, "since", "മുതൽ")}{" "}
                              {fmtDay(a.termStart, lang)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </section>
        )
        : null}

      {recentEvents.length > 0 && (
        <section>
          <h2 class="font-display text-xl font-semibold mb-1">
            {t(lang, "Recent changes", "സമീപകാല മാറ്റങ്ങൾ")}
          </h2>
          <p class="text-sm text-base-content/60 mb-4">
            {t(
              lang,
              "Headline-tier postings in the last 90 days.",
              "കഴിഞ്ഞ 90 ദിവസത്തിലെ പ്രധാന പദവി മാറ്റങ്ങൾ.",
            )}
          </p>
          <EventTimeline events={recentEvents} lang={lang} />
        </section>
      )}

      <section>
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 class="font-display text-xl font-semibold">
              {t(lang, "All ingested postings", "എല്ലാ നിയമനങ്ങളും")}
            </h2>
            <p class="text-sm text-base-content/60 mt-1">
              {t(
                lang,
                "Full searchable list — includes routine and unverified rows.",
                "പൂർണ്ണമായ തിരയാവുന്ന പട്ടിക — സാധാരണ, പരിശോധന ബാക്കിയുള്ള വരികൾ ഉൾപ്പെടെ.",
              )}
            </p>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-outline"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll
              ? t(lang, "Collapse", "ചുരുക്കുക")
              : t(lang, "Show all", "എല്ലാം കാണിക്കുക")}
          </button>
        </div>
        {showAll && (
          <>
            <AutoLinkDisclaimer lang={lang} />
            <div class="mt-4">
              <AppointmentsBrowser
                appointments={appointments}
                depts={depts}
                personSlugById={personSlugById}
                lang={lang}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
