import type {
  Appointment,
  AppointmentBranch,
  Budget,
  CivicDomain,
  CoalitionMembership,
  Department,
  Government,
  GovernmentOrder,
  Kpi,
  ManifestoGoal,
  Minister,
  Party,
  Person,
  PublicSpeech,
  Secretary,
  Speaker,
  SpeechType,
  StatusPaper,
} from "./types.ts";
import { HEADLINE_KPIS } from "./kpis.ts";
import { DEPARTMENTS } from "./departments.ts";
import { MINISTERS } from "./ministers.ts";
import { GOVERNMENTS } from "./governments.ts";
import { COALITION_MEMBERSHIPS, PARTIES } from "./parties.ts";
import { PERSONS } from "./persons.ts";
import { SPEAKERS } from "./speakers.ts";
import { PUBLIC_SPEECHES } from "./public-speeches.ts";
import { GOVERNMENT_ORDERS } from "./government-orders.ts";
import { APPOINTMENTS } from "./appointments.ts";
import { MANIFESTO_GOALS } from "./manifesto-goals.ts";
import { STATUS_PAPERS } from "./status-papers.ts";
import { BUDGETS } from "./budgets.ts";
import {
  buildGraph,
  getNeighborsByType,
  syncAppointmentGraph,
  syncOrderGraph,
} from "../lib/graph.ts";

/**
 * Deno KV layout.
 *
 * Primary:
 *   ["kpi", id]                -> Kpi
 *   ["dept", id]               -> Department
 *   ["minister", id]           -> Minister
 *   ["secretary", id]          -> Secretary
 *   ["government", id]         -> Government
 *   ["person", id]             -> Person
 *   ["party", id]              -> Party
 *   ["coalition", id]          -> CoalitionMembership
 *   ["speaker", id]            -> Speaker
 *   ["speech", id]             -> PublicSpeech
 *   ["status_paper", id]       -> StatusPaper
 *   ["budget", id]             -> Budget
 *
 * Secondary indexes (by-attribute lookups; written with the primary):
 *   ["kpi_by_domain", domain, kpiId]              -> null
 *   ["minister_by_govt", governmentId, ministerId] -> null
 *   ["minister_by_person", personId, ministerId]  -> null
 *   ["coalition_by_party", partyId, coalitionId]  -> null
 *   ["speaker_by_term", assemblyTerm, speakerId]  -> null
 *   ["speech_by_person", personId, speechId]      -> null
 *   ["speech_by_type",   type, speechId]          -> null
 *   ["manifesto_goal_by_govt", govtId, goalId]    -> null
 *   ["budget_by_fy", fy, budgetId]                -> null
 *   ["appointment", id]                           -> Appointment
 *   ["appointment_by_dept",   deptId, id]         -> null
 *   ["appointment_by_branch", branch, id]         -> null
 *   ["appointment_by_go",     goId,   id]         -> null
 *
 * Retired entity-to-entity indexes — now served by graph edges (below), still
 * in the seed wipe list to purge legacy entries: kpi_by_dept (OWNED_BY +
 * CONTRIBUTES_TO), go_by_dept (ISSUED_BY), go_by_manifesto_goal (IMPACTS),
 * dept_by_minister & dept_by_secretary (were unused).
 *
 * Durable mirror (survives reseed — NOT wiped by seed()):
 *   ["go_ingested", id]          -> GovernmentOrder   (cron-ingested orders)
 *   ["appointment_ingested", id] -> Appointment       (cron-ingested appointments)
 *
 * Derived knowledge graph (rebuilt from the above by lib/graph.ts buildGraph()):
 *   ["nodes", id]                            -> GraphNode
 *   ["edges_out", sourceId, type, targetId]  -> GraphEdge
 *   ["edges_in",  targetId, type, sourceId]  -> GraphEdge
 *
 * Bookkeeping:
 *   ["meta", "seed_version"] -> number
 */

const SEED_VERSION = 29;

let _kv: Deno.Kv | null = null;
let _seedPromise: Promise<void> | null = null;

export async function kv(): Promise<Deno.Kv> {
  if (_kv) return _kv;
  _kv = await Deno.openKv();
  return _kv;
}

async function listAll<T>(prefix: Deno.KvKey): Promise<T[]> {
  const out: T[] = [];
  for await (const entry of (await kv()).list<T>({ prefix })) {
    out.push(entry.value);
  }
  return out;
}

// ----- KPI ----------------------------------------------------------------

export async function listKpis(): Promise<Kpi[]> {
  await ensureSeeded();
  return await listAll<Kpi>(["kpi"]);
}

export async function getKpi(id: string): Promise<Kpi | null> {
  await ensureSeeded();
  const res = await (await kv()).get<Kpi>(["kpi", id]);
  return res.value;
}

