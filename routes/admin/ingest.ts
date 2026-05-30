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
import { DEFAULT_SINCE, runIngest } from "../../lib/ingest.ts";

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
    try {
      const body = await ctx.req.json();
      if (typeof body?.limit === "number") {
        limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(body.limit)));
      }
      if (
        typeof body?.since === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(body.since)
      ) {
        since = body.since;
      }
    } catch {
      // no/invalid body — use defaults
    }

    if (!await tryAcquireIngestLock()) {
      return Response.json(
        { error: "An ingest run is already in progress." },
        { status: 409 },
      );
    }

    try {
      const status = await runIngest({ trigger: "manual", limit, since });
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
