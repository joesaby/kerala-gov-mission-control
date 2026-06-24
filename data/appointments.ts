import type { Appointment } from "./types.ts";

/**
 * Static baseline of Kerala government appointments seeded into KV on cold start.
 *
 * Appointments are extracted automatically from appointment / posting / transfer
 * Government Orders by the daily ingest (see lib/ingest.ts) — each `Appointment`
 * carries `goId` back to the order that made it, and is written to a durable KV
 * mirror (`["appointment_ingested"]`) that survives reseeds, exactly like the GO
 * mirror. So this file is intentionally small.
 *
 * Like data/government-orders.ts, only records with a verified, resolvable source
 * PDF ship here — do NOT add speculative records with guessed names or URLs; the
 * cron + `deno task ingest-gos --repair` fill the rest from real documents.
 *
 * IDs: appt.<go-suffix>-<n>  (e.g. go.2026-fin-162 → appt.2026-fin-162-0)
 */
export const APPOINTMENTS: Appointment[] = [];
