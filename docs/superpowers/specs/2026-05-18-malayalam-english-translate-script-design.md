# Malayalam → English Translate Script Design

**Date:** 2026-05-18
**Status:** Approved, ready for implementation plan
**Source request:** Translate Malayalam transcripts (produced by `scripts/transcript.ts`) into English, locally on a 16 GB MacBook, without paid APIs.

> **Revision (2026-05-18):** Originally specced against Ollama + Aya Expanse 8B. Reverted after discovering Aya Expanse's official language list (23 langs: Arabic, Chinese, Czech, Dutch, English, French, German, Greek, Hebrew, Hindi, Indonesian, Italian, Japanese, Korean, Persian, Polish, Portuguese, Romanian, Russian, Spanish, Turkish, Ukrainian, Vietnamese) does NOT include Malayalam. Switched to **IndicTrans2** (AI4Bharat) — purpose-built for 22 Indian languages including Malayalam — running as a self-contained Python script managed by `uv`.

## Goal

A Python CLI script that takes a Malayalam transcript file (`<id>.ml.txt` from [[2026-05-18-youtube-transcript-script-design]]) and produces an English translation file (`<id>.en.txt`) alongside it, using **IndicTrans2** (`ai4bharat/indictrans2-indic-en-dist-200M`) loaded in-process via Hugging Face `transformers`. Managed by `uv` so a single command installs Python, creates an isolated environment, and pulls dependencies on first run.

## Non-goals

- Batch mode across many files (use shell `for` / `xargs` loops).
- Translating in any direction other than `ml` → `en`.
- Quality critique or second-pass review of translations.
- Subtitle formats (SRT/VTT). Plain text only, matching the transcript script.
- Cloud / paid API translation (kept as a future option, not wired in).
- Mid-paragraph streaming to disk.
- Speaker name detection or renaming (speaker IDs are passed through unchanged).
- Modifying `scripts/transcript.ts` or its spec — translation is fully decoupled.
- GPU acceleration. CPU inference is the supported path; the model is small enough (200 M distilled).

## Why IndicTrans2 (and why Python at all)

IndicTrans2 is the AI4Bharat open-source state-of-the-art for Indian-language translation, explicitly trained on Malayalam ↔ English. The distilled 200 M variant runs comfortably on a 16 GB Mac CPU and is ~800 MB on disk. There is no equivalent locally-runnable model in the Ollama library that genuinely supports Malayalam.

The project is otherwise Deno (Fresh app, existing Deno scripts), but translation is a one-shot CLI with no shared code with the app. Putting it directly in Python avoids a Deno↔Python IPC layer that would exist purely as ceremony.

## Flow

```
data/transcripts/<id>.ml.txt
        |
        v
  scripts/translate.py                  deno task translate <file>
        |                               (which shells out to: uv run scripts/translate.py <file>)
        |
        |-- parse header (above ---) + body (below ---)
        |-- chunk body on blank lines -> paragraphs[]
        |-- load IndicTrans2 model (~800 MB; first call downloads from HF, cached after)
        |-- for each paragraph (resuming from <id>.en.txt.partial if present):
        |       split off "[Speaker N]:" prefix if present
        |       run IndicTrans2: src "mal_Mlym" -> tgt "eng_Latn"
        |       collapse any internal blank lines in output
        |       re-attach prefix
        |       append to <id>.en.txt.partial
        |       print "[12/87] ✓"
        |
        '-- on completion: rename .partial -> <id>.en.txt
```

## CLI

```
deno task translate <file.ml.txt>
deno task translate <file.ml.txt> --out <dir>              # default: same dir as input
deno task translate <file.ml.txt> --force                  # ignore existing .partial / .en.txt
```

`deno.json` tasks gets:

```jsonc
"translate": "uv run scripts/translate.py"
```

