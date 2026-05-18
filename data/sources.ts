/**
 * Verified open-data sources that can feed (or partially feed) the Kerala
 * Mission Control dashboards. Companion to `docs/open-data-sources.md` —
 * that document holds the full rationale; this is the typed registry the
 * data-loader layer will iterate over.
 *
 * Conventions match `data/types.ts`:
 *   - id is dotted-slug-cased, prefixed `src.`
 *   - kpiIds reference Kpi.id values from `data/kpis.ts`
 *   - dashboards reference the roadmap dashboard slugs from README
 *   - status `verified` = URL loaded and produces the data described here as
 *     of 2026-05-18; `candidate` = useful but not yet wired in or only
 *     partially proven; `blocked` = not publicly available or paywalled.
 */

export type SourceFormat =
  | "json-api"
  | "rest-api"
  | "csv"
  | "xlsx"
  | "pdf"
  | "html-scrape"
  | "geojson"
  | "mixed";

export type SourceCadence =
  | "real-time"
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "annual"
  | "biennial"
  | "ad-hoc"
  | "unknown";

export type SourceStatus = "verified" | "candidate" | "blocked";

/** Roadmap dashboard slugs (Tier 1-3 from README). */
export type DashboardSlug =
  | "kerala-today"
  | "where-my-money-goes"
  | "promises-tracker"
  | "my-panchayat"
  | "service-clock"
  | "department-scorecards"
  | "district-performance"
  | "tender-hub"
  | "fiscal-health"
  | "crisis"
  | "grievance-rti"
  | "hr-capacity"
  | "government-orders";

export interface DataSource {
  /** Stable id, e.g. "src.cpcb-caaqms". */
  id: string;
  name: string;
  /** Publishing org / agency. */
  publisher: string;
  /** Canonical landing or API endpoint that was verified to load. */
  url: string;
  format: SourceFormat;
  /** Open licence tag if known. "unspecified" when no licence is attached. */
  licence?: string;
  cadence: SourceCadence;
  /** Kpi.id values from `data/kpis.ts` this source can feed. */
  kpiIds?: string[];
  /** Roadmap dashboard slugs this source enables. */
  dashboards?: DashboardSlug[];
  /** Practical friction: API key, login wall, captcha, PDF-only, etc. */
  accessFriction?: string;
  status: SourceStatus;
  /** Free-text notes useful at integration time. */
  notes?: string;
}

