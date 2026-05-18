# YouTube Transcript Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Deno CLI that downloads a Malayalam/English transcript for any
YouTube URL — pulling YouTube's own captions when available, falling back to
Sarvam AI batch STT (with speaker diarization) on audio extracted via `yt-dlp` +
`ffmpeg`.

**Architecture:** Three-stage fallback chain (timedtext → audio extract → Sarvam
batch) orchestrated by `scripts/transcript.ts`. Four supporting modules under
`scripts/transcript/`, each with one responsibility (URL/HTTP, subprocess, REST
client, output formatting). Pure-logic pieces are unit-tested with `Deno.test`;
HTTP/subprocess layers are verified by end-to-end smoke runs.

**Tech Stack:** Deno 2.x, TypeScript, `jsr:@std/cli` for arg parsing,
`jsr:@std/dotenv`-free (uses `--env-file=.env` flag), system `yt-dlp` +
`ffmpeg`, Sarvam Speech-to-Text Batch REST API.

**Source spec:**
`docs/superpowers/specs/2026-05-18-youtube-transcript-script-design.md`

---

## File Map

| Path                                          | Responsibility                                                                                  | Status |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------ |
| `scripts/transcript.ts`                       | CLI entry, arg parsing, three-stage orchestration, exit codes, cost prompt                      | Create |
| `scripts/transcript/youtube-captions.ts`      | Extract video ID from URL, fetch watch HTML, parse `ytInitialPlayerResponse`, fetch + parse VTT | Create |
| `scripts/transcript/audio.ts`                 | Pre-flight check for `yt-dlp`/`ffmpeg`, download + transcode audio, probe duration              | Create |
| `scripts/transcript/sarvam.ts`                | Sarvam batch REST client: init → upload → start → poll → download, parse output JSON            | Create |
| `scripts/transcript/format.ts`                | Render header block, render diarized body with speaker renumbering, write to disk               | Create |
| `scripts/transcript/youtube-captions_test.ts` | Tests for URL extraction + VTT parsing                                                          | Create |
| `scripts/transcript/format_test.ts`           | Tests for header rendering + speaker renumbering                                                | Create |
| `scripts/transcript/sarvam_test.ts`           | Tests for polling state machine (with mocked status fn)                                         | Create |
| `deno.json`                                   | Add `transcript` task                                                                           | Modify |
| `README.md`                                   | Document the new task, env requirement, system deps                                             | Modify |
| `data/transcripts/.gitkeep`                   | Ensure output dir exists in git                                                                 | Create |

---

## Task 0: Verify Sarvam REST endpoint shapes

**Why first:** The spec sketched Sarvam batch endpoints from the Python SDK, but
the actual REST surface needs to be confirmed before we build the polling state
machine. Wrong endpoint paths or payload shapes will silently waste hours of
debugging.

**Files:**

- Create: `scripts/transcript/sarvam.ts` (header comment block only)

- [ ] **Step 1: Read Sarvam's batch API docs**

Open <https://docs.sarvam.ai/api-reference-docs/speech-to-text/batch> in a
browser. Confirm the actual paths, request bodies, and response shapes for:

- `POST` init job
- File upload (presigned URL? multipart? direct?)
- `POST` start job
- `GET` status poll
- `GET` outputs

- [ ] **Step 2: Smoke-test with a tiny WAV**

Create a 5-second silent WAV for testing:

```bash
ffmpeg -f lavfi -i anullsrc=channel_layout=mono:sample_rate=16000 -t 5 /tmp/silence.wav
```

Then walk the batch flow manually with `curl` (substituting your real key from
`.env`):

```bash
export SARVAM_API_KEY="$(grep ^SARVAM_API_KEY .env | cut -d= -f2-)"

# init
curl -X POST https://api.sarvam.ai/speech-to-text/job/init \
  -H "api-subscription-key: $SARVAM_API_KEY"

# upload (use whatever the init response indicates)
# start
# poll
# fetch outputs
```

- [ ] **Step 3: Record actual shapes in a comment block at the top of
      `scripts/transcript/sarvam.ts`**

Create the file with only a top comment that documents what you found:

```typescript
// Sarvam Speech-to-Text Batch REST surface
// (verified manually 2026-05-18 — update if the API changes)
//
// 1. POST /speech-to-text/job/init
//    Headers: api-subscription-key: <key>
//    Body: <actual body if any>
//    Returns: { job_id: string, input_storage_path: string, output_storage_path: string, ... }
//
// 2. Upload: <actual mechanism — PUT to presigned URL? POST multipart? document exactly>
//
// 3. POST /speech-to-text/job/{job_id}/start
//    Body: { model: "saaras:v3", language_code: "ml-IN", with_diarization: true, num_speakers: 2 }
//    Returns: <actual shape>
//
// 4. GET /speech-to-text/job/{job_id}/status
//    Returns: { status: "queued" | "running" | "completed" | "failed", ... }
//
// 5. GET /speech-to-text/job/{job_id}/outputs (or wherever outputs live)
//    Returns: <download URLs or inline JSON>
//
// 6. Output JSON shape: { segments: [{ start: number, end: number, speaker?: string, text: string }], ... }
```

If anything in the spec contradicts what you found, STOP and update the spec
before continuing — the rest of the plan assumes these shapes.

- [ ] **Step 4: Commit**

```bash
git add scripts/transcript/sarvam.ts
git commit -m "Document Sarvam batch REST surface verified against live API"
```

---

## Task 1: Wire the `transcript` task + create directory skeleton

**Files:**

- Modify: `deno.json` (tasks block)
- Create: `scripts/transcript.ts` (stub)
- Create: `data/transcripts/.gitkeep` (empty file)

