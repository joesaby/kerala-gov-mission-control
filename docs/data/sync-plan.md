# Sync plan & recommended cadences

A practical breakdown of how each source category should be ingested, how often,
and what shape the pipeline should take. The dashboard's `updateFrequency` field
on each KPI must match the slowest upstream dependency.

---

## Cadence buckets

| Cadence                | Sources                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| **Real-time / hourly** | KSEB generation, CPCB AQI stations, Helpline 112 stats, Kerala e-Tenders new postings.              |
| **Daily**              | MGNREGA MIS, Jal Jeevan Mission, KSEB daily generation summary, MVD Vahan exports.                  |
| **Weekly**             | Wikidata + Wikipedia + Commons (governance metadata), DHS communicable-disease bulletins.           |
| **Monthly**            | KSPCB air & water bulletins, GST collections, KSRTC stats, NHM HMIS roll-ups.                       |
| **Quarterly**          | RBI quarterly indicators, PLFS quarterly (urban), KIIFB board reports.                              |
| **Annual**             | Kerala Budget, Economic Review, SRS/NFHS, ISFR (biennial), CAG audits, UDISE+, NCRB, PGI.           |
| **Event-driven**       | Election results (every 5 years), Cabinet reshuffles, Gazette publications, CAG performance audits. |

---

## Suggested pipeline shape

```
┌───────────────────────────────┐
│  Scheduled fetchers (cron)    │
│  one job per source-category  │
└─────────────┬─────────────────┘
              │ raw HTML/PDF/CSV/JSON
              ▼
┌───────────────────────────────┐
│  Stage: raw/<source>/<date>/  │
│   (immutable, version-pinned) │
└─────────────┬─────────────────┘
              ▼ parsers
┌───────────────────────────────┐
│  Normalize → typed records    │
│   matching data/types.ts      │
└─────────────┬─────────────────┘
              ▼ diff + verify
┌───────────────────────────────┐
│  Atomic upsert into Deno KV   │
│  + write provenance row       │
└───────────────────────────────┘
```

Two principles to preserve from the start:

1. **Always keep raw**. The parser will change; the raw is the ground truth and
   lets us re-derive without re-fetching.
2. **Provenance is a first-class record**. Every upsert writes a row
   `(entityId, fetchedAt, sourceUrl, sha256OfRaw)` so the dashboard can render
   "this number came from <source>, fetched <when>, hash <…>".

---

## Recommended cron schedule (Deno Cron / Deno Deploy)

| Job                          | Cron expr (IST) | Owns                                                   |
| ---------------------------- | --------------- | ------------------------------------------------------ |
| `governance:wikidata-weekly` | `0 3 * * 1`     | Minister/Department/Government metadata + photos.      |
| `commons:photo-revalidate`   | `0 4 * * 1`     | HEAD every photoUrl, flag 404s.                        |
| `fiscal:gst-monthly`         | `0 6 1 * *`     | GST collections from PIB.                              |
| `health:weekly-dhs-bulletin` | `0 6 * * 2`     | DHS communicable-disease counts.                       |
| `livelihood:mgnrega-daily`   | `30 7 * * *`    | Person-days, average wage.                             |
| `safety:keralapolice-daily`  | `0 8 * * *`     | 112 response, women-helpline.                          |
| `environment:kspcb-monthly`  | `0 9 5 * *`     | Air & water bulletins.                                 |
| `tenders:etenders-hourly`    | `15 * * * *`    | New tenders + award notices.                           |
| `budget:annual`              | `0 1 15 2 *`    | Kerala Budget PDF parse (mid-Feb release).             |
| `cag:state-finances`         | `0 1 1 12 *`    | CAG state finance audit.                               |
| `environment:aqi-15min`      | `*/15 * * * *`  | CPCB CAAQMS real-time JSON via data.gov.in API.        |
| `transport:morth-annual`     | `0 1 1 1 *`     | MoRTH state road accidents CSV via OpenCity mirror.    |
| `governance:myneta-event`    | event-driven    | MyNeta candidate affidavits, post-LA-election.         |
| `kpis:projection-recompute`  | `0 2 * * *`     | Recompute status/trend deltas off the latest snapshot. |

The dates above are starting heuristics — adjust to match actual publication
patterns once we observe a few cycles.

---

## Wikidata SPARQL seed query

A starting query for `governance:wikidata-weekly`. Run against
`https://query.wikidata.org/sparql` with
`Accept: application/sparql-results+json`.

