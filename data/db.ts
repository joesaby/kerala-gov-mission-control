import type {
  CivicDomain,
  Department,
  Kpi,
  Minister,
  Secretary,
} from "./types.ts";
import { HEADLINE_KPIS } from "./kpis.ts";
import { DEPARTMENTS } from "./departments.ts";
import { MINISTERS } from "./ministers.ts";

/**
 * Deno KV layout.
 *
 * Primary:
 *   ["kpi", id]        -> Kpi
 *   ["dept", id]       -> Department
 *   ["minister", id]   -> Minister
 *   ["secretary", id]  -> Secretary
 *
 * Secondary indexes (write under transaction with the primary):
 *   ["kpi_by_dept", deptId, kpiId]            -> null
 *   ["kpi_by_domain", domain, kpiId]          -> null
 *   ["dept_by_minister", ministerId, deptId]  -> null
 *   ["dept_by_secretary", secretaryId, deptId]-> null
 *
 * Bookkeeping:
 *   ["meta", "seed_version"] -> number
 */

const SEED_VERSION = 4;

let _kv: Deno.Kv | null = null;
let _seedPromise: Promise<void> | null = null;

/** Open (or return cached) KV handle. */
export async function kv(): Promise<Deno.Kv> {
  if (_kv) return _kv;
  _kv = await Deno.openKv();
  return _kv;
}

/** Internal: list all values under a prefix. */
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
  await (await kv()).set(["minister", m.id], m);
}

export async function putSecretary(s: Secretary): Promise<void> {
  await (await kv()).set(["secretary", s.id], s);
}

// ----- Seeding -----------------------------------------------------------

/**
 * Idempotent seed: on first call (or after SEED_VERSION bump), wipes the
 * domain prefixes we own and repopulates from typed fixtures. Safe to call
 * on every cold start.
 */
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

/** Wipe + repopulate. Use directly from `scripts/seed.ts` for forced reseed. */
export async function seed(): Promise<void> {
  const k = await kv();
  // Wipe everything we own.
  for (
    const prefix of [
      ["kpi"],
      ["kpi_by_dept"],
      ["kpi_by_domain"],
      ["dept"],
      ["dept_by_minister"],
      ["dept_by_secretary"],
      ["minister"],
      ["secretary"],
    ] satisfies Deno.KvKey[]
  ) {
    for await (const entry of k.list({ prefix })) {
      await k.delete(entry.key);
    }
  }
  for (const m of MINISTERS) await putMinister(m);
  for (const d of DEPARTMENTS) await putDepartment(d);
  for (const kpi of HEADLINE_KPIS) await putKpi(kpi);
}
