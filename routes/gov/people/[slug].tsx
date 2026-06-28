import { HttpError, page } from "fresh";
import { define } from "../../../utils.ts";
import { t } from "../../../data/lang.ts";
import {
  getConstituency,
  getPersonBySlug,
  listAppointmentsByPerson,
  listDepartments,
  listMinistersByPerson,
  listMlasByPerson,
  listSpeakersByPerson,
  listSpeechesByPerson,
} from "../../../data/db.ts";
import { Header } from "../../../components/Header.tsx";
import { Footer } from "../../../components/Footer.tsx";
import { GovSubnav } from "../../../components/GovSubnav.tsx";
import { MinisterAvatar } from "../../../components/MinisterAvatar.tsx";
import { SpeechList } from "../../../components/SpeechList.tsx";
import { AutoLinkDisclaimer } from "../../../components/AutoLinkDisclaimer.tsx";
import type {
  Appointment,
  Department,
  MemberOfLegislative,
  Minister,
  Person,
  PublicSpeech,
  Speaker,
} from "../../../data/types.ts";

interface Data {
  person: Person;
  ministers: Minister[];
  appointments: Appointment[];
  speakers: Speaker[];
  mlas: MemberOfLegislative[];
  constituencyNames: Record<string, string>;
  speeches: PublicSpeech[];
  depts: Department[];
}

export const handler = define.handlers<Data>({
  async GET(ctx) {
    const person = await getPersonBySlug(ctx.params.slug);
    if (!person) throw new HttpError(404, "Person not found");
    const [ministers, appointments, speakers, mlas, speeches, depts] =
      await Promise
        .all([
          listMinistersByPerson(person.id),
          listAppointmentsByPerson(person.id),
          listSpeakersByPerson(person.id),
          listMlasByPerson(person.id),
          listSpeechesByPerson(person.id),
          listDepartments(),
        ]);
    const constituencyNames: Record<string, string> = {};
    for (const m of mlas) {
      const c = await getConstituency(m.constituencyId);
      if (c) constituencyNames[c.id] = c.name;
    }
    return page({
      person,
      ministers,
      appointments,
      speakers,
      mlas,
      constituencyNames,
      speeches,
      depts,
    });
  },
});

const BRANCH_LABEL: Record<string, { en: string; ml: string }> = {
  executive: { en: "Executive", ml: "എക്സിക്യൂട്ടീവ്" },
  bureaucratic: { en: "Bureaucratic", ml: "ഉദ്യോഗസ്ഥതലം" },
  judiciary: { en: "Judiciary", ml: "നീതിന്യായം" },
  board: { en: "Boards & bodies", ml: "ബോർഡുകൾ" },
};

const KIND_CHIP: Record<string, { en: string; ml: string; class: string }> = {
  minister: { en: "Cabinet", ml: "മന്ത്രിസഭ", class: "badge-primary" },
  appointment: { en: "Posting", ml: "നിയമനം", class: "badge-secondary" },
  speaker: { en: "Assembly", ml: "നിയമസഭ", class: "badge-accent" },
  mla: { en: "MLA", ml: "എം.എൽ.എ.", class: "badge-info" },
};

/** A role tenure normalized for the unified career timeline. */
interface RoleItem {
  key: string;
  kind: "minister" | "appointment" | "speaker" | "mla";
  title: string;
  sub?: string;
  href?: string;
  /** Source PDF for machine-extracted (appointment) rows. */
  pdfUrl?: string;
  termStart: string;
  termEnd?: string;
}

