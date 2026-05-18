# Malayalam → English Translate Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Deno CLI (`scripts/translate.ts`) that translates Malayalam transcript files produced by `scripts/transcript.ts` into English, locally, using Ollama + Aya Expanse 8B. Paragraph-level progress, crash-resume via a `.partial` file, no cloud APIs.

**Architecture:** Single-file CLI. Pure functions (parse, chunk, format, resume math) are unit-tested with `Deno.test`. The Ollama HTTP layer is unit-tested with an injected `fetch` and smoke-tested against a real local Ollama in Task 8.

**Tech Stack:** Deno 2.x, TypeScript, `jsr:@std/cli` for arg parsing, `jsr:@std/assert` for tests, local Ollama (`localhost:11434`) running `aya-expanse:8b`.

**Source spec:** `docs/superpowers/specs/2026-05-18-malayalam-english-translate-script-design.md`

---

## File Map

| Path | Responsibility | Status |
| --- | --- | --- |
| `scripts/translate.ts` | Single-file CLI: arg parsing, transcript parsing, paragraph chunking, Ollama pre-flight, translation loop with resume, output writing | Create |
| `scripts/translate_test.ts` | Unit tests for all pure functions + mocked-`fetch` tests for the Ollama client | Create |
| `deno.json` | Add `translate` task to the `tasks` block | Modify |
| `.gitignore` | Ignore `*.partial` files under `data/transcripts/` | Modify |
| `README.md` | Document the new task, Ollama/model dependency | Modify |

---

## Task 0: Pull Aya Expanse 8B and verify the Ollama tag

**Why first:** The spec assumes the model tag is `aya-expanse:8b`. If the Ollama library uses a different namespace (e.g. `aya:8b`, or it lives only on Hugging Face), the rest of the plan needs adjusting before any code is written.

**Files:** none (verification step only)

- [ ] **Step 1: Confirm Ollama is running**

```bash
curl -s http://localhost:11434/api/tags | head -c 200
```

Expected: a JSON response that starts with `{"models":[...`. If you get "Connection refused", start Ollama (`ollama serve` or open the Ollama app) and retry.

- [ ] **Step 2: Pull the model**

```bash
ollama pull aya-expanse:8b
```

If that tag doesn't exist, the CLI will print "model not found". In that case, search the Ollama library at <https://ollama.com/library> for `aya` and pull whichever 8B-class multilingual Aya variant is available (e.g. `aya:8b`). **Update the spec's default model and this plan's references before continuing** — search-and-replace `aya-expanse:8b` across `docs/superpowers/specs/2026-05-18-malayalam-english-translate-script-design.md` and this plan, and commit that change separately.

- [ ] **Step 3: Confirm the pulled tag shows in `/api/tags`**

```bash
curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | sort -u
```

Expected: the output includes `"name":"aya-expanse:8b"` (or whatever you settled on in Step 2).

- [ ] **Step 4: Sanity-translate one line through the raw API**

```bash
curl -s http://localhost:11434/api/generate -d '{
  "model": "aya-expanse:8b",
  "system": "You are a precise translator. Translate the user'\''s Malayalam text to natural, fluent English. Output ONLY the English translation.",
  "prompt": "നമസ്കാരം, എങ്ങനെയുണ്ട്?",
  "stream": false,
  "options": { "temperature": 0.2 }
}' | python3 -c 'import json,sys; print(json.load(sys.stdin)["response"])'
```

Expected: something like "Hello, how are you?" (exact wording will vary). If the output is gibberish, not English, or contains preamble like `Here is the translation: ...`, the engine choice in the spec needs revisiting — STOP and flag this before continuing.

- [ ] **Step 5: No commit** — this task produced no files.

---

## Task 1: Scaffold the `translate` task and stub script

**Files:**
- Modify: `deno.json` (tasks block)
- Create: `scripts/translate.ts` (stub only)
- Modify: `.gitignore` (ignore `data/transcripts/*.partial`)

- [ ] **Step 1: Add the task to `deno.json`**

Read `deno.json`. In the `tasks` block, add `translate` right after `transcript` (or after `seed` if `transcript` is not yet present):

```jsonc
    "translate": "deno run -A scripts/translate.ts",
```

Resulting block:

```jsonc
  "tasks": {
    "check": "deno fmt --check . && deno lint . && deno check",
    "dev": "deno run -A --watch=static/,routes/ dev.ts",
    "build": "deno run -A dev.ts build",
    "start": "deno serve -A _fresh/server.js",
    "seed": "deno run -A scripts/seed.ts",
    "transcript": "deno run -A --env-file=.env scripts/transcript.ts",
    "translate": "deno run -A scripts/translate.ts",
    "update": "deno run -A -r jsr:@fresh/update ."
  },
```

