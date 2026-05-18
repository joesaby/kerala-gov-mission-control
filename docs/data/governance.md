# Governance entity sources

Sources for cabinets, ministers, departments, secretaries, constituencies,
manifestos, and election results. These feed the `/gov` route and any KPI that
needs an "owner" or "minister-of-record" attribution.

---

## English Wikipedia — Kerala ministry articles

- **URL:** https://en.wikipedia.org/wiki/Second_Pinarayi_Vijayan_ministry
- **Also:** `First_Pinarayi_Vijayan_ministry`, `Oommen_Chandy_ministry`,
  `V._S._Achuthanandan_ministry`, `Council_of_Ministers_of_Kerala`
- **Owner:** Wikipedia community
- **What it provides:** Complete cabinet rosters by term, with portfolios,
  constituencies, parties, swearing-in date, reshuffles.
- **Feeds:** `Government`, `Minister` (governmentId, departmentIds, rank,
  inOfficeSince/Until, party, constituency).
- **Format:** HTML article + structured infobox + cabinet table.
- **API auth:** None. Use the MediaWiki API for structured access:
  `https://en.wikipedia.org/w/api.php?action=parse&page=Second_Pinarayi_Vijayan_ministry&format=json`
- **Update cadence:** Updated by editors within days of a reshuffle.
- **Licence:** CC BY-SA 4.0 (attribution + share-alike).
- **Sync notes:** Parse the "Council of Ministers" wikitable. Slugs of minister
  Wikipedia pages give us a stable join key into Commons.
- **Last verified:** 2026-05-18

## Malayalam Wikipedia — ml.wikipedia.org

- **URL:** https://ml.wikipedia.org/wiki/കേരളത്തിലെ_മന്ത്രിസഭ
- **What it provides:** Malayalam-script names (`nameMl`), constituency, party
  for ministers and former ministers.
- **Feeds:** `Minister.nameMl`, `Department.nameMl`, future bilingual UI.
- **API auth:** None — same MediaWiki API at `ml.wikipedia.org/w/api.php`.
- **Sync notes:** Cross-reference via Wikidata QID (see below) rather than
  string matching, which fails on transliteration variance.

## Wikidata — query.wikidata.org/sparql

- **URL:** https://query.wikidata.org/sparql
- **Owner:** Wikimedia Foundation
- **What it provides:** Structured records for every minister (`P39` position
  held), the cabinet they sit in, parties (`P102`), constituencies (`P768`),
  date of birth, image (`P18`), Commons category (`P373`), and cross-language
  labels.
- **Feeds:** Everything in `Minister`, `Government`, `Department`. Single source
  of truth for the join across languages and photos.
- **Format:** SPARQL → JSON.
- **API auth:** None, but include a descriptive `User-Agent`.
- **Update cadence:** Continuously edited; pull weekly.
- **Licence:** CC0 (public domain — no attribution required, but credit is good
  practice).
- **Sync notes:** One SPARQL query can yield "all current Kerala cabinet
  ministers with EN+ML labels + image filename." See `sync-plan.md` for the
  recommended query shape.
- **Last verified:** 2026-05-18

## Wikimedia Commons — minister portraits

- **URL:** https://commons.wikimedia.org/wiki/Category:Ministers_of_Kerala
- **Also:** per-person categories like `Category:Pinarayi_Vijayan`,
  `Category:V._D._Satheesan`.
- **What it provides:** Direct image URLs for `Minister.photoUrl`.
- **Feeds:** `Minister.photoUrl`, `Minister.photoCredit`.
- **Format:** Image binaries + JSON metadata via the Commons API:
  `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata&titles=File:…`
- **Update cadence:** Stable — once a Commons file exists at
  `upload.wikimedia.org/wikipedia/commons/...`, the URL doesn't change.
- **Licence:** Per-file (CC BY-SA 4.0, CC BY 4.0, CC0, GFDL, public domain).
  Must store the licence string per image — that's what `Minister.photoCredit`
  is for.
- **Sync notes:** **Always store the original** `upload.wikimedia.org/...` URL,
  not the `/thumb/.../NNNpx-...` variant — thumbnails are cache-busted. If we
  need scaled images, re-derive via the API at ingest time.
- **Last verified:** 2026-05-18

## Kerala Legislative Assembly — niyamasabha.org

- **URL:** https://niyamasabha.org
- **Owner:** Kerala Niyamasabha Secretariat
- **What it provides:** Sitting MLAs by constituency, questions tabled, bills
  passed, committee membership.
- **Feeds:** `Minister.constituency` validation; future "what has this minister
  been asked in the assembly" view.
- **Format:** HTML (no public API).
- **Update cadence:** Updated per assembly session.
- **Licence:** Unclear — official GoK publication, treat as fair-use with
  attribution.
- **Sync notes:** Polite scraper with cache; respect `robots.txt`.

## CEO Kerala — Chief Electoral Officer

