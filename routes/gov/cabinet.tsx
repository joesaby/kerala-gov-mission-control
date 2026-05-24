import { page } from "fresh";
import { define } from "../../utils.ts";
import {
  listDepartments,
  listGovernments,
  listMinistersByGovernment,
} from "../../data/db.ts";
import { Header } from "../../components/Header.tsx";
import { Footer } from "../../components/Footer.tsx";
import { MinisterAvatar } from "../../components/MinisterAvatar.tsx";
import type { Department, Government, Minister } from "../../data/types.ts";

interface Data {
  govt: Government | null;
  governments: Government[];
  ministers: Minister[];
  depts: Department[];
}

export const handler = define.handlers<Data>({
  async GET(ctx) {
    const url = new URL(ctx.req.url);
    const slug = url.searchParams.get("g");
    const [governments, depts] = await Promise.all([
      listGovernments(),
      listDepartments(),
    ]);
    const govt: Government | null = slug
      ? (governments.find((g) => g.slug === slug) ?? null)
      : (governments.find((g) => !g.termEnd) ?? null);
    const ministers = govt ? await listMinistersByGovernment(govt.id) : [];
    return page({ govt, governments, ministers, depts });
  },
});

const PARTY_LABEL: Record<string, string> = {
  "CPI(M)": "CPI(M)",
  "CPI": "CPI",
  "INC": "Congress",
  "IUML": "IUML",
  "KC": "Kerala Congress",
  "KC(M)": "KC (M)",
  "RSP": "RSP",
  "JD(S)": "JD(S)",
  "NCP": "NCP",
  "Other": "Other",
  "Independent": "Independent",
};

function fmtTerm(g: Government): string {
  const start = g.termStart.slice(0, 4);
  const end = g.termEnd ? g.termEnd.slice(0, 4) : "present";
  return `${start}–${end}`;
}

function fmtMinisterTerm(m: Minister): string {
  const start = m.termStart ? m.termStart.slice(0, 4) : null;
  if (!start) return "";
  const end = m.termEnd ? m.termEnd.slice(0, 4) : null;
  return end ? `${start}–${end}` : `Since ${start}`;
}