(`-A` matches existing tasks. No `--env-file` — this script reads no env vars.)

- [ ] **Step 2: Create the CLI stub**

Create `scripts/translate.ts`:

```typescript
if (import.meta.main) {
  console.error("scripts/translate.ts: not implemented yet");
  Deno.exit(1);
}
```

- [ ] **Step 3: Ignore `.partial` files in git**

Append to `.gitignore`:

```
# Translation work-in-progress files
data/transcripts/*.partial
```

- [ ] **Step 4: Verify the task runs**

```bash
deno task translate
```

Expected: prints `scripts/translate.ts: not implemented yet` and exits 1.

- [ ] **Step 5: Commit**

```bash
git add deno.json scripts/translate.ts .gitignore
git commit -m "Scaffold translate CLI task and stub"
```

---

## Task 2: Transcript file parser + tests

**Files:**
- Create: `scripts/translate_test.ts`
- Modify: `scripts/translate.ts` (add `parseTranscript` export above the `if (import.meta.main)` block)

`parseTranscript` is the first pure function. It splits a transcript file into header + body and extracts the named header fields the output writer needs.

- [ ] **Step 1: Write the failing tests**

Create `scripts/translate_test.ts`:

```typescript
import { assertEquals, assertThrows } from "jsr:@std/assert@^1";
import { parseTranscript } from "./translate.ts";

const SAMPLE_ML_TXT = `Source: https://www.youtube.com/watch?v=5MVkCqd2U10
Video ID: 5MVkCqd2U10
Title: Kerala CM press meet
Language: ml (Malayalam)
Fetched: 2026-05-18T12:34:56Z
Method: timedtext

---

ഇന്ന് നമ്മൾ ചർച്ച ചെയ്യാൻ പോകുന്നത് വളരെ പ്രധാനപ്പെട്ട ഒരു വിഷയമാണ്.

രണ്ടാമത്തെ ഖണ്ഡിക ഇവിടെ.
`;

Deno.test("parseTranscript: extracts header fields and body", () => {
  const parsed = parseTranscript(SAMPLE_ML_TXT);
  assertEquals(parsed.header.source, "https://www.youtube.com/watch?v=5MVkCqd2U10");
  assertEquals(parsed.header.videoId, "5MVkCqd2U10");
  assertEquals(parsed.header.title, "Kerala CM press meet");
  assertEquals(parsed.header.language, "ml (Malayalam)");
  assertEquals(parsed.header.fetched, "2026-05-18T12:34:56Z");
  assertEquals(parsed.header.method, "timedtext");
  assertEquals(
    parsed.body.trim(),
    "ഇന്ന് നമ്മൾ ചർച്ച ചെയ്യാൻ പോകുന്നത് വളരെ പ്രധാനപ്പെട്ട ഒരു വിഷയമാണ്.\n\nരണ്ടാമത്തെ ഖണ്ഡിക ഇവിടെ.",
  );
});

Deno.test("parseTranscript: rejects file with no --- separator", () => {
  assertThrows(
    () => parseTranscript("Source: foo\nLanguage: ml (Malayalam)\nno separator here\n"),
    Error,
    "expected transcript header followed by `---`",
  );
});

Deno.test("parseTranscript: rejects non-Malayalam language", () => {
  const enInput = SAMPLE_ML_TXT.replace("Language: ml (Malayalam)", "Language: en (English)");
  assertThrows(
    () => parseTranscript(enInput),
    Error,
    "translates Malayalam (`ml`) only",
  );
});

Deno.test("parseTranscript: language line missing entirely", () => {
  const noLang = SAMPLE_ML_TXT.replace("Language: ml (Malayalam)\n", "");
  assertThrows(
    () => parseTranscript(noLang),
    Error,
    "translates Malayalam (`ml`) only",
  );
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
deno test scripts/translate_test.ts
```

Expected: all four tests FAIL with `parseTranscript` not exported.

- [ ] **Step 3: Implement `parseTranscript`**

Replace the contents of `scripts/translate.ts` with:

```typescript
export interface ParsedTranscript {
  rawHeader: string;
  body: string;
  header: {
    source?: string;
    videoId?: string;
    title?: string;
    language: string;
    fetched?: string;
    method?: string;
  };
}

const HEADER_FIELDS: Record<string, keyof ParsedTranscript["header"]> = {
  "Source": "source",
  "Video ID": "videoId",
  "Title": "title",
  "Language": "language",
  "Fetched": "fetched",
  "Method": "method",
};

export function parseTranscript(text: string): ParsedTranscript {
  const sepMatch = text.match(/^---\s*$/m);
  if (!sepMatch || sepMatch.index === undefined) {
    throw new Error("expected transcript header followed by `---` on its own line");
  }
  const rawHeader = text.slice(0, sepMatch.index).trimEnd();
  const body = text.slice(sepMatch.index + sepMatch[0].length).replace(/^\r?\n/, "");

  const header: ParsedTranscript["header"] = { language: "" };
  for (const line of rawHeader.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z][A-Za-z ]*?):\s*(.+)$/);
    if (!m) continue;
    const key = HEADER_FIELDS[m[1]];
    if (key) header[key] = m[2].trim();
  }

  if (!header.language.startsWith("ml")) {
    throw new Error(
      `this script translates Malayalam (\`ml\`) only; got \`${header.language || "<missing>"}\``,
    );
  }

  return { rawHeader, body, header };
}

