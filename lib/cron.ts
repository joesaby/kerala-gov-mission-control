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
import { runIngest } from "./ingest.ts";
import { refreshUsdInrRate } from "./fx.ts";

/** Daily at 02:30 IST (21:00 UTC the previous day). */
const CRON_SCHEDULE = "0 21 * * *";

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
    console.log("[cron] daily-go-ingest starting");
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
