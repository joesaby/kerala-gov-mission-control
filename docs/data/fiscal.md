# Fiscal & budget sources

Feeds the `fiscal` civic domain — debt/GSDP, revenue deficit, capex, KIIFB
borrowings, tax devolution, GST collections, FRBM compliance.

---

## Kerala Finance Department — Budget at a Glance

- **URL:** https://finance.kerala.gov.in/budget.jsp
- **Owner:** Finance Department, Government of Kerala.
- **What it provides:** Annual budget speech, Budget at a Glance, demands
  for grants, Receipts Budget, FRBM disclosures.
- **Feeds:** `fiscal.revenue-deficit`, `fiscal.fiscal-deficit`,
  `fiscal.capex-share`, KPI annual targets, `Department` budget allocations.
- **Format:** PDF (some XLS supplements).
- **API auth:** None.
- **Update cadence:** Annual (February/March), with supplementary demands
  mid-year.
- **Licence:** Public document; reuse with attribution.
- **Sync notes:** PDFs are mostly table-structured — `tabula` /
  `pdfplumber` will work. The Receipts Budget Statement is the canonical
  source for revenue projections.

## Kerala Economic Review — State Planning Board

- **URL:** https://spb.kerala.gov.in/economic-review
- **Owner:** Kerala State Planning Board.
- **What it provides:** Annual GSDP, sectoral growth, fiscal indicators,
  social-sector spending, district-level highlights.
- **Feeds:** GSDP denominator for any % KPI, social-sector spend ratios,
  district comparators.
- **Format:** PDF + downloadable Excel appendix tables.
- **Update cadence:** Annual (released alongside the budget).
- **Licence:** Public document.

## KIIFB — Kerala Infrastructure Investment Fund Board

- **URL:** https://kiifb.org/projects/ and https://kiifb.org/financials/
- **Owner:** KIIFB.
- **What it provides:** Off-budget capital borrowings, project list with
  sanctioned amount and progress %, audited financial statements.
- **Feeds:** Off-budget debt component of `fiscal.debt-to-gsdp`; future
  "Where My Money Goes" project tracker (Tier-1 roadmap).
- **Format:** HTML project pages + PDF annual reports.
- **Update cadence:** Quarterly board meeting reports; annual audited
  accounts.
- **Sync notes:** Project list is paginated; iterate `?page=N`. Store the
  sanction-amount and progress-percent as a time series per project.

## CAG — Comptroller and Auditor General of India

- **URL:** https://cag.gov.in/ag2/kerala/en/audit-report?sector%5B0%5D=27
- **What it provides:** Annual State Finances Audit Report, performance
  audits, compliance audits.
- **Feeds:** Authoritative `fiscal.debt-to-gsdp` and `fiscal.revenue-deficit`
  values (verified post-fact, after budget revision).
- **Format:** PDF.
- **Update cadence:** Annual, with a ~18-month lag after the fiscal year
  ends (latest at time of check: Report No. 3 of 2025, covering FY 2023-24,
  published 9 Oct 2025).
- **Licence:** Public record.
- **Sync notes:** AMBER — PDF only, no machine-readable export. The
  ~18-month lag means a "quarterly" KPI cadence is **not achievable** from
  CAG alone; annualise these KPIs and use RBI Handbook + budget projections
  for intra-year movement. CAG numbers supersede budget projections — flag
  KPI values as `provisional` until CAG verification lands, then `actual`.
  Verified 2026-05-18 — landing-page URL updated to the sector-filtered view.
- **Last verified:** 2026-05-18

## Open Budgets India — Kerala

- **URL:** https://openbudgetsindia.org/organization/about/kerala
- **Owner:** Centre for Budget and Governance Accountability (CBGA) +
  DataMeet collaboration.
- **What it provides:** Mirror of Kerala state budget documents across
  multiple years (Budget at a Glance, demands for grants, receipts).
- **Feeds:** Convenience mirror for `fiscal.revenue-deficit`,
  `fiscal.fiscal-deficit`, `fiscal.capex-share` ingestion.
- **Format:** PDF (per OBI's own FAQ, Kerala is one of 26 states where
  files are PDF-only — only Karnataka and Sikkim have CSV versions).
- **API auth:** None.
- **Update cadence:** Annual, mirrored within weeks of each budget release.
- **Licence:** CC BY 4.0 (re-publication licence; underlying GoK docs are
  public).
- **Sync notes:** Useful as a stable, versioned mirror of finance.kerala.gov.in
  PDFs which can themselves be slow/unreliable during budget season.
