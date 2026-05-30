import type {
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
import { MANIFESTO_GOALS } from "./manifesto-goals.ts";

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
 *
 * Secondary indexes (write under transaction with the primary):
 *   ["kpi_by_dept", deptId, kpiId]                -> null
 *   ["kpi_by_domain", domain, kpiId]              -> null
 *   ["dept_by_minister", ministerId, deptId]      -> null
 *   ["dept_by_secretary", secretaryId, deptId]    -> null
 *   ["minister_by_govt", governmentId, ministerId] -> null
 *   ["minister_by_person", personId, ministerId]  -> null
 *   ["coalition_by_party", partyId, coalitionId]  -> null
 *   ["speaker_by_term", assemblyTerm, speakerId]  -> null
 *   ["speech_by_person", personId, speechId]      -> null
 *   ["speech_by_type",   type, speechId]          -> null
 *   ["manifesto_goal_by_govt", govtId, goalId]    -> null
 *   ["go_by_manifesto_goal", goalId, orderId]     -> null
 *
 * Durable mirror (survives reseed — NOT wiped by seed()):
 *   ["go_ingested", id]      -> GovernmentOrder   (cron-ingested orders)
 *
 * Bookkeeping:
 *   ["meta", "seed_version"] -> number
 */

const SEED_VERSION = 15;

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
  const ids: string[] = [];
  for await (
    const entry of k.list<unknown>({ prefix: ["kpi_by_dept", deptId] })
  ) {
    ids.push(entry.key[entry.key.length - 1] as string);
  }
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
  const ids: string[] = [];
  for await (
    const entry of k.list<unknown>({ prefix: ["go_by_dept", deptId] })
  ) {
    ids.push(entry.key[entry.key.length - 1] as string);
  }
  const results = await Promise.all(
    ids.map((id) => k.get<GovernmentOrder>(["go", id])),
  );
  return (results.map((r) => r.value).filter(Boolean) as GovernmentOrder[])
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function listGovernmentOrdersByManifestoGoal(
  goalId: string,
): Promise<GovernmentOrder[]> {
  await ensureSeeded();
  const k = await kv();
  const ids: string[] = [];
  for await (
    const entry of k.list<unknown>({
      prefix: ["go_by_manifesto_goal", goalId],
    })
  ) {
    ids.push(entry.key[entry.key.length - 1] as string);
  }
  const results = await Promise.all(
    ids.map((id) => k.get<GovernmentOrder>(["go", id])),
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
  const atomic = k.atomic()
    .set(["kpi", kpi.id], kpi)
    .set(["kpi_by_domain", kpi.domain, kpi.id], null);
  if (kpi.ownerDeptId) {
    atomic.set(["kpi_by_dept", kpi.ownerDeptId, kpi.id], null);
  }
  for (const cd of kpi.contributingDeptIds ?? []) {
    atomic.set(["kpi_by_dept", cd, kpi.id], null);
  }
  const res = await atomic.commit();
  if (!res.ok) throw new Error(`Failed to put kpi ${kpi.id}`);
}

export async function putDepartment(dept: Department): Promise<void> {
  const k = await kv();
  const atomic = k.atomic().set(["dept", dept.id], dept);
  if (dept.ministerId) {
    atomic.set(["dept_by_minister", dept.ministerId, dept.id], null);
  }
  if (dept.secretaryId) {
    atomic.set(["dept_by_secretary", dept.secretaryId, dept.id], null);
  }
  const res = await atomic.commit();
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

/** Write a GO + its secondary indexes in one atomic commit. */
function stageGovernmentOrder(
  atomic: Deno.AtomicOperation,
  go: GovernmentOrder,
): Deno.AtomicOperation {
  atomic.set(["go", go.id], go);
  if (go.deptId) {
    atomic.set(["go_by_dept", go.deptId, go.id], null);
  }
  for (const goalId of go.manifestoGoalIds ?? []) {
    atomic.set(["go_by_manifesto_goal", goalId, go.id], null);
  }
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
  /** Gemini model used. */
  model: string;
  /** Listings scanned across all sources. */
  scanned: number;
  /** New orders written this run. */
  added: number;
  /** Listings skipped (already present). */
  skipped: number;
  /** Per-document error messages (capped). */
  errors: string[];
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

// ----- Seeding -----------------------------------------------------------

export function ensureSeeded(): Promise<void> {
  if (_seedPromise) return _seedPromise;
  _seedPromise = (async () => {
    const k = await kv();
    const versionEntry = await k.get<number>(["meta", "seed_version"]);
    if (versionEntry.value === SEED_VERSION) return;
    await seed();
    await k.set(["meta", "seed_version"], SEED_VERSION);
  })();
  return _seedPromise;
}

export async function seed(): Promise<void> {
  const k = await kv();
  for (
    const prefix of [
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
    ] satisfies Deno.KvKey[]
  ) {
    for await (const entry of k.list({ prefix })) {
      await k.delete(entry.key);
    }
  }
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
  for (const go of GOVERNMENT_ORDERS) await putGovernmentOrder(go);

  // Re-hydrate cron-ingested orders. The `["go_ingested"]` mirror is never
  // wiped above, so orders the daily cron added since the last reseed are
  // restored into `["go"]` + indexes. Fixture records win on id collision
  // (re-applied first), but in practice ids do not overlap.
  for await (
    const entry of k.list<GovernmentOrder>({ prefix: ["go_ingested"] })
  ) {
    await putGovernmentOrder(entry.value);
  }
}
