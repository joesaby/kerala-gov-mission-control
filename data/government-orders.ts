import type { GovernmentOrder } from "./types.ts";

/**
 * Ingested Kerala Government Orders, Circulars, and Legislative Bills.
 * Populated by the `ingest-go` skill (see .claude/skills/ingest-go/SKILL.md).
 *
 * Every record MUST carry `meta.sourceUrl` — a direct link to the PDF or
 * portal page. No source URL = record does not ship.
 *
 * IDs are namespaced: go.<year>-<deptCode lower-case>-<number>
 * Example: go.2021-fin-162
 */
export const GOVERNMENT_ORDERS: GovernmentOrder[] = [];
