import { page } from "fresh";
import { define } from "../../utils.ts";
import {
  getIngestLog,
  getIngestRuns,
  getIngestStatus,
  type IngestLog,
  type IngestStatus,
  isIngestRunning,
  listIngestedGovernmentOrders,
} from "../../data/db.ts";
import AdminIngest from "../../islands/AdminIngest.tsx";
import type { GovernmentOrder } from "../../data/types.ts";

interface Data {
  status: IngestStatus | null;
  runs: IngestStatus[];
  log: IngestLog | null;
  recent: GovernmentOrder[];
  running: boolean;
}

export const handler = define.handlers<Data>({
  async GET() {
    const [status, runs, log, ingested, running] = await Promise.all([
      getIngestStatus(),
      getIngestRuns(),
      getIngestLog(),
      listIngestedGovernmentOrders(),
      isIngestRunning(),
    ]);
    return page({
      status,
      runs,
      log,
      recent: ingested.slice(0, 15),
      running,
    });
  },
});

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function durationS(a: string, b: string): number {
  return Math.max(
    0,
    Math.round((new Date(b).getTime() - new Date(a).getTime()) / 1000),
  );
}

export default define.page<typeof handler>(function AdminPage({ data }) {
  const { status, runs, log, recent, running } = data;

  return (
    <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      <div class="flex items-center justify-between gap-3 mb-6">
        <div>
          <p class="text-xs uppercase tracking-wider text-base-content/50 font-medium">
            Admin · restricted
          </p>
          <h1 class="text-2xl font-bold">Ingest control</h1>
        </div>
        <a
          href="/gov/ingest-status"
          class="link link-hover text-sm text-primary"
        >
          public status page ↗
        </a>
      </div>

      {/* ── Force ingest ── */}
      <section class="rounded-lg border border-base-300 bg-base-100 p-4 mb-6">
        <h2 class="text-sm font-semibold text-base-content/70 mb-3">
          Force ingest
        </h2>
        <AdminIngest running={running} />
        {running && (
          <p class="mt-2 text-xs text-warning">
            A run is currently in progress (lock held).
          </p>
        )}
      </section>

      {/* ── Last run ── */}
      <section class="mb-6">
        <h2 class="text-sm font-semibold text-base-content/70 mb-2">
          Last run
        </h2>
        {status
          ? (
            <div class="rounded-lg border border-base-300 bg-base-100 p-4 text-sm">
              <div class="grid sm:grid-cols-2 gap-x-8 gap-y-1">
                <Row k="Finished" v={fmt(status.finishedAt)} />
                <Row k="Trigger" v={status.trigger} />
                <Row k="Model" v={status.model} />
                <Row
                  k="Duration"
                  v={`${durationS(status.startedAt, status.finishedAt)}s`}
                />
                <Row k="Outcome" v={status.ok ? "ok" : "errored"} />
                <Row
                  k="Counts"
                  v={`+${status.added} · skip ${status.skipped} · scan ${status.scanned} · err ${status.errors.length}`}
                />
              </div>
              {status.addedIds.length > 0 && (
                <p class="mt-2 text-xs text-base-content/60 break-words">
                  <span class="font-semibold">Added:</span>{" "}
                  {status.addedIds.join(", ")}
                </p>
              )}
              {status.errors.length > 0 && (
                <ul class="mt-2 flex flex-col gap-0.5 text-xs font-mono text-error">
                  {status.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )
          : (
            <p class="text-sm text-base-content/50 italic">
              No runs recorded yet.
            </p>
          )}
      </section>

      {/* ── Logs ── */}
      <section class="mb-6">
        <h2 class="text-sm font-semibold text-base-content/70 mb-2">
          Logs {log && (
            <span class="font-normal text-base-content/40">
              · last {log.trigger} run · {fmt(log.finishedAt)}
            </span>
          )}
        </h2>
        {log && log.lines.length > 0
          ? (
            <pre class="rounded-lg border border-base-300 bg-base-200/40 p-3 text-xs leading-relaxed overflow-auto max-h-96 whitespace-pre-wrap break-words">{log.lines.join("\n")}</pre>
          )
          : (
            <p class="text-sm text-base-content/50 italic">
              No logs captured yet.
            </p>
          )}
      </section>

      {/* ── Run history ── */}
      <section class="mb-6">
        <h2 class="text-sm font-semibold text-base-content/70 mb-2">
          Run history
        </h2>
        {runs.length > 0
          ? (
            <div class="overflow-x-auto rounded-lg border border-base-200">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Finished</th>
                    <th>Trigger</th>
                    <th class="text-right">Added</th>
                    <th class="text-right">Skipped</th>
                    <th class="text-right">Errors</th>
                    <th>OK</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r, i) => (
                    <tr key={i}>
                      <td class="tabular-nums whitespace-nowrap">
                        {fmt(r.finishedAt)}
                      </td>
                      <td>{r.trigger}</td>
                      <td class="text-right tabular-nums">{r.added}</td>
                      <td class="text-right tabular-nums">{r.skipped}</td>
                      <td
                        class={`text-right tabular-nums ${
                          r.errors.length ? "text-error" : ""
                        }`}
                      >
                        {r.errors.length}
                      </td>
                      <td>{r.ok ? "✓" : "✗"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
          : <p class="text-sm text-base-content/50 italic">No history yet.</p>}
      </section>

      {/* ── Recently ingested ── */}
      <section>
        <h2 class="text-sm font-semibold text-base-content/70 mb-2">
          Recently ingested ({recent.length})
        </h2>
        {recent.length > 0
          ? (
            <ul class="flex flex-col divide-y divide-base-200 border border-base-200 rounded-lg">
              {recent.map((o) => (
                <li
                  key={o.id}
                  class="flex items-start justify-between gap-3 p-3 text-sm"
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="badge badge-xs badge-ghost font-mono">
                        {o.type}
                      </span>
                      <span class="font-mono text-xs text-base-content/50">
                        {o.id}
                      </span>
                      {(o.manifestoGoalIds?.length ?? 0) > 0 && (
                        <span class="text-[10px] font-semibold uppercase text-success">
                          manifesto
                        </span>
                      )}
                    </div>
                    <p class="text-base-content/80 leading-snug line-clamp-1">
                      {o.subject}
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
            <p class="text-sm text-base-content/50 italic">
              No runtime-ingested orders yet.
            </p>
          )}
      </section>
    </main>
  );
});

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div class="flex justify-between gap-3 py-0.5 border-b border-base-200/60">
      <span class="text-base-content/50">{k}</span>
      <span class="text-base-content/80 text-right">{v}</span>
    </div>
  );
}
