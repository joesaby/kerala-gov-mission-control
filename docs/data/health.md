# Health sources

Feeds the `health` civic domain — IMR, MMR, life expectancy, immunisation, NCD
burden, vector-borne diseases, hospital infrastructure, doctor density.

---

## NFHS — National Family Health Survey

- **URL:** https://rchiips.org/nfhs/factsheet_NFHS-5.shtml (Kerala factsheet)
- **Also:** https://dhsprogram.com/pubs/pdf/FR375/FR375.pdf (full Kerala report)
- **Owner:** Ministry of Health & Family Welfare → IIPS Mumbai.
- **What it provides:** State + district fact sheets on fertility, immunisation,
  anaemia, maternal/child health, women's empowerment, nutrition, NCDs.
- **Feeds:** `health.imr`, `health.full-immunisation`, `health.anaemia`,
  `health.institutional-deliveries`, and the bulk of comparator values.
- **Format:** PDF factsheets + downloadable data files.
- **Update cadence:** Every 4–6 years (NFHS-5 = 2019–21; NFHS-6 fieldwork
  started 2024).
- **Licence:** Public document, government open licence.
- **Sync notes:** District factsheets are PDF tables; use `pdfplumber` and a
  column map. Watch for definition changes between NFHS rounds.

## SRS — Sample Registration System

- **URL:** https://censusindia.gov.in/census.website/data/SRS
- **Latest bulletin (verified):**
  https://censusindia.gov.in/nada/index.php/catalog/46178/download/50426/SRS_Bulletin_2023_Vol_58_No_1.pdf
  (Vol 58 No 1, 2023; Kerala IMR = 5 per 1,000).
- **Owner:** Office of the Registrar General of India.
- **What it provides:** Annual IMR, MMR, total fertility rate, life expectancy
  by state.
- **Feeds:** `health.imr` (annual update path), `health.mmr`, life expectancy
  comparator.
- **Format:** PDF + XLS.
- **Update cadence:** Annual SRS Bulletin; quinquennial special bulletins for
  MMR and life expectancy. Bulletin lag is ~12-18 months from data year.
- **Licence:** Government publication.
- **Sync notes:** SRS Bulletin is the authoritative source — supersedes NFHS for
  the headline mortality indicators in the year after release. Canonical NADA
  bulletin URL verified 2026-05-18.
- **Last verified:** 2026-05-18

## Data For India — IMR series

- **URL:** https://www.dataforindia.com/infant-mortality/
- **Owner:** Data For India (independent project, MIT-licensed code).
- **What it provides:** Tidied long-form Kerala + national IMR time series,
  derived from SRS, with chart download.
- **Feeds:** Convenience comparator + sanity-check mirror for `health.imr`.
- **Format:** HTML + chart download.
- **API auth:** None.
- **Update cadence:** Refreshed when new SRS bulletins land.
- **Licence:** Charts MIT; verify re-use terms for tabular data.
- **Sync notes:** Useful for backfill of older years where the original RGI PDFs
  are inconvenient to scrape.
- **Last verified:** 2026-05-18

## Kerala Directorate of Health Services — HMIS

- **URL:** https://dhs.kerala.gov.in
- **Also:** https://hmis.kerala.gov.in (Kerala HMIS dashboard)
- **What it provides:** Facility-level service delivery — OP/IP volumes,
  immunisation coverage, communicable disease counts, vacancies.
- **Feeds:** Monthly `health.*` operational KPIs; future hospital-level
  drilldowns.
- **Format:** HTML dashboard + downloadable CSV from some views.
- **Update cadence:** Monthly.
- **Licence:** Public sector dataset; treat as government open licence.
- **Sync notes:** No public API; will require a polite scraper plus manual
  schema map per indicator.

## DHS Kerala — Communicable Disease bulletins

- **URL:** https://dhs.kerala.gov.in/communicable-disease-control-2/
- **What it provides:** Weekly dengue, malaria, leptospirosis, H1N1, Nipah case
  counts.
- **Feeds:** Outbreak watchlist; transient KPI tiles during outbreaks.
- **Format:** PDF weekly bulletin.
- **Update cadence:** Weekly.

## NHM HMIS (national)

- **URL:** https://hmis.nhp.gov.in/
- **Owner:** Ministry of Health & Family Welfare.
- **What it provides:** Standard service-delivery indicators across all states —
  antenatal care, immunisation, OP/IP, deliveries.
- **Feeds:** Cross-state comparators for health KPIs.
- **Format:** HTML dashboard with CSV export.
- **Update cadence:** Monthly.
- **API auth:** Public web; no documented API.

## NITI Aayog — SDG India Index (health dimension)

- **URL:** https://sdgindiaindex.niti.gov.in
- **What it provides:** State scores on SDG 3 (Good Health) with granular
  underlying indicators.
- **Feeds:** Cross-state comparator panel; `Kpi.comparators[]`.
- **Format:** HTML dashboard + downloadable Excel.
- **Update cadence:** ~Annual.
- **Licence:** Government Open Data.

## ICMR / NCDC Disease Surveillance — IDSP

- **URL:** https://idsp.mohfw.gov.in
- **What it provides:** District-level weekly outbreak reports + disease counts
  under the Integrated Disease Surveillance Programme.
- **Feeds:** Future `safety.outbreak-burden` indicator and the Tier-3 "Crisis
  Dashboard" health-crisis feed.
- **Format:** PDF state weekly reports.
- **Update cadence:** Weekly.
- **Licence:** Government of India.
- **Sync notes:** Weekly outbreak PDFs are the canonical early-warning source —
  scrape the per-week landing and store by epidemiological week.
- **Last verified:** 2026-05-18

## NCDIR — National Centre for Disease Informatics

- **URL:** https://ncdirindia.org
- **What it provides:** Cancer registries, NCD burden estimates.
- **Feeds:** NCD chapter of health domain.
- **Update cadence:** Annual reports.

## NHA — Ayushman Bharat / PMJAY dashboards

- **URL:** https://pmjay.gov.in
- **Also:** Kerala Aarogya Suraksha (KASP) https://sha.kerala.gov.in
- **What it provides:** Enrolment, claims paid, hospitalisation volume by state.
- **Feeds:** `health.insurance-coverage`, `livelihood.kasp-claims`.
- **Format:** HTML dashboard.
- **Update cadence:** Daily/weekly.

## Indian Drug Manufacturers Association price index

- **URL:** https://nppaindia.nic.in (NPPA — drug pricing)
- **What it provides:** Maximum retail prices for essential medicines.
- **Feeds:** Citizen-facing "is your medicine being overcharged" angle.

## Kerala State Drug Formulary / KMSCL

- **URL:** https://kmscl.kerala.gov.in
- **What it provides:** Kerala Medical Services Corporation drug procurement and
  distribution.
- **Feeds:** `health.essential-drug-availability` KPI source.
- **Format:** HTML + procurement-data downloads.
