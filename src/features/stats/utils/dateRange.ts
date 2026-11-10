import { getLocalDate } from "@/features/habits/utils/date";

function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Devuelve un rango inclusivo de fechas locales YYYY-MM-DD. */
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  while (current <= end) {
    dates.push(getLocalDate(current));
    current = addDays(current, 1);
  }

  return dates;
}

/** Devuelve los últimos `days` días, incluyendo `endDate`. */
export function getDateRangeEndingOn(endDate: string, days: number): string[] {
  if (days <= 0) return [];
  const end = parseLocalDate(endDate);
  const start = addDays(end, -(days - 1));
  return getDateRange(getLocalDate(start), endDate);
}