export const DATA_SOURCES: DataSource[] = [
  // -------------------------------------------------------------------------
  // Environment
  // -------------------------------------------------------------------------
  {
    id: "src.cpcb-caaqms-ogd",
    name: "CPCB CAAQMS real-time AQI (data.gov.in mirror)",
    publisher: "Central Pollution Control Board via OGD Platform India",
    url:
      "https://www.data.gov.in/resource/real-time-air-quality-index-various-locations",
    format: "json-api",
    licence: "GODL-India",
    cadence: "real-time",
    kpiIds: ["environment.air-quality"],
    dashboards: ["kerala-today", "crisis"],
    accessFriction: "Free API key from data.gov.in (My Account); rate-limited",
    status: "verified",
    notes:
      "JSON/CSV/XML. Filter by state=Kerala. Cache 15min in prod. Underlying CPCB station list at https://airquality.cpcb.gov.in/ccr/.",
  },
  {
    id: "src.kspcb-aqi-pdf",
    name: "KSPCB Daily/Monthly CAAQMS AQI Bulletins",
    publisher: "Kerala State Pollution Control Board",
    url: "https://kspcb.kerala.gov.in/aqi",
    format: "pdf",
    licence: "unspecified",
    cadence: "daily",
    kpiIds: ["environment.air-quality"],
    dashboards: ["kerala-today"],
    accessFriction: "PDF only — extraction required",
    status: "candidate",
    notes: "Backup / cross-check for the OGD API. Daily, monthly, annual PDFs.",
  },

  // -------------------------------------------------------------------------
  // Fiscal
  // -------------------------------------------------------------------------
  {
    id: "src.cag-state-finances-kerala",
    name: "CAG State Finances Audit Report — Kerala",
    publisher: "Comptroller and Auditor General of India",
    url: "https://cag.gov.in/ag2/kerala/en/audit-report?sector%5B0%5D=27",
    format: "pdf",
    licence: "Government of India",
    cadence: "annual",
    kpiIds: ["fiscal.debt-to-gsdp", "fiscal.revenue-deficit"],
    dashboards: ["kerala-today", "fiscal-health"],
    accessFriction: "PDF only; ~18 month lag from FY end",
    status: "verified",
    notes:
      "Latest: Report 3 of 2025 covering FY 2023-24 (https://cag.gov.in/webroot/uploads/download_audit_report/2025/Report-2023-24-Single-file-06902e4e81dd290.55444935.pdf, 5.48MB).",
  },
  {
    id: "src.ag-kerala-finance-accounts",
    name: "Finance Accounts & Monthly Civil Accounts — AG Kerala",
    publisher: "Principal Accountant General (A&E) Kerala",
    url: "https://cag.gov.in/ae/kerala/en/page-ae-kerala-accounts-vlc",
    format: "pdf",
    licence: "Government of India",
    cadence: "monthly",
    kpiIds: ["health.public-health-spend"],
    dashboards: ["fiscal-health", "where-my-money-goes"],
    accessFriction: "PDF only; need Major Head extraction",
    status: "verified",
    notes:
      "Monthly Civil Accounts uploaded on the 10th of the following month. Annual Finance Accounts Vol I & II separately. For health spend, extract MH 2210 (Med & Pub Health) + 2211 (FW).",
  },
  {
    id: "src.kerala-budget-finance-dept",
    name: "Kerala Budget Documents (Finance Dept)",
    publisher: "Finance Department, Government of Kerala",
    url: "https://finance.kerala.gov.in/bdgtDcs.jsp",
    format: "pdf",
    licence: "Government of Kerala",
    cadence: "annual",
    kpiIds: ["fiscal.revenue-deficit", "fiscal.debt-to-gsdp"],
    dashboards: ["where-my-money-goes", "fiscal-health"],
    accessFriction: "PDF only; site slow / occasional timeouts",
    status: "verified",
    notes:
      "Includes Budget Speech, Budget at a Glance, Detailed Demand for Grants, AFS. Mirror: https://budget.kerala.gov.in/.",
  },
  {
    id: "src.prs-kerala-budget-analysis",
    name: "PRS Kerala Budget Analysis",
    publisher: "PRS Legislative Research",
    url: "https://prsindia.org/budgets/states/kerala-budget-analysis-2025-26",
    format: "pdf",
    licence: "Free for non-commercial use with attribution",
    cadence: "annual",
    kpiIds: ["fiscal.revenue-deficit", "fiscal.debt-to-gsdp"],
    dashboards: ["where-my-money-goes", "fiscal-health"],
    accessFriction: "PDF; on-page HTML tables for the headline indicators",
    status: "verified",
    notes:
      "Normalised, reliable, refreshed ~10 days after every Kerala budget. The cheapest fiscal source to wire up.",
  },
  {
    id: "src.openbudgetsindia-kerala",
    name: "Open Budgets India — Kerala",
    publisher: "Open Budgets India / CBGA",
    url: "https://openbudgetsindia.org/organization/about/kerala",
    format: "pdf",
    licence: "CC-BY 4.0",
    cadence: "annual",
    dashboards: ["where-my-money-goes"],
    accessFriction:
      "PDF (Kerala not yet in CSV; only KA & SK have CSV per OBI FAQ)",
    status: "verified",
    notes:
      "Archival of historical budget documents. Good for time series back to 2014-15.",
  },
  {
    id: "src.rbi-handbook-state-stats",
    name: "RBI Handbook of Statistics on Indian States 2024-25",
    publisher: "Reserve Bank of India",
    url:
      "https://www.rbi.org.in/scripts/AnnualPublications.aspx?head=Handbook+of+Statistics+on+Indian+States",
    format: "mixed",
    licence: "RBI (public domain)",
    cadence: "annual",
    kpiIds: ["fiscal.debt-to-gsdp"],
    dashboards: ["fiscal-health", "district-performance"],
    accessFriction: "Some tables PDF, many as Excel",
    status: "verified",
    notes:
      "Long socio-economic time series, state-disaggregated. 10th edition (2024-25). Best single source for state fiscal & macro time series.",
  },

  // -------------------------------------------------------------------------
  // Health
  // -------------------------------------------------------------------------
  {
    id: "src.srs-bulletin-rgi",
    name: "SRS Bulletin & SRS Statistical Report",
    publisher: "Office of the Registrar General of India (Census India)",
    url:
      "https://censusindia.gov.in/nada/index.php/catalog/46178/download/50426/SRS_Bulletin_2023_Vol_58_No_1.pdf",
    format: "pdf",
    licence: "Government of India",
    cadence: "annual",
    kpiIds: ["health.imr"],
    dashboards: ["kerala-today"],
    accessFriction: "PDF only; ~12-18 month publication lag",
    status: "verified",
    notes:
      "State-disaggregated IMR table. Per 2023 bulletin, Kerala IMR = 5/1000.",
  },
  {
    id: "src.dataforindia-imr",
    name: "Data For India — Infant Mortality (curated)",
    publisher: "Data For India",
    url: "https://www.dataforindia.com/infant-mortality/",
    format: "html-scrape",
    licence: "CC-BY (verify per chart)",
    cadence: "annual",
    kpiIds: ["health.imr"],
    dashboards: ["kerala-today"],
    accessFriction: "Page-scraped; underlying RGI data",
    status: "candidate",
    notes: "Convenience mirror — verify licence before redistributing values.",
  },

  // -------------------------------------------------------------------------
  // Education
  // -------------------------------------------------------------------------
  {
    id: "src.aser-centre",
    name: "ASER (Annual Status of Education Report)",
    publisher: "ASER Centre / Pratham",
    url: "https://asercentre.org/",
    format: "mixed",
    licence: "CC-BY-NC",
    cadence: "annual",
    kpiIds: ["education.foundational-literacy"],
    dashboards: ["kerala-today", "district-performance"],
    accessFriction: "PDF + Excel annexures; rural-focused",
    status: "candidate",
    notes:
      "Stated KPI source (SCERT State Achievement Survey) is not publicly published — ASER + PARAKH RS are the de-facto open substitutes.",
  },
  {
    id: "src.parakh-rs-2024",
    name: "PARAKH Rashtriya Sarvekshan 2024",
    publisher: "NCERT / Ministry of Education",
    url: "https://parakh.education.gov.in/",
    format: "pdf",
    licence: "Government of India",
    cadence: "biennial",
    kpiIds: ["education.foundational-literacy"],
    dashboards: ["district-performance"],
    accessFriction: "PDF; landing URL may shift",
    status: "candidate",
    notes:
      "Replaces NAS — state and district results for foundational + numeracy.",
  },

  // -------------------------------------------------------------------------
  // Livelihood
  // -------------------------------------------------------------------------
  {
    id: "src.plfs-microdata",
    name: "Periodic Labour Force Survey (PLFS) microdata",
    publisher: "MoSPI / NSO",
    url: "https://microdata.gov.in/NADA/index.php/catalog/PLFS",
    format: "csv",
    licence: "NADA / GoI (registration required)",
    cadence: "annual",
    kpiIds: ["livelihood.unemployment"],
    dashboards: ["kerala-today"],
    accessFriction: "Registration + data agreement; quarterly bulletin is PDF",
    status: "verified",
    notes:
      "Unit-level CSV/Stata. For quarterly bulletin (urban-only CWS) see https://www.mospi.gov.in/sites/default/files/publication_reports/QuarterlyBulletinPLFS_July_September_2024.pdf.",
  },

  // -------------------------------------------------------------------------
  // Safety / Crime
  // -------------------------------------------------------------------------
  {
    id: "src.ncrb-crime-in-india",
    name: "NCRB Crime in India (annual)",
    publisher: "National Crime Records Bureau, MHA",
    url:
      "https://www.ncrb.gov.in/uploads/nationalcrimerecordsbureau/custom/1701607577CrimeinIndia2022Book1.pdf",
    format: "pdf",
    licence: "Government of India",
    cadence: "annual",
    kpiIds: ["safety.crime-against-women"],
    dashboards: ["kerala-today"],
    accessFriction: "Multi-volume PDF; ~12-18 month lag",
    status: "verified",
    notes:
      "URL pinned to CII 2022. Newer editions appear ad-hoc on ncrb.gov.in. Use Dataful or OpenCity mirror for ready CSV.",
  },
  {
    id: "src.dataful-ncrb-cii",
    name: "Dataful — NCRB Crime in India (Summary) collection",
    publisher: "Factly (Dataful)",
    url: "https://dataful.in/collections/1108/",
    format: "csv",
    licence: "Dataful (free tier with sign-in)",
    cadence: "annual",
    kpiIds: ["safety.crime-against-women"],
    dashboards: ["kerala-today", "district-performance"],
    accessFriction: "Account sign-in for micro-level access",
    status: "verified",
    notes:
      "Clean CSV with state/city/crime-head dimensions; preferable to re-parsing NCRB PDFs.",
  },
  {
    id: "src.kerala-police-crime",
    name: "Kerala Police — crime statistics",
    publisher: "Kerala Police",
    url: "https://keralapolice.gov.in/crime-statistics/ipc-cases",
    format: "html-scrape",
    licence: "Government of Kerala",
    cadence: "monthly",
    kpiIds: ["safety.crime-against-women"],
    dashboards: ["kerala-today", "department-scorecards"],
    accessFriction: "HTML + PDF; no API",
    status: "verified",
    notes:
      "Most up-to-date state numbers (faster than NCRB). Also see https://keralapolice.gov.in/crime/total-cases.",
  },

  // -------------------------------------------------------------------------
  // Trust / Grievance
  // -------------------------------------------------------------------------
  {
    id: "src.cmo-grievance-dashboard",
    name: "CMO Public Grievance Dashboard (Kerala e-Services)",
    publisher: "C-DIT for CMO, Government of Kerala",
    url:
      "https://dashboard.kerala.gov.in/e-services/cmo_department.php?FMfcgzGkZtCkPcNLhJMdzBHNLnttCdGcZvAm=ZGlkPTE0OA%3D%3D",
    format: "html-scrape",
    licence: "unspecified",
    cadence: "daily",
    kpiIds: ["trust.grievance-resolution"],
    dashboards: ["kerala-today", "grievance-rti"],
    accessFriction:
      "Host TLS chain doesn't validate cleanly; per-grievance unit data not exposed",
    status: "candidate",
    notes:
      "Only aggregate numbers are visible publicly. True '% resolved in 30 days' KPI requires CMO/CDIT data partnership.",
  },

  // -------------------------------------------------------------------------
  // Delivery — service clock, tenders, KIIFB
  // -------------------------------------------------------------------------
  {
    id: "src.kerala-e-services-dashboard",
    name: "Kerala e-Services Dashboard (C-DIT)",
    publisher: "C-DIT for State Government of Kerala",
    url: "https://dashboard.kerala.gov.in/e-services/",
    format: "html-scrape",
    licence: "unspecified",
    cadence: "daily",
    dashboards: ["service-clock", "department-scorecards"],
    accessFriction: "TLS chain issues observed; no API",
    status: "candidate",
    notes:
      "Per-department aggregate application/disposal volumes; does NOT publish per-application latency. Use as the public face of Service Clock MVP.",
  },
  {
    id: "src.kerala-etenders",
    name: "Kerala e-Tenders portal (GePNIC)",
    publisher: "NIC for Stores Purchase Department, GoK",
    url: "https://etenders.kerala.gov.in/",
    format: "html-scrape",
    licence: "unspecified",
    cadence: "daily",
    kpiIds: ["delivery.tender-publication"],
    dashboards: ["tender-hub", "where-my-money-goes"],
    accessFriction:
      "No OCDS or JSON export; pure HTML scrape; Class-3 DSC needed only for bidding (not for reading tender notices)",
    status: "blocked",
    notes:
      "Kerala is NOT listed in OCP Data Registry (https://data.open-contracting.org/en/search/). Build local OCDS exporter, or rely on commercial aggregators as fallback.",
  },
  {
    id: "src.kiifb-newsletter",
    name: "KIIFB Project Newsletter + public Project Status",
    publisher: "Kerala Infrastructure Investment Fund Board",
    url: "https://www.kiifb.org/",
    format: "pdf",
    licence: "unspecified",
    cadence: "monthly",
    kpiIds: ["delivery.kiifb-on-time"],
    dashboards: ["kerala-today", "where-my-money-goes"],
    accessFriction:
      "PMAS (projectupdates.kiifb.org) and bill-track require login; only the newsletter PDFs and project gallery are public",
    status: "candidate",
    notes:
      "True 'projects on time' field-level data needs MoU with KIIFB Project Monitoring Cell.",
  },

  // -------------------------------------------------------------------------
  // Transport
  // -------------------------------------------------------------------------
  {
    id: "src.morth-road-accidents",
    name: "Road Accidents in India 2023 (MoRTH)",
    publisher: "Ministry of Road Transport & Highways",
    url:
      "https://morth.gov.in/backend/documents/uploaded/Road-Accident-in-India-2023-Publications.pdf",
    format: "pdf",
    licence: "Government of India",
    cadence: "annual",
    kpiIds: ["transport.road-fatalities"],
    dashboards: ["kerala-today"],
    accessFriction: "PDF only",
    status: "verified",
    notes:
      "State-wise tables in chapter 3 / appendices. Use OpenCity mirror for CSV.",
  },
  {
    id: "src.opencity-road-accidents",
    name: "OpenCity — Road Accidents in India 2019-2023 (CSV)",
    publisher: "OpenCity (Oorvani Foundation)",
    url: "https://data.opencity.in/dataset/road-accidents-in-india-2023",
    format: "csv",
    licence: "CC-BY (per OpenCity)",
    cadence: "annual",
    kpiIds: ["transport.road-fatalities"],
    dashboards: ["kerala-today", "district-performance"],
    accessFriction: "None — CKAN download",
    status: "verified",
    notes:
      "12 CSVs including state-wise accidents & fatalities, large cities, road-user splits. Cleanest path to wire road fatalities KPI.",
  },
  {
    id: "src.kerala-police-road-accidents",
    name: "Kerala Police — road accidents (state)",
    publisher: "Kerala Police",
    url: "https://keralapolice.gov.in/crime/road-accidents",
    format: "html-scrape",
    licence: "Government of Kerala",
    cadence: "monthly",
    kpiIds: ["transport.road-fatalities"],
    dashboards: ["kerala-today"],
    accessFriction: "HTML summary + PDF detail",
    status: "verified",
    notes: "Faster than MoRTH; 2026 partial up to March observed at check.",
  },

  // -------------------------------------------------------------------------
  // Geography / LSG / governance
  // -------------------------------------------------------------------------
  {
    id: "src.opendatakerala-lsg",
    name: "OpenDataKerala — LSG boundaries (admin-level-8)",
    publisher: "OpenStreetMap Kerala Community / Sahya Foundation",
    url: "https://github.com/opendatakerala/lsg-kerala-data",
    format: "geojson",
    licence: "ODbL (OSM)",
    cadence: "ad-hoc",
    dashboards: ["my-panchayat", "district-performance"],
    accessFriction: "Last release Nov 2020 — may be stale",
    status: "verified",
    notes:
      "GeoJSON / KML / Shapefile for Kerala panchayats, municipalities, corporations. Best free boundary set for My Panchayat MVP.",
  },
  {
    id: "src.ksdi-geoportal",
    name: "Kerala State Spatial Data Infrastructure (KSDI)",
    publisher: "KSDI / Kerala IT Mission",
    url: "https://ksdi.kerala.gov.in/ksdi/",
    format: "mixed",
    licence: "Government of Kerala",
    cadence: "ad-hoc",
    dashboards: ["my-panchayat", "crisis"],
    accessFriction: "Downloads only for authorised users; WMS public",
    status: "candidate",
    notes:
      "Useful as a WMS layer host. Open subset at https://opensdi.kerala.gov.in/.",
  },
  {
    id: "src.dop-kerala-population",
    name: "Department of Panchayats — population per Grama Panchayat",
    publisher: "Department of Panchayats, GoK",
    url: "https://dop.lsgkerala.gov.in/en/node/1043",
    format: "html-scrape",
    licence: "Government of Kerala",
    cadence: "ad-hoc",
    dashboards: ["my-panchayat"],
    accessFriction: "HTML / PDF",
    status: "candidate",
    notes: "Likely Census-2011 derived. For LSG population per panchayat.",
  },

  // -------------------------------------------------------------------------
  // Cross-cutting / national portals
  // -------------------------------------------------------------------------
  {
    id: "src.data-gov-in",
    name: "Open Government Data Platform India (OGD)",
    publisher: "NIC / MeitY",
    url: "https://www.data.gov.in/",
    format: "rest-api",
    licence: "GODL-India",
    cadence: "ad-hoc",
    dashboards: [
      "kerala-today",
      "where-my-money-goes",
      "fiscal-health",
      "district-performance",
    ],
    accessFriction:
      "Free API key required (register; key on My Account); rate-limited",
    status: "verified",
    notes:
      "Single biggest catalog. Use the `datagovindia` Python wrapper if useful. The Kerala instance (kerala.data.gov.in) is currently empty.",
  },
  {
    id: "src.ndap-niti",
    name: "NITI Aayog National Data & Analytics Platform (NDAP)",
    publisher: "NITI Aayog",
    url: "https://ndap.niti.gov.in/",
    format: "mixed",
    licence: "Government of India",
    cadence: "ad-hoc",
    dashboards: ["fiscal-health", "district-performance"],
    accessFriction: "Web download (no documented public API)",
    status: "verified",
    notes:
      "Standardised schemas across ministries; good for cross-sector merges.",
  },
  {
    id: "src.sdg-india-index",
    name: "NITI SDG India Index 2023-24",
    publisher: "NITI Aayog",
    url:
      "https://www.niti.gov.in/sites/default/files/2024-07/SDG_India_Index_2023-24.pdf",
    format: "pdf",
    licence: "Government of India",
    cadence: "biennial",
    dashboards: ["kerala-today", "district-performance"],
    accessFriction: "PDF report; dashboard at sdgindiaindex.niti.gov.in",
    status: "verified",
    notes:
      "Kerala scored 79 in 2023-24. Dataful mirror: https://dataful.in/datasets/18700/.",
  },

  // -------------------------------------------------------------------------
  // Promises Tracker / electoral
  // -------------------------------------------------------------------------
  {
    id: "src.myneta-kerala-2026",
    name: "MyNeta (ADR) — Kerala LA 2026 candidate affidavits",
    publisher: "Association for Democratic Reforms (ADR)",
    url: "https://www.myneta.info/Kerala2026/",
    format: "html-scrape",
    licence: "ADR (attribution required)",
    cadence: "ad-hoc",
    dashboards: ["promises-tracker", "department-scorecards"],
    accessFriction: "HTML — well-structured; no API",
    status: "verified",
    notes:
      "Constituency, candidate, assets/liabilities, criminal cases, education. Sourced from ECI affidavit archive.",
  },
  {
    id: "src.eci-results-2026",
    name: "ECI — Kerala LA 2026 results",
    publisher: "Election Commission of India",
    url: "https://results.eci.gov.in/ResultAcGenMay2026/statewiseS111.htm",
    format: "html-scrape",
    licence: "ECI",
    cadence: "ad-hoc",
    dashboards: ["promises-tracker"],
    accessFriction: "Round-wise HTML; Form-20 booth detail as PDF after",
    status: "verified",
    notes: "UDF won 102/140 in May 2026.",
  },
  {
    id: "src.sec-kerala-lsg-elections",
    name: "State Election Commission Kerala — election results",
    publisher: "State Election Commission, Kerala",
    url: "https://www.sec.kerala.gov.in/public/elercd/index/Election_Results",
    format: "html-scrape",
    licence: "Government of Kerala",
    cadence: "ad-hoc",
    dashboards: ["my-panchayat", "promises-tracker"],
    accessFriction: "HTML",
    status: "verified",
    notes: "LSG election results (panchayat/municipality/corporation).",
  },

  // -------------------------------------------------------------------------
  // Civic / research
  // -------------------------------------------------------------------------
  {
    id: "src.shrug",
    name: "SHRUG — village-level socio-economic panel (DDL)",
    publisher: "Development Data Lab (Dartmouth)",
    url: "https://www.devdatalab.org/shrug",
    format: "csv",
    licence: "CC-BY-NC-SA 4.0",
    cadence: "ad-hoc",
    dashboards: ["my-panchayat", "district-performance"],
    accessFriction: "Registration; data ends ~2013",
    status: "verified",
    notes:
      "Census 1991-2011, Economic Census 1990-2013, night-lights, firms. Excellent baseline; not real-time.",
  },
  {
    id: "src.janaagraha-asics",
    name: "Janaagraha ASICS — Annual Survey of India's City-Systems",
    publisher: "Janaagraha",
    url:
      "https://www.janaagraha.org/wp-content/uploads/2024/02/ASICS-2023-data-book.pdf",
    format: "pdf",
    licence: "Janaagraha (citation required)",
    cadence: "annual",
    dashboards: ["department-scorecards", "district-performance"],
    accessFriction: "PDF data book",
    status: "verified",
    notes:
      "Urban governance scorecard incl. Kerala municipalities. Useful comparator.",
  },
  {
    id: "src.accountability-initiative-budget-briefs",
    name: "Accountability Initiative — Budget Briefs (centrally sponsored)",
    publisher: "Centre for Policy Research / Accountability Initiative",
    url: "https://accountabilityindia.in/reports/",
    format: "pdf",
    licence: "CC",
    cadence: "annual",
    dashboards: ["where-my-money-goes", "fiscal-health"],
    accessFriction: "PDF only",
    status: "verified",
    notes:
      "Annual briefs on PMAY, ICDS, MGNREGA, SSA etc. with state allocations.",
  },
  {
    id: "src.indiastat-kerala",
    name: "IndiastatKerala (paywalled)",
    publisher: "Datanet India",
    url: "https://www.indiastatkerala.com/",
    format: "mixed",
    licence: "Commercial subscription",
    cadence: "ad-hoc",
    accessFriction: "Subscription required",
    status: "blocked",
    notes:
      "Aggregated state stats. Avoid unless paid subscription is in scope.",
  },

  // -------------------------------------------------------------------------
  // Government Orders & Bills
  // -------------------------------------------------------------------------
  {
    id: "src.go-portal-kerala",
    name: "Document Portal — Government of Kerala",
    publisher: "IT Mission / C-DIT, Government of Kerala",
    url: "https://document.kerala.gov.in",
    format: "html-scrape",
    licence: "Government of Kerala",
    cadence: "daily",
    dashboards: ["government-orders", "department-scorecards"],
    accessFriction:
      "HTML search + PDF download; default view is last 30 days; advanced search by dept, date, GO type",
    status: "verified",
    notes:
      "Primary hub for all GOs, Circulars, Cabinet Decisions. GO numbers follow G.O.(P|Ms|Rt) No.<n>/<year>/<DeptCode>. Search by GO number for direct lookup.",
  },
  {
    id: "src.go-lsg-kerala",
    name: "LSG Department — Government Orders portal",
    publisher: "Local Self Government Department, GoK",
    url: "https://go.lsgkerala.gov.in",
    format: "html-scrape",
    licence: "Government of Kerala",
    cadence: "daily",
    dashboards: ["government-orders"],
    accessFriction: "HTML; PDF downloads; dept-specific GOs only",
    status: "verified",
    notes:
      "Covers LSG orders, circulars, gazette notifications. Use when the document portal misses an LSG GO.",
  },
  {
    id: "src.niyamasabha-bills",
    name: "Kerala Niyamasabha — Bills Passed",
    publisher: "Kerala Legislative Assembly Secretariat",
    url: "https://niyamasabha.nic.in/index.php/business/index/bills_passed",
    format: "html-scrape",
    licence: "Government of Kerala",
    cadence: "ad-hoc",
    dashboards: ["government-orders", "promises-tracker"],
    accessFriction: "HTML; PDFs of bill text; no API",
    status: "verified",
    notes:
      "Authoritative list of bills passed by the Kerala Legislative Assembly. Also see klaproceedings.niyamasabha.org for digitised archives and kerala.neva.gov.in for session info.",
  },
  {
    id: "src.go-wcd-kerala",
    name: "Women & Child Development — Government Orders",
    publisher: "Women & Child Development Department, GoK",
    url: "https://wcd.kerala.gov.in/gov_orders.php",
    format: "html-scrape",
    licence: "Government of Kerala",
    cadence: "ad-hoc",
    dashboards: ["government-orders"],
    accessFriction: "HTML; PDF download per order",
    status: "verified",
    notes:
      "Department-specific portal for WCD orders. Use as fallback when the main document portal is missing WCD entries.",
  },
];
