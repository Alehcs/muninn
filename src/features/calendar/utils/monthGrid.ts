import { getLocalDate } from "@/features/habits/utils/date";

export interface CalendarGridDay {
  date: string;
  dayNumber: number;
  inMonth: boolean;
}

function parseMonthKey(monthKey: string): Date {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function getMonthKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getCurrentMonthKey(): string {
  return getMonthKeyFromDate(new Date());
}

export function shiftMonthKey(monthKey: string, offset: number): string {
  return getMonthKeyFromDate(addMonths(parseMonthKey(monthKey), offset));
}

export function getMonthRange(monthKey: string): {
  startDate: string;
  endDate: string;
} {
  const firstDay = parseMonthKey(monthKey);
  const lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0);

  return {
    startDate: getLocalDate(firstDay),
    endDate: getLocalDate(lastDay),
  };
}

export function getMonthLabel(monthKey: string): string {
  return parseMonthKey(monthKey).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}

/** Genera semanas completas empezando en lunes para renderizar un mes. */
export function getMonthWeeks(monthKey: string): CalendarGridDay[][] {
  const firstDay = parseMonthKey(monthKey);
  const lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const lastWeekday = (lastDay.getDay() + 6) % 7;
  const gridStart = addDays(firstDay, -firstWeekday);
  const gridEnd = addDays(lastDay, 6 - lastWeekday);
  const weeks: CalendarGridDay[][] = [];

  let current = gridStart;
  while (current <= gridEnd) {
    const week: CalendarGridDay[] = [];
    for (let day = 0; day < 7; day += 1) {
      week.push({
        date: getLocalDate(current),
        dayNumber: current.getDate(),
        inMonth: current.getMonth() === firstDay.getMonth(),
      });
      current = addDays(current, 1);
    }
    weeks.push(week);
  }

  return weeks;
}
