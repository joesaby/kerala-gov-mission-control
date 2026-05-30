# Plan — Government Orders Ingestion (`ingest-go`)

> Status: **approved** · 2026-05-18
>
> **⚠️ Partly superseded (2026-05-30).** This is the original approved plan,
> kept for history. Two "out of scope / deferred" decisions below have since
> been implemented: **LLM-based classification** (now Gemini reads each PDF —
> see `lib/gemini.ts`) and **fetch automation** (now a daily `Deno.cron` — see
> `lib/cron.ts`). Storage also moved from a hand-edited fixture to cron-written
> Deno KV with a durable mirror. The current design is documented in
> `docs/plans/ingest-go-spec.md` and the README's "Government Orders ingest"
> section.

## Problem

Kerala Government Orders (GOs), Circulars, and Legislative Bills are published
across four official portals but are unstructured, untitled, and untagged. The
dashboard has no way to surface or cite them.

## Goal

Write a runnable skill (`ingest-go`) that teaches an AI agent to:

1. Fetch GO documents from official Kerala portals
2. Parse the structured GO number format
3. Tag each record to the correct `dept.id` in `data/departments.ts`
4. Write a typed `GovernmentOrder` record with a mandatory source URL
5. Meet the dashboard's defensibility + tooltip rules

## Scope

**In scope**

- Skill file at `.claude/skills/ingest-go/SKILL.md`
- New `GovernmentOrder` type in `data/types.ts`
- Empty `data/government-orders.ts` fixture
- Four new `DataSource` entries in `data/sources.ts`
- Updates to `AGENTS.md`

**Out of scope (deferred)**

- A UI route for browsing GOs (`routes/orders/` — roadmap item)
- LLM-based classification (strategy C — future enhancement)
- A fetch script / automation (`scripts/fetch-orders.ts`)

## Sources

| id                      | Portal               | URL                               |
| ----------------------- | -------------------- | --------------------------------- |
| `src.go-portal-kerala`  | Document Portal, GoK | document.kerala.gov.in            |
| `src.go-lsg-kerala`     | LSG Dept             | go.lsgkerala.gov.in               |
| `src.niyamasabha-bills` | Kerala Niyamasabha   | niyamasabha.nic.in/…/bills_passed |
| `src.go-wcd-kerala`     | Women & Child Dev    | wcd.kerala.gov.in/gov_orders.php  |

## Department Tagging Strategy

Two-stage, in order:

1. **GO number suffix** (confidence: `high`) — parse the trailing dept code from
   the GO number and map via the lookup table in the skill
2. **Keyword fallback** (confidence: `medium`) — match the subject line against
   `Department.name` and `Department.nameMl`
3. **Ambiguous** (confidence: `low`) — `deptId` left null; rendered with a
   visual caveat in UI

## Decisions

| Decision           | Choice                                      | Rationale                            |
| ------------------ | ------------------------------------------- | ------------------------------------ |
| Navbar / routing   | None yet (skill only)                       | GOs page not on current roadmap      |
| Storage            | Typed fixture (`data/government-orders.ts`) | Matches existing project pattern     |
| Tagging            | Strategy A+B (suffix + keyword)             | Fast, free, auditable                |
| LLM classification | Deferred                                    | Needs API key; adds infra complexity |
