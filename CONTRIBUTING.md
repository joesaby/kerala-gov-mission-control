# Contributing

Thanks for working on Kerala Mission Control — a public accountability
dashboard. The bar is high because the output is public: **every number must be
defensible.** This guide covers the mechanics; architecture is in
[`CLAUDE.md`](./CLAUDE.md).

## Setup

```bash
# Deno ≥ 2 and (for the translate script) uv / Python ≥ 3.10
deno task dev          # http://localhost:8000 with hot reload
git config core.hooksPath .githooks   # enable the pre-commit gate (opt-in)
```

## Everyday commands

| Command                    | What it does                                                                  |
| -------------------------- | ----------------------------------------------------------------------------- |
| `deno task dev`            | Dev server, hot reload                                                        |
| `deno task check`          | `deno fmt --check` + `deno lint` + `deno check` — **run before every commit** |
| `deno task check:sources`  | Government-source policy on data fixtures                                     |
| `deno task review`         | Advisory headless Claude review of staged changes                             |
| `deno task build`          | Production build → `_fresh/`                                                  |
| `deno task seed`           | Wipe + reseed local Deno KV from fixtures                                     |
| `deno task translate:test` | pytest for `scripts/translate.py`                                             |

`deno fmt` (without `--check`) auto-formats. A Claude Code PostToolUse hook also
runs `deno fmt` + `deno lint` on each edited `.ts`/`.tsx`.

## The non-negotiables

1. **Government source of record.** Every published figure (KPI, Government
   Order, Status Paper) cites an official government source with a resolvable
   `sourceUrl` — never a newspaper, Wikipedia, blog, or think-tank. Enforced by
   `deno task check:sources`. Policy:
   [`docs/data/source-policy.md`](./docs/data/source-policy.md).
2. **Bump `SEED_VERSION`** in `data/db.ts` whenever any `data/*.ts` fixture
   changes shape or content — otherwise the site serves stale KV data.
3. **No machine-translated Malayalam.** Wrong term = wrong meaning. Missing
   `*Ml` is fine with `dataStatus: "tbd"`; guessing is not. Run
   `/bilingual-audit`.
4. **`deno task check` is green** before you commit.
5. **New KPIs** carry the full defensibility set — use the `/add-kpi` skill and
   the `kpi-data-reviewer` agent.

Full rubric:
[`docs/code-review-guidelines.md`](./docs/code-review-guidelines.md).

## Pre-commit hook

Version-controlled in [`.githooks/`](./.githooks/), opt-in:

```bash
git config core.hooksPath .githooks
```

- **Blocks** on `deno task check` and `deno task check:sources`.
- **Advisory** (never blocks): a headless Claude code review of the staged diff,
  using [`docs/code-review-guidelines.md`](./docs/code-review-guidelines.md).
- Bypass a commit: `git commit --no-verify`. Skip only the review:
  `SKIP_REVIEW=1 git commit`.

## Skills & agents (Claude Code)

| Use                                   | Skill / agent                    |
| ------------------------------------- | -------------------------------- |
| Find an official source for a number  | `/data-discovery`                |
| Understand the codebase               | `/arch-discovery`                |
| Build a feature the project's way     | `/feature-implementation`        |
| Add a KPI                             | `/add-kpi`                       |
| Review a change against project rules | `/review-checklist`              |
| Contribution mechanics                | `/contributing`                  |
| Check EN/ML parity                    | `/bilingual-audit`               |
| Audit KPI defensibility               | `kpi-data-reviewer` agent        |
| Audit governance records              | `governance-data-reviewer` agent |

## Pull requests

Branch off `main` (never commit straight to it). Conventional-style messages
(`feat:`, `fix:`, `chore:`, `docs:`). CI (`.github/workflows/ci.yml`) runs
`check` + `build` on every PR — keep it green. For non-trivial features, add a
short spec under [`docs/specs/`](./docs/specs/).
