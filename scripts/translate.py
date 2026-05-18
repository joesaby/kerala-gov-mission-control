# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "transformers>=4.46.0,<5.0",
#     "torch>=2.4",
#     "sentencepiece>=0.2.0",
# ]
# ///
"""Translate Malayalam transcript files to English using NLLB-200."""

from __future__ import annotations

import argparse
import re
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Protocol


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


MODEL_LABEL = "facebook/nllb-200-distilled-600M (local CPU)"


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


MODEL_ID = "facebook/nllb-200-distilled-600M"
SRC_LANG = "mal_Mlym"  # FLORES-200: Malayalam in Malayalam script
TGT_LANG = "eng_Latn"  # FLORES-200: English in Latin script
_BLANK_LINE_RE = re.compile(r"\n\s*\n+")


class _TranslatorProtocol(Protocol):
    def translate(self, text: str) -> str: ...


class Translator:
    """Lazy wrapper around NLLB-200 (loaded on first .load() call)."""

    def __init__(self) -> None:
        self._loaded = False
        self._tokenizer = None
        self._model = None
        self._forced_bos_id: int | None = None

    def load(self) -> None:
        if self._loaded:
            return
        # Imports are deferred so importing this module from tests does not
        # require transformers/torch to be installed.
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        self._tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        self._model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_ID)
        self._tokenizer.src_lang = SRC_LANG
        self._forced_bos_id = self._tokenizer.convert_tokens_to_ids(TGT_LANG)
        self._loaded = True

    def translate(self, text: str) -> str:
        if not self._loaded:
            raise RuntimeError("Translator.load() must be called before translate()")
        import torch

        inputs = self._tokenizer(
            text, return_tensors="pt", truncation=True, max_length=512
        )
        with torch.no_grad():
            out = self._model.generate(
                **inputs,
                forced_bos_token_id=self._forced_bos_id,
                max_length=512,
                num_beams=5,
            )
        return self._tokenizer.batch_decode(out, skip_special_tokens=True)[0]


def translate_paragraph(text: str, translator: _TranslatorProtocol) -> str:
    raw = translator.translate(text)
    # Collapse any internal blank lines so the result is always exactly ONE
    # paragraph in the output file. This keeps count_completed_paragraphs in
    # sync with the translation loop's position when resuming.
    collapsed = _BLANK_LINE_RE.sub("\n", raw.strip())
    if not collapsed:
        raise ValueError("empty translation")
    return collapsed


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
    print(f"Loading NLLB-200 ({MODEL_ID})...", flush=True)
    t0 = time.time()
    translator = Translator()
    try:
        translator.load()
    except Exception as e:  # noqa: BLE001
        return _die(
            4,
            f"first-run model download (~2.4 GB) failed: {e}\n"
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
