/**
 * groq.ts — GROQ API client used as a Gemini fallback for GO extraction.
 *
 * GROQ cannot read PDFs natively, so this module first extracts readable text
 * from the PDF bytes (effective for digitally-generated Kerala government GOs;
 * returns empty for scanned-image PDFs). The extracted text + the original
 * instruction prompt are then sent as a standard chat-completion request.
 *
 * Auth: GROQ_API_KEY in env.
 * Model: qwen/qwen3-32b by default (override with GROQ_MODEL).
 */

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "qwen/qwen3-32b";
const MAX_TEXT_CHARS = 6_000;

export function groqKey(): string | null {
  return Deno.env.get("GROQ_API_KEY") ?? null;
}

export function groqModel(): string {
  return Deno.env.get("GROQ_MODEL") ?? DEFAULT_MODEL;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Extract readable text from PDF bytes without any subprocess or filesystem.
 * Works for digitally-generated PDFs (text stored as string operators in content
 * streams). Returns an empty string for scanned-image PDFs.
 */
export function extractPdfText(pdfBytes: Uint8Array): string {
  // Decode as Latin-1 so byte values map 1:1 to chars; PDF streams are binary.
  const raw = new TextDecoder("latin1").decode(pdfBytes);

  const texts: string[] = [];
  const btRe = /BT([\s\S]*?)ET/g;
  let bm: RegExpExecArray | null;

  while ((bm = btRe.exec(raw)) !== null) {
    const block = bm[1];
    // PDF string literals are delimited by unescaped parentheses.
    const strRe = /\(([^)\\]|\\.)*\)/g;
    let sm: RegExpExecArray | null;
    while ((sm = strRe.exec(block)) !== null) {
      const s = sm[0].slice(1, -1)
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, " ")
        .replace(/\\t/g, " ")
        .replace(/\\\\/g, "\\")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
      if (s.trim()) texts.push(s);
    }
  }

  if (texts.length > 0) return texts.join(" ").slice(0, MAX_TEXT_CHARS);

  // Fallback for PDFs where text isn't in BT/ET blocks: grab printable ASCII
  // runs that contain at least one letter.
  return (raw.match(/[\x20-\x7E]{8,}/g) ?? [])
    .filter((s) => /[a-zA-Z]/.test(s))
    .join(" ")
    .slice(0, MAX_TEXT_CHARS);
}

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
