import { addDays, format, parseISO, startOfWeek } from "date-fns";

/** The backend requires week_start_date to be a Monday. */
export function mondayOf(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function currentWeekStart(): string {
  return toISODate(mondayOf());
}

export function shiftWeeks(isoDate: string, weeks: number): string {
  return toISODate(addDays(parseISO(isoDate), weeks * 7));
}

/** "6 - 10 Jan 2026" */
export function formatWeekRange(startISO: string, endISO: string): string {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  const sameMonth = start.getMonth() === end.getMonth();
  return sameMonth
    ? `${format(start, "d")} – ${format(end, "d MMM yyyy")}`
    : `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy");
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy, HH:mm");
}

/** The last N Mondays, most recent first - for week pickers. */
export function recentWeeks(count = 12): string[] {
  const monday = mondayOf();
  return Array.from({ length: count }, (_, i) => toISODate(addDays(monday, -i * 7)));
}