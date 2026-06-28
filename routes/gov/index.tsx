import { page } from "fresh";
import { define } from "../../utils.ts";
import { t, translateParty } from "../../data/lang.ts";
import type { Lang } from "../../data/lang.ts";
import {
  listDepartments,
  listGovernmentOrders,
  listGovernments,
  listManifestoGoals,
  listMinistersByGovernment,
} from "../../data/db.ts";
import { Header } from "../../components/Header.tsx";
import { Footer } from "../../components/Footer.tsx";
import { GovSubnav } from "../../components/GovSubnav.tsx";
import { MinisterAvatar } from "../../components/MinisterAvatar.tsx";
import type {
  Department,
  Government,
  ManifestoGoal,
  Minister,
} from "../../data/types.ts";

interface Data {
  govt: Government | null;
  governments: Government[];
  ministers: Minister[];
  depts: Department[];
  goals: ManifestoGoal[];
  ordersCount: number;
  coalitionBreakdown: { party: string; count: number }[];
}

export const handler = define.handlers<Data>({
  async GET(ctx) {
    const url = new URL(ctx.req.url);
    const slug = url.searchParams.get("g");

    const [governments, depts, allOrders] = await Promise.all([
      listGovernments(),
      listDepartments(),
      listGovernmentOrders(),
    ]);

    const govt: Government | null = slug
      ? (governments.find((g) => g.slug === slug) ?? null)
      : (governments.find((g) => !g.termEnd) ?? null);

    const [ministers, goals] = await Promise.all([
      govt ? listMinistersByGovernment(govt.id) : Promise.resolve([]),
      govt ? listManifestoGoals(govt.id) : Promise.resolve([]),
    ]);

    const ordersCount = govt
      ? allOrders.filter(
        (o) =>
          o.date >= govt.termStart &&
          (!govt.termEnd || o.date <= govt.termEnd),
      ).length
      : 0;

    // Derive coalition seat breakdown from minister party counts
    const partyCounts = new Map<string, number>();
    for (const m of ministers) {
      if (m.party) {
        partyCounts.set(m.party, (partyCounts.get(m.party) ?? 0) + 1);
      }
    }
    const coalitionBreakdown = [...partyCounts.entries()]
      .map(([party, count]) => ({ party, count }))
      .sort((a, b) => b.count - a.count);

    return page({
      govt,
      governments,
      ministers,
      depts,
      goals,
      ordersCount,
      coalitionBreakdown,
    });
  },
});

function fmtTerm(g: Government, lang: Lang): string {
  const start = g.termStart.slice(0, 4);
  const end = g.termEnd
    ? g.termEnd.slice(0, 4)
    : (lang === "ml" ? "തുടരുന്നു" : "present");
  return `${start}–${end}`;
}

function fmtFullDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function fmtMinisterTerm(m: Minister, lang: Lang): string {
  const start = m.termStart ? m.termStart.slice(0, 4) : null;
  if (!start) return "";
  const end = m.termEnd ? m.termEnd.slice(0, 4) : null;
  return end
    ? `${start}–${end}`
    : (lang === "ml" ? `${start} മുതൽ` : `Since ${start}`);
}

