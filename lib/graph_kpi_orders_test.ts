/**
 * Unit tests for KPI graph joins:
 * - `getKpiDepartmentOrders` — KPI → dept → GO (administrative association)
 * - `getKpiPromiseBackedOrders` — KPI ←relatedKpiIds— goal ←IMPACTS— GO
 *
 * Writes nodes and edges directly via the graph write primitives. Fixtures use
 * synthetic ids (`dept.test-*`, `test.kpi-*`) that cannot collide with real
 * seeded fixtures — otherwise, on a machine whose local Deno KV already holds
 * real data, the dept→GO join would pick up real orders and break the
 * order-sensitive assertions.
 */
import { kv } from "../data/db.ts";
import {
  getKpiDepartmentOrders,
  getKpiPromiseBackedOrders,
  kpiEdges,
  kpiNode,
  orderEdges,
  orderNode,
  putEdge,
  putNode,
} from "./graph.ts";
import type {
  Department,
  GovernmentOrder,
  GraphNode,
  Kpi,
  ManifestoGoal,
} from "../data/types.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DEPT_FINANCE: Department = {
  id: "dept.test-finance",
  slug: "finance",
  name: "Finance",
  nameMl: "ധനകാര്യം",
  domains: ["fiscal"],
  dataStatus: "verified",
};

const DEPT_HEALTH: Department = {
  id: "dept.test-health",
  slug: "health",
  name: "Health & Family Welfare",
  nameMl: "ആരോഗ്യം",
  domains: ["health"],
  dataStatus: "verified",
};

const KPI_OWNED_BY_FINANCE: Kpi = {
  id: "test.kpi-fin",
  title: "Debt to GSDP",
  titleMl: "കടം / ജി.എസ്.ഡി.പി",
  domain: "fiscal",
  ownerDeptId: "dept.test-finance",
  value: 36.4,
  unit: "%",
  direction: "lower-better",
  trend: "down",
  trendDelta: -1,
  trendWindow: "YoY",
  status: "on-track",
  comparators: [{ label: "India avg", value: 31 }],
  meta: {
    definition: "State debt as a % of GSDP",
    definitionMl: "ജി.എസ്.ഡി.പിയുടെ ശതമാനമായ കടം",
    source: "CAG",
    sourceUrl: "https://example.gov.in",
    owner: "Principal Secretary (Finance)",
    updateFrequency: "annual",
    lastRefreshed: "2026-06-01T00:00:00+05:30",
  },
};

/** A KPI owned by Finance AND contributed to by Health — tests the contributor path. */
const KPI_WITH_CONTRIBUTOR: Kpi = {
  ...KPI_OWNED_BY_FINANCE,
  id: "test.kpi-multi",
  contributingDeptIds: ["dept.test-health"],
};

const GO_FROM_FINANCE_1: GovernmentOrder = {
  id: "go.2026-fin-98",
  goNumber: "G.O.(P) No.98/2026/Fin",
  type: "P",
  subject: "Release of KIIFB capital grant",
  subjectMl: "കിഫ്ബി മൂലധന ഗ്രാന്റ് അനുവദിക്കൽ",
  deptId: "dept.test-finance",
  deptConfidence: "high",
  date: "2026-04-10",
  manifestoGoalIds: [],
  meta: {
    source: "orders",
    sourceUrl: "https://document.kerala.gov.in/98.pdf",
    retrievedAt: "2026-04-11T02:30:00+05:30",
  },
  dataStatus: "unverified",
};

const GO_FROM_FINANCE_2: GovernmentOrder = {
  id: "go.2025-fin-55",
  goNumber: "G.O.(Ms) No.55/2025/Fin",
  type: "Ms",
  subject: "State budget allocation for infrastructure",
  subjectMl: "അടിസ്ഥാന സൗകര്യ വികസനത്തിനുള്ള ബജറ്റ് വകയിരുത്തൽ",
  deptId: "dept.test-finance",
  deptConfidence: "high",
  date: "2025-08-20",
  manifestoGoalIds: [],
  meta: {
    source: "orders",
    sourceUrl: "https://document.kerala.gov.in/55.pdf",
    retrievedAt: "2025-08-21T02:30:00+05:30",
  },
  dataStatus: "unverified",
};

const GO_FROM_HEALTH: GovernmentOrder = {
  id: "go.2026-hlth-12",
  goNumber: "G.O.(Ms) No.12/2026/H&FWD",
  type: "Ms",
  subject: "PMJAY insurance scheme renewal",
  subjectMl: "പിഎം-ജെഎവൈ ഇൻഷ്വറൻസ് നവീകരണം",
  deptId: "dept.test-health",
  deptConfidence: "high",
  date: "2026-01-15",
  manifestoGoalIds: [],
  meta: {
    source: "orders",
    sourceUrl: "https://document.kerala.gov.in/12.pdf",
    retrievedAt: "2026-01-16T02:30:00+05:30",
  },
  dataStatus: "unverified",
};

