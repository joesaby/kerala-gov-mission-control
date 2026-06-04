# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Commands

```bash
deno task dev          # dev server at http://localhost:8000 (hot-reload)
deno task check        # deno fmt --check + deno lint + deno check (run before every commit)
deno task build        # production build → _fresh/
deno task start        # serve the production build
deno task seed         # wipe and reseed local Deno KV from fixtures
deno task translate    # run scripts/translate.py (uv, needs Python ≥ 3.10)
deno task translate:test  # pytest for translate.py
```

`deno task check` covers format, lint, and type-check together — always run it
before committing or opening a PR.

## Architecture

### Framework: Deno Fresh 2

File-based routing in `routes/`. Every route exports a `handler` (data-loading)
and a default page component. The `define` helper from `utils.ts` wires the
shared `State` (currently just `lang: Lang`) into both. Islands (`islands/`) are
the only client-side Preact; everything else is server-rendered.

### State / language

`routes/_middleware.ts` reads a `lang` cookie and sets `ctx.state.lang` ("en" |
"ml"). All page components receive `lang` via `state` and use it to select
`name` vs `nameMl`, `title` vs `titleMl`, etc.

### Data layer: Deno KV + typed fixtures

All data lives in `data/*.ts` as typed TypeScript arrays. On cold start,
`data/db.ts:ensureSeeded()` checks a `["meta", "seed_version"]` key and, if
stale, wipes all prefixes and repopulates KV from the fixtures.

**Critical:** Whenever you change the shape or content of any fixture
(`kpis.ts`, `ministers.ts`, `departments.ts`, `persons.ts`, `parties.ts`,
`speakers.ts`, `governments.ts`), bump `SEED_VERSION` in `data/db.ts`. Without
this bump the site silently serves stale data from the previous seed.

KV layout (primary keys → secondary indexes):

```
["kpi", id]                            → Kpi
["dept", id]                           → Department
["minister", id]                       → Minister
["government", id]                     → Government
["person", id]                         → Person
["party", id]                          → Party
["coalition", id]                      → CoalitionMembership
["speaker", id]                        → Speaker

["kpi_by_dept",        deptId, kpiId]
["kpi_by_domain",      domain, kpiId]
["dept_by_minister",   minId, deptId]
["minister_by_govt",   govtId, minId]
["minister_by_person", personId, minId]
["coalition_by_party", partyId, cId]
["speaker_by_term",    term, speakerId]
```

### Entity model

`Person` is the stable node — one record per human across all tenures. Every
office-bearing entity uses `termStart` / `termEnd` (ISO date strings). `termEnd`
undefined = currently in post. Durations can be as short as one day
(resignation + reinstatement gets two separate tenure records).

- **Minister** — cabinet tenure. CM and Deputy CM are `Minister` records with
  `rank: "CM"` / `"Deputy CM"`. `party` is a denormalized abbreviation for
  display; `partyId` is the FK.
- **Speaker** — assembly tenure, separate from Minister (Speakers vacate party
  membership).
- **CoalitionMembership** — tracks party alliance switches across elections
  (RSP: LDF→UDF 2011; KC(M): UDF→LDF 2021).
- **Department** — stable across governments; only `ministerId` / `secretaryId`
  assignments change.

Full spec: `docs/data/data-model.md`.

### KPI defensibility rules

Every KPI in `data/kpis.ts` must have: `ownerDeptId`, `target`, `comparators[]`
(≥1 external benchmark), `meta.definition` + `meta.definitionMl`, `meta.source`,
`meta.sourceUrl`, `meta.owner` (designation, not "Mission Control"),
`meta.lastRefreshed` (ISO with `+05:30`). `timeSeries` uses `kind: "actual"` for
published values and `kind: "target"` / `"projection"` for forward-looking
points.

The `/add-kpi` skill enforces the full checklist. Run it when adding any new
KPI.

### ID conventions

| Entity          | Pattern                              | Example                                                                    |
| --------------- | ------------------------------------ | -------------------------------------------------------------------------- |
| Person          | `person.<slug>`                      | `person.pinarayi-vijayan`                                                  |
| Party           | `party.<abbrev-lowercase>`           | `party.cpim`                                                               |
| Coalition       | `cm.<party-slug>-<coalition>[-year]` | `cm.rsp-ldf-2006`                                                          |
| Government      | `govt.<slug>`                        | `govt.pinarayi-2`                                                          |
| Minister tenure | `min.<person-slug>[-year]`           | `min.pinarayi-vijayan` (current), `min.pinarayi-vijayan-2016` (historical) |
| Speaker tenure  | `speaker.<person-slug>-<term>`       | `speaker.an-shamseer-15`                                                   |
| Department      | `dept.<slug>`                        | `dept.finance`                                                             |
| KPI             | `<domain>.<slug>`                    | `fiscal.debt-to-gsdp`                                                      |

### Government Order ingest (Gemini + daily cron)