```sparql
SELECT ?minister ?ministerLabel ?ministerLabelMl ?startTime ?endTime
       ?position ?positionLabel ?party ?partyLabel
       ?constituency ?constituencyLabel ?image ?wikipedia
WHERE {
  ?minister p:P39 ?statement .
  ?statement ps:P39 ?position ;
             pq:P580 ?startTime .
  OPTIONAL { ?statement pq:P582 ?endTime }
  OPTIONAL { ?statement pq:P768 ?constituency }
  OPTIONAL { ?minister wdt:P102 ?party }
  OPTIONAL { ?minister wdt:P18 ?image }
  OPTIONAL {
    ?wikipedia schema:about ?minister ;
               schema:isPartOf <https://en.wikipedia.org/> .
  }
  # All Kerala state-cabinet positions (Council of Ministers of Kerala = Q6502154)
  ?position wdt:P361* wd:Q6502154 .
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en,ml" .
    ?minister rdfs:label ?ministerLabel .
    ?minister rdfs:label ?ministerLabelMl FILTER (lang(?ministerLabelMl) = "ml") .
    ?position rdfs:label ?positionLabel .
    ?party rdfs:label ?partyLabel .
    ?constituency rdfs:label ?constituencyLabel .
  }
}
ORDER BY DESC(?startTime)
```

This single query yields enough to populate `Minister` records, complete with
EN + ML labels, party, constituency, photo filename, and Wikipedia URL. Resolve
`?image` to its `upload.wikimedia.org/...` URL with one extra Commons API call
per minister.

---

## Photo handling rules

- **Always store the original `upload.wikimedia.org/wikipedia/commons/...` URL**
  (or `/wikipedia/en/...` for fair-use, with a TODO to relicence).
- **Never store a `/thumb/...` URL** — they're not guaranteed cache-stable.
- **If browser display needs a smaller image**, derive the thumbnail URL at
  render time via Commons' standard pattern, or run a build-time resize step
  into `static/photos/<slug>-NNNw.webp`.
- **Persist the licence string** in `Minister.photoCredit`.
- **Re-validate weekly** with a HEAD request; if a photo 404s, flag
  `Minister.dataStatus = "unverified"` and emit a backlog entry.

---

## Provenance row shape

```ts
interface ProvenanceRow {
  entityKind: "kpi" | "minister" | "department" | "government";
  entityId: string;
  field?: string; // optional — when only one field came from this source
  sourceUrl: string;
  sourceName: string;
  fetchedAt: string; // ISO timestamp
  sha256OfRaw: string; // hash of the bytes we parsed
}
```

Store under KV prefix `["prov", entityKind, entityId, fetchedAt]`. Cap the list
at ~10 most-recent rows per entity to bound storage.

---

## Integration priority — quick wins and access asks

Derived from the 2026-05-18 research pass. The five "quick wins" are the
integrations with the lowest engineering cost and highest dashboard impact —
ship these before deeper scrapes.

### Quick wins (do first)

1. **CPCB CAAQMS real-time AQI** via the data.gov.in resource
   `/resource/real-time-air-quality-index-various-locations`. Free API key from
   data.gov.in, JSON response, GODL-India licence, ~15-min cache recommended.
   Feeds `environment.air-quality`.
2. **MoRTH state-wise road fatalities CSV** via the OpenCity mirror
   (https://data.opencity.in/dataset/road-accidents-in-india-2023). Drop the CSV
   in, refresh annually. Feeds `transport.road-fatalities`.
3. **MyNeta Kerala 2026 candidate scrape** (https://www.myneta.info/Kerala2026/)
   — well-structured HTML, all 140 constituencies. Feeds the Promises Tracker.
4. **PRS Kerala Budget Analysis annual PDF** — table extraction within ~10 days
   of each budget; stable, normalised layout. Feeds `fiscal.revenue-deficit` and
   `fiscal.debt-to-gsdp` headline values.
5. **OpenDataKerala LSG boundaries (GeoJSON)** — vendor the release file
   directly, ODbL-licensed. Feeds the My Panchayat MVP basemap.

### Access asks (would unlock big value but need partnership)

1. **C-DIT / KeralaIT Mission MoU** for e-District + K-SMART per-application
   latency — the only credible path to a real `delivery.service-clock` KPI.
2. **OCDS feed for Kerala e-Tenders** via partnership with the Open Contracting
   Partnership (model: CivicDataLab's Himachal Pradesh programme). Without this
   the Tender & Procurement Hub remains a scrape-and-pray.
3. **KIIFB Project Monitoring Cell field-level data** — converts
   `delivery.kiifb-on-time` ("% projects on schedule") from aspirational to
   defensible.

### Empty-shell warnings

- `kerala.data.gov.in` — returns **0 datasets / 0 catalogs / 0 departments**.
  **Do not depend on it** for any pipeline.
- `dashboard.kerala.gov.in` — TLS certificate chain does not validate against
  standard CA bundles from our crawler. Scrapers must tolerate this (disable
  strict verification with a clear comment) or use browser-driven fetching.
- `pms.kiidc.kerala.gov.in` — TLS certificate **expired**. Page cannot be safely
  fetched until KIIDC renews.

---

## Open items to track

- [ ] Pick a parser for the Kerala Budget PDF (tabula vs camelot vs pdfplumber).
- [ ] Decide whether to mirror Commons photos into `static/` or hot-link.
- [ ] Confirm OGD Platform API key + rate limits.
- [ ] Confirm Wikidata SPARQL `User-Agent` allow-listing.
- [ ] Identify a fallback for ministers without Commons photos (some MoS
      records, P. Prasad, Manjalamkuzhi Ali, K. C. Joseph (Irikkur), V.
      Surendran Pillai).