- [ ] **Step 1: Add task to `deno.json`**

Read `deno.json`. In the `tasks` block, after the `seed` line, add:

```jsonc
"transcript": "deno run -A --env-file=.env scripts/transcript.ts",
```

So the block looks like:

```jsonc
"tasks": {
  "check": "deno fmt --check . && deno lint . && deno check",
  "dev": "deno run -A --watch=static/,routes/ dev.ts",
  "build": "deno run -A dev.ts build",
  "start": "deno serve -A _fresh/server.js",
  "seed": "deno run -A scripts/seed.ts",
  "transcript": "deno run -A --env-file=.env scripts/transcript.ts",
  "update": "deno run -A -r jsr:@fresh/update ."
},
```

- [ ] **Step 2: Create the CLI stub**

Create `scripts/transcript.ts`:

```typescript
if (import.meta.main) {
  console.error("scripts/transcript.ts: not implemented yet");
  Deno.exit(1);
}
```

- [ ] **Step 3: Create the output directory placeholder**

```bash
mkdir -p data/transcripts
touch data/transcripts/.gitkeep
```

- [ ] **Step 4: Verify the task runs**

```bash
deno task transcript
```

Expected: prints `scripts/transcript.ts: not implemented yet` and exits 1.

- [ ] **Step 5: Commit**

```bash
git add deno.json scripts/transcript.ts data/transcripts/.gitkeep
git commit -m "Scaffold transcript CLI task and output directory"
```

---

## Task 2: URL parser + tests

**Files:**

- Create: `scripts/transcript/youtube-captions.ts` (add `extractVideoId` export
  — append, do not overwrite Task 0's comment block)
- Create: `scripts/transcript/youtube-captions_test.ts`

- [ ] **Step 1: Write the failing test**

Create `scripts/transcript/youtube-captions_test.ts`:

```typescript
import { assertEquals, assertThrows } from "jsr:@std/assert@^1";
import { extractVideoId } from "./youtube-captions.ts";

Deno.test("extractVideoId: standard watch URL", () => {
  assertEquals(
    extractVideoId("https://www.youtube.com/watch?v=5MVkCqd2U10"),
    "5MVkCqd2U10",
  );
});

Deno.test("extractVideoId: watch URL with extra params", () => {
  assertEquals(
    extractVideoId(
      "https://www.youtube.com/watch?v=5MVkCqd2U10&t=42s&list=PLfoo",
    ),
    "5MVkCqd2U10",
  );
});

Deno.test("extractVideoId: youtu.be short URL", () => {
  assertEquals(
    extractVideoId("https://youtu.be/5MVkCqd2U10"),
    "5MVkCqd2U10",
  );
});

Deno.test("extractVideoId: shorts URL", () => {
  assertEquals(
    extractVideoId("https://www.youtube.com/shorts/5MVkCqd2U10"),
    "5MVkCqd2U10",
  );
});

Deno.test("extractVideoId: rejects non-YouTube URL", () => {
  assertThrows(
    () => extractVideoId("https://vimeo.com/12345"),
    Error,
    "Not a YouTube URL",
  );
});

Deno.test("extractVideoId: rejects garbage", () => {
  assertThrows(() => extractVideoId("not a url at all"), Error);
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
deno test scripts/transcript/youtube-captions_test.ts
```

Expected: all six tests FAIL (`extractVideoId` not exported).

- [ ] **Step 3: Implement `extractVideoId`**

Append to `scripts/transcript/youtube-captions.ts` (keep the existing Task 0
comment block at the top):

```typescript
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function extractVideoId(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error(`Not a URL: ${input}`);
  }

  const host = url.hostname.replace(/^www\./, "");
  let candidate: string | null = null;

  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") {
      candidate = url.searchParams.get("v");
    } else if (url.pathname.startsWith("/shorts/")) {
      candidate = url.pathname.slice("/shorts/".length).split("/")[0];
    } else if (url.pathname.startsWith("/embed/")) {
      candidate = url.pathname.slice("/embed/".length).split("/")[0];
    }
  } else if (host === "youtu.be") {
    candidate = url.pathname.slice(1).split("/")[0];
  } else {
    throw new Error(`Not a YouTube URL: ${input}`);
  }

  if (!candidate || !VIDEO_ID_RE.test(candidate)) {
    throw new Error(`Could not extract a YouTube video ID from: ${input}`);
  }
  return candidate;
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
deno test scripts/transcript/youtube-captions_test.ts
```

Expected: all six PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/transcript/youtube-captions.ts scripts/transcript/youtube-captions_test.ts
git commit -m "Add YouTube URL parser with extractVideoId"
```

---

## Task 3: VTT parser + tests

**Files:**

- Modify: `scripts/transcript/youtube-captions.ts` (add `parseVtt`)
- Modify: `scripts/transcript/youtube-captions_test.ts` (add tests)

- [ ] **Step 1: Write the failing tests**

In `scripts/transcript/youtube-captions_test.ts`, **add `parseVtt` to the
existing import line** at the top:

```typescript
import { extractVideoId, parseVtt } from "./youtube-captions.ts";
```

Then append the new test cases:

```typescript
Deno.test("parseVtt: single cue", () => {
  const vtt = `WEBVTT

00:00:01.000 --> 00:00:03.000
hello world
`;
  assertEquals(parseVtt(vtt), "hello world");
});

Deno.test("parseVtt: multiple cues, short gap joins with space", () => {
  const vtt = `WEBVTT

00:00:01.000 --> 00:00:03.000
hello

00:00:03.500 --> 00:00:05.000
world
`;
  assertEquals(parseVtt(vtt), "hello world");
});

Deno.test("parseVtt: long gap (>2s) creates paragraph break", () => {
  const vtt = `WEBVTT

00:00:01.000 --> 00:00:03.000
first sentence

00:00:10.000 --> 00:00:12.000
second sentence
`;
  assertEquals(parseVtt(vtt), "first sentence\n\nsecond sentence");
});

Deno.test("parseVtt: strips HTML-like tags from cue text", () => {
  const vtt = `WEBVTT

00:00:01.000 --> 00:00:03.000
<c.colorE5E5E5>hello</c>
`;
  assertEquals(parseVtt(vtt), "hello");
});

Deno.test("parseVtt: collapses multiline cue into one space-joined string", () => {
  const vtt = `WEBVTT

00:00:01.000 --> 00:00:03.000
line one
line two
`;
  assertEquals(parseVtt(vtt), "line one line two");
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
deno test scripts/transcript/youtube-captions_test.ts
```

Expected: the 5 new tests fail (`parseVtt` not exported); the 6 from Task 2
still pass.

- [ ] **Step 3: Implement `parseVtt`**

Append to `scripts/transcript/youtube-captions.ts`:

```typescript
const TIMESTAMP_RE =
  /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})/;

function parseTimestamp(h: string, m: string, s: string, ms: string): number {
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;
}

const PARAGRAPH_GAP_SECONDS = 2;

export function parseVtt(vtt: string): string {
  const lines = vtt.split(/\r?\n/);
  const cues: { start: number; end: number; text: string }[] = [];
  let i = 0;
  while (i < lines.length) {
    const m = TIMESTAMP_RE.exec(lines[i]);
    if (!m) {
      i++;
      continue;
    }
    const start = parseTimestamp(m[1], m[2], m[3], m[4]);
    const end = parseTimestamp(m[5], m[6], m[7], m[8]);
    i++;
    const textLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "") {
      textLines.push(lines[i]);
      i++;
    }
    const text = textLines.join(" ").replace(/<[^>]+>/g, "").trim();
    if (text) cues.push({ start, end, text });
  }

  const parts: string[] = [];
  for (let j = 0; j < cues.length; j++) {
    if (j === 0) {
      parts.push(cues[j].text);
      continue;
    }
    const gap = cues[j].start - cues[j - 1].end;
    parts.push(
      gap > PARAGRAPH_GAP_SECONDS ? "\n\n" + cues[j].text : " " + cues[j].text,
    );
  }
  return parts.join("").replace(/[ ]+/g, " ").trim();
}
```

- [ ] **Step 4: Run tests, verify all 11 pass**

```bash
deno test scripts/transcript/youtube-captions_test.ts
```

Expected: 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/transcript/youtube-captions.ts scripts/transcript/youtube-captions_test.ts
git commit -m "Add VTT parser with paragraph-break heuristic"
```

