# Malayalam → English Translate Script Design

**Date:** 2026-05-18
**Status:** Approved, ready for implementation plan
**Source request:** Translate Malayalam transcripts (produced by `scripts/transcript.ts`) into English, locally on a 16 GB MacBook, without paid APIs.

## Goal

A Deno CLI script that takes a Malayalam transcript file (`<id>.ml.txt` from [[2026-05-18-youtube-transcript-script-design]]) and produces an English translation file (`<id>.en.txt`) alongside it, using a local Ollama model (Aya Expanse 8B) over HTTP.

## Non-goals

- Batch mode across many files (use shell `for` / `xargs` loops).
- Translating in any direction other than `ml` → `en`.
- Quality critique or second-pass review of translations.
- Subtitle formats (SRT/VTT). Plain text only, matching the transcript script.
- Cloud / paid API translation (kept as a future option, not wired in).
- Mid-paragraph streaming to disk.
- Speaker name detection or renaming (speaker IDs are passed through unchanged).
- Modifying `scripts/transcript.ts` or its spec — translation is fully decoupled.

## Flow

```
data/transcripts/<id>.ml.txt
        |
        v
  scripts/translate.ts                 deno task translate <file>
        |
        |-- parse header (above ---) + body (below ---)
        |-- chunk body on blank lines -> paragraphs[]
        |-- for each paragraph (resuming from <id>.en.txt.partial if present):
        |       split off "[Speaker N]:" prefix if present
        |       POST http://localhost:11434/api/generate
        |         { model: aya-expanse:8b, system: <translate prompt>, prompt: text }
        |       re-attach prefix
        |       append to <id>.en.txt.partial
        |       print "[12/87] ✓"
        |
        '-- on completion: rename .partial -> <id>.en.txt
```

## CLI

```
deno task translate <file.ml.txt>
deno task translate <file.ml.txt> --model aya-expanse:8b   # override default
deno task translate <file.ml.txt> --out <dir>              # default: same dir as input
deno task translate <file.ml.txt> --force                  # ignore existing .partial / .en.txt
```

`deno.json` tasks gets:

```jsonc
"translate": "deno run -A scripts/translate.ts"
```

`-A` matches existing tasks. No `--env-file` is needed — nothing here reads env vars; Ollama is a localhost HTTP call.

Default behavior with no flags: read `<id>.ml.txt`, write `<id>.en.txt` alongside it, using `aya-expanse:8b`. If `<id>.en.txt.partial` already exists from a prior crashed run, automatically resume from where it left off and tell the user (`Resuming from paragraph 34/87…`). `--force` is the escape hatch if the partial is poisoned or the user wants to retranslate.

## File layout

```
scripts/translate.ts        # single-file CLI; arg parsing + parse + chunk + Ollama loop + write
```

One file. Translation is a linear pipeline with no non-trivial state machine (unlike the Sarvam batch flow in the transcript spec, which earned its split into four modules). Splitting here would add ceremony without clarity.

## Input format

The script reads the exact format produced by `scripts/transcript.ts`:

```
Source: https://www.youtube.com/watch?v=5MVkCqd2U10
Video ID: 5MVkCqd2U10
Title: <scraped from page <title>>
Language: ml (Malayalam)
Fetched: 2026-05-18T12:34:56Z
Method: timedtext | sarvam-batch (saaras:v3, diarization)

---

<body>
```

The header is everything above the first `---` line. The body is everything after it. The script validates that the `Language:` line begins with `ml` and rejects anything else.

Body shapes the script must handle (per the transcript spec):

- **YouTube captions path:** paragraphs of concatenated cue text, separated by blank lines (paragraph breaks on >2 s gaps).
- **Sarvam path:** `[Speaker N]: <text>` lines, one speaker turn per line, blank lines between turns.

Both reduce to the same chunking rule: split the body on runs of one-or-more blank lines, trim, and drop empty entries — the result is the list of paragraphs.

## Chunking

For each paragraph:

1. If the paragraph starts with `[Speaker N]: ` (Sarvam format), split off the prefix; remember it; translate only the text after the colon-space; re-attach the prefix verbatim in the output.
2. Otherwise (YouTube format), send the whole paragraph as-is.