Government Orders are ingested automatically, not hand-curated. The pipeline
(`lib/ingest.ts`) is **runtime-safe** — pure `fetch` + Deno KV, no subprocess or
filesystem — so it runs unchanged inside Deno Deploy:

1. **Scrape** GO listings from `document.kerala.gov.in` (regex over the portal
   HTML; see `KNOWN_SOURCES`).
2. **Extract + map** — each PDF's bytes go straight to **Gemini**
   (`lib/gemini.ts`, model `gemini-flash-latest`), which reads the PDF natively
   and returns `goNumber/type/date/subject(+Ml)` **and** the manifesto goal it
   backs, in one call. **Fallback:** If Gemini fails or hits a quota/limit, the
   pipeline falls back to **GROQ** (`lib/groq.ts` using `qwen/qwen3-32b` or
   similar via standard chat API) if `GROQ_API_KEY` is provided, after
   extracting text from the PDF bytes in memory.
3. **Persist** via `putIngestedGovernmentOrder` → writes `["go", id]` + indexes
   **and** a durable mirror `["go_ingested", id]`.

`lib/cron.ts` registers a `Deno.cron` (`daily-go-ingest`, 02:30 IST) that runs
the ingest in production. It self-disables (logs + returns) when `Deno.cron` or
`GEMINI_API_KEY` is unavailable, so local dev / CI stay clean.

**Durability:** `seed()` wipes `["go"]` on a `SEED_VERSION` bump but **never**
wipes `["go_ingested"]`, and re-hydrates it back into `["go"]` after loading the
fixture. So cron-ingested orders survive reseeds. `data/government-orders.ts` is
just a small static baseline (only orders with a verified, resolvable PDF) — do
**not** add speculative records with guessed URLs; the cron fills the rest.

`GEMINI_API_KEY` (and optional `GROQ_API_KEY` for fallback) must be set in Deno
Deploy env (and `.env` for local CLI runs). Note: `gemini-2.0-flash` has a zero
free-tier quota on the project key — use `gemini-flash-latest` (the default;
override with `GEMINI_MODEL`). Override GROQ fallback model using `GROQ_MODEL`
(defaults to `qwen/qwen3-32b`).

Manual runs / backfills:
`deno task ingest-gos [--since YYYY-MM-DD] [--limit N]
[--source orders,cabinet,circulars,rts] [--dry-run]`.
Public, read-only pipeline health is at `/gov/ingest-status`.

**Admin area (`/admin`)** — hidden, unlinked, `noindex`, gated by HTTP Basic
Auth (`routes/admin/_middleware.ts`): username `admin`, password from
`ADMIN_PASSWORD` (503 if unset — never open). It shows full status, run history
(`getIngestRuns`), captured logs (`getIngestLog`), and a **Force ingest now**
button (`POST /admin/ingest`, island `AdminIngest`).
`tryAcquireIngestLock`/`releaseIngestLock` (an auto-expiring KV lock) serialize
manual + cron runs so they never overlap.

## Hooks (automatic)

Two hooks run on every file edit:

- **PreToolUse** (`block-env-edits.sh`) — blocks edits to `.env` / `.env.*`. Env
  files must be edited by hand.
- **PostToolUse** (`deno-format.sh`) — runs `deno fmt` + `deno lint` on the
  edited `.ts`/`.tsx` file. If `deno fmt` fails the hook blocks the tool call
  with an error; lint findings are non-fatal.

Because the formatter rewrites the file, always re-read a `.ts`/`.tsx` file
before making a second edit — the bytes may have changed.

## Custom agents and skills

| Name                             | When to use                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| `/add-kpi`                       | Adding any new headline or tier-2 KPI — enforces the defensibility checklist                       |
| `/bilingual-audit`               | Check for EN fields missing their `*Ml` counterpart before a PR                                    |
| `kpi-data-reviewer` agent        | Audit `data/kpis.ts` for defensibility gaps before merging                                         |
| `governance-data-reviewer` agent | Surface every `dataStatus: "unverified"/"tbd"` record with the fields needed to reach `"verified"` |

## Bilingual invariant

This dashboard serves both English and Malayalam. Never machine-translate
Malayalam government terminology — wrong term = wrong meaning. If a `*Ml` field
is missing, mark the record `dataStatus: "tbd"` and file a translation request;
do not guess.

## Deployment

Deno Deploy (Git Integration) watches the repo, runs `deno task build`, and
serves `_fresh/server.js`. `.github/workflows/ci.yml` runs `check` + `build` on
every PR/push to `main` — it does not deploy. No manual deploy step.

## Not yet implemented

- `Constituency` — type defined in `types.ts`; 140 records needed (source: ECI
  Delimitation Order).
- `MemberOfLegislative` — type defined; data from CEO Kerala / ECI results.
- `Secretary` — type defined; data from KAR / DOPT IAS posting circulars.