- **Last verified:** 2026-05-18

## AG Kerala — Monthly Civil Accounts

- **URL:** https://cag.gov.in/ae/kerala/en
- **Owner:** Office of the Principal Accountant General (A&E) Kerala.
- **What it provides:** Monthly Civil Accounts of the Government of
  Kerala (receipts + expenditure by Major Head, published on the 10th of
  the following month), plus annual Finance Accounts (Vol I & II) and
  Appropriation Accounts.
- **Feeds:** Sub-annual cadence for `fiscal.revenue-deficit`,
  `health.public-health-spend` (aggregate Major Head 2210 + 2211),
  social-sector spend ratios.
- **Format:** PDF.
- **API auth:** None.
- **Update cadence:** Monthly (Civil Accounts) + annual (Finance Accounts,
  ~12-month lag).
- **Licence:** Government of India.
- **Sync notes:** AMBER — PDF only, but the monthly cadence is genuinely
  the *only* sub-annual fiscal cadence the state publishes. Worth the
  scrape effort for any KPI that needs faster-than-annual fiscal updates.
- **Last verified:** 2026-05-18

## RBI — State Finances: A Study of Budgets

- **URL:** https://rbi.org.in/Scripts/AnnualPublications.aspx?head=State%20Finances%20%3A%20A%20Study%20of%20Budgets
- **Owner:** Reserve Bank of India.
- **What it provides:** Comparative state-level fiscal aggregates — debt,
  deficits, own-tax revenue, devolution, capex share — for all states.
- **Feeds:** `comparators[]` on every fiscal KPI (All-India avg, peer-state
  values for Tamil Nadu / Karnataka / etc.).
- **Format:** PDF + spreadsheet appendix.
- **Update cadence:** Annual.
- **Licence:** Public document with attribution.
- **Sync notes:** Appendix Excel tables are the right ingest unit — they
  ship clean rows per state, year, indicator.

## RBI — Handbook of Statistics on Indian States

- **URL:** https://rbi.org.in/Scripts/AnnualPublications.aspx?head=Handbook+of+Statistics+on+Indian+States
- **What it provides:** Long time-series of state-level fiscal, banking,
  demographic, and infrastructure indicators (1980–present for many).
- **Feeds:** `Kpi.timeSeries` historical backfill for any fiscal/macro
  KPI; comparator values.
- **Format:** XLS workbook, well-structured.
- **Update cadence:** Annual.
- **Licence:** Public document.
- **Sync notes:** Best source for "what was Kerala's debt-to-GSDP in 2015"
  type backfills.

## GST Council — State-wise GST collections

- **URL:** https://www.cbic.gov.in/entities/gst (monthly PIB releases)
- **Also:** https://www.gstcouncil.gov.in
- **What it provides:** Monthly state-wise GST collection by component
  (CGST, SGST, IGST, Cess).
- **Feeds:** Monthly fiscal pulse KPIs (own-tax revenue trend).
- **Format:** PIB press release HTML + a CSV-friendly table.
- **Update cadence:** Monthly.
- **Licence:** Public press release.

## Finance Commission of India

- **URL:** https://fincomindia.nic.in
- **What it provides:** Devolution formulas, grants-in-aid recommendations,
  state-specific allocations.
- **Feeds:** `fiscal.devolution-share` denominator; explains shifts in
  central transfers.
- **Update cadence:** Every 5 years (currently 15th FC; 16th FC underway).
- **Licence:** Public document.

## PRS Legislative Research — State Budget Analysis

- **URL:** https://prsindia.org/budgets/states/kerala-budget-analysis-2025-26
- **What it provides:** Plain-English analysis of state budget with charts,
  comparator tables, and historical context.
- **Feeds:** Plain-language summaries for the "About this metric" panel;
  comparator values.
- **Format:** HTML + PDF.
- **Update cadence:** Annual, within weeks of the budget.
- **Licence:** CC BY 4.0 (with attribution).
- **Sync notes:** PRS is structured well for ingest — every state budget
  page has consistent sections. Highly recommended ingestion target.

## Open Government Data (OGD) Platform India

- **URL:** https://data.gov.in
- **What it provides:** Government-published datasets, including some
  fiscal indicators by state.
- **Feeds:** Backfill helper for specific KPIs.
- **Format:** CSV, XLS, JSON via API.
- **API auth:** Requires free API key.
- **Update cadence:** Varies per dataset.
- **Licence:** Government Open Data Licence – India (GODL).
- **Sync notes:** Quality varies — verify each dataset's `lastUpdated` and
  ownership.
