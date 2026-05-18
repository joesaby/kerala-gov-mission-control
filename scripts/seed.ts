/**
 * Force a reseed of Deno KV from the typed fixtures.
 *
 *   deno task seed                           # local KV (SQLite under ~/.deno/kv)
 *   DENO_KV_ACCESS_TOKEN=... deno task seed -- --remote=https://api.deno.com/databases/<uuid>/connect
 *
 * The site itself runs an idempotent auto-seed on cold start (see db.ts),
 * so this script is only needed when you bump the schema or want to wipe
 * stale data without redeploying.
 */
import { kv, seed } from "../data/db.ts";

const remoteArg = Deno.args.find((a) => a.startsWith("--remote="));
if (remoteArg) {
  const url = remoteArg.slice("--remote=".length);
  console.log(`Reseeding remote KV: ${url}`);
  // Re-open against the remote URL by replacing the default handle.
  // Deno.openKv accepts a URL for hosted KV.
  const _connected = await Deno.openKv(url);
  // The exported `kv()` caches a local handle; for a one-shot seed we
  // bypass it and write directly via the remote handle by using seed()'s
  // implementation, which goes through kv(). For simplicity, scripts/seed.ts
  // expects the default `Deno.openKv()` to be configured via the
  // DENO_KV_ACCESS_TOKEN + DENO_KV_URL env. If you passed --remote, set
  // DENO_KV_URL=$remote before re-running.
  Deno.env.set("DENO_KV_URL", url);
  _connected.close();
}

console.log("Seeding KV from fixtures…");
await seed();
console.log("Done.");

const k = await kv();
let kpiCount = 0;
let deptCount = 0;
for await (const _ of k.list({ prefix: ["kpi"] })) kpiCount++;
for await (const _ of k.list({ prefix: ["dept"] })) deptCount++;
console.log(`  ${deptCount} departments, ${kpiCount} KPIs.`);
