# Working in this repo

## Always run checks before commit or PR

Before creating any commit, opening a PR, or pushing a branch, run:

```
deno task check
```

This wraps `deno fmt --check . && deno lint . && deno check` — the same gates CI
enforces. Fix any failures locally; don't rely on CI to catch formatting or lint
regressions.

If a test task is added later (`deno task test`), run that too. Until then,
treat `deno task check` as the floor.

## Why this matters

- The CI workflow (`.github/workflows/ci.yml`) runs `deno fmt --check`,
  `deno lint`, `deno check`, and `deno task build` on every push and PR. A
  formatting miss blocks the merge until a follow-up commit fixes it.
- Markdown is included in `deno fmt` — prose files in `docs/` get re-wrapped by
  the formatter. Hand-wrapping to a different width will fail CI.
- `_fresh/` and `static/styles.css` are excluded from `deno fmt` via
  `deno.json`; don't fight the formatter on the files it does cover.
