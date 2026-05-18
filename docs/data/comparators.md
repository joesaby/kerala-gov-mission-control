# Comparator & benchmark sources

Every KPI tile shows comparators (All-India avg, peer state, target).
These sources standardise those benchmark values so the dashboard never
makes up the "vs national" line.

---

## NITI Aayog — SDG India Index

- **URL:** https://sdgindiaindex.niti.gov.in
- **What it provides:** 16-SDG composite + per-indicator state scores
  with all-India median and front-runner thresholds.
- **Feeds:** Cross-domain comparators on *every* KPI that maps to an SDG.
- **Format:** HTML dashboard + downloadable Excel report.
- **Update cadence:** ~Annual.
- **Licence:** Government Open Data.
- **Sync notes:** Use the spreadsheet — it has clean state-rows-by-target
  layout.

## NITI Aayog — School Education Quality Index, Health Index, Export
Preparedness, Innovation Index

- **URL:** https://www.niti.gov.in/index-portal
- **What it provides:** Topic-specific composite rankings.
- **Feeds:** `education.pgi-score`, `health.composite-score`,
  `livelihood.export-readiness`.

## RBI — Handbook of Statistics on Indian States

- **URL:** https://rbi.org.in/Scripts/AnnualPublications.aspx?head=Handbook+of+Statistics+on+Indian+States
- **What it provides:** Long-time-series macro & fiscal benchmarks.
- **Feeds:** Comparator values for all `fiscal` KPIs, plus deep history.
- **Format:** XLS.
- **Update cadence:** Annual.

## RBI — State Finances: A Study of Budgets

- **URL:** https://rbi.org.in/Scripts/AnnualPublications.aspx?head=State%20Finances%20%3A%20A%20Study%20of%20Budgets
- **Feeds:** Same as `fiscal.md`, but specifically as comparator source.

## MoSPI — National Statistical Office

- **URL:** https://mospi.gov.in
- **What it provides:** PLFS, NSS rounds, Periodic Industrial Statistics,
  CPI, IIP.
- **Feeds:** Comparator denominators across livelihood, fiscal, social.

## Census of India (2011, and SECC 2011)

- **URL:** https://censusindia.gov.in
- **What it provides:** Population denominator, literacy, SC/ST share,
  household amenities.
- **Feeds:** Per-capita denominators on *every* state-level KPI until
  Census 2027 fieldwork is released.
- **Sync notes:** Treat 2011 figures as "denominator of record" but flag
  staleness — interpolate using MoSPI annual population projections.

## PIB — Press Information Bureau

- **URL:** https://pib.gov.in
- **Feeds:** Cross-checked release of monthly indicators (GST, IIP, CPI).

## State Statistical Departments — Kerala Department of Economics &
Statistics

- **URL:** https://www.ecostat.kerala.gov.in
- **What it provides:** State-specific consumer price index, monthly
  prices, agricultural statistics, district-level demography.
- **Feeds:** Primary denominators for any Kerala-specific KPI.

## World Bank — DataBank (India)

- **URL:** https://databank.worldbank.org
- **Feeds:** International comparators (when a tile asks "vs ASEAN").

## OECD / WHO benchmarks (selective)

- **URL:** https://stats.oecd.org, https://www.who.int/data
- **Feeds:** Health domain (life expectancy, IMR) global comparators.

## NITI Aayog — NDAP (National Data & Analytics Platform)

- **URL:** https://ndap.niti.gov.in/
- **Owner:** NITI Aayog.
- **What it provides:** Standardised, merged datasets across ministries
  with a unified schema and on-platform merging/visualising.
- **Feeds:** Comparator backbone for cross-sector merges; easier UX than
  the raw data.gov.in catalogue.
- **Format:** Web download (no documented public API at time of check).
- **API auth:** None for public datasets.
- **Update cadence:** Per source dataset.
- **Licence:** GoI.
- **Sync notes:** GREEN for ad-hoc analyst use, AMBER for automated
  ingest (no API). Verified 2026-05-18.
- **Last verified:** 2026-05-18

## NITI for States — Data Catalogue

- **URL:** https://www.nitiforstates.gov.in/data-catalogue
- **Owner:** NITI Aayog.
- **What it provides:** State-comparable indicators (aggregated).
- **Feeds:** Quick cross-state comparator lookup for KPIs without a
  better source.
