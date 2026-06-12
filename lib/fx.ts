import { FALLBACK_USD_INR } from "../data/lang.ts";
import { kv } from "../data/db.ts";

/**
 * USD→INR exchange rate backed by Deno KV.
 *
 * The rate is written to KV once daily by the `daily-fx-refresh` Deno.cron
 * (lib/cron.ts). Page handlers read it with a single local KV get (~1 ms) —
 * no outbound HTTP on the request path. On a cold KV (first deploy or local
 * dev before the cron has run), the read returns null and the fallback is
 * used instantly.
 */

export const KV_FX_KEY: Deno.KvKey = ["meta", "usd_inr_rate"];
const RATE_URL = "https://open.er-api.com/v6/latest/USD";
const FETCH_TIMEOUT_MS = 3000;

/** Called by the cron job — not by request handlers. */
export async function refreshUsdInrRate(): Promise<number | null> {
  try {
    const res = await fetch(RATE_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.ok) {
      const data = await res.json();
      const rate = data?.rates?.INR;
      if (typeof rate === "number" && rate > 0) {
        const store = await kv();
        await store.set(KV_FX_KEY, rate);
        return rate;
      }
    }
  } catch (err) {
    console.error("[fx] USD→INR rate fetch failed:", err);
  }
  return null;
}

/** Read the cached rate from KV. Returns FALLBACK_USD_INR if not yet set. */
export async function getUsdInrRate(): Promise<number> {
  const store = await kv();
  const entry = await store.get<number>(KV_FX_KEY);
  return entry.value ?? FALLBACK_USD_INR;
}