if (import.meta.main) {
  console.error("scripts/translate.ts: not implemented yet");
  Deno.exit(1);
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
deno test scripts/translate_test.ts
```

Expected: all four PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/translate.ts scripts/translate_test.ts
git commit -m "Add parseTranscript with header/body extraction and language guard"
```

---

## Task 3: Paragraph chunking utilities + tests

**Files:**
- Modify: `scripts/translate.ts` (add `splitParagraphs`, `splitSpeakerPrefix`, `countCompletedParagraphs`)
- Modify: `scripts/translate_test.ts` (append tests)

These three functions are all small, related, and share test fixtures, so they go in one task.

- [ ] **Step 1: Write the failing tests**

Append to `scripts/translate_test.ts`:

```typescript
import {
  splitParagraphs,
  splitSpeakerPrefix,
  countCompletedParagraphs,
} from "./translate.ts";

Deno.test("splitParagraphs: YouTube paragraphs on single blank lines", () => {
  const body = "Para one.\n\nPara two.\n\nPara three.\n";
  assertEquals(splitParagraphs(body), ["Para one.", "Para two.", "Para three."]);
});

Deno.test("splitParagraphs: collapses multiple consecutive blank lines", () => {
  const body = "First.\n\n\n\nSecond.\n";
  assertEquals(splitParagraphs(body), ["First.", "Second."]);
});

Deno.test("splitParagraphs: empty body returns empty list", () => {
  assertEquals(splitParagraphs(""), []);
  assertEquals(splitParagraphs("\n\n\n"), []);
});

Deno.test("splitParagraphs: trims whitespace per paragraph", () => {
  assertEquals(splitParagraphs("  hello  \n\n  world  \n"), ["hello", "world"]);
});

Deno.test("splitSpeakerPrefix: extracts Sarvam speaker prefix", () => {
  assertEquals(
    splitSpeakerPrefix("[Speaker 1]: ഇത് ഒരു വാചകം."),
    { prefix: "[Speaker 1]: ", text: "ഇത് ഒരു വാചകം." },
  );
});

Deno.test("splitSpeakerPrefix: handles two-digit speaker numbers", () => {
  assertEquals(
    splitSpeakerPrefix("[Speaker 12]: hello"),
    { prefix: "[Speaker 12]: ", text: "hello" },
  );
});

Deno.test("splitSpeakerPrefix: no prefix returns empty prefix", () => {
  assertEquals(
    splitSpeakerPrefix("Plain paragraph text."),
    { prefix: "", text: "Plain paragraph text." },
  );
});

Deno.test("countCompletedParagraphs: counts paragraphs in partial body", () => {
  const partial = `Source: ...
Language: en (translated from ml)

---

First translated.

Second translated.
`;
  assertEquals(countCompletedParagraphs(partial), 2);
});

Deno.test("countCompletedParagraphs: empty body returns 0", () => {
  const partial = `Source: ...

---

`;
  assertEquals(countCompletedParagraphs(partial), 0);
});

Deno.test("countCompletedParagraphs: partial without --- returns 0", () => {
  assertEquals(countCompletedParagraphs("just some text no separator"), 0);
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
deno test scripts/translate_test.ts
```

Expected: the new tests FAIL (functions not exported). Tests from Task 2 still PASS.

- [ ] **Step 3: Implement the three functions**

Add to `scripts/translate.ts`, above `if (import.meta.main)`:

```typescript
export function splitParagraphs(body: string): string[] {
  return body
    .split(/(?:\r?\n)\s*(?:\r?\n)+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

const SPEAKER_PREFIX_RE = /^(\[Speaker \d+\]: )([\s\S]*)$/;

export function splitSpeakerPrefix(paragraph: string): { prefix: string; text: string } {
  const m = paragraph.match(SPEAKER_PREFIX_RE);
  if (!m) return { prefix: "", text: paragraph };
  return { prefix: m[1], text: m[2] };
}

export function countCompletedParagraphs(partialContent: string): number {
  const sep = partialContent.match(/^---\s*$/m);
  if (!sep || sep.index === undefined) return 0;
  const body = partialContent.slice(sep.index + sep[0].length);
  return splitParagraphs(body).length;
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
deno test scripts/translate_test.ts
```

Expected: all tests PASS (Tasks 2 + 3 combined).

- [ ] **Step 5: Commit**

```bash
git add scripts/translate.ts scripts/translate_test.ts
git commit -m "Add paragraph chunking and resume-count helpers"
```

---

## Task 4: Output header builder + tests

**Files:**
- Modify: `scripts/translate.ts` (add `buildOutputHeader`)
- Modify: `scripts/translate_test.ts` (append tests)

- [ ] **Step 1: Write the failing tests**

Append to `scripts/translate_test.ts`:

```typescript
import { buildOutputHeader } from "./translate.ts";

Deno.test("buildOutputHeader: builds English-side header preserving source fields", () => {
  const input: import("./translate.ts").ParsedTranscript["header"] = {
    source: "https://www.youtube.com/watch?v=5MVkCqd2U10",
    videoId: "5MVkCqd2U10",
    title: "Kerala CM press meet",
    language: "ml (Malayalam)",
    fetched: "2026-05-18T12:34:56Z",
    method: "timedtext",
  };
  const out = buildOutputHeader(input, {
    model: "aya-expanse:8b",
    translatedAt: "2026-05-19T09:12:34Z",
  });
  assertEquals(
    out,
    `Source: https://www.youtube.com/watch?v=5MVkCqd2U10
Video ID: 5MVkCqd2U10
Title: Kerala CM press meet
Language: en (translated from ml)
Fetched: 2026-05-18T12:34:56Z
Source method: timedtext
Translation: aya-expanse:8b via Ollama (local)
Translated: 2026-05-19T09:12:34Z`,
  );
});

Deno.test("buildOutputHeader: omits missing optional fields", () => {
  const out = buildOutputHeader(
    { language: "ml (Malayalam)" },
    { model: "aya-expanse:8b", translatedAt: "2026-05-19T09:12:34Z" },
  );
  // Source, Video ID, Title, Fetched, Source method lines all absent
  assertEquals(
    out,
    `Language: en (translated from ml)
Translation: aya-expanse:8b via Ollama (local)
Translated: 2026-05-19T09:12:34Z`,
  );
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
deno test scripts/translate_test.ts
```

Expected: the two new tests FAIL (`buildOutputHeader` not exported).

- [ ] **Step 3: Implement `buildOutputHeader`**

Add to `scripts/translate.ts`, above `if (import.meta.main)`:

```typescript
export function buildOutputHeader(
  input: ParsedTranscript["header"],
  opts: { model: string; translatedAt: string },
): string {
  const lines: string[] = [];
  if (input.source) lines.push(`Source: ${input.source}`);
  if (input.videoId) lines.push(`Video ID: ${input.videoId}`);
  if (input.title) lines.push(`Title: ${input.title}`);
  lines.push(`Language: en (translated from ml)`);
  if (input.fetched) lines.push(`Fetched: ${input.fetched}`);
  if (input.method) lines.push(`Source method: ${input.method}`);
  lines.push(`Translation: ${opts.model} via Ollama (local)`);
  lines.push(`Translated: ${opts.translatedAt}`);
  return lines.join("\n");
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
deno test scripts/translate_test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/translate.ts scripts/translate_test.ts
git commit -m "Add buildOutputHeader for English transcript header"
```

---

## Task 5: Ollama pre-flight (`checkOllama`) + mocked tests

**Files:**
- Modify: `scripts/translate.ts` (add `checkOllama` and a `FetchFn` type)
- Modify: `scripts/translate_test.ts` (append mocked-fetch tests)

`checkOllama` verifies the daemon is reachable and the requested model is pulled. It takes a `fetch`-compatible function as a parameter so tests can swap in a mock.

- [ ] **Step 1: Write the failing tests**

Append to `scripts/translate_test.ts`:

```typescript
import { checkOllama } from "./translate.ts";

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): typeof fetch {
  return ((input: Request | URL | string, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    return Promise.resolve(handler(url, init));
  }) as typeof fetch;
}

Deno.test("checkOllama: passes when model is present in /api/tags", async () => {
  const fetchFn = mockFetch((url) => {
    assertEquals(url, "http://localhost:11434/api/tags");
    return new Response(
      JSON.stringify({ models: [{ name: "aya-expanse:8b" }, { name: "llama3.2:1b" }] }),
      { status: 200 },
    );
  });
  // Should not throw
  await checkOllama("aya-expanse:8b", fetchFn);
});

Deno.test("checkOllama: throws when daemon refuses connection", async () => {
  const fetchFn = mockFetch(() => {
    throw new TypeError("error sending request: connection refused");
  });
  let err: Error | undefined;
  try {
    await checkOllama("aya-expanse:8b", fetchFn);
  } catch (e) {
    err = e as Error;
  }
  assertEquals(err?.message.includes("Ollama isn't running"), true);
});

Deno.test("checkOllama: throws when model is not pulled", async () => {
  const fetchFn = mockFetch(() =>
    new Response(JSON.stringify({ models: [{ name: "llama3.2:1b" }] }), { status: 200 })
  );
  let err: Error | undefined;
  try {
    await checkOllama("aya-expanse:8b", fetchFn);
  } catch (e) {
    err = e as Error;
  }
  assertEquals(err?.message.includes("ollama pull aya-expanse:8b"), true);
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
deno test scripts/translate_test.ts
```

Expected: the three new tests FAIL (`checkOllama` not exported).

- [ ] **Step 3: Implement `checkOllama`**

Add to `scripts/translate.ts`, above `if (import.meta.main)`:

```typescript
export type FetchFn = typeof fetch;

const OLLAMA_BASE = "http://localhost:11434";

export async function checkOllama(model: string, fetchFn: FetchFn = fetch): Promise<void> {
  let resp: Response;
  try {
    resp = await fetchFn(`${OLLAMA_BASE}/api/tags`);
  } catch (_e) {
    throw new Error(
      "Ollama isn't running. Start with `ollama serve` or open the Ollama app.",
    );
  }
  if (!resp.ok) {
    throw new Error(
      `Ollama /api/tags returned HTTP ${resp.status}. Is the daemon healthy?`,
    );
  }
  const data = await resp.json() as { models?: Array<{ name: string }> };
  const pulled = (data.models ?? []).map((m) => m.name);
  if (!pulled.includes(model)) {
    throw new Error(`Run \`ollama pull ${model}\` (~5GB).`);
  }
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
deno test scripts/translate_test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/translate.ts scripts/translate_test.ts
git commit -m "Add checkOllama pre-flight with mocked-fetch tests"
```

---

## Task 6: Ollama HTTP translator (`translateParagraph`) + mocked tests

**Files:**
- Modify: `scripts/translate.ts` (add `TRANSLATE_SYSTEM_PROMPT` and `translateParagraph`)
- Modify: `scripts/translate_test.ts` (append mocked-fetch tests)

- [ ] **Step 1: Write the failing tests**

Append to `scripts/translate_test.ts`:

```typescript
import { translateParagraph } from "./translate.ts";

