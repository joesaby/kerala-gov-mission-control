/**
 * gemini.ts — minimal, dependency-light Gemini API client.
 *
 * Uses only `fetch` + `@std/encoding` so it runs unchanged on Deno Deploy
 * (no subprocess, no filesystem). This replaces the previous ingest path,
 * which shelled out to the `claude` CLI and `uv`/pypdf — neither of which
 * exists in the Deno Deploy runtime.
 *
 * Auth: an AI Studio API key in `GEMINI_API_KEY` (the `AQ.*` / `AIza*`
 * formats both work) passed via the `x-goog-api-key` header.
 *
 * Model: `gemini-flash-latest` by default. (Note: `gemini-2.0-flash` has a
 * zero free-tier quota on some keys; `gemini-flash-latest` is the safe
 * default. Override with `GEMINI_MODEL`.)
 */

import { encodeBase64 } from "@std/encoding/base64";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-flash-latest";

export function geminiKey(): string | null {
  return Deno.env.get("GEMINI_API_KEY") ?? null;
}

export function geminiModel(): string {
  return Deno.env.get("GEMINI_MODEL") ?? DEFAULT_MODEL;
}

export interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

interface GenerateOptions {
  /** Force a JSON response (sets responseMimeType). Default true. */
  json?: boolean;
  /** Sampling temperature. Default 0 for deterministic extraction. */
  temperature?: number;
  /** Max 429 retries before giving up. Default 4. */
  maxRetries?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Pull a retry delay (seconds) out of a Gemini 429 body, if present. */
function parseRetryDelaySeconds(body: string): number | null {
  // RetryInfo: "retryDelay": "47s"  — or message: "Please retry in 47.6s."
  const m = body.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/) ??
    body.match(/retry in (\d+(?:\.\d+)?)s/i);
  return m ? Number(m[1]) : null;
}

/**
 * Low-level generateContent call. Returns the first candidate's text.
 * Throws on non-retryable errors; retries 429s with backoff.
 */
export async function geminiGenerate(
  parts: GeminiPart[],
  opts: GenerateOptions = {},
): Promise<string> {
  const key = geminiKey();
  if (!key) throw new Error("GEMINI_API_KEY is not set");

  const { json = true, temperature = 0, maxRetries = 4 } = opts;
  const url = `${ENDPOINT}/${geminiModel()}:generateContent`;
  const payload = {
    contents: [{ parts }],
    generationConfig: {
      temperature,
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  };

  let attempt = 0;
  // Cap total backoff so a daily cron run can't hang for minutes.
  const MAX_BACKOFF_S = 60;
  while (true) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== "string") {
        throw new Error(
          `Gemini returned no text: ${JSON.stringify(data).slice(0, 300)}`,
        );
      }
      return text;
    }

    const body = await res.text();
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= maxRetries) {
      throw new Error(`Gemini HTTP ${res.status}: ${body.slice(0, 400)}`);
    }

    const suggested = parseRetryDelaySeconds(body);
    const backoff = Math.min(
      suggested ?? 2 ** attempt, // 1, 2, 4, 8 …
      MAX_BACKOFF_S,
    );
    attempt++;
    await sleep(backoff * 1000);
  }
}

/**
 * Send a PDF (as bytes) plus an instruction prompt and return the model text.
 * Gemini reads the PDF natively — no local text extraction needed.
 */
export async function geminiExtractFromPdf(
  pdfBytes: Uint8Array,
  prompt: string,
  opts: GenerateOptions = {},
): Promise<string> {
  return await geminiGenerate(
    [
      { text: prompt },
      {
        inline_data: {
          mime_type: "application/pdf",
          data: encodeBase64(pdfBytes),
        },
      },
    ],
    opts,
  );
}

/** Parse the first JSON object out of a model response (tolerates fences). */
export function parseJsonObject<T = unknown>(raw: string): T {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`No JSON object in model output: ${raw.slice(0, 200)}`);
  }
  return JSON.parse(raw.slice(start, end + 1)) as T;
}
