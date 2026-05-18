# Malayalam → English Translate Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Python CLI (`scripts/translate.py`) that translates Malayalam transcript files produced by `scripts/transcript.ts` into English, locally on CPU, using AI4Bharat's IndicTrans2 distilled-200M model loaded in-process via Hugging Face `transformers`. Paragraph-level progress, crash-resume via a `.partial` file, single-file Python script managed by `uv` (PEP 723 inline dependency metadata).

**Architecture:** One Python file owns the whole job. Pure helper functions (parse, chunk, format, resume math) are unit-tested with `pytest`. The IndicTrans2 model is wrapped behind a small `Translator` class so the per-paragraph code path can be unit-tested with a fake translator; the real model is only loaded by the orchestrator and exercised in the end-to-end smoke test.

**Tech Stack:** Python ≥3.10 (auto-installed by `uv`), `transformers`, `torch` (CPU), `IndicTransToolkit`, `sentencepiece`. Test framework: `pytest`. The Deno side is a single `deno.json` task entry (`uv run scripts/translate.py`).

**Source spec:** `docs/superpowers/specs/2026-05-18-malayalam-english-translate-script-design.md`

> **Note on prior revision:** This plan was originally written for Ollama + Aya Expanse 8B and discarded after discovering Aya does not officially support Malayalam (sanity check passed on a trivial greeting but real transcripts would have degraded). The current plan is the IndicTrans2 redo.

---

## File Map

| Path | Responsibility | Status |
| --- | --- | --- |
| `scripts/translate.py` | Single-file Python CLI: PEP 723 deps header, arg parsing, transcript parsing, paragraph chunking, IndicTrans2 model load, translation loop with resume, output writing | Create |
| `scripts/translate_test.py` | Unit tests for all pure functions + a `FakeTranslator`-backed test for the per-paragraph code path | Create |
| `deno.json` | Add `translate` and `translate:test` tasks | Modify |
| `.gitignore` | Ignore `*.partial` files under `data/transcripts/` | Modify |
| `README.md` | Document the new task, `uv` install, first-run model download | Modify |

---

## Task 0: Install uv + verify IndicTrans2 imports and runs on real Malayalam

**Why first:** `IndicTransToolkit` has had API churn (the package on PyPI has been renamed between versions, and the processor module path has shifted). Verifying the actual API on this machine before writing 200 lines of code that assume one shape is much cheaper than discovering an `ImportError` in Task 5. We also need to confirm that CPU `torch` resolves cleanly via `uv` on this Mac.

**Files (probe-only, deleted at end of task):**
- Create: `/tmp/translate_probe.py`

- [ ] **Step 1: Install uv if not present**

```bash
command -v uv >/dev/null 2>&1 || brew install uv
uv --version
```

Expected: prints a version string (e.g. `uv 0.4.x`). If `brew` isn't available, fall back to `curl -LsSf https://astral.sh/uv/install.sh | sh` and re-source shell.

- [ ] **Step 2: Write a one-off probe script**

Create `/tmp/translate_probe.py` (this file is throwaway — it will be deleted in Step 5):

```python
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "transformers>=4.46.0",
#     "torch>=2.4",
#     "sentencepiece>=0.2.0",
#     "IndicTransToolkit>=1.0.3",
# ]
# ///
import time
import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from IndicTransToolkit.processor import IndicProcessor

MODEL_ID = "ai4bharat/indictrans2-indic-en-dist-200M"

t0 = time.time()
print(f"Loading {MODEL_ID}...", flush=True)
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_ID, trust_remote_code=True)
ip = IndicProcessor(inference=True)
print(f"Loaded in {time.time() - t0:.1f}s", flush=True)

samples = [
    "നമസ്കാരം, എങ്ങനെയുണ്ട്?",
    "ഇന്ന് കേരളത്തിലെ കാലാവസ്ഥ വളരെ നല്ലതാണ്. പുതിയ വർഷം എല്ലാവർക്കും ഭാവുകങ്ങൾ.",
    "സർക്കാർ പുതിയ പദ്ധതി പ്രഖ്യാപിച്ചു. അത് കർഷകർക്ക് വളരെ പ്രയോജനപ്രദമാകും.",
]

for s in samples:
    batch = ip.preprocess_batch([s], src_lang="mal_Mlym", tgt_lang="eng_Latn")
    enc = tokenizer(batch, return_tensors="pt", padding="longest", truncation=True, max_length=256)
    with torch.no_grad():
        out = model.generate(**enc, num_beams=5, max_length=256)
    decoded = tokenizer.batch_decode(out, skip_special_tokens=True, clean_up_tokenization_spaces=True)
    english = ip.postprocess_batch(decoded, lang="eng_Latn")[0]
    print(f"\nML: {s}")
    print(f"EN: {english}")
```

