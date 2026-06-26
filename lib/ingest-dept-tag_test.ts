import { tagDepartment } from "./ingest.ts";

function assertEq<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${expected}, got ${actual}`);
  }
}

// Real-world GO suffixes that previously missed the code map and fell into the
// (false-matching) subject-substring fallback. These must resolve high-confidence.

Deno.test("tagDepartment: LSGD suffix → local self government (high)", () => {
  const r = tagDepartment("G.O. (RT)1151/2026/LSGD", "");
  assertEq(r.deptId, "dept.local-self-government", "LSGD deptId");
  assertEq(r.deptConfidence, "high", "LSGD confidence");
});

Deno.test("tagDepartment: WCDD suffix → women & child development (high)", () => {
  const r = tagDepartment("G.O. (RT)217/2026/WCDD", "");
  assertEq(r.deptId, "dept.women-child-development", "WCDD deptId");
  assertEq(r.deptConfidence, "high", "WCDD confidence");
});

Deno.test("tagDepartment: RD suffix → revenue (high)", () => {
  const r = tagDepartment("G.O. (RT)1156/2026/RD", "");
  assertEq(r.deptId, "dept.revenue", "RD deptId");
  assertEq(r.deptConfidence, "high", "RD confidence");
});

Deno.test("tagDepartment: CLAD suffix → cultural affairs, not CMO", () => {
  const r = tagDepartment("G.O. (RT)324/2026/CLAD", "");
  assertEq(r.deptId, "dept.cultural-affairs", "CLAD deptId");
});

Deno.test("tagDepartment: ELEC (Election) does NOT resolve to Power", () => {
  // No Election department exists, so this should stay unmatched (not Power).
  const r = tagDepartment(
    "സ.ഉ.(സാധാ) നം.556/2026/ELEC",
    "Election Department - Sanctioning of funds to the District Election Officer",
  );
  assertEq(r.deptId, undefined, "ELEC must not map to a department");
  assertEq(r.deptConfidence, "low", "ELEC confidence low");
});

Deno.test("tagDepartment: subject mentioning 'powers' does NOT false-tag Power", () => {
  // Unknown suffix forces the fallback; the word "powers" must not match Power.
  const r = tagDepartment(
    "G.O. (RT)217/2026/XYZ",
    "Amendment to restore full statutory powers to the Anti-Corruption Commission",
  );
  assertEq(r.deptId, undefined, "'powers' must not false-tag Power");
});

Deno.test("tagDepartment: known canonical code still resolves (GEDN)", () => {
  const r = tagDepartment("G.O. (RT)4082/2026/GEDN", "");
  assertEq(r.deptId, "dept.general-education", "GEDN deptId");
  assertEq(r.deptConfidence, "high", "GEDN confidence");
});
