import { HttpError, page } from "fresh";
import { define } from "../../../utils.ts";
import { t } from "../../../data/lang.ts";
import {
  getDepartment,
  getGovernmentOrder,
  getManifestoGoal,
} from "../../../data/db.ts";
import { Header } from "../../../components/Header.tsx";
import { Footer } from "../../../components/Footer.tsx";
import type {
  Department,
  GovernmentOrder,
  ManifestoGoal,
} from "../../../data/types.ts";

interface Data {
  order: GovernmentOrder;
  dept: Department | null;
  goals: ManifestoGoal[];
}

export const handler = define.handlers<Data>({
  async GET(ctx) {
    const order = await getGovernmentOrder(ctx.params.id);
    if (!order) throw new HttpError(404, "Government order not found");
    const [dept, goals] = await Promise.all([
      order.deptId ? getDepartment(order.deptId) : Promise.resolve(null),
      Promise.all(
        (order.manifestoGoalIds ?? []).map((id) => getManifestoGoal(id)),
      ).then((gs) => gs.filter(Boolean) as ManifestoGoal[]),
    ]);
    return page({ order, dept, goals });
  },
});

const ORDER_TYPE_LABEL: Record<
  string,
  { en: string; ml: string; class: string }
> = {
  P: { en: "Policy Order", ml: "നയപരമായ ഉത്തരവ്", class: "badge-primary" },
  Ms: { en: "Memo Order", ml: "മെമ്മോറാണ്ടം ഉത്തരവ്", class: "badge-secondary" },
  Rt: { en: "Routine Order", ml: "സാധാരണ ഉത്തരവ്", class: "badge-accent" },
  SRO: { en: "SRO", ml: "എസ്.ആർ.ഒ.", class: "badge-warning" },
  Circular: { en: "Circular", ml: "സർക്കുലർ", class: "badge-info" },
  Bill: { en: "Legislative Bill", ml: "നിയമസഭാ ബിൽ", class: "badge-error" },
};

