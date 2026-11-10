import type { Habit } from "@/features/habits/types";

export type LogValuesByHabit = Record<string, Record<string, number>>;

function isCompleted(habit: Habit, value: number): boolean {
  return value >= habit.target;
}

function toPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

/** Porcentaje de cumplimiento de un hábito en un rango de fechas. */
export function getHabitCompliancePercent(
  habit: Habit,
  dates: string[],
  valuesByHabit: LogValuesByHabit,
): number {
  const valuesByDate = valuesByHabit[habit.id] ?? {};
  const completed = dates.filter((date) =>
    isCompleted(habit, valuesByDate[date] ?? 0),
  ).length;

  return toPercent(completed, dates.length);
}

/** Porcentaje de cumplimiento agregado de varios hábitos en un rango. */
export function getOverallCompliancePercent(
  habits: Habit[],
  dates: string[],
  valuesByHabit: LogValuesByHabit,
): number {
  const total = habits.length * dates.length;
  let completed = 0;

  for (const habit of habits) {
    const valuesByDate = valuesByHabit[habit.id] ?? {};
    for (const date of dates) {
      if (isCompleted(habit, valuesByDate[date] ?? 0)) completed += 1;
    }
  }

  return toPercent(completed, total);
}