Deno.test("translateParagraph: sends correct payload and returns response text", async () => {
  let capturedBody: unknown;
  const fetchFn = mockFetch((url, init) => {
    assertEquals(url, "http://localhost:11434/api/generate");
    capturedBody = JSON.parse(init!.body as string);
    return new Response(
      JSON.stringify({ response: "Hello, how are you?", done: true }),
      { status: 200 },
    );
  });
  const out = await translateParagraph("നമസ്കാരം, എങ്ങനെയുണ്ട്?", "aya-expanse:8b", fetchFn);
  assertEquals(out, "Hello, how are you?");
  assertEquals((capturedBody as { model: string }).model, "aya-expanse:8b");
  assertEquals((capturedBody as { prompt: string }).prompt, "നമസ്കാരം, എങ്ങനെയുണ്ട്?");
  assertEquals((capturedBody as { stream: boolean }).stream, false);
  assertEquals(
    (capturedBody as { options: { temperature: number } }).options.temperature,
    0.2,
  );
});

Deno.test("translateParagraph: throws on HTTP error", async () => {
  const fetchFn = mockFetch(() => new Response("internal err", { status: 500 }));
  let err: Error | undefined;
  try {
    await translateParagraph("hello", "aya-expanse:8b", fetchFn);
  } catch (e) {
    err = e as Error;
  }
  assertEquals(err?.message.includes("Ollama returned HTTP 500"), true);
});

Deno.test("translateParagraph: throws on empty response", async () => {
  const fetchFn = mockFetch(() =>
    new Response(JSON.stringify({ response: "   \n\t", done: true }), { status: 200 })
  );
  let err: Error | undefined;
  try {
    await translateParagraph("hello", "aya-expanse:8b", fetchFn);
  } catch (e) {
    err = e as Error;
  }
  assertEquals(err?.message.includes("empty translation"), true);
});