export default define.page<typeof handler>(function Cabinet({ data, state }) {
  const lang = state.lang;
  const { govt, governments, ministers, depts } = data;
  const deptById = new Map(depts.map((d) => [d.id, d]));
  const cm = ministers.find((m) => m.rank === "CM");
  const cabinet = ministers.filter((m) => m.rank !== "CM");
  const sortedGovts = [...governments].sort((a, b) =>
    b.termStart.localeCompare(a.termStart)
  );

  return (
    <>
      <Header lang={lang} />
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* Breadcrumb */}
        <p class="text-xs uppercase tracking-wider text-base-content/60 font-medium mb-1">
          <a href="/gov" class="hover:text-primary transition">
            {lang === "ml" ? "സർക്കാർ" : "Government"}
          </a>
          {" · "}
          {lang === "ml" ? "മന്ത്രിസഭ" : "Cabinet"}
        </p>

        <h1
          class={`text-3xl md:text-4xl font-bold mt-1 mb-2 ${
            lang === "ml" ? "ml" : ""
          }`}
        >
          {lang === "ml" ? "മന്ത്രിസഭയും പോർട്ട്ഫോളിയോകളും" : "Cabinet & Portfolios"}
        </h1>
        {govt && (
          <p class="text-base-content/60 text-sm mb-6">
            <span class="badge badge-sm badge-outline mr-2">
              {govt.coalition}
            </span>
            {lang === "ml" && govt.nameMl ? govt.nameMl : govt.name}
            {" · "}
            {fmtTerm(govt)}
          </p>
        )}

        {/* Government switcher */}
        {sortedGovts.length > 1 && (
          <div
            role="tablist"
            class="tabs tabs-boxed flex-wrap gap-y-1 w-fit mb-8"
          >
            {sortedGovts.map((g) => {
              const active = govt?.id === g.id;
              return (
                <a
                  role="tab"
                  href={g.termEnd ? `/gov/cabinet?g=${g.slug}` : "/gov/cabinet"}
                  class={`tab h-auto py-2 flex-col items-start gap-0 ${
                    active ? "tab-active" : ""
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span class="font-medium">{g.shortName}</span>
                  <span class="text-[11px] opacity-60 tabular-nums">
                    {fmtTerm(g)}
                  </span>
                </a>
              );
            })}
          </div>
        )}

        {/* Chief Minister */}
        {cm && (
          <>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-base-content/50 mb-3">
              {lang === "ml" ? "മുഖ്യമന്ത്രി" : "Chief Minister"}
            </h2>
            <div class="mb-8">
              <MinisterCard m={cm} highlight />
            </div>
          </>
        )}

        {/* Cabinet */}
        <h2 class="text-sm font-semibold uppercase tracking-wider text-base-content/50 mb-3">
          {lang === "ml" ? "മന്ത്രിസഭ" : "Cabinet Ministers"}
          <span class="ml-2 font-normal normal-case text-base-content/40">
            ({cabinet.length})
          </span>
        </h2>
        {cabinet.length === 0
          ? (
            <p class="text-base-content/60 text-sm italic mb-10">
              {lang === "ml"
                ? "ഈ സർക്കാരിന് ഇതുവരെ മന്ത്രിമാർ ലഭ്യമല്ല."
                : "No cabinet ministers on record for this government yet."}
            </p>
          )
          : (
            <ul class="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-12">
              {cabinet.map((m) => (
                <li key={m.id}>
                  <MinisterCard m={m} />
                </li>
              ))}
            </ul>
          )}

        {/* Departments */}
        <h2 class="text-sm font-semibold uppercase tracking-wider text-base-content/50 mb-3">
          {lang === "ml" ? "വകുപ്പുകൾ" : "Departments"}
          <span class="ml-2 font-normal normal-case text-base-content/40">
            ({depts.length})
          </span>
        </h2>
        <ul class="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {depts.map((d) => {
            const m = d.ministerId
              ? ministers.find((x) => x.id === d.ministerId)
              : null;
            const deptName = lang === "ml" && d.nameMl ? d.nameMl : d.name;
            return (
              <li key={d.id}>
                <a
                  href={`/gov/departments/${d.slug}`}
                  class="block p-4 rounded-lg border border-base-300 bg-base-100 hover:border-primary hover:shadow-sm transition"
                >
                  <div class={`font-medium ${lang === "ml" ? "ml" : ""}`}>
                    {deptName}
                  </div>
                  <div class="text-xs text-base-content/60 mt-0.5">
                    {m
                      ? (
                        <>
                          {lang === "ml" ? "മന്ത്രി: " : "Minister: "}
                          <span class="text-base-content/80">
                            {lang === "ml" && m.nameMl ? m.nameMl : m.name}
                          </span>
                        </>
                      )
                      : (
                        <span class="italic">
                          {lang === "ml"
                            ? "മന്ത്രി നിർണ്ണയം തീർന്നിട്ടില്ല"
                            : "Minister assignment pending"}
                        </span>
                      )}
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      </main>
      <Footer lang={lang} />
    </>
  );

  function MinisterCard(
    { m, highlight }: { m: Minister; highlight?: boolean },
  ) {
    const portfolios = m.departmentIds
      .map((id) => deptById.get(id)?.name)
      .filter(Boolean);
    const displayName = lang === "ml" && m.nameMl ? m.nameMl : m.name;
    const subName = lang === "ml" && m.nameMl ? m.name : m.nameMl ?? null;
    const term = fmtMinisterTerm(m);
    return (
      <a
        href={`/gov/ministers/${m.slug}`}
        class={`flex gap-3 p-4 rounded-lg border bg-base-100 hover:shadow-md transition ${
          highlight
            ? "border-primary shadow-sm"
            : "border-base-300 hover:border-primary"
        }`}
      >
        <MinisterAvatar
          minister={m}
          size={highlight ? 72 : 56}
          class="shrink-0"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline justify-between gap-2">
            <h3
              class={`font-semibold truncate ${lang === "ml" ? "ml" : ""}`}
            >
              {displayName}
            </h3>
            {m.party && (
              <span class="badge badge-sm badge-ghost shrink-0">
                {PARTY_LABEL[m.party] ?? m.party}
              </span>
            )}
          </div>
          {subName && (
            <div class="text-xs text-base-content/50 truncate">{subName}</div>
          )}
          <div class="text-xs text-base-content/60 mt-0.5">
            {m.rank === "CM"
              ? (lang === "ml" ? "മുഖ്യമന്ത്രി · " : "Chief Minister · ")
              : ""}
            {m.constituency}
          </div>
          <div class="text-sm mt-2 text-base-content/80 line-clamp-2">
            {portfolios.join(" · ")}
          </div>
          {term && (
            <div class="text-xs text-base-content/50 mt-1 tabular-nums">
              {term}
            </div>
          )}
        </div>
      </a>
    );
  }
});
