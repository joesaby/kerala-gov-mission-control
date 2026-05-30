/**
 * ingest_gos.ts — manual CLI for the Government Order ingest.
 *
 * Thin wrapper over lib/ingest.ts (the same code the daily Deno.cron runs).
 * Writes new orders straight to the local Deno KV. Use it for backfills or to
 * test the pipeline locally before it runs in production.
 *
 * Usage:
 *   deno task ingest-gos
 *   deno task ingest-gos --since 2026-05-18
 *   deno task ingest-gos --limit 5 --source orders --dry-run
 *
 * Requires GEMINI_API_KEY (loaded from .env automatically, or the shell env).
 */

import "@std/dotenv/load";
import { parseArgs } from "@std/cli/parse-args";

import { geminiKey, geminiModel } from "../lib/gemini.ts";
import { DEFAULT_SINCE, KNOWN_SOURCES, runIngest } from "../lib/ingest.ts";

const args = parseArgs(Deno.args, {
  string: ["since", "limit", "source"],
  boolean: ["dry-run", "help"],
  default: { since: DEFAULT_SINCE },
});

if (args.help) {
  const sourceNames = Object.keys(KNOWN_SOURCES).join(", ");
  console.log(`
deno task ingest-gos [options]

  --since YYYY-MM-DD        Only include docs on or after this date (default: ${DEFAULT_SINCE})
  --limit N                 Process at most N new documents
  --source <name[,name]>    Sources to scrape: ${sourceNames} (default: all)
  --dry-run                 Extract + map but do not write to KV
  --help                    Show this help
`);
  Deno.exit(0);
}

if (!geminiKey()) {
  console.error(
    "[!] GEMINI_API_KEY is not set. Add it to .env (GEMINI_API_KEY=...) or the shell env.",
  );
  Deno.exit(1);
}

const sources = (args.source as string | undefined)
  ?.split(",").map((s) => s.trim()).filter(Boolean);

console.error(`[i] Model: ${geminiModel()}`);

const status = await runIngest({
  since: args.since as string,
  limit: args.limit ? Number(args.limit) : undefined,
  sources,
  dryRun: args["dry-run"] as boolean,
  trigger: "manual",
  log: (m) => console.error(m),
});

if (!status.ok || status.errors.length > 0) {
  console.error(
    `\n[!] Completed with ${status.errors.length} error(s)${
      status.ok ? "" : " and an aborted run"
    }.`,
  );
}
Deno.exit(status.ok ? 0 : 1);