- [ ] **Step 3: Run the probe (will download ~800 MB of model on first run + install deps)**

```bash
uv run /tmp/translate_probe.py
```

Expected:
- `uv` resolves and installs `transformers`, `torch`, `sentencepiece`, `IndicTransToolkit` into an isolated env (may take a few minutes the first time).
- Model loads in 10–30 s.
- Three English translations print, each a reasonable rendering of the Malayalam input.

If any of the following happen, **STOP** and report back:
- `ImportError` on `from IndicTransToolkit.processor import IndicProcessor` — the module path may have changed. Inspect the installed package (`uv run python -c "import IndicTransToolkit; print(IndicTransToolkit.__file__)"`) and adjust the import in this plan + spec before continuing.
- `torch` install fails on macOS — note the exact error; we may need to add a torch index hint to the PEP 723 metadata.
- English output is gibberish — the model choice needs revisiting.

- [ ] **Step 4: Record what worked**

In your report back, paste:
- The exact `uv` version, Python version uv chose, and the resolved versions of `transformers`, `torch`, `IndicTransToolkit`.
- All three English translations.
- Total wall-clock time for the run.

These values will be referenced when writing Tasks 1 and 5.

- [ ] **Step 5: Clean up the probe**

```bash
rm /tmp/translate_probe.py
```

- [ ] **Step 6: No commit** — this task produced no project files.

---

## Task 1: Scaffold `scripts/translate.py` + `deno.json` tasks + `.gitignore`

**Files:**
- Modify: `deno.json` (tasks block)
- Create: `scripts/translate.py` (stub with PEP 723 metadata)
- Modify: `.gitignore` (ignore `data/transcripts/*.partial`)

- [ ] **Step 1: Add tasks to `deno.json`**

Read `deno.json`. In the `tasks` block, add `translate` and `translate:test` right after `transcript` (or after `seed` if `transcript` is not yet present):

```jsonc
    "translate": "uv run scripts/translate.py",
    "translate:test": "uv run --with pytest pytest scripts/translate_test.py -v",
```

Resulting block (with the prior `transcript` task assumed present):

```jsonc
  "tasks": {
    "check": "deno fmt --check . && deno lint . && deno check",
    "dev": "deno run -A --watch=static/,routes/ dev.ts",
    "build": "deno run -A dev.ts build",
    "start": "deno serve -A _fresh/server.js",
    "seed": "deno run -A scripts/seed.ts",
    "transcript": "deno run -A --env-file=.env scripts/transcript.ts",
    "translate": "uv run scripts/translate.py",
    "translate:test": "uv run --with pytest pytest scripts/translate_test.py -v",
    "update": "deno run -A -r jsr:@fresh/update ."
  },
```

- [ ] **Step 2: Create the script stub with PEP 723 metadata**

Create `scripts/translate.py`:

```python
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "transformers>=4.46.0",
#     "torch>=2.4",
#     "sentencepiece>=0.2.0",
#     "IndicTransToolkit>=1.0.3",
# ]
# ///
"""Translate Malayalam transcript files to English using IndicTrans2."""

from __future__ import annotations

import sys


def main() -> int:
    print("scripts/translate.py: not implemented yet", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
```

If Task 0 found different version pins for any of the dependencies, use those exact versions here instead.

- [ ] **Step 3: Ignore `.partial` files in git**

Append to `.gitignore`:

```
# Translation work-in-progress files
data/transcripts/*.partial
```

- [ ] **Step 4: Verify the task runs (and uv resolves env)**

```bash
deno task translate
```

Expected: `scripts/translate.py: not implemented yet` on stderr, exit code 1. (`uv` will set up the env if not already cached from Task 0.)

- [ ] **Step 5: Commit**

```bash
git add deno.json scripts/translate.py .gitignore
git commit -m "Scaffold translate CLI: deno task, PEP 723 script, partial ignore"
```

---

## Task 2: `parse_transcript` + tests

**Files:**
- Create: `scripts/translate_test.py`
- Modify: `scripts/translate.py` (add `parse_transcript` and supporting types above `main`)

- [ ] **Step 1: Write the failing tests**

Create `scripts/translate_test.py`:

```python
# /// script
# requires-python = ">=3.10"
# dependencies = ["pytest>=8.0"]
# ///
"""Unit tests for scripts/translate.py pure functions."""

from __future__ import annotations

import pytest

from translate import (
    parse_transcript,
)

SAMPLE_ML_TXT = """Source: https://www.youtube.com/watch?v=5MVkCqd2U10
Video ID: 5MVkCqd2U10
Title: Kerala CM press meet
Language: ml (Malayalam)
Fetched: 2026-05-18T12:34:56Z
Method: timedtext

---

ഇന്ന് നമ്മൾ ചർച്ച ചെയ്യാൻ പോകുന്നത് വളരെ പ്രധാനപ്പെട്ട ഒരു വിഷയമാണ്.

രണ്ടാമത്തെ ഖണ്ഡിക ഇവിടെ.
"""


def test_parse_transcript_extracts_header_fields_and_body():
    parsed = parse_transcript(SAMPLE_ML_TXT)
    assert parsed.header.source == "https://www.youtube.com/watch?v=5MVkCqd2U10"
    assert parsed.header.video_id == "5MVkCqd2U10"
    assert parsed.header.title == "Kerala CM press meet"
    assert parsed.header.language == "ml (Malayalam)"
    assert parsed.header.fetched == "2026-05-18T12:34:56Z"
    assert parsed.header.method == "timedtext"
    assert parsed.body.strip() == (
        "ഇന്ന് നമ്മൾ ചർച്ച ചെയ്യാൻ പോകുന്നത് വളരെ പ്രധാനപ്പെട്ട ഒരു വിഷയമാണ്.\n\n"
        "രണ്ടാമത്തെ ഖണ്ഡിക ഇവിടെ."
    )


def test_parse_transcript_rejects_file_with_no_separator():
    with pytest.raises(ValueError, match="expected transcript header followed by `---`"):
        parse_transcript("Source: foo\nLanguage: ml (Malayalam)\nno separator here\n")


def test_parse_transcript_rejects_non_malayalam_language():
    en_input = SAMPLE_ML_TXT.replace(
        "Language: ml (Malayalam)", "Language: en (English)"
    )
    with pytest.raises(ValueError, match=r"translates Malayalam \(`ml`\) only"):
        parse_transcript(en_input)


def test_parse_transcript_language_line_missing():
    no_lang = SAMPLE_ML_TXT.replace("Language: ml (Malayalam)\n", "")
    with pytest.raises(ValueError, match=r"translates Malayalam \(`ml`\) only"):
        parse_transcript(no_lang)
```

To make `from translate import ...` work, pytest needs to find `scripts/translate.py` on `sys.path`. We will run tests with the working directory set to `scripts/` — the `translate:test` task in `deno.json` from Task 1 should be updated now:

In `deno.json`, change the `translate:test` line to:

```jsonc
    "translate:test": "sh -c 'cd scripts && uv run --with pytest pytest translate_test.py -v'",
```

