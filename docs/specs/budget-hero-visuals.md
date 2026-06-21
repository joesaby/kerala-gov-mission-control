# Spec — Budget hero visuals (common-man fiscal graphics)

Status: in progress · Term: 16th KLA · Route: `/economy` (extends
[economy-status-paper.md](./economy-status-paper.md))

Two "hero" graphics that translate the white paper's abstract crores into units
an ordinary reader feels instantly. They sit in the **Vital signs** section of
`/economy`, above the collapsible diagnosis, and are driven by the same
`StatusPaper` fixture (`data/status-papers.ts`) — no new route, no island, no
chart library. Pure server-rendered SVG, following `components/MetricChart.tsx`.

## Why these two

A balance sheet doesn't land with a non-specialist. Two framings do:

1. **"Where every ₹100 goes"** — a part-to-whole bar of revenue receipts. The
   gut-punch: ~77 paise of every rupee is spoken for (salaries, pensions,
   interest) before a single new road. This already exists on the page as a
   coarse 3-segment CSS bar; this spec upgrades it to a properly **sourced,
   multi-segment** `RupeeFlow` component.
2. **"346 of 365 days on borrowed cash"** — a one-year **waffle calendar** of
   the treasury's RBI-support days. The existing treasury finding is a
   year-by-year histogram; this zooms into 2025 so the reader sees the whole
   year at once. New `TreasuryCalendar` component.

Both stay within the project's bars: every number cites an exact Status Report
table; EN + ML labels; honest about what the source does _not_ publish.

## Neutrality

The white paper is the incoming government's document. The page already frames
it as a sourced report, not editorial voice. These visuals inherit that: they
render figures with their table citation and avoid partisan captions ("debt
trap" etc.). No new claims are introduced — only re-renderings of figures
already on the page.

## Data model (`data/types.ts`)

Two optional fields added to `StatusPaper`. Both optional so existing/other
papers render unchanged.

```ts
/** One slice of "where every ₹100 of revenue goes". paise sum ≈ 100. */
export interface RupeeSegment {
  key: string;
  label: string;
  labelMl?: string;
  /** Paise out of ₹100 of revenue receipts. */
  paise: number;
  severity: FiscalSeverity; // drives colour (critical/warning/ok)
  /** Pre-committed (salary/pension/interest) vs discretionary. */
  committed?: boolean;
  /** Exact provenance, e.g. "Status Report, Table 3.x". */
  source?: string;
}

/**
 * One year of treasury liquidity, for the waffle calendar. A day sits in
 * exactly one bucket (RBI's deepest tier reached that day): within-means,
 * Ways & Means Advances, or Overdraft. wma + overdraft + normal ≈ 365.
 */
export interface TreasuryYear {
  year: number;
  wmaDays: number;
  overdraftDays: number;
  /** Within-means days; derived 365 − wma − overdraft when omitted. */
  normalDays?: number;
  /** Historical norm for context (≈18 days/yr). */
  normDays?: number;
  source: string;
  sourceUrl?: string;
}

// on StatusPaper:
//   revenueRupee?: RupeeSegment[];
//   treasury?: TreasuryYear;
```

Persistence unchanged: seeded from `data/status-papers.ts` into
`["status_paper", id]`. **Bump `SEED_VERSION`** (`data/db.ts`) on the content
change.

## Components

### `components/RupeeFlow.tsx`

A horizontal stacked bar of `RupeeSegment[]` summing to ~₹100. Committed
segments grouped left (red→orange), discretionary "everything else" right
(green). Each segment shows its paise value; a legend lists label · ₹value ·
severity. A bracket/caption over the committed run reads "₹77 already spoken
for". Renders a per-segment `<title>` with the source for hover provenance.

- Props: `{ segments: RupeeSegment[]; lang: Lang }`.
- Fallback: when `revenueRupee` is absent, the page keeps deriving the coarse
  3-segment bar from vitals (today's behaviour), so nothing regresses.

### `components/TreasuryCalendar.tsx`

A **waffle** of 365 cells (not a date grid — the daily sequence isn't
published). Cells grouped and coloured by bucket: Overdraft (error), WMA
(warning), within-means (success). Layout ~21 cols. Headline: "In {year}, the
treasury ran on borrowed cash for {wma+od} of 365 days." Legend with counts.

- Props: `{ ty: TreasuryYear; lang: Lang }`.
- **Honesty footnote** (required): "Each square is one day in {year}; squares
  show the yearly totals, not the calendar order — RBI does not publish the
  day-by-day sequence." Keeps it a part-to-whole, never implying a timeline.
- Citation line: `Source: {ty.source}` (linked when `sourceUrl` set).

## Page wiring (`routes/economy/index.tsx`)

In the Vital signs section, after the gauges:

1. Replace the inline ₹100 CSS bar with `<RupeeFlow>` when `paper.revenueRupee`
   is set; else keep the derived bar.
2. Add `<TreasuryCalendar>` when `paper.treasury` is set, as a full-width hero
   card directly under the ₹100 flow.

## Numbers (sourced)

**Treasury 2025 (confirmed):** WMA 262 d, Overdraft 84 d → 346 of 365; norm ≈18.
Source: Status Report, Table 2.6 (Treasury Directorate; RBI records).

**₹100 of revenue:** anchored to the Status Report frame — committed 77%,
interest 20.9% → salaries+pensions 56.1, everything else 23. The 56.1 is split
by the **Budget 2026-27 salary:pension ratio** (salaries ₹57,558 cr : pensions
₹38,669 cr ≈ 59.8 : 40.2; Budget in Brief, per CPPR analysis): salaries 33.6,
pensions 22.5. Final segments: **Salaries 33.6 · Pensions 22.5 · Interest 20.9 ·
Rest 23.0** (committed = ₹77).

> Denominator note: CPPR's own committed share is 71% because it divides by the
> LDF's _projected_ ₹1,82,972 cr revenue; the Status Report's 77% uses realistic
> revenue (the projection was inflated by ~₹20,500 cr). The page is anchored to
> the Status Report's 77%, consistent with the vitals gauge — so we use CPPR
> only for the salary:pension _ratio_, not the denominator. The split is sourced
> arithmetic, documented in the fixture; never a guess.

## Bilingual

All new labels (segment names, bucket names, headlines, footnote) ship verified
EN + ML — they are short, standard fiscal terms. No long prose added, so the
paper's `dataStatus: "tbd"` rationale is unaffected.

## Out of scope (next phase)

The full three-document budget arc (LDF Jan budget → white paper → UDF revised
budget) and the cause→effect mind map. These visuals are the foundation that arc
will reuse.
