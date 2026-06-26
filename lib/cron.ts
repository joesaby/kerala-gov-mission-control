/**
 * cron.ts — daily Government Order ingest, registered with Deno.cron.
 *
 * Runs on Deno Deploy (cron is enabled there automatically). Locally it only
 * registers when run with `--unstable-cron` AND a GEMINI_API_KEY is present;
 * otherwise it no-ops so `deno task dev` / `deno check` stay clean.
 *
 * The job writes new orders straight to KV (durable mirror — see db.ts), so no
 * git commit / redeploy is needed for fresh data to appear on the site.
 */

import { geminiKey } from "./gemini.ts";
import { repairIngestedOrders, runIngest } from "./ingest.ts";
import { releaseIngestLock, tryAcquireIngestLock } from "../data/db.ts";
import { refreshUsdInrRate } from "./fx.ts";

/** Daily at 02:30 IST (21:00 UTC the previous day). */
const CRON_SCHEDULE = "0 21 * * *";

/**
 * Records to re-extract per daily run after the fresh-order ingest. This lets
 * already-stored records that came out degraded — e.g. an appointment GO whose
 * appointee row was lost to a text-only fallback on a Gemini-quota-exhausted
 * batch day — self-heal over a few days instead of staying stuck. Gemini's free
 * tier (20/day) is spent by the ingest above, so the sweep runs on the
 * OpenRouter/NVIDIA fallbacks; keep it small to bound token cost.
 */
const REPAIR_SWEEP_LIMIT = 12;

let registered = false;

export function registerIngestCron(): void {
  if (registered) return;

  // Deno.cron is unavailable without --unstable-cron (local) — guard so the
  // app still boots for `deno task dev` and CI type-checks.
  if (typeof Deno.cron !== "function") {
    console.warn(
      "[cron] Deno.cron unavailable (need --unstable-cron) — ingest cron not registered",
    );
    return;
  }
  if (!geminiKey()) {
    console.warn(
      "[cron] GEMINI_API_KEY not set — ingest cron not registered",
    );
    return;
  }

  registered = true;
  Deno.cron("daily-go-ingest", CRON_SCHEDULE, async () => {
    // Serialize against any in-flight run (a previous cron that overran, or a
    // manual admin trigger) using the same KV lock the admin endpoint uses.
    // Without this the cron ran unlocked and could pile a second run on top of a
    // still-running one. Skip (don't queue) if a run is already active.
    if (!await tryAcquireIngestLock()) {
      console.warn("[cron] daily-go-ingest skipped — a run is already active");
      return;
    }
    console.log("[cron] daily-go-ingest starting");
    try {
      try {
        const status = await runIngest({
          trigger: "cron",
          limit: 30, // quota guard per run
          log: (m) => console.log(`[cron] ${m}`),
        });
        console.log(
          `[cron] daily-go-ingest done — added ${status.added}, skipped ${status.skipped}, errors ${status.errors.length}`,
        );
      } catch (e) {
        console.error("[cron] daily-go-ingest failed:", e);
      }
      // Self-healing sweep: re-extract a bounded batch of already-stored records
      // that still look degraded (kept separate so a failure never affects the
      // fresh-order ingest above).
      try {
        const repair = await repairIngestedOrders({
          limit: REPAIR_SWEEP_LIMIT,
          log: (m) => console.log(`[cron] ${m}`),
        });
        console.log(
          `[cron] daily-go-repair done — repaired ${repair.repaired}, errors ${repair.errors.length}, deferred ${repair.deferred.length}`,
        );
      } catch (e) {
        console.error("[cron] daily-go-repair failed:", e);
      }
    } finally {
      await releaseIngestLock();
    }
  });
  console.log("[cron] daily-go-ingest registered");

  // Daily at 06:00 IST (00:30 UTC) — well after the GO ingest at 02:30 IST.
  Deno.cron("daily-fx-refresh", "30 0 * * *", async () => {
    const rate = await refreshUsdInrRate();
    if (rate) {
      console.log(`[cron] daily-fx-refresh done — 1 USD = ₹${rate.toFixed(2)}`);
    } else {
      console.warn(
        "[cron] daily-fx-refresh failed — KV unchanged, fallback in use",
      );
    }
  });
  console.log("[cron] daily-fx-refresh registered");
}
