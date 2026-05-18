# Kerala Mission Control — Governance Data Model

## Entity map

```
Person  ◄──────────────────────────────────────────────────────────────────
  │  (stable human, one record per individual)                             │
  │                                                                        │
  ├──< Minister          (cabinet tenure)                                  │
  │      termStart / termEnd  ← can be days (resignation, reshuffle)      │
  │      rank: CM | Deputy CM | Cabinet | MoS                             │
  │      governmentId ──────────────────► Government                      │
  │      departmentIds[] ───────────────► Department[]                    │
  │      party (denorm abbrev) ─────────► Party                           │
  │                                                                        │
  ├──< Speaker           (assembly tenure)                                 │
  │      rank: Speaker | Deputy Speaker                                    │
  │      assemblyTerm ──────────────────► (12 | 13 | 14 | 15 …)          │
  │      termStart / termEnd  ← can be days (death, resignation)          │
  │                                                                        │
  └──< MemberOfLegislative  (MLA tenure — type defined, data TBD)         │
         assemblyTerm                                                      │
         constituencyId ──────────────── Constituency                     │
         partyId ────────────────────── Party                             │
         termStart / termEnd                                               │
         electedOn, votes, margin                                          │
                                                                           │
Party ◄────────────────────────────────────────────────────────────────────┘
  │  (id: party.cpim, abbreviation: "CPI(M)")
  └──< CoalitionMembership
         coalition: LDF | UDF | NDA | Other
         termStart / termEnd   ← tracks party switches across elections
```

## Key design decisions

| Decision                                         | Rationale                                                                                                                                                                                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Person is the stable node**                    | A minister who serves in 3 cabinets gets 3 Minister records but 1 Person record. `personId` is the FK that links them.                                                                                                                   |
| **CM and Deputy CM are not separate entities**   | They are `Minister` records with `rank: "CM"` / `"Deputy CM"`. `Government.cmMinisterId` is a convenience pointer.                                                                                                                       |
| **Speaker is separate from Minister**            | Speakers vacate party membership on election to office and hold no portfolio. Only needs `personId + assemblyTerm + rank`.                                                                                                               |
| **Every tenure has `termStart` / `termEnd`**     | Applies to Minister, Speaker, MemberOfLegislative, and CoalitionMembership. `termEnd` is undefined for incumbent. Durations can be as short as one day (Saji Cherian resigned 2022-07-05, reinstated 2022-08-25 — two Minister records). |
| **`party` on Minister is denormalized**          | A single KV read returns a renderable Minister card without a join to Party. `partyId?` is the FK for relational lookups.                                                                                                                |
| **`constituency` on Minister is denormalized**   | Same reason. `constituencyId?` is the FK once Constituency data is populated.                                                                                                                                                            |
| **CoalitionMembership tracks party switches**    | RSP: LDF → UDF in 2011. KC(M): UDF → LDF in 2021. Without this table, historical "who was in which coalition" queries are wrong.                                                                                                         |
| **MemberOfLegislative is typed but data is TBD** | 140 MLA records × N elections is a large dataset. Type exists; seed is empty until election data is sourced from CEO Kerala / ECI.                                                                                                       |

## `termStart` / `termEnd` on every tenure

Every office-bearing entity uses the same two fields:

```
termStart: string   // ISO date — when the person took the role
termEnd?: string    // ISO date — when they left; undefined = still in post
```

This covers:

- A minister sworn in and out on the same day (hypothetical but valid)
- A Speaker who dies in office (`termEnd` = death date, e.g. G. Karthikeyan
  2015-03-07)
- A Deputy Speaker who resigns to become Speaker (N. Sakthan: Deputy termEnd =
  2015-03-10, Speaker termStart = 2015-03-12)
- Mid-cabinet reshuffles where an MLA was dropped and re-added months later
  (Saji Cherian, M. B. Rajesh)

## KV key layout

```
["person", id]                         → Person
["party", id]                          → Party
["coalition", id]                      → CoalitionMembership
["government", id]                     → Government
["minister", id]                       → Minister
["speaker", id]                        → Speaker
["dept", id]                           → Department
["kpi", id]                            → Kpi

Secondary indexes:
["minister_by_govt",   govtId, minId]  → null
["minister_by_person", personId, minId] → null
["coalition_by_party", partyId, cId]   → null
["speaker_by_term",    term, speakerId] → null
["dept_by_minister",   minId, deptId]  → null
["kpi_by_dept",        deptId, kpiId]  → null
["kpi_by_domain",      domain, kpiId]  → null
```

## ID conventions

| Entity               | Pattern                              | Example                                             |
| -------------------- | ------------------------------------ | --------------------------------------------------- |
| Person               | `person.<slug>`                      | `person.pinarayi-vijayan`                           |
| Party                | `party.<abbrev-lowercase>`           | `party.cpim`                                        |
| Coalition membership | `cm.<party-slug>-<coalition>[-year]` | `cm.rsp-ldf-2006`                                   |
| Government           | `govt.<slug>`                        | `govt.pinarayi-2`                                   |
| Minister tenure      | `min.<person-slug>[-year]`           | `min.pinarayi-vijayan`, `min.pinarayi-vijayan-2016` |
| Speaker tenure       | `speaker.<person-slug>-<term>`       | `speaker.an-shamseer-15`                            |
| MLA tenure           | `mla.<person-slug>-<term>`           | `mla.pinarayi-vijayan-15`                           |
| Department           | `dept.<slug>`                        | `dept.finance`                                      |
| Constituency         | `constituency.<slug>`                | `constituency.dharmadam`                            |

Minister slug convention:

- Current cabinet (no `termEnd`): no year suffix — `min.pinarayi-vijayan`
- Historical: year suffix of swearing-in — `min.pinarayi-vijayan-2016`

## Data files

| File                  | Entity                     | Records (2026-05-18)       |
| --------------------- | -------------------------- | -------------------------- |
| `data/persons.ts`     | Person                     | 78                         |
| `data/parties.ts`     | Party, CoalitionMembership | 10 parties, 11 memberships |
| `data/governments.ts` | Government                 | 4 (12th–15th KLA)          |
| `data/ministers.ts`   | Minister                   | 80 (4 cabinets)            |
| `data/speakers.ts`    | Speaker                    | 9 (12th–15th KLA)          |
| `data/departments.ts` | Department                 | 33                         |
| `data/kpis.ts`        | Kpi                        | 13 headline KPIs           |

## What is not yet modelled

- `Constituency` — type defined in `types.ts`; 140 records needed (source: ECI
  Delimitation Order)
- `MemberOfLegislative` — type defined; election data from CEO Kerala / ECI
  results
- `Secretary` — type defined; IAS posting data from KAR / DOPT circulars
