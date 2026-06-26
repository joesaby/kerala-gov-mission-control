import {
  computeDeptGoVelocity,
  computeManifestoCoverage,
  computeOfficeChurn,
} from "./insights.ts";
import type {
  Appointment,
  Department,
  GovernmentOrder,
  ManifestoGoal,
} from "../data/types.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function assertEq<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${expected}, got ${actual}`);
  }
}

// ── Fixtures ────────────────────────────────────────────────────────────────

const DEPT_FIN: Department = {
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
  name: "Health",
  nameMl: "ആരോഗ്യം",
  domains: ["health"],
  dataStatus: "verified",
};

const GOAL_A: ManifestoGoal = {
  id: "goal.a",
  governmentId: "govt.pinarayi-2",
  title: "Build roads",
  titleMl: "റോഡ് നിർമ്മാണം",
  category: "infrastructure",
  status: "committed",
  dataStatus: "verified",
};

const GOAL_B: ManifestoGoal = {
  id: "goal.b",
  governmentId: "govt.pinarayi-2",
  title: "Improve health",
  titleMl: "ആരോഗ്യ മെച്ചപ്പെടുത്തൽ",
  category: "health",
  status: "committed",
  dataStatus: "verified",
};

function makeOrder(
  id: string,
  opts: {
    deptId?: string;
    date?: string;
    goalIds?: string[];
  } = {},
): GovernmentOrder {
  return {
    id,
    goNumber: `G.O.(P) No.${id}`,
    type: "P",
    subject: `Order ${id}`,
    deptId: opts.deptId,
    deptConfidence: "high",
    date: opts.date ?? "2025-01-15",
    manifestoGoalIds: opts.goalIds,
    meta: {
      source: "orders",
      sourceUrl: `https://document.kerala.gov.in/${id}.pdf`,
      retrievedAt: "2025-01-15T10:00:00Z",
    },
    dataStatus: "verified",
  };
}

function makeAppointment(
  id: string,
  opts: {
    office?: string;
    branch?: Appointment["branch"];
    action?: Appointment["action"];
    termStart?: string;
    termEnd?: string;
    deptId?: string;
  } = {},
): Appointment {
  return {
    id,
    goId: `go.test-${id}`,
    appointeeName: `Person ${id}`,
    office: opts.office ?? "Secretary",
    branch: opts.branch ?? "bureaucratic",
    action: opts.action ?? "appointment",
    deptId: opts.deptId,
    termStart: opts.termStart ?? "2025-01-01",
    termEnd: opts.termEnd,
    confidence: "high",
    source: "orders",
    sourceUrl: `https://document.kerala.gov.in/${id}.pdf`,
    dataStatus: "unverified",
  };
}

// ── computeManifestoCoverage ─────────────────────────────────────────────────

Deno.test("computeManifestoCoverage: goals with zero backing GOs", () => {
  const goals = [GOAL_A, GOAL_B];
  const orders = [
    makeOrder("o1", { goalIds: ["goal.a"] }),
    makeOrder("o2", { goalIds: ["goal.a"] }),
  ];
  const result = computeManifestoCoverage(goals, orders);

  assertEq(result.zeroCoverageGoals.length, 1, "one uncovered goal");
  assertEq(result.zeroCoverageGoals[0].id, "goal.b", "uncovered goal is B");
  assertEq(result.offManifestoCount, 0, "no off-manifesto orders");
  assertEq(result.totalGoals, 2, "total goals");
  assertEq(result.totalOrders, 2, "total orders");
});

Deno.test("computeManifestoCoverage: off-manifesto orders", () => {
  const goals = [GOAL_A];
  const orders = [
    makeOrder("o1", { goalIds: ["goal.a"] }),
    makeOrder("o2"),
    makeOrder("o3"),
  ];
  const result = computeManifestoCoverage(goals, orders);

  assertEq(result.offManifestoCount, 2, "two off-manifesto orders");
  assertEq(result.offManifestoOrders.length, 2, "off-manifesto list length");
  assertEq(result.zeroCoverageGoals.length, 0, "all goals covered");
});

Deno.test("computeManifestoCoverage: empty inputs", () => {
  const result = computeManifestoCoverage([], []);
  assertEq(result.zeroCoverageGoals.length, 0, "no goals");
  assertEq(result.offManifestoCount, 0, "no off-manifesto");
  assertEq(result.totalOrders, 0, "no orders");
});

Deno.test("computeManifestoCoverage: all goals have zero coverage", () => {
  const goals = [GOAL_A, GOAL_B];
  const orders = [makeOrder("o1"), makeOrder("o2")];
  const result = computeManifestoCoverage(goals, orders);

  assertEq(result.zeroCoverageGoals.length, 2, "both goals uncovered");
  assertEq(result.offManifestoCount, 2, "both orders are off-manifesto");
});

Deno.test("computeManifestoCoverage: goal id not in goals list is still tracked", () => {
  const goals = [GOAL_A];
  const orders = [makeOrder("o1", { goalIds: ["goal.unknown"] })];
  const result = computeManifestoCoverage(goals, orders);

  assertEq(result.zeroCoverageGoals.length, 1, "GOAL_A still uncovered");
  assertEq(
    result.offManifestoCount,
    0,
    "order mapped to a goal (even unknown)",
  );
});

