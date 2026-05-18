# Transport sources

Feeds the `transport` civic domain — road quality, public transit ridership,
accidents, vehicle registrations, port traffic, aviation.

---

## Kerala Motor Vehicles Department (MVD)

- **URL:** https://mvd.kerala.gov.in
- **Also:** Vahan/Sarathi (national): https://parivahan.gov.in
- **What it provides:** Vehicle registrations by category, driving licences
  issued, road-safety enforcement (challans).
- **Feeds:** `transport.vehicle-density`, `transport.electric-share`,
  `transport.licence-issuance-rate`.
- **Format:** Vahan dashboard exports CSV; MVD publishes monthly digests.
- **Update cadence:** Daily underlying; monthly bulletins.
- **API auth:** Vahan API requires registration.

## KSRTC — Kerala State Road Transport Corporation

- **URL:** https://www.keralartc.com
- **Also:** https://aanavandi.com (booking; has open route/timetable data)
- **What it provides:** Daily passenger count, route-wise revenue, on-time
  performance, fleet condition.
- **Feeds:** `transport.ksrtc-ridership`, `transport.ksrtc-revenue`.
- **Format:** Annual Statistical Abstract PDF + monthly press releases.
- **Update cadence:** Daily operational; monthly disclosure.

## Kochi Metro / KMRL

- **URL:** https://kochimetro.org
- **What it provides:** Daily ridership, station counts, water-metro passengers.
- **Feeds:** `transport.urban-rail-ridership`.

## Kerala Public Works Department

- **URL:** https://pwd.kerala.gov.in
- **What it provides:** Road condition index, contract awards, bridge inventory.
- **Feeds:** `transport.road-condition-index`, `delivery.contract-award-tat`.

## MoRTH — Basic Road Statistics & Road Accidents

- **URL:** https://morth.nic.in
- **Latest road-accidents report (verified):**
  https://morth.gov.in/backend/documents/uploaded/Road-Accident-in-India-2023-Publications.pdf
- **Feeds:** State-wise lane-km, road density comparator;
  `transport.road-fatalities` annual values.
- **Format:** PDF.
- **Update cadence:** Annual.
- **Licence:** Government of India.
- **Sync notes:** AMBER for direct ingest (multi-table PDF). Prefer the OpenCity
  CSV mirror below for machine ingestion. **Drop the "Kerala MVD CCTNS feed"
  framing on `transport.road-fatalities` — that is not a public feed.** Verified
  2026-05-18.
- **Last verified:** 2026-05-18

## OpenCity — Road Accidents in India 2023 mirror

- **URL:** https://data.opencity.in/dataset/road-accidents-in-india-2023
- **Owner:** OpenCity (Civic Insights Foundation) — CKAN portal.
- **What it provides:** 12 CSV datasets derived from MoRTH 2023 report,
  including **State-wise Road Accidents 2019-2023** and **State-wise Road
  Fatalities 2019-2023**, plus large-cities breakdowns.
- **Feeds:** `transport.road-fatalities` (direct CSV ingest path); comparator
  series for all states.
- **Format:** CSV.
- **API auth:** None (CKAN).
- **Update cadence:** Annual (republished when MoRTH releases).
- **Licence:** CC-BY (MoRTH underlying licence preserved).
- **Sync notes:** GREEN — the cleanest way to get state-wise road fatalities.
  Vendor the CSVs; refresh once a year.
- **Last verified:** 2026-05-18

## Kerala Police — Road Accidents page

- **URL:** https://keralapolice.gov.in/crime/road-accidents
- **Owner:** Kerala Police.
- **What it provides:** Monthly Kerala accidents / deaths / injuries table —
  more current than MoRTH (2026 partial-year visible at check).
- **Feeds:** Sub-annual cadence for `transport.road-fatalities`.
- **Format:** HTML summary + PDF detail.
- **API auth:** None.
- **Update cadence:** Monthly.
- **Licence:** Public record.
- **Sync notes:** AMBER — scrape-required. This is the _only_ source that makes
  a monthly road-fatalities KPI cadence honest for Kerala. Verified 2026-05-18.
- **Last verified:** 2026-05-18

## Indian Ports Association — Major Ports stats

- **URL:** https://ipa.nic.in
- **Feeds:** `transport.port-cargo-throughput` for Cochin Port.
- **Update cadence:** Monthly.

## Kerala Maritime Board — non-major ports

- **URL:** https://kmb.kerala.gov.in
- **What it provides:** Cargo movement at Vizhinjam, Beypore, Azheekal, etc.
- **Feeds:** `transport.non-major-port-traffic`, `livelihood.port-led-jobs`.

## AAI — Airports Authority of India

- **URL:** https://www.aai.aero
- **Feeds:** Passenger and cargo movement for state-relevant airports (CIAL,
  Trivandrum, Kannur).

## Vizhinjam International Seaport (VISL)

- **URL:** https://vizhinjamport.in
- **Feeds:** Container throughput, ship calls.

## E-vehicle policy dashboards — Kerala

- **URL:** https://transport.kerala.gov.in/ev-policy
- **Feeds:** `sustainability.ev-share-new-vehicles`.
