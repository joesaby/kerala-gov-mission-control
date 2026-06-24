/**
 * Knowledge graph over the Kerala Mission Control entities.
 *
 * This is a DERIVED PROJECTION, not a second source of truth. Nodes and edges
 * are generated from the typed fixtures (and the durable `["go_ingested"]`
 * mirror) — see `buildGraph` — and refreshed on the same `SEED_VERSION` bump
 * that rebuilds the rest of KV. The LLM ingest pipeline keeps the GO corner of
 * the graph current at runtime via `syncOrderGraph`.
 *
 * Storage (three Deno KV key spaces, per docs/plans/kv-graph-spec.md):
 *   ["nodes", id]                              -> GraphNode
 *   ["edges_out", sourceId, type, targetId]    -> GraphEdge   (adjacency list)
 *   ["edges_in",  targetId, type, sourceId]    -> GraphEdge   (inverted index)
 *
 * Edge writes are atomic across the two indexes so they can never diverge.
 * Reads issue sequential `get`s and are NOT snapshot-consistent — fine for a
 * read-mostly public traversal store.
 */

import { kv } from "../data/db.ts";
import type {
  Appointment,
  Department,
  GovernmentOrder,
  GraphEdge,
  GraphNode,
  Kpi,
  ManifestoGoal,
  Minister,
  Person,
} from "../data/types.ts";

// ----- Write primitives ---------------------------------------------------

export async function putNode(node: GraphNode): Promise<void> {
  await (await kv()).set(["nodes", node.id], node);
}

export async function getNode(id: string): Promise<GraphNode | null> {
  return (await (await kv()).get<GraphNode>(["nodes", id])).value;
}

/**
 * Write an edge to both adjacency indexes atomically. By default it asserts
 * that both endpoint nodes exist so we never create dangling edges; pass
 * `{ requireNodes: false }` only on bulk seed paths where the node writes are
 * guaranteed to land in the same pass.
 */
