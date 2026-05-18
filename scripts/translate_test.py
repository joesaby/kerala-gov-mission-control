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