One Ollama call per paragraph. No internal sub-chunking (Aya Expanse 8B's 8K context comfortably fits any single paragraph the transcript script can produce).

## Ollama call

```
POST http://localhost:11434/api/generate
{
  "model": "aya-expanse:8b",
  "system": "You are a precise translator. Translate the user's Malayalam text to natural, fluent English. Preserve meaning, names, numbers, and dates exactly. Output ONLY the English translation — no preamble, no explanation, no quotation marks.",
  "prompt": "<paragraph text>",
  "stream": false,
  "options": { "temperature": 0.2 }
}
```

- `stream: false` — wait for the whole paragraph before writing, so a crash mid-paragraph leaves the partial file on a clean paragraph boundary.
- `temperature: 0.2` — low but non-zero. Translation wants determinism but not the brittleness of 0.
- No retries. If a call fails or returns empty, exit with the paragraph index; the user fixes and re-runs (resume picks up where it stopped).

**Pre-flight checks before the loop:**

1. `GET http://localhost:11434/api/tags` — Ollama is reachable.
2. The returned model list contains `aya-expanse:8b` (or whatever `--model` resolves to). If not, print `ollama pull <model>` hint and exit.

## Output format

`<id>.en.txt` (or `<out>/<id>.en.txt` if `--out` is set):

```
Source: https://www.youtube.com/watch?v=5MVkCqd2U10
Video ID: 5MVkCqd2U10
Title: <passed through from input>
Language: en (translated from ml)
Fetched: <passed through from input>
Source method: <passed through from input "Method:" line>
Translation: aya-expanse:8b via Ollama (local)
Translated: 2026-05-19T09:12:34Z

---

<English body, same paragraph structure as input,
 with [Speaker N]: prefixes preserved verbatim>
```

The `.partial` file uses exactly this format — it is written incrementally, paragraph by paragraph, including the full header from the start. On resume, the script counts paragraphs already present in `.partial`'s body and skips that many input paragraphs. The file is the resume state; no sidecar manifest.

## Progress output

Per paragraph, on stdout:

```
[12/87] ✓
```

On resume:

```
Resuming from paragraph 34/87 (using existing data/transcripts/<id>.en.txt.partial)
[35/87] ✓
[36/87] ✓
...
```

On completion:

```
Done. Wrote data/transcripts/<id>.en.txt (87 paragraphs, 12m18s).
```

## Error handling

| Failure | Behavior |
| --- | --- |
| Input file not found | Print path, exit 2 |
| Input file has no `---` separator (not a transcript) | Print "expected transcript header followed by `---`", exit 2 |
| Input `Language:` header is not `ml` | Print "this script translates Malayalam (`ml`) only; got `<lang>`", exit 2 |
| Ollama not running (connection refused on :11434) | Print "Ollama isn't running. Start with `ollama serve` or open the Ollama app.", exit 3 |
| `aya-expanse:8b` not pulled | Print "Run `ollama pull aya-expanse:8b` (~5GB).", exit 4 |
| Ollama returns HTTP error mid-translation | Print paragraph index + error body, leave `.partial` intact, exit 5 |
| Ollama returns empty / whitespace-only response | Print paragraph index + the input text, leave `.partial` intact, exit 6 |
| `<id>.en.txt` already exists (no `--force`) | Print "output exists; pass `--force` to overwrite", exit 7 |
| `.partial` body has more paragraphs than input (stale resume) | Print "partial file has N paragraphs but input has M; pass `--force` to start over", exit 8 |

No retries, no backoff. Resume-on-rerun + `.partial` covers crash recovery; the user diagnoses the root cause and re-runs.

## Dependencies

| What | Source | Notes |
| --- | --- | --- |
| `ollama` | system binary | Already installed in the dev environment. `ollama serve` must be reachable on `localhost:11434`. |
| `aya-expanse:8b` model | `ollama pull aya-expanse:8b` | ~5 GB. One-time. |
| No npm/jsr libs | — | Deno `fetch` for HTTP, no extra packages. |

`.gitignore` already excludes large local data; `data/transcripts/*.partial` should be added (gitignore amendment is part of the implementation, not a separate decision).

## Open verification items (for the implementation plan)

1. Confirm `aya-expanse:8b` is the exact tag in the Ollama library (vs. `aya:8b` or another namespace). First implementation step: `ollama pull aya-expanse:8b` and `curl localhost:11434/api/tags` to verify.
2. Spot-check one paragraph of real Malayalam output for fluency before wiring the full loop. If quality is unacceptable, the engine choice (not this spec) is what needs revisiting.

## Out of scope reminders

- Batch mode (`for f in *.ml.txt; do deno task translate "$f"; done`).
- Bidirectional translation (`en` → `ml`, etc.).
- Quality critique / second-pass review.
- Subtitle formats.
- Cloud/API fallback.
- Mid-paragraph streaming.
- Speaker name detection.
