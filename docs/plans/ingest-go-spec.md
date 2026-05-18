# Spec — `GovernmentOrder` Data Model

> Version: 1.0 · 2026-05-18 Companion to: `docs/plans/ingest-go.md`
> Implementation: `data/types.ts`, `data/government-orders.ts`

---

## Overview

A `GovernmentOrder` record represents a single Kerala Government Order,
Circular, Statutory Rules & Orders (SRO), or Legislative Bill. It is the
machine-readable form of a document published on an official GoK portal.

Every record is:

- **Traceable** — `meta.sourceUrl` is a mandatory direct link to the PDF or
  portal page. No URL, no record.
- **Tagged** — assigned to a `dept.id` from `data/departments.ts` via the
  two-stage tagging strategy.
- **Confidence-rated** — `deptConfidence` records how the tag was derived so
  consumers know how much to trust it.

---

## Type Reference

```ts
// data/types.ts

export type GoOrderType = "P" | "Ms" | "Rt" | "SRO" | "Circular" | "Bill";

export type DeptTagConfidence = "high" | "medium" | "low";

export interface GovernmentOrder {
  id: string; // go.<year>-<deptCode>-<number>
  goNumber: string; // raw string, e.g. "G.O.(P) No.162/2021/Fin"
  type: GoOrderType;
  subject: string; // English subject line
  subjectMl?: string; // Malayalam — never machine-translate
  deptId?: string; // FK → Department.id; null if low-confidence
  deptConfidence: DeptTagConfidence;
  date: string; // ISO date
  effectiveDate?: string; // ISO date; omit if same as date
  meta: {
    source: string; // human-readable portal name
    sourceUrl: string; // direct PDF / page URL — mandatory
    retrievedAt: string; // ISO timestamp of ingestion
  };
  dataStatus: "verified" | "unverified" | "tbd";
}
```

---

## ID Convention

```
go.<year>-<deptCode-lower>-<number>
```

Examples:

| GO Number                   | id                  |
| --------------------------- | ------------------- |
| G.O.(P) No.162/2021/Fin     | `go.2021-fin-162`   |
| G.O.(Ms) No.45/2024/Rev     | `go.2024-rev-45`    |
| G.O.(Rt) No.1180/2023/H&FWD | `go.2023-hfwd-1180` |
| SRO No.12/2024              | `go.2024-sro-12`    |

If a GO has no dept code (e.g. some Circulars), use `go.<year>-misc-<n>`.

---

## `GoOrderType` Values

| Value      | Meaning                                             |
| ---------- | --------------------------------------------------- |
| `P`        | Policy order (G.O.(P)) — substantive policy changes |
| `Ms`       | Government memo / sanction (G.O.(Ms))               |
| `Rt`       | Routine order (G.O.(Rt)) — appointments, transfers  |
| `SRO`      | Statutory Rules & Orders — rules under Acts         |
| `Circular` | Departmental circular (no formal GO number)         |
| `Bill`     | Legislative Bill passed by Kerala Niyamasabha       |

---

## `deptCode` → `dept.id` Lookup Table

This is the authoritative mapping used in Stage 1 tagging. Update it when a new
department code appears in a GO.

| deptCode (case-insensitive) | dept.id                            |
| --------------------------- | ---------------------------------- |
| `Fin`                       | `dept.finance`                     |
| `Rev`                       | `dept.revenue`                     |
| `H&FWD`, `HFWD`, `HFW`      | `dept.health-family-welfare`       |
| `GAD`, `Gen`                | `dept.cmo`                         |
| `LSG`                       | `dept.local-self-government`       |
| `Edu`, `GEdn`               | `dept.general-education`           |
| `HEdn`                      | `dept.higher-education`            |
| `Home`                      | `dept.home`                        |
| `PWD`                       | `dept.public-works`                |
| `Tran`                      | `dept.transport`                   |
| `Lab`                       | `dept.labour-skills`               |
| `For`                       | `dept.forest-wildlife`             |
| `Ind`                       | `dept.industries-commerce`         |
| `Agri`                      | `dept.agriculture-farmers-welfare` |
| `Coop`                      | `dept.cooperation`                 |
| `Fish`                      | `dept.fisheries-harbour`           |
| `Pwr`, `Elec`               | `dept.power`                       |
| `WR`, `Irr`                 | `dept.water-resources`             |
| `SC/ST`, `SCSTBCD`          | `dept.scheduled-castes-tribes-bcd` |
| `WCD`                       | `dept.women-child-development`     |
| `Tur`                       | `dept.tourism`                     |
| `Vig`                       | `dept.vigilance`                   |
| `Exc`                       | `dept.excise`                      |
| `Plan`                      | `dept.planning-economic-affairs`   |
| `Dev`, `Devaswom`           | `dept.devaswom`                    |
| `Min`                       | `dept.minority-welfare`            |
| `IT`, `ICT`                 | `dept.electronics-it`              |
| `Cult`                      | `dept.cultural-affairs`            |
| `Port`                      | `dept.ports`                       |
| `Yth`                       | `dept.youth-welfare`               |
| `Law`                       | `dept.law`                         |

---

## Tagging Algorithm

```
function tagDept(goNumber, subject):
  # Stage 1 — suffix match (confidence: high)
  deptCode = extractDeptCode(goNumber)   # last segment after final "/"
  if deptCode in LOOKUP_TABLE:
    return { deptId: LOOKUP_TABLE[deptCode], deptConfidence: "high" }

  # Stage 2 — keyword match on subject (confidence: medium)
  for dept in DEPARTMENTS:
    if dept.name in subject or dept.nameMl in subject:
      return { deptId: dept.id, deptConfidence: "medium" }

  # Fallback — ambiguous
  return { deptId: null, deptConfidence: "low" }
```

---

## Tooltip Rule (mandatory)

Any UI component rendering a `GovernmentOrder` **MUST** display a tooltip that
surfaces:

- `meta.source` — the portal name
- `meta.sourceUrl` — as a clickable link to the PDF or page

This applies to every view: table rows, cards, search results, and detail pages.
No tooltip = no merge.

---

## Fixture File

`data/government-orders.ts` exports a single named array:

```ts
export const GOVERNMENT_ORDERS: GovernmentOrder[] = [];
```

When records are added, bump `SEED_VERSION` in `data/db.ts`.

---

## Source Portals (registered in `data/sources.ts`)

| `DataSource.id`         | Primary use                      |
| ----------------------- | -------------------------------- |
| `src.go-portal-kerala`  | All-department GOs and Circulars |
| `src.go-lsg-kerala`     | LSG-specific orders              |
| `src.niyamasabha-bills` | Bills passed by the Legislature  |
| `src.go-wcd-kerala`     | Women & Child Development orders |

For department-specific portals not listed above, use the document portal's
advanced search and filter by the relevant department.
