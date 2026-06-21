# Spec — Budget report (the three-document arc, correlated to the economy)

Status: implemented · Term: 16th KLA · Routes: `/economy` (fiscal-status
landing), `/economy/white-paper`, `/economy/budget/[id]` — all inside a
responsive `EconomyShell` sidebar (sibling of
[economy-status-paper.md](./economy-status-paper.md); reuses
[budget-hero-visuals.md](./budget-hero-visuals.md))

Presents Kerala's 2026-27 budget **as a story, not a ledger** — and wires it
into the white paper so the `/economy` baseline scorecard comes alive.

## The core idea

A budget total is meaningless to a citizen. Two things are not: **what changed**
(LDF promise → UDF revision) and **why** (the white paper). So the page tells
one story in three beats:

> **Promise** (LDF, 29 Jan) → **Reckoning** (White Paper, 4 Jun) → **Response**
> (UDF revised, 19 Jun)

The white paper is the **hinge**: the LDF banked on central transfers that
didn't materialise (~₹20,500 cr hole); the UDF cut the plan to match reality.

## Correlation to the economy (`/economy`)

The `StatusPaper` model already anticipates this: every `FiscalVital` has an
empty `latest`/`latestPeriod`, and every `RecoveryLever` an `adoption` status,
explicitly "to be filled when the next budget lands." **The UDF budget is that
budget.** Building this report therefore also:

1. Fills `latest` on the white paper vitals (debt/GSDP, committed exp, interest,
   capex) → the `/economy` gauges render baseline → latest deltas.
2. Appends an `actual` point to relevant `FindingChart`s (e.g. the
   central-transfer shortfall confirmed at ₹20,500 cr).
3. Bumps `adoption` + `goIds` on levers the budget acts on (e.g. KIIFB control,
   committed-expenditure restraint, growth measures).

This closes the loop: the budget is **graded against the white paper**, and the
white paper page reflects the budget's effect.

## Neutrality

