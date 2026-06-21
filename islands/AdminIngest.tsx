import { useState } from "preact/hooks";

interface Props {
  /** A run is already in progress at page load. */
  running: boolean;
}

type Phase = "idle" | "running" | "done" | "error";
type Mode = "ingest" | "repair";

interface IngestResult {
  added: number;
  skipped: number;
  scanned: number;
  errors: string[];
}

interface RepairResult {
  candidates: number;
  repaired: number;
  errors: string[];
}

export default function AdminIngest({ running }: Props) {
  const [limit, setLimit] = useState<number>(15);
  const [force, setForce] = useState<boolean>(false);
  const [phase, setPhase] = useState<Phase>(running ? "running" : "idle");
  const [mode, setMode] = useState<Mode>("ingest");
  const [message, setMessage] = useState<string>("");
  const [ingest, setIngest] = useState<IngestResult | null>(null);
  const [repair, setRepair] = useState<RepairResult | null>(null);

  async function run(which: Mode) {
    setPhase("running");
    setMode(which);
    setMessage("");
    setIngest(null);
    setRepair(null);
    try {
      // Same-origin request — the browser re-sends the cached Basic Auth header.
      const res = await fetch("/admin/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          which === "repair" ? { repair: true, limit, force } : { limit },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPhase("error");
        setMessage(
          data?.error ??
            (res.status === 409
              ? "A run is already in progress."
              : `HTTP ${res.status}`),
        );
        return;
      }
      if (which === "repair") setRepair(data.repair as RepairResult);
      else setIngest(data.status as IngestResult);
      setPhase("done");
      // Reload so status, history, and logs refresh.
      setTimeout(() => globalThis.location.reload(), 1500);
    } catch (e) {
      setPhase("error");
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  const busy = phase === "running";

  return (
    <div>
      <div class="flex flex-wrap items-end gap-3">
        <label class="flex flex-col gap-1 w-24">
          <span class="text-xs text-base-content/60">Limit</span>
          <input
            type="number"
            min={1}
            max={40}
            value={limit}
            onInput={(e) =>
              setLimit(Number((e.target as HTMLInputElement).value) || 15)}
            class="input input-sm input-bordered w-full tabular-nums"
            disabled={busy}
          />
        </label>
        <button
          type="button"
          class="btn btn-sm btn-primary"
          onClick={() => run("ingest")}
          disabled={busy}
        >
          {busy && mode === "ingest"
            ? (
              <>
                <span class="loading loading-spinner loading-xs" />
                Running…
              </>
            )
            : "Force ingest now"}
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline btn-warning"
          onClick={() => run("repair")}
          disabled={busy}
          title="Re-extract already-ingested records from their stored PDF URLs to fix broken bilingual fields."
        >
          {busy && mode === "repair"
            ? (
              <>
                <span class="loading loading-spinner loading-xs" />
                Repairing…
              </>
            )
            : "Repair data"}
        </button>
        <label class="flex items-center gap-2 text-xs text-base-content/60 cursor-pointer">
          <input
            type="checkbox"
            checked={force}
            onChange={(e) => setForce((e.target as HTMLInputElement).checked)}
            class="checkbox checkbox-xs"
            disabled={busy}
          />
          force (re-do all, not just broken)
        </label>
      </div>

      <p class="mt-2 text-xs text-base-content/50">
        <strong>Force ingest</strong>{" "}
        scrapes the newest orders and processes them with Gemini.{" "}
        <strong>Repair data</strong>{" "}
        re-extracts records already in KV from their stored PDFs to fix broken
        bilingual fields — bounded by Limit, so run it repeatedly until it
        reports 0 repaired. Each run takes up to ~1 min.
      </p>

      {phase === "done" && ingest && (
        <div class="mt-3 text-sm rounded-md border border-success/30 bg-success/5 p-3">
          Done — {ingest.added} added, {ingest.skipped} skipped,{" "}
          {ingest.errors.length} errors. Refreshing…
        </div>
      )}
      {phase === "done" && repair && (
        <div class="mt-3 text-sm rounded-md border border-success/30 bg-success/5 p-3">
          Repair done — {repair.repaired} of {repair.candidates}{" "}
          candidate(s) repaired, {repair.errors.length} errors.{" "}
          {repair.repaired > 0 && repair.repaired >= limit
            ? "More may remain — run again."
            : ""} Refreshing…
        </div>
      )}
      {phase === "error" && (
        <div class="mt-3 text-sm rounded-md border border-error/30 bg-error/5 p-3 text-error break-words">
          {message}
        </div>
      )}
    </div>
  );
}