Deno.test("translateParagraph: trims whitespace from response", async () => {
  const fetchFn = mockFetch(() =>
    new Response(
      JSON.stringify({ response: "  Hello.\n", done: true }),
      { status: 200 },
    )
  );
  const out = await translateParagraph("hello", "aya-expanse:8b", fetchFn);
  assertEquals(out, "Hello.");
});

Deno.test("translateParagraph: collapses internal blank lines (so resume math stays correct)", async () => {
  const fetchFn = mockFetch(() =>
    new Response(
      JSON.stringify({ response: "Line one.\n\nLine two.\n\n\nLine three.", done: true }),
      { status: 200 },
    )
  );
  const out = await translateParagraph("hello", "aya-expanse:8b", fetchFn);
  // Internal \n\n collapsed to single \n so the paragraph remains ONE paragraph
  // when re-split by splitParagraphs during resume.
  assertEquals(out, "Line one.\nLine two.\nLine three.");
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
deno test scripts/translate_test.ts
```

Expected: the four new tests FAIL (`translateParagraph` not exported).

- [ ] **Step 3: Implement `translateParagraph`**

Add to `scripts/translate.ts`, above `if (import.meta.main)`:

```typescript
export const TRANSLATE_SYSTEM_PROMPT =
  "You are a precise translator. Translate the user's Malayalam text to natural, " +
  "fluent English. Preserve meaning, names, numbers, and dates exactly. Output ONLY " +
  "the English translation — no preamble, no explanation, no quotation marks.";

export async function translateParagraph(
  malayalam: string,
  model: string,
  fetchFn: FetchFn = fetch,
): Promise<string> {
  const resp = await fetchFn(`${OLLAMA_BASE}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      system: TRANSLATE_SYSTEM_PROMPT,
      prompt: malayalam,
      stream: false,
      options: { temperature: 0.2 },
    }),
  });
  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Ollama returned HTTP ${resp.status}: ${errBody.slice(0, 200)}`);
  }
  const data = await resp.json() as { response?: string };
  // Collapse any internal blank lines so the result is always exactly ONE
  // paragraph in the output file. This keeps countCompletedParagraphs in
  // sync with the translation loop's position when resuming.
  const text = (data.response ?? "").trim().replace(/\n\s*\n+/g, "\n");
  if (text.length === 0) {
    throw new Error("Ollama returned an empty translation");
  }
  return text;
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
deno test scripts/translate_test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/translate.ts scripts/translate_test.ts
git commit -m "Add translateParagraph Ollama HTTP client with mocked tests"
```

---

## Task 7: CLI orchestrator + arg parsing

**Files:**
- Modify: `scripts/translate.ts` (replace the `if (import.meta.main)` stub with the full main function)

This task wires the pieces together: argument parsing, file IO, pre-flight, the translation loop, progress output, resume logic, and exit-code mapping. It is the only task without unit tests — the end-to-end smoke test in Task 8 covers it.

- [ ] **Step 1: Replace the `import.meta.main` block with the full main function**

In `scripts/translate.ts`, replace:

```typescript
if (import.meta.main) {
  console.error("scripts/translate.ts: not implemented yet");
  Deno.exit(1);
}
```

with:

```typescript
import { parseArgs } from "jsr:@std/cli@^1/parse-args";
import { basename, dirname, join } from "jsr:@std/path@^1";

const DEFAULT_MODEL = "aya-expanse:8b";

function die(code: number, message: string): never {
  console.error(message);
  Deno.exit(code);
}

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    string: ["model", "out"],
    boolean: ["force", "help"],
    alias: { h: "help" },
    default: { model: DEFAULT_MODEL },
  });

  if (args.help || args._.length === 0) {
    console.log(
      "Usage: deno task translate <file.ml.txt> [--model <tag>] [--out <dir>] [--force]",
    );
    Deno.exit(args.help ? 0 : 2);
  }

  const inputPath = String(args._[0]);
  const model = args.model as string;
  const outDir = (args.out as string | undefined) ?? dirname(inputPath);
  const force = Boolean(args.force);

  // Read input
  let raw: string;
  try {
    raw = await Deno.readTextFile(inputPath);
  } catch {
    die(2, `Input file not found: ${inputPath}`);
  }

  // Parse + validate
  let parsed: ParsedTranscript;
  try {
    parsed = parseTranscript(raw);
  } catch (e) {
    die(2, (e as Error).message);
  }

  // Output paths
  const baseName = basename(inputPath).replace(/\.ml\.txt$/, "");
  const outPath = join(outDir, `${baseName}.en.txt`);
  const partialPath = `${outPath}.partial`;

  // Existing-output guard
  try {
    await Deno.stat(outPath);
    if (!force) {
      die(7, `Output exists: ${outPath}. Pass --force to overwrite.`);
    }
    await Deno.remove(outPath);
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) throw e;
  }

  // Pre-flight Ollama
  try {
    await checkOllama(model);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("Ollama isn't running")) die(3, msg);
    if (msg.includes("ollama pull")) die(4, msg);
    die(5, msg);
  }

  // Chunk
  const paragraphs = splitParagraphs(parsed.body);
  if (paragraphs.length === 0) {
    die(2, "Input transcript body is empty — nothing to translate.");
  }

  // Resume detection
  let resumeFrom = 0;
  let partialContent = "";
  if (!force) {
    try {
      partialContent = await Deno.readTextFile(partialPath);
      resumeFrom = countCompletedParagraphs(partialContent);
      if (resumeFrom > paragraphs.length) {
        die(
          8,
          `Partial file has ${resumeFrom} paragraphs but input has ${paragraphs.length}; pass --force to start over.`,
        );
      }
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) throw e;
    }
  } else {
    try {
      await Deno.remove(partialPath);
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) throw e;
    }
  }

  // If no partial yet, seed it with the header
  if (resumeFrom === 0) {
    const header = buildOutputHeader(parsed.header, {
      model,
      translatedAt: new Date().toISOString(),
    });
    await Deno.writeTextFile(partialPath, `${header}\n\n---\n\n`);
  } else {
    console.log(`Resuming from paragraph ${resumeFrom + 1}/${paragraphs.length} (using existing ${partialPath})`);
  }

  // Translation loop
  const started = Date.now();
  for (let i = resumeFrom; i < paragraphs.length; i++) {
    const { prefix, text } = splitSpeakerPrefix(paragraphs[i]);
    let translated: string;
    try {
      translated = await translateParagraph(text, model);
    } catch (e) {
      const msg = (e as Error).message;
      console.error(`Paragraph ${i + 1}/${paragraphs.length} failed:`);
      console.error(`  input: ${text.slice(0, 200)}${text.length > 200 ? "…" : ""}`);
      console.error(`  error: ${msg}`);
      console.error(`Partial file preserved at: ${partialPath}`);
      if (msg.includes("empty translation")) Deno.exit(6);
      Deno.exit(5);
    }
    await Deno.writeTextFile(partialPath, `${prefix}${translated}\n\n`, { append: true });
    console.log(`[${i + 1}/${paragraphs.length}] ✓`);
  }

  // Finalize
  await Deno.rename(partialPath, outPath);
  const elapsed = Math.round((Date.now() - started) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  console.log(
    `Done. Wrote ${outPath} (${paragraphs.length} paragraphs, ${mins}m${secs}s).`,
  );
}

