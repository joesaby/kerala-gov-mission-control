# Specification: Deno KV Graph Database for Policy & Outcomes

> Version: 1.1 · 2026-06-04 Status: Proposal / Specification Target Location:
> `docs/plans/kv-graph-spec.md`

This document details the database schema, traversal mechanics, and
user-interface representations for a lightweight, edge-native Graph database
built directly on top of **Deno KV** for the Kerala Mission Control platform.

---

## 1. Objectives

1. **Edge-Native Performance:** Low-latency range lookups served from
   edge-replicated KV reads. Note the Deno Deploy KV consistency tradeoff: edge
   replicas are _eventually consistent_, while strongly-consistent reads and all
   writes round-trip to the primary region (tens of ms). We design traversals to
   tolerate eventual consistency on reads.
2. **Causal Tracking:** Link macroeconomic KPIs and fiscal diagnostic data
   directly to executive decisions (Government Orders) and political commitments
   (Manifesto Goals).
3. **Traceability:** Provide citizens with a clear, readable path from any
   numbers on the screen back to primary document sources.
4. **Extensibility:** Support future data points (such as Panchayat scorecards,
   procurement tenders, and public expenditure) without requiring database
   migrations.

---

## 2. Representation (How It Appears to Users)

To make a graph analysis meaningful to the public, it must be represented
visually and interactively in the web interface. We define three primary
representations:

> **Bilingual invariant.** Every displayable node carries its `*Ml` counterpart
> in `properties` (e.g. `subjectMl`, `nameMl`, `labelMl`), and all three
> components below select EN vs ML on `state.lang`. The English-only strings in
> the diagrams are illustrative only — no display string ships without a
> verified Malayalam value (mark the source record `dataStatus: "tbd"` and file
> a translation request if it's missing; never machine-translate government
> terminology).

### A. The "Causal Lineage" Timeline (KPI Detail Page)

When a user views a specific KPI (e.g., `fiscal.debt-to-gsdp`), they see a
timeline that is not just data points, but policy milestones.

```
[Debt to GSDP: 36.4%] 
       │
       ├─ (2026-05-21) Cancelled Silverline Project [GO.2026-TRANS-15] ──► Reduced Projected Capex
       │
       ├─ (2026-04-10) Released ₹500Cr KIIFB Capital Grant [GO.2026-FIN-98] ──► Increased Outstanding Debt
       │
       └─ (2026-03-15) Tabled Fiscal Health Status Paper [StatusPaper-16KLA] ──► Established Baseline
```

- **UI Element:** A vertical lineage tree showing the parent department, the
  current minister, and a chronological stream of `IMPACTS` edges connecting
  recent GOs to the KPI.

### B. Minister Portfolio Network Map (Minister Page)

On a Minister's detail route (e.g., `/gov/ministers/[slug]`), instead of a
static list of departments, we render a localized network:

```
                  ┌──► [dept.finance] ──► [fiscal.revenue-deficit] (improving)
[Minister Node] ──┤
                  └──► [dept.excise] ───► [GO.2026-TAXES-446] (Routine spend)
```

- **UI Element:** An interactive canvas widget (using a lightweight SVG/Canvas
  force-directed layout) showing the minister's span of control, active orders,
  and the current health of their owned KPIs.

### C. Citizen Tooltip Path (Defensibility rule)

Under the **non-negotiable rules**, every KPI card displays a tooltip. The graph
allows us to render a fully qualified "Accountability Chain":

> **Source Path:** CAG Report FY24 ──► Finance Dept. ──► Principal Secretary
> (Finance) ──► GO(P) 162/2021/Fin ──► KPI: Debt-to-GSDP.

---

## 3. Database Schema Design (Deno KV Keys)

To represent nodes and edges without a traditional graph engine, we utilize
three Deno KV key spaces.

**Consistency model (be precise — do not claim blanket ACID):** Edge writes are
atomic — `putEdge`/`deleteEdge` mutate the `edges_out` and `edges_in` index pair
inside a single `kv.atomic()` commit, so the two indexes can never diverge. Node
writes are single `set`s. Reads (`getNeighbors`, `getKpiLineage`) issue multiple
sequential `get`s and are **not** snapshot-consistent — a concurrent write can
produce a torn read. This is acceptable for a read-mostly, public-facing
traversal store, but callers must not assume cross-key atomicity on reads.

### 3.1 Node Key

```
["nodes", id] -> GraphNode
```

- **Node Types** (`type` field): `kpi`, `department`, `person`,
  `government_order`, `manifesto_goal`, `status_paper_vital`.
