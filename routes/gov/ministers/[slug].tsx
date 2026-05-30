import { HttpError, page } from "fresh";
import { define } from "../../../utils.ts";
import { t } from "../../../data/lang.ts";
import {
  getGovernment,
  getMinisterBySlug,
  listDepartments,
  listGovernmentOrders,
  listKpis,
  listSpeechesByPerson,
} from "../../../data/db.ts";
import { Header } from "../../../components/Header.tsx";
import { Footer } from "../../../components/Footer.tsx";
import { KpiCard } from "../../../components/KpiCard.tsx";
import { MinisterAvatar } from "../../../components/MinisterAvatar.tsx";
import { GovernmentOrderList } from "../../../components/GovernmentOrderList.tsx";
import type {
  Department,
  Government,
  GovernmentOrder,
  Kpi,
  Minister,
  PublicSpeech,
} from "../../../data/types.ts";

interface Data {
  minister: Minister;
  govt: Government | null;
  depts: Department[];
  kpis: Kpi[];
  speeches: PublicSpeech[];
  orders: GovernmentOrder[];
  allDepts: Department[];
}

export const handler = define.handlers<Data>({
  async GET(ctx) {
    const minister = await getMinisterBySlug(ctx.params.slug);
    if (!minister) throw new HttpError(404, "Minister not found");
    const [allDepts, allKpis, govt, speeches, allOrders] = await Promise.all([
      listDepartments(),
      listKpis(),
      minister.governmentId
        ? getGovernment(minister.governmentId)
        : Promise.resolve(null),
      listSpeechesByPerson(minister.personId),
      listGovernmentOrders(),
    ]);
    const depts = allDepts.filter((d) => minister.departmentIds.includes(d.id));
    const deptIdSet = new Set(minister.departmentIds);
    const kpis = allKpis.filter((k) =>
      (k.ownerDeptId && deptIdSet.has(k.ownerDeptId)) ||
      k.contributingDeptIds?.some((id) => deptIdSet.has(id))
    );
    const orders = allOrders.filter(
      (o) => o.deptId && deptIdSet.has(o.deptId),
    );
    return page({ minister, govt, depts, kpis, speeches, orders, allDepts });
  },
});

