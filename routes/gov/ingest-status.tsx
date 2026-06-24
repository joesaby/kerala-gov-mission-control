import { page } from "fresh";
import { define } from "../../utils.ts";
import {
  getIngestStatus,
  type IngestStatus,
  listIngestedGovernmentOrders,
} from "../../data/db.ts";
import { Header } from "../../components/Header.tsx";
import { Footer } from "../../components/Footer.tsx";
import type { GovernmentOrder } from "../../data/types.ts";

interface Data {
  status: IngestStatus | null;
  recent: GovernmentOrder[];
}

export const handler = define.handlers<Data>({
  async GET() {
    const [status, ingested] = await Promise.all([
      getIngestStatus(),
      listIngestedGovernmentOrders(),
    ]);
    return page({ status, recent: ingested.slice(0, 20) });
  },
});

function fmtDateTime(iso: string, lang: "en" | "ml"): string {
  return new Date(iso).toLocaleString(lang === "ml" ? "ml-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function relativeAge(iso: string, lang: "en" | "ml"): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return lang === "ml" ? "ഒരു മണിക്കൂറിനുള്ളിൽ" : "under an hour ago";
  if (hours < 24) {
    return lang === "ml" ? `${hours} മണിക്കൂർ മുമ്പ്` : `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return lang === "ml" ? `${days} ദിവസം മുമ്പ്` : `${days}d ago`;
}

/** A run older than ~26h means the daily cron likely missed a beat. */
function isStale(status: IngestStatus): boolean {
  return Date.now() - new Date(status.finishedAt).getTime() > 26 * 3_600_000;
}

export default define.page<typeof handler>(function IngestStatusPage(
  { data, state },
) {
  const lang = state.lang;
  const { status, recent } = data;

  const healthy = status?.ok && !isStale(status);

  return (
    <>
      <Header lang={lang} />
      <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <section class="mb-8">
          <p class="text-xs uppercase tracking-wider text-base-content/60 font-medium">
            <a href="/gov" class="hover:text-primary transition">
              {lang === "ml" ? "സർക്കാർ" : "Government"}
            </a>
            {" · "}
            {lang === "ml" ? "ഡാറ്റ പൈപ്പ്‌ലൈൻ" : "Data pipeline"}
          </p>
          <h1 class="text-3xl md:text-4xl font-bold mt-1">
            {lang === "ml" ? "ഇൻജസ്റ്റ് നില" : "Ingest Status"}
          </h1>
          <p class="text-base-content/70 mt-2 max-w-2xl">
            {lang === "ml"
              ? "സർക്കാർ ഉത്തരവുകൾ ഓരോ ദിവസവും document.kerala.gov.in-ൽ നിന്ന് ശേഖരിച്ച് Gemini ഉപയോഗിച്ച് പ്രോസസ്സ് ചെയ്യുന്നു."
              : "Government orders are pulled from document.kerala.gov.in each day and processed with Gemini. This page reports the last run."}
          </p>
        </section>

        {/* ── Status banner ── */}
        {status
          ? (
            <div
              class={`rounded-lg border p-5 mb-8 ${
                healthy
                  ? "border-success/30 bg-success/5"
                  : "border-warning/40 bg-warning/5"
              }`}
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <span
                    class={`inline-block w-2.5 h-2.5 rounded-full ${
                      healthy ? "bg-success" : "bg-warning"
                    }`}
                  />
                  <span class="font-semibold">
                    {healthy
                      ? (lang === "ml" ? "ആരോഗ്യകരം" : "Healthy")
                      : status.ok
                      ? (lang === "ml" ? "കാലഹരണപ്പെട്ടു" : "Stale")
                      : (lang === "ml" ? "പിശക്" : "Last run errored")}
                  </span>
                </div>
                <span class="text-sm text-base-content/60 tabular-nums">
                  {relativeAge(status.finishedAt, lang)}
                </span>
              </div>

              <dl class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
                <Stat
                  label={lang === "ml" ? "ചേർത്തവ" : "Added"}
                  value={status.added}
                  accent="text-success"
                />
                <Stat
                  label={lang === "ml" ? "ഒഴിവാക്കിയവ" : "Skipped"}
                  value={status.skipped}
                />
                <Stat
                  label={lang === "ml" ? "സ്കാൻ ചെയ്തവ" : "Scanned"}
                  value={status.scanned}
                />
                <Stat
                  label={lang === "ml" ? "പിശകുകൾ" : "Errors"}
                  value={status.errors.length}
                  accent={status.errors.length > 0 ? "text-error" : undefined}
                />
                {status.deferred && status.deferred.length > 0 && (
                  <Stat
                    label={lang === "ml" ? "മാറ്റിവച്ചവ" : "Deferred"}
                    value={status.deferred.length}
                    accent="text-warning"
                  />
                )}
              </dl>

              <div class="mt-5 grid sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                <Row
                  k={lang === "ml" ? "അവസാന റൺ" : "Last run"}
                  v={fmtDateTime(status.finishedAt, lang)}
                />
                <Row
                  k={lang === "ml" ? "ട്രിഗർ" : "Trigger"}
                  v={status.trigger === "cron"
                    ? (lang === "ml" ? "ഷെഡ്യൂൾ" : "Scheduled (daily)")
                    : (lang === "ml" ? "സ്വമേധയാ" : "Manual")}
                />
                <Row k={lang === "ml" ? "മോഡൽ" : "Model"} v={status.model} />
                <Row
                  k={lang === "ml" ? "ദൈർഘ്യം" : "Duration"}
                  v={`${
                    Math.max(
                      0,
                      Math.round(
                        (new Date(status.finishedAt).getTime() -
                          new Date(status.startedAt).getTime()) / 1000,
                      ),
                    )
                  }s`}
                />
              </div>

              {status.errors.length > 0 && (
                <details class="mt-4">
                  <summary class="text-sm font-medium text-error cursor-pointer">
                    {lang === "ml"
                      ? `${status.errors.length} പിശകുകൾ കാണുക`
                      : `View ${status.errors.length} error(s)`}
                  </summary>
                  <ul class="mt-2 flex flex-col gap-1 text-xs font-mono text-base-content/70">
                    {status.errors.map((e, i) => (
                      <li key={i} class="break-words">{e}</li>
                    ))}
                  </ul>
                </details>
              )}

              {status.deferred && status.deferred.length > 0 && (
                <details class="mt-4">
                  <summary class="text-sm font-medium text-warning cursor-pointer">
                    {lang === "ml"
                      ? `${status.deferred.length} മാറ്റിവച്ചവ (അടുത്ത റണിൽ വീണ്ടും ശ്രമിക്കും)`
                      : `${status.deferred.length} deferred (Gemini overloaded — retried next run)`}
                  </summary>
                  <ul class="mt-2 flex flex-col gap-1 text-xs font-mono text-base-content/70">
                    {status.deferred.map((d, i) => (
                      <li key={i} class="break-words">{d}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )
          : (
            <div class="rounded-lg border border-base-300 bg-base-100 p-5 mb-8">
              <p class="text-base-content/70">
                {lang === "ml"
                  ? "ഇൻജസ്റ്റ് ഇതുവരെ പ്രവർത്തിച്ചിട്ടില്ല. ഷെഡ്യൂൾ ചെയ്ത ആദ്യ റണിന് ശേഷം ഇവിടെ വിശദാംശങ്ങൾ കാണാം."
                  : "The ingest has not run yet. Details will appear here after the first scheduled run (daily, 02:30 IST)."}
              </p>
            </div>
          )}

        {/* ── Recently ingested orders ── */}
        <section>
          <h2 class="text-xl font-semibold mb-1">
            {lang === "ml" ? "സമീപകാല ഉത്തരവുകൾ" : "Recently ingested orders"}
          </h2>
          <p class="text-sm text-base-content/60 mb-4">
            {lang === "ml"
              ? "പൈപ്പ്‌ലൈൻ KV-ലേക്ക് എഴുതിയ ഉത്തരവുകൾ (ഫിക്സ്ചർ ബേസ്‌ലൈൻ ഒഴികെ)."
              : "Orders the pipeline wrote to KV at runtime (excludes the static fixture baseline)."}
          </p>
          {recent.length > 0
            ? (
              <ul class="flex flex-col divide-y divide-base-200 border border-base-200 rounded-lg">
                {recent.map((o) => (
                  <li
                    key={o.id}
                    class="flex items-start justify-between gap-3 p-3 text-sm"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap mb-0.5">
                        <span class="badge badge-xs badge-ghost font-mono">
                          {o.type}
                        </span>
                        <time class="text-xs text-base-content/50 tabular-nums">
                          {fmtDateTime(o.meta.retrievedAt, lang)}
                        </time>
                        {(o.manifestoGoalIds?.length ?? 0) > 0 && (
                          <span class="text-[10px] font-semibold uppercase text-success">
                            {lang === "ml" ? "വാഗ്ദാനം" : "manifesto"}
                          </span>
                        )}
                      </div>
                      <p class="text-base-content/80 leading-snug line-clamp-2">
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
            )
            : (
              <p class="text-sm text-base-content/40 italic">
                {lang === "ml"
                  ? "ഇതുവരെ റൺടൈമിൽ ഉത്തരവുകളൊന്നും ചേർത്തിട്ടില്ല."
                  : "No orders added at runtime yet."}
              </p>
            )}
        </section>
      </main>
      <Footer lang={lang} />
    </>
  );
});

function Stat(
  { label, value, accent }: {
    label: string;
    value: number;
    accent?: string;
  },
) {
  return (
    <div>
      <dt class="text-xs text-base-content/60">{label}</dt>
      <dd class={`text-2xl font-bold tabular-nums ${accent ?? ""}`}>{value}</dd>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div class="flex justify-between gap-3 py-0.5 border-b border-base-200/60">
      <span class="text-base-content/50">{k}</span>
      <span class="text-base-content/80 text-right">{v}</span>
    </div>
  );
}
