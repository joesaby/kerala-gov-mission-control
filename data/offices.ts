import type { Department, Office } from "./types.ts";
import { DEPARTMENTS } from "./departments.ts";

/** Squash for alias comparison (same convention as ingest person matching). */
function squash(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function psOffice(dept: Department): Office {
  const key = dept.id.replace("dept.", "");
  const title = `Principal Secretary (${dept.name})`;
  return {
    id: `office.ps-${key}`,
    slug: `ps-${dept.slug}`,
    title,
    branch: "bureaucratic",
    deptId: dept.id,
    tier: "headline",
    aliases: [
      title,
      `Principal Secretary, ${dept.name}`,
      `Principal Secretary, ${dept.name} Department`,
      `Principal Secretary ${dept.name}`,
      `PS (${dept.name})`,
      `PS ${dept.name}`,
    ],
    dataStatus: "unverified",
  };
}

/** Headline-tier normalized posts — one Principal Secretary per department. */
export const OFFICES: Office[] = DEPARTMENTS.map(psOffice);

/** Lookup table built once for ingest alias matching. */
export const OFFICE_BY_SQUASHED_ALIAS: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const o of OFFICES) {
    map.set(squash(o.title), o.id);
    for (const a of o.aliases ?? []) map.set(squash(a), o.id);
  }
  return map;
})();