export default define.page<typeof handler>(function MinisterPage(
  { data, state },
) {
  const lang = state.lang;
  const { minister, govt, depts, kpis, speeches, orders, allDepts } = data;
  const deptById = new Map(depts.map((d) => [d.id, d]));

  return (
    <>
      <Header lang={lang} path={state.path} />
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <p class="text-xs">
          <a
            href={govt && govt.termEnd ? `/gov?g=${govt.slug}` : "/gov"}
            class="link link-hover text-base-content/60"
          >
            ← {govt ? govt.shortName : t(lang, "Government", "സർക്കാർ")}
          </a>
        </p>
        <header class="mt-3 flex items-start gap-5 flex-wrap">
          <MinisterAvatar minister={minister} size={112} class="shrink-0" />
          <div class="min-w-0 flex-1">
            <h1
              class={`font-display text-3xl md:text-4xl font-bold ${
                lang === "ml" ? "ml" : ""
              }`}
            >
              {lang === "ml" && minister.nameMl
                ? minister.nameMl
                : minister.name}
            </h1>
            {lang === "ml" && minister.nameMl && (
              <p class="text-base-content/60 text-sm">{minister.name}</p>
            )}
            <p class="text-base-content/70 mt-1">
              {minister.rank === "CM" ? "Chief Minister · " : "Minister · "}
              {minister.constituency}
              {minister.party && <>· {minister.party}</>}
            </p>
            <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/60">
              {govt && (
                <span>
                  <a
                    href={govt.termEnd ? `/gov?g=${govt.slug}` : "/gov"}
                    class="link link-hover"
                  >
                    {govt.shortName}
                  </a>
                  <span class="ml-1 tabular-nums">
                    ({govt.termStart.slice(0, 4)}–{govt.termEnd
                      ? govt.termEnd.slice(0, 4)
                      : "present"})
                  </span>
                </span>
              )}
              {minister.termStart && (
                <span>
                  In office:{" "}
                  <span class="tabular-nums">{minister.termStart}</span>
                  {minister.termEnd && (
                    <>
                      {" – "}
                      <span class="tabular-nums">
                        {minister.termEnd}
                      </span>
                    </>
                  )}
                </span>
              )}
              {minister.wikipediaUrl && (
                <a
                  href={minister.wikipediaUrl}
                  class="link link-hover"
                  rel="external"
                >
                  Wikipedia ↗
                </a>
              )}
            </div>
          </div>
        </header>

        <section class="mt-8">
          <h2 class="font-display text-xl font-semibold mb-3">
            {t(lang, "Portfolios", "പോർട്ട്ഫോളിയോകൾ")}
          </h2>
          <ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {depts.map((d) => (
              <li>
                <a
                  href={`/gov/departments/${d.slug}`}
                  class="surface-link block p-3"
                >
                  <div class="font-medium">{d.name}</div>
                  {d.summary && (
                    <div class="text-xs text-base-content/60 mt-0.5 line-clamp-2">
                      {d.summary}
                    </div>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section class="mt-10">
          <h2 class="font-display text-xl font-semibold mb-4">
            {t(
              lang,
              "KPIs under this minister's portfolios",
              "ഈ മന്ത്രിയുടെ വകുപ്പുകളിലെ സൂചകങ്ങൾ",
            )}
          </h2>
          {kpis.length === 0
            ? (
              <p class="text-base-content/60 text-sm">
                {t(
                  lang,
                  "No headline KPIs are currently mapped to these portfolios.",
                  "ഈ വകുപ്പുകളിലേക്ക് ഇപ്പോൾ പ്രധാന സൂചകങ്ങളൊന്നും ചേർത്തിട്ടില്ല.",
                )}
              </p>
            )
            : (
              <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {kpis.map((kpi) => (
                  <KpiCard
                    key={kpi.id}
                    kpi={kpi}
                    lang={lang}
                    dept={kpi.ownerDeptId
                      ? deptById.get(kpi.ownerDeptId) ?? null
                      : null}
                  />
                ))}
              </div>
            )}
        </section>

        <section class="mt-10">
          <h2 class="font-display text-xl font-semibold mb-4">
            {lang === "ml"
              ? "വകുപ്പുകളിലെ ഉത്തരവുകൾ"
              : "Orders & Circulars under Portfolio"}
          </h2>
          <div class="max-w-4xl">
            <GovernmentOrderList orders={orders} depts={allDepts} lang={lang} />
          </div>
        </section>

        {speeches.length > 0 && (
          <section class="mt-10">
            <h2 class="font-display text-xl font-semibold mb-4">
              {lang === "ml" ? "പൊതു പ്രസംഗങ്ങൾ" : "Public Speeches"}
            </h2>
            <ul class="flex flex-col gap-6">
              {speeches.map((s) => (
                <li
                  key={s.id}
                  class="surface-card overflow-hidden"
                >
                  {/* YouTube embed */}
                  {s.videoId && (
                    <div class="aspect-video w-full bg-black">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${s.videoId}`}
                        title={s.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        class="w-full h-full"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div class="p-4">
                    {/* Title + meta */}
                    <div class="flex flex-wrap items-start justify-between gap-2 mb-1">
                      <h3
                        class={`font-semibold text-base leading-snug ${
                          lang === "ml" && (s.titleMl ?? s.title) ? "ml" : ""
                        }`}
                      >
                        {lang === "ml" && s.titleMl ? s.titleMl : s.title}
                      </h3>
                      <span class="badge badge-sm badge-ghost shrink-0 capitalize">
                        {s.type.replace("-", "\u00A0")}
                      </span>
                    </div>
                    <p class="text-xs text-base-content/60 mb-3">
                      {s.channelName && <span>{s.channelName} ·</span>}
                      <span class="tabular-nums">{s.date}</span>
                    </p>

                    {/* Malayalam description */}
                    {s.descriptionMl && (
                      <p class="text-sm text-base-content/80 ml mb-3 leading-relaxed">
                        {s.descriptionMl}
                      </p>
                    )}

                    {/* Transcript */}
                    {s.transcript && s.transcript.length > 0 && (
                      <details class="mt-2">
                        <summary class="cursor-pointer text-xs font-medium text-base-content/60 hover:text-base-content transition select-none">
                          {lang === "ml" ? "ട്രാൻസ്ക്രിപ്റ്റ് കാണുക" : "Show transcript"}
                        </summary>
                        <ol class="mt-3 flex flex-col gap-2">
                          {s.transcript.map((seg) => {
                            const mins = Math.floor(seg.timeSecs / 60);
                            const secs = seg.timeSecs % 60;
                            const ts = `${mins}:${
                              String(secs).padStart(2, "0")
                            }`;
                            return (
                              <li key={seg.timeSecs} class="flex gap-3 text-sm">
                                {s.videoUrl
                                  ? (
                                    <a
                                      href={`${s.videoUrl}&t=${seg.timeSecs}`}
                                      class="tabular-nums text-xs text-primary link link-hover shrink-0 pt-0.5"
                                      rel="external"
                                      target="_blank"
                                    >
                                      {ts}
                                    </a>
                                  )
                                  : (
                                    <span class="tabular-nums text-xs text-base-content/40 shrink-0 pt-0.5">
                                      {ts}
                                    </span>
                                  )}
                                <span class="ml leading-relaxed">
                                  {seg.text}
                                </span>
                              </li>
                            );
                          })}
                        </ol>
                      </details>
                    )}

                    {/* Source */}
                    {(s.source || s.sourceUrl) && (
                      <p class="mt-3 text-xs text-base-content/50">
                        {lang === "ml" ? "ഉറവിടം: " : "Source: "}
                        {s.sourceUrl
                          ? (
                            <a
                              href={s.sourceUrl}
                              class="link link-hover"
                              rel="external"
                              target="_blank"
                            >
                              {s.source ?? s.sourceUrl}
                            </a>
                          )
                          : s.source}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(minister.source || minister.sourceUrl) && (
          <p class="mt-10 text-xs text-base-content/60">
            {t(lang, "Source: ", "ഉറവിടം: ")}
            {minister.sourceUrl
              ? (
                <a href={minister.sourceUrl} class="link link-hover">
                  {minister.source ?? minister.sourceUrl}
                </a>
              )
              : minister.source}
          </p>
        )}
      </main>
      <Footer lang={lang} />
    </>
  );
});