---

## Task 4: YouTube captions fetcher (HTTP layer)

**Files:**

- Modify: `scripts/transcript/youtube-captions.ts` (add `fetchYoutubeCaptions` +
  helpers)

This task does NOT add unit tests for the network call — it's verified by smoke
test in Task 9.

- [ ] **Step 1: Add types and the fetcher**

Append to `scripts/transcript/youtube-captions.ts`:

```typescript
export interface CaptionTrack {
  lang: "ml" | "en";
  kind: "manual" | "asr";
  text: string;
}

export interface YoutubeCaptionResult {
  title: string;
  tracks: CaptionTrack[];
}

interface CaptionTrackMeta {
  baseUrl: string;
  languageCode: string;
  kind?: string;
}

function extractPlayerResponse(html: string): unknown {
  // ytInitialPlayerResponse can appear as `var ytInitialPlayerResponse = {...};`
  // or as `ytInitialPlayerResponse = {...};` inside a script block.
  const match = html.match(
    /ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;\s*(?:var|<\/script>)/s,
  );
  if (!match) throw new Error("ytInitialPlayerResponse not found in page HTML");
  return JSON.parse(match[1]);
}

function extractTitle(html: string): string {
  const m = html.match(/<title>([^<]*)<\/title>/);
  if (!m) return "(unknown title)";
  return m[1].replace(/\s*-\s*YouTube\s*$/, "").trim();
}

function pickTracks(player: unknown): CaptionTrackMeta[] {
  // deno-lint-ignore no-explicit-any
  const list = (player as any)?.captions?.playerCaptionsTracklistRenderer
    ?.captionTracks;
  if (!Array.isArray(list)) return [];
  return list.filter((t: CaptionTrackMeta) =>
    t.languageCode === "ml" || t.languageCode === "en"
  );
}

export async function fetchYoutubeCaptions(
  videoId: string,
): Promise<YoutubeCaptionResult> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(watchUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${watchUrl}: HTTP ${res.status}`);
  }
  const html = await res.text();
  const title = extractTitle(html);
  const player = extractPlayerResponse(html);
  const metas = pickTracks(player);

  const tracks: CaptionTrack[] = [];
  for (const meta of metas) {
    const vttUrl = meta.baseUrl + "&fmt=vtt";
    const vttRes = await fetch(vttUrl);
    if (!vttRes.ok) continue;
    const text = parseVtt(await vttRes.text());
    if (!text) continue;
    tracks.push({
      lang: meta.languageCode as "ml" | "en",
      kind: meta.kind === "asr" ? "asr" : "manual",
      text,
    });
  }
  return { title, tracks };
}
```

- [ ] **Step 2: Smoke-test against the target video**

```bash
deno run -A --eval "
import { fetchYoutubeCaptions } from './scripts/transcript/youtube-captions.ts';
const r = await fetchYoutubeCaptions('5MVkCqd2U10');
console.log('title:', r.title);
console.log('tracks:', r.tracks.map(t => ({ lang: t.lang, kind: t.kind, chars: t.text.length })));
console.log('---first 200 chars of first track---');
console.log(r.tracks[0]?.text.slice(0, 200));
"
```

Expected: prints the video title plus at least one track (Malayalam likely
auto-generated). If `tracks` is `[]`, the video has no `ml`/`en` captions and
Task 9 will exercise the Sarvam path instead.

- [ ] **Step 3: Commit**

```bash
git add scripts/transcript/youtube-captions.ts
git commit -m "Add YouTube caption fetcher with timedtext probe"
```

---

## Task 5: Format module + tests

**Files:**

- Create: `scripts/transcript/format.ts`
- Create: `scripts/transcript/format_test.ts`

- [ ] **Step 1: Write failing tests**

Create `scripts/transcript/format_test.ts`:

```typescript
import { assertEquals } from "jsr:@std/assert@^1";
import {
  renderDiarizedBody,
  renderHeader,
  type SarvamSegment,
  type TranscriptMeta,
} from "./format.ts";