export async function putEdge(
  edge: GraphEdge,
  opts: { requireNodes?: boolean } = {},
): Promise<void> {
  const k = await kv();
  if (opts.requireNodes ?? true) {
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
  const res = await k.atomic()
    .set(["edges_out", edge.sourceId, edge.type, edge.targetId], edge)
    .set(["edges_in", edge.targetId, edge.type, edge.sourceId], edge)
    .commit();
  if (!res.ok) {
    throw new Error(
      `Failed to commit edge: ${edge.sourceId} -> ${edge.targetId}`,
    );
  }
}

/** Delete both index entries for an edge atomically (they must stay in sync). */
export async function deleteEdge(
  sourceId: string,
  type: string,
  targetId: string,
): Promise<void> {
  const res = await (await kv()).atomic()
    .delete(["edges_out", sourceId, type, targetId])
    .delete(["edges_in", targetId, type, sourceId])
    .commit();
  if (!res.ok) {
    throw new Error(`Failed to delete edge: ${sourceId} -> ${targetId}`);
  }
}

/** Delete a node and every edge incident to it, leaving no dangling indexes. */
export async function deleteNode(nodeId: string): Promise<void> {
  const incident = [
    ...await getNeighbors(nodeId, "out"),
    ...await getNeighbors(nodeId, "in"),
  ];
  for (const e of incident) await deleteEdge(e.sourceId, e.type, e.targetId);
  await (await kv()).delete(["nodes", nodeId]);
}

// ----- Traversal ----------------------------------------------------------

/**
 * All edges incident to a node in one direction.
 *
 * High-degree caveat: this pulls the whole adjacency list into memory. Fine for
 * low-degree nodes; for a hub (a department with hundreds of GO edges) narrow
 * the prefix to a specific edge type instead — see `getNeighborsByType`.
 */
export async function getNeighbors(
  nodeId: string,
  direction: "out" | "in" = "out",
): Promise<GraphEdge[]> {
  const prefix = direction === "out"
    ? ["edges_out", nodeId]
    : ["edges_in", nodeId];
  const edges: GraphEdge[] = [];
  for await (const entry of (await kv()).list<GraphEdge>({ prefix })) {
    edges.push(entry.value);
  }
  return edges;
}

/** Incident edges of one type — bounded prefix scan for high-degree hubs. */
export async function getNeighborsByType(
  nodeId: string,
  type: GraphEdge["type"],
  direction: "out" | "in" = "out",
): Promise<GraphEdge[]> {
  const prefix = direction === "out"
    ? ["edges_out", nodeId, type]
    : ["edges_in", nodeId, type];
  const edges: GraphEdge[] = [];
  for await (const entry of (await kv()).list<GraphEdge>({ prefix })) {
    edges.push(entry.value);
  }
  return edges;
}

export interface KpiLineage {
  kpiNode: GraphNode;
  ownerDept?: GraphNode;
  /** Minister currently holding the owning department's portfolio. */
  activeMinister?: GraphNode;
  /** Government orders directly impacting this KPI, newest first. */
  impactingOrders: { order: GraphNode; edge: GraphEdge }[];
}

/**
 * Traverse from a KPI to its immediate causal context: the owning department,
 * the minister currently holding that portfolio, and any GOs that impact the
 * KPI directly. Returns a single payload for the KPI-detail lineage view.
 */
export async function getKpiLineage(kpiId: string): Promise<KpiLineage> {
  const k = await kv();
  const kpiRes = await k.get<GraphNode>(["nodes", kpiId]);
  if (!kpiRes.value) throw new Error(`KPI node not found: ${kpiId}`);

  const impactingOrders: { order: GraphNode; edge: GraphEdge }[] = [];
  for (const edge of await getNeighborsByType(kpiId, "IMPACTS", "in")) {
    const orderRes = await k.get<GraphNode>(["nodes", edge.sourceId]);
    if (orderRes.value) impactingOrders.push({ order: orderRes.value, edge });
  }

  let ownerDept: GraphNode | undefined;
  let activeMinister: GraphNode | undefined;
  const deptEdge = (await getNeighborsByType(kpiId, "OWNED_BY", "out"))[0];
  if (deptEdge) {
    ownerDept = (await k.get<GraphNode>(["nodes", deptEdge.targetId])).value ??
      undefined;
    if (ownerDept) {
      const active = (await getNeighborsByType(ownerDept.id, "PORTFOLIO", "in"))
        .find((e) => e.properties?.termEnd === undefined);
      if (active) {
        activeMinister =
          (await k.get<GraphNode>(["nodes", active.sourceId])).value ??
            undefined;
      }
    }
  }

  return {
    kpiNode: kpiRes.value,
    ownerDept,
    activeMinister,
    impactingOrders: impactingOrders.sort((a, b) =>
      (b.edge.properties?.date ?? "").localeCompare(
        a.edge.properties?.date ?? "",
      )
    ),
  };
}

// ----- Node builders (entity record -> GraphNode) -------------------------
//
// Pure projections — exported so the derivation can be unit-tested without KV.

export function kpiNode(kpi: Kpi): GraphNode {
  return {
    id: kpi.id,
    type: "kpi",
    label: kpi.title,
    labelMl: kpi.titleMl,
    properties: {
      domain: kpi.domain,
      unit: kpi.unit,
      value: kpi.value,
      status: kpi.status,
    },
  };
}

export function deptNode(d: Department): GraphNode {
  return {
    id: d.id,
    type: "department",
    label: d.name,
    labelMl: d.nameMl,
    properties: { slug: d.slug, domains: d.domains },
  };
}

export function personNode(p: Person): GraphNode {
  return {
    id: p.id,
    type: "person",
    label: p.name,
    labelMl: p.nameMl,
    properties: { slug: p.slug },
  };
}

export function goalNode(g: ManifestoGoal): GraphNode {
  return {
    id: g.id,
    type: "manifesto_goal",
    label: g.title,
    labelMl: g.titleMl,
    properties: {
      category: g.category,
      status: g.status,
      governmentId: g.governmentId,
    },
  };
}

export function orderNode(go: GovernmentOrder): GraphNode {
  return {
    id: go.id,
    type: "government_order",
    label: go.subject,
    labelMl: go.subjectMl,
    properties: {
      goNumber: go.goNumber,
      goType: go.type,
      date: go.date,
      sourceUrl: go.meta.sourceUrl,
      summary: go.summary,
      summaryMl: go.summaryMl,
    },
  };
}

export function appointmentNode(a: Appointment): GraphNode {
  return {
    id: a.id,
    type: "appointment",
    label: a.appointeeName,
    labelMl: a.appointeeNameMl,
    properties: {
      office: a.office,
      officeMl: a.officeMl,
      branch: a.branch,
      action: a.action,
      deptId: a.deptId,
      court: a.court,
      courtMl: a.courtMl,
      goId: a.goId,
      termStart: a.termStart,
      termEnd: a.termEnd,
    },
  };
}

// ----- Edge builders (entity record -> GraphEdge[]) -----------------------
//
// Pure projections — exported so the derivation can be unit-tested without KV.

/**
 * KPI -[OWNED_BY]-> its accountable department, plus -[CONTRIBUTES_TO]-> each
 * secondary contributing department. Empty until ownership is assigned.
 */
export function kpiEdges(kpi: Kpi): GraphEdge[] {
  const edges: GraphEdge[] = [];
  if (kpi.ownerDeptId) {
    edges.push({
      sourceId: kpi.id,
      targetId: kpi.ownerDeptId,
      type: "OWNED_BY",
    });
  }
  for (const deptId of kpi.contributingDeptIds ?? []) {
    edges.push({ sourceId: kpi.id, targetId: deptId, type: "CONTRIBUTES_TO" });
  }
  return edges;
}

/** Person (minister) -[PORTFOLIO {tenure}]-> each department they hold. */
export function ministerEdges(m: Minister): GraphEdge[] {
  return m.departmentIds.map((deptId) => ({
    sourceId: m.personId,
    targetId: deptId,
    type: "PORTFOLIO",
    properties: { termStart: m.termStart, termEnd: m.termEnd },
  }));
}

/**
 * Government order -[ISSUED_BY]-> department, -[IMPACTS]-> each manifesto goal
 * it backs, and -[REFERENCES {relation}]-> each prior order it cites. These are
 * the edges the LLM ingest pipeline produces per order. A REFERENCES edge is
 * emitted only for a citation that resolved to a known order id (`ref.goId`); a
 * self-citation is dropped.
 */
export function orderEdges(go: GovernmentOrder): GraphEdge[] {
  const edges: GraphEdge[] = [];
  if (go.deptId) {
    edges.push({
      sourceId: go.id,
      targetId: go.deptId,
      type: "ISSUED_BY",
      properties: { date: go.date, confidence: go.deptConfidence },
    });
  }
  for (const goalId of go.manifestoGoalIds ?? []) {
    edges.push({
      sourceId: go.id,
      targetId: goalId,
      type: "IMPACTS",
      properties: { date: go.date, confidence: go.manifestoConfidence },
    });
  }
  for (const ref of go.references ?? []) {
    if (!ref.goId || ref.goId === go.id) continue;
    edges.push({
      sourceId: go.id,
      targetId: ref.goId,
      type: "REFERENCES",
      properties: { date: go.date, relation: ref.relation },
    });
  }
  return edges;
}

/**
 * Appointment -[APPOINTED_TO {tenure, branch}]-> department, -[APPOINTEE]->
 * person (only when a confident match set `personId`), and -[EVIDENCED_BY]-> the
 * government order that made it. The appointment node is the hub: an appointee
 * often has no Person node, so the tenure lives on the appointment rather than on
 * a Person → Department edge (cf. `ministerEdges`).
 */
export function appointmentEdges(a: Appointment): GraphEdge[] {
  const edges: GraphEdge[] = [];
  if (a.deptId) {
    edges.push({
      sourceId: a.id,
      targetId: a.deptId,
      type: "APPOINTED_TO",
      properties: {
        termStart: a.termStart,
        termEnd: a.termEnd,
        branch: a.branch,
        confidence: a.confidence,
      },
    });
  }
  if (a.personId) {
    edges.push({ sourceId: a.id, targetId: a.personId, type: "APPOINTEE" });
  }
  edges.push({ sourceId: a.id, targetId: a.goId, type: "EVIDENCED_BY" });
  return edges;
}

// ----- Derivation ---------------------------------------------------------

async function listByPrefix<T>(prefix: Deno.KvKey): Promise<T[]> {
  const out: T[] = [];
  for await (const entry of (await kv()).list<T>({ prefix })) {
    out.push(entry.value);
  }
  return out;
}

/**
 * Write the graph node + relationship edges for a single government order, then
 * keep them current.
 *
 * Idempotent and re-extraction-safe: the order's existing outgoing edges are
 * cleared first, so when the repair / re-ingest path changes a GO's department
 * or manifesto-goal mapping the stale `ISSUED_BY` / `IMPACTS` edges are removed
 * rather than left dangling. A GO owns only its *outgoing* edges (`ISSUED_BY` /
 * `IMPACTS` / `REFERENCES`); inbound `REFERENCES` from other orders that cite
 * this one belong to those orders' projections, so clearing this GO's outgoing
 * edges is sufficient.
 *
 * Best-effort on link creation: an edge is written only when its target node
 * already exists (a GO ingested before its department/goal is projected won't
 * dangle or throw). Called by the ingest pipeline for each persisted order, and
 * by `buildGraph` during seed.
 */
export async function syncOrderGraph(go: GovernmentOrder): Promise<void> {
  await putNode(orderNode(go));
  for (const e of await getNeighbors(go.id, "out")) {
    await deleteEdge(e.sourceId, e.type, e.targetId);
  }
  for (const e of orderEdges(go)) {
    if (await getNode(e.targetId)) await putEdge(e, { requireNodes: false });
  }
}

/**
 * Project a single appointment into the graph. Same idempotent contract as
 * `syncOrderGraph`: the appointment's outgoing edges are cleared first, so a
 * re-extraction that changes the department / person / tenure leaves no stale
 * `APPOINTED_TO` / `APPOINTEE` / `EVIDENCED_BY` edges. An appointment is only ever
 * an edge source, so clearing its outgoing edges is sufficient. Each edge is
 * written only when its target node already exists (best-effort linking).
 */
export async function syncAppointmentGraph(a: Appointment): Promise<void> {
  await putNode(appointmentNode(a));
  for (const e of await getNeighbors(a.id, "out")) {
    await deleteEdge(e.sourceId, e.type, e.targetId);
  }
  for (const e of appointmentEdges(a)) {
    if (await getNode(e.targetId)) await putEdge(e, { requireNodes: false });
  }
}

/**
 * Rebuild the entire graph from the primary KV records. Reads `["kpi"]`,
 * `["dept"]`, `["person"]`, `["minister"]`, `["manifesto_goal"]` and `["go"]`
 * directly (NOT the `ensureSeeded`-guarded accessors), so it is safe to call
 * from inside `seed()` after those records are written. Nodes are written
 * first, then edges with `requireNodes: false` since every endpoint is present.
 */
/** Max mutations per atomic commit on the bulk graph-rebuild path (KV cap is
 * 1000; stay well under to keep each commit's total size within limits). */
const GRAPH_BATCH = 100;

/**
 * Apply a list of atomic stagers in batched commits. One awaited write per
 * node/edge blows the per-request budget once the graph grows with the daily
 * cron corpus, so the whole rebuild is chunked into `GRAPH_BATCH`-sized commits.
 */
async function batchCommit(
  k: Deno.Kv,
  stagers: Array<(a: Deno.AtomicOperation) => Deno.AtomicOperation>,
  size: number,
): Promise<void> {
  for (let i = 0; i < stagers.length; i += size) {
    let atomic = k.atomic();
    for (const stage of stagers.slice(i, i + size)) atomic = stage(atomic);
    const res = await atomic.commit();
    if (!res.ok) throw new Error("Graph batch commit failed");
  }
}

export async function buildGraph(): Promise<void> {
  const k = await kv();
  // Wipe any prior projection (batched — the graph scales with the GO corpus).
  const stale: Deno.KvKey[] = [];
  for (
    const prefix of [["nodes"], ["edges_out"], [
      "edges_in",
    ]] satisfies Deno.KvKey[]
  ) {
    for await (const entry of k.list({ prefix })) stale.push(entry.key);
  }
  await batchCommit(k, stale.map((key) => (a) => a.delete(key)), GRAPH_BATCH);

  const [kpis, depts, persons, ministers, goals, orders, appointments] =
    await Promise.all([
      listByPrefix<Kpi>(["kpi"]),
      listByPrefix<Department>(["dept"]),
      listByPrefix<Person>(["person"]),
      listByPrefix<Minister>(["minister"]),
      listByPrefix<ManifestoGoal>(["manifesto_goal"]),
      listByPrefix<GovernmentOrder>(["go"]),
      listByPrefix<Appointment>(["appointment"]),
    ]);

  // Nodes.
  const nodes = [
    ...kpis.map(kpiNode),
    ...depts.map(deptNode),
    ...persons.map(personNode),
    ...goals.map(goalNode),
    ...orders.map(orderNode),
    ...appointments.map(appointmentNode),
  ];
  await batchCommit(
    k,
    nodes.map((n) => (a) => a.set(["nodes", n.id], n)),
    GRAPH_BATCH,
  );

  // Edges — every endpoint node is written above, so skip the existence check.
  // Each edge stages both adjacency indexes in the same commit so the pair can
  // never split across a batch boundary (preserving the out/in sync invariant).
  const edges = [
    ...kpis.flatMap(kpiEdges),
    ...ministers.flatMap(ministerEdges),
    ...orders.flatMap(orderEdges),
    ...appointments.flatMap(appointmentEdges),
  ];
  await batchCommit(
    k,
    edges.map((e) => (a) =>
      a
        .set(["edges_out", e.sourceId, e.type, e.targetId], e)
        .set(["edges_in", e.targetId, e.type, e.sourceId], e)
    ),
    Math.floor(GRAPH_BATCH / 2),
  );
}