// ── computeDeptGoVelocity ────────────────────────────────────────────────────

Deno.test("computeDeptGoVelocity: basic bucketing", () => {
  const orders = [
    makeOrder("o1", { deptId: "dept.finance", date: "2025-01-10" }),
    makeOrder("o2", { deptId: "dept.finance", date: "2025-01-20" }),
    makeOrder("o3", { deptId: "dept.finance", date: "2025-02-05" }),
    makeOrder("o4", { deptId: "dept.health", date: "2025-01-15" }),
  ];
  const result = computeDeptGoVelocity(orders, [DEPT_FIN, DEPT_HEALTH]);

  const finSummary = result.summaries.find((s) => s.dept.id === "dept.finance");
  assert(finSummary !== undefined, "Finance summary present");
  assertEq(finSummary!.monthlyBuckets.length, 2, "Finance has 2 months");

  const jan = finSummary!.monthlyBuckets.find((b) => b.month === "2025-01");
  const feb = finSummary!.monthlyBuckets.find((b) => b.month === "2025-02");
  assertEq(jan!.count, 2, "Finance Jan = 2");
  assertEq(feb!.count, 1, "Finance Feb = 1");
});

Deno.test("computeDeptGoVelocity: orders with no deptId are skipped", () => {
  const orders = [
    makeOrder("o1"),
    makeOrder("o2", { deptId: "dept.finance", date: "2025-03-01" }),
  ];
  const result = computeDeptGoVelocity(orders, [DEPT_FIN]);
  assertEq(result.summaries.length, 1, "only dept.finance has a summary");
});

Deno.test("computeDeptGoVelocity: anomaly flagging", () => {
  // Build history with consistent count of 1/month, then spike to 10
  const orders: GovernmentOrder[] = [];
  for (let m = 1; m <= 11; m++) {
    const month = String(m).padStart(2, "0");
    orders.push(
      makeOrder(`o-hist-${m}`, {
        deptId: "dept.finance",
        date: `2024-${month}-10`,
      }),
    );
  }
  // Spike in Dec 2024: 10 orders
  for (let i = 0; i < 10; i++) {
    orders.push(
      makeOrder(`o-spike-${i}`, {
        deptId: "dept.finance",
        date: `2024-12-${10 + i}`,
      }),
    );
  }

  const result = computeDeptGoVelocity(orders, [DEPT_FIN]);
  const finSummary = result.summaries.find((s) => s.dept.id === "dept.finance");
  assert(finSummary !== undefined, "Finance summary present");
  assert(finSummary!.anomalous, "Dec spike is anomalous");
  assert(result.flagged.length >= 1, "flagged list is non-empty");
});

Deno.test("computeDeptGoVelocity: single month is not anomalous", () => {
  const orders = [
    makeOrder("o1", { deptId: "dept.finance", date: "2025-01-10" }),
  ];
  const result = computeDeptGoVelocity(orders, [DEPT_FIN]);
  const finSummary = result.summaries[0];
  // No baseline → not anomalous
  assert(!finSummary.anomalous, "single month should not be flagged");
});

// ── computeOfficeChurn ───────────────────────────────────────────────────────

Deno.test("computeOfficeChurn: counts closed tenures", () => {
  const today = new Date().toISOString().slice(0, 10);
  const appts = [
    makeAppointment("a1", {
      office: "Secretary",
      termStart: today,
      termEnd: today,
    }),
    makeAppointment("a2", {
      office: "Secretary",
      termStart: today,
      termEnd: today,
    }),
    makeAppointment("a3", {
      office: "Secretary",
      termStart: today,
      termEnd: undefined,
    }),
  ];
  const result = computeOfficeChurn(appts, 180);

  assertEq(result.totalClosed, 2, "two closed tenures");
  assertEq(result.entries.length, 1, "one unique office");
  assertEq(result.entries[0].closedCount, 2, "Secretary closed 2×");
  assert(!result.noData, "not noData — appointments present");
});

Deno.test("computeOfficeChurn: respects window", () => {
  const old = "2000-01-01";
  const today = new Date().toISOString().slice(0, 10);
  const appts = [
    makeAppointment("a1", { termStart: old, termEnd: old }),
    makeAppointment("a2", { termStart: today, termEnd: today }),
  ];
  const result = computeOfficeChurn(appts, 30);

  assertEq(result.totalClosed, 1, "only recent closed tenure in window");
});

Deno.test("computeOfficeChurn: empty appointments", () => {
  const result = computeOfficeChurn([], 180);

  assertEq(result.totalClosed, 0, "no closed tenures");
  assert(result.noData, "noData flag set");
  assertEq(result.entries.length, 0, "no entries");
});

Deno.test("computeOfficeChurn: provenance GO ids collected", () => {
  const today = new Date().toISOString().slice(0, 10);
  const a1 = makeAppointment("a1", {
    office: "Director",
    termStart: today,
    termEnd: today,
  });
  const a2 = makeAppointment("a2", {
    office: "Director",
    termStart: today,
    termEnd: today,
  });
  const result = computeOfficeChurn([a1, a2], 180);

  assertEq(result.entries[0].goIds.length, 2, "two distinct GO ids");
});
