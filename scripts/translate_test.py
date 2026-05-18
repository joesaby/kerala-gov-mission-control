# /// script
# requires-python = ">=3.10"
# dependencies = ["pytest>=8.0"]
# ///
"""Unit tests for scripts/translate.py pure functions."""

from __future__ import annotations

import pytest

from translate import (
    MODEL_LABEL,
    TranscriptHeader,
    build_output_header,
    count_completed_paragraphs,
    parse_transcript,
    split_paragraphs,
    split_speaker_prefix,
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


def test_model_label_identifies_nllb():
    assert "nllb" in MODEL_LABEL.lower()
