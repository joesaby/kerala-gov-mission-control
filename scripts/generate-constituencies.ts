/** One-off generator for data/constituencies.ts from minister constituency names. */
import { MINISTERS } from "../data/ministers.ts";

function slug(n: string): string {
  return n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const names = [
  ...new Set(
    MINISTERS.map((m) => m.constituency).filter((
      n,
    ): n is string => !!n),
  ),
].sort();

const lines = names.map((n) => {
  const s = slug(n);
  return `  {
    id: "constituency.${s}",
    slug: "${s}",
    name: ${JSON.stringify(n)},
    district: "TBD",
    reservedFor: "General",
    dataStatus: "unverified",
  }`;
});

const out = `import type { Constituency } from "./types.ts";

/**
 * Assembly constituencies referenced by minister records (78 of 140).
 * Full ECI Delimitation Order set pending — unlisted seats are not yet seeded.
 * Source: constituency names on Minister records (CEO Kerala / ECI results).
 */
export const CONSTITUENCIES: Constituency[] = [
${lines.join(",\n")},
];
`;

await Deno.writeTextFile("data/constituencies.ts", out);
console.log(`wrote ${names.length} constituencies`);
