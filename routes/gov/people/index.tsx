import { page } from "fresh";
import { define } from "../../../utils.ts";
import { t } from "../../../data/lang.ts";
import {
  listAppointments,
  listConstituencies,
  listDepartments,
  listMinisters,
  listMlas,
  listPersons,
  listSpeakers,
} from "../../../data/db.ts";
import { Header } from "../../../components/Header.tsx";
import { Footer } from "../../../components/Footer.tsx";
import { GovSubnav } from "../../../components/GovSubnav.tsx";
import PeopleDirectory, {
  type PersonCategory,
  type PersonSummary,
} from "../../../islands/PeopleDirectory.tsx";
import type {
  Appointment,
  Department,
  MemberOfLegislative,
  Minister,
  Speaker,
} from "../../../data/types.ts";

/** One normalized role tenure, scored for picking a person's primary role. */
interface Facet {
  seniority: number;
  category: PersonCategory;
  isCurrent: boolean;
  roleEn: string;
  roleMl: string;
  subEn?: string;
  subMl?: string;
  party?: string;
}

const BRANCH_FACET: Record<
  Appointment["branch"],
  { seniority: number; category: PersonCategory }
> = {
  executive: { seniority: 6, category: "bureaucracy" },
  bureaucratic: { seniority: 6, category: "bureaucracy" },
  judiciary: { seniority: 7, category: "judiciary" },
  board: { seniority: 8, category: "boards" },
};

export const handler = define.handlers({
  async GET() {
    const [persons, ministers, speakers, mlas, appointments, depts, consts] =
      await Promise.all([
        listPersons(),
        listMinisters(),
        listSpeakers(),
        listMlas(),
        listAppointments(),
        listDepartments(),
        listConstituencies(),
      ]);

    const deptById = new Map<string, Department>(depts.map((d) => [d.id, d]));
    const constNameById = new Map(consts.map((c) => [c.id, c.name]));

    // Bucket every role record by personId for one-pass aggregation.
    const minByPerson = groupBy(ministers, (m) => m.personId);
    const spkByPerson = groupBy(speakers, (s) => s.personId);
    const mlaByPerson = groupBy(mlas, (m) => m.personId);
    const aptByPerson = groupBy(
      appointments.filter((a): a is Appointment & { personId: string } =>
        !!a.personId
      ),
      (a) => a.personId,
    );

    const summaries: PersonSummary[] = persons.map((p) => {
      const facets: Facet[] = [
        ...(minByPerson.get(p.id) ?? []).map((m) => ministerFacet(m, deptById)),
        ...(spkByPerson.get(p.id) ?? []).map(speakerFacet),
        ...(mlaByPerson.get(p.id) ?? []).map((m) => mlaFacet(m, constNameById)),
        ...(aptByPerson.get(p.id) ?? []).map((a) =>
          appointmentFacet(a, deptById)
        ),
      ];

      const isCurrent = facets.some((f) => f.isCurrent);
      // Primary role: most senior among current tenures if serving, else overall.
      const pool = isCurrent ? facets.filter((f) => f.isCurrent) : facets;
      const primary = pool.sort((a, b) => a.seniority - b.seniority)[0];
      // Party falls back to the most recent cabinet tenure if the primary lacks it.
      const party = primary?.party ??
        (minByPerson.get(p.id) ?? [])
          .map((m) => m.party)
          .find((x) => !!x);

      return {
        slug: p.slug,
        name: p.name,
        nameMl: p.nameMl,
        photoUrl: p.photoUrl,
        roleEn: primary?.roleEn ?? "—",
        roleMl: primary?.roleMl ?? "—",
        subEn: primary?.subEn,
        subMl: primary?.subMl,
        party,
        category: primary?.category ?? "boards",
        isCurrent,
        seniority: primary?.seniority ?? 99,
      };
    });

    return page({ summaries });
  },
});

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    (m.get(k) ?? m.set(k, []).get(k)!).push(it);
  }
  return m;
}

