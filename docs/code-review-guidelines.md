# Code review guidelines

The standard the headless pre-commit review (`scripts/code-review.sh`) and any
human reviewer apply. Ordered by severity — a "blocker" must be fixed before
merge; "quality" items are strong recommendations.

## Blockers

1. **Government source of record.** Every published figure (KPI, Government
   Order, Status Paper vital/finding) must cite an official government source
   with a resolvable `sourceUrl`. No newspapers, Wikipedia, blogs, vendor sites
   or think-tanks as the source of a number. Enforced by
   `deno task check:sources`. See
   [`docs/data/source-policy.md`](./data/source-policy.md).
2. **`SEED_VERSION` bump.** Any change to the shape or content of a `data/*.ts`
   fixture (`kpis.ts`, `ministers.ts`, `departments.ts`, `status-papers.ts`,
   `government-orders.ts`, `manifesto-goals.ts`, …) requires bumping
   `SEED_VERSION` in `data/db.ts`. Without it the site serves stale KV data.
3. **`deno task check` passes** — `deno fmt --check` + `deno lint` +
   `deno check` are green. No type errors, no formatting drift.
4. **No machine-translated Malayalam government terminology.** A wrong term is a
   wrong meaning. If a verified `*Ml` value isn't available, leave it unset and
   mark the record `dataStatus: "tbd"` — never guess. See the bilingual
   invariant in [`CLAUDE.md`](../CLAUDE.md).
5. **Defensibility fields on new KPIs.** `ownerDeptId`, `target`,
   `comparators[]` (≥1 external benchmark), `meta.definition` (+`definitionMl`),
   `meta.source`, `meta.sourceUrl`, `meta.owner` (a designation), and
   `meta.lastRefreshed` (ISO with `+05:30`). Use the `/add-kpi` skill and the
   `kpi-data-reviewer` agent.

## Quality

- **Bilingual parity.** New EN fields ship with their `*Ml` counterpart
  (verified, not guessed). Run the `/bilingual-audit` skill.
- **Server-render by default.** Prefer server components; add an island only for
  genuine client interactivity. New charts/visuals follow the no-JS, SSR +
  daisyUI pattern (see `components/MetricChart.tsx`).
- **Reuse over reinvention.** Use existing types (`KpiTimePoint`), helpers
  (`t()`, `define`), and CSS tokens (`surface-card`, `eyebrow`, `metric-value`).
- **Re-read after edit.** The PostToolUse `deno fmt` hook rewrites `.ts`/`.tsx`
  on save; re-read before a second edit.
- **Data integrity.** When two official figures disagree (e.g. debt 36.4% incl.
  KIIFB vs 33.2% Accounts basis), disambiguate in `meta.definition` — don't
  silently pick one. Trust the explicit source table over prose.
- **Provenance on every visual.** Charts/tiles surface their source (table +
  retrieval date), matching the tooltip rule in the `/add-kpi` skill.

## What the headless reviewer checks

`scripts/code-review.sh` runs `claude -p` (read-only, `--permission-mode plan`)
over the staged diff against this file and `CLAUDE.md`. It is **advisory** — it
prints findings but never blocks the commit. The blocking gates are
`deno task check` and `deno task check:sources`.
