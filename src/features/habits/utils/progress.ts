import type { Habit, HabitProgress, HabitStatus } from "../types";

/** Porcentaje de avance (0-100) de un hábito según su valor actual. */
export function getPercent(habit: Habit, value: number): number {
  if (habit.target <= 0) return 0;
  return Math.min(100, Math.round((value / habit.target) * 100));
}

/** Estado de un hábito: pendiente, en progreso o completado. */
export function getStatus(habit: Habit, value: number): HabitStatus {
  if (value <= 0) return "pending";
  if (value >= habit.target) return "completed";
  return "in-progress";
}

/** Construye la vista derivada de un hábito a partir de su valor. */
export function getHabitProgress(habit: Habit, value: number): HabitProgress {
  return {
    habit,
    value,
    percent: getPercent(habit, value),
    status: getStatus(habit, value),
  };
}

export interface DailyProgress {
  /** Promedio de cumplimiento de todos los hábitos (0-100). */
  percent: number;
  completed: number;
  total: number;
}

/** Resumen del día: promedio de cumplimiento y hábitos completados. */
export function getDailyProgress(
  habits: Habit[],
  values: Record<string, number>,
): DailyProgress {
  if (habits.length === 0) return { percent: 0, completed: 0, total: 0 };

  let sum = 0;
  let completed = 0;
  for (const habit of habits) {
    const value = values[habit.id] ?? 0;
    sum += getPercent(habit, value);
    if (getStatus(habit, value) === "completed") completed++;
  }

  return {
    percent: Math.round(sum / habits.length),
    completed,
    total: habits.length,
  };
}
