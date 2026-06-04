# Data source policy

> Every number on this dashboard must be defensible in public. That means it
> traces to an **official government source** — never a newspaper, blog,
> Wikipedia, or think-tank.

This policy is enforced by `deno task check:sources`
(`scripts/check-sources.ts`), which runs in the pre-commit gate.

## The rule

Any **published factual figure** — a KPI value, a Government Order, a Status
Paper vital or finding — must cite:

- `meta.source` — the naming of the official body / document, and
- `meta.sourceUrl` — a resolvable link to that document,

where the host is an official government or constitutional body.

### Accepted (government) sources

| Domain pattern                             | Body                                              |
| ------------------------------------------ | ------------------------------------------------- |
| `*.gov.in`, `*.nic.in`, `*.gov`            | Union & State government, departments             |
| `niyamasabha.org`, `keralalegislature.org` | Kerala Legislative Assembly                       |
| `rbi.org.in`                               | Reserve Bank of India                             |
| `censusindia.gov.in`                       | Office of the Registrar General & Census          |
| `mospi.gov.in`                             | Ministry of Statistics & Programme Implementation |
| `cag.gov.in`                               | Comptroller & Auditor General                     |
| `eci.gov.in`, `ceo.kerala.gov.in`          | Election Commission / CEO Kerala                  |
| `data.gov.in`                              | National open-data portal                         |

Extend the allowlist in `scripts/check-sources.ts` **only** for genuine
government / constitutional bodies.

### Not accepted as the source of record

Newspapers (Manorama, The Print, ANI, …), Wikipedia, PRS Legislative Research,
OpenBudgetsIndia, Dataful, ASER, vendor/aggregator sites, blogs, social media.
These may be useful for _discovery_ — but the figure that ships must be
re-sourced to the underlying official document.

## Scope — three tiers

1. **Hard gate (government-only, fatal).** `data/kpis.ts`,
   `data/government-orders.ts`, `data/status-papers.ts`. A non-government
   `sourceUrl` here fails the build.
2. **Advisory (warn, non-fatal).** `data/manifesto-goals.ts`. Election promises
   are a _political-party_ document, so the source of record is the party's own
   published manifesto — not government, and not a newspaper. The validator
   warns on newspaper citations here so they can be migrated to the official
   manifesto PDF. _(Known debt: the current manifesto goals cite news coverage;
   replace with the official UDF manifesto when a stable URL is available.)_
3. **Out of scope.** `data/sources.ts` is a research _catalog_ that deliberately
   lists third-party aggregators (with reliability notes) as places to _find_
   data. Media/attribution URLs — portrait photos in `data/persons.ts`, YouTube
   embeds in `data/public-speeches.ts` — are governed by attribution, not this
   policy.

## Escape hatch

If a non-government URL is genuinely unavoidable in gated data, add
`// source-policy:allow <reason>` on the line above the URL and justify it in
the PR. Use sparingly — every use weakens the guarantee.

## Related

- KPI defensibility checklist — `/add-kpi` skill, `kpi-data-reviewer` agent.
- Canonical per-domain source inventory — [`docs/data/`](./README.md), typed
  registry [`data/sources.ts`](../../data/sources.ts).
