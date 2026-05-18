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


def main() -> int:
    print("scripts/translate.py: not implemented yet", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
