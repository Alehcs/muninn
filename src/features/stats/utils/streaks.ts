import type { Habit } from "@/features/habits/types";
import type { LogValuesByHabit } from "./compliance";

function completedOnDate(
  habit: Habit,
  date: string,
  valuesByHabit: LogValuesByHabit,
): boolean {
  const value = valuesByHabit[habit.id]?.[date] ?? 0;
  return value >= habit.target;
}

/** Racha activa: días consecutivos completados hasta hoy. */
export function getCurrentStreak(
  habit: Habit,
  dates: string[],
  valuesByHabit: LogValuesByHabit,
): number {
  let streak = 0;

  for (let index = dates.length - 1; index >= 0; index -= 1) {
    if (!completedOnDate(habit, dates[index], valuesByHabit)) break;
    streak += 1;
  }

  return streak;
}

/** Mejor racha dentro del rango entregado. */
export function getBestStreak(
  habit: Habit,
  dates: string[],
  valuesByHabit: LogValuesByHabit,
): number {
  let current = 0;
  let best = 0;

  for (const date of dates) {
    if (completedOnDate(habit, date, valuesByHabit)) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }

  return best;
}