if (import.meta.main) {
  await main();
}
```

- [ ] **Step 2: Type-check the script**

```bash
deno check scripts/translate.ts
```

Expected: no errors.

- [ ] **Step 3: Confirm `--help` works**

```bash
deno task translate --help
```

Expected: prints the usage line and exits 0.

- [ ] **Step 4: Confirm missing-arg behavior**

```bash
deno task translate
```

Expected: prints the usage line and exits 2.

- [ ] **Step 5: Run the full test suite to confirm nothing regressed**

```bash
deno test scripts/translate_test.ts
```

Expected: all tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/translate.ts
git commit -m "Wire translate.ts CLI: parsing, pre-flight, loop, resume"
```

---

## Task 8: End-to-end smoke test against real Ollama

**Why this task is manual:** the unit tests cover every pure function and the HTTP layer with a mocked `fetch`. The remaining risk is integration — that the script reads a real file, talks to a real Ollama, produces a sensible English output file, and resumes correctly after a kill. This task walks through that by hand.

**Files:**
- Create (temporary, then delete): `data/transcripts/_smoke.ml.txt`

- [ ] **Step 1: Create a tiny fixture transcript**

Run:

```bash
mkdir -p data/transcripts
cat > data/transcripts/_smoke.ml.txt <<'EOF'
Source: https://example.invalid/smoke
Video ID: _smoke
Title: Smoke test fixture
Language: ml (Malayalam)
Fetched: 2026-05-18T00:00:00Z
Method: smoke

---

നമസ്കാരം, എങ്ങനെയുണ്ട്?

ഇന്ന് കാലാവസ്ഥ വളരെ നല്ലതാണ്.

[Speaker 1]: ഞാൻ ഇന്ന് ഓഫീസിൽ പോകുന്നു.

[Speaker 2]: എനിക്കും വരണം.
EOF
```

