import {
  listAppointments,
  listDepartments,
  listGovernmentOrders,
  listPersons,
} from "../data/db.ts";
import type {
  Appointment,
  Department,
  GovernmentOrder,
} from "../data/types.ts";

export interface GovDocumentLanes {
  cabinet: GovernmentOrder[];
  orders: GovernmentOrder[];
  appointments: Appointment[];
  depts: Department[];
  personSlugById: Record<string, string>;
  total: number;
}

/** Shared loader for split /gov document routes (orders, decisions, appointments). */
export async function loadGovDocumentLanes(): Promise<GovDocumentLanes> {
  const [all, appointments, depts, persons] = await Promise.all([
    listGovernmentOrders(),
    listAppointments(),
    listDepartments(),
    listPersons(),
  ]);
  const personSlugById = Object.fromEntries(
    persons.map((p) => [p.id, p.slug]),
  );
  const apptGoIds = new Set(appointments.map((a) => a.goId));
  const cabinet = all.filter((o) =>
    o.type === "Cabinet" && !apptGoIds.has(o.id)
  );
  const orders = all.filter((o) =>
    o.type !== "Cabinet" && !apptGoIds.has(o.id)
  );
  return {
    cabinet,
    orders,
    appointments,
    depts,
    personSlugById,
    total: orders.length + cabinet.length + appointments.length,
  };
}

export function deptOptions(depts: Department[]) {
  return depts.map((d) => ({
    id: d.id,
    name: d.name,
    nameMl: d.nameMl,
    slug: d.slug,
  }));
}
