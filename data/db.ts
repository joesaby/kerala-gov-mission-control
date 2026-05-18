import type {
  CivicDomain,
  CoalitionMembership,
  Department,
  Government,
  Kpi,
  Minister,
  Party,
  Person,
  Secretary,
  Speaker,
} from "./types.ts";
import { HEADLINE_KPIS } from "./kpis.ts";
import { DEPARTMENTS } from "./departments.ts";
import { MINISTERS } from "./ministers.ts";
import { GOVERNMENTS } from "./governments.ts";
import { COALITION_MEMBERSHIPS, PARTIES } from "./parties.ts";
import { PERSONS } from "./persons.ts";
import { SPEAKERS } from "./speakers.ts";

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
 *
 * Bookkeeping:
 *   ["meta", "seed_version"] -> number
 */

const SEED_VERSION = 8;

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
  const out: Kpi[] = [];
  for await (
    const entry of k.list<unknown>({ prefix: ["kpi_by_dept", deptId] })
  ) {
    const kpiId = entry.key[entry.key.length - 1] as string;
    const got = await k.get<Kpi>(["kpi", kpiId]);
    if (got.value) out.push(got.value);
  }
  return out;
}

export async function listKpisByDomain(domain: CivicDomain): Promise<Kpi[]> {
  await ensureSeeded();
  const k = await kv();
  const out: Kpi[] = [];
  for await (
    const entry of k.list<unknown>({ prefix: ["kpi_by_domain", domain] })
  ) {
    const kpiId = entry.key[entry.key.length - 1] as string;
    const got = await k.get<Kpi>(["kpi", kpiId]);
    if (got.value) out.push(got.value);
  }
  return out;
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
  const out: Minister[] = [];
  for await (
    const entry of k.list<unknown>({
      prefix: ["minister_by_govt", governmentId],
    })
  ) {
    const mId = entry.key[entry.key.length - 1] as string;
    const got = await k.get<Minister>(["minister", mId]);
    if (got.value) out.push(got.value);
  }
  return out;
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
  const out: Minister[] = [];
  for await (
    const entry of k.list<unknown>({
      prefix: ["minister_by_person", personId],
    })
  ) {
    const mId = entry.key[entry.key.length - 1] as string;
    const got = await k.get<Minister>(["minister", mId]);
    if (got.value) out.push(got.value);
  }
  return out;
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
  const out: CoalitionMembership[] = [];
  for await (
    const entry of k.list<unknown>({
      prefix: ["coalition_by_party", partyId],
    })
  ) {
    const cId = entry.key[entry.key.length - 1] as string;
    const got = await k.get<CoalitionMembership>(["coalition", cId]);
    if (got.value) out.push(got.value);
  }
  return out.sort((a, b) => a.termStart.localeCompare(b.termStart));
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
  const out: Speaker[] = [];
  for await (
    const entry of k.list<unknown>({
      prefix: ["speaker_by_term", assemblyTerm],
    })
  ) {
    const sId = entry.key[entry.key.length - 1] as string;
    const got = await k.get<Speaker>(["speaker", sId]);
    if (got.value) out.push(got.value);
  }
  return out;
}

export async function getCurrentSpeaker(): Promise<Speaker | null> {
  const all = await listSpeakers();
  return (
    all.find((s) => s.rank === "Speaker" && !s.termEnd) ?? null
  );
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
}
