/** Local calendar dates YYYY-MM-DD for the next `days` days in a given IANA timezone. */
export function upcomingDates(timezone: string, days = 14): string[] {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const dates: string[] = [];
  const cursor = new Date();

  for (let i = 0; i < days; i += 1) {
    dates.push(formatter.format(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export function formatSlotTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatAppointmentWhen(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDateChip(date: string, timezone: string): string {
  // date is YYYY-MM-DD; interpret midday UTC to avoid edge DST flips
  const iso = `${date}T12:00:00Z`;
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}