function fmtDate(iso: string, lang: "en" | "ml"): string {
  return new Date(iso).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export default define.page<typeof handler>(function OrderDetail(
  { data, state },
) {
  const lang = state.lang;
  const { order, dept, goals } = data;
  const typeInfo = ORDER_TYPE_LABEL[order.type] ??
    { en: order.type, ml: order.type, class: "badge-ghost" };
  const deptName = dept
    ? (lang === "ml" && dept.nameMl ? dept.nameMl : dept.name)
    : null;

  return (
    <>
      <Header lang={lang} path={state.path} />
      <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* Breadcrumb */}
        <p class="eyebrow mb-2">
          <a href="/gov" class="hover:text-primary transition">
            {t(lang, "Government", "സർക്കാർ")}
          </a>
          {" · "}
          {t(lang, "Government Orders", "സർക്കാർ ഉത്തരവുകൾ")}
        </p>

        {/* Title block */}
        <div class="flex flex-wrap items-center gap-2 mb-2">
          <span class={`badge ${typeInfo.class} badge-sm font-semibold`}>
            {lang === "ml" ? typeInfo.ml : typeInfo.en}
          </span>
          <span class="badge badge-sm badge-ghost font-mono tabular-nums">
            {order.goNumber}
          </span>
          {order.dataStatus !== "verified" && (
            <span class="badge badge-sm badge-outline text-warning">
              {order.dataStatus === "tbd"
                ? t(lang, "Needs review", "പരിശോധന വേണം")
                : t(lang, "Unverified", "സ്ഥിരീകരിക്കാത്തത്")}
            </span>
          )}
        </div>

        <h1
          class={`font-display text-2xl md:text-3xl font-bold leading-tight ${
            lang === "ml" ? "ml" : ""
          }`}
        >
          {lang === "ml" && order.subjectMl ? order.subjectMl : order.subject}
        </h1>

        <p class="text-sm text-base-content/60 mt-2 tabular-nums">
          {t(lang, "Issued", "പുറപ്പെടുവിച്ചത്")} {fmtDate(order.date, lang)}
          {order.effectiveDate && (
            <>
              <span class="mx-2 text-base-content/30">·</span>
              {t(lang, "Effective", "പ്രാബല്യത്തിൽ")}{" "}
              {fmtDate(order.effectiveDate, lang)}
            </>
          )}
        </p>

        {/* Meta chips */}
        <div class="mt-4 flex flex-wrap items-center gap-2 text-sm">
          {dept
            ? (
              <a
                href={`/gov/departments/${dept.slug}`}
                class="badge badge-outline hover:badge-primary transition"
              >
                {deptName}
              </a>
            )
            : (
              <span class="badge badge-ghost italic text-base-content/50">
                {t(lang, "Department untagged", "വകുപ്പ് ലഭ്യമല്ല")}
              </span>
            )}
          {goals.map((g) => (
            <a
              href="/gov/manifesto"
              class="badge badge-accent gap-1"
              title={lang === "ml" && g.titleMl ? g.titleMl : g.title}
            >
              ✦ {lang === "ml" && g.titleMl ? g.titleMl : g.title}
            </a>
          ))}
        </div>

        {/* ── Side-by-side EN / ML ingested content ── */}
        <section class="mt-8">
          <h2 class="eyebrow mb-3">
            {t(lang, "Subject · English & Malayalam", "വിഷയം · ഇംഗ്ലീഷ് & മലയാളം")}
          </h2>
          <div class="grid gap-4 md:grid-cols-2">
            <div class="surface-card p-5">
              <p class="eyebrow mb-2">English</p>
              <p class="leading-relaxed text-base-content/90">
                {order.subject}
              </p>
            </div>
            <div class="surface-card p-5">
              <p class="eyebrow mb-2">മലയാളം</p>
              {order.subjectMl
                ? (
                  <p class="ml leading-relaxed text-base-content/90">
                    {order.subjectMl}
                  </p>
                )
                : (
                  <p class="text-sm italic text-base-content/50">
                    {t(
                      lang,
                      "Malayalam subject not yet available — we never machine-translate official terminology. Read the source PDF below.",
                      "മലയാള വിഷയം ഇതുവരെ ലഭ്യമല്ല — ഔദ്യോഗിക പദങ്ങൾ യന്ത്രവിവർത്തനം ചെയ്യാറില്ല. താഴെയുള്ള പി.ഡി.എഫ് കാണുക.",
                    )}
                  </p>
                )}
            </div>
          </div>
          <p class="mt-2 text-xs text-base-content/50">
            {t(
              lang,
              "The subject lines above are extracted from the source PDF during automated ingest. The full text lives in the document below.",
              "മുകളിലെ വിഷയ വരികൾ സ്വയമേവയുള്ള ഇൻജസ്റ്റ് സമയത്ത് പി.ഡി.എഫിൽ നിന്ന് എടുത്തവയാണ്. പൂർണ്ണ വാചകം താഴെയുള്ള രേഖയിലുണ്ട്.",
            )}
          </p>
        </section>

        {/* ── Executive Summary / Excerpt ── */}
        {(order.summary || order.summaryMl) && (
          <section class="mt-8">
            <h2 class="eyebrow mb-3">
              {t(
                lang,
                "Executive Summary · Document Excerpt",
                "കാര്യനിർവ്വഹണ സംഗ്രഹം · രേഖാ സംഗ്രഹം",
              )}
            </h2>
            <div class="card border border-base-200 bg-base-100 shadow-sm rounded-2xl p-5 md:p-6 flex flex-col gap-4">
              <div class="grid gap-6 md:grid-cols-2">
                {/* English Summary */}
                {order.summary && (
                  <div class="flex flex-col gap-1.5">
                    <span class="text-[10px] uppercase font-bold text-base-content/40 tracking-wider">
                      English Summary
                    </span>
                    <p class="text-sm text-base-content/85 leading-relaxed font-medium">
                      {order.summary}
                    </p>
                  </div>
                )}
                {/* Malayalam Summary */}
                {order.summaryMl && (
                  <div class="flex flex-col gap-1.5">
                    <span class="text-[10px] uppercase font-bold text-base-content/40 tracking-wider">
                      മലയാളം സംഗ്രഹം
                    </span>
                    <p class="text-sm text-base-content/85 leading-relaxed font-medium ml">
                      {order.summaryMl}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Source document ── */}
        <section class="mt-8">
          <h2 class="eyebrow mb-4">
            {t(lang, "Source document", "ഉറവിട രേഖ")}
          </h2>

          <div class="card border border-base-200 bg-base-200/25 shadow-sm rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
            <div class="bg-red-500/10 text-red-500 p-4 rounded-xl border border-red-500/15 shrink-0">
              <svg
                class="w-12 h-12"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>

            <div class="flex-1 text-center md:text-left">
              <h3 class="font-display font-bold text-lg text-base-content flex items-center justify-center md:justify-start gap-2">
                {order.goNumber}
              </h3>
              <p class="text-xs text-base-content/50 uppercase font-semibold tracking-wider mt-0.5">
                {t(lang, "Official PDF Document", "ഔദ്യോഗിക പി.ഡി.എഫ് രേഖ")}
              </p>

              <div class="mt-3 text-xs md:text-sm text-base-content/60 leading-relaxed max-w-xl">
                <p class="font-medium text-base-content/75">
                  {t(
                    lang,
                    "Security Notice: Direct embedding of PDFs is restricted by the official Government Document Portal (document.kerala.gov.in) to prevent clickjacking.",
                    "സുരക്ഷാ മുൻകരുതൽ: ഔദ്യോഗിക സർക്കാർ പോർട്ടലിൽ നിന്നുള്ള രേഖകൾ മറ്റ് വെബ്‌സൈറ്റുകളിൽ നേരിട്ട് പ്രദർശിപ്പിക്കുന്നുന്നത് സുരക്ഷാ കാരണങ്ങളാൽ തടഞ്ഞിരിക്കുന്നു.",
                  )}
                </p>
                <p class="mt-1 text-base-content/45">
                  {t(
                    lang,
                    "Please click the button to open and view the verified PDF document in a new tab.",
                    "പരിശോധിച്ച പി.ഡി.എഫ് രേഖ പുതിയ ടാബിൽ തുറന്നു കാണുന്നതിനായി താഴെയുള്ള ബട്ടൺ ഉപയോഗിക്കുക.",
                  )}
                </p>
              </div>
            </div>

            <a
              href={order.meta.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-primary btn-md md:btn-lg gap-2 shadow-sm shrink-0 w-full md:w-auto"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              {t(lang, "View Official PDF ↗", "പി.ഡി.എഫ് തുറക്കുക ↗")}
            </a>
          </div>
        </section>

        {/* ── Provenance ── */}
        <section class="mt-8 surface-card p-5">
          <h2 class="eyebrow mb-3">
            {t(lang, "Where this came from", "ഇത് എവിടെ നിന്ന്")}
          </h2>
          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt class="text-base-content/50">{t(lang, "Portal", "പോർട്ടൽ")}</dt>
            <dd>{order.meta.source}</dd>
            <dt class="text-base-content/50">{t(lang, "Link", "ലിങ്ക്")}</dt>
            <dd>
              <a
                href={order.meta.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="link link-primary break-all"
              >
                {order.meta.sourceUrl}
              </a>
            </dd>
            <dt class="text-base-content/50">
              {t(lang, "Retrieved", "ശേഖരിച്ചത്")}
            </dt>
            <dd class="tabular-nums">
              {new Date(order.meta.retrievedAt).toLocaleString(
                lang === "ml" ? "ml-IN" : "en-IN",
                { timeZone: "Asia/Kolkata" },
              )} IST
            </dd>
            {dept && (
              <>
                <dt class="text-base-content/50">
                  {t(lang, "Dept. tag", "വകുപ്പ് ടാഗ്")}
                </dt>
                <dd class="capitalize">{order.deptConfidence}</dd>
              </>
            )}
          </dl>
        </section>
      </main>
      <Footer lang={lang} />
    </>
  );
});
