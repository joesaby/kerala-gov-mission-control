/**
 * Unit tests for `getKpiDepartmentOrders` — the 2-hop KPI → dept → GO join.
 *
 * Uses an in-memory Deno KV instance populated manually so no running server
 * or seeded database is required.  The module-level `kv` singleton in db.ts
 * is replaced for the duration of this test file by writing nodes and edges
 * directly into an isolated store via the graph write primitives.
 */
import {
  getKpiDepartmentOrders,
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
} from "../data/types.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DEPT_FINANCE: Department = {
  id: "dept.finance",
  slug: "finance",
  name: "Finance",
  nameMl: "ധനകാര്യം",
  domains: ["fiscal"],
  dataStatus: "verified",
};

const DEPT_HEALTH: Department = {
  id: "dept.health",
  slug: "health",
  name: "Health & Family Welfare",
  nameMl: "ആരോഗ്യം",
  domains: ["health"],
  dataStatus: "verified",
};

const KPI_OWNED_BY_FINANCE: Kpi = {
  id: "fiscal.debt-to-gsdp",
  title: "Debt to GSDP",
  titleMl: "കടം / ജി.എസ്.ഡി.പി",
  domain: "fiscal",
  ownerDeptId: "dept.finance",
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
  id: "fiscal.debt-multi",
  contributingDeptIds: ["dept.health"],
};

const GO_FROM_FINANCE_1: GovernmentOrder = {
  id: "go.2026-fin-98",
  goNumber: "G.O.(P) No.98/2026/Fin",
  type: "P",
  subject: "Release of KIIFB capital grant",
  subjectMl: "കിഫ്ബി മൂലധന ഗ്രാന്റ് അനുവദിക്കൽ",
  deptId: "dept.finance",
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
  deptId: "dept.finance",
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
  deptId: "dept.health",
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

// ---------------------------------------------------------------------------
// Helpers to build the graph in-memory
// ---------------------------------------------------------------------------

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
  assert(results.length >= 2, "should have at least 2 finance orders");
  // 2026-04-10 > 2025-08-20
  assert(
    results[0].date >= results[results.length - 1].date,
    "results must be sorted newest-first",
  );
  assert(results[0].id === "go.2026-fin-98", "newest GO must come first");
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