- **URL:** https://www.ceo.kerala.gov.in/elections/legislative-assembly-2026
- **Also:** https://ceo.kerala.gov.in (root portal).
- **What it provides:** Electoral rolls (Excel + PDF voter list),
  constituency-wise winners, Form-20 booth-level results PDFs, affidavits, Model
  Code of Conduct circulars per election cycle.
- **Feeds:** Historical `Minister.constituency`, party splits, election result
  chips on `/gov/?g=<term>` headers; Form-20 underlies any booth-level
  analytics.
- **Format:** HTML + downloadable PDF/XLS.
- **API auth:** None.
- **Update cadence:** Event-driven (per election); rolls revised periodically.
- **Licence:** Public record.
- **Sync notes:** Cache eternally per election — values are immutable. LA 2026
  page verified 2026-05-18.
- **Last verified:** 2026-05-18

## ECI — Live results portal

- **URL:** https://results.eci.gov.in/ResultAcGenMay2026/statewiseS111.htm
- **Owner:** Election Commission of India.
- **What it provides:** Round-wise live results during counting; state-wise
  (S111 = Kerala) constituency-by-constituency status, leading margins, declared
  winners.
- **Feeds:** Real-time election-night `Government` and `Minister` updates during
  counting; permanent record after declaration.
- **Format:** HTML (round-wise) + Form-20 PDFs after.
- **API auth:** None.
- **Update cadence:** Real-time on counting day; static after.
- **Licence:** Public record.
- **Sync notes:** URL pattern includes the state code (S111 = Kerala) and
  election ID (`AcGenMay2026`); template a new fetcher per cycle. Verified
  2026-05-18.
- **Last verified:** 2026-05-18

## Affidavits & profiles — MyNeta (ADR)

- **URL:** https://www.myneta.info/Kerala2026/
- **Also:** https://myneta.info (root — index of all states + LS/RS).
- **Owner:** Association for Democratic Reforms.
- **What it provides:** Structured candidate affidavits — declared assets,
  liabilities, criminal cases, education. Kerala 2026 LA is fully live with all
  140 constituencies.
- **Feeds:** **Promises Tracker** (Tier-1 roadmap) candidate profiles;
  `Minister.profile` (assets, cases) for accountability.
- **Format:** HTML (scrapeable, well-structured) + downloadable CSV per
  election.
- **API auth:** None.
- **Update cadence:** Event-driven — per election cycle.
- **Licence:** "Free for public use with attribution" (ADR licence).
- **Sync notes:** GREEN — well-structured HTML, all 140 constituencies available
  for LA 2026. Verified 2026-05-18 (URL upgraded to the Kerala2026-specific
  landing).
- **Last verified:** 2026-05-18

## Kerala State Election Commission

- **URL:** https://www.sec.kerala.gov.in/public/elercd/index/Election_Results
- **Also:** https://lsgelection.kerala.gov.in (older companion portal).
- **What it provides:** Local Self-Government election results — Grama
  Panchayats, Block Panchayats, District Panchayats, Municipalities,
  Corporations. Candidate-level results with party.
- **Feeds:** **"My Panchayat"** Tier-1 roadmap dashboard; LSG governance
  metadata.
- **Format:** HTML + PDF.
- **API auth:** None.
- **Update cadence:** Event-driven (LSG elections every 5 years).
- **Licence:** Public record.
- **Sync notes:** AMBER — structured but no API. Election results landing page
  verified 2026-05-18.
- **Last verified:** 2026-05-18

## DoPT — Supremo Civil List

- **URL:** https://supremo.nic.in/
- **Owner:** Department of Personnel & Training, GoI.
- **What it provides:** Authoritative IAS / IPS / IFoS officer roster — cadre,
  batch, current posting, joining date. Downloadable PDF for the Kerala cadre.
- **Feeds:** **"HR & Capacity"** Tier-3 dashboard; secretary-of-record
  attribution on `Department` records.
- **Format:** PDF + searchable web UI.
- **API auth:** None.
- **Update cadence:** Continuous (postings update as orders are issued).
- **Licence:** Government of India.
- **Sync notes:** AMBER — scrape the Kerala cadre PDF on a weekly schedule.
  Verified 2026-05-18.
- **Last verified:** 2026-05-18

## Press Information Bureau — PIB Kerala

- **URL:** https://pib.gov.in/Pibcms/RegionalReleases.aspx
- **What it provides:** Official press releases including
  swearing-in/portfolio-allocation Government Orders.
- **Feeds:** `Minister.source`, `Government.source` corroboration.
- **Format:** HTML + linked PDFs.
- **Update cadence:** As-events-occur.
- **Licence:** GoI press release — free to reuse with attribution.

## Kerala Gazette

- **URL:** https://www.egazette.kerala.gov.in
- **What it provides:** Authoritative Government Orders — portfolio allocations,
  department restructures, IAS postings.
- **Feeds:** Highest-confidence `source` for `Minister` and `Department`
  records.
- **Format:** PDF.
- **Update cadence:** Continuous.
- **Licence:** Public record.
- **Sync notes:** Search-by-date is the only practical entry point; OCR layer is
  needed for older scans.