- **ID convention:** `node.id` **is the existing entity ID** so edges reference
  real records — use the IDs already in the fixtures verbatim. KPIs have **no**
  `kpi.` prefix (the domain is the prefix): `fiscal.debt-to-gsdp`, not
  `kpi.fiscal.debt-to-gsdp`. Departments are `dept.finance`, persons
  `person.<slug>`, GOs the GO id. (See the ID conventions table in `CLAUDE.md`.)
- **Value Structure:**
  ```typescript
  export type GraphNodeType =
    | "kpi"
    | "department"
    | "person"
    | "government_order"
    | "manifesto_goal"
    | "status_paper_vital";

  export interface GraphNode {
    id: string; // Existing entity ID, e.g. "dept.finance", "fiscal.debt-to-gsdp"
    type: GraphNodeType; // Queryable node type
    label: string; // Human-readable display string (EN)
    labelMl?: string; // Malayalam display string (bilingual invariant)
    properties: Record<string, unknown>; // JSON bag of properties (incl. *Ml fields)
  }
  ```

### 3.2 Outgoing Edge Index (Adjacency List)

To find all targets linked _from_ a source node:

```
["edges_out", sourceId, edgeType, targetId] -> GraphEdge
```

### 3.3 Incoming Edge Index (Inverted Index)

To find all sources linking _to_ a target node (crucial for reverse lineage
queries):

```
["edges_in", targetId, edgeType, sourceId] -> GraphEdge
```

- **Edge type vocabulary** (the complete set used across this spec): `IMPACTS`,
  `OWNED_BY`, `PORTFOLIO`, `ISSUED_BY`, `SIGNED_BY`, `BASELINES`,
  `DIAGNOSED_BY`, `BELONGS_TO`, `ALLOCATES_TO`, `IMPROVES`. Extend this list
  when adding edge types — every type used in code must appear here.
- **Edge Value Structure:**
  ```typescript
  export interface GraphEdge {
    sourceId: string;
    targetId: string;
    type: string; // One of the edge type vocabulary above
    properties?: {
      weight?: number; // Causal weight (0.0 to 1.0)
      confidence?: string; // Tagging confidence (high/medium/low)
      date?: string; // ISO date the link occurred
      termStart?: string; // Start date for tenure-based edges
      termEnd?: string; // End date for tenure-based edges
    };
  }
  ```

### 3.4 Source of Truth, Seeding & Durability

The graph is **a derived projection, not a second source of truth.** The
authoritative data stays where it already lives — the typed fixtures in
`data/*.ts` (and, for Government Orders, the durable `["go_ingested", …]`
mirror). Nodes and edges are _generated_ from those records; they are never
hand-authored in parallel. This avoids the drift that would otherwise arise
between, say, `kpi.ownerDeptId` and an `OWNED_BY` edge. Concretely:

- **`PORTFOLIO` edges are derived,** not curated: a minister→department
  `PORTFOLIO` edge with `termEnd` undefined is generated from the existing
  `Minister` records whose `termEnd` is undefined. Same for `OWNED_BY`
  (`kpi.ownerDeptId`) and `IMPACTS` (GO→manifesto-goal tags from ingest).

- **Rebuilt during `seed()`.** Graph population runs inside `seed()` in
  `data/db.ts` after the fixtures load. Adding/changing graph generation
  **requires bumping `SEED_VERSION`** (per the CLAUDE.md rule) or the site keeps
  serving the prior projection.

- **Durability across reseeds (critical).** `seed()` wipes the `["nodes"]`,
  `["edges_out"]`, and `["edges_in"]` prefixes on a `SEED_VERSION` bump. Edges
  derived from cron-ingested GOs must therefore be **rebuilt from
  `["go_ingested", …]`** during the same re-hydration step that restores
  `["go"]` — exactly as the GO durability mechanism already works. Do **not**
  rely on cron-written edges surviving a reseed on their own; if they live under
  the wiped prefixes they are destroyed on the next bump. (Alternative: exempt
  the graph prefixes from the wipe and reconcile incrementally — but rebuild
  from the durable mirror is simpler and matches the existing pattern.)

---

## 4. Tying in Economic Factors

Economic metrics are wired directly into the graph to measure policy outcomes.
We define two key economic node types and their relationship rules:

### 4.1 Node: `Kpi`

Represents macro-economic and social indicators.

- **Edges to create:**
  - `(Kpi)-[:OWNED_BY]->(Department)`
  - `(GovernmentOrder)-[:IMPACTS {weight, impactType: "direct-spend"}]->(Kpi)` —
    see §4.3 for how `weight` is assigned.

### 4.2 Node: `StatusPaperVital`

Represents structural diagnostic baselines from long-form fiscal papers.

- **Edges to create:**
  - `(StatusPaperVital)-[:BASELINES]->(Kpi)`
  - `(StatusPaperVital)-[:DIAGNOSED_BY]->(Department)`

