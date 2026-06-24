import {
  deptNode,
  kpiEdges,
  kpiNode,
  ministerEdges,
  orderEdges,
  orderNode,
} from "./graph.ts";
import type {
  Department,
  GovernmentOrder,
  Kpi,
  Minister,
} from "../data/types.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const DEPT: Department = {
  id: "dept.finance",
  slug: "finance",
  name: "Finance",
  nameMl: "ധനകാര്യം",
  domains: ["fiscal"],
  dataStatus: "verified",
};

const KPI: Kpi = {
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
    definition: "d",
    definitionMl: "d",
    source: "CAG",
    sourceUrl: "https://example.gov.in",
    owner: "Principal Secretary (Finance)",
    updateFrequency: "annual",
    lastRefreshed: "2026-06-01T00:00:00+05:30",
  },
};

const MINISTER: Minister = {
  id: "min.kn-balagopal",
  slug: "kn-balagopal",
  personId: "person.kn-balagopal",
  name: "K. N. Balagopal",
  departmentIds: ["dept.finance", "dept.excise"],
  termStart: "2021-05-20",
  dataStatus: "verified",
};

const ORDER: GovernmentOrder = {
  id: "go.2026-fin-98",
  goNumber: "G.O.(P) No.98/2026/Fin",
  type: "P",
  subject: "Release of KIIFB capital grant",
  subjectMl: "കിഫ്ബി മൂലധന ഗ്രാന്റ് അനുവദിക്കൽ",
  deptId: "dept.finance",
  deptConfidence: "high",
  date: "2026-04-10",
  manifestoGoalIds: ["goal.ldf2021-kiifb", "goal.ldf2021-infra"],
  manifestoConfidence: "direct",
  meta: {
    source: "orders",
    sourceUrl: "https://document.kerala.gov.in/98.pdf",
    retrievedAt: "2026-04-11T02:30:00+05:30",
  },
  dataStatus: "unverified",
};

Deno.test("kpiNode carries id verbatim, type, and bilingual label", () => {
  const n = kpiNode(KPI);
  assert(n.id === "fiscal.debt-to-gsdp", "id must be the entity id verbatim");
  assert(n.type === "kpi", "wrong node type");
  assert(n.label === "Debt to GSDP", "wrong EN label");
  assert(n.labelMl === "കടം / ജി.എസ്.ഡി.പി", "missing Malayalam label");
});

Deno.test("deptNode and orderNode preserve Malayalam labels", () => {
  assert(deptNode(DEPT).labelMl === "ധനകാര്യം", "dept labelMl lost");
  const o = orderNode(ORDER);
  assert(o.type === "government_order", "wrong order node type");
  assert(o.labelMl === "കിഫ്ബി മൂലധന ഗ്രാന്റ് അനുവദിക്കൽ", "order labelMl lost");
  assert(
    o.properties?.sourceUrl === ORDER.meta.sourceUrl,
    "sourceUrl not projected",
  );
});

Deno.test("kpiEdges links the KPI to its owner department", () => {
  const [e] = kpiEdges(KPI);
  assert(e.type === "OWNED_BY", "wrong edge type");
  assert(
    e.sourceId === "fiscal.debt-to-gsdp" && e.targetId === "dept.finance",
    "wrong endpoints",
  );
});

Deno.test("kpiEdges is empty when ownership is unassigned", () => {
  assert(
    kpiEdges({ ...KPI, ownerDeptId: undefined }).length === 0,
    "should emit no edge",
  );
});

Deno.test("ministerEdges emits one PORTFOLIO edge per department with tenure", () => {
  const edges = ministerEdges(MINISTER);
  assert(edges.length === 2, "expected one edge per department");
  assert(edges.every((e) => e.type === "PORTFOLIO"), "wrong edge type");
  assert(
    edges.every((e) => e.sourceId === "person.kn-balagopal"),
    "source must be the person, not the tenure",
  );
  assert(
    edges[0].properties?.termEnd === undefined,
    "open tenure must leave termEnd undefined (active holder)",
  );
  assert(
    edges.map((e) => e.targetId).includes("dept.excise"),
    "missing a held department",
  );
});

Deno.test("orderEdges yields ISSUED_BY + one IMPACTS per manifesto goal", () => {
  const edges = orderEdges(ORDER);
  assert(edges.length === 3, "expected 1 ISSUED_BY + 2 IMPACTS");
  const issued = edges.find((e) => e.type === "ISSUED_BY");
  assert(
    !!issued && issued.targetId === "dept.finance",
    "missing ISSUED_BY to dept",
  );
  const impacts = edges.filter((e) => e.type === "IMPACTS");
  assert(impacts.length === 2, "wrong IMPACTS count");
  assert(
    impacts.every((e) => e.properties?.confidence === "direct"),
    "manifesto confidence not carried",
  );
  assert(
    impacts.every((e) => e.properties?.date === "2026-04-10"),
    "edge date not carried",
  );
});

Deno.test("orderEdges omits ISSUED_BY when department tagging is ambiguous", () => {
  const edges = orderEdges({
    ...ORDER,
    deptId: undefined,
    manifestoGoalIds: [],
  });
  assert(edges.length === 0, "no edges expected without dept or goals");
});