- [ ] **Step 2: Run the translate task end-to-end**

```bash
deno task translate data/transcripts/_smoke.ml.txt
```

Expected:
- Progress output: `[1/4] ✓` through `[4/4] ✓`.
- Final line: `Done. Wrote data/transcripts/_smoke.en.txt (4 paragraphs, ...).`
- File exists: `ls -la data/transcripts/_smoke.en.txt`.
- No `.partial` file remains: `ls data/transcripts/_smoke.en.txt.partial 2>&1` should say "No such file".

- [ ] **Step 3: Inspect the English output**

```bash
cat data/transcripts/_smoke.en.txt
```

Verify by eye:
- Header has `Language: en (translated from ml)`, `Source method: smoke`, `Translation: aya-expanse:8b via Ollama (local)`, and a `Translated:` timestamp.
- Body has four paragraphs in English.
- The last two paragraphs preserve the `[Speaker 1]:` / `[Speaker 2]:` prefixes verbatim.
- Translations make sense (not gibberish, not Malayalam, not preambles like "Here is the translation:").

- [ ] **Step 4: Test the existing-output guard**

```bash
deno task translate data/transcripts/_smoke.ml.txt
```

Expected: exits with `Output exists: data/transcripts/_smoke.en.txt. Pass --force to overwrite.` and exit code 7.

```bash
echo $?
```

Expected: `7`.

- [ ] **Step 5: Test `--force` overwrites**

```bash
deno task translate data/transcripts/_smoke.ml.txt --force
```

Expected: runs the full translation again, ends with `Done.`

- [ ] **Step 6: Test resume after kill**

In one terminal:

```bash
deno task translate data/transcripts/_smoke.ml.txt --force
```

After the first `[1/4] ✓` appears, hit `Ctrl+C`. Then check:

```bash
cat data/transcripts/_smoke.en.txt.partial
```

Expected: header + `---` + one translated paragraph.

Resume:

```bash
deno task translate data/transcripts/_smoke.ml.txt
```

Expected:
- First line: `Resuming from paragraph 2/4 (using existing data/transcripts/_smoke.en.txt.partial)`.
- Progress continues from `[2/4] ✓`.
- Finalizes to `_smoke.en.txt`.

- [ ] **Step 7: Test the Ollama-down error path**

In a separate terminal, stop Ollama (close the app or kill `ollama serve`). Then:

```bash
deno task translate data/transcripts/_smoke.ml.txt --force
```

Expected: `Ollama isn't running. Start with \`ollama serve\` or open the Ollama app.`, exit code 3.

Restart Ollama before continuing.

- [ ] **Step 8: Clean up the fixture**

```bash
rm data/transcripts/_smoke.ml.txt data/transcripts/_smoke.en.txt
ls data/transcripts/_smoke* 2>&1 || true
```

Expected: no `_smoke.*` files remain.

- [ ] **Step 9: No commit** — fixture removed, only checked behavior.

---

## Task 9: README update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read the current README**

```bash
cat README.md
```

Find the section that documents `deno task transcript` (added by the transcript-script work). The new `translate` task should be documented adjacent to it.

- [ ] **Step 2: Add a `translate` section**

Add a subsection right after the `transcript` documentation:

```markdown
### Translate a Malayalam transcript to English

After `deno task transcript <url>` produces a `data/transcripts/<id>.ml.txt`, translate it locally with Ollama + Aya Expanse 8B:

```bash
deno task translate data/transcripts/<id>.ml.txt
```

Produces `data/transcripts/<id>.en.txt` alongside the source file.

**One-time setup:**

```bash
ollama pull aya-expanse:8b   # ~5 GB
```

Ollama must be running (`ollama serve` or the desktop app) when the task is invoked. The script prints progress per paragraph and writes a `.partial` file as it goes — if you Ctrl+C or the process dies, re-running picks up where it left off.

Flags: `--model <tag>` overrides the default model. `--out <dir>` writes the output elsewhere. `--force` overwrites an existing `.en.txt` or ignores a stale `.partial`.
```

- [ ] **Step 3: Verify formatting**

```bash
deno fmt --check README.md
```

If it reports diffs, run `deno fmt README.md` and re-check.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "Document deno task translate in README"
```

---

## Plan summary

10 tasks (0–9). Tasks 0 and 8 are manual / verification. Tasks 1–7 are TDD-style with explicit tests, code, and per-task commits. Task 9 is documentation.

When complete, the contributor can:

```bash
deno task transcript https://www.youtube.com/watch?v=<id>      # produces .ml.txt
deno task translate data/transcripts/<id>.ml.txt               # produces .en.txt
```

…fully locally, fully free, with crash-safe resume on long runs.
