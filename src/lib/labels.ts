import type { BarberStatus, OpeningHours } from "../api/types";

const STATUS_LABEL: Record<BarberStatus, string> = {
  AVAILABLE: "Disponible",
  BUSY_WAITLIST_OPEN: "En corte",
  BUSY_WAITLIST_FULL: "Lista llena",
  OFFLINE: "Fuera de línea",
};

const DAY_LABEL: { key: keyof OpeningHours; label: string }[] = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

const STATUS_TONE: Record<BarberStatus, string> = {
  AVAILABLE: "available",
  BUSY_WAITLIST_OPEN: "busy",
  BUSY_WAITLIST_FULL: "full",
  OFFLINE: "offline",
};

export function statusLabel(status: BarberStatus): string {
  return STATUS_LABEL[status] ?? status;
}

export function statusTone(status: BarberStatus): string {
  return STATUS_TONE[status] ?? "offline";
}

export function initials(name: string): string {
  const letters = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "?";
}

export function dayRows(hours: OpeningHours): { label: string; value: string }[] {
  return DAY_LABEL.map(({ key, label }) => {
    const ranges = hours[key] ?? [];
    const value =
      ranges.length === 0
        ? "Cerrado"
        : ranges.map((range) => `${range.open}–${range.close}`).join(", ");
    return { label, value };
  });
}

export function mapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}
