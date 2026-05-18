# Environment & sustainability sources

Feeds the `environment` and `sustainability` civic domains — forest cover, air
quality, water quality, solid waste, renewables share, climate action,
biodiversity.

---

## Kerala State Pollution Control Board

- **URL:** https://keralapcb.nic.in
- **Owner:** KSPCB.
- **What it provides:** Ambient air quality monitoring (NO₂, SO₂, PM10, PM2.5),
  surface-water quality (BOD, DO, pH), consent-to-operate (CTO) industrial
  compliance.
- **Feeds:** `environment.aqi-share-good`, `environment.river-water-quality`.
- **Format:** PDF monthly bulletins + station-wise CSV.
- **Update cadence:** Monthly.
- **Licence:** Government publication.

## CPCB — National Ambient Air Quality

- **URL:** https://cpcb.nic.in
- **Also:** https://cpcbccr.com/ccr (real-time air quality)
- **Feeds:** Cross-state comparators for AQI; real-time tiles during burning
  season.
- **Format:** HTML dashboard + downloadable JSON via station API.
- **Update cadence:** Real-time.

## Forest Survey of India — India State of Forest Report (ISFR)

- **URL:** https://fsi.nic.in/forest-report-2023
- **What it provides:** Biennial state-level forest cover, density, change
  detection, mangrove cover.
- **Feeds:** `environment.forest-cover-share`, `environment.dense-forest-share`.
- **Format:** PDF (state chapter is ~25 pages).
- **Update cadence:** Biennial.

## Kerala Forest Department

- **URL:** https://forest.kerala.gov.in
- **What it provides:** Wildlife census, human-wildlife conflict events, forest
  fires, plantation programmes.
- **Feeds:** `environment.human-wildlife-deaths`, `environment.forest-fires`.
- **Format:** HTML + annual reports.

## ENVIS Kerala

- **URL:** https://envis.kerala.gov.in
- **What it provides:** State-of-environment reports, biodiversity inventories.

## State Action Plan on Climate Change (Kerala)

- **URL:** https://envt.kerala.gov.in/climate-change/
- **What it provides:** Sector emissions, mitigation/adaptation measurables.
- **Feeds:** `sustainability.climate-action-progress`.

## KSEB — power mix & renewable share

- **URL:** https://ksebl.in
- **What it provides:** Daily generation by source, peak demand, inter-state
  purchase.
- **Feeds:** `sustainability.renewable-share`, `sustainability.peak-deficit`.
- **Format:** HTML daily bulletin; monthly statement PDF.
- **Update cadence:** Daily.

## MNRE — Renewable Energy state dashboards

- **URL:** https://mnre.gov.in
- **Feeds:** Cross-state renewables comparator.
- **Update cadence:** Monthly.

## CGWB — Central Ground Water Board

- **URL:** https://cgwb.gov.in
- **What it provides:** Groundwater levels, over-exploited blocks per state.
- **Feeds:** `sustainability.groundwater-status`.

## Jal Jeevan Mission (water connectivity)

- **URL:** https://ejalshakti.gov.in/jjmreport
- **Feeds:** `sustainability.household-tap-water-coverage`.
- **Format:** HTML dashboard with state CSV.
- **Update cadence:** Daily.

## SBM — Swachh Bharat Mission Urban & Rural

- **URL:** https://sbmurban.org and https://swachhbharatmission.gov.in
- **What it provides:** Waste collection / processing %, OD-free verification.
- **Feeds:** `sustainability.waste-processing-share`,
  `sustainability.ods-status`.

## Suchitwa Mission Kerala

- **URL:** https://sanitation.kerala.gov.in
- **What it provides:** Decentralised solid-waste management coverage at LSG
  level.
- **Feeds:** `sustainability.waste-segregation-coverage`.

## Energy Statistics India (MoSPI)

- **URL:** https://mospi.gov.in (Energy Statistics annual)
- **Feeds:** Per-capita energy consumption time series.
