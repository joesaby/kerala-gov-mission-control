# Spec — Economy section & Fiscal Status Paper

Status: implemented · Term: 16th KLA · Route: `/economy/white-paper` (the
`/economy` landing is now the fiscal-status snapshot; the section is navigated
via the `EconomyShell` sidebar — see [budget-report.md](./budget-report.md))

The `/economy` section renders Kerala's official fiscal white paper —
**"Kerala's Fiscal Health 2026 — A Status Report"** (16th KLA, published EN+ML
by the Kerala Legislative Assembly) — as a human-friendly, trackable digest
rather than a 195-page PDF. It is built to be a **living baseline scorecard**:
the figures are the baseline the next five years are measured against.

## Goals

1. Make the white paper readable: vital signs, a diagnosis, and a way forward.
2. Anchor every number to the official source (the EN/ML PDFs + the exact
   table).
3. Be a baseline that updates each budget — not a static snapshot.
4. Keep the dashboard's stack: server-rendered, no chart library, daisyUI,
   bilingual, defensible.

## Data model (`data/types.ts`)

```
StatusPaper
  id, title(+Ml), subtitle(+Ml), term, tabledOn, summary(+Ml)
  vitals:   FiscalVital[]
  findings: StatusFinding[]
  levers:   RecoveryLever[]
  sources:  StatusSource[]      // EN + ML original PDFs
  meta { publishedBy, source, retrievedAt }
  dataStatus: "verified" | "unverified" | "tbd"

FiscalVital                      // a colour-coded gauge
  key, label(+Ml), baseline, baselineDisplay, period, unit(+Ml),
  direction: "lower-better"|"higher-better", status: FiscalSeverity,
  note?(+Ml),
  latest?, latestDisplay?, latestPeriod?   // EMPTY at baseline; filled next budget

StatusFinding                    // "the diagnosis"
  key, heading(+Ml), stat?, detail(+Ml), severity, chapter,
  chart?: FindingChart           // optional trackable time-series

FindingChart                     // reuses KpiTimePoint
  kind: "histogram" | "burndown", unit(+Ml), points: KpiTimePoint[],
  target?, targetLabel?, source   // source = exact table cited

RecoveryLever                    // "the way forward"
  key, heading(+Ml), detail(+Ml), horizon: "immediate"|"structural",
  adoption: AdoptionStatus, goIds?: string[]

AdoptionStatus = "not-started" | "acknowledged" | "go-issued" | "implemented"
```

Persistence (`data/db.ts`): `["status_paper", id]`, seeded from
`data/status-papers.ts`. `SEED_VERSION` bumped on every content change.
Accessors: `listStatusPapers()` (newest first), `getStatusPaper(id)`,
`putStatusPaper(p)`.

## Page (`routes/economy/index.tsx`)

The page leans into the report's own title — it is a **fiscal health chart**:

1. **Hero** — title, subtitle, tabled date, plain-language summary, anchor tabs.
2. **Vital signs** — four daisyUI `radial-progress` gauges (debt/GSDP, committed
   expenditure, interest, capex), colour-coded by clinical severity
   (error/warning/success). A "where each ₹100 of revenue goes" CSS bar, and a
   baseline-scorecard callout. When a vital's `latest` is filled, the gauge
   shows the baseline → latest delta.
3. **The diagnosis** — collapsible findings (`collapse`, CSS-only). Each finding
   may carry a `MetricChart` (see below). The one-off transfer shortfall has no
   chart by design.
4. **The way forward** — levers grouped "Do now" / "Structural reform", each
   with an **adoption status** chip. A note clarifies these are advisory
   recommendations, _not_ manifesto promises (tracked separately).
5. **Sources** — both EN + ML original PDFs, a provenance `<dl>`, and an
   optional inline-PDF disclosure.

## Charts (`components/MetricChart.tsx`)

Server-rendered **SVG** — no island, no chart library. Both modes render
vertical bars over time with the latest bar highlighted and a value label:

- `histogram` — per-year level/flow with an optional dashed `target` line (e.g.
  the FRBM ceiling). Append one `actual` point each budget → a new bar.
- `burndown` — a stock to be paid down toward `target` (₹0); starts as a single
  baseline bar and fills in as the trajectory is tracked.

Every chart prints its exact provenance (`Source: Status Report, Table 2.6`…).
The component reuses `KpiTimePoint`, so it also serves dormant KPI time-series.

### Series backfilled (all from the report's explicit tables)

| Finding                  | Series                                         | Source     |
| ------------------------ | ---------------------------------------------- | ---------- |
| Treasury on RBI advances | WMA days 2017→2026 (peak 262 in 2025)          | Table 2.6  |
| Outstanding liabilities  | Debt/GSDP 2017→2026 (peak 38.5%) + FRBM target | Table 3.1b |
| PSE drain                | Accumulated loss ₹42,930→78,069 cr             | Table 5.7  |
| Development squeeze      | SC/ST/OBC welfare share 9.24%→3.85%            | Table 6.5  |
| Inherited arrears        | ₹48,733 cr → 0 (burn-down)                     | Table 2.7  |
| KIIFB liability          | ₹21,000 cr → 0 (burn-down)                     | Ch. 4      |

## KPI wiring (`data/kpis.ts`)

The Status Report is wired into the two fiscal KPIs as a **comparator +
source**, without overwriting their headline values:

- `fiscal.debt-to-gsdp` — adds a "Status Report 2025-26 (Accounts, excl. KIIFB)"
  comparator (33.2%) + the report `sourceUrl`. The KPI's 36.4% is the broader
  measure (incl. KIIFB); the definition now disambiguates the two.
- `fiscal.revenue-deficit` — adds a "Status Report 2025-26 RE (Accounts)"
  comparator (2.58%) + `sourceUrl` + the missing `definitionMl`; the definition
  notes the headline (2.1%, Budget 2026-27) is a different period from the
  comparator.

## Tracking lifecycle (each budget)

1. **Vitals** — fill `latest`/`latestDisplay`/`latestPeriod` on each
   `FiscalVital`. Do **not** overwrite `baseline`. The gauge renders the delta.
2. **Findings** — append one `{ year, value, kind: "actual" }` to each
   `FindingChart.points`. A new bar appears; burn-downs shrink.
3. **Levers** — bump `adoption` and add `goIds` as Government Orders evidence
   action.
4. Bump `SEED_VERSION` in `data/db.ts`.

## Bilingual status

Title, vital labels/units, source labels and all UI strings are verified
Malayalam. Long prose (`summary`, finding/lever `detail`) is **not** translated:
the official ML PDF's text layer drops the subscript "ra" conjunct (`്ര` →
space), corrupting fiscal terms, so machine reconstruction would violate the
bilingual invariant. Record is `dataStatus: "tbd"` pending human transcription
from the official ML edition.

## Navigation

`Economy` is a top-level nav entry. `/economy` is the landing that leads with
the latest report; each report gets its own identity so the section scales —
when a second edition (next budget) lands, promote to a year switcher rather
than a single-item dropdown. The home page "Explore" cards link here (replacing
the unbuilt `/money` and `/panchayat` routes).