export async function listKpisByDept(deptId: string): Promise<Kpi[]> {
  await ensureSeeded();
  const k = await kv();
  // Owner (OWNED_BY) + secondary contributing (CONTRIBUTES_TO) KPIs via the
  // graph's edges_in, replacing the ["kpi_by_dept"] index that conflated both.
  // Sorted by KPI id to preserve the previous index-order output.
  const [owned, contrib] = await Promise.all([
    getNeighborsByType(deptId, "OWNED_BY", "in"),
    getNeighborsByType(deptId, "CONTRIBUTES_TO", "in"),
  ]);
  const ids = [...new Set([...owned, ...contrib].map((e) => e.sourceId))]
    .sort();
  const results = await Promise.all(ids.map((id) => k.get<Kpi>(["kpi", id])));
  return results.map((r) => r.value).filter(Boolean) as Kpi[];
}

export async function listKpisByDomain(domain: CivicDomain): Promise<Kpi[]> {
  await ensureSeeded();
  const k = await kv();
  const ids: string[] = [];
  for await (
    const entry of k.list<unknown>({ prefix: ["kpi_by_domain", domain] })
  ) {
    ids.push(entry.key[entry.key.length - 1] as string);
  }
  const results = await Promise.all(ids.map((id) => k.get<Kpi>(["kpi", id])));
  return results.map((r) => r.value).filter(Boolean) as Kpi[];
}

// ----- Department --------------------------------------------------------

export async function listDepartments(): Promise<Department[]> {
  await ensureSeeded();
  return await listAll<Department>(["dept"]);
}

export async function getDepartment(id: string): Promise<Department | null> {
  await ensureSeeded();
  const res = await (await kv()).get<Department>(["dept", id]);
  return res.value;
}

export async function getDepartmentBySlug(
  slug: string,
): Promise<Department | null> {
  const all = await listDepartments();
  return all.find((d) => d.slug === slug) ?? null;
}

// ----- Minister / Secretary ----------------------------------------------

export async function listMinisters(): Promise<Minister[]> {
  await ensureSeeded();
  return await listAll<Minister>(["minister"]);
}

export async function getMinister(id: string): Promise<Minister | null> {
  await ensureSeeded();
  const res = await (await kv()).get<Minister>(["minister", id]);
  return res.value;
}

export async function getMinisterBySlug(
  slug: string,
): Promise<Minister | null> {
  const all = await listMinisters();
  return all.find((m) => m.slug === slug) ?? null;
}

export async function listSecretaries(): Promise<Secretary[]> {
  await ensureSeeded();
  return await listAll<Secretary>(["secretary"]);
}

// ----- Government ---------------------------------------------------------

export async function listGovernments(): Promise<Government[]> {
  await ensureSeeded();
  return await listAll<Government>(["government"]);
}

export async function getGovernment(id: string): Promise<Government | null> {
  await ensureSeeded();
  const res = await (await kv()).get<Government>(["government", id]);
  return res.value;
}

export async function getGovernmentBySlug(
  slug: string,
): Promise<Government | null> {
  const all = await listGovernments();
  return all.find((g) => g.slug === slug) ?? null;
}

export async function getCurrentGovernment(): Promise<Government | null> {
  const all = await listGovernments();
  return all.find((g) => !g.termEnd) ?? null;
}

export async function listMinistersByGovernment(
  governmentId: string,
): Promise<Minister[]> {
  await ensureSeeded();
  const k = await kv();
  const ids: string[] = [];
  for await (
    const entry of k.list<unknown>({
      prefix: ["minister_by_govt", governmentId],
    })
  ) {
    ids.push(entry.key[entry.key.length - 1] as string);
  }
  const results = await Promise.all(
    ids.map((id) => k.get<Minister>(["minister", id])),
  );
  return results.map((r) => r.value).filter(Boolean) as Minister[];
}

// ----- Person -------------------------------------------------------------

export async function listPersons(): Promise<Person[]> {
  await ensureSeeded();
  return await listAll<Person>(["person"]);
}

export async function getPerson(id: string): Promise<Person | null> {
  await ensureSeeded();
  const res = await (await kv()).get<Person>(["person", id]);
  return res.value;
}

export async function getPersonBySlug(slug: string): Promise<Person | null> {
  const all = await listPersons();
  return all.find((p) => p.slug === slug) ?? null;
}

/** All Minister tenures for a given person, across all governments. */
export async function listMinistersByPerson(
  personId: string,
): Promise<Minister[]> {
  await ensureSeeded();
  const k = await kv();
  const ids: string[] = [];
  for await (
    const entry of k.list<unknown>({
      prefix: ["minister_by_person", personId],
    })
  ) {
    ids.push(entry.key[entry.key.length - 1] as string);
  }
  const results = await Promise.all(
    ids.map((id) => k.get<Minister>(["minister", id])),
  );
  return results.map((r) => r.value).filter(Boolean) as Minister[];
}

// ----- Party / Coalition --------------------------------------------------

export async function listParties(): Promise<Party[]> {
  await ensureSeeded();
  return await listAll<Party>(["party"]);
}

export async function getParty(id: string): Promise<Party | null> {
  await ensureSeeded();
  const res = await (await kv()).get<Party>(["party", id]);
  return res.value;
}

export async function listCoalitionMemberships(): Promise<
  CoalitionMembership[]