- **Format:** HTML + downloadable per dataset.
- **API auth:** None.
- **Update cadence:** Per dataset.
- **Licence:** GoI.
- **Last verified:** 2026-05-18

## SDG India Index — 2023-24 PDF + mirror

- **URL (PDF):** https://www.niti.gov.in/sites/default/files/2024-07/SDG_India_Index_2023-24.pdf
- **Mirror (CSV):** https://dataful.in/datasets/18700/
- **Owner:** NITI Aayog (with UN India).
- **What it provides:** Goal-wise + composite state scores for all 16 SDGs;
  the Dataful mirror exposes the underlying tables as CSV.
- **Feeds:** `comparators[]` on every SDG-aligned KPI; supplements the
  SDG India Index dashboard entry above.
- **Format:** PDF (canonical) + CSV (mirror).
- **API auth:** Dataful: free registration.
- **Update cadence:** ~Annual.
- **Licence:** GoI; Dataful republishes with attribution.
- **Sync notes:** Use the Dataful CSV mirror for ingest; cite the NITI
  PDF as the source-of-record. Verified 2026-05-18.
- **Last verified:** 2026-05-18

## Aspirational Districts dashboard — caveat

- **URL:** https://championsofchange.gov.in/dashboard
- **Owner:** NITI Aayog (Aspirational Districts Programme).
- **What it provides:** Dashboards for 112 "backward" districts.
- **Feeds:** Cross-state comparator only.
- **Format:** Web.
- **Update cadence:** Continuous.
- **Licence:** GoI.
- **Sync notes:** **Caveat: Kerala has zero Aspirational Districts**, so
  this is **not directly useful for any Kerala KPI**. Cite only when
  showing a peer-state comparator. Verified 2026-05-18.
- **Last verified:** 2026-05-18

## Janaagraha — Annual Survey of India's City-Systems (ASICS)

- **URL:** https://www.janaagraha.org/wp-content/uploads/2024/02/ASICS-2023-data-book.pdf
- **Owner:** Janaagraha Centre for Citizenship and Democracy.
- **What it provides:** Urban-governance scoring across Indian states +
  cities — quality of laws, planning, finance, staffing, transparency.
  Covers Kerala.
- **Feeds:** Urban-governance comparator on `trust.*` and
  `delivery.*` KPIs; benchmark for the Tier-1 "Service Clock".
- **Format:** PDF data book.
- **API auth:** None.
- **Update cadence:** Annual / biennial (2023 latest).
- **Licence:** Janaagraha — free to cite with attribution.
- **Sync notes:** AMBER — PDF table extraction. Verified 2026-05-18.
- **Last verified:** 2026-05-18

## SHRUG — Development Data Lab

- **URL:** https://www.devdatalab.org/shrug
- **Owner:** Development Data Lab.
- **What it provides:** Village-level socio-economic panel (Census
  1991-2011, Economic Census 1990-2013, night-lights, firms).
- **Feeds:** Baseline for the **"My Panchayat"** dashboard — only
  available village-level panel covering Kerala.
- **Format:** Stata / CSV.
- **API auth:** Free registration.
- **Update cadence:** Periodic (most series end ~2013).
- **Licence:** CC-BY-NC-SA 4.0.
- **Sync notes:** AMBER on freshness — excellent panel but **ends ~2013**;
  use for historical baselines, not current values. Verified 2026-05-18.
- **Last verified:** 2026-05-18

## Accountability Initiative — PAISA budget briefs

- **URL:** https://accountabilityindia.in/reports/
- **Owner:** Accountability Initiative (Centre for Policy Research).
- **What it provides:** Annual Budget Briefs / PAISA expenditure tracking
  on each major centrally sponsored scheme — PMAY, MGNREGA, ICDS, SSA —
  with state allocations and physical-financial progress.
- **Feeds:** Scheme-side of the **"Where My Money Goes"** Tier-1
  dashboard; comparator for `livelihood.scheme-coverage` KPIs.
- **Format:** PDF.
- **API auth:** None.
- **Update cadence:** Annual.
- **Licence:** CC (varies per brief).
- **Sync notes:** AMBER — PDF, but consistent layout year-over-year per
  scheme. Verified 2026-05-18.
- **Last verified:** 2026-05-18
