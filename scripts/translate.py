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


def main() -> int:
    print("scripts/translate.py: not implemented yet", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
