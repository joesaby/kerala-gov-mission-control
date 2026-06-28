import { OFFICE_BY_SQUASHED_ALIAS, OFFICES } from "../data/offices.ts";
import type { AppointmentBranch } from "../data/types.ts";

function squash(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Map a free-text office string to a curated `Office.id`. Exact squashed match
 * against title + aliases only — no fuzzy guess, never auto-promotes tier.
 */
export function matchOffice(
  office: string | null | undefined,
  officeMl?: string | null,
  opts?: { branch?: AppointmentBranch; deptId?: string },
): string | undefined {
  for (const raw of [office, officeMl]) {
    if (!raw) continue;
    const id = OFFICE_BY_SQUASHED_ALIAS.get(squash(raw));
    if (!id) continue;
    const o = OFFICES.find((x) => x.id === id);
    if (!o) continue;
    if (opts?.branch && o.branch !== opts.branch) continue;
    if (opts?.deptId && o.deptId && o.deptId !== opts.deptId) continue;
    return id;
  }
  return undefined;
}

export function getOfficeById(id: string) {
  return OFFICES.find((o) => o.id === id);
}

export function getOfficeBySlug(slug: string) {
  return OFFICES.find((o) => o.slug === slug);
}
