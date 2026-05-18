# Safety & justice sources

Feeds the `safety` civic domain — crime, road accidents, women's safety,
disaster response, fire & rescue, prisons, RTI/grievance pulse.

---

## NCRB — Crime in India

- **URL:** https://ncrb.gov.in/crime-in-india.html
- **Owner:** National Crime Records Bureau, MHA.
- **What it provides:** Annual state-wise crime statistics — IPC + SLL,
  women crimes, child crimes, conviction rates, prison occupancy.
- **Feeds:** `safety.crime-rate`, `safety.women-crime-rate`,
  `safety.conviction-rate`, prison KPIs.
- **Format:** PDF + downloadable Excel.
- **Update cadence:** Annual (typically with a 12-18 month lag).
- **Licence:** Government publication.
- **Sync notes:** AMBER — tables are well-structured; ingest via `tabula`.
  **Important:** the KPI `safety.crime-against-women` currently claims a
  "Kerala CCTNS feed" — that is **not** a public source. CCTNS is an
  internal Kerala Police system. Public sources are NCRB (annual) +
  Kerala Police HTML pages (monthly, see below). Verified 2026-05-18.

## OpenCity — Crime in India 2023 mirror

- **URL:** https://data.opencity.in/dataset/crime-in-india-2023
- **Owner:** OpenCity (Civic Insights Foundation) — CKAN portal.
- **What it provides:** Machine-readable CSV mirror of NCRB Crime in
  India 2023 tables, state-disaggregated.
- **Feeds:** Direct ingest path for `safety.crime-rate`,
  `safety.women-crime-rate` annual values.
- **Format:** CSV.
- **API auth:** None (CKAN).
- **Update cadence:** Annual (republished when NCRB releases).
- **Licence:** CC-BY (NCRB underlying licence preserved).
- **Sync notes:** GREEN — quickest path to NCRB numbers without parsing
  the multi-volume PDF.
- **Last verified:** 2026-05-18

## Dataful (Factly) — NCRB collection

- **URL:** https://dataful.in/collections/1108/
- **Owner:** Factly Media & Research.
- **What it provides:** Cleaned NCRB Crime in India (Summary) collection
  in CSV, state-wise time series.
- **Feeds:** Backup / cross-check source for `safety.crime-rate` series.
- **Format:** CSV.
- **API auth:** Free registration required.
- **Update cadence:** Annual.
- **Licence:** Mixed; free tier exists.
- **Sync notes:** Use as a sanity check against the OpenCity mirror.
- **Last verified:** 2026-05-18

## Kerala Police — monthly crime tables

- **URL:** https://keralapolice.gov.in/crime/total-cases
- **Also:** https://keralapolice.gov.in/crime-statistics/ipc-cases
- **Owner:** Kerala Police.
- **What it provides:** Year/month tables of total cases, IPC cases, and
  category breakdowns — updated monthly with much shorter lag than NCRB.
- **Feeds:** Sub-annual cadence for `safety.crime-rate`,
  `safety.women-crime-rate` (the *only* monthly Kerala-specific source).
- **Format:** HTML tables + PDF detail.
- **API auth:** None.
- **Update cadence:** Monthly.
- **Licence:** Public record.
- **Sync notes:** AMBER — scrape-required (well-formed HTML tables).
  This is what makes a "monthly refresh" KPI cadence achievable; NCRB
  alone cannot support it. Verified 2026-05-18.
- **Last verified:** 2026-05-18

## NCRB — Accidental Deaths & Suicides in India (ADSI)

- **URL:** https://ncrb.gov.in/accidental-deaths-suicides-in-india.html
- **Feeds:** `safety.road-accident-deaths`, `safety.suicide-rate`,
  `safety.workplace-deaths`.
- **Update cadence:** Annual.

## Kerala Police — Crime & Criminal Tracking

- **URL:** https://keralapolice.gov.in
- **Also:** Thuna (https://thuna.keralapolice.gov.in) — citizen petition tracker
- **What it provides:** District-wise crime totals, response times for
  Helpline 112, women's helpline cases.
- **Feeds:** Real-time `safety.response-time-112`,
  `safety.women-helpline-cases`.
- **Format:** HTML dashboard, no public API.

## MoRTH — Road Accidents in India

- **URL:** https://morth.nic.in (Road Transport Year Book + Road
  Accidents annual report)
- **What it provides:** State-wise road fatalities, vehicle-type splits,
  road-condition correlates.
- **Feeds:** `transport.road-fatalities` (also Transport domain), peer
  state comparators.
- **Update cadence:** Annual.

## Kerala State Disaster Management Authority

- **URL:** https://sdma.kerala.gov.in
- **What it provides:** Live disaster alerts, monsoon dashboards, IDRN
  (resource inventory), past-event damage reports.
- **Feeds:** `safety.disaster-deaths`, `safety.alerts-active`,
  `Department dept.revenue` linked KPIs.

## Election Commission — model code violations (general election cycles)

- **URL:** https://eci.gov.in
- **Feeds:** Pre-election `trust.mcc-complaints` indicator.

## NHRC / SHRC — Kerala State Human Rights Commission

- **URL:** https://kshrc.kerala.gov.in
- **What it provides:** Case filing volume, disposed-cases, custody-death
  inquiries.
- **Feeds:** `trust.rights-disposal-rate`.

## Kerala State Information Commission (RTI)

- **URL:** https://www.keralasic.gov.in
- **What it provides:** RTI appeals filed, disposed, pending; PIO
  penalties.
- **Feeds:** `trust.rti-pendency`, `trust.rti-disposal-rate`.
- **Update cadence:** Annual reports + quarterly statistics.

## Lokayukta Kerala

- **URL:** https://lokayukta.kerala.gov.in
- **What it provides:** Cases registered, disposed, recommendations
  against public servants.
- **Feeds:** `trust.lokayukta-disposal-rate`.

## Fire & Rescue Services Kerala

- **URL:** https://fire.kerala.gov.in
- **What it provides:** Incident counts by category, response-time
  averages, fire-safety inspection coverage.
- **Feeds:** `safety.fire-response-time`,
  `safety.fire-safety-coverage`.

## Prisons Kerala

- **URL:** https://prisons.kerala.gov.in
- **What it provides:** Inmate population, undertrial share, capacity
  utilisation by jail.
- **Feeds:** `safety.prison-overcrowding-ratio`,
  `safety.undertrial-share`.

## Cybercrime — I4C / Cyberdome Kerala

- **URL:** https://cybercrime.gov.in (national portal)
- **Also:** https://cyberdome.kerala.gov.in
- **What it provides:** Cybercrime complaints, financial fraud losses,
  resolution rates.
- **Feeds:** `safety.cyberfraud-loss-rate`.

## MoSPI Time Use Survey (women's safety angle — fear & avoidance)

- **URL:** https://mospi.gov.in (Time Use Survey)
- **Feeds:** Contextual indicator for women-safety narrative panel.
