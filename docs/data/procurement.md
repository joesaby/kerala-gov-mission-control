# Procurement & tender sources

For the Tier-1 "Tender Hub" / OCDS-compliant procurement dashboard. Also feeds
`trust.cost-overrun-rate`, `delivery.tender-tat`.

---

## Kerala e-Tenders

- **URL:** https://etenders.kerala.gov.in
- **Owner:** Kerala IT Mission e-Procurement system.
- **What it provides:** Open tenders, bid documents, award notices, vendor
  lists.
- **Feeds:** Live tender hub; `trust.cost-overrun-rate`, `delivery.tender-tat`.
- **Format:** HTML pages + downloadable PDFs.
- **API auth:** Public read; bidding requires login.
- **Update cadence:** Real-time.
- **Licence:** Public-record. Bid documents are typically free.
- **Sync notes:** No structured API — needs a scraper that paginates the "Latest
  Active Tenders" feed. Award notices have a separate listing (search "Awards of
  Contract").

## GeM — Government e-Marketplace

- **URL:** https://gem.gov.in
- **Owner:** GeM SPV, MoCI (GoI).
- **What it provides:** Government purchase orders, vendor catalogues, buyer
  organisations.
- **Feeds:** State-level GeM purchase volume; vendor concentration.
- **API auth:** Limited public dashboards; bulk data needs request.
- **Update cadence:** Real-time.

## OCDS — Open Contracting Data Standard

- **URL:** https://www.open-contracting.org/data-standard/
- **What it provides:** A schema (not a dataset) — every procurement record
  should map to this for interoperability.
- **Feeds:** The canonical shape for the tender hub data layer.
- **Sync notes:** If we want a long-lived data platform, write the Kerala
  e-Tenders adapter to _output_ OCDS JSON.

## Open Contracting Partnership — Data Registry (reality check)

- **URL:** https://data.open-contracting.org/
- **Owner:** Open Contracting Partnership.
- **What it provides:** Global registry of OCDS publishers. **From India, only
  Assam and Himachal Pradesh appear** (HP via CivicDataLab).
- **Feeds:** Reality-check: **Kerala is _not_ an OCDS publisher.**
- **Format:** Web search + JSON OCDS feeds (per publisher).
- **API auth:** None.
- **Update cadence:** Continuous.
- **Licence:** Per-publisher.
- **Sync notes:** RED — **the KPI `delivery.tender-publication` framed as "%
  OCDS-compliant" is aspirational, not factual.** Recommend reframing the KPI to
  "% of tenders ≥ ₹X lakh appearing on etenders.kerala.gov.in within Y days of
  GO issue", which is genuinely measurable from a scrape. Pursue an OCP
  partnership as a strategic ask (see `sync-plan.md` access asks) on the
  CivicDataLab Himachal model. Verified 2026-05-18.
- **Last verified:** 2026-05-18

## CPPP — Central Public Procurement Portal

- **URL:** https://eprocure.gov.in
- **What it provides:** Tenders from central ministries; partial state-side
  coverage.
- **Feeds:** Comparator only.

## KSEBL Tenders

- **URL:** https://ksebl.in/tenders
- **What it provides:** Power utility procurement separate from the main
  e-tenders portal.

## KMRL Tenders

- **URL:** https://kochimetro.org/tenders
- **What it provides:** Metro construction / operations procurement.

## CAG — Performance Audit reports

- **URL:** https://cag.gov.in/en/audit-report-state/Kerala
- **What it provides:** Audit findings on cost overruns, scope creep,
  procurement irregularities.
- **Feeds:** `trust.cost-overrun-rate` validation; case studies for individual
  scheme audits.
