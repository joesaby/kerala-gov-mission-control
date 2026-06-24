import { type EgoGroup, layoutEgoNetwork } from "./ego-layout.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const cy = (b: { y: number; h: number }) => b.y + b.h / 2;

const GROUPS: EgoGroup[] = [
  {
    id: "dept.finance",
    label: "Finance",
    leaves: [
      { id: "fiscal.debt", label: "Debt" },
      { id: "fiscal.deficit", label: "Deficit" },
    ],
  },
  {
    id: "dept.health",
    label: "Health",
    leaves: [{ id: "health.imr", label: "IMR" }],
  },
];

Deno.test("every leaf gets a distinct, evenly spaced row (no overlap)", () => {
  const l = layoutEgoNetwork({ label: "Minister" }, GROUPS);
  assert(l.leaves.length === 3, "expected 3 leaf boxes");
  const ys = l.leaves.map(cy).sort((a, b) => a - b);
  for (let i = 1; i < ys.length; i++) {
    assert(ys[i] - ys[i - 1] === 56, "leaf rows must be one ROW apart");
  }
});

Deno.test("each group is vertically centered within its leaves' span", () => {
  const l = layoutEgoNetwork({ label: "Minister" }, GROUPS);
  // Finance spans rows 0–1; its centre must sit between those two leaf centres.
  const finance = l.groups[0];
  const fLeaves = l.leaves.slice(0, 2).map(cy);
  assert(
    cy(finance) >= Math.min(...fLeaves) && cy(finance) <= Math.max(...fLeaves),
    "group not centered on its leaves",
  );
  // Health has a single leaf — group centre aligns with it.
  assert(cy(l.groups[1]) === cy(l.leaves[2]), "single-leaf group misaligned");
});

Deno.test("center node sits at the mean of the group centers", () => {
  const l = layoutEgoNetwork({ label: "Minister" }, GROUPS);
  const mean = (cy(l.groups[0]) + cy(l.groups[1])) / 2;
  assert(Math.abs(cy(l.center) - mean) < 0.001, "center not at group mean");
});

Deno.test("edge count is one per group plus one per leaf", () => {
  const l = layoutEgoNetwork({ label: "Minister" }, GROUPS);
  assert(l.edges.length === 2 + 3, "expected groups + leaves edges");
  // Tiers connect left-to-right: x1 < x2 on every edge.
  assert(l.edges.every((e) => e.x1 < e.x2), "edges must flow left to right");
});

Deno.test("a leafless group still occupies a row and stays laid out", () => {
  const l = layoutEgoNetwork({ label: "M" }, [
    { id: "d.empty", label: "Empty", leaves: [] },
  ]);
  assert(l.groups.length === 1, "leafless group dropped");
  assert(l.leaves.length === 0, "phantom leaf created");
  assert(l.height > 0, "height collapsed");
});

Deno.test("height grows with leaf count", () => {
  const small = layoutEgoNetwork({ label: "M" }, GROUPS).height;
  const big = layoutEgoNetwork({ label: "M" }, [{
    id: "d",
    label: "D",
    leaves: Array.from(
      { length: 8 },
      (_, i) => ({ id: `k${i}`, label: `K${i}` }),
    ),
  }]).height;
  assert(big > small, "height should scale with leaves");
});