> {
  await ensureSeeded();
  return await listAll<CoalitionMembership>(["coalition"]);
}

/** Coalition memberships for a given party, sorted by termStart. */
export async function listCoalitionsByParty(
  partyId: string,
): Promise<CoalitionMembership[]> {
  await ensureSeeded();
  const k = await kv();
  const ids: string[] = [];
  for await (
    const entry of k.list<unknown>({
      prefix: ["coalition_by_party", partyId],
    })
  ) {
    ids.push(entry.key[entry.key.length - 1] as string);
  }
  const results = await Promise.all(
    ids.map((id) => k.get<CoalitionMembership>(["coalition", id])),
  );
  return (results.map((r) => r.value).filter(Boolean) as CoalitionMembership[])
    .sort((a, b) => a.termStart.localeCompare(b.termStart));
}

// ----- Speaker ------------------------------------------------------------

export async function listSpeakers(): Promise<Speaker[]> {
  await ensureSeeded();
  return await listAll<Speaker>(["speaker"]);
}

export async function getSpeaker(id: string): Promise<Speaker | null> {
  await ensureSeeded();
  const res = await (await kv()).get<Speaker>(["speaker", id]);
  return res.value;
}

export async function listSpeakersByTerm(
  assemblyTerm: number,
): Promise<Speaker[]> {
  await ensureSeeded();
  const k = await kv();
  const ids: string[] = [];
  for await (
    const entry of k.list<unknown>({
      prefix: ["speaker_by_term", assemblyTerm],
    })
  ) {
    ids.push(entry.key[entry.key.length - 1] as string);
  }
  const results = await Promise.all(
    ids.map((id) => k.get<Speaker>(["speaker", id])),
  );
  return results.map((r) => r.value).filter(Boolean) as Speaker[];
}

export async function getCurrentSpeaker(): Promise<Speaker | null> {
  const all = await listSpeakers();
  return (
    all.find((s) => s.rank === "Speaker" && !s.termEnd) ?? null
  );
}

// ----- Public Speech ------------------------------------------------------

export async function listSpeeches(): Promise<PublicSpeech[]> {
  await ensureSeeded();
  return await listAll<PublicSpeech>(["speech"]);
}

export async function getSpeech(id: string): Promise<PublicSpeech | null> {
  await ensureSeeded();
  const res = await (await kv()).get<PublicSpeech>(["speech", id]);
  return res.value;
}