function daysInOffice(termStart: string, termEnd?: string): number {
  const start = new Date(termStart);
  const end = termEnd ? new Date(termEnd) : new Date();
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

export default define.page<typeof handler>(function GovernmentHub(
  { data, state },
) {
  const lang = state.lang;
  const { govt, governments, ministers, depts, goals } = data;
  const { coalitionBreakdown } = data;

  const deptById = new Map(depts.map((d) => [d.id, d]));
  const cm = ministers.find((m) => m.rank === "CM") ?? null;
  const cabinet = ministers.filter((m) => m.rank !== "CM");
  const ministerCount = ministers.length;

  const sortedGovts = [...governments].sort((a, b) =>
    b.termStart.localeCompare(a.termStart)
  );

  const goalsActioned = goals.filter(
    (g) => g.status === "in-progress" || g.status === "fulfilled",
  ).length;

  const days = govt ? daysInOffice(govt.termStart, govt.termEnd) : 0;
  const isIncumbent = govt ? !govt.termEnd : false;
  const govtName = govt
    ? (lang === "ml" && govt.nameMl ? govt.nameMl : govt.name)
    : (lang === "ml" ? "കേരള സർക്കാർ" : "Government of Kerala");

  return (
    <>
      <Header lang={lang} path={state.path} />
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* Government switcher */}
        {sortedGovts.length > 1 && (
          <div
            role="tablist"
            class="tabs tabs-boxed flex-wrap gap-y-1 w-fit mb-6"
          >
            {sortedGovts.map((g) => {
              const active = govt?.id === g.id;
              return (
                <a
                  key={g.id}
                  role="tab"
                  href={g.termEnd ? `/gov?g=${g.slug}` : "/gov"}
                  class={`tab h-auto py-2 flex-col items-start gap-0 ${
                    active ? "tab-active" : ""
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span class="font-medium">
                    {lang === "ml" && g.shortNameMl
                      ? g.shortNameMl
                      : g.shortName}
                  </span>
                  <span class="text-[11px] opacity-60 tabular-nums">
                    {fmtTerm(g, lang)}
                  </span>
                </a>
              );
            })}
          </div>
        )}

        <GovSubnav lang={lang} path={state.path} />

        {/* ── Hero ── */}
        <section class="hero-band rounded-box border border-base-300 p-6 md:p-8 mb-8">
          <div class="flex flex-wrap items-center gap-2 mb-2">
            {govt && (
              <span class="badge badge-outline badge-sm">{govt.coalition}</span>
            )}
            {govt?.assemblyTerm && (
              <span class="badge badge-ghost badge-sm">
                {lang === "ml"
                  ? `${govt.assemblyTerm}-ാം കേരള നിയമസഭ`
                  : `${govt.assemblyTerm}th Kerala Legislative Assembly`}
              </span>
            )}
            {isIncumbent && (
              <span class="badge badge-success badge-sm gap-1">
                ● {lang === "ml" ? "നിലവിലെ സർക്കാർ" : "Incumbent"}
              </span>
            )}
          </div>
          <h1
            class={`font-display text-3xl md:text-4xl font-bold leading-tight ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {govtName}
          </h1>
          {govt && (
            <p class="text-base-content/60 mt-2 text-sm tabular-nums">
              {fmtFullDate(govt.termStart, lang)}
              {govt.termEnd
                ? ` – ${fmtFullDate(govt.termEnd, lang)}`
                : ` – ${t(lang, "present", "ഇതുവരെ")}`}
              <span class="mx-2 text-base-content/30">·</span>
              <span class="font-semibold text-base-content">{days}</span>{" "}
              {lang === "ml" ? "ദിവസങ്ങൾ അധികാരത്തിൽ" : "days in office"}
            </p>
          )}
          {(lang === "ml" && govt?.summaryMl
            ? govt.summaryMl
            : govt?.summary) && (
            <p class="mt-4 text-base-content/70 max-w-2xl leading-relaxed">
              {lang === "ml" && govt?.summaryMl
                ? govt.summaryMl
                : govt?.summary}
            </p>
          )}
        </section>

        {/* ── Split: identity rail + cabinet/departments ── */}
        <div class="grid gap-8 lg:grid-cols-12">
          {/* Left rail (sticky on desktop) */}
          <aside class="lg:col-span-4 lg:sticky lg:top-20 lg:self-start flex flex-col gap-6">
            {/* Chief Minister */}
            {cm && (
              <div>
                <h2 class="eyebrow mb-2">
                  {lang === "ml" ? "മുഖ്യമന്ത്രി" : "Chief Minister"}
                </h2>
                <a
                  href={`/gov/ministers/${cm.slug}`}
                  class="surface-link kasavu-top flex items-center gap-4 p-4"
                >
                  <MinisterAvatar minister={cm} size={64} class="shrink-0" />
                  <div class="min-w-0">
                    <h3
                      class={`font-bold leading-tight ${
                        lang === "ml" ? "ml" : ""
                      }`}
                    >
                      {lang === "ml" && cm.nameMl ? cm.nameMl : cm.name}
                    </h3>
                    {cm.party && (
                      <span class="badge badge-xs badge-ghost mt-1">
                        {translateParty(cm.party, lang)}
                      </span>
                    )}
                    {cm.constituency && (
                      <div class="text-xs text-base-content/60 mt-1">
                        {cm.constituency}
                      </div>
                    )}
                  </div>
                </a>
              </div>
            )}

            {/* Quick stats */}
            <div class="grid grid-cols-2 gap-3">
              <a href="#cabinet" class="surface-link p-3 flex flex-col gap-0.5">
                <span class="text-2xl font-bold tabular-nums font-display">
                  {ministerCount}
                </span>
                <span class="text-xs text-base-content/55">
                  {lang === "ml" ? "മന്ത്രിമാർ" : "ministers"}
                </span>
              </a>
              <a
                href="#departments"
                class="surface-link p-3 flex flex-col gap-0.5"
              >
                <span class="text-2xl font-bold tabular-nums font-display">
                  {depts.length}
                </span>
                <span class="text-xs text-base-content/55">
                  {lang === "ml" ? "വകുപ്പുകൾ" : "departments"}
                </span>
              </a>
            </div>

            {/* Coalition breakdown */}
            {coalitionBreakdown.length > 0 && (
              <div>
                <h2 class="eyebrow mb-2">
                  {lang === "ml" ? "സഖ്യ ഘടന" : "Coalition composition"}
                </h2>
                <div class="flex flex-col gap-2">
                  {coalitionBreakdown.map(({ party, count }) => {
                    const pct = Math.round((count / ministerCount) * 100);
                    return (
                      <div key={party} class="flex items-center gap-3 text-sm">
                        <span class="w-24 shrink-0 font-medium text-base-content/80 truncate">
                          {translateParty(party, lang)}
                        </span>
                        <div class="flex-1 bg-base-300 rounded-full h-2 overflow-hidden">
                          <div
                            class="bg-primary h-2 rounded-full"
                            style={`width: ${pct}%`}
                          />
                        </div>
                        <span class="w-6 text-right tabular-nums text-base-content/60">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cross-links */}
            <div class="flex flex-col gap-2">
              <a
                href="/gov/orders"
                class="btn btn-sm btn-outline justify-start"
              >
                {lang === "ml" ? "ഉത്തരവുകൾ" : "Orders"}
              </a>
              <a
                href="/gov/decisions"
                class="btn btn-sm btn-outline justify-start"
              >
                {lang === "ml" ? "മന്ത്രിസഭാ തീരുമാനങ്ങൾ" : "Cabinet decisions"}
              </a>
              <a
                href="/gov/appointments"
                class="btn btn-sm btn-outline justify-start"
              >
                {lang === "ml" ? "നിയമനങ്ങൾ" : "Appointments"}
              </a>
              <a
                href="/gov/people"
                class="btn btn-sm btn-outline justify-start"
              >
                {lang === "ml" ? "വ്യക്തികൾ" : "People"}
              </a>
              <a
                href="/gov/manifesto"
                class="btn btn-sm btn-outline justify-start"
              >
                {lang === "ml" ? "വാഗ്ദാനങ്ങൾ" : "Promises"}
                <span class="ml-auto tabular-nums opacity-60">
                  {goals.length > 0 ? `${goalsActioned}/${goals.length}` : ""}
                </span>
              </a>
            </div>
          </aside>

          {/* Right main column */}
          <div class="lg:col-span-8 flex flex-col gap-10">
            {/* Cabinet ministers */}
            <section id="cabinet">
              <h2 class="font-display text-xl font-semibold mb-1">
                {lang === "ml" ? "മന്ത്രിസഭ" : "Cabinet Ministers"}
                <span class="ml-2 text-sm font-normal text-base-content/40 tabular-nums">
                  {cabinet.length}
                </span>
              </h2>
              <p class="text-sm text-base-content/60 mb-4">
                {lang === "ml"
                  ? "ഓരോ മന്ത്രിയും അവരുടെ വകുപ്പുകളും"
                  : "Each minister and the portfolios they hold."}
              </p>
              {cabinet.length === 0
                ? (
                  <p class="text-base-content/60 text-sm italic">
                    {lang === "ml"
                      ? "ഈ സർക്കാരിന് ഇതുവരെ മന്ത്രിമാർ ലഭ്യമല്ല."
                      : "No cabinet ministers on record for this government yet."}
                  </p>
                )
                : (
                  <ul class="grid gap-3 sm:grid-cols-2">
                    {cabinet.map((m) => (
                      <li key={m.id}>
                        <MinisterCard m={m} />
                      </li>
                    ))}
                  </ul>
                )}
            </section>

            {/* Departments */}
            <section id="departments">
              <h2 class="font-display text-xl font-semibold mb-1">
                {lang === "ml" ? "വകുപ്പുകൾ" : "Departments"}
                <span class="ml-2 text-sm font-normal text-base-content/40 tabular-nums">
                  {depts.length}
                </span>
              </h2>
              <p class="text-sm text-base-content/60 mb-4">
                {lang === "ml"
                  ? "സ്ഥിരമായ വകുപ്പുകൾ — ഓരോന്നിന്റെയും ചുമതലയുള്ള മന്ത്രി"
                  : "Standing departments and the minister accountable for each."}
              </p>
              <ul class="grid gap-2 sm:grid-cols-2">
                {depts.map((d) => {
                  const m = d.ministerId
                    ? ministers.find((x) => x.id === d.ministerId)
                    : null;
                  const deptName = lang === "ml" && d.nameMl
                    ? d.nameMl
                    : d.name;
                  return (
                    <li key={d.id}>
                      <a
                        href={`/gov/departments/${d.slug}`}
                        class="surface-link block p-4"
                      >
                        <div
                          class={`font-medium ${lang === "ml" ? "ml" : ""}`}
                        >
                          {deptName}
                        </div>
                        <div class="text-xs text-base-content/60 mt-0.5">
                          {m
                            ? (
                              <>
                                {lang === "ml" ? "മന്ത്രി: " : "Minister: "}
                                <span class="text-base-content/80">
                                  {lang === "ml" && m.nameMl
                                    ? m.nameMl
                                    : m.name}
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
            </section>
          </div>
        </div>

        {/* ── Historical governments ── */}
        {sortedGovts.length > 1 && (
          <section class="mt-12 pt-8 border-t border-base-300">
            <h2 class="eyebrow mb-4">
              {lang === "ml" ? "കേരളത്തിലെ മുൻ സർക്കാരുകൾ" : "Previous governments"}
            </h2>
            <ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sortedGovts.filter((g) => g.id !== govt?.id).map((g) => (
                <li key={g.id}>
                  <a
                    href={`/gov?g=${g.slug}`}
                    class="surface-link flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <span class="font-medium">
                      {lang === "ml" && g.nameMl ? g.nameMl : g.name}
                    </span>
                    <span class="tabular-nums text-base-content/50 text-xs">
                      {fmtTerm(g, lang)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <Footer lang={lang} />
    </>
  );

  function MinisterCard({ m }: { m: Minister }) {
    const portfolios = m.departmentIds
      .map((id) => {
        const d = deptById.get(id);
        return d ? (lang === "ml" && d.nameMl ? d.nameMl : d.name) : null;
      })
      .filter(Boolean);
    const displayName = lang === "ml" && m.nameMl ? m.nameMl : m.name;
    const subName = lang === "ml" && m.nameMl ? m.name : m.nameMl ?? null;
    const term = fmtMinisterTerm(m, lang);
    return (
      <a href={`/gov/ministers/${m.slug}`} class="surface-link flex gap-3 p-4">
        <MinisterAvatar minister={m} size={56} class="shrink-0" />
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline justify-between gap-2">
            <h3 class={`font-semibold truncate ${lang === "ml" ? "ml" : ""}`}>
              {displayName}
            </h3>
            {m.party && (
              <span class="badge badge-sm badge-ghost shrink-0">
                {translateParty(m.party, lang)}
              </span>
            )}
          </div>
          {subName && (
            <div class="text-xs text-base-content/50 truncate">{subName}</div>
          )}
          {m.constituency && (
            <div class="text-xs text-base-content/60 mt-0.5">
              {m.constituency}
            </div>
          )}
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