const GOAL_CURATED: ManifestoGoal = {
  id: "goal.test-fiscal-curated",
  governmentId: "govt.test",
  title: "Fiscal transparency (test)",
  category: "fiscal",
  status: "committed",
  relatedKpiIds: ["test.kpi-fin"],
  dataStatus: "verified",
};

/** Same category as the KPI, but no curated bridge — must not match. */
const GOAL_CATEGORY_ONLY: ManifestoGoal = {
  id: "goal.test-fiscal-category",
  governmentId: "govt.test",
  title: "Unrelated fiscal pledge (test)",
  category: "fiscal",
  status: "committed",
  dataStatus: "verified",
};

const GO_PROMISE_CURATED: GovernmentOrder = {
  ...GO_FROM_FINANCE_1,
  id: "go.test-promise-curated",
  goNumber: "G.O.(P) No.1/2026/Fin",
  date: "2026-06-01",
  deptId: undefined,
  manifestoGoalIds: ["goal.test-fiscal-curated"],
  manifestoConfidence: "direct",
};

const GO_PROMISE_CATEGORY_ONLY: GovernmentOrder = {
  ...GO_FROM_FINANCE_2,
  id: "go.test-promise-category",
  goNumber: "G.O.(Ms) No.2/2026/Fin",
  date: "2026-05-15",
  deptId: undefined,
  manifestoGoalIds: ["goal.test-fiscal-category"],
  manifestoConfidence: "weak",
};

// ---------------------------------------------------------------------------
// Helpers to build the graph in-memory
// ---------------------------------------------------------------------------

async function putManifestoGoal(goal: ManifestoGoal): Promise<void> {
  await (await kv()).set(["manifesto_goal", goal.id], goal);
}

function deptGraphNode(d: Department): GraphNode {
  return {
    id: d.id,
    type: "department",
    label: d.name,
    labelMl: d.nameMl,
    properties: { slug: d.slug },
  };
}

async function seedGraph(
  orders: GovernmentOrder[],
  kpi: Kpi,
  depts: Department[],
): Promise<void> {
  // Write department nodes.
  for (const d of depts) await putNode(deptGraphNode(d));
  // Write KPI node + edges.
  await putNode(kpiNode(kpi));
  for (const e of kpiEdges(kpi)) await putEdge(e, { requireNodes: false });
  // Write GO nodes + edges.
  for (const go of orders) {
    await putNode(orderNode(go));
    for (const e of orderEdges(go)) await putEdge(e, { requireNodes: false });
  }
}

