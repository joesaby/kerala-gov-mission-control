import type { StatusPaper } from "./types.ts";

/**
 * Long-form economic/fiscal reports tabled in the Assembly, rendered as a
 * human-friendly digest at /economy (see routes/economy/index.tsx).
 *
 * SOURCE — "Kerala's Fiscal Health: A Status Report" (16th KLA), the new
 * government's fiscal baseline. Published in English and Malayalam by the
 * Kerala Legislative Assembly (niyamasabha.org). Every figure below is drawn
 * from the report's Executive Summary and chapters; the original PDFs are
 * linked in `sources` so each number is checkable.
 *
 * BASELINE-AS-SCORECARD — the report exists to be measured against over the
 * five-year term. Each vital carries a `baseline` now; when a newer budget or
 * set of actuals lands, fill `latest` / `latestPeriod` and the page renders the
 * delta automatically. Do NOT overwrite the baseline.
 *
 * BILINGUAL — Malayalam is provided only for the title and the short, standard
 * fiscal labels we can verify. The long prose (summary, finding/lever detail)
 * is left untranslated and the record is marked `dataStatus: "tbd"` pending a
 * verified Malayalam pass from the official ML edition — the ML PDF extracts in
 * visual order, so it must be reordered and checked by hand, never guessed.
 */