Same standard as `/economy`: figures are rendered with source citations, not
editorial voice. The LDF↔UDF comparison is framed as "projection vs revised
actuals", not praise/blame. Both governments' documents are linked. Dissenting
analyses (People's Democracy, The Wire) are acknowledged in sources.

## Data model (`data/types.ts`)

A new `Budget` type. Reuses `RupeeSegment` and `StatusSource` from the status
paper work.

```ts
export interface BudgetVital {
  key: string; // "rev-receipts", "plan-outlay", "rev-deficit"...
  label: string;
  labelMl?: string;
  value: number; // ₹ crore (or % where unit says so)
  display: string; // "₹1,69,646 cr"
  unit: string;
  unitMl?: string;
  /** Same metric in the budget being compared against (LDF original). */
  comparedValue?: number;
  comparedDisplay?: string;
  direction?: "lower-better" | "higher-better";
  source: string;
}

export interface SectorAllocation {
  key: string;
  label: string;
  labelMl?: string;
  amountCr: number; // ₹ crore
  note?: string;
  noteMl?: string;
  source: string;
}

export interface BudgetScheme {
  key: string;
  heading: string;
  headingMl?: string;
  detail: string;
  detailMl?: string;
  amount?: string; // "₹25 lakh/family", "₹400 cr"
  /** Which document announced it. */
  origin: "ldf" | "udf";
  /** Optional FK → GovernmentOrder evidencing it has started. */
  goIds?: string[];
}

export interface TaxMeasure {
  key: string;
  heading: string;
  headingMl?: string;
  detail: string;
  detailMl?: string;
  kind: "relief" | "hike" | "settlement";
}

/** A budget grading itself against a white-paper item. */
export interface WhitePaperVerdict {
  key: string; // matches a StatusFinding/RecoveryLever key
  refType: "vital" | "finding" | "lever";
  verdict: "acted" | "partial" | "not-addressed" | "worsened";
  note: string;
  noteMl?: string;
}

export interface Budget {
  id: string; // budget.2026-27-udf, budget.2026-27-ldf
  fy: string; // "2026-27"
  variant: "original" | "revised";
  government: "LDF" | "UDF";
  presentedOn: string; // ISO
  presentedBy: string; // "V.D. Satheesan (CM, Finance)"
  title: string;
  titleMl?: string;
  summary: string;
  summaryMl?: string;
  headlines: BudgetVital[];
  rupeeIn?: RupeeSegment[]; // where ₹100 comes from
  rupeeOut?: RupeeSegment[]; // where ₹100 goes
  allocations: SectorAllocation[];
  schemes: BudgetScheme[];
  taxes: TaxMeasure[];
  /** The white-paper report card. */
  verdicts?: WhitePaperVerdict[];
  /** The budget this one revises/compares against (LDF original). */
  vsBudgetId?: string;
  sources: StatusSource[];
  translationStatus?: TranslationStatus;
  dataStatus: "verified" | "unverified" | "tbd";
}
```

Persistence: `["budget", id]` + index `["budget_by_fy", fy, id]`. Seeded from
`data/budgets.ts`. Accessors `listBudgets()`, `getBudget(id)`,
`listBudgetsByFy(fy)`. **Bump `SEED_VERSION`.**

## Page (`routes/economy/budget.tsx`)

1. **The arc** — three dated step-cards: Promise / Reckoning / Response. The
   middle one links to `/economy` (the white paper).
2. **What changed** — `headlines` rendered as paired LDF→UDF rows with deltas;
   the ₹20,500 cr central-grant wedge highlighted, linking to the white paper's
   transfer-shortfall finding.
3. **Where ₹100 comes from / goes** — two `RupeeFlow`s (in / out).
4. **Graded against the white paper** — `verdicts` as a report-card list (acted
   / partial / not-addressed / worsened), each linking to its `/economy` item.
5. **What it means for you** — `schemes` (grouped LDF vs UDF) + `taxes` (relief
   / hike / settlement), plain language.
6. **Sources** — both budget speeches + white paper PDFs.

Navigation: linked from `/economy` (a "See the budget →" card) and the home
"Explore" cards.

## Numbers (from research; ⚠ = confirm against primary PDF before shipping)

**LDF original (29 Jan, K.N. Balagopal):** rev receipts ₹1,82,972.10 cr · plan
outlay ₹35,750 cr · revenue deficit ₹34,587 cr (2.12%) · fiscal deficit ₹55,420
cr (3.40%) · capital outlay ₹19,451.16 cr. Schemes: free UG→degree education,
welfare pension ₹2,000/mo (₹14,500 cr), Sthree Suraksha (₹3,820 cr), elderly
budget.

**UDF revised (19 Jun, V.D. Satheesan):** rev receipts ₹1,69,646.37 cr · revenue
expenditure ₹2,05,001.67 cr · revenue deficit ₹35,355.30 cr · plan outlay
₹30,370 cr · capex ≈1.3% GSDP. Schemes: Oommen Chandy Health Insurance (₹25
lakh/family), Mission Samudra (₹400 cr), Knowledge Valley (₹100 cr), Wayanad
Tribal University (₹50 cr), PWD ₹5,952 cr, Transport ₹1,578 cr. Taxes: 50% road
tax cut for private buses, EV tax relief, liquor tiered tax (120%/175%), stamp
duty OTS, free KSRTC travel for women.

**The wedge:** central-transfer shortfall ₹20,500 cr (16th FC ended Revenue
Deficit Grants; LDF had projected ₹14,138 cr that never came).

Sources: Niyamasabha budget speeches (EN/ML), CPPR analysis, Business Standard,
Onmanorama. ⚠ Sector allocation crore figures and the LDF↔UDF line-item deltas
should be reconciled against the primary budget PDFs (needs WebFetch) before the
record is marked `dataStatus: "verified"` — ship as `"tbd"` until then.

## Bilingual

Headline labels, vital/sector/scheme/tax headings, verdict labels ship verified
EN + ML (short standard terms). Long scheme/verdict prose left untranslated and
the record marked `dataStatus: "tbd"` pending a verified ML pass, per the
project's bilingual invariant.

## Build order

1. Types + `data/budgets.ts` (UDF revised first; LDF original as the compare
   baseline) + accessors + `SEED_VERSION` bump.
2. `routes/economy/budget.tsx` reusing `RupeeFlow`; new small components for the
   arc, the paired-comparison, and the report card.
3. Wire the correlation back into `data/status-papers.ts`: fill vitals `latest`,
   append the transfer-shortfall point, bump lever adoption.
4. Bilingual + `deno task check` + `check:ml` + visual verify.
