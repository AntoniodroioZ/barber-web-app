const STORAGE_KEY = "public_appointments";

export type StoredAppointment = {
  id: string;
  manage_token: string;
  starts_at: string;
  ends_at: string;
  service_name: string;
  barber_name: string;
  barber_id: string;
  branch_id: string;
};

function readAll(): StoredAppointment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredAppointment[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: StoredAppointment[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function saveAppointment(appointment: StoredAppointment) {
  const next = readAll().filter((item) => item.id !== appointment.id);
  next.unshift(appointment);
  writeAll(next.slice(0, 10));
}

export function removeAppointment(id: string) {
  writeAll(readAll().filter((item) => item.id !== id));
}

/** Cita aún vigente: no ha terminado (ni cancelada en este dispositivo). */
export function isAppointmentActive(item: StoredAppointment, now = Date.now()): boolean {
  const end = new Date(item.ends_at).getTime();
  if (Number.isNaN(end)) return false;
  return end > now;
}

export function listAppointmentsForStation(
  barberId: string,
  branchId: string,
): StoredAppointment[] {
  const now = Date.now();
  return readAll().filter(
    (item) =>
      item.barber_id === barberId &&
      item.branch_id === branchId &&
      isAppointmentActive(item, now),
  );
}
