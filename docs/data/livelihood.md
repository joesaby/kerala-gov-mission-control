# Livelihood sources

Feeds the `livelihood` civic domain — employment, unemployment, wages,
poverty, social-security pensions, industry growth, tourism, agriculture
incomes, schemes.

---

## PLFS — Periodic Labour Force Survey

- **URL:** https://www.mospi.gov.in/sites/default/files/publication_reports/AnnualReport_PLFS2022-23N.pdf
- **Also:** https://mospi.gov.in (current PLFS report listing)
- **Owner:** Ministry of Statistics and Programme Implementation.
- **What it provides:** Labour force participation rate (LFPR), worker
  population ratio, unemployment rate (UR) — by state, rural/urban,
  gender, age group. Both annual and quarterly (urban-only) bulletins.
- **Feeds:** `livelihood.unemployment-rate`,
  `livelihood.female-lfpr`, plus a chain of contributing indicators.
- **Format:** PDF + downloadable unit-level micro-data via the MoSPI
  data portal.
- **Update cadence:** Quarterly (urban only, Current Weekly Status) +
  annual rural+urban (the latter comes with a ~one-year lag).
- **Licence:** Public document; micro-data has a citation requirement.
- **Sync notes:** PLFS state estimates appear in Annex tables in the
  annual PDF; quarterly UR is in PIB press release. **The quarterly
  bulletin covers urban areas only on CWS — annual rural+urban Kerala
  numbers lag by ~1 year.**

## PLFS Microdata — NADA

- **URL:** https://microdata.gov.in/NADA/index.php/catalog/PLFS
- **Owner:** MoSPI, hosted on the NADA microdata catalog.
- **What it provides:** Unit-level PLFS micro-data (households + workers)
  for every survey round, with full schedules.
- **Feeds:** Custom Kerala cuts for `livelihood.unemployment-rate`,
  `livelihood.female-lfpr`, gender-split analytics.
- **Format:** CSV / Stata (`.dta`) / DBF.
- **API auth:** Free NADA registration required; data-licence agreement
  before download.
- **Update cadence:** Aligned to PLFS quarterly + annual releases.
- **Licence:** GoI; microdata licence requires registration and a re-use
  agreement.
- **Sync notes:** GREEN-ish for our purposes: this is the only way to
  compute Kerala-specific custom cuts beyond what the published PDF tables
  expose. Verified 2026-05-18.
- **Last verified:** 2026-05-18

## PLFS Quarterly Bulletin — example

- **URL:** https://www.mospi.gov.in/sites/default/files/publication_reports/QuarterlyBulletinPLFS_July_September_2024.pdf
- **Owner:** MoSPI.
- **What it provides:** Concrete example of the quarterly bulletin format
  (Jul-Sep 2024 issue) — urban CWS labour force indicators by state.
- **Feeds:** Same as PLFS above; this is the canonical quarterly artefact.
- **Format:** PDF.
- **Update cadence:** Quarterly.
- **Licence:** Government of India.
- **Sync notes:** URL pattern is stable per quarter — substitute the
  date range for newer issues. Verified 2026-05-18.
- **Last verified:** 2026-05-18

## MGNREGA MIS

- **URL:** https://nrega.nic.in/Netnrega/HomeStciti.aspx
- **What it provides:** Person-days generated, average wage, women's
  share, scheme works completed by district/panchayat.
- **Feeds:** `livelihood.mgnrega-persondays`, rural livelihoods KPIs.
- **Format:** HTML dashboards with CSV download per report.
- **Update cadence:** Real-time / daily.
- **Licence:** Government Open Data.
- **Sync notes:** Each district page exports a standard CSV.

## Kerala Unemployment Allowance / Employment Exchanges

- **URL:** https://employment.kerala.gov.in
- **What it provides:** Live register of job-seekers, employment-exchange
  placements, unemployment allowance paid.
- **Feeds:** `livelihood.live-register`,
  `livelihood.unemployment-allowance-spend`.

## Kudumbashree

- **URL:** https://www.kudumbashree.org
- **What it provides:** Self-help group counts, loans disbursed by NHG/CDS,
  micro-enterprises, women's collective income.
- **Feeds:** `livelihood.shg-coverage`, gender-budget KPIs.
- **Format:** HTML dashboard + annual report PDF.

## Department of Industries & Commerce (Kerala)

- **URL:** https://industry.kerala.gov.in
- **Also:** https://ksidc.org (KSIDC), https://kinfra.org (KINFRA)
- **What it provides:** MSME registrations, new industrial units, K-SWIFT
  approvals.
- **Feeds:** `livelihood.new-msme-rate`, `livelihood.industrial-investment`.

## K-SWIFT — Single-window investor approvals

- **URL:** https://kswift.kerala.gov.in
- **What it provides:** Application volumes, time-to-approval, sectoral
  split.
- **Feeds:** `delivery.investment-approval-tat` KPI.

## Kerala Tourism Statistics

- **URL:** https://www.keralatourism.org/tourismstatistics/
- **What it provides:** Annual domestic + foreign tourist arrivals, foreign
  exchange earnings, district-level visitor counts.
- **Feeds:** `livelihood.tourism-arrivals`, `livelihood.tourism-fee`.
- **Format:** PDF "Tourist Statistics" annual report.
- **Update cadence:** Annual + monthly bulletin.

## State Agricultural Statistics

- **URL:** https://www.ecostat.kerala.gov.in (Department of Economics &
  Statistics)
- **What it provides:** Area, production, yield by crop; price data; rural
  consumer price index.
- **Feeds:** `livelihood.crop-yield`, `livelihood.farm-gate-price`.
- **Format:** PDF reports + downloadable Excel.

## NAFIS — All-India Rural Financial Inclusion Survey

- **URL:** https://nabard.org/auth/writereaddata/tender/NAFIS_2022.pdf
- **Owner:** NABARD.
- **What it provides:** Rural household incomes, indebtedness, financial
  inclusion by state.
- **Feeds:** `livelihood.farm-household-income`, debt indicators.
- **Update cadence:** Every ~5 years.

## State Social Welfare — Pension MIS

- **URL:** https://welfarepension.lsgkerala.gov.in
- **What it provides:** Beneficiary counts and disbursement status for
  old-age, widow, disability, and agricultural-worker pensions.
- **Feeds:** `livelihood.pension-coverage`,
  `delivery.pension-arrears-days`.

## Kudumbashree NRO — micro-enterprise dashboard

- **URL:** https://kudumbashreenro.org
- **What it provides:** SHG-led enterprise statistics.

## SBM / Jal Jeevan Mission dashboards (livelihood-adjacent)

- **URL:** https://sbm.gov.in (urban + rural), https://ejalshakti.gov.in/jjmreport
- **Feeds:** `delivery.tap-connection-coverage`,
  `sustainability.ods-status`.
