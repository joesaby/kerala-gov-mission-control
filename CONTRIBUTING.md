# Contributing

Thanks for working on Kerala Mission Control — a public accountability
dashboard. The bar is high because the output is public.

## The overriding principle

**Every number a citizen sees must be traceable to an official source.** A
figure without a citable, resolvable official source is not merged — no
exceptions. This single rule outranks everything else in this guide. If you have
to choose between shipping a number and being able to prove where it came from,
you keep the proof and drop the number.

The mechanics below serve that principle; the architecture is in
[`CLAUDE.md`](./CLAUDE.md).

## What's welcome

- **Bug fixes** — anything broken in the app, build, or data pipeline.
- **Language fixes** — English copy and especially **Malayalam** corrections.
  Wrong term = wrong meaning, so native-speaker review of `*Ml` fields is
  valuable.
- **Accessibility** — keyboard, contrast, screen-reader, and semantic-markup
  improvements.
- **New official data sources** — additional KPIs, comparators, or Government
  Order sources, provided each comes with a verifiable public source (see
  [Adding a data source](#adding-a-data-source)).
- **Documentation** — clarifications, fixes, and new specs under `docs/`.

## What's declined

- **Data without a verifiable public source.** No newspaper, Wikipedia, blog,
  think-tank, or "I heard it from" figures. Enforced by
  `deno task check:sources`.
- **Editorialising or political framing.** This project is politically neutral.
  Copy, labels, or framing that praises or attacks a party, coalition, minister,
  or person will not be merged. State what the official record says; let readers
  judge.
- **Republishing non-public data.** Only data already published by official
  sources belongs here. Do not add restricted, leaked, or private material.
- **Committed secrets.** API keys, passwords, or tokens never go in the repo.
  `.env` is hand-edited and git-ignored; a hook blocks edits to it.

## How changes get merged

Nothing is merged automatically. Every change goes through maintainer review:

1. **Fork** the repository.
2. **Branch** off `main` (`feat:`, `fix:`, `docs:`, `chore:` …
   conventional-style names and commit messages).
3. **Open a pull request** against `main`.
4. **Maintainer review** — a human reads the diff against the project's rubric
   ([`docs/code-review-guidelines.md`](./docs/code-review-guidelines.md)),
   checks sources, neutrality, and bilingual parity.
5. **Merge** — only after review approval. CI must be green, but green CI alone
   does not merge anything.

## Local checks before you open a PR

Run both, and make sure they pass:

```bash
deno task check    # deno fmt --check + deno lint + deno check
deno task build    # production build into _fresh/
```

`deno fmt` (without `--check`) auto-formats. CI
([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) runs the same checks
on every PR.

## Adding a data source

Any new figure or document source must arrive with all of the following, or it
will be sent back:

| Required                | What it means                                                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Official source URL** | A resolvable link to the publishing authority's own document or portal.                                                                                                |
| **Publishing body**     | Which official body publishes it (department, ministry, ECI, etc.).                                                                                                    |
| **Update frequency**    | How often the source itself is updated (so we know when our copy is stale).                                                                                            |
| **How it's fetched**    | The source must be **public**. Fetch only what is openly published — no scraping behind logins, paywalls, or access restrictions, and nothing the publisher disallows. |

For KPIs specifically, the full defensibility set (owner department, target,
comparators, bilingual definition, source, owner designation, last-refreshed
timestamp) is required — use the `/add-kpi` skill, which enforces the checklist.
Source policy: [`docs/data/source-policy.md`](./docs/data/source-policy.md).

## AI components

The dashboard uses AI to read Government Orders and map each to the manifesto
promise it relates to. Two rules are non-negotiable for any change to that
pipeline:

- **Inspectable.** A human must be able to see _why_ a Government Order was
  mapped to a given promise. Do not introduce mappings that can't be traced back
  to the order's own text and the promise it cites.
- **Fail visibly.** When the model is unsure or extraction fails, the pipeline
  must surface that — leave the mapping empty, flag it, or mark the record — and
  must **never** present a silent guess as if it were a confident, sourced fact.
  A wrong-but-confident mapping is worse than no mapping.

Machine-translated Malayalam follows the same spirit: it is allowed only as a
flagged `translationStatus: "machine-draft"` until a Malayalam speaker reviews
it. If you can't provide even a draft, leave the `*Ml` field out and mark the
record `dataStatus: "tbd"`. Run `/bilingual-audit` before a PR.

## Reporting security issues

Do **not** use a public issue or PR for security problems — including data
integrity or AI-ingestion manipulation. Report them privately as described in
[`SECURITY.md`](./SECURITY.md).

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). By
participating, you agree to uphold it.

## Licence of contributions

By contributing, you agree your code contributions are licensed under the
project's [MIT Licence](./LICENSE). The underlying **public data is not covered
by that licence** — it remains the property of the official body that published
it and is reproduced here only for accountability and transparency.