async function seedPromiseGraph(
  kpi: Kpi,
  orders: GovernmentOrder[],
  goals: ManifestoGoal[],
  depts: Department[],
): Promise<void> {
  for (const g of goals) await putManifestoGoal(g);
  await seedGraph(orders, kpi, depts);
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

Deno.test(
  "getKpiDepartmentOrders returns only GOs from the owning department",
  async () => {
    await seedGraph(
      [GO_FROM_FINANCE_1, GO_FROM_FINANCE_2, GO_FROM_HEALTH],
      KPI_OWNED_BY_FINANCE,
      [DEPT_FINANCE, DEPT_HEALTH],
    );

    const results = await getKpiDepartmentOrders(KPI_OWNED_BY_FINANCE.id);

    // Only finance orders should come back.
    const ids = results.map((r) => r.id);
    assert(ids.includes("go.2026-fin-98"), "missing Finance GO #98");
    assert(ids.includes("go.2025-fin-55"), "missing Finance GO #55");
    assert(
      !ids.includes("go.2026-hlth-12"),
      "Health GO must NOT appear for a Finance-owned KPI",
    );
  },
);

Deno.test("getKpiDepartmentOrders returns results sorted newest-first", async () => {
  await seedGraph(
    [GO_FROM_FINANCE_1, GO_FROM_FINANCE_2],
    KPI_OWNED_BY_FINANCE,
    [DEPT_FINANCE],
  );

  const results = await getKpiDepartmentOrders(KPI_OWNED_BY_FINANCE.id);
  const idxNew = results.findIndex((r) => r.id === "go.2026-fin-98");
  const idxOld = results.findIndex((r) => r.id === "go.2025-fin-55");
  assert(idxNew >= 0 && idxOld >= 0, "expected both seeded finance GOs");
  assert(idxNew < idxOld, "2026 GO must sort before 2025 GO (newest-first)");
});

Deno.test(
  "getKpiDepartmentOrders includes contributor-department GOs without duplicates",
  async () => {
    // KPI_WITH_CONTRIBUTOR is OWNED_BY Finance and CONTRIBUTES_TO Health.
    await seedGraph(
      [GO_FROM_FINANCE_1, GO_FROM_HEALTH],
      KPI_WITH_CONTRIBUTOR,
      [DEPT_FINANCE, DEPT_HEALTH],
    );

    const results = await getKpiDepartmentOrders(KPI_WITH_CONTRIBUTOR.id);
    const ids = results.map((r) => r.id);
    assert(ids.includes("go.2026-fin-98"), "Finance GO must appear");
    assert(
      ids.includes("go.2026-hlth-12"),
      "Health (contributor) GO must appear",
    );
    // No duplicate entries.
    const unique = new Set(ids);
    assert(unique.size === ids.length, "results must have no duplicate GO ids");
  },
);

Deno.test(
  "getKpiDepartmentOrders returns empty array when no GOs ingested for the dept",
  async () => {
    // Use a unique dept + KPI that no other test touches so KV state cannot leak.
    const emptyDept: Department = {
      id: "dept.tourism-test-only",
      slug: "tourism-test-only",
      name: "Tourism (test-only)",
      nameMl: "ടൂറിസം (പരീക്ഷണം)",
      domains: ["other"],
      dataStatus: "verified",
    };
    const emptyKpi: Kpi = {
      ...KPI_OWNED_BY_FINANCE,
      id: "other.tourism-empty-test",
      ownerDeptId: emptyDept.id,
    };
    // Seed only the KPI and its dept node — no GOs for this dept.
    await putNode(deptGraphNode(emptyDept));
    await putNode(kpiNode(emptyKpi));
    for (const e of kpiEdges(emptyKpi)) {
      await putEdge(e, { requireNodes: false });
    }

    const results = await getKpiDepartmentOrders(emptyKpi.id);
    assert(Array.isArray(results), "must always return an array");
    assert(results.length === 0, "no GOs ingested means empty result");
  },
);

Deno.test(
  "getKpiDepartmentOrders carries bilingual fields and sourceUrl",
  async () => {
    await seedGraph(
      [GO_FROM_FINANCE_1],
      KPI_OWNED_BY_FINANCE,
      [DEPT_FINANCE],
    );

    const results = await getKpiDepartmentOrders(KPI_OWNED_BY_FINANCE.id);
    const entry = results.find((r) => r.id === "go.2026-fin-98");
    assert(!!entry, "expected GO entry");
    assert(
      entry!.subject === GO_FROM_FINANCE_1.subject,
      "English subject must be preserved",
    );
    assert(
      entry!.subjectMl === GO_FROM_FINANCE_1.subjectMl,
      "Malayalam subject must be preserved",
    );
    assert(
      entry!.sourceUrl === GO_FROM_FINANCE_1.meta.sourceUrl,
      "sourceUrl must be preserved",
    );
    assert(
      entry!.goNumber === GO_FROM_FINANCE_1.goNumber,
      "goNumber must be preserved",
    );
  },
);

Deno.test(
  "getKpiPromiseBackedOrders returns GOs via curated relatedKpiIds only",
  async () => {
    await seedPromiseGraph(
      KPI_OWNED_BY_FINANCE,
      [GO_PROMISE_CURATED, GO_PROMISE_CATEGORY_ONLY],
      [GOAL_CURATED, GOAL_CATEGORY_ONLY],
      [DEPT_FINANCE],
    );

    const results = await getKpiPromiseBackedOrders(KPI_OWNED_BY_FINANCE.id);
    const ids = results.map((r) => r.id);

    assert(
      ids.includes("go.test-promise-curated"),
      "curated goal bridge must surface the backing GO",
    );
    assert(
      !ids.includes("go.test-promise-category"),
      "category-only goal must NOT surface without relatedKpiIds",
    );
    assert(
      results[0].confidence === "direct",
      "IMPACTS edge confidence must be preserved",
    );
    assert(
      results[0].goals.some((g) => g.id === "goal.test-fiscal-curated"),
      "backing goal must be attached to the order",
    );
  },
);

Deno.test(
  "getKpiPromiseBackedOrders returns empty when no curated relatedKpiIds",
  async () => {
    const kpiNoBridge: Kpi = {
      ...KPI_OWNED_BY_FINANCE,
      id: "test.kpi-no-bridge",
    };
    await seedPromiseGraph(
      kpiNoBridge,
      [GO_PROMISE_CATEGORY_ONLY],
      [GOAL_CATEGORY_ONLY],
      [DEPT_FINANCE],
    );

    const results = await getKpiPromiseBackedOrders(kpiNoBridge.id);
    assert(results.length === 0, "no curated bridge means empty result");
  },
);
