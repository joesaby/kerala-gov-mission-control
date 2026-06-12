import { FALLBACK_USD_INR } from "../data/lang.ts";

/**
 * USD→INR exchange rate with an in-memory cache.
 *
 * Runtime-safe (pure fetch, no KV/subprocess) so it works unchanged on Deno
 * Deploy. The cache is per-isolate; a fresh isolate pays one upstream call,
 * then serves the cached rate for 24 h. The upstream call is bounded by a
 * short timeout so a slow rate API can never stall page rendering — on any
 * failure we serve the last known rate, or FALLBACK_USD_INR.
 */

const RATE_URL = "https://open.er-api.com/v6/latest/USD";
const TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 2000;

let cached: { rate: number; fetchedAt: number } | null = null;

export async function getUsdInrRate(): Promise<number> {
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.rate;
  try {
    const res = await fetch(RATE_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.ok) {
      const data = await res.json();
      const rate = data?.rates?.INR;
      if (typeof rate === "number" && rate > 0) {
        cached = { rate, fetchedAt: Date.now() };
        return rate;
      }
    }
  } catch (err) {
    console.error("USD→INR rate fetch failed, using fallback:", err);
  }
  return cached?.rate ?? FALLBACK_USD_INR;
}
