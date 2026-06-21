import type { Budget } from "./types.ts";

/**
 * State budgets, rendered as a story at /economy/budget and correlated to the
 * white paper at /economy. Source spec: docs/specs/budget-report.md.
 *
 * THE ARC — 2026-27 had two budgets across a change of government:
 *   • LDF original  (29 Jan 2026, K.N. Balagopal) — the outgoing plan.
 *   • White Paper   (4 Jun 2026) — the diagnosis (see data/status-papers.ts).
 *   • UDF revised   (19 Jun 2026, V.D. Satheesan) — the response.
 * The white paper is the hinge: the LDF banked on central transfers that did
 * not arrive (~₹20,500 cr hole); the UDF cut the plan to match reality.
 *
 * SOURCING — headline figures are from the budget speeches as reported by CPPR,
 * Business Standard and Onmanorama; primary-PDF line-item reconciliation is
 * pending, so both records are `dataStatus: "tbd"`. Sector allocation and
 * compare deltas must be verified against the Niyamasabha budget PDFs before
 * graduating to "verified". Long prose ML is machine-draft pending review.
 */
export const BUDGETS: Budget[] = [
  // ─── LDF original (the compare baseline) ──────────────────────────────────
  {
    id: "budget.2026-27-ldf",
    fy: "2026-27",
    variant: "original",
    government: "LDF",
    presentedOn: "2026-01-29",
    presentedBy: "K.N. Balagopal (Finance Minister)",
    title: "Kerala Budget 2026-27 — LDF (original)",
    titleMl: "കേരള ബജറ്റ് 2026-27 — എൽഡിഎഫ് (ആദ്യത്തേത്)",
    summary:
      "The outgoing LDF government's budget, presented two months before the " +
      "Assembly election. It projected central transfers nearly doubling to " +
      "about ₹68,000 cr — an assumption the white paper later judged overstated " +
      "by roughly ₹20,500 cr.",
    headlines: [
      {
        key: "rev-receipts",
        label: "Revenue receipts",
        labelMl: "റവന്യൂ വരവ്",
        value: 182972.1,
        display: "₹1,82,972 cr",
        unit: "₹ crore",
        unitMl: "₹ കോടി",
        direction: "higher-better",
        source: "Budget 2026-27 (LDF); CPPR analysis, p.16",
      },
      {
        key: "plan-outlay",
        label: "State plan outlay",
        labelMl: "പദ്ധതി അടങ്കൽ",
        value: 35750,
        display: "₹35,750 cr",
        unit: "₹ crore",
        unitMl: "₹ കോടി",
        direction: "higher-better",
        source: "Budget 2026-27 (LDF)",
      },
      {
        key: "revenue-deficit",
        label: "Revenue deficit",
        labelMl: "റവന്യൂ കമ്മി",
        value: 34587,
        display: "₹34,587 cr (2.12%)",
        unit: "₹ crore",
        unitMl: "₹ കോടി",
        direction: "lower-better",
        source: "Budget 2026-27 (LDF); CPPR analysis",
      },
      {
        key: "fiscal-deficit",
        label: "Fiscal deficit",
        labelMl: "ധനക്കമ്മി",
        value: 55420,
        display: "₹55,420 cr (3.40%)",
        unit: "₹ crore",
        unitMl: "₹ കോടി",
        direction: "lower-better",
        source: "Budget 2026-27 (LDF); CPPR analysis",
      },
      {
        key: "capital-outlay",
        label: "Capital outlay",
        labelMl: "മൂലധന ചെലവ്",
        value: 19451.16,
        display: "₹19,451 cr",
        unit: "₹ crore",
        unitMl: "₹ കോടി",
        direction: "higher-better",
        source: "Budget 2026-27 (LDF)",
      },
    ],
    allocations: [],
    schemes: [
      {
        key: "free-degree",
        heading: "Free degree-level education",
        headingMl: "സൗജന്യ ബിരുദ വിദ്യാഭ്യാസം",
        detail:
          "Extends free Arts & Science education from Plus-Two up to the degree " +
          "level for the first time.",
        origin: "ldf",
      },
      {
        key: "welfare-pension",
        heading: "Welfare pension raised to ₹2,000/month",
        headingMl: "ക്ഷേമ പെൻഷൻ ₹2,000 ആയി ഉയർത്തി",
        detail:
          "₹14,500 cr earmarked to raise the social-security pension to ₹2,000 " +
          "per recipient per month.",
        amount: "₹14,500 cr",
        origin: "ldf",
      },
      {
        key: "sthree-suraksha",
        heading: "Sthree Suraksha pension",
        headingMl: "സ്ത്രീ സുരക്ഷാ പെൻഷൻ",
        detail:
          "₹1,000/month for women aged 35-60 not covered by other social-" +
          "security nets; ₹3,820 cr provided.",
        amount: "₹3,820 cr",
        origin: "ldf",
      },
    ],
    taxes: [],
    sources: [
      {
        lang: "en",
        label: "Budget Speech 2026-27 (English) — Niyamasabha",
        url:
          "http://www.niyamasabha.org/codes/15kla/Session_16/Budget%20Speech%202026-27_English.pdf",
      },
    ],
    translationStatus: "machine-draft",
    dataStatus: "tbd",
  },

  // ─── UDF revised (the primary record the page leads with) ──────────────────
  {
    id: "budget.2026-27-udf",
    fy: "2026-27",
    variant: "revised",
    government: "UDF",
    presentedOn: "2026-06-19",
    presentedBy: "V.D. Satheesan (Chief Minister, Finance)",
    title: "Kerala Budget 2026-27 — UDF (revised)",
    titleMl: "കേരള ബജറ്റ് 2026-27 — യുഡിഎഫ് (പുതുക്കിയത്)",
    summary:
      "The incoming UDF government's revised budget, presented weeks after the " +
      "white paper. It revises revenue receipts down by about ₹13,000 cr and " +
      "cuts the state plan from ₹35,750 cr to ₹30,370 cr to absorb the central-" +
      "transfer shortfall, while launching new flagship schemes.",
    summaryMl:
      "ധവളപത്രത്തിന് ആഴ്ചകൾക്ക് ശേഷം പുതിയ യുഡിഎഫ് സർക്കാർ അവതരിപ്പിച്ച പുതുക്കിയ ബജറ്റ്. " +
      "കേന്ദ്ര വിഹിതത്തിലെ കുറവ് ഉൾക്കൊള്ളാൻ റവന്യൂ വരവ് ഏകദേശം ₹13,000 കോടി കുറച്ച്, " +
      "പദ്ധതി അടങ്കൽ ₹35,750 കോടിയിൽ നിന്ന് ₹30,370 കോടിയായി വെട്ടിക്കുറച്ചു.",
    headlines: [
      {
        key: "rev-receipts",
        label: "Revenue receipts",
        labelMl: "റവന്യൂ വരവ്",
        value: 169646.37,
        display: "₹1,69,646 cr",
        unit: "₹ crore",
        unitMl: "₹ കോടി",
        comparedValue: 182972.1,
        comparedDisplay: "₹1,82,972 cr",
        direction: "higher-better",
        source: "Revised Budget 2026-27 (UDF); Business Standard",
      },
      {
        key: "plan-outlay",
        label: "State plan outlay",
        labelMl: "പദ്ധതി അടങ്കൽ",
        value: 30370,
        display: "₹30,370 cr",
        unit: "₹ crore",
        unitMl: "₹ കോടി",
        comparedValue: 35750,
        comparedDisplay: "₹35,750 cr",
        direction: "higher-better",
        source: "Revised Budget 2026-27 (UDF)",
      },
      {
        key: "revenue-deficit",
        label: "Revenue deficit",
        labelMl: "റവന്യൂ കമ്മി",
        value: 35355.3,
        display: "₹35,355 cr",
        unit: "₹ crore",
        unitMl: "₹ കോടി",
        comparedValue: 34587,
        comparedDisplay: "₹34,587 cr",
        direction: "lower-better",
        source: "Revised Budget 2026-27 (UDF)",
      },
      {
        key: "transfer-shortfall",
        label: "Central-transfer shortfall",
        labelMl: "കേന്ദ്ര വിഹിതത്തിലെ കുറവ്",
        value: 20500,
        display: "₹20,500 cr",
        unit: "₹ crore",
        unitMl: "₹ കോടി",
        direction: "lower-better",
        source:
          "Revised Budget 2026-27 (UDF) / White Paper — 16th FC ended Revenue Deficit Grants",
      },
    ],
    // Where each ₹100 of revenue goes — the committed-expenditure frame,
    // consistent with the white-paper vitals (salaries+pensions 56.1, interest
    // 20.9). Salary:pension split by Budget 2026-27 amounts (₹57,558 cr :
    // ₹38,669 cr). See docs/specs/budget-hero-visuals.md.
    rupeeOut: [
      {
        key: "salaries",
        label: "Salaries",
        labelMl: "ശമ്പളം",
        paise: 33.6,
        severity: "critical",
        committed: true,
        source:
          "Budget 2026-27 salaries ₹57,558 cr; Status Report committed 77%",
      },
      {
        key: "pensions",
        label: "Pensions",
        labelMl: "പെൻഷൻ",
        paise: 22.5,
        severity: "critical",
        committed: true,
        source:
          "Budget 2026-27 pensions ₹38,669 cr; Status Report committed 77%",
      },
      {
        key: "interest",
        label: "Interest on debt",
        labelMl: "കടത്തിന്റെ പലിശ",
        paise: 20.9,
        severity: "critical",
        committed: true,
        source: "Status Report, Ch. 2 (interest = 20.9% of revenue)",
      },
      {
        key: "rest",
        label: "Left for everything else",
        labelMl: "ബാക്കിയെല്ലാത്തിനും",
        paise: 23,
        severity: "warning",
        committed: false,
        source: "Status Report, Ch. 2 (residual after committed expenditure)",
      },
    ],
    allocations: [
      {
        key: "pwd",
        label: "Public Works (PWD)",
        labelMl: "പൊതുമരാമത്ത് (പിഡബ്ല്യുഡി)",
        amountCr: 5952,
        source: "Revised Budget 2026-27 (UDF); Lokmat Times",
      },
      {
        key: "health",
        label: "Medical Care & Public Health",
        labelMl: "ആരോഗ്യം",
        amountCr: 2076.02,
        source: "Revised Budget 2026-27 (UDF)",
      },
      {
        key: "transport",
        label: "Transport",
        labelMl: "ഗതാഗതം",
        amountCr: 1578,
        source: "Revised Budget 2026-27 (UDF)",
      },
    ],
    schemes: [
      {
        key: "oommen-chandy-insurance",
        heading: "Oommen Chandy Health Insurance",
        headingMl: "ഉമ്മൻ ചാണ്ടി ആരോഗ്യ ഇൻഷുറൻസ്",
        detail:
          "New health-insurance cover of up to ₹25 lakh per family — the UDF's " +
          "flagship welfare announcement.",
        amount: "₹25 lakh/family",
        origin: "udf",
      },
      {
        key: "mission-samudra",
        heading: "Mission Samudra",
        headingMl: "മിഷൻ സമുദ്ര",
        detail:
          "A five-year coastal and maritime integration programme to develop the " +
          "blue economy.",
        amount: "₹400 cr",
        origin: "udf",
      },
      {
        key: "knowledge-valley",
        heading: "Knowledge Valley",
        headingMl: "നോളജ് വാലി",
        detail:
          "Higher-education initiative to attract foreign universities and build " +
          "a knowledge economy.",
        amount: "₹100 cr",
        origin: "udf",
      },
      {
        key: "wayanad-tribal-university",
        heading: "Wayanad Tribal University",
        headingMl: "വയനാട് ട്രൈബൽ സർവകലാശാല",
        detail: "A new tribal university for Wayanad.",
        amount: "₹50 cr",
        origin: "udf",
      },
    ],
    taxes: [
      {
        key: "bus-road-tax",
        heading: "50% road-tax cut for private buses",
        headingMl: "സ്വകാര്യ ബസുകൾക്ക് 50% വാഹന നികുതി ഇളവ്",
        detail: "Halves the motor-vehicle tax on private stage-carriage buses.",
        kind: "relief",
      },
      {
        key: "ev-relief",
        heading: "EV tax relief",
        headingMl: "ഇവി നികുതി ഇളവ്",
        detail: "Reduced motor-vehicle tax rates for electric vehicles.",
        kind: "relief",
      },
      {
        key: "ksrtc-women",
        heading: "Free KSRTC travel for women",
        headingMl: "സ്ത്രീകൾക്ക് സൗജന്യ കെഎസ്ആർടിസി യാത്ര",
        detail: "Free KSRTC bus travel for women — a UDF election commitment.",
        kind: "relief",
      },
      {
        key: "liquor-tax",
        heading: "Tiered liquor sales tax",
        headingMl: "മദ്യ വിൽപന നികുതി പുനഃക്രമീകരണം",
        detail:
          "New tiered tax on liquor by alcohol content (120% for 0.5-10% ABV; " +
          "175% for 10-20% ABV).",
        kind: "hike",
      },
      {
        key: "stamp-ots",
        heading: "Stamp-duty one-time settlement",
        headingMl: "സ്റ്റാമ്പ് ഡ്യൂട്ടി ഒറ്റത്തവണ തീർപ്പാക്കൽ",
        detail:
          "One-time settlement for ~1.46 lakh stamp-duty undervaluation cases " +
          "(about ₹703 cr in dues).",
        kind: "settlement",
      },
    ],
    verdicts: [
      {
        key: "transfers",
        refType: "finding",
        verdict: "acted",
        note:
          "The revised budget books the central-transfer shortfall the paper " +
          "warned of (₹20,500 cr) and cuts the plan outlay to match.",
        noteMl:
          "ധവളപത്രം മുന്നറിയിപ്പ് നൽകിയ കേന്ദ്ര വിഹിത കുറവ് (₹20,500 കോടി) പുതുക്കിയ ബജറ്റ് " +
          "ഉൾക്കൊള്ളുകയും അതിനനുസരിച്ച് പദ്ധതി അടങ്കൽ വെട്ടിക്കുറയ്ക്കുകയും ചെയ്തു.",
      },
      {
        key: "kiifb",
        refType: "lever",
        verdict: "acted",
        note:
          "A Government Order brings KIIFB under Finance Department budgetary " +
          "control, as the paper recommended.",
        noteMl: "ധവളപത്രം ശുപാർശ ചെയ്തതുപോലെ കിഫ്ബിയെ ധനവകുപ്പിന്റെ ബജറ്റ് നിയന്ത്രണത്തിൽ " +
          "കൊണ്ടുവരാൻ സർക്കാർ ഉത്തരവ് ഇറങ്ങി.",
      },
      {
        key: "growth",
        refType: "lever",
        verdict: "partial",
        note:
          "Mission Samudra and Knowledge Valley signal a growth orientation, but " +
          "the structural land/labour/power reforms the paper urged are pending.",
        noteMl: "മിഷൻ സമുദ്രയും നോളജ് വാലിയും വളർച്ചാ ദിശ കാണിക്കുന്നു; എന്നാൽ ധവളപത്രം " +
          "ആവശ്യപ്പെട്ട ഘടനാപരമായ പരിഷ്കാരങ്ങൾ ഇനിയും ബാക്കിയാണ്.",
      },
      {
        key: "committed-exp",
        refType: "vital",
        verdict: "not-addressed",
        note:
          "Committed expenditure stays at about 77% of revenue; no retirement-age " +
          "or pay-cycle change was announced.",
        noteMl:
          "പ്രതിജ്ഞാബദ്ധ ചെലവ് വരുമാനത്തിന്റെ ഏകദേശം 77% ആയി തുടരുന്നു; വിരമിക്കൽ പ്രായമോ " +
          "ശമ്പള പരിഷ്കരണ ചക്രമോ സംബന്ധിച്ച മാറ്റമൊന്നും പ്രഖ്യാപിച്ചില്ല.",
      },
      {
        key: "capex",
        refType: "vital",
        verdict: "worsened",
        note:
          "Capital expenditure remains near 1.3% of GSDP while the plan outlay is " +
          "cut by ₹5,380 cr — investment headroom narrows further.",
        noteMl:
          "പദ്ധതി അടങ്കൽ ₹5,380 കോടി കുറയുമ്പോൾ മൂലധനച്ചെലവ് ജിഎസ്‌ഡിപിയുടെ 1.3% നടുത്ത് " +
          "തുടരുന്നു — നിക്ഷേപ ഇടം കൂടുതൽ ചുരുങ്ങുന്നു.",
      },
    ],
    vsBudgetId: "budget.2026-27-ldf",
    sources: [
      {
        lang: "en",
        label: "Revised Budget 2026-27 — coverage (Business Standard)",
        url:
          "https://www.business-standard.com/india-news/revised-kerala-budget-combines-tax-relief-with-fiscal-consolidation-efforts-126061900433_1.html",
      },
      {
        lang: "en",
        label: "Budget portal — budget.kerala.gov.in",
        url: "https://budget.kerala.gov.in/",
      },
    ],
    translationStatus: "machine-draft",
    dataStatus: "tbd",
  },
];
