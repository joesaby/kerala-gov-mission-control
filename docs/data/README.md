# Open data sources for Kerala Mission Control

This folder catalogs the open / official data sources we can pull from to keep
the dashboard real instead of illustrative. Each file lists endpoints, what they
can populate, update cadence, format, licence, and notes for an automated sync.

> Rule of the project: if we can't name the source, we can't publish the number.
> Everything we ingest must land in a typed fixture with `source`, `sourceUrl`,
> `updateFrequency`, and `lastRefreshed`.

## Files

| File                                         | Scope                                                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [`governance.md`](./governance.md)           | Cabinets, ministers, departments, secretaries, constituencies, election results, manifestos. |
| [`panchayat.md`](./panchayat.md)             | LSG boundaries, Grama Panchayat population, LSG dashboards, K-SMART, KSDI geo layers.        |
| [`fiscal.md`](./fiscal.md)                   | Budget, debt, KIIFB, GSDP, tax collections, CAG audits, FRBM compliance.                     |
| [`health.md`](./health.md)                   | NFHS, SRS, HMIS, vector-borne disease bulletins, hospital infrastructure.                    |
| [`education.md`](./education.md)             | UDISE+, PGI, NAS, higher-education AISHE, KITE.                                              |
| [`livelihood.md`](./livelihood.md)           | PLFS, MGNREGA, unemployment, Kudumbashree, KSDP, industries, tourism.                        |
| [`safety.md`](./safety.md)                   | NCRB, Kerala Police thuna portal, road safety, women's safety, disaster.                     |
| [`environment.md`](./environment.md)         | KSPCB, forests, climate plan, air/water quality.                                             |
| [`transport.md`](./transport.md)             | MVD, KSRTC, road accidents, Kochi Metro, port traffic.                                       |
| [`procurement.md`](./procurement.md)         | e-tenders, GeM, Open Contracting (OCDS) candidates.                                          |
| [`comparators.md`](./comparators.md)         | All-India and peer-state benchmarks (NITI SDG, RBI Handbook).                                |
| [`media-reference.md`](./media-reference.md) | Wikimedia Commons, Wikidata, fact-checking and verification.                                 |
| [`sync-plan.md`](./sync-plan.md)             | Recommended cron cadence + pipeline shape for each source.                                   |

## How each entry is shaped

Every source entry follows the same skeleton so a future ingest script can read
this folder as structured metadata if needed:

```markdown
### <Source name>

- **URL:** https://…
- **Owner:** <Department / agency>
- **What it provides:** <one-line>
- **Feeds:** <which KPI ids / entity types this populates>
- **Format:** HTML | PDF | CSV | XLS | JSON | API
- **API auth:** none | api key | OAuth
- **Update cadence:** real-time | daily | weekly | monthly | quarterly | annual
- **Licence:** <e.g. GoI OGD Licence, CC BY 4.0, public domain, unclear>
- **Robots / rate-limit notes:** …
- **Sync notes:** <how we'd ingest — e.g. "scrape PDF table 3, columns 2-5">
- **Last verified:** YYYY-MM-DD
```

Keeping the shape uniform means we can build a tiny script later that lints
every entry and emits a machine-readable `sources.json`.
