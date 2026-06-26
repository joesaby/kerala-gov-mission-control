/**
 * POST /admin/ingest — force an ingest run now (admin only).
 * GET  /admin/ingest — lightweight status poll.
 *
 * Auth is enforced by routes/admin/_middleware.ts (Basic Auth). A KV lock
 * serializes this with the daily cron so runs never overlap. Bounded by `limit`
 * (newest-first) to fit the request budget.
 */

import { define } from "../../utils.ts";
import {
  getIngestStatus,
  isIngestRunning,
  releaseIngestLock,
  tryAcquireIngestLock,
} from "../../data/db.ts";
import { geminiKey } from "../../lib/gemini.ts";
import {
  DEFAULT_SINCE,
  KNOWN_SOURCES,
  repairIngestedOrders,
  runIngest,
} from "../../lib/ingest.ts";

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 40;

export const handler = define.handlers({
  async GET() {
    return Response.json({
      running: await isIngestRunning(),
      status: await getIngestStatus(),
    });
  },

  async POST(ctx) {
    if (!geminiKey()) {
      return Response.json(
        { error: "GEMINI_API_KEY is not set on the server." },
        { status: 503 },
      );
    }

    let limit = DEFAULT_LIMIT;
    let since = DEFAULT_SINCE;
    let reprocess = false;
    let repair = false;
    let force = false;
    let unlock = false;
    let sources: string[] | undefined;
    try {
      const body = await ctx.req.json();
      // Escape hatch: force-release a stale lock (e.g. a run whose isolate was
      // killed before its `finally` ran). Clears the lock and returns — no run.
      unlock = body?.unlock === true;
      if (typeof body?.limit === "number") {
        limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(body.limit)));
      }
      if (
        typeof body?.since === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(body.since)
      ) {
        since = body.since;
      }
      // Restrict the run to specific KNOWN_SOURCES (e.g. ["cabinet"] to backfill
      // a single, low-volume source). Unknown names are dropped; an empty result
      // falls back to all sources (undefined).
      if (Array.isArray(body?.sources)) {
        const valid = body.sources.filter(
          (s: unknown): s is string =>
            typeof s === "string" && s in KNOWN_SOURCES,
        );
        if (valid.length) sources = valid;
      }
      // Re-scrape listings and re-extract already-seen orders (overwrites in
      // place). Fixes recent legacy mis-translated records.
      reprocess = body?.reprocess === true;
      // Repair already-ingested records straight from their stored PDF URL —
      // covers orders no longer on the listing pages. Bounded by `limit`, so
      // call repeatedly to chunk through the backlog. `force` re-does all.
      repair = body?.repair === true;
      force = body?.force === true;
    } catch {
      // no/invalid body — use defaults
    }

    if (unlock) {
      await releaseIngestLock();
      return Response.json({ ok: true, unlocked: true });
    }

    if (!await tryAcquireIngestLock()) {
      return Response.json(
        { error: "An ingest run is already in progress." },
        { status: 409 },
      );
    }

    try {
      if (repair) {
        const result = await repairIngestedOrders({ limit, force });
        return Response.json({ ok: true, repair: result });
      }
      const status = await runIngest({
        trigger: "manual",
        limit,
        since,
        reprocess,
        sources,
      });
      return Response.json({ ok: true, status });
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : String(e) },
        { status: 500 },
      );
    } finally {
      await releaseIngestLock();
    }
  },
});