`uv` handles the Python interpreter version, virtual environment, and dependency installation (declared inline in the script's PEP 723 metadata header) — no `requirements.txt`, no `venv activate`. The `--model` flag from the earlier draft is dropped: IndicTrans2 has one obvious right choice for this task (the distilled Indic→English model), and exposing it as a flag adds surface area without value.

Default behavior with no flags: read `<id>.ml.txt`, write `<id>.en.txt` alongside it. If `<id>.en.txt.partial` already exists from a prior crashed run, automatically resume from where it left off and tell the user (`Resuming from paragraph 34/87…`). `--force` is the escape hatch if the partial is poisoned or the user wants to retranslate.

## File layout

```
scripts/translate.py        # single-file Python CLI; PEP 723 deps header, arg parsing,
                            # parse + chunk + model load + translate loop + write
```

One file. Translation is a linear pipeline with no non-trivial state machine. PEP 723 (inline script metadata, supported natively by `uv`) lets the whole thing — including dependencies — live in one file.

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

One model call per paragraph. The IndicTrans2 distilled 200 M model has plenty of context for any single paragraph the transcript script can produce; no sub-chunking required.

## Translation call

Pseudocode (the implementation plan pins exact API):

```python
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from IndicTransToolkit.processor import IndicProcessor

MODEL_ID = "ai4bharat/indictrans2-indic-en-dist-200M"
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_ID, trust_remote_code=True)
ip = IndicProcessor(inference=True)

def translate(text: str) -> str:
    batch = ip.preprocess_batch([text], src_lang="mal_Mlym", tgt_lang="eng_Latn")
    enc = tokenizer(batch, return_tensors="pt", padding="longest", truncation=True, max_length=256)
    with torch.no_grad():
        out = model.generate(**enc, num_beams=5, max_length=256)
    decoded = tokenizer.batch_decode(out, skip_special_tokens=True, clean_up_tokenization_spaces=True)
    return ip.postprocess_batch(decoded, lang="eng_Latn")[0]
```

The model loads once at startup (taking ~10–20 s) and stays in memory for the whole run.

**Output post-processing:** trim; collapse any run of `\n\s*\n+` to a single `\n` — keeps each translation as exactly one paragraph in the output file, so `count_completed_paragraphs` stays in sync during resume.

**Pre-flight (before the loop):** verify the imports succeed and the model loads. If model download fails (e.g. offline first run), print the actual error and the expected ~800 MB download size, exit cleanly.

## Output format

`<id>.en.txt` (or `<out>/<id>.en.txt` if `--out` is set):

```
Source: https://www.youtube.com/watch?v=5MVkCqd2U10
Video ID: 5MVkCqd2U10
Title: <passed through from input>
Language: en (translated from ml)
Fetched: <passed through from input>
Source method: <passed through from input "Method:" line>
Translation: ai4bharat/indictrans2-indic-en-dist-200M (local CPU)
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

Model load is announced separately on first call:

```
Loading IndicTrans2 (ai4bharat/indictrans2-indic-en-dist-200M)... done in 14.2s
```

## Error handling

| Failure | Behavior |
| --- | --- |
| Input file not found | Print path, exit 2 |
| Input file has no `---` separator (not a transcript) | Print "expected transcript header followed by `---`", exit 2 |
| Input `Language:` header is not `ml` | Print "this script translates Malayalam (`ml`) only; got `<lang>`", exit 2 |
| `uv` not installed | Shell error `uv: command not found`. The README's setup section documents `brew install uv` (or `curl -LsSf https://astral.sh/uv/install.sh \| sh`). |
| Model download fails on first run (no network, HF down) | Print the underlying `transformers` error and "first-run model download (~800 MB) failed — check network and retry", exit 4 |
| Model inference raises an exception on a paragraph | Print paragraph index + the input text + Python traceback, leave `.partial` intact, exit 5 |
| Model output is empty / whitespace-only | Print paragraph index + the input text, leave `.partial` intact, exit 6 |
| `<id>.en.txt` already exists (no `--force`) | Print "output exists; pass `--force` to overwrite", exit 7 |
| `.partial` body has more paragraphs than input (stale resume) | Print "partial file has N paragraphs but input has M; pass `--force` to start over", exit 8 |

No retries, no backoff. Resume-on-rerun + `.partial` covers crash recovery; the user diagnoses the root cause and re-runs.

## Dependencies

| What | Source | Notes |
| --- | --- | --- |
| `uv` | system binary | One-time: `brew install uv` (or the curl installer). Used to manage Python and Python deps. |
| Python ≥3.10 | via `uv` | `uv` auto-installs an appropriate interpreter; system Python 3.9 is not used. |
| `transformers` | declared inline (PEP 723) | Hugging Face library. `uv` installs into an isolated env on first run. |
| `torch` (CPU build) | declared inline (PEP 723) | ~250 MB. CPU-only is fine; no GPU required. |
| `IndicTransToolkit` | declared inline (PEP 723) | AI4Bharat's pre/post-processor for IndicTrans models. |
| `sentencepiece` | declared inline (PEP 723) | Tokenizer dependency for IndicTrans2. |
| IndicTrans2 model weights | downloaded from Hugging Face on first run, cached in `~/.cache/huggingface` | ~800 MB. One-time. |
| No npm/jsr libs | — | The Deno side is just the `deno.json` task entry. |

`.gitignore` already excludes `.env` and large local data; `data/transcripts/*.partial` should be added (gitignore amendment is part of the implementation).

## Open verification items (for the implementation plan)

1. Confirm the exact pip names and APIs for `IndicTransToolkit` (the package has gone through naming churn — `IndicTransToolkit` vs `IndicTransTokenizer`; the wrong choice fails at import time). First implementation step: get the model loaded and run one real Malayalam paragraph through it before writing anything else.
2. Confirm CPU-only `torch` install via `uv` resolves cleanly on macOS (Apple Silicon vs Intel) — `torch` wheel selection can be fiddly. The PEP 723 metadata may need an explicit `torch` index hint.

## Out of scope reminders

- Batch mode (`for f in *.ml.txt; do deno task translate "$f"; done`).
- Bidirectional translation (`en` → `ml`, etc.).
- Quality critique / second-pass review.
- Subtitle formats.
- Cloud/API fallback.
- Mid-paragraph streaming.
- Speaker name detection.
- GPU acceleration / MPS backend.
- Configurable model: hard-coded to `ai4bharat/indictrans2-indic-en-dist-200M`.
