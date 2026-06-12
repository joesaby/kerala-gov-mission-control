#!/usr/bin/env -S deno run --allow-read
/**
 * Malayalam glyph validator.
 *
 * LLM-drafted Malayalam occasionally smuggles in a visually-similar character
 * from another Indic / Southeast-Asian script (e.g. KHMER LETTER DA ដ in place
 * of MALAYALAM LETTER TTA ട — caught in PR #22). Those scripts never
 * legitimately appear in this repo's fixtures, so any occurrence is corruption.
 *
 * Scans every data/*.ts fixture and fails (exit 1) if a character from a
 * known-wrong script block is found, reporting file, line, and codepoint.
 *
 * Run:  deno task check:ml
 */

/** Script blocks that must never appear in fixture text. */
const FORBIDDEN_BLOCKS: [number, number, string][] = [
  [0x0900, 0x097F, "Devanagari"],
  [0x0980, 0x09FF, "Bengali"],
  [0x0A00, 0x0A7F, "Gurmukhi"],
  [0x0A80, 0x0AFF, "Gujarati"],
  [0x0B00, 0x0B7F, "Oriya"],
  [0x0B80, 0x0BFF, "Tamil"],
  [0x0C00, 0x0C7F, "Telugu"],
  [0x0C80, 0x0CFF, "Kannada"],
  // 0x0D00–0x0D7F is Malayalam — allowed.
  [0x0D80, 0x0DFF, "Sinhala"],
  [0x0E00, 0x0E7F, "Thai"],
  [0x0E80, 0x0EFF, "Lao"],
  [0x1000, 0x109F, "Myanmar"],
  [0x1780, 0x17FF, "Khmer"],
];

function blockOf(cp: number): string | null {
  for (const [lo, hi, name] of FORBIDDEN_BLOCKS) {
    if (cp >= lo && cp <= hi) return name;
  }
  return null;
}

let violations = 0;

for await (const entry of Deno.readDir("data")) {
  if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
  const path = `data/${entry.name}`;
  const lines = (await Deno.readTextFile(path)).split("\n");
  lines.forEach((line, i) => {
    for (const ch of line) {
      const cp = ch.codePointAt(0)!;
      const block = blockOf(cp);
      if (block) {
        violations++;
        console.error(
          `${path}:${i + 1}: ${block} character "${ch}" (U+${
            cp.toString(16).toUpperCase().padStart(4, "0")
          }) — not Malayalam`,
        );
      }
    }
  });
}

if (violations > 0) {
  console.error(`\n${violations} foreign-script character(s) found.`);
  Deno.exit(1);
}
console.log("check:ml — no foreign-script characters in data/ fixtures.");
