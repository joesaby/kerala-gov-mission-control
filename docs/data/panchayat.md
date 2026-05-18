# Panchayat & LSG sources

Feeds the Tier-1 **"My Panchayat"** geo-located Local Self-Government dashboard
— boundaries, population, election results, schemes, services. Cross-references
the State Election Commission Kerala entry in [`governance.md`](./governance.md)
for LSG election results.

---

## OpenDataKerala — LSG boundaries

- **URL:** https://github.com/opendatakerala/lsg-kerala-data
- **Owner:** OpenDataKerala / Sahya community (OSM-derived).
- **What it provides:** Admin-level-8 (Grama Panchayat / Municipality /
  Corporation) boundary geometries for all of Kerala.
- **Feeds:** Basemap + clickable LSG layer for the **My Panchayat** MVP.
- **Format:** GeoJSON / KML / Shapefile (per release).
- **API auth:** None — vendorable from the GitHub releases page.
- **Update cadence:** Periodic releases; **last release Nov 2020 at time of
  check — may be stale** for newly delimited LSGs.
- **Licence:** ODbL (OSM-derived) + CC-BY-SA on metadata.
- **Sync notes:** GREEN — vendor the GeoJSON release directly into the repo.
  Watch for the next release; flag any delimitation changes in Kerala that
  post-date Nov 2020.
- **Last verified:** 2026-05-18

## Department of Panchayats — per-GP population

- **URL:** https://dop.lsgkerala.gov.in/en/node/1043
- **Owner:** Department of Panchayats, Government of Kerala.
- **What it provides:** Per-Grama-Panchayat population data.
- **Feeds:** Population denominator for any per-capita KPI on the **My
  Panchayat** dashboard.
- **Format:** HTML + PDF.
- **API auth:** None.
- **Update cadence:** Updated when census / projection updates land (Census 2011
  is the underlying denominator until Census 2027).
- **Licence:** Government of Kerala — public record.
- **Sync notes:** AMBER — scrape-required. Verified 2026-05-18.
- **Last verified:** 2026-05-18

## LSGD Dashboard

- **URL:** https://dashboard.lsgkerala.gov.in/
- **Owner:** Local Self-Government Department, Government of Kerala.
- **What it provides:** Department-wide LSG dashboard — schemes, expenditure,
  projects.
- **Feeds:** Aggregate LSG performance tiles on **My Panchayat**.
- **Format:** HTML.
- **API auth:** None.
- **Update cadence:** Continuous (claimed).
- **Licence:** Government of Kerala.
- **Sync notes:** AMBER / RED — **content is not browser-crawlable from our
  tooling**; verify in a real browser. May require a browser-driven scraper
  (Playwright / Puppeteer). Flagged for re-verification.
- **Last verified:** 2026-05-18

## KSDI — Kerala State Spatial Data Infrastructure

- **URL:** https://ksdi.kerala.gov.in/ksdi/
- **Owner:** Kerala State IT Mission / Kerala State Land Use Board.
- **What it provides:** WMS / WFS layers for cadastral, land-use, hydrology,
  transport, settlements across Kerala.
- **Feeds:** Map layers for the **My Panchayat** spatial view.
- **Format:** WMS / WFS.
- **API auth:** **Authorised account required for downloads.**
- **Update cadence:** Per layer.
- **Licence:** State (restricted re-use).
- **Sync notes:** RED for unattended ingest — partnership / account required.
  Useful as a render-time map source only. Verified 2026-05-18.
- **Last verified:** 2026-05-18

## OpenSDI Kerala

- **URL:** https://opensdi.kerala.gov.in/
- **Owner:** Kerala State IT Mission (subset of KSDI explicitly marked open).
- **What it provides:** Open subset of KSDI layers — no login required.
- **Feeds:** Basemap layers for **My Panchayat** that don't require an
  authorised account.
- **Format:** Web / WMS.
- **API auth:** None.
- **Update cadence:** Per layer.
- **Licence:** State (open subset).
- **Sync notes:** GREEN-ish — the only freely accessible spatial source from the
  state. Verified 2026-05-18.
- **Last verified:** 2026-05-18

## K-SMART — citizen services (LSG)

- **URL:** https://ksmart.lsgkerala.gov.in/
- **Owner:** Information Kerala Mission / LSGD.
- **What it provides:** Citizen-facing portal for Urban Local Body and Panchayat
  services — birth/death certificates, building permits, trade licences,
  property tax, etc.
- **Feeds:** Volume tiles on **My Panchayat** + Tier-1 "Service Clock".
- **Format:** Portal (login required for transactional services).
- **API auth:** None for public portal; SLA telemetry private.
- **Update cadence:** Continuous.
- **Licence:** Government of Kerala.
- **Sync notes:** RED — **per-service SLA (median days to fulfil) is not
  public**. Aggregate counts may be scrapeable from the e-Services Dashboard
  (see `governance.md` / e-Services), but unit-level latency needs a C-DIT /
  KeralaIT Mission data-sharing arrangement (see access asks in `sync-plan.md`).
  Verified 2026-05-18.
- **Last verified:** 2026-05-18
