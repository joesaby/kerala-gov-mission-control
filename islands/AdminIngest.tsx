import { useState } from "preact/hooks";

interface Props {
  /** A run is already in progress at page load. */
  running: boolean;
}

type Phase = "idle" | "running" | "done" | "error";

interface RunResult {
  added: number;
  skipped: number;
  scanned: number;
  errors: string[];
}

export default function AdminIngest({ running }: Props) {
  const [limit, setLimit] = useState<number>(15);
  const [phase, setPhase] = useState<Phase>(running ? "running" : "idle");
  const [message, setMessage] = useState<string>("");
  const [result, setResult] = useState<RunResult | null>(null);

  async function run() {
    setPhase("running");
    setMessage("");
    setResult(null);
    try {
      // Same-origin request — the browser re-sends the cached Basic Auth header.
      const res = await fetch("/admin/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit }),
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
      setResult(data.status as RunResult);
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
          onClick={run}
          disabled={busy}
        >
          {busy
            ? (
              <>
                <span class="loading loading-spinner loading-xs" />
                Running…
              </>
            )
            : "Force ingest now"}
        </button>
        <span class="text-xs text-base-content/50">
          Scrapes newest orders and processes them with Gemini — up to ~1 min.
        </span>
      </div>

      {phase === "done" && result && (
        <div class="mt-3 text-sm rounded-md border border-success/30 bg-success/5 p-3">
          Done — {result.added} added, {result.skipped} skipped,{" "}
          {result.errors.length} errors. Refreshing…
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
