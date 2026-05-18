# Media, reference & verification sources

Cross-language labels, photos, fact-checking, primary-source links.

---

## Wikidata SPARQL endpoint

- **URL:** https://query.wikidata.org/sparql
- **What it provides:** Structured records for every public figure,
  political party, constituency, government, ministry — with multi-language
  labels (EN, ML, HI, TA), birth dates, party affiliations, position-held
  intervals (`P39` + `P580` start / `P582` end), Commons image filenames.
- **Feeds:** `Minister.nameMl`, `Minister.photoUrl`, party tags,
  constituency labels, and the join key that ties Wikipedia, Commons, and
  Malayalam Wikipedia together.
- **Format:** SPARQL → JSON.
- **API auth:** None — supply a descriptive `User-Agent`.
- **Update cadence:** Continuously edited; weekly sync suffices.
- **Licence:** CC0 (public domain).
- **Sync notes:** See `sync-plan.md` for the recommended SPARQL query.

## English Wikipedia

- **URL:** https://en.wikipedia.org and https://en.wikipedia.org/w/api.php
- **What it provides:** Long-form prose, cabinet rosters, term tables,
  reshuffle history, biographical summary.
- **Feeds:** `Minister.summary`, `Government.summary`, `Minister.wikipediaUrl`.
- **API:** MediaWiki Action API and REST `summary` endpoint.
- **Update cadence:** Edited within days of events.
- **Licence:** CC BY-SA 4.0.

## Malayalam Wikipedia

- **URL:** https://ml.wikipedia.org and https://ml.wikipedia.org/w/api.php
- **What it provides:** Malayalam-script `nameMl` for every minister,
  department, scheme.
- **Feeds:** `Minister.nameMl`, `Department.nameMl`, `Kpi.titleMl`.
- **API:** Same MediaWiki API; pass `&prop=langlinks&lllang=ml` against an
  EN page to get the ML title.

## Wikimedia Commons

- **URL:** https://commons.wikimedia.org and
  https://commons.wikimedia.org/w/api.php
- **What it provides:** Freely-licensed portraits, logos, building photos.
- **Feeds:** `Minister.photoUrl`, future `Department.photoUrl` /
  building photos for `/gov/departments/[slug]` heroes.
- **Format:** Image binaries + JSON metadata.
- **Licence:** Per-file (typically CC BY-SA 4.0 or CC BY 4.0).
- **Sync notes:** Persist the licence string with the URL.

## Wikipedia REST API — page summary

- **URL:** https://en.wikipedia.org/api/rest_v1/page/summary/<Title>
- **What it provides:** One JSON document per page containing extract,
  original image, dates, description. Faster than the full MediaWiki API.
- **Feeds:** `Minister` initial seed pass.
- **Rate limits:** ~200 req/s with `User-Agent`.

## DBpedia / SPARQL (alternative to Wikidata)

- **URL:** https://dbpedia.org/sparql
- **What it provides:** Same shape as Wikidata, derived from Wikipedia
  infoboxes.
- **Feeds:** Backup when Wikidata QIDs are missing.

## OpenStreetMap — Kerala administrative boundaries

- **URL:** https://www.openstreetmap.org and https://overpass-api.de
- **What it provides:** District, taluk, panchayat, ward polygons.
- **Feeds:** Future "My Panchayat" route geometries.
- **Licence:** ODbL.

## Wikipedia infobox parsing

- **URL:** Use `?action=parse&page=...&prop=wikitext` on en.wikipedia.org
- **Sync notes:** Cabinet articles like `Second_Pinarayi_Vijayan_ministry`
  have tabular wikitext that maps cleanly to `Minister` records.

## Fact-checking / corroboration

- **The Hindu Data Point** — https://www.thehindu.com/data/
- **Indian Express explained / data** — https://indianexpress.com
- **The Wire / Newslaundry / Newsclick / The News Minute** — long-form
  political reporting and FOI / RTI investigations.
- **The Print's "On My Mind" + ThePrint data** — https://theprint.in
- **PRS Legislative Research** — https://prsindia.org (already in
  `fiscal.md`).

These media sources are used for **corroboration**, not as primary data.
Cite them in `Kpi.meta.source` only when no government primary source
exists for a number we still want to publish (e.g., a journalist's FOI
disclosure).