export const STATUS_PAPERS: StatusPaper[] = [
  {
    id: "statuspaper.16kla-fiscal-health",
    title: "Kerala's Fiscal Health 2026 — A Status Report",
    titleMl: "കേരളത്തിന്റെ സാമ്പത്തിക ആരോഗ്യം 2026 — ഒരു തൽസ്ഥിതി റിപ്പോർട്ട്",
    subtitle:
      "The new government's fiscal baseline, tabled before the 16th Kerala Legislative Assembly",
    subtitleMl:
      "പതിനാറാം കേരള നിയമസഭയ്ക്ക് മുന്നിൽ സമർപ്പിച്ച, പുതിയ സർക്കാരിന്റെ ധനകാര്യ അടിസ്ഥാന വിവരങ്ങൾ.",
    term: "16kla",
    // Exact tabling date not printed in the report; approximated to the start
    // of the 16th KLA term. Verify against the Assembly bulletin (dataStatus tbd).
    tabledOn: "2026-06-01",
    summary:
      "Published at the start of the government's term, this report is a candid, " +
      "evidence-based picture of what Kerala truly receives, spends and owes — a look " +
      "behind the veil of the annual budget. It is a documented baseline the Legislature, " +
      "media and public can measure the next five years against. Kerala's social " +
      "achievements remain exceptional; the challenge is whether the State's finances can " +
      "sustain them.",
    summaryMl:
      "സർക്കാരിന്റെ കാലാവധിയുടെ തുടക്കത്തിൽ പ്രസിദ്ധീകരിച്ച ഈ റിപ്പോർട്ട്, കേരളത്തിന് യഥാർത്ഥത്തിൽ ലഭിക്കുന്നതും ചെലവഴിക്കുന്നതും കടപ്പെട്ടിരിക്കുന്നതുമായ കണക്കുകളുടെ വ്യക്തമായ ചിത്രം നൽകുന്നു. വാർഷിക ബജറ്റിന് പിന്നിലെ യഥാർത്ഥ വിവരങ്ങളിലേക്കുള്ള ഒരു തിരിഞ്ഞുനോട്ടമാണിത്. വരും അഞ്ച് വർഷങ്ങളിൽ നിയമസഭയ്ക്കും മാധ്യമങ്ങൾക്കും പൊതുജനങ്ങൾക്കും അളക്കാനും വിലയിരുത്താനുമുള്ള ഒരു അടിസ്ഥാനരേഖയാണിത്. കേരളത്തിന്റെ സാമൂഹിക നേട്ടങ്ങൾ അസാധാരണമായി തുടരുന്നു; എന്നാൽ ഇവ നിലനിർത്താൻ സംസ്ഥാനത്തിന്റെ സാമ്പത്തിക വ്യവസ്ഥയ്ക്ക് സാധിക്കുമോ എന്നതാണ് പ്രധാന വെല്ലുവിളി.",
    vitals: [
      {
        key: "debt-gsdp",
        label: "Debt to GSDP",
        labelMl: "കടം – ജിഎസ്‌ഡിപി അനുപാതം",
        baseline: 33.2,
        baselineDisplay: "33.2%",
        period: "2025-26 RE",
        unit: "of GSDP",
        unitMl: "ജിഎസ്‌ഡിപിയുടെ",
        direction: "lower-better",
        status: "warning",
        note: "Peaked at 38.5% in 2020-21; still over the FRBM ceiling (≤32%).",
      },
      {
        key: "committed-exp",
        label: "Committed expenditure",
        labelMl: "പ്രതിജ്ഞാബദ്ധ ചെലവ്",
        baseline: 77,
        baselineDisplay: "77%",
        period: "2025-26",
        unit: "of total revenue",
        unitMl: "ആകെ വരുമാനത്തിന്റെ",
        direction: "lower-better",
        status: "critical",
        note:
          "Salary, pension and interest take roughly three-fourths of all receipts.",
      },
      {
        key: "interest",
        label: "Interest payments",
        labelMl: "പലിശ അടവ്",
        baseline: 20.9,
        baselineDisplay: "20.9%",
        period: "2025-26",
        unit: "of total revenue",
        unitMl: "ആകെ വരുമാനത്തിന്റെ",
        direction: "lower-better",
        status: "critical",
        note: "About ₹1 in every ₹5 of revenue services past debt.",
      },
      {
        key: "capex",
        label: "Capital expenditure",
        labelMl: "മൂലധനച്ചെലവ്",
        baseline: 1.3,
        baselineDisplay: "1.3%",
        period: "2025-26",
        unit: "of GSDP",
        unitMl: "ജിഎസ്‌ഡിപിയുടെ",
        direction: "higher-better",
        status: "critical",
        note:
          "Among the lowest of all Indian states — too little is invested to grow.",
      },
    ],
    findings: [
      {
        key: "arrears",
        heading: "Inherited payment arrears",
        stat: "≥ ₹48,733 cr",
        severity: "critical",
        chapter: 2,
        detail:
          "Obligations already incurred and legally due, but undischarged when the new " +
          "government took office: ₹21,670 cr of Dearness Allowance arrears, ₹14,387 cr of " +
          "Dearness Relief, and ₹3,431 cr owed to banks and contractors on bill discounting. " +
          "With other deferred payments the total is not less than ₹48,733 cr — almost as " +
          "large as Kerala's entire net annual borrowing.",
        chart: {
          kind: "burndown",
          unit: "₹ crore",
          unitMl: "₹ കോടി",
          target: 0,
          targetLabel: "cleared",
          source:
            "Status Report, Table 2.7 (Finance Dept data, as on 31 Mar 2026)",
          points: [
            { year: 2026, value: 48733, kind: "actual" },
          ],
        },
      },
      {
        key: "treasury",
        heading: "The treasury runs on RBI advances",
        stat: "262 days",
        severity: "critical",
        chapter: 2,
        detail:
          "In 2025 the State was on RBI Ways & Means Advances for 262 days and on Overdraft " +
          "for 84 days — against a historical norm of about 18 days a year. When inflows fall " +
          "short of outflows it leans on the RBI's three-tier support ladder — Special Drawing " +
          "Facility, then Ways & Means Advances, then Overdraft — each costlier than the last.",
        chart: {
          kind: "histogram",
          unit: "days in WMA / year",
          unitMl: "WMA ദിവസങ്ങൾ / വർഷം",
          source:
            "Status Report, Table 2.6 (Treasury Directorate; RBI records)",
          points: [
            { year: 2017, value: 25, kind: "actual" },
            { year: 2018, value: 50, kind: "actual" },
            { year: 2019, value: 67, kind: "actual" },
            { year: 2020, value: 234, kind: "actual", note: "COVID-19" },
            { year: 2021, value: 195, kind: "actual" },
            { year: 2022, value: 110, kind: "actual" },
            { year: 2023, value: 54, kind: "actual" },
            { year: 2024, value: 125, kind: "actual" },
            { year: 2025, value: 262, kind: "actual", note: "worst on record" },
            { year: 2026, value: 145, kind: "actual" },
          ],
        },
      },
      {
        key: "debt",
        heading: "A heavy stock of outstanding liabilities",
        stat: "₹5.07 lakh cr",
        severity: "warning",
        chapter: 3,
        detail:
          "Total outstanding liabilities are about ₹5.07 lakh crore. The cushions that masked " +
          "the strain — GST compensation and substantial Revenue Deficit grants — have both " +
          "ended, and the XVI Finance Commission has taken a stringent line on the deficit.",
        chart: {
          kind: "histogram",
          unit: "debt, % of GSDP",
          unitMl: "കടം, ജിഎസ്‌ഡിപിയുടെ %",
          target: 32.0,
          targetLabel: "FRBM ceiling",
          source: "Status Report, Table 3.1b (Accounts; Budget in Brief)",
          points: [
            { year: 2017, value: 29.37, kind: "actual" },
            { year: 2018, value: 30.04, kind: "actual" },
            { year: 2019, value: 30.4, kind: "actual" },
            { year: 2020, value: 32.02, kind: "actual" },
            { year: 2021, value: 38.51, kind: "actual", note: "COVID-19 peak" },
            { year: 2022, value: 35.92, kind: "actual" },
            { year: 2023, value: 34.62, kind: "actual" },
            { year: 2024, value: 34.29, kind: "actual" },
            { year: 2025, value: 34.15, kind: "actual" },
            { year: 2026, value: 33.22, kind: "actual", note: "2025-26 RE" },
          ],
        },
      },
      {
        key: "kiifb",
        heading: "KIIFB's debt is effectively State debt",
        stat: "₹21,000 cr",
        severity: "critical",
        chapter: 4,
        detail:
          "KIIFB carries roughly ₹21,000 cr of unmet loan liability whose repayment falls on " +
          "the State, with about ₹35,000 cr of approved projects still to be funded. The C&AG " +
          "found its borrowings are effectively State debt, and it borrows 1–1.5 percentage " +
          "points dearer than the government itself. Three districts absorbed nearly half of " +
          "all approved spending.",
        chart: {
          kind: "burndown",
          unit: "₹ crore",
          unitMl: "₹ കോടി",
          target: 0,
          targetLabel: "settled",
          source:
            "Status Report, Ch. 4 (KIIFB inflows/outflows as on 31 Mar 2026)",
          points: [
            { year: 2026, value: 21000, kind: "actual" },
          ],
        },
      },
      {
        key: "pse",
        heading: "Public sector enterprises drain the budget",
        stat: "₹78,069 cr loss",
        severity: "critical",
        chapter: 5,
        detail:
          "Kerala runs the largest number of public sector enterprises of any state — 132 " +
          "active. Their accumulated losses climbed from ₹42,930 cr in 2021-22 to a peak of " +
          "₹78,069 cr in 2023-24 (₹72,851 cr in 2024-25); in 2024-25 KSRTC, KSSPL and KWA " +
          "alone accounted for 72% of the net loss.",
        chart: {
          kind: "histogram",
          unit: "accumulated loss, ₹ crore",
          unitMl: "സഞ്ചിത നഷ്ടം, ₹ കോടി",
          source:
            "Status Report, Table 5.7 (Review of Public Enterprises in Kerala)",
          points: [
            { year: 2022, value: 42930, kind: "actual" },
            { year: 2023, value: 54475, kind: "actual" },
            { year: 2024, value: 78069, kind: "actual" },
            { year: 2025, value: 72851, kind: "actual" },
          ],
        },
      },
      {
        key: "development",
        heading: "Development spending is being squeezed",
        stat: "9.24% → 3.85%",
        severity: "warning",
        chapter: 6,
        detail:
          "Plan (development) expenditure has slipped below 18% of total spending by 2025-26 " +
          "RE. The share going to the welfare of SC/ST/OBC and minorities collapsed from 9.24% " +
          "of plan spend in 2017-18 to 3.85% in 2025-26 RE — the cut has fallen hardest on the " +
          "marginalised.",
        chart: {
          kind: "histogram",
          unit: "SC/ST/OBC welfare, % of plan",
          unitMl: "എസ്‌സി/എസ്‌ടി/ഒബിസി ക്ഷേമം, പ്ലാനിന്റെ %",
          source: "Status Report, Table 6.5 (Budget in Brief)",
          points: [
            { year: 2018, value: 9.24, kind: "actual" },
            { year: 2019, value: 9.52, kind: "actual" },
            { year: 2020, value: 7.05, kind: "actual" },
            { year: 2021, value: 6.87, kind: "actual" },
            { year: 2022, value: 6.04, kind: "actual" },
            { year: 2023, value: 6.01, kind: "actual" },
            { year: 2024, value: 5.68, kind: "actual" },
            { year: 2025, value: 5.28, kind: "actual" },
            { year: 2026, value: 3.85, kind: "actual", note: "2025-26 RE" },
          ],
        },
      },
      {
        key: "transfers",
        heading: "A looming central-transfer shortfall",
        stat: "~₹20,000 cr",
        severity: "warning",
        chapter: 3,
        detail:
          "2026-27 is a transition year between Finance Commission awards. Central transfers " +
          "are expected to fall short by around ₹20,000 cr, which could shrink the plan size " +
          "sharply.",
      },
    ],
    levers: [
      {
        key: "growth",
        heading: "Grow the economy — don't just cut",
        horizon: "structural",
        adoption: "not-started",
        detail:
          "There is a limit to how far belt-tightening can go. The durable fix is growth: " +
          "resolutely encourage private and cooperative investment, let local governments raise " +
          "funds from the market (outside off-budget limits), and open the power sector to " +
          "private investment so sunrise sectors have plentiful power.",
      },
      {
        key: "kiifb",
        heading: "Bring KIIFB back under budgetary control",
        horizon: "immediate",
        adoption: "go-issued",
        goIds: ["go.2026-fin-42"],
        detail:
          "Place KIIFB under the administrative and Finance Department budget, subject it to an " +
          "immediate C&AG performance audit, and take an early call on its future — while " +
          "retaining genuinely useful units like the Institutional Finance Group (for local-body " +
          "bonds) and the KIIFCON consultancy.",
      },
      {
        key: "pse",
        heading: "Turn around or exit loss-making PSEs",
        horizon: "structural",
        adoption: "not-started",
        detail:
          "Commission studies to make KSEBL, KWA and KSRTC efficient (Tamil Nadu's transport " +
          "revamp is a model), give utility chiefs 3–5 year tenures, wind up chronic loss-makers, " +
          "monetise unused assets, and allow private participation in the rest. Shift from " +
          "production-based to consumption-based subsidies.",
      },
      {
        key: "committed",
        heading: "Rein in committed expenditure",
        horizon: "immediate",
        adoption: "not-started",
        detail:
          "With about 80% of resources going to salaries, pensions and interest, hard political " +
          "choices are due. Raising the retirement age saves roughly ₹6,000 cr for every year of " +
          "increase, and pay commissions could move to a ten-year cycle, as in the Centre.",
      },
      {
        key: "jobs",
        heading: "Create jobs for educated youth",
        horizon: "structural",
        adoption: "not-started",
        detail:
          "Reform land and labour laws, build reasonably priced industrial infrastructure, expand " +
          "IT/AI services and tourism, strengthen the coastal economy, and open access to private " +
          "and foreign universities — making higher education the next hub of Kerala's growth.",
      },
      {
        key: "coop",
        heading: "Put the cooperative sector to work",
        horizon: "structural",
        adoption: "not-started",
        detail:
          "Channel the cooperative engine into productive activity: primary agricultural credit " +
          "societies hold a credit base of about ₹1.3 lakh crore and the Kerala Bank a comparable " +
          "volume of business — deployable through local governments for employment-generating " +
          "investment.",
      },
      {
        key: "governance",
        heading: "Modernise how government runs",
        horizon: "immediate",
        adoption: "not-started",
        detail:
          "Restructure the State Planning Board as a think-tank and project monitor, introduce " +
          "performance management linked to the budget, move welfare pensions to Aadhaar-linked " +
          "direct benefit transfer, complete real digitalisation within a fixed window, and " +
          "coordinate with peer states to reopen Centre–State fiscal dialogue.",
      },
    ],
    sources: [
      {
        lang: "en",
        label: "Status Report — full PDF (English)",
        url:
          "http://www.niyamasabha.org/codes/16kla/Kerala_Status_Paper_consolidated%20Eng.pdf",
      },
      {
        lang: "ml",
        label: "Status Report — full PDF (Malayalam)",
        labelMl: "തൽസ്ഥിതി റിപ്പോർട്ട് — പൂർണ്ണ പിഡിഎഫ് (മലയാളം)",
        url:
          "http://www.niyamasabha.org/codes/16kla/Kerala_Status_Paper_consolidated%20Mal.pdf",
      },
    ],
    meta: {
      publishedBy: "Finance Department, Government of Kerala",
      source: "Kerala Legislative Assembly (niyamasabha.org)",
      retrievedAt: "2026-06-04T00:00:00+05:30",
    },
    // Malayalam prose translation pending verification against the official ML
    // edition; English digest is complete and sourced.
    translationStatus: "machine-draft",
    dataStatus: "tbd",
  },
];