function fmtDate(iso: string, lang: "en" | "ml"): string {
  return new Date(iso).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export default define.page<typeof handler>(function PersonPage(
  { data, state },
) {
  const lang = state.lang;
  const {
    person,
    ministers,
    appointments,
    speakers,
    mlas,
    constituencyNames,
    speeches,
    depts,
  } = data;
  const deptById = new Map(depts.map((d) => [d.id, d]));
  const deptName = (id?: string) => {
    const d = id ? deptById.get(id) : undefined;
    if (!d) return undefined;
    return lang === "ml" && d.nameMl ? d.nameMl : d.name;
  };

  const ministerTitle = (m: Minister): string => {
    if (m.rank === "CM") return t(lang, "Chief Minister", "മുഖ്യമന്ത്രി");
    if (m.rank === "Deputy CM") {
      return t(lang, "Deputy Chief Minister", "ഉപമുഖ്യമന്ത്രി");
    }
    return t(lang, "Minister", "മന്ത്രി");
  };

  // ── Build the unified, date-sorted role timeline ──
  const roles: RoleItem[] = [
    ...ministers
      .filter((m): m is Minister & { termStart: string } => !!m.termStart)
      .map((m): RoleItem => ({
        key: m.id,
        kind: "minister",
        title: ministerTitle(m),
        sub: m.departmentIds.map((id) => deptName(id) ?? id).join(" · ") ||
          undefined,
        href: `/gov/ministers/${m.slug}`,
        termStart: m.termStart,
        termEnd: m.termEnd,
      })),
    ...appointments.map((a): RoleItem => {
      const branch = BRANCH_LABEL[a.branch];
      const office = lang === "ml" && a.officeMl ? a.officeMl : a.office;
      const dn = deptName(a.deptId) ??
        (lang === "ml" && a.courtMl ? a.courtMl : a.court);
      const branchLabel = branch ? (lang === "ml" ? branch.ml : branch.en) : "";
      return {
        key: a.id,
        kind: "appointment",
        title: office,
        sub: [dn, branchLabel].filter(Boolean).join(" · ") || undefined,
        href: `/gov/appointments/${a.id}`,
        pdfUrl: a.sourceUrl,
        termStart: a.termStart,
        termEnd: a.termEnd,
      };
    }),
    ...speakers.map((s): RoleItem => ({
      key: s.id,
      kind: "speaker",
      title: s.rank === "Deputy Speaker"
        ? t(lang, "Deputy Speaker", "ഉപാധ്യക്ഷൻ")
        : t(lang, "Speaker", "സ്പീക്കർ"),
      sub: t(
        lang,
        `${s.assemblyTerm}th Kerala Legislative Assembly`,
        `${s.assemblyTerm}-ാം കേരള നിയമസഭ`,
      ),
      termStart: s.termStart,
      termEnd: s.termEnd,
    })),
    ...mlas.map((m): RoleItem => ({
      key: m.id,
      kind: "mla",
      title: t(lang, "Member of Legislative Assembly", "നിയമസഭാംഗം"),
      sub: constituencyNames[m.constituencyId]
        ? t(
          lang,
          `${constituencyNames[m.constituencyId]} · ${m.assemblyTerm}th KLA`,
          `${constituencyNames[m.constituencyId]} · ${m.assemblyTerm}-ാം നിയമസഭ`,
        )
        : t(
          lang,
          `${m.assemblyTerm}th Kerala Legislative Assembly`,
          `${m.assemblyTerm}-ാം കേരള നിയമസഭ`,
        ),
      termStart: m.termStart,
      termEnd: m.termEnd,
    })),
  ].sort((x, y) => y.termStart.localeCompare(x.termStart));

  const current = roles.filter((r) => !r.termEnd);
  const hasAppointmentRole = roles.some((r) => r.kind === "appointment");

  const RoleLine = ({ r }: { r: RoleItem }) => {
    const chip = KIND_CHIP[r.kind];
    const body = (
      <>
        <div class="flex items-baseline flex-wrap gap-x-2">
          <span class={`font-medium ${lang === "ml" ? "ml" : ""}`}>
            {r.title}
          </span>
          {!r.termEnd && (
            <span class="badge badge-xs badge-success badge-outline">
              {t(lang, "Current", "നിലവിൽ")}
            </span>
          )}
        </div>
        {r.sub && (
          <div
            class={`text-xs text-base-content/60 ${lang === "ml" ? "ml" : ""}`}
          >
            {r.sub}
          </div>
        )}
        <div class="text-xs text-base-content/45 tabular-nums mt-0.5">
          {fmtDate(r.termStart, lang)}
          {" – "}
          {r.termEnd ? fmtDate(r.termEnd, lang) : t(lang, "present", "ഇതുവരെ")}
        </div>
      </>
    );
    return (
      <li class="flex items-start gap-3">
        <span
          class={`badge badge-sm shrink-0 mt-0.5 ${chip.class}`}
          title={lang === "ml" ? chip.ml : chip.en}
        >
          {lang === "ml" ? chip.ml : chip.en}
        </span>
        <div class="min-w-0 flex-1">
          {r.href
            ? (
              <a href={r.href} class="surface-link block p-2 -m-2 rounded-lg">
                {body}
              </a>
            )
            : <div class="p-2 -m-2">{body}</div>}
        </div>
        {r.pdfUrl && (
          <a
            href={r.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="shrink-0 text-primary hover:text-primary-focus mt-1"
            title={t(lang, "View source GO (PDF)", "ഉറവിട ഉത്തരവ് (PDF)")}
          >
            ↗
          </a>
        )}
      </li>
    );
  };

  return (
    <>
      <Header lang={lang} path={state.path} />
      <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <p class="text-xs">
          <a href="/gov/people" class="link link-hover text-base-content/60">
            ← {t(lang, "People", "വ്യക്തികൾ")}
          </a>
        </p>

        <GovSubnav lang={lang} path={state.path} />

        <header class="mt-3 flex items-start gap-5 flex-wrap">
          <MinisterAvatar
            minister={{ name: person.name, photoUrl: person.photoUrl }}
            size={112}
            class="shrink-0"
          />
          <div class="min-w-0 flex-1">
            <h1
              class={`font-display text-3xl md:text-4xl font-bold ${
                lang === "ml" ? "ml" : ""
              }`}
            >
              {lang === "ml" && person.nameMl ? person.nameMl : person.name}
            </h1>
            {lang === "ml" && person.nameMl && (
              <p class="text-base-content/60 text-sm">{person.name}</p>
            )}
            <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/60">
              {person.wikipediaUrl && (
                <a
                  href={person.wikipediaUrl}
                  class="link link-hover"
                  rel="external"
                  target="_blank"
                >
                  Wikipedia ↗
                </a>
              )}
              {person.links?.officialPage && (
                <a
                  href={person.links.officialPage}
                  class="link link-hover"
                  rel="external"
                  target="_blank"
                >
                  {t(lang, "Official page ↗", "ഔദ്യോഗിക പേജ് ↗")}
                </a>
              )}
            </div>
          </div>
        </header>

        {current.length > 0 && (
          <section class="mt-8">
            <h2 class="font-display text-xl font-semibold mb-3">
              {t(lang, "Current roles", "നിലവിലെ പദവികൾ")}
            </h2>
            <ul class="flex flex-col gap-3">
              {current.map((r) => <RoleLine key={r.key} r={r} />)}
            </ul>
          </section>
        )}

        {roles.length > 0
          ? (
            <section class="mt-10">
              <h2 class="font-display text-xl font-semibold mb-1">
                {t(lang, "Career timeline", "ഔദ്യോഗിക ജീവിതരേഖ")}
              </h2>
              <p class="text-sm text-base-content/60 mb-4">
                {t(
                  lang,
                  "Every dated tenure on record — cabinet, postings, and assembly office — newest first.",
                  "രേഖപ്പെടുത്തിയ എല്ലാ പദവികളും — മന്ത്രിസഭ, നിയമനങ്ങൾ, നിയമസഭാ പദവി — ഏറ്റവും പുതിയത് ആദ്യം.",
                )}
              </p>
              <ul class="flex flex-col gap-3">
                {roles.map((r) => <RoleLine key={r.key} r={r} />)}
              </ul>
              {hasAppointmentRole && (
                <div class="mt-4">
                  <AutoLinkDisclaimer lang={lang} />
                </div>
              )}
            </section>
          )
          : (
            <p class="mt-8 text-sm text-base-content/60">
              {t(
                lang,
                "No tenures are on record for this person yet.",
                "ഈ വ്യക്തിക്ക് ഇതുവരെ പദവികളൊന്നും രേഖപ്പെടുത്തിയിട്ടില്ല.",
              )}
            </p>
          )}

        {speeches.length > 0 && (
          <section class="mt-10">
            <h2 class="font-display text-xl font-semibold mb-4">
              {t(lang, "Public speeches", "പൊതു പ്രസംഗങ്ങൾ")}
            </h2>
            <SpeechList speeches={speeches} lang={lang} />
          </section>
        )}

        {(person.source || person.sourceUrl) && (
          <p class="mt-10 text-xs text-base-content/60">
            {t(lang, "Source: ", "ഉറവിടം: ")}
            {person.sourceUrl
              ? (
                <a href={person.sourceUrl} class="link link-hover">
                  {person.source ?? person.sourceUrl}
                </a>
              )
              : person.source}
          </p>
        )}
      </main>
      <Footer lang={lang} />
    </>
  );
});
