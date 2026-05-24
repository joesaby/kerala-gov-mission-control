import { page } from "fresh";
import { define } from "../../utils.ts";
import {
  listDepartments,
  listGovernmentOrders,
  listGovernments,
  listManifestoGoals,
  listMinistersByGovernment,
} from "../../data/db.ts";
import { Header } from "../../components/Header.tsx";
import { Footer } from "../../components/Footer.tsx";
import { MinisterAvatar } from "../../components/MinisterAvatar.tsx";
import type {
  Government,
  GovernmentOrder,
  ManifestoGoal,
  Minister,
} from "../../data/types.ts";

interface Data {
  govt: Government | null;
  governments: Government[];
  cm: Minister | null;
  ministerCount: number;
  deptCount: number;
  termOrders: GovernmentOrder[];
  goals: ManifestoGoal[];
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

    const termOrders = govt
      ? allOrders.filter(
        (o) =>
          o.date >= govt.termStart &&
          (!govt.termEnd || o.date <= govt.termEnd),
      )
      : [];

    const cm = ministers.find((m) => m.rank === "CM") ?? null;

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
      cm,
      ministerCount: ministers.length,
      deptCount: depts.length,
      termOrders,
      goals,
      coalitionBreakdown,
    });
  },
});

function fmtTerm(g: Government): string {
  const start = g.termStart.slice(0, 4);
  const end = g.termEnd ? g.termEnd.slice(0, 4) : "present";
  return `${start}–${end}`;
}

function fmtFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function daysInOffice(termStart: string, termEnd?: string): number {
  const start = new Date(termStart);
  const end = termEnd ? new Date(termEnd) : new Date();
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

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

export default define.page<typeof handler>(function GovernmentHub(
  { data, state },
) {
  const lang = state.lang;
  const {
    govt,
    governments,
    cm,
    ministerCount,
    deptCount,
    termOrders,
    goals,
    coalitionBreakdown,
  } = data;

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
      <Header lang={lang} />
      <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
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
                  key={g.id}
                  role="tab"
                  href={g.termEnd ? `/gov?g=${g.slug}` : "/gov"}
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

        {/* ── Hero ── */}
        <section class="mb-10">
          <div class="flex flex-wrap items-center gap-2 mb-2">
            {govt && (
              <span class="badge badge-outline badge-sm">{govt.coalition}</span>
            )}
            {govt?.assemblyTerm && (
              <span class="badge badge-ghost badge-sm">
                {govt.assemblyTerm}th Kerala Legislative Assembly
              </span>
            )}
            {isIncumbent && (
              <span class="badge badge-success badge-sm">Incumbent</span>
            )}
          </div>

          <h1
            class={`text-3xl md:text-4xl font-bold leading-tight ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {govtName}
          </h1>

          {govt && (
            <p class="text-base-content/60 mt-2 text-sm tabular-nums">
              {fmtFullDate(govt.termStart)}
              {govt.termEnd ? ` – ${fmtFullDate(govt.termEnd)}` : " – present"}
              <span class="mx-2 text-base-content/30">·</span>
              <span class="font-semibold text-base-content">
                {days}
              </span>{" "}
              {lang === "ml" ? "ദിവസം" : "days"}
            </p>
          )}

          {govt?.summary && (
            <p class="mt-4 text-base-content/70 max-w-2xl leading-relaxed">
              {govt.summary}
            </p>
          )}
        </section>

        {/* ── CM profile ── */}
        {cm && (
          <section class="mb-10">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-3">
              {lang === "ml" ? "മുഖ്യമന്ത്രി" : "Chief Minister"}
            </h2>
            <a
              href={`/gov/ministers/${cm.slug}`}
              class="flex items-center gap-5 p-5 rounded-xl border border-primary/30 bg-base-100 hover:shadow-md hover:border-primary transition max-w-md"
            >
              <MinisterAvatar minister={cm} size={80} class="shrink-0" />
              <div class="min-w-0">
                <div class="flex items-baseline gap-2 flex-wrap">
                  <h3
                    class={`text-lg font-bold ${lang === "ml" ? "ml" : ""}`}
                  >
                    {lang === "ml" && cm.nameMl ? cm.nameMl : cm.name}
                  </h3>
                  {cm.party && (
                    <span class="badge badge-sm badge-ghost">
                      {PARTY_LABEL[cm.party] ?? cm.party}
                    </span>
                  )}
                </div>
                {lang === "ml" && cm.nameMl && (
                  <div class="text-sm text-base-content/50">{cm.name}</div>
                )}
                {cm.constituency && (
                  <div class="text-sm text-base-content/60 mt-1">
                    {cm.constituency}
                  </div>
                )}
                {cm.termStart && (
                  <div class="text-xs text-base-content/40 mt-1 tabular-nums">
                    {lang === "ml" ? "സ്ഥാനമേറ്റത്: " : "In office since "}
                    {fmtFullDate(cm.termStart)}
                  </div>
                )}
              </div>
            </a>
          </section>
        )}

        {/* ── Navigation cards ── */}
        <section class="mb-10">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-3">
            {lang === "ml" ? "വിഭാഗങ്ങൾ" : "Explore"}
          </h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <NavCard
              href={govt?.termEnd
                ? `/gov/cabinet?g=${govt.slug}`
                : "/gov/cabinet"}
              title={lang === "ml" ? "മന്ത്രിസഭ" : "Cabinet"}
              stat={String(ministerCount)}
              sub={lang === "ml" ? "മന്ത്രിമാർ" : "ministers"}
              accent="border-t-primary"
            />
            <NavCard
              href="/gov/manifesto"
              title={lang === "ml" ? "വാഗ്ദാനങ്ങൾ" : "Promises"}
              stat={goals.length > 0 ? `${goalsActioned}/${goals.length}` : "–"}
              sub={lang === "ml" ? "നടപ്പിലാക്കി" : "actioned"}
              accent="border-t-secondary"
              disabled={goals.length === 0}
            />
            <NavCard
              href="#orders"
              title={lang === "ml" ? "ഉത്തരവുകൾ" : "Orders"}
              stat={String(termOrders.length)}
              sub={lang === "ml" ? "ഈ കാലാവധിയിൽ" : "this term"}
              accent="border-t-accent"
            />
            <NavCard
              href={govt?.termEnd
                ? `/gov/cabinet?g=${govt.slug}#departments`
                : "/gov/cabinet#departments"}
              title={lang === "ml" ? "വകുപ്പുകൾ" : "Departments"}
              stat={String(deptCount)}
              sub={lang === "ml" ? "ഓഫീസുകൾ" : "offices"}
              accent="border-t-info"
            />
          </div>
        </section>

        {/* ── Coalition breakdown ── */}
        {coalitionBreakdown.length > 0 && (
          <section class="mb-10">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-3">
              {lang === "ml"
                ? "സഖ്യ ഘടന (മന്ത്രിസ്ഥാനം)"
                : "Coalition composition (cabinet seats)"}
            </h2>
            <div class="flex flex-col gap-2 max-w-sm">
              {coalitionBreakdown.map(({ party, count }) => {
                const pct = Math.round((count / ministerCount) * 100);
                return (
                  <div key={party} class="flex items-center gap-3 text-sm">
                    <span class="w-28 shrink-0 font-medium text-base-content/80">
                      {PARTY_LABEL[party] ?? party}
                    </span>
                    <div class="flex-1 bg-base-200 rounded-full h-2 overflow-hidden">
                      <div
                        class="bg-primary h-2 rounded-full"
                        style={`width: ${pct}%`}
                      />
                    </div>
                    <span class="w-8 text-right tabular-nums text-base-content/60">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Recent orders (compact) ── */}
        {termOrders.length > 0 && (
          <section id="orders" class="mb-10">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-xs font-semibold uppercase tracking-wider text-base-content/50">
                {lang === "ml" ? "സമീപകാല ഉത്തരവുകൾ" : "Recent orders & decisions"}
              </h2>
            </div>
            <ul class="flex flex-col gap-2">
              {termOrders.slice(0, 5).map((o) => (
                <li
                  key={o.id}
                  class="flex items-start justify-between gap-3 p-3 rounded-lg border border-base-300 bg-base-100 text-sm hover:border-primary/40 transition"
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span class="badge badge-xs badge-ghost font-mono">
                        {o.type}
                      </span>
                      <time class="text-xs text-base-content/50 tabular-nums">
                        {new Date(o.date).toLocaleDateString(
                          lang === "ml" ? "ml-IN" : "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                            timeZone: "Asia/Kolkata",
                          },
                        )}
                      </time>
                      {(o.manifestoGoalIds?.length ?? 0) > 0 && (
                        <span class="badge badge-xs badge-warning">
                          ✦ {lang === "ml" ? "വാഗ്ദാനം" : "Manifesto"}
                        </span>
                      )}
                    </div>
                    <p class="text-base-content/80 line-clamp-1 leading-snug">
                      {lang === "ml" && o.subjectMl ? o.subjectMl : o.subject}
                    </p>
                  </div>
                  <a
                    href={o.meta.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-xs btn-ghost shrink-0"
                  >
                    PDF ↗
                  </a>
                </li>
              ))}
            </ul>
            {termOrders.length > 5 && (
              <p class="text-xs text-base-content/50 mt-2 text-right">
                +{termOrders.length - 5}{" "}
                {lang === "ml" ? "കൂടുതൽ ഉത്തരവുകൾ" : "more orders"}
              </p>
            )}
          </section>
        )}

        {/* ── Historical governments ── */}
        {sortedGovts.length > 1 && (
          <section class="pt-8 border-t border-base-200">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-4">
              {lang === "ml" ? "കേരളത്തിലെ മുൻ സർക്കാരുകൾ" : "Previous governments"}
            </h2>
            <ul class="flex flex-col gap-2">
              {sortedGovts.filter((g) => g.id !== govt?.id).map((g) => (
                <li key={g.id}>
                  <a
                    href={`/gov?g=${g.slug}`}
                    class="flex items-center justify-between px-4 py-3 rounded-lg border border-base-300 bg-base-100 hover:border-primary hover:shadow-sm transition text-sm"
                  >
                    <div>
                      <span class="font-medium">
                        {lang === "ml" && g.nameMl ? g.nameMl : g.name}
                      </span>
                      <span class="ml-2 badge badge-xs badge-outline">
                        {g.coalition}
                      </span>
                    </div>
                    <span class="tabular-nums text-base-content/50 text-xs">
                      {fmtTerm(g)}
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
});

function NavCard(
  { href, title, stat, sub, accent, disabled }: {
    href: string;
    title: string;
    stat: string;
    sub: string;
    accent: string;
    disabled?: boolean;
  },
) {
  return (
    <a
      href={disabled ? undefined : href}
      class={`flex flex-col gap-1 p-4 rounded-xl border border-base-300 bg-base-100 border-t-4 ${accent} transition ${
        disabled
          ? "opacity-40 cursor-default"
          : "hover:shadow-md hover:border-primary hover:border-t-4"
      }`}
    >
      <span class="text-2xl font-bold tabular-nums text-base-content">
        {stat}
      </span>
      <span class="text-xs text-base-content/50">{sub}</span>
      <span class="text-sm font-semibold text-base-content mt-1">{title}</span>
    </a>
  );
}
