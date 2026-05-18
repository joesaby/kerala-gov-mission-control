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

import re
import sys
from dataclasses import dataclass, field
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


def main() -> int:
    print("scripts/translate.py: not implemented yet", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
