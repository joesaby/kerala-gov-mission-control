/**
 * openrouter.ts — OpenRouter client used as the primary Gemini fallback for GO
 * extraction.
 *
 * Unlike the NVIDIA text-only fallback, OpenRouter routes to a native-PDF-vision
 * model (google/gemini-2.5-flash-lite by default), so the PDF bytes go straight
 * to the model the way Gemini's own API reads them — it can read scanned/
 * image-only Kerala GOs that text extraction misses, and it has no 20-req/day
 * free-tier wall. OpenAI-compatible chat-completions endpoint.
 *
 * A PDF is sent as a `file` content part (base64 data URL). For a model that
 * supports file input natively (the Gemini family does) OpenRouter forwards the
 * PDF directly; otherwise it parses it server-side and passes the text through.
 *
 * Auth: OPENROUTER_API_KEY in env (matches the Deno Deploy secret name).
 * Model: google/gemini-2.5-flash-lite by default (override with OPENROUTER_MODEL).
 */

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";

export function openrouterKey(): string | null {
  return Deno.env.get("OPENROUTER_API_KEY") ?? null;
}

export function openrouterModel(): string {
  return Deno.env.get("OPENROUTER_MODEL") ?? DEFAULT_MODEL;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Base64-encode bytes in chunks (avoids call-stack overflow on large PDFs). */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

interface OpenRouterOptions {
  maxRetries?: number;
  temperature?: number;
}

/** A single content part of an OpenAI-compatible user message. */
type ContentPart =
  | { type: "text"; text: string }
  | { type: "file"; file: { filename: string; file_data: string } };

/**
 * Low-level OpenRouter chat-completion call. The instruction prompt goes in the
 * system message; `userContent` is either a plain string (text-only, e.g.
 * translation) or an array of content parts (multimodal, e.g. a PDF). Requests
 * JSON mode. Retries 429 and 5xx errors with exponential backoff.
 */
export async function openrouterGenerate(
  systemPrompt: string,
  userContent: string | ContentPart[],
  opts: OpenRouterOptions = {},
): Promise<string> {
  const key = openrouterKey();
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");

  const { maxRetries = 3, temperature = 0 } = opts;
  const payload = {
    model: openrouterModel(),
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
    const res = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        // Optional attribution headers used by OpenRouter for ranking.
        "HTTP-Referer": "https://kerala-mission-control.deno.dev",
        "X-Title": "Kerala Mission Control",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (typeof text !== "string") {
        throw new Error(
          `OpenRouter returned no text: ${JSON.stringify(data).slice(0, 300)}`,
        );
      }
      return text;
    }

    const body = await res.text();
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= maxRetries) {
      throw new Error(`OpenRouter HTTP ${res.status}: ${body.slice(0, 400)}`);
    }

    const backoff = Math.min(2 ** attempt, MAX_BACKOFF_S);
    attempt++;
    await sleep(backoff * 1000);
  }
}

/**
 * Extract structured data from a PDF using OpenRouter's native PDF support.
 * Sends the PDF bytes as a base64 `file` part so a vision-capable model reads
 * the document directly (handles scanned GOs the text-only fallbacks cannot).
 */
export async function openrouterExtractFromPdf(
  pdfBytes: Uint8Array,
  prompt: string,
  opts: OpenRouterOptions = {},
): Promise<string> {
  const dataUrl = `data:application/pdf;base64,${toBase64(pdfBytes)}`;
  const content: ContentPart[] = [
    {
      type: "text",
      text:
        "Extract the requested fields from the attached government order PDF.",
    },
    { type: "file", file: { filename: "go.pdf", file_data: dataUrl } },
  ];
  return await openrouterGenerate(prompt, content, opts);
}