Deno.test("renderHeader: timedtext method", () => {
  const meta: TranscriptMeta = {
    sourceUrl: "https://www.youtube.com/watch?v=abc",
    videoId: "abc",
    title: "Press Conference",
    lang: "ml",
    langName: "Malayalam",
    fetchedAt: "2026-05-18T12:34:56Z",
    method: "timedtext",
  };
  const expected = [
    "Source: https://www.youtube.com/watch?v=abc",
    "Video ID: abc",
    "Title: Press Conference",
    "Language: ml (Malayalam)",
    "Fetched: 2026-05-18T12:34:56Z",
    "Method: timedtext",
    "",
    "---",
    "",
  ].join("\n");
  assertEquals(renderHeader(meta), expected);
});

Deno.test("renderHeader: sarvam method with subtype", () => {
  const meta: TranscriptMeta = {
    sourceUrl: "https://www.youtube.com/watch?v=abc",
    videoId: "abc",
    title: "X",
    lang: "ml",
    langName: "Malayalam",
    fetchedAt: "2026-05-18T00:00:00Z",
    method: "sarvam-batch (saaras:v3, diarization)",
  };
  const out = renderHeader(meta);
  assertEquals(
    out.includes("Method: sarvam-batch (saaras:v3, diarization)"),
    true,
  );
});

Deno.test("renderDiarizedBody: renumbers speakers in first-appearance order", () => {
  const segments: SarvamSegment[] = [
    { start: 0, end: 1, speaker: "SPEAKER_03", text: "hello" },
    { start: 1, end: 2, speaker: "SPEAKER_01", text: "hi" },
    { start: 2, end: 3, speaker: "SPEAKER_03", text: "how are you" },
  ];
  const expected = [
    "[Speaker 1]: hello",
    "[Speaker 2]: hi",
    "[Speaker 1]: how are you",
  ].join("\n");
  assertEquals(renderDiarizedBody(segments), expected);
});

Deno.test("renderDiarizedBody: merges consecutive segments from same speaker", () => {
  const segments: SarvamSegment[] = [
    { start: 0, end: 1, speaker: "A", text: "hello" },
    { start: 1, end: 2, speaker: "A", text: "world" },
    { start: 2, end: 3, speaker: "B", text: "hi" },
  ];
  assertEquals(
    renderDiarizedBody(segments),
    ["[Speaker 1]: hello world", "[Speaker 2]: hi"].join("\n"),
  );
});