function ministerFacet(m: Minister, deptById: Map<string, Department>): Facet {
  const seniority = m.rank === "CM" ? 0 : m.rank === "Deputy CM" ? 1 : 2;
  const roleEn = m.rank === "CM"
    ? "Chief Minister"
    : m.rank === "Deputy CM"
    ? "Deputy Chief Minister"
    : "Minister";
  const roleMl = m.rank === "CM"
    ? "മുഖ്യമന്ത്രി"
    : m.rank === "Deputy CM"
    ? "ഉപമുഖ്യമന്ത്രി"
    : "മന്ത്രി";
  const deptsEn = m.departmentIds.map((id) => deptById.get(id)?.name ?? id);
  const deptsMl = m.departmentIds.map((id) =>
    deptById.get(id)?.nameMl ?? deptById.get(id)?.name ?? id
  );
  return {
    seniority,
    category: "cabinet",
    isCurrent: !m.termEnd,
    roleEn,
    roleMl,
    subEn: deptsEn.join(" · ") || undefined,
    subMl: deptsMl.join(" · ") || undefined,
    party: m.party,
  };
}

function speakerFacet(s: Speaker): Facet {
  const isDeputy = s.rank === "Deputy Speaker";
  return {
    seniority: isDeputy ? 4 : 3,
    category: "assembly",
    isCurrent: !s.termEnd,
    roleEn: isDeputy ? "Deputy Speaker" : "Speaker",
    roleMl: isDeputy ? "ഉപാധ്യക്ഷൻ" : "സ്പീക്കർ",
    subEn: `${s.assemblyTerm}th Kerala Legislative Assembly`,
    subMl: `${s.assemblyTerm}-ാം കേരള നിയമസഭ`,
  };
}

function mlaFacet(
  m: MemberOfLegislative,
  constNameById: Map<string, string>,
): Facet {
  const constName = constNameById.get(m.constituencyId);
  return {
    seniority: 5,
    category: "assembly",
    isCurrent: !m.termEnd,
    roleEn: "Member of Legislative Assembly",
    roleMl: "നിയമസഭാംഗം",
    subEn: constName
      ? `${constName} · ${m.assemblyTerm}th KLA`
      : `${m.assemblyTerm}th Kerala Legislative Assembly`,
    subMl: constName
      ? `${constName} · ${m.assemblyTerm}-ാം നിയമസഭ`
      : `${m.assemblyTerm}-ാം കേരള നിയമസഭ`,
  };
}

function appointmentFacet(
  a: Appointment,
  deptById: Map<string, Department>,
): Facet {
  const { seniority, category } = BRANCH_FACET[a.branch];
  const dept = a.deptId ? deptById.get(a.deptId) : undefined;
  const subEn = dept?.name ?? a.court;
  const subMl = dept?.nameMl ?? dept?.name ?? a.courtMl ?? a.court;
  return {
    seniority,
    category,
    isCurrent: !a.termEnd,
    roleEn: a.office,
    roleMl: a.officeMl ?? a.office,
    subEn,
    subMl,
  };
}

export default define.page<typeof handler>(function PeopleIndexPage(
  { data, state },
) {
  const lang = state.lang;
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
          {t(lang, "People", "വ്യക്തികൾ")}
        </h1>
        <p class="text-base-content/70 mt-2 max-w-2xl">
          {t(
            lang,
            "Everyone on record holding public office — the cabinet, the assembly, the bureaucracy, the courts, and boards. Currently-serving office-holders are listed first; search or filter to find anyone.",
            "പൊതുപദവി വഹിക്കുന്ന എല്ലാവരും — മന്ത്രിസഭ, നിയമസഭ, ഉദ്യോഗസ്ഥതലം, കോടതികൾ, ബോർഡുകൾ. ഇപ്പോൾ പദവിയിലുള്ളവർ ആദ്യം; തിരയുകയോ ഫിൽട്ടർ ചെയ്യുകയോ ചെയ്യുക.",
          )}
        </p>

        <GovSubnav lang={lang} path={state.path} />

        <PeopleDirectory summaries={data.summaries} lang={lang} />
      </main>
      <Footer lang={lang} />
    </>
  );
});