### 4.3 Causal Impact Weighting

When linking a `GovernmentOrder` to a `Kpi` via an `IMPACTS` edge, we record the
following properties to model economic causation:

- `impactType: "direct-spend" | "policy-reform" | "administrative"`
- `weight`: Float (0.0 = negligible, 1.0 = direct driver).
  - _Example:_ A GO cancelling a major capital expenditure project like
    Silverline carries a `weight: 0.9` impact on the `fiscal.debt-to-gsdp`
    projection KPI.

---

## 5. Extensibility (Adding More Data Points)

The key strength of this Deno KV schema is its **schema-less, namespaces-based
design**. Adding a new type of data point in the future requires no table
migrations:

### A. Panchayat Scorecards (Tier-1 Roadmap)

To add local government metrics:

1. Define a node namespace: `panchayat.<id>` (e.g. `panchayat.kumarakom`).
2. Write nodes under `["nodes", "panchayat.kumarakom"]`.
3. Link them to existing departments or KPIs:
   - `("panchayat.kumarakom")-[:BELONGS_TO]->("district.kottayam")`
   - `("go.2026-lsg-44")-[:ALLOCATES_TO {amount: 2500000}]->("panchayat.kumarakom")`

### B. Procurement & Tenders (Tier-2 Roadmap)

To track public contracts:

1. Define a node namespace: `tender.<id>`.
2. Link the tender to the issuing department and the target KPI:
   - `("tender.2026-pwd-12")-[:ISSUED_BY]->("dept.public-works")`
   - `("tender.2026-pwd-12")-[:IMPROVES]->("kpi.transport.road-density")`

---

## 6. Graph API Implementation Blueprint

The following functions will be implemented in `lib/graph.ts` to manage write
operations and traversals.

### 6.1 Transactional Node and Edge Ingestion

`GraphNode`/`GraphEdge` are defined in `data/types.ts` (alongside the other
entity types); `lib/graph.ts` imports them from there.

```typescript
import { kv } from "../data/db.ts";
import { GraphEdge, GraphNode } from "../data/types.ts";

export async function putNode(node: GraphNode): Promise<void> {
  const k = await kv();
  await k.set(["nodes", node.id], node);
}

/**
 * Writes the edge to both adjacency indexes atomically. By default it asserts
 * that both endpoint nodes exist, so we never create dangling edges; pass
 * { requireNodes: false } only for bulk seed paths where node writes are
 * guaranteed to land in the same pass.
 */
export async function putEdge(
  edge: GraphEdge,
  opts: { requireNodes?: boolean } = {},
): Promise<void> {
  const k = await kv();
  const requireNodes = opts.requireNodes ?? true;

  if (requireNodes) {
    const [src, tgt] = await Promise.all([
      k.get<GraphNode>(["nodes", edge.sourceId]),
      k.get<GraphNode>(["nodes", edge.targetId]),
    ]);
    if (!src.value) {
      throw new Error(`Edge source node missing: ${edge.sourceId}`);
    }
    if (!tgt.value) {
      throw new Error(`Edge target node missing: ${edge.targetId}`);
    }
  }

  const op = k.atomic()
    .set(["edges_out", edge.sourceId, edge.type, edge.targetId], edge)
    .set(["edges_in", edge.targetId, edge.type, edge.sourceId], edge);

  const res = await op.commit();
  if (!res.ok) {
    throw new Error(
      `Failed to commit edge: ${edge.sourceId} -> ${edge.targetId}`,
    );
  }
}

/** Deletes both index entries for an edge atomically (must stay in sync). */
export async function deleteEdge(
  sourceId: string,
  type: string,
  targetId: string,
): Promise<void> {
  const k = await kv();
  const res = await k.atomic()
    .delete(["edges_out", sourceId, type, targetId])
    .delete(["edges_in", targetId, type, sourceId])
    .commit();
  if (!res.ok) {
    throw new Error(`Failed to delete edge: ${sourceId} -> ${targetId}`);
  }
}

/**
 * Deletes a node and every edge incident to it (in both directions), so no
 * dangling index entries are left behind. Each edge's index pair is removed
 * atomically.
 */
export async function deleteNode(nodeId: string): Promise<void> {
  const k = await kv();
  const incident = [
    ...await getNeighbors(nodeId, "out"),
    ...await getNeighbors(nodeId, "in"),
  ];
  for (const e of incident) {
    await deleteEdge(e.sourceId, e.type, e.targetId);
  }
  await k.delete(["nodes", nodeId]);
}
```

### 6.2 Neighbor Traversal (Localized Lookup)

