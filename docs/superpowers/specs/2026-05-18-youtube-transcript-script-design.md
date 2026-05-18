# YouTube Transcript Script Design

**Date:** 2026-05-18 **Status:** Approved, ready for implementation plan
**Source request:** Download transcripts for Kerala CM / government-order
YouTube videos (initial target: <https://www.youtube.com/watch?v=5MVkCqd2U10>)

## Goal

A Deno CLI script that takes a YouTube URL and produces a Malayalam (and
English, when available) plain-text transcript file. Falls back to Sarvam AI
Speech-to-Text when YouTube has no captions.

## Non-goals

- Web UI or Fresh route (this is a CLI script).
- Batch mode across many URLs (use shell `xargs` / `for` loops).
- Translation polish (Sarvam `mode=translate` is available but not exposed as a
  first-class flag).
- Webhook callbacks for Sarvam jobs (we poll).
- Cross-run resume of in-flight Sarvam jobs.
- Subtitle formats (SRT/VTT). Plain text only.

## Flow

```
youtube URL
   |
   v
[1] Probe YouTube captions via timedtext   (free, instant)
   |
   |-- captions exist? --> save <id>.ml.txt and/or <id>.en.txt --> done
   |
   '-- no captions --> [2] yt-dlp -> audio.wav (16 kHz mono via ffmpeg)
                          |
                          v
                       [3] Sarvam Batch STT (REST, diarization on)
                          init -> upload -> start -> poll -> download
                          |
                          v
                       parse Sarvam JSON -> speaker-labelled <id>.ml.txt
```

## CLI

```
deno task transcript <url>
deno task transcript <url> --speakers 3
deno task transcript <url> --force-sarvam     # skip YouTube captions, always transcribe
deno task transcript <url> --out <dir>        # default: data/transcripts/
deno task transcript <url> --yes              # skip the cost-confirmation prompt
```

`deno.json` tasks gets:

```jsonc
"transcript": "deno run -A --env-file=.env scripts/transcript.ts"
```

`-A` matches existing tasks. `--env-file=.env` loads `SARVAM_API_KEY`
automatically.

## File layout

```
scripts/transcript.ts              # CLI entry; arg parsing; orchestrates the three steps
scripts/transcript/
  youtube-captions.ts              # step 1: timedtext probe + fetch
  audio.ts                         # step 2: yt-dlp + ffmpeg subprocess wrapper
  sarvam.ts                        # step 3: batch API client (init/upload/start/poll/download)
  format.ts                        # build the .txt output (header + body, diarization rendering)
```

Splitting into four small files (rather than one monolith like
`scripts/seed.ts`) because the Sarvam batch flow is a non-trivial state machine
that deserves its own module — keeps the orchestrator readable and lets each
piece be exercised independently.

## Step 1: YouTube captions (`youtube-captions.ts`)

1. Parse video ID from URL (handles `youtube.com/watch?v=`, `youtu.be/`,
   `youtube.com/shorts/`, with optional query params).
2. `fetch` the watch page HTML.
3. Extract `ytInitialPlayerResponse` JSON via regex.
4. Walk `captions.playerCaptionsTracklistRenderer.captionTracks[]` for tracks
   where `languageCode` is `ml` or `en` (including auto-generated tracks where
   `kind === "asr"`).
5. For each matching track, GET `baseUrl + "&fmt=vtt"`.
6. Parse VTT, concatenate cue text into a single block (paragraph breaks on cues
   separated by >2 s of silence).
7. Return `{ tracks: [{ lang, kind, text }] }`.

If no `ml` or `en` track exists, return empty `tracks` so the orchestrator
triggers step 2.

Page title (for output header) is scraped from `<title>` in the same fetched
HTML — one fetch covers both.

## Step 2: Audio extraction (`audio.ts`)

```sh
yt-dlp -x --audio-format wav --audio-quality 0 \
       --postprocessor-args "ffmpeg:-ac 1 -ar 16000" \
       -o "<tmp>/<videoId>.%(ext)s" \
       <url>
```

- Pre-flight: `which yt-dlp` and `which ffmpeg`; fail with
  `brew install yt-dlp ffmpeg` hint if missing.
- Writes to a `Deno.makeTempDir()` directory; cleaned up after Sarvam completes.
- Returns `{ wavPath, durationSeconds }`. Duration parsed from
  `ffprobe -i <wav> -show_entries format=duration -of csv=p=0`.

## Step 3: Sarvam batch (`sarvam.ts`)

Reads `SARVAM_API_KEY` from env. Errors at startup if missing.

Public function:
`transcribeWithSarvam({ wavPath, languageCode, numSpeakers, onProgress }) -> SarvamResult`.

Internal flow (REST shapes to be **verified against Sarvam docs as the first
implementation task** — they were not in the brief; if they differ materially we
revisit this section):

1. `POST /speech-to-text/job/init` ->
   `{ job_id, input_storage_path, output_storage_path }`.
2. `PUT <input_storage_path>/<basename>` with the WAV bytes.
3. `POST /speech-to-text/job/{job_id}/start` with
   `{ model: "saaras:v3", language_code: "ml-IN", with_diarization: true, num_speakers }`.
4. Poll `GET /speech-to-text/job/{job_id}/status` every 10 s, exponential
   backoff to 30 s, hard timeout 30 min. Print progress dots via `onProgress`.
5. On `completed`, `GET /speech-to-text/job/{job_id}/outputs` for download URLs.
6. Download JSON, return parsed
   `{ segments: [{ start, end, speaker, text }], language }`.

All headers include `api-subscription-key: <key>`.

## Cost / time guard rail

Before kicking off Sarvam on a long file, print:

```
Audio is 42m18s. Sarvam batch will take ~5-10 min. Proceed? [y/N]
```

Trigger: audio duration > 15 min. Bypass: `--yes` flag. (No price estimate —
Sarvam pricing varies and hard-coding stale numbers is worse than no number.)

## Output (`format.ts`)

Files: `data/transcripts/<videoId>.<lang>.txt`. One file per language.

Format:

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

**Body, YouTube captions path:** concatenated cue text, paragraph breaks on >2 s
gaps.

**Body, Sarvam path (diarized):**

```
[Speaker 1]: ...
[Speaker 2]: ...
[Speaker 1]: ...
```

Speakers are renumbered to `1..N` in order of first appearance (Sarvam emits
arbitrary IDs).

## Error handling

| Failure                                                                 | Behaviour                                                          |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| URL doesn't parse                                                       | Print usage, exit 2                                                |
| No `ml` and no `en` track, Sarvam path needed, `SARVAM_API_KEY` missing | Print which env var is missing and which `.env` it expects, exit 3 |
| `yt-dlp` or `ffmpeg` missing                                            | Print install hint, exit 4                                         |
| `yt-dlp` fails (private/removed/region-locked video)                    | Print yt-dlp stderr, exit 5                                        |
| Sarvam job fails                                                        | Print job ID + status payload (for support), exit 6                |
| Sarvam poll timeout (>30 min)                                           | Print job ID so user can check manually, exit 7                    |

No retries (yet). Add retry/backoff only after we see a real flake.

## Dependencies

| What                 | Source             | Notes                                                                   |
| -------------------- | ------------------ | ----------------------------------------------------------------------- |
| `yt-dlp`             | system binary      | `brew install yt-dlp`                                                   |
| `ffmpeg` / `ffprobe` | system binary      | `brew install ffmpeg`                                                   |
| `SARVAM_API_KEY`     | `.env`, gitignored | Format: `SARVAM_API_KEY=sk_...` (must include the variable-name prefix) |
| No npm/jsr libs      | —                  | Deno `fetch` for HTTP, `Deno.Command` for subprocesses                  |

`.gitignore` already excludes `.env`.

## Open verification items (for the implementation plan)

1. Confirm Sarvam batch REST endpoint shapes with a single manual `curl` before
   coding the polling loop. If the surface differs from what's sketched in
   `sarvam.ts`, revisit step 3.
2. Confirm the target video's captions situation (likely has Malayalam ASR
   captions) by running step 1 against it as the first end-to-end smoke test —
   that tells us whether step 2/3 even need to be exercised in dev.

## Out of scope reminders

- Webhook callbacks (poll instead).
- English translation as a first-class output.
- Speaker name labels (only `Speaker 1..N` IDs).
- Job resume across runs.
- Multi-URL batching.