Deno.test("renderDiarizedBody: undefined speaker falls back to 'Unknown'", () => {
  const segments: SarvamSegment[] = [
    { start: 0, end: 1, text: "untagged" },
  ];
  assertEquals(renderDiarizedBody(segments), "[Unknown]: untagged");
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
deno test scripts/transcript/format_test.ts
```

Expected: 5 FAIL (`format.ts` missing).

- [ ] **Step 3: Implement format module**

Create `scripts/transcript/format.ts`:

```typescript
export interface TranscriptMeta {
  sourceUrl: string;
  videoId: string;
  title: string;
  lang: string;
  langName: string;
  fetchedAt: string;
  method: string;
}

export interface SarvamSegment {
  start: number;
  end: number;
  speaker?: string;
  text: string;
}

export function renderHeader(meta: TranscriptMeta): string {
  return [
    `Source: ${meta.sourceUrl}`,
    `Video ID: ${meta.videoId}`,
    `Title: ${meta.title}`,
    `Language: ${meta.lang} (${meta.langName})`,
    `Fetched: ${meta.fetchedAt}`,
    `Method: ${meta.method}`,
    "",
    "---",
    "",
  ].join("\n");
}

export function renderDiarizedBody(segments: SarvamSegment[]): string {
  const speakerMap = new Map<string, number>();
  let nextLabel = 1;
  const labelFor = (rawId?: string): string => {
    if (!rawId) return "Unknown";
    if (!speakerMap.has(rawId)) speakerMap.set(rawId, nextLabel++);
    return `Speaker ${speakerMap.get(rawId)}`;
  };

  const lines: string[] = [];
  let currentLabel: string | null = null;
  let currentBuf: string[] = [];

  const flush = () => {
    if (currentLabel !== null && currentBuf.length > 0) {
      lines.push(`[${currentLabel}]: ${currentBuf.join(" ")}`);
    }
  };

  for (const seg of segments) {
    const label = labelFor(seg.speaker);
    if (label !== currentLabel) {
      flush();
      currentLabel = label;
      currentBuf = [seg.text.trim()];
    } else {
      currentBuf.push(seg.text.trim());
    }
  }
  flush();
  return lines.join("\n");
}
```

- [ ] **Step 4: Run tests, verify all 5 pass**

```bash
deno test scripts/transcript/format_test.ts
```

Expected: 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/transcript/format.ts scripts/transcript/format_test.ts
git commit -m "Add transcript output formatter with diarization rendering"
```

---

## Task 6: Audio extraction module

**Files:**

- Create: `scripts/transcript/audio.ts`

Subprocess code; verified by running, not unit tests.

- [ ] **Step 1: Implement the module**

Create `scripts/transcript/audio.ts`:

```typescript
export interface AudioResult {
  wavPath: string;
  durationSeconds: number;
  cleanup: () => Promise<void>;
}

async function which(bin: string): Promise<boolean> {
  try {
    const cmd = new Deno.Command("which", {
      args: [bin],
      stdout: "null",
      stderr: "null",
    });
    const { code } = await cmd.output();
    return code === 0;
  } catch {
    return false;
  }
}

export async function ensureBinaries(): Promise<void> {
  const missing: string[] = [];
  if (!(await which("yt-dlp"))) missing.push("yt-dlp");
  if (!(await which("ffmpeg"))) missing.push("ffmpeg");
  if (!(await which("ffprobe"))) missing.push("ffprobe");
  if (missing.length > 0) {
    throw new Error(
      `Missing required tools: ${
        missing.join(", ")
      }. Install with: brew install ${missing.join(" ")}`,
    );
  }
}

async function probeDuration(wavPath: string): Promise<number> {
  const cmd = new Deno.Command("ffprobe", {
    args: [
      "-i",
      wavPath,
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      "-v",
      "error",
    ],
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await cmd.output();
  if (code !== 0) {
    throw new Error(`ffprobe failed: ${new TextDecoder().decode(stderr)}`);
  }
  const s = new TextDecoder().decode(stdout).trim();
  const n = Number(s);
  if (!Number.isFinite(n)) {
    throw new Error(`ffprobe returned invalid duration: ${s}`);
  }
  return n;
}

export async function extractAudio(
  url: string,
  videoId: string,
): Promise<AudioResult> {
  await ensureBinaries();
  const tmpDir = await Deno.makeTempDir({ prefix: "transcript-" });
  const outPath = `${tmpDir}/${videoId}.wav`;

  const cmd = new Deno.Command("yt-dlp", {
    args: [
      "-x",
      "--audio-format",
      "wav",
      "--audio-quality",
      "0",
      "--postprocessor-args",
      "ffmpeg:-ac 1 -ar 16000",
      "-o",
      `${tmpDir}/${videoId}.%(ext)s`,
      "--no-progress",
      url,
    ],
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stderr } = await cmd.output();
  if (code !== 0) {
    await Deno.remove(tmpDir, { recursive: true }).catch(() => {});
    throw new Error(`yt-dlp failed:\n${new TextDecoder().decode(stderr)}`);
  }

  // yt-dlp's --audio-format wav writes to <id>.wav
  const stat = await Deno.stat(outPath).catch(() => null);
  if (!stat) {
    await Deno.remove(tmpDir, { recursive: true }).catch(() => {});
    throw new Error(`Expected output not found: ${outPath}`);
  }

  const durationSeconds = await probeDuration(outPath);
  return {
    wavPath: outPath,
    durationSeconds,
    cleanup: () => Deno.remove(tmpDir, { recursive: true }),
  };
}
```

- [ ] **Step 2: Smoke-test on a short Creative Commons video**

Use a known short public-domain video — Big Buck Bunny clip works:

```bash
deno run -A --eval "
import { extractAudio } from './scripts/transcript/audio.ts';
const r = await extractAudio('https://www.youtube.com/watch?v=YE7VzlLtp-4', 'YE7VzlLtp-4');
console.log('wav:', r.wavPath);
console.log('duration:', r.durationSeconds, 'seconds');
await r.cleanup();
console.log('cleaned up');
"
```

Expected: prints a `/var/folders/.../transcript-XXX/<id>.wav` path and a
positive duration; tmpdir is removed.

If `yt-dlp` or `ffmpeg` is missing, expect the install-hint error from
`ensureBinaries`.

- [ ] **Step 3: Commit**

```bash
git add scripts/transcript/audio.ts
git commit -m "Add yt-dlp + ffmpeg audio extraction wrapper"
```

---

## Task 7: Sarvam batch client

**Files:**

- Modify: `scripts/transcript/sarvam.ts` (the file currently holds only the Task
  0 comment block — append everything below it)
- Create: `scripts/transcript/sarvam_test.ts`

**Note:** The exact endpoint paths, payload shapes, and upload mechanism MUST
match what you verified in Task 0. If they differ from what's coded below,
update the code to match — the Task 0 comment block is the source of truth.

- [ ] **Step 1: Write failing tests for the polling state machine**

The state machine is the part most likely to break (the I/O wrappers are thin).
Create `scripts/transcript/sarvam_test.ts`:

```typescript
import { assertEquals, assertRejects } from "jsr:@std/assert@^1";
import { type JobStatus, pollUntilDone } from "./sarvam.ts";

Deno.test("pollUntilDone: returns immediately if already completed", async () => {
  const fetcher = () => Promise.resolve({ status: "completed" } as JobStatus);
  const result = await pollUntilDone(fetcher, {
    intervalMs: 1,
    timeoutMs: 100,
  });
  assertEquals(result.status, "completed");
});

Deno.test("pollUntilDone: polls until completed", async () => {
  let calls = 0;
  const fetcher = () => {
    calls++;
    return Promise.resolve(
      calls < 3
        ? { status: "running" } as JobStatus
        : { status: "completed" } as JobStatus,
    );
  };
  const result = await pollUntilDone(fetcher, {
    intervalMs: 1,
    timeoutMs: 100,
  });
  assertEquals(result.status, "completed");
  assertEquals(calls, 3);
});

Deno.test("pollUntilDone: throws on failed status", async () => {
  const fetcher = () =>
    Promise.resolve({ status: "failed", error: "bad audio" } as JobStatus);
  await assertRejects(
    () => pollUntilDone(fetcher, { intervalMs: 1, timeoutMs: 100 }),
    Error,
    "Sarvam job failed: bad audio",
  );
});

Deno.test("pollUntilDone: throws on timeout", async () => {
  const fetcher = () => Promise.resolve({ status: "running" } as JobStatus);
  await assertRejects(
    () => pollUntilDone(fetcher, { intervalMs: 1, timeoutMs: 10 }),
    Error,
    "timed out",
  );
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
deno test scripts/transcript/sarvam_test.ts
```

Expected: 4 FAIL (exports missing).

- [ ] **Step 3: Implement the polling state machine**

Append to `scripts/transcript/sarvam.ts` (below Task 0's comment block):

```typescript
export interface JobStatus {
  status: "queued" | "running" | "completed" | "failed";
  error?: string;
}

export interface PollOptions {
  intervalMs: number;
  timeoutMs: number;
  onTick?: () => void;
}

export async function pollUntilDone(
  fetchStatus: () => Promise<JobStatus>,
  opts: PollOptions,
): Promise<JobStatus> {
  const deadline = Date.now() + opts.timeoutMs;
  // First check immediately so we don't wait an interval on already-completed jobs.
  let status = await fetchStatus();
  while (true) {
    if (status.status === "completed") return status;
    if (status.status === "failed") {
      throw new Error(
        `Sarvam job failed: ${status.error ?? "(no error message)"}`,
      );
    }
    if (Date.now() >= deadline) {
      throw new Error(`Sarvam job polling timed out after ${opts.timeoutMs}ms`);
    }
    opts.onTick?.();
    await new Promise((r) => setTimeout(r, opts.intervalMs));
    status = await fetchStatus();
  }
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
deno test scripts/transcript/sarvam_test.ts
```

Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/transcript/sarvam.ts scripts/transcript/sarvam_test.ts
git commit -m "Add Sarvam polling state machine with tests"
```

- [ ] **Step 6: Implement the rest of the Sarvam client**

Append to `scripts/transcript/sarvam.ts`. **Adjust paths/bodies to match the
Task 0 verified surface — the code below uses the spec's sketch:**

```typescript
import type { SarvamSegment } from "./format.ts";

const SARVAM_BASE = "https://api.sarvam.ai";

export interface SarvamOptions {
  wavPath: string;
  languageCode: string; // e.g. "ml-IN"
  numSpeakers: number;
  onProgress?: (msg: string) => void;
}

export interface SarvamResult {
  segments: SarvamSegment[];
  language: string;
  jobId: string;
}

function requireApiKey(): string {
  const key = Deno.env.get("SARVAM_API_KEY");
  if (!key) {
    throw new Error(
      "SARVAM_API_KEY is not set. Add it to .env as `SARVAM_API_KEY=sk_...` " +
        "and run via `deno task transcript ...` (the task already passes --env-file=.env).",
    );
  }
  return key;
}

async function apiJson<T>(
  path: string,
  init: RequestInit,
  apiKey: string,
): Promise<T> {
  const res = await fetch(`${SARVAM_BASE}${path}`, {
    ...init,
    headers: {
      "api-subscription-key": apiKey,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sarvam ${path} failed: HTTP ${res.status}\n${body}`);
  }
  return (await res.json()) as T;
}

interface InitResponse {
  job_id: string;
  // If Task 0 reveals the field names differ (e.g. `jobId`), rename here.
  input_storage_path: string;
}

interface OutputsResponse {
  // shape depends on Task 0 — adjust the entry/download mechanism below
  outputs: { url: string }[];
}

interface RawOutputJson {
  segments: { start: number; end: number; speaker?: string; text: string }[];
  language?: string;
}

export async function transcribeWithSarvam(
  opts: SarvamOptions,
): Promise<SarvamResult> {
  const apiKey = requireApiKey();
  opts.onProgress?.("sarvam: init job");
  const init = await apiJson<InitResponse>(
    "/speech-to-text/job/init",
    { method: "POST" },
    apiKey,
  );

  opts.onProgress?.("sarvam: upload audio");
  // ADJUST: Task 0 may show this is a PUT to a presigned URL,
  // a multipart POST, or something else.
  const wav = await Deno.readFile(opts.wavPath);
  const uploadUrl = `${init.input_storage_path}/${
    opts.wavPath.split("/").pop()
  }`;
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    body: wav,
  });
  if (!uploadRes.ok) {
    throw new Error(`Sarvam upload failed: HTTP ${uploadRes.status}`);
  }

  opts.onProgress?.("sarvam: start job");
  await apiJson<unknown>(
    `/speech-to-text/job/${init.job_id}/start`,
    {
      method: "POST",
      body: JSON.stringify({
        model: "saaras:v3",
        language_code: opts.languageCode,
        with_diarization: true,
        num_speakers: opts.numSpeakers,
      }),
    },
    apiKey,
  );

  opts.onProgress?.(`sarvam: polling job ${init.job_id}`);
  await pollUntilDone(
    () =>
      apiJson<JobStatus>(
        `/speech-to-text/job/${init.job_id}/status`,
        { method: "GET" },
        apiKey,
      ),
    {
      intervalMs: 10_000,
      timeoutMs: 30 * 60_000,
      onTick: () => opts.onProgress?.("sarvam: still running..."),
    },
  );

  opts.onProgress?.("sarvam: fetching outputs");
  const outputs = await apiJson<OutputsResponse>(
    `/speech-to-text/job/${init.job_id}/outputs`,
    { method: "GET" },
    apiKey,
  );
  if (!outputs.outputs?.[0]?.url) {
    throw new Error("Sarvam returned no output URLs");
  }
  const outRes = await fetch(outputs.outputs[0].url);
  if (!outRes.ok) {
    throw new Error(`Sarvam output download failed: HTTP ${outRes.status}`);
  }
  const raw = (await outRes.json()) as RawOutputJson;

  return {
    segments: raw.segments,
    language: raw.language ?? opts.languageCode,
    jobId: init.job_id,
  };
}
```

- [ ] **Step 7: Verify the file still type-checks**

```bash
deno check scripts/transcript/sarvam.ts
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add scripts/transcript/sarvam.ts
git commit -m "Add Sarvam batch client (init/upload/start/poll/download)"
```

---

## Task 8: CLI orchestrator

**Files:**

- Modify: `scripts/transcript.ts` (replace the stub)

- [ ] **Step 1: Replace the stub with the full CLI**

Overwrite `scripts/transcript.ts`:

```typescript
import { parseArgs } from "jsr:@std/cli@^1/parse-args";
import {
  extractVideoId,
  fetchYoutubeCaptions,
} from "./transcript/youtube-captions.ts";
import { extractAudio } from "./transcript/audio.ts";
import { transcribeWithSarvam } from "./transcript/sarvam.ts";
import {
  renderDiarizedBody,
  renderHeader,
  type TranscriptMeta,
} from "./transcript/format.ts";

const LANG_NAME: Record<string, string> = {
  ml: "Malayalam",
  en: "English",
};

function usage(): never {
  console.error(`Usage: deno task transcript <youtube-url> [options]

Options:
  --out <dir>         Output directory (default: data/transcripts)
  --speakers <n>      Speaker count hint for Sarvam diarization (default: 2)
  --force-sarvam      Skip YouTube captions, always transcribe via Sarvam
  --yes               Skip the cost confirmation prompt on long videos
  -h, --help          Show this message
`);
  Deno.exit(2);
}

async function confirmCost(
  durationSeconds: number,
  autoYes: boolean,
): Promise<void> {
  if (autoYes) return;
  if (durationSeconds <= 15 * 60) return;
  const mins = Math.floor(durationSeconds / 60);
  const secs = Math.round(durationSeconds % 60);
  await Deno.stdout.write(
    new TextEncoder().encode(
      `Audio is ${mins}m${
        String(secs).padStart(2, "0")
      }s. Sarvam batch will take ~5-10 min. Proceed? [y/N] `,
    ),
  );
  const buf = new Uint8Array(8);
  const n = await Deno.stdin.read(buf);
  const answer = n
    ? new TextDecoder().decode(buf.subarray(0, n)).trim().toLowerCase()
    : "";
  if (answer !== "y" && answer !== "yes") {
    console.error("Aborted.");
    Deno.exit(0);
  }
}

async function writeTranscript(
  outDir: string,
  videoId: string,
  lang: string,
  meta: TranscriptMeta,
  body: string,
): Promise<string> {
  await Deno.mkdir(outDir, { recursive: true });
  const path = `${outDir}/${videoId}.${lang}.txt`;
  // header ends with "---\n"; add one more "\n" so the body is separated by a blank line
  await Deno.writeTextFile(path, renderHeader(meta) + "\n" + body + "\n");
  return path;
}

async function main(): Promise<number> {
  const args = parseArgs(Deno.args, {
    boolean: ["force-sarvam", "yes", "help"],
    string: ["out", "speakers"],
    alias: { h: "help", y: "yes" },
    default: { out: "data/transcripts", speakers: "2" },
  });
  if (args.help || args._.length !== 1) usage();
  const url = String(args._[0]);
  const speakers = Number(args.speakers);
  if (!Number.isInteger(speakers) || speakers < 1) {
    console.error(
      `--speakers must be a positive integer, got: ${args.speakers}`,
    );
    return 2;
  }

  let videoId: string;
  try {
    videoId = extractVideoId(url);
  } catch (e) {
    console.error(String(e));
    return 2;
  }

  // Stage 1: YouTube captions
  if (!args["force-sarvam"]) {
    console.error("Step 1/3: probing YouTube captions...");
    const yt = await fetchYoutubeCaptions(videoId);
    if (yt.tracks.length > 0) {
      const fetchedAt = new Date().toISOString();
      const written: string[] = [];
      for (const track of yt.tracks) {
        const meta: TranscriptMeta = {
          sourceUrl: url,
          videoId,
          title: yt.title,
          lang: track.lang,
          langName: LANG_NAME[track.lang] ?? track.lang,
          fetchedAt,
          method: `timedtext (${track.kind})`,
        };
        const path = await writeTranscript(
          args.out,
          videoId,
          track.lang,
          meta,
          track.text,
        );
        written.push(path);
      }
      console.error(`Wrote: ${written.join(", ")}`);
      return 0;
    }
    console.error(
      "No Malayalam/English captions on YouTube — falling back to Sarvam.",
    );
  }

  // Stage 2+3: Audio + Sarvam
  console.error("Step 2/3: extracting audio...");
  const audio = await extractAudio(url, videoId);
  try {
    await confirmCost(audio.durationSeconds, !!args.yes);
    console.error("Step 3/3: transcribing with Sarvam...");
    const sarvam = await transcribeWithSarvam({
      wavPath: audio.wavPath,
      languageCode: "ml-IN",
      numSpeakers: speakers,
      onProgress: (m) => console.error(`  ${m}`),
    });
    const fetchedAt = new Date().toISOString();
    const meta: TranscriptMeta = {
      sourceUrl: url,
      videoId,
      title: `(video ${videoId})`,
      lang: "ml",
      langName: "Malayalam",
      fetchedAt,
      method: "sarvam-batch (saaras:v3, diarization)",
    };
    const body = renderDiarizedBody(sarvam.segments);
    const path = await writeTranscript(args.out, videoId, "ml", meta, body);
    console.error(`Wrote: ${path}`);
    return 0;
  } finally {
    await audio.cleanup();
  }
}

if (import.meta.main) {
  try {
    Deno.exit(await main());
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`Error: ${msg}`);
    if (msg.includes("SARVAM_API_KEY")) Deno.exit(3);
    if (msg.includes("Missing required tools")) Deno.exit(4);
    if (msg.includes("yt-dlp failed")) Deno.exit(5);
    if (msg.includes("Sarvam job failed")) Deno.exit(6);
    if (msg.includes("timed out")) Deno.exit(7);
    Deno.exit(1);
  }
}
```

- [ ] **Step 2: Verify usage message**

```bash
deno task transcript --help
```

Expected: prints usage, exits 2.

- [ ] **Step 3: Verify URL validation**

```bash
deno task transcript "not a url"
```

Expected: prints `Not a URL: not a url`, exits 2.

- [ ] **Step 4: Verify type-checks clean**

```bash
deno check scripts/transcript.ts
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add scripts/transcript.ts
git commit -m "Wire up transcript CLI orchestrator with three-stage fallback"
```

---

## Task 9: End-to-end smoke test on the target video

**Files:** none modified

- [ ] **Step 1: Run against the original requested URL**

```bash
deno task transcript "https://www.youtube.com/watch?v=5MVkCqd2U10"
```

**Expected outcomes (any of these is success):**

- **If the video has YouTube captions**: prints
  `Step 1/3: probing YouTube captions...` then
  `Wrote: data/transcripts/5MVkCqd2U10.ml.txt` (and possibly `.en.txt`).
  Exits 0.
- **If no captions**: falls through to `Step 2/3: extracting audio...`, possibly
  prompts for cost confirmation, then `Step 3/3: transcribing with Sarvam...`,
  then writes `data/transcripts/5MVkCqd2U10.ml.txt`.

- [ ] **Step 2: Inspect the output**

```bash
head -20 data/transcripts/5MVkCqd2U10.ml.txt
wc -l data/transcripts/5MVkCqd2U10.ml.txt
```

Expected: 9-line header (Source, Video ID, Title, Language, Fetched, Method,
blank, `---`, blank), then transcript body. Body should be non-empty Malayalam
text (or `[Speaker N]: ...` lines if Sarvam ran).

- [ ] **Step 3: Smoke-test the `--force-sarvam` path (if YouTube captions
      succeeded above)**

```bash
deno task transcript --force-sarvam --yes "https://www.youtube.com/watch?v=5MVkCqd2U10"
```

Expected: skips Stage 1, downloads audio, calls Sarvam, writes
`data/transcripts/5MVkCqd2U10.ml.txt` with
`Method: sarvam-batch (saaras:v3, diarization)`. (Skip this step if Stage 1
already failed — the path was exercised in Step 1.)

- [ ] **Step 4: Confirm `data/transcripts/.gitkeep` survived** (the real
      transcript files should not be committed unless you want them)

```bash
ls -la data/transcripts/
```

Decide whether to add `data/transcripts/*.txt` to `.gitignore`. If yes:

```bash
echo "data/transcripts/*.txt" >> .gitignore
git add .gitignore
git commit -m "Ignore generated transcript files"
```

---

## Task 10: README update

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Read the current README structure**

```bash
cat README.md
```

- [ ] **Step 2: Add a "Transcripts" section**

Find an appropriate spot (after the existing "Tasks" or "Scripts" section, or
just before the bottom). Append:

````markdown
## Transcript download

Downloads Malayalam (and English when available) transcripts for any YouTube
URL, using YouTube's built-in captions when present and falling back to Sarvam
AI batch STT (with speaker diarization) when not.

```bash
deno task transcript <youtube-url>
deno task transcript <youtube-url> --speakers 3
deno task transcript <youtube-url> --force-sarvam --yes
```

Output goes to `data/transcripts/<videoId>.<lang>.txt`.

**Requirements:**

- `yt-dlp` and `ffmpeg` on `$PATH` (`brew install yt-dlp ffmpeg`).
- `SARVAM_API_KEY` in `.env` (gitignored). Format: `SARVAM_API_KEY=sk_...` —
  must include the variable-name prefix.

**Exit codes:**

| Code | Meaning                                |
| ---- | -------------------------------------- |
| 0    | Success                                |
| 2    | Bad CLI args / invalid URL             |
| 3    | Missing `SARVAM_API_KEY`               |
| 4    | Missing `yt-dlp` / `ffmpeg`            |
| 5    | `yt-dlp` could not download the video  |
| 6    | Sarvam job failed                      |
| 7    | Sarvam job polling timed out (>30 min) |
````

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Document transcript download task in README"
```

---

## Final Verification

- [ ] **All tests pass**

```bash
deno test scripts/transcript/
```

Expected: 20 tests pass (6 URL + 5 VTT + 5 format + 4 sarvam).

- [ ] **Project still type-checks**

```bash
deno task check
```

Expected: no errors.

- [ ] **Original request satisfied**

`data/transcripts/5MVkCqd2U10.ml.txt` exists and contains a real transcript with
header + body.
