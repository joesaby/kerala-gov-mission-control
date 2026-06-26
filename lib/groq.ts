/**
 * groq.ts — GROQ API client (OpenAI-compatible chat completions).
 *
 * No longer in the GO extraction fallback chain (that is Gemini → OpenRouter →
 * NVIDIA). Retained as a fast, text-only inference client for other pipeline
 * stages (e.g. graph inference / chunk classification) that can route to a
 * cheaper model. GROQ cannot read PDFs natively, so `groqExtractFromPdf` first
 * extracts readable text from the PDF bytes (`extractPdfText` from pdf-text.ts;
 * empty for scanned-image PDFs).
 *
 * Auth: GROQ_API_KEY in env.
 * Model: qwen/qwen3-32b by default (override with GROQ_MODEL).
 */

import { extractPdfText } from "./pdf-text.ts";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "qwen/qwen3-32b";

export function groqKey(): string | null {
  return Deno.env.get("GROQ_API_KEY") ?? null;
}

export function groqModel(): string {
  return Deno.env.get("GROQ_MODEL") ?? DEFAULT_MODEL;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface GroqOptions {
  maxRetries?: number;
  temperature?: number;
}

/**
 * Low-level GROQ chat-completion call.
 * The instruction prompt goes in the system message; document content goes in
 * the user message. Requests JSON mode (response_format: json_object).
 * Retries 429 and 5xx errors with exponential backoff.
 */
export async function groqGenerate(
  systemPrompt: string,
  userContent: string,
  opts: GroqOptions = {},
): Promise<string> {
  const key = groqKey();
  if (!key) throw new Error("GROQ_API_KEY is not set");

  const { maxRetries = 3, temperature = 0 } = opts;
  const payload = {
    model: groqModel(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    temperature,
  };

  let attempt = 0;
  const MAX_BACKOFF_S = 30;
  while (true) {
    const res = await fetch(GROQ_ENDPOINT, {
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
          `GROQ returned no text: ${JSON.stringify(data).slice(0, 300)}`,
        );
      }
      return text;
    }

    const body = await res.text();
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= maxRetries) {
      throw new Error(`GROQ HTTP ${res.status}: ${body.slice(0, 400)}`);
    }

    const backoff = Math.min(2 ** attempt, MAX_BACKOFF_S);
    attempt++;
    await sleep(backoff * 1000);
  }
}

/**
 * Extract structured data from a PDF using GROQ.
 * Pulls readable text from the PDF bytes and sends it alongside the prompt.
 */
export async function groqExtractFromPdf(
  pdfBytes: Uint8Array,
  prompt: string,
  opts: GroqOptions = {},
): Promise<string> {
  const text = extractPdfText(pdfBytes);
  const userContent = text.length > 50
    ? `Document text content:\n\n${text}`
    : "No readable text could be extracted from this PDF. Use the fallback metadata provided in the system prompt.";
  return await groqGenerate(prompt, userContent, opts);
}