> **High-degree caveat:** `getNeighbors` pulls the entire adjacency list into
> memory. Fine for low-degree nodes, but a department with hundreds of incident
> GO edges will load them all on every call. For such hubs, prefer a bounded
> `k.list({ prefix }, { limit })` with cursor pagination, or narrow the prefix
> to a specific edge type (`["edges_in", nodeId, "IMPACTS"]`).

```typescript
export async function getNeighbors(
  nodeId: string,
  direction: "out" | "in" = "out",
): Promise<GraphEdge[]> {
  const k = await kv();
  const prefix = direction === "out"
    ? ["edges_out", nodeId]
    : ["edges_in", nodeId];
  const edges: GraphEdge[] = [];

  for await (const entry of k.list<GraphEdge>({ prefix })) {
    edges.push(entry.value);
  }
  return edges;
}
```

### 6.3 Localized KPI Lineage Traversal

Traverse backwards from a KPI to find its immediate causal factors (Department,
current Minister, and recent impacting GOs) in a single unified payload:

```typescript
export interface KpiLineage {
  kpiNode: GraphNode;
  ownerDept?: GraphNode;
  activeMinister?: GraphNode;
  impactingOrders: { order: GraphNode; edge: GraphEdge }[];
}

export async function getKpiLineage(kpiId: string): Promise<KpiLineage> {
  const k = await kv();
  const kpiRes = await k.get<GraphNode>(["nodes", kpiId]);
  if (!kpiRes.value) throw new Error(`KPI node not found: ${kpiId}`);

  // Fetch incoming edges to the KPI
  const incomingEdges = await getNeighbors(kpiId, "in");
  const impactingOrders: { order: GraphNode; edge: GraphEdge }[] = [];
  let ownerDept: GraphNode | undefined;
  let activeMinister: GraphNode | undefined;

  for (const edge of incomingEdges) {
    if (edge.type === "IMPACTS") {
      const orderRes = await k.get<GraphNode>(["nodes", edge.sourceId]);
      if (orderRes.value) {
        impactingOrders.push({ order: orderRes.value, edge });
      }
    }
  }

  // Fetch outgoing edges to find the owning department
  const outgoingEdges = await getNeighbors(kpiId, "out");
  const deptEdge = outgoingEdges.find((e) => e.type === "OWNED_BY");

  if (deptEdge) {
    const deptRes = await k.get<GraphNode>(["nodes", deptEdge.targetId]);
    ownerDept = deptRes.value ?? undefined;

    if (ownerDept) {
      // Find the minister currently holding this department portfolio
      const deptIncoming = await getNeighbors(ownerDept.id, "in");
      const activePortfolioEdge = deptIncoming.find((e) =>
        e.type === "PORTFOLIO" && e.properties?.termEnd === undefined
      );
      if (activePortfolioEdge) {
        const ministerRes = await k.get<GraphNode>([
          "nodes",
          activePortfolioEdge.sourceId,
        ]);
        activeMinister = ministerRes.value ?? undefined;
      }
    }
  }

  return {
    kpiNode: kpiRes.value,
    ownerDept,
    activeMinister,
    impactingOrders: impactingOrders.sort((a, b) =>
      (b.edge.properties?.date || "").localeCompare(
        a.edge.properties?.date || "",
      )
    ),
  };
}
```

---

## 7. Next Steps for Implementation

1. **Verify Types**: Extend the typescript definitions in `data/types.ts` to
   include `GraphNode`, `GraphNodeType`, and `GraphEdge`. Use
   `Record<string, unknown>` (not `any`) — `deno lint`'s `recommended` tag bans
   explicit `any` and would fail `deno task check` and the format hook.
2. **Implement Graph API**: Add the write/read/delete helpers
   (`putNode`/`putEdge`/`deleteEdge`/`deleteNode`/`getNeighbors`/
   `getKpiLineage`) in `lib/graph.ts`, importing types from `../data/types.ts`.
3. **Populate During Seed (derived projection)**: Generate nodes and edges from
   the existing fixtures inside `seed()` in `data/db.ts` — the graph is derived,
   not a parallel source of truth (see §3.4). **Bump `SEED_VERSION`** when graph
   generation changes.
4. **Survive Reseeds**: Rebuild GO-derived edges from the durable
   `["go_ingested", …]` mirror during the same re-hydration that restores
   `["go"]`, so cron-ingested causal links are not lost on a `SEED_VERSION` bump
   (see §3.4).
5. **Enrich Ingestion**: Update `lib/ingest.ts` so that newly scraped Government
   Orders write their `GraphNode` and matching `edges_out`/`edges_in` indices
   inside KV automatically (in addition to the durable mirror).
6. **Bilingual rendering**: Ensure lineage/portfolio/tooltip components select
   `label`/`labelMl` and any displayable `properties.*`/`properties.*Ml` on
   `state.lang` (see §2 bilingual invariant).
