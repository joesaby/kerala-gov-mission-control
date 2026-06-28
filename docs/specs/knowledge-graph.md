# Specification: Knowledge graph

> Status: Living spec for the **implemented** graph (`lib/graph.ts`). For the
> original design rationale, UI mockups, and the edge-native KV tradeoffs, see
> the proposal `docs/plans/kv-graph-spec.md`. When the two disagree, this file
> wins — it describes the code as it actually runs.

The dashboard keeps a small **knowledge graph** over its entities so a page can
answer relational questions — "which GOs impact this KPI?", "who currently holds
the Finance portfolio?", "which office did this appointment fill?" — with a
one-hop adjacency lookup instead of scanning a fixture.

## 1. Core principle — derived projection, never a second source of truth

The graph is **derived** from the typed fixtures and the durable runtime mirrors
(`["go_ingested"]`, `["appointment_ingested"]`). It is rebuilt wholesale by
`buildGraph()` on every `SEED_VERSION` bump, and kept current at runtime by the
`sync*` helpers the ingest pipeline calls. So:

- **Never** write a fact only into the graph. Put it on the entity record; the
  graph re-derives from there.
- A bad or stale projection is always fixable by a reseed — the edges carry no
  information the records don't.

## 2. Storage

Three Deno KV key spaces (`data/db.ts` layout comment is the canonical list):

```
["nodes", id]                            -> GraphNode
["edges_out", sourceId, type, targetId]  -> GraphEdge   (adjacency list)
["edges_in",  targetId, type, sourceId]  -> GraphEdge   (inverted index)
```

`id` is the **existing entity id verbatim** (`dept.finance`, `go.2026-fin-162`,
`appt.2026-fin-162-0`) so edges reference real records. Edge writes are atomic
across both indexes (`putEdge`) so the two can never diverge. Reads are not
snapshot-consistent — fine for a read-mostly public store.

## 3. Vocabulary

Every node/edge type used in code MUST appear in `GraphNodeType` /
`GraphEdgeType` (`data/types.ts`).

### Node types (`GraphNodeType`)

| type                 | entity             | builder             |
| -------------------- | ------------------ | ------------------- |
| `kpi`                | `Kpi`              | `kpiNode`           |
| `department`         | `Department`       | `deptNode`          |
| `person`             | `Person`           | `personNode`        |
| `government_order`   | `GovernmentOrder`  | `orderNode`         |
| `manifesto_goal`     | `ManifestoGoal`    | `goalNode`          |
| `status_paper_vital` | status-paper vital | (status-paper path) |
| `appointment`        | `Appointment`      | `appointmentNode`   |

### Edge types (`GraphEdgeType`)

| type             | source → target                     | meaning / properties                            |
| ---------------- | ----------------------------------- | ----------------------------------------------- |
| `OWNED_BY`       | kpi → department                    | KPI's accountable department                    |
| `CONTRIBUTES_TO` | kpi → department                    | secondary contributing department               |
| `PORTFOLIO`      | person → department                 | minister tenure; `{termStart, termEnd}`         |
| `ISSUED_BY`      | government_order → department       | issuing dept; `{date, confidence}`              |
| `IMPACTS`        | government_order → manifesto_goal   | GO backs a pledge; `{date, confidence}`         |
| `REFERENCES`     | government_order → government_order | citation; `{relation, date}`                    |
| `BASELINES`      | status_paper_vital → kpi            | vital establishes a KPI baseline                |
| `APPOINTED_TO`   | appointment → department            | places a holder; `{termStart, termEnd, branch}` |
| `APPOINTEE`      | appointment → person                | only when a confident person match exists       |
| `EVIDENCED_BY`   | appointment → government_order      | the order that made the appointment             |

### Tenure semantics (the active-holder convention)

`PORTFOLIO` and `APPOINTED_TO` carry `termStart` / `termEnd`. **An undefined
`termEnd` means the holder is current** — this is how the active holder is found
(`getKpiLineage` does `.find((e) => e.properties?.termEnd === undefined)`). When
a new holder supersedes a prior one, the writer closes the prior record by
setting its `termEnd` (see `putIngestedAppointment` + `officeKey` in
`data/db.ts`), and the graph re-projects from the updated records.

## 4. How to add a node / edge type

When you add an entity that **relates to existing entities**, project it:

1. **Extend the vocabulary** — add to `GraphNodeType` / `GraphEdgeType` in
   `data/types.ts` (and a one-line description in the doc comment).
2. **Add pure builders** in `lib/graph.ts`: `<entity>Node(rec)` and
   `<entity>Edges(rec)`. Keep them pure (record in, node/edge out) and
   **exported**, so they're unit-tested without KV (see `lib/graph_test.ts`).
   Carry `labelMl` on the node and emit an edge only when its endpoint id exists
   on the record (a missing FK ⇒ no edge, not a dangling one).
3. **Add a `sync<Entity>Graph(rec)`** modeled on `syncOrderGraph` /
   `syncAppointmentGraph`: `putNode`, clear the node's **outgoing** edges, then
   re-add each edge whose **target node already exists**
   (`if (await
   getNode(e.targetId))`). Clearing outgoing edges first makes
   re-extraction idempotent. Call it from the entity's `putIngested*` writer
   (best-effort — a graph-write failure must not fail ingest, since the next
   reseed rebuilds it).
4. **Wire `buildGraph()`** — read the entity's `["<entity>"]` prefix, write its
   nodes in the node pass, and add `...recs.flatMap(<entity>Edges)` to the edge
   pass.
5. **Seed ordering** — endpoint nodes must exist before edges. `buildGraph`
   writes all nodes first, then edges with `requireNodes: false`. If the entity
   has a durable mirror, re-hydrate it **before** `buildGraph()` so its nodes
   are present (see the `["appointment_ingested"]` rehydration in `seed()`).
6. **Bump `SEED_VERSION`** and add the new prefixes to the `seed()` wipe list.
7. **Test** the projections in `lib/graph_test.ts`.

### Gotcha — silently dropped edges

`syncOrderGraph` / `syncAppointmentGraph` add an edge **only when its target
node already exists**. An edge to a node that hasn't been projected yet is
silently skipped (by design — no dangling edges). So if an edge "disappears",
check that the target was seeded/rehydrated **before** `buildGraph()` ran.

## 5. Bilingual & provenance invariants

Every displayable node carries its `*Ml` counterpart (on `label`/`labelMl` or in
`properties`), and components select EN vs ML on `state.lang`. The graph never
launders provenance: machine-drafted records
(`translationStatus:
"machine-draft"`, `dataStatus: "unverified"` — e.g.
ingested appointments) project as-is, and the UI shows the same caveat it would
on the record.

## 6. Traversal patterns

- **Hub nodes** (a department with hundreds of GO edges): use
  `getNeighborsByType(id, TYPE, dir)` to scope the prefix scan — never
  `getNeighbors` on a hub.
- **Active holder**: filter incident tenure edges for `termEnd === undefined`.
- **Lineage payloads**: assemble one struct per page (see `getKpiLineage`)
  rather than traversing in the component.
- **KPI ↔ manifesto promise bridge**: `ManifestoGoal.relatedKpiIds` is a
  **curated** list of KPI ids this promise is tracked against — never inferred
  from shared category/domain. UI promise-backed GOs for a KPI come from
  `getKpiPromiseBackedOrders(kpiId)`, which joins:
  `kpi ←relatedKpiIds— goal ←IMPACTS— government_order`. Goals with no
  `relatedKpiIds` entry for the KPI are excluded even when their
  `ManifestoCategory` matches the KPI's `CivicDomain`.
