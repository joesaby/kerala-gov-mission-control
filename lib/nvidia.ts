/**
 * nvidia.ts — NVIDIA NIM client used as a Gemini fallback for GO extraction.
 *
 * Like GROQ, NVIDIA's hosted models are OpenAI-compatible chat (text in, text
 * out) and cannot read PDFs natively the way Gemini does. So this module first
 * extracts readable text from the PDF bytes (reusing `extractPdfText` from
 * groq.ts — effective for digitally-generated Kerala GOs, empty for scanned
 * images) and sends that text + the instruction prompt as a chat completion
 * against the OpenAI-compatible endpoint.
 *
 * Auth: NVIDIA_KEY in env (matches the Deno Deploy secret name).
 * Model: meta/llama-3.3-70b-instruct by default (override with NVIDIA_MODEL) —
 * confirm the exact current tag against https://build.nvidia.com/models.
 */

import { extractPdfText } from "./groq.ts";

const NVIDIA_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "meta/llama-3.3-70b-instruct";

export function nvidiaKey(): string | null {
  return Deno.env.get("NVIDIA_KEY") ?? null;
}

export function nvidiaModel(): string {
  return Deno.env.get("NVIDIA_MODEL") ?? DEFAULT_MODEL;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface NvidiaOptions {
  maxRetries?: number;
  temperature?: number;
}

/**
 * Low-level NVIDIA NIM chat-completion call.
 * The instruction prompt goes in the system message; document content goes in
 * the user message. Requests JSON mode (response_format: json_object).
 * Retries 429 and 5xx errors with exponential backoff — the free tier is
 * ~40 RPM shared across all models, so 429s are expected under bulk runs.
 */
export async function nvidiaGenerate(
  systemPrompt: string,
  userContent: string,
  opts: NvidiaOptions = {},
): Promise<string> {
  const key = nvidiaKey();
  if (!key) throw new Error("NVIDIA_KEY is not set");

  const { maxRetries = 3, temperature = 0 } = opts;
  const payload = {
    model: nvidiaModel(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    temperature,
    max_tokens: 4096,
  };

  let attempt = 0;
  const MAX_BACKOFF_S = 30;
  while (true) {
    const res = await fetch(NVIDIA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (typeof text !== "string") {
        throw new Error(
          `NVIDIA returned no text: ${JSON.stringify(data).slice(0, 300)}`,
        );
      }
      return text;
    }

    const body = await res.text();
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= maxRetries) {
      throw new Error(`NVIDIA HTTP ${res.status}: ${body.slice(0, 400)}`);
    }

    const backoff = Math.min(2 ** attempt, MAX_BACKOFF_S);
    attempt++;
    await sleep(backoff * 1000);
  }
}

/**
 * Extract structured data from a PDF using NVIDIA NIM.
 * Pulls readable text from the PDF bytes and sends it alongside the prompt.
 */
export async function nvidiaExtractFromPdf(
  pdfBytes: Uint8Array,
  prompt: string,
  opts: NvidiaOptions = {},
): Promise<string> {
  const text = extractPdfText(pdfBytes);
  const userContent = text.length > 50
    ? `Document text content:\n\n${text}`
    : "No readable text could be extracted from this PDF. Use the fallback metadata provided in the system prompt.";
  return await nvidiaGenerate(prompt, userContent, opts);
}