export async function listSpeechesByPerson(
  personId: string,
): Promise<PublicSpeech[]> {
  await ensureSeeded();
  const k = await kv();
  const ids: string[] = [];
  for await (
    const entry of k.list<unknown>({
      prefix: ["speech_by_person", personId],
    })
  ) {
    ids.push(entry.key[entry.key.length - 1] as string);
  }
  const results = await Promise.all(
    ids.map((id) => k.get<PublicSpeech>(["speech", id])),
  );
  return (results.map((r) => r.value).filter(Boolean) as PublicSpeech[])
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function listSpeechesByType(
  type: SpeechType,
): Promise<PublicSpeech[]> {
  await ensureSeeded();
  const k = await kv();
  const ids: string[] = [];
  for await (
    const entry of k.list<unknown>({ prefix: ["speech_by_type", type] })
  ) {
    ids.push(entry.key[entry.key.length - 1] as string);
  }
  const results = await Promise.all(
    ids.map((id) => k.get<PublicSpeech>(["speech", id])),
  );
  return (results.map((r) => r.value).filter(Boolean) as PublicSpeech[])
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ----- Government Order --------------------------------------------------

export async function listGovernmentOrders(): Promise<GovernmentOrder[]> {
  await ensureSeeded();
  return (await listAll<GovernmentOrder>(["go"]))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getGovernmentOrder(
  id: string,
): Promise<GovernmentOrder | null> {
  await ensureSeeded();
  const res = await (await kv()).get<GovernmentOrder>(["go", id]);
  return res.value;
}

export async function listGovernmentOrdersByDept(
  deptId: string,
): Promise<GovernmentOrder[]> {
  await ensureSeeded();
  const k = await kv();
  // Served by the graph's ISSUED_BY edges (GO -> issuing dept). The legacy
  // ["go_by_dept"] secondary index is retired in favour of this single
  // adjacency layer — same one-hop lookup, one fewer thing to keep in sync.
  const edges = await getNeighborsByType(deptId, "ISSUED_BY", "in");
  const results = await Promise.all(
    edges.map((e) => k.get<GovernmentOrder>(["go", e.sourceId])),
  );
  return (results.map((r) => r.value).filter(Boolean) as GovernmentOrder[])
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Government orders that cite the given order in their body — the inbound side
 * of the REFERENCES edge (e.g. the later order that supersedes this one). Served
 * by the graph's `["edges_in", goId, "REFERENCES", ...]` adjacency.
 */
export async function listOrdersReferencing(
  goId: string,
): Promise<GovernmentOrder[]> {
  await ensureSeeded();
  const k = await kv();
  const edges = await getNeighborsByType(goId, "REFERENCES", "in");
  const results = await Promise.all(
    edges.map((e) => k.get<GovernmentOrder>(["go", e.sourceId])),
  );
  return (results.map((r) => r.value).filter(Boolean) as GovernmentOrder[])
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function listGovernmentOrdersByManifestoGoal(
  goalId: string,
): Promise<GovernmentOrder[]> {
  await ensureSeeded();
  const k = await kv();
  // Served by the graph's IMPACTS edges (GO -> manifesto goal), replacing the
  // ["go_by_manifesto_goal"] index. Same date-desc ordering.
  const edges = await getNeighborsByType(goalId, "IMPACTS", "in");
  const results = await Promise.all(
    edges.map((e) => k.get<GovernmentOrder>(["go", e.sourceId])),
  );
  return (results.map((r) => r.value).filter(Boolean) as GovernmentOrder[])
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ----- Manifesto Goal --------------------------------------------------------

export async function listManifestoGoals(
  governmentId?: string,
): Promise<ManifestoGoal[]> {
  await ensureSeeded();
  const all = await listAll<ManifestoGoal>(["manifesto_goal"]);
  return governmentId
    ? all.filter((g) => g.governmentId === governmentId)
    : all;
}

export async function getManifestoGoal(
  id: string,
): Promise<ManifestoGoal | null> {
  await ensureSeeded();
  const res = await (await kv()).get<ManifestoGoal>(["manifesto_goal", id]);
  return res.value;
}

// ----- Write helpers (used by seed + admin endpoints) --------------------

export async function putKpi(kpi: Kpi): Promise<void> {
  const k = await kv();
  // KPI -> dept relationships (owner + contributing) are served by the graph's
  // OWNED_BY / CONTRIBUTES_TO edges, rebuilt by buildGraph from the ["kpi"]
  // records during seed — so the ["kpi_by_dept"] index is no longer written.
  // kpi_by_domain stays: a by-attribute index the graph doesn't model.
  const res = await k.atomic()
    .set(["kpi", kpi.id], kpi)
    .set(["kpi_by_domain", kpi.domain, kpi.id], null)
    .commit();
  if (!res.ok) throw new Error(`Failed to put kpi ${kpi.id}`);
}

export async function putDepartment(dept: Department): Promise<void> {
  // The dept_by_minister / dept_by_secretary indexes were write-only (no reader
  // anywhere) — retired. The dept<->minister relationship lives in the graph's
  // PORTFOLIO edges; pages read the minister via dept.ministerId directly.
  const res = await (await kv()).atomic()
    .set(["dept", dept.id], dept)
    .commit();
  if (!res.ok) throw new Error(`Failed to put dept ${dept.id}`);
}

export async function putMinister(m: Minister): Promise<void> {
  const k = await kv();
  const atomic = k.atomic().set(["minister", m.id], m);
  if (m.governmentId) {
    atomic.set(["minister_by_govt", m.governmentId, m.id], null);
  }
  atomic.set(["minister_by_person", m.personId, m.id], null);
  const res = await atomic.commit();
  if (!res.ok) throw new Error(`Failed to put minister ${m.id}`);
}

export async function putGovernment(g: Government): Promise<void> {
  await (await kv()).set(["government", g.id], g);
}

export async function putSecretary(s: Secretary): Promise<void> {
  await (await kv()).set(["secretary", s.id], s);
}

export async function putPerson(p: Person): Promise<void> {
  await (await kv()).set(["person", p.id], p);
}

export async function putParty(p: Party): Promise<void> {
  await (await kv()).set(["party", p.id], p);
}

export async function putCoalitionMembership(
  c: CoalitionMembership,
): Promise<void> {
  const k = await kv();
  const res = await k.atomic()
    .set(["coalition", c.id], c)
    .set(["coalition_by_party", c.partyId, c.id], null)
    .commit();
  if (!res.ok) throw new Error(`Failed to put coalition ${c.id}`);
}

export async function putSpeaker(s: Speaker): Promise<void> {
  const k = await kv();
  const res = await k.atomic()
    .set(["speaker", s.id], s)
    .set(["speaker_by_term", s.assemblyTerm, s.id], null)
    .commit();
  if (!res.ok) throw new Error(`Failed to put speaker ${s.id}`);
}

export async function putSpeech(sp: PublicSpeech): Promise<void> {
  const k = await kv();
  const res = await k.atomic()
    .set(["speech", sp.id], sp)
    .set(["speech_by_person", sp.personId, sp.id], null)
    .set(["speech_by_type", sp.type, sp.id], null)
    .commit();
  if (!res.ok) throw new Error(`Failed to put speech ${sp.id}`);
}

/** Write a GO primary record. Its relationships live in the graph. */
function stageGovernmentOrder(
  atomic: Deno.AtomicOperation,
  go: GovernmentOrder,
): Deno.AtomicOperation {
  // GO -> dept and GO -> manifesto goal are served by the graph's ISSUED_BY and
  // IMPACTS edges (written by buildGraph at seed time and syncOrderGraph at
  // ingest time), so the ["go_by_dept"] / ["go_by_manifesto_goal"] indexes are
  // no longer written. They stay in the seed wipe list to purge legacy entries.
  atomic.set(["go", go.id], go);
  return atomic;
}

export async function putGovernmentOrder(go: GovernmentOrder): Promise<void> {
  const k = await kv();
  const res = await stageGovernmentOrder(k.atomic(), go).commit();
  if (!res.ok) throw new Error(`Failed to put government order ${go.id}`);
}

/**
 * Persist a GO ingested at runtime (e.g. by the daily cron).
 *
 * Writes the primary `["go", id]` record + indexes AND a durable mirror under
 * `["go_ingested", id]`. The mirror prefix is NOT wiped by `seed()`; on the
 * next `SEED_VERSION` bump, `seed()` re-hydrates these records back into `["go"]`
 * so cron-ingested orders survive a reseed (which otherwise repopulates `["go"]`
 * only from the static fixture). Idempotent: re-ingesting the same id is a no-op
 * overwrite.
 */
export async function putIngestedGovernmentOrder(
  go: GovernmentOrder,
): Promise<void> {
  const k = await kv();
  const atomic = stageGovernmentOrder(k.atomic(), go);
  atomic.set(["go_ingested", go.id], go);
  const res = await atomic.commit();
  if (!res.ok) throw new Error(`Failed to put ingested order ${go.id}`);

  // Keep the derived graph current. Best-effort: the GO record is already
  // durably persisted above, and `seed()` rebuilds the whole graph from it on
  // the next reseed — so a transient graph-write failure must not fail ingest.
  try {
    await syncOrderGraph(go);
  } catch (err) {
    console.warn(`graph sync skipped for ${go.id}: ${err}`);
  }
}

/** Government order ids already present (fixture-seeded or cron-ingested). */
export async function listGovernmentOrderKeys(): Promise<
  { ids: Set<string>; goNumbers: Set<string>; sourceUrls: Set<string> }
> {
  await ensureSeeded();
  const orders = await listAll<GovernmentOrder>(["go"]);
  return {
    ids: new Set(orders.map((o) => o.id)),
    goNumbers: new Set(orders.map((o) => o.goNumber)),
    sourceUrls: new Set(orders.map((o) => o.meta.sourceUrl)),
  };
}

/** Ids ingested at runtime (the durable cron mirror), newest first. */
export async function listIngestedGovernmentOrders(): Promise<
  GovernmentOrder[]
> {
  await ensureSeeded();
  return (await listAll<GovernmentOrder>(["go_ingested"]))
    .sort((a, b) => b.meta.retrievedAt.localeCompare(a.meta.retrievedAt));
}

// ----- Appointments ------------------------------------------------------

export async function listAppointments(): Promise<Appointment[]> {
  await ensureSeeded();
  return (await listAll<Appointment>(["appointment"]))
    .sort((a, b) => b.termStart.localeCompare(a.termStart));
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  await ensureSeeded();
  const res = await (await kv()).get<Appointment>(["appointment", id]);
  return res.value;
}

async function listAppointmentsByIndex(
  prefix: Deno.KvKey,
): Promise<Appointment[]> {
  await ensureSeeded();
  const k = await kv();
  const ids: string[] = [];
  for await (const e of k.list<null>({ prefix })) {
    ids.push(e.key[e.key.length - 1] as string);
  }
  const rows = await Promise.all(
    ids.map((id) => k.get<Appointment>(["appointment", id])),
  );
  return (rows.map((r) => r.value).filter(Boolean) as Appointment[])
    .sort((a, b) => b.termStart.localeCompare(a.termStart));
}

export function listAppointmentsByDept(deptId: string): Promise<Appointment[]> {
  return listAppointmentsByIndex(["appointment_by_dept", deptId]);
}

export function listAppointmentsByBranch(
  branch: AppointmentBranch,
): Promise<Appointment[]> {
  return listAppointmentsByIndex(["appointment_by_branch", branch]);
}

export function listAppointmentsByGo(goId: string): Promise<Appointment[]> {
  return listAppointmentsByIndex(["appointment_by_go", goId]);
}

/** Ids ingested at runtime (the durable mirror), newest first. */
export async function listIngestedAppointments(): Promise<Appointment[]> {
  await ensureSeeded();
  return (await listAll<Appointment>(["appointment_ingested"]))
    .sort((a, b) => b.termStart.localeCompare(a.termStart));
}

/** Write an appointment primary record + its secondary indexes. */
function stageAppointment(
  atomic: Deno.AtomicOperation,
  a: Appointment,
): Deno.AtomicOperation {
  atomic.set(["appointment", a.id], a);
  if (a.deptId) atomic.set(["appointment_by_dept", a.deptId, a.id], null);
  atomic.set(["appointment_by_branch", a.branch, a.id], null);
  atomic.set(["appointment_by_go", a.goId, a.id], null);
  return atomic;
}

export async function putAppointment(a: Appointment): Promise<void> {
  const res = await stageAppointment((await kv()).atomic(), a).commit();
  if (!res.ok) throw new Error(`Failed to put appointment ${a.id}`);
}

/**
 * Normalized key identifying "the same office" for supersession: branch + dept +
 * court + the office title squashed to alphanumerics. A later appointment to the
 * same office closes the prior open one.
 */
export function officeKey(a: Appointment): string {
  const office = a.office.toLowerCase().replace(/[^a-z0-9]/g, "");
  return [a.branch, a.deptId ?? "", a.court ?? "", office].join("|");
}

/**
 * Persist an appointment ingested at runtime: primary `["appointment", id]` +
 * indexes AND a durable mirror under `["appointment_ingested", id]` (NOT wiped by
 * `seed()`, re-hydrated on the next `SEED_VERSION` bump — same contract as
 * `putIngestedGovernmentOrder`). Idempotent: re-ingesting the same id overwrites.
 *
 * Supersession: when this appointment opens an office (`termEnd` undefined) that
 * a prior record still holds open with an earlier `termStart`, that prior record
 * is closed (`termEnd` set to this one's `termStart`) so the office has a single
 * current holder — the same dated-tenure model used for `Minister`/`Speaker`.
 */
export async function putIngestedAppointment(a: Appointment): Promise<void> {
  const k = await kv();

  // Close any prior open holder of the same office.
  if (a.termEnd === undefined) {
    const key = officeKey(a);
    const peers = await listAppointmentsByIndex([
      "appointment_by_branch",
      a.branch,
    ]);
    for (const prior of peers) {
      if (prior.id === a.id) continue;
      if (prior.termEnd !== undefined) continue;
      if (officeKey(prior) !== key) continue;
      if (prior.termStart >= a.termStart) continue;
      const closed: Appointment = { ...prior, termEnd: a.termStart };
      await putAppointment(closed);
      try {
        await syncAppointmentGraph(closed);
      } catch (err) {
        console.warn(`graph sync skipped for ${closed.id}: ${err}`);
      }
    }
  }

  const atomic = stageAppointment(k.atomic(), a);
  atomic.set(["appointment_ingested", a.id], a);
  const res = await atomic.commit();
  if (!res.ok) throw new Error(`Failed to put ingested appointment ${a.id}`);

  // Keep the derived graph current. Best-effort, as with GO ingest.
  try {
    await syncAppointmentGraph(a);
  } catch (err) {
    console.warn(`graph sync skipped for ${a.id}: ${err}`);
  }
}

// ----- Ingest run status (for the status page) ---------------------------

/** Outcome of the most recent ingest run. Stored at ["meta","ingest_status"]. */
export interface IngestStatus {
  /** ISO timestamp the run started. */
  startedAt: string;
  /** ISO timestamp the run finished. */
  finishedAt: string;
  /** Did the run complete without throwing? (Per-document errors may still exist.) */
  ok: boolean;
  /** What kicked off the run. */
  trigger: "cron" | "manual";
  /** Full model string, incl. which fallback tiers were used. */
  model: string;
  /** How many orders each provider tier successfully extracted this run. */
  providerCounts?: { gemini?: number; openrouter?: number; nvidia?: number };
  /** Listings scanned across all sources. */
  scanned: number;
  /** New orders written this run. */
  added: number;
  /** Listings skipped (already present). */
  skipped: number;
  /** Per-document error messages (capped). */
  errors: string[];
  /**
   * GO numbers deferred this run (Gemini overloaded + all fallbacks failed) —
   * not persisted, re-attempted on the next run. Distinct from hard errors.
   */
  deferred?: string[];
  /** Ids added this run, for display. */
  addedIds: string[];
}

export async function getIngestStatus(): Promise<IngestStatus | null> {
  const res = await (await kv()).get<IngestStatus>(["meta", "ingest_status"]);
  return res.value;
}

export async function setIngestStatus(status: IngestStatus): Promise<void> {
  await (await kv()).set(["meta", "ingest_status"], status);
}

const INGEST_LOCK_KEY = ["meta", "ingest_lock"] satisfies Deno.KvKey;
/** Auto-expire the lock so a crashed/killed run can't wedge the trigger. */
const INGEST_LOCK_TTL_MS = 10 * 60 * 1000;

/**
 * Try to claim the ingest lock. Returns false if a run is already in progress.
 * Atomic + auto-expiring, so it holds across Deno Deploy isolates.
 */
export async function tryAcquireIngestLock(): Promise<boolean> {
  const res = await (await kv()).atomic()
    .check({ key: INGEST_LOCK_KEY, versionstamp: null })
    .set(INGEST_LOCK_KEY, new Date().toISOString(), {
      expireIn: INGEST_LOCK_TTL_MS,
    })
    .commit();
  return res.ok;
}

export async function releaseIngestLock(): Promise<void> {
  await (await kv()).delete(INGEST_LOCK_KEY);
}

export async function isIngestRunning(): Promise<boolean> {
  return (await (await kv()).get(INGEST_LOCK_KEY)).value !== null;
}

const MAX_RUN_HISTORY = 20;
const MAX_LOG_LINES = 500;

/** Captured log output of the most recent run. */
export interface IngestLog {
  finishedAt: string;
  trigger: "cron" | "manual";
  lines: string[];
}

/** Prepend a run to the capped history at ["meta","ingest_runs"]. */
export async function appendIngestRun(status: IngestStatus): Promise<void> {
  const k = await kv();
  const cur = (await k.get<IngestStatus[]>(["meta", "ingest_runs"])).value ??
    [];
  await k.set(
    ["meta", "ingest_runs"],
    [status, ...cur].slice(0, MAX_RUN_HISTORY),
  );
}

export async function getIngestRuns(): Promise<IngestStatus[]> {
  return (await (await kv()).get<IngestStatus[]>(["meta", "ingest_runs"]))
    .value ?? [];
}

export async function setIngestLog(log: IngestLog): Promise<void> {
  await (await kv()).set(["meta", "ingest_log"], {
    ...log,
    lines: log.lines.slice(-MAX_LOG_LINES),
  });
}

export async function getIngestLog(): Promise<IngestLog | null> {
  return (await (await kv()).get<IngestLog>(["meta", "ingest_log"])).value;
}

export async function putManifestoGoal(g: ManifestoGoal): Promise<void> {
  const k = await kv();
  const res = await k.atomic()
    .set(["manifesto_goal", g.id], g)
    .set(["manifesto_goal_by_govt", g.governmentId, g.id], null)
    .commit();
  if (!res.ok) throw new Error(`Failed to put manifesto goal ${g.id}`);
}

// ----- Status Paper -------------------------------------------------------

export async function putStatusPaper(p: StatusPaper): Promise<void> {
  const k = await kv();
  const res = await k.atomic().set(["status_paper", p.id], p).commit();
  if (!res.ok) throw new Error(`Failed to put status paper ${p.id}`);
}

export async function listStatusPapers(): Promise<StatusPaper[]> {
  await ensureSeeded();
  return (await listAll<StatusPaper>(["status_paper"]))
    .sort((a, b) => b.tabledOn.localeCompare(a.tabledOn));
}

export async function getStatusPaper(id: string): Promise<StatusPaper | null> {
  await ensureSeeded();
  const res = await (await kv()).get<StatusPaper>(["status_paper", id]);
  return res.value;
}

// ----- Budget -------------------------------------------------------------

export async function putBudget(b: Budget): Promise<void> {
  const k = await kv();
  const res = await k.atomic()
    .set(["budget", b.id], b)
    .set(["budget_by_fy", b.fy, b.id], null)
    .commit();
  if (!res.ok) throw new Error(`Failed to put budget ${b.id}`);
}

export async function listBudgets(): Promise<Budget[]> {
  await ensureSeeded();
  return (await listAll<Budget>(["budget"]))
    .sort((a, b) => b.presentedOn.localeCompare(a.presentedOn));
}

export async function getBudget(id: string): Promise<Budget | null> {
  await ensureSeeded();
  const res = await (await kv()).get<Budget>(["budget", id]);
  return res.value;
}

export async function listBudgetsByFy(fy: string): Promise<Budget[]> {
  await ensureSeeded();
  const ids: string[] = [];
  for await (
    const e of (await kv()).list<null>({ prefix: ["budget_by_fy", fy] })
  ) {
    ids.push(e.key[2] as string);
  }
  const rows = await Promise.all(ids.map((id) => getBudget(id)));
  return rows.filter((b): b is Budget => b !== null)
    .sort((a, b) => b.presentedOn.localeCompare(a.presentedOn));
}

// ----- Seeding -----------------------------------------------------------

const SEED_LOCK_KEY = ["meta", "seed_lock"] satisfies Deno.KvKey;
/** Auto-expire so an isolate killed mid-seed can't wedge every other request. */
const SEED_LOCK_TTL_MS = 5 * 60 * 1000;

export function ensureSeeded(): Promise<void> {
  if (_seedPromise) return _seedPromise;
  // Don't cache a rejected seed for the life of the isolate — a transient
  // failure would otherwise make every later request in this isolate re-throw.
  // Reset on failure so the next caller retries.
  _seedPromise = runSeedOnce().catch((err) => {
    _seedPromise = null;
    throw err;
  });
  return _seedPromise;
}

async function runSeedOnce(): Promise<void> {
  const k = await kv();
  const seeded = async () =>
    (await k.get<number>(["meta", "seed_version"])).value === SEED_VERSION;
  if (await seeded()) return;

  // Cross-isolate guard. On Deno Deploy many isolates cold-start at once; without
  // this they would all wipe and rewrite KV in parallel (contention + wasted
  // work that can blow the per-request budget). Only the lock holder reseeds; the
  // rest poll for the version to flip, then proceed.
  while (!(await seeded())) {
    const lock = await k.atomic()
      .check({ key: SEED_LOCK_KEY, versionstamp: null })
      .set(SEED_LOCK_KEY, new Date().toISOString(), {
        expireIn: SEED_LOCK_TTL_MS,
      })
      .commit();
    if (lock.ok) {
      try {
        await seed();
        await k.set(["meta", "seed_version"], SEED_VERSION);
      } finally {
        await k.delete(SEED_LOCK_KEY);
      }
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

/** Max mutations per atomic commit on the bulk seed path. Deno KV allows up to
 * 1000; we stay well under to keep each commit's total size within limits. */
const ATOMIC_BATCH = 50;

/**
 * Delete every key under each prefix, batched into atomic commits. One awaited
 * `delete` per key blows the per-request budget once the cron-ingested corpus
 * grows; batching cuts the round-trips ~`ATOMIC_BATCH`×.
 */
async function deletePrefixes(prefixes: Deno.KvKey[]): Promise<void> {
  const k = await kv();
  const keys: Deno.KvKey[] = [];
  for (const prefix of prefixes) {
    for await (const entry of k.list({ prefix })) keys.push(entry.key);
  }
  for (let i = 0; i < keys.length; i += ATOMIC_BATCH) {
    let atomic = k.atomic();
    for (const key of keys.slice(i, i + ATOMIC_BATCH)) {
      atomic = atomic.delete(key);
    }
    const res = await atomic.commit();
    if (!res.ok) throw new Error("Batched seed delete failed");
  }
}

export async function seed(): Promise<void> {
  const k = await kv();
  await deletePrefixes([
    ["kpi"],
    ["kpi_by_dept"],
    ["kpi_by_domain"],
    ["dept"],
    ["dept_by_minister"],
    ["dept_by_secretary"],
    ["minister"],
    ["minister_by_govt"],
    ["minister_by_person"],
    ["secretary"],
    ["government"],
    ["person"],
    ["party"],
    ["coalition"],
    ["coalition_by_party"],
    ["speaker"],
    ["speaker_by_term"],
    ["speech"],
    ["speech_by_person"],
    ["speech_by_type"],
    ["go"],
    ["go_by_dept"],
    ["go_by_manifesto_goal"],
    ["manifesto_goal"],
    ["manifesto_goal_by_govt"],
    ["status_paper"],
    ["budget"],
    ["budget_by_fy"],
    ["appointment"],
    ["appointment_by_dept"],
    ["appointment_by_branch"],
    ["appointment_by_go"],
  ]);
  for (const p of PERSONS) await putPerson(p);
  for (const p of PARTIES) await putParty(p);
  for (const c of COALITION_MEMBERSHIPS) await putCoalitionMembership(c);
  for (const g of GOVERNMENTS) await putGovernment(g);
  for (const m of MINISTERS) await putMinister(m);
  for (const s of SPEAKERS) await putSpeaker(s);
  for (const d of DEPARTMENTS) await putDepartment(d);
  for (const kpi of HEADLINE_KPIS) await putKpi(kpi);
  for (const sp of PUBLIC_SPEECHES) await putSpeech(sp);
  for (const mg of MANIFESTO_GOALS) await putManifestoGoal(mg);
  for (const sp of STATUS_PAPERS) await putStatusPaper(sp);
  for (const b of BUDGETS) await putBudget(b);
  for (const go of GOVERNMENT_ORDERS) await putGovernmentOrder(go);
  for (const a of APPOINTMENTS) await putAppointment(a);

  // Re-hydrate cron-ingested orders. The `["go_ingested"]` mirror is never
  // wiped above, so orders the daily cron added since the last reseed are
  // restored into `["go"]` + indexes. Fixture records win on id collision
  // (re-applied first), but in practice ids do not overlap. Batched into atomic
  // commits — this corpus grows daily and one write per order blows the budget.
  {
    let atomic = k.atomic();
    let n = 0;
    for await (
      const entry of k.list<GovernmentOrder>({ prefix: ["go_ingested"] })
    ) {
      atomic = stageGovernmentOrder(atomic, entry.value);
      if (++n % ATOMIC_BATCH === 0) {
        await atomic.commit();
        atomic = k.atomic();
      }
    }
    if (n % ATOMIC_BATCH !== 0) await atomic.commit();
  }

  // Re-hydrate cron-ingested appointments the same way — the
  // `["appointment_ingested"]` mirror is never wiped, so appointments extracted
  // since the last reseed are restored into `["appointment"]` + indexes. Must run
  // before buildGraph() so their nodes exist for the graph projection.
  {
    let atomic = k.atomic();
    let n = 0;
    for await (
      const entry of k.list<Appointment>({ prefix: ["appointment_ingested"] })
    ) {
      atomic = stageAppointment(atomic, entry.value);
      // Up to 4 mutations per appointment — keep the batch small enough that a
      // full commit stays under the 1000-mutation cap.
      if (++n % Math.floor(ATOMIC_BATCH / 4) === 0) {
        await atomic.commit();
        atomic = k.atomic();
      }
    }
    if (n % Math.floor(ATOMIC_BATCH / 4) !== 0) await atomic.commit();
  }

  // Rebuild the derived knowledge graph from everything seeded above (including
  // the re-hydrated cron orders + appointments). Must run last so every endpoint
  // node exists.
  await buildGraph();
}