(Bare `pytest` from the repo root would still find the test file but the `from translate import` would fail because `scripts/` isn't on `sys.path`. `cd scripts` is the simplest fix and matches the convention of "tests live next to the code they test".)

- [ ] **Step 2: Run tests, verify they fail**

```bash
deno task translate:test
```

Expected: all four tests FAIL with `ImportError: cannot import name 'parse_transcript' from 'translate'`.

- [ ] **Step 3: Implement `parse_transcript`**

Replace the contents of `scripts/translate.py` with:

```python
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "transformers>=4.46.0",
#     "torch>=2.4",
#     "sentencepiece>=0.2.0",
#     "IndicTransToolkit>=1.0.3",
# ]
# ///
"""Translate Malayalam transcript files to English using IndicTrans2."""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field


@dataclass
class TranscriptHeader:
    source: str | None = None
    video_id: str | None = None
    title: str | None = None
    language: str = ""
    fetched: str | None = None
    method: str | None = None


@dataclass
class ParsedTranscript:
    raw_header: str
    body: str
    header: TranscriptHeader = field(default_factory=TranscriptHeader)


_HEADER_FIELDS = {
    "Source": "source",
    "Video ID": "video_id",
    "Title": "title",
    "Language": "language",
    "Fetched": "fetched",
    "Method": "method",
}

_SEPARATOR_RE = re.compile(r"^---\s*$", re.MULTILINE)
_HEADER_LINE_RE = re.compile(r"^([A-Za-z][A-Za-z ]*?):\s*(.+)$")


def parse_transcript(text: str) -> ParsedTranscript:
    sep_match = _SEPARATOR_RE.search(text)
    if sep_match is None:
        raise ValueError("expected transcript header followed by `---` on its own line")

    raw_header = text[: sep_match.start()].rstrip()
    body = text[sep_match.end():].lstrip("\n")

    header = TranscriptHeader()
    for line in raw_header.splitlines():
        m = _HEADER_LINE_RE.match(line)
        if not m:
            continue
        key = _HEADER_FIELDS.get(m.group(1))
        if key:
            setattr(header, key, m.group(2).strip())

    if not header.language.startswith("ml"):
        got = header.language or "<missing>"
        raise ValueError(
            f"this script translates Malayalam (`ml`) only; got `{got}`"
        )

    return ParsedTranscript(raw_header=raw_header, body=body, header=header)


def main() -> int:
    print("scripts/translate.py: not implemented yet", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
deno task translate:test
```

Expected: all four PASS.

- [ ] **Step 5: Commit**

```bash
git add deno.json scripts/translate.py scripts/translate_test.py
git commit -m "Add parse_transcript with header/body extraction and language guard"
```

---

## Task 3: Paragraph chunking helpers + tests

**Files:**
- Modify: `scripts/translate.py` (add `split_paragraphs`, `split_speaker_prefix`, `count_completed_paragraphs`)
- Modify: `scripts/translate_test.py` (append tests)

- [ ] **Step 1: Write the failing tests**

Append to `scripts/translate_test.py`:

```python
from translate import (
    split_paragraphs,
    split_speaker_prefix,
    count_completed_paragraphs,
)


def test_split_paragraphs_youtube_style():
    body = "Para one.\n\nPara two.\n\nPara three.\n"
    assert split_paragraphs(body) == ["Para one.", "Para two.", "Para three."]


def test_split_paragraphs_collapses_multiple_blank_lines():
    body = "First.\n\n\n\nSecond.\n"
    assert split_paragraphs(body) == ["First.", "Second."]


def test_split_paragraphs_empty_body():
    assert split_paragraphs("") == []
    assert split_paragraphs("\n\n\n") == []


def test_split_paragraphs_trims_whitespace():
    assert split_paragraphs("  hello  \n\n  world  \n") == ["hello", "world"]


def test_split_speaker_prefix_extracts_sarvam_prefix():
    assert split_speaker_prefix("[Speaker 1]: ഇത് ഒരു വാചകം.") == (
        "[Speaker 1]: ",
        "ഇത് ഒരു വാചകം.",
    )


def test_split_speaker_prefix_two_digit_number():
    assert split_speaker_prefix("[Speaker 12]: hello") == ("[Speaker 12]: ", "hello")


def test_split_speaker_prefix_no_prefix():
    assert split_speaker_prefix("Plain paragraph text.") == ("", "Plain paragraph text.")


def test_count_completed_paragraphs_counts_body_paragraphs():
    partial = """Source: ...
Language: en (translated from ml)

---

First translated.

Second translated.
"""
    assert count_completed_paragraphs(partial) == 2


def test_count_completed_paragraphs_empty_body():
    partial = """Source: ...

---

"""
    assert count_completed_paragraphs(partial) == 0


def test_count_completed_paragraphs_no_separator():
    assert count_completed_paragraphs("just some text no separator") == 0
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
deno task translate:test
```

Expected: the new tests FAIL (`ImportError` for the three new names). Tests from Task 2 still PASS.

- [ ] **Step 3: Implement the three functions**

Add to `scripts/translate.py`, above `def main()`:

```python
_PARAGRAPH_SEP_RE = re.compile(r"(?:\r?\n)\s*(?:\r?\n)+")
_SPEAKER_PREFIX_RE = re.compile(r"^(\[Speaker \d+\]: )(.*)$", re.DOTALL)


def split_paragraphs(body: str) -> list[str]:
    parts = _PARAGRAPH_SEP_RE.split(body)
    return [p.strip() for p in parts if p.strip()]


def split_speaker_prefix(paragraph: str) -> tuple[str, str]:
    m = _SPEAKER_PREFIX_RE.match(paragraph)
    if not m:
        return ("", paragraph)
    return (m.group(1), m.group(2))


def count_completed_paragraphs(partial_content: str) -> int:
    sep = _SEPARATOR_RE.search(partial_content)
    if sep is None:
        return 0
    body = partial_content[sep.end():]
    return len(split_paragraphs(body))
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
deno task translate:test
```

Expected: all tests PASS (Tasks 2 + 3 combined, 14 tests total).

- [ ] **Step 5: Commit**

```bash
git add scripts/translate.py scripts/translate_test.py
git commit -m "Add paragraph chunking and resume-count helpers"
```

---

## Task 4: `build_output_header` + tests

**Files:**
- Modify: `scripts/translate.py` (add `build_output_header` and `MODEL_LABEL` constant)
- Modify: `scripts/translate_test.py` (append tests)

- [ ] **Step 1: Write the failing tests**

Append to `scripts/translate_test.py`:

```python
from translate import build_output_header, TranscriptHeader, MODEL_LABEL


def test_build_output_header_preserves_source_fields():
    header = TranscriptHeader(
        source="https://www.youtube.com/watch?v=5MVkCqd2U10",
        video_id="5MVkCqd2U10",
        title="Kerala CM press meet",
        language="ml (Malayalam)",
        fetched="2026-05-18T12:34:56Z",
        method="timedtext",
    )
    out = build_output_header(header, translated_at="2026-05-19T09:12:34Z")
    assert out == (
        "Source: https://www.youtube.com/watch?v=5MVkCqd2U10\n"
        "Video ID: 5MVkCqd2U10\n"
        "Title: Kerala CM press meet\n"
        "Language: en (translated from ml)\n"
        "Fetched: 2026-05-18T12:34:56Z\n"
        "Source method: timedtext\n"
        f"Translation: {MODEL_LABEL}\n"
        "Translated: 2026-05-19T09:12:34Z"
    )


def test_build_output_header_omits_missing_optionals():
    header = TranscriptHeader(language="ml (Malayalam)")
    out = build_output_header(header, translated_at="2026-05-19T09:12:34Z")
    assert out == (
        "Language: en (translated from ml)\n"
        f"Translation: {MODEL_LABEL}\n"
        "Translated: 2026-05-19T09:12:34Z"
    )


def test_model_label_identifies_indictrans2():
    assert "indictrans2" in MODEL_LABEL.lower()
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
deno task translate:test
```

Expected: the three new tests FAIL.

- [ ] **Step 3: Implement `build_output_header` and `MODEL_LABEL`**

Add to `scripts/translate.py`, above `def main()`:

```python
MODEL_LABEL = "ai4bharat/indictrans2-indic-en-dist-200M (local CPU)"


def build_output_header(header: TranscriptHeader, translated_at: str) -> str:
    lines: list[str] = []
    if header.source:
        lines.append(f"Source: {header.source}")
    if header.video_id:
        lines.append(f"Video ID: {header.video_id}")
    if header.title:
        lines.append(f"Title: {header.title}")
    lines.append("Language: en (translated from ml)")
    if header.fetched:
        lines.append(f"Fetched: {header.fetched}")
    if header.method:
        lines.append(f"Source method: {header.method}")
    lines.append(f"Translation: {MODEL_LABEL}")
    lines.append(f"Translated: {translated_at}")
    return "\n".join(lines)
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
deno task translate:test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/translate.py scripts/translate_test.py
git commit -m "Add build_output_header for English transcript header"
```

---

## Task 5: `Translator` wrapper + `translate_paragraph` + fake-translator tests

**Files:**
- Modify: `scripts/translate.py` (add `Translator` class and `translate_paragraph` function)
- Modify: `scripts/translate_test.py` (append tests using a `FakeTranslator`)

This task introduces the IndicTrans2 wrapper. The class is structured so the heavy model load is deferred to `load()`, and the per-paragraph translation logic (including the blank-line collapse fix) is a separate pure-ish function that takes any object with a `.translate(str) -> str` method — so it can be unit-tested with a fake.

- [ ] **Step 1: Write the failing tests**

Append to `scripts/translate_test.py`:

```python
from translate import translate_paragraph


class FakeTranslator:
    def __init__(self, output: str):
        self._output = output
        self.calls: list[str] = []

    def translate(self, text: str) -> str:
        self.calls.append(text)
        return self._output


def test_translate_paragraph_strips_whitespace():
    fake = FakeTranslator(output="  Hello.\n")
    assert translate_paragraph("hello", fake) == "Hello."


def test_translate_paragraph_collapses_internal_blank_lines():
    # Critical for resume math: every translated paragraph must remain
    # exactly ONE paragraph when re-split by split_paragraphs.
    fake = FakeTranslator(output="Line one.\n\nLine two.\n\n\nLine three.")
    assert translate_paragraph("x", fake) == "Line one.\nLine two.\nLine three."


def test_translate_paragraph_raises_on_empty_output():
    fake = FakeTranslator(output="   \n\t")
    with pytest.raises(ValueError, match="empty translation"):
        translate_paragraph("hello", fake)


def test_translate_paragraph_passes_input_through_to_translator():
    fake = FakeTranslator(output="english")
    translate_paragraph("malayalam input", fake)
    assert fake.calls == ["malayalam input"]
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
deno task translate:test
```

Expected: the four new tests FAIL.

- [ ] **Step 3: Implement `Translator` and `translate_paragraph`**

First, add `Protocol` to the existing `typing`-area imports at the top of `scripts/translate.py`. The file's import block should now look like:

```python
from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from typing import Protocol
```

Then add to `scripts/translate.py`, above `def main()`:

```python
MODEL_ID = "ai4bharat/indictrans2-indic-en-dist-200M"
_BLANK_LINE_RE = re.compile(r"\n\s*\n+")


class _TranslatorProtocol(Protocol):
    def translate(self, text: str) -> str: ...


class Translator:
    """Lazy wrapper around IndicTrans2 (loaded on first .load() call)."""

    def __init__(self) -> None:
        self._loaded = False
        self._tokenizer = None
        self._model = None
        self._processor = None

    def load(self) -> None:
        if self._loaded:
            return
        # Imports are deferred so importing this module from tests does not
        # require transformers/torch to be installed.
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
        from IndicTransToolkit.processor import IndicProcessor

        self._tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
        self._model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_ID, trust_remote_code=True)
        self._processor = IndicProcessor(inference=True)
        self._loaded = True

    def translate(self, text: str) -> str:
        if not self._loaded:
            raise RuntimeError("Translator.load() must be called before translate()")
        import torch

        batch = self._processor.preprocess_batch(
            [text], src_lang="mal_Mlym", tgt_lang="eng_Latn"
        )
        enc = self._tokenizer(
            batch,
            return_tensors="pt",
            padding="longest",
            truncation=True,
            max_length=256,
        )
        with torch.no_grad():
            out = self._model.generate(**enc, num_beams=5, max_length=256)
        decoded = self._tokenizer.batch_decode(
            out, skip_special_tokens=True, clean_up_tokenization_spaces=True
        )
        return self._processor.postprocess_batch(decoded, lang="eng_Latn")[0]


def translate_paragraph(text: str, translator: _TranslatorProtocol) -> str:
    raw = translator.translate(text)
    # Collapse any internal blank lines so the result is always exactly ONE
    # paragraph in the output file. This keeps count_completed_paragraphs in
    # sync with the translation loop's position when resuming.
    collapsed = _BLANK_LINE_RE.sub("\n", raw.strip())
    if not collapsed:
        raise ValueError("empty translation")
    return collapsed
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
deno task translate:test
```

Expected: all tests PASS.

Note: the `Translator` class itself is NOT unit-tested — its real behavior depends on the model. The end-to-end smoke test (Task 7) exercises it.

- [ ] **Step 5: Commit**

```bash
git add scripts/translate.py scripts/translate_test.py
git commit -m "Add Translator wrapper and translate_paragraph with blank-line collapse"
```

---

## Task 6: CLI orchestrator (`main`)

**Files:**
- Modify: `scripts/translate.py` (replace the `main` stub with the full orchestrator)

This task wires everything: arg parsing, file IO, model load with timing, the translation loop with progress and resume, exit-code mapping. Not unit-tested — the end-to-end smoke test in Task 7 covers it.

- [ ] **Step 1: Add the new top-level imports**

Extend the file's import block at the top of `scripts/translate.py`. After Task 5, the imports look like:

```python
from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from typing import Protocol
```

Change them to:

```python
from __future__ import annotations

import argparse
import re
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Protocol
```

- [ ] **Step 2: Replace the `main` stub with the full orchestrator**

In `scripts/translate.py`, replace:

```python
def main() -> int:
    print("scripts/translate.py: not implemented yet", file=sys.stderr)
    return 1
```

with:

```python
def _die(code: int, message: str) -> int:
    print(message, file=sys.stderr)
    return code


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="translate",
        description="Translate a Malayalam transcript (.ml.txt) to English (.en.txt).",
    )
    parser.add_argument("input", help="Path to the Malayalam transcript file.")
    parser.add_argument("--out", help="Output directory (defaults to input's directory).")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite an existing .en.txt and ignore any stale .partial.",
    )
    args = parser.parse_args(argv)

    input_path = Path(args.input)
    out_dir = Path(args.out) if args.out else input_path.parent
    force = args.force

    if not input_path.is_file():
        return _die(2, f"Input file not found: {input_path}")

    try:
        raw = input_path.read_text(encoding="utf-8")
    except OSError as e:
        return _die(2, f"Could not read {input_path}: {e}")

    try:
        parsed = parse_transcript(raw)
    except ValueError as e:
        return _die(2, str(e))

    base_name = input_path.name
    if base_name.endswith(".ml.txt"):
        base_name = base_name[: -len(".ml.txt")]
    out_path = out_dir / f"{base_name}.en.txt"
    partial_path = out_dir.joinpath(f"{base_name}.en.txt.partial")

    if out_path.exists():
        if not force:
            return _die(7, f"Output exists: {out_path}. Pass --force to overwrite.")
        out_path.unlink()

    paragraphs = split_paragraphs(parsed.body)
    if not paragraphs:
        return _die(2, "Input transcript body is empty — nothing to translate.")

    resume_from = 0
    if not force and partial_path.exists():
        partial_content = partial_path.read_text(encoding="utf-8")
        resume_from = count_completed_paragraphs(partial_content)
        if resume_from > len(paragraphs):
            return _die(
                8,
                f"Partial file has {resume_from} paragraphs but input has {len(paragraphs)}; "
                "pass --force to start over.",
            )
    elif force and partial_path.exists():
        partial_path.unlink()

    # Seed the .partial with the header if we're starting fresh.
    if resume_from == 0:
        translated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        header = build_output_header(parsed.header, translated_at=translated_at)
        out_dir.mkdir(parents=True, exist_ok=True)
        partial_path.write_text(f"{header}\n\n---\n\n", encoding="utf-8")
    else:
        print(
            f"Resuming from paragraph {resume_from + 1}/{len(paragraphs)} "
            f"(using existing {partial_path})"
        )

    # Load the model.
    print(f"Loading IndicTrans2 ({MODEL_ID})...", flush=True)
    t0 = time.time()
    translator = Translator()
    try:
        translator.load()
    except Exception as e:  # noqa: BLE001
        return _die(
            4,
            f"first-run model download (~800 MB) failed: {e}\n"
            "Check network connectivity and retry. Model weights cache under "
            "~/.cache/huggingface/.",
        )
    print(f"  done in {time.time() - t0:.1f}s", flush=True)

    # Translation loop.
    started = time.time()
    for i in range(resume_from, len(paragraphs)):
        prefix, text = split_speaker_prefix(paragraphs[i])
        try:
            translated = translate_paragraph(text, translator)
        except ValueError as e:
            # Empty translation
            print(
                f"Paragraph {i + 1}/{len(paragraphs)} failed: {e}\n"
                f"  input: {text[:200]}{'…' if len(text) > 200 else ''}\n"
                f"Partial file preserved at: {partial_path}",
                file=sys.stderr,
            )
            return 6
        except Exception as e:  # noqa: BLE001
            print(
                f"Paragraph {i + 1}/{len(paragraphs)} failed with model error: {e}\n"
                f"  input: {text[:200]}{'…' if len(text) > 200 else ''}\n"
                f"Partial file preserved at: {partial_path}",
                file=sys.stderr,
            )
            return 5
        with partial_path.open("a", encoding="utf-8") as f:
            f.write(f"{prefix}{translated}\n\n")
        print(f"[{i + 1}/{len(paragraphs)}] ✓", flush=True)

    # Finalize.
    partial_path.rename(out_path)
    elapsed = int(time.time() - started)
    mins, secs = divmod(elapsed, 60)
    print(f"Done. Wrote {out_path} ({len(paragraphs)} paragraphs, {mins}m{secs}s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

The `if __name__ == "__main__"` block at the bottom of the file should already exist from Task 1 — leave it untouched.

- [ ] **Step 3: Syntax check the script**

```bash
uv run --no-project python -c "import ast; ast.parse(open('scripts/translate.py').read()); print('ok')"
```

Expected: `ok`.

- [ ] **Step 4: Confirm `--help` works**

```bash
deno task translate --help
```

Expected: argparse-generated help text printed; exit code 0.

- [ ] **Step 5: Confirm missing-arg behavior**

```bash
deno task translate
```

Expected: argparse error message about the required `input` argument; exit code 2.

- [ ] **Step 6: Run the full unit-test suite to confirm nothing regressed**

```bash
deno task translate:test
```

Expected: all tests still PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/translate.py
git commit -m "Wire translate.py CLI: parsing, model load, loop, resume"
```

---

## Task 7: End-to-end smoke test against the real model

**Why this task is manual:** the unit tests cover every pure function and the per-paragraph translation logic with a fake translator. The remaining risk is integration — that the script actually loads IndicTrans2, processes a real file, produces an English output, and resumes correctly after a kill. This walks through that by hand.

**Files:**
- Create (temporary, then delete): `data/transcripts/_smoke.ml.txt`

- [ ] **Step 1: Create a tiny fixture transcript**

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
- `Loading IndicTrans2 (...)...` followed by `done in <N>s`.
- Progress: `[1/4] ✓` through `[4/4] ✓`.
- Final: `Done. Wrote data/transcripts/_smoke.en.txt (4 paragraphs, ...)`.
- No `.partial` file remains.

- [ ] **Step 3: Inspect the English output**

```bash
cat data/transcripts/_smoke.en.txt
```

Verify by eye:
- Header has `Language: en (translated from ml)`, `Source method: smoke`, `Translation: ai4bharat/indictrans2-indic-en-dist-200M (local CPU)`, and a `Translated:` timestamp.
- Body has four paragraphs in English.
- The last two paragraphs preserve the `[Speaker 1]:` / `[Speaker 2]:` prefixes verbatim.
- Translations are coherent English (not gibberish, not Malayalam left over, not preambles).

- [ ] **Step 4: Test the existing-output guard**

```bash
deno task translate data/transcripts/_smoke.ml.txt; echo "exit=$?"
```

Expected: prints `Output exists: data/transcripts/_smoke.en.txt. Pass --force to overwrite.`, then `exit=7`.

- [ ] **Step 5: Test `--force` overwrites**

```bash
deno task translate data/transcripts/_smoke.ml.txt --force
```

Expected: runs the full translation again, ends with `Done.`.

- [ ] **Step 6: Test resume after kill**

In one terminal:

```bash
deno task translate data/transcripts/_smoke.ml.txt --force
```

Wait for the model load to finish and `[1/4] ✓` to appear, then hit `Ctrl+C`. Check:

```bash
cat data/transcripts/_smoke.en.txt.partial
```

Expected: header + `---` + one translated paragraph.

Resume:

```bash
deno task translate data/transcripts/_smoke.ml.txt
```

Expected:
- `Resuming from paragraph 2/4 (using existing data/transcripts/_smoke.en.txt.partial)`.
- Model loads again.
- Progress continues from `[2/4] ✓`.
- Finalizes to `_smoke.en.txt`.

- [ ] **Step 7: Test wrong-language guard**

```bash
sed 's/Language: ml (Malayalam)/Language: en (English)/' data/transcripts/_smoke.ml.txt > /tmp/_wronglang.ml.txt
deno task translate /tmp/_wronglang.ml.txt; echo "exit=$?"
```

Expected: prints `this script translates Malayalam (\`ml\`) only; got \`en (English)\``, then `exit=2`. Then `rm /tmp/_wronglang.ml.txt`.

- [ ] **Step 8: Clean up the fixture**

```bash
rm data/transcripts/_smoke.ml.txt data/transcripts/_smoke.en.txt
ls data/transcripts/_smoke* 2>&1 || true
```

Expected: no `_smoke.*` files remain.

- [ ] **Step 9: No commit** — fixture removed, only checked behavior.

---

## Task 8: README update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read the current README**

```bash
cat README.md
```

Find the section that documents `deno task transcript`. The new `translate` documentation should sit immediately after it.

- [ ] **Step 2: Add a `translate` section**

Add a subsection right after the `transcript` documentation:

```markdown
### Translate a Malayalam transcript to English

After `deno task transcript <url>` produces a `data/transcripts/<id>.ml.txt`, translate it to English locally with IndicTrans2:

```bash
deno task translate data/transcripts/<id>.ml.txt
```

Produces `data/transcripts/<id>.en.txt` alongside the source file. The first run downloads the IndicTrans2 distilled-200M model (~800 MB) from Hugging Face and caches it under `~/.cache/huggingface`. Subsequent runs reuse the cache.

**One-time setup:**

```bash
brew install uv          # or: curl -LsSf https://astral.sh/uv/install.sh | sh
```

`uv` manages a Python ≥3.10 interpreter, an isolated virtual environment, and the Python dependencies declared inline in `scripts/translate.py`. You do not need to manage Python or pip yourself.

**Flags:**
- `--out <dir>` writes the output elsewhere (default: same directory as input).
- `--force` overwrites an existing `.en.txt` or ignores a stale `.partial`.

**Resume:** The script writes a `.partial` file as it goes. If you Ctrl+C or the process dies, re-run the same command and it picks up from the last completed paragraph.

**Tests:** `deno task translate:test` runs the pytest suite for the pure helpers (transcript parsing, chunking, header building, paragraph collapse).
```

- [ ] **Step 3: Verify formatting**

```bash
deno fmt --check README.md
```

If it reports diffs, run `deno fmt README.md` and re-check.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "Document deno task translate (IndicTrans2 + uv) in README"
```

---

## Plan summary

9 tasks (0–8). Tasks 0 and 7 are manual / verification. Tasks 1–6 are TDD-style with explicit tests, code, and per-task commits. Task 8 is documentation.

When complete, the contributor can:

```bash
deno task transcript https://www.youtube.com/watch?v=<id>      # produces .ml.txt
deno task translate data/transcripts/<id>.ml.txt               # produces .en.txt
```

…fully locally, fully free, with crash-safe resume on long runs, using a model that actually supports Malayalam.
