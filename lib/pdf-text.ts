/**
 * pdf-text.ts — runtime-safe text extraction from PDF bytes.
 *
 * No subprocess, no filesystem — pure string scanning over the raw bytes, so it
 * runs unchanged inside Deno Deploy. Used by the text-only extraction fallbacks
 * (NVIDIA NIM) to read digitally-generated Kerala GOs; returns an empty string
 * for scanned-image PDFs (which only a native-PDF vision model can read).
 */

const MAX_TEXT_CHARS = 6_000;

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
