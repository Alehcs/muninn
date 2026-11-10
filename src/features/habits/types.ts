/** Tipos de hábito soportados. */
export type HabitType = "check" | "count" | "duration";

/** Estado visual de un hábito según su avance del día. */
export type HabitStatus = "pending" | "in-progress" | "completed";

/** Unidad del objetivo diario. */
export type HabitUnit = "completado" | "veces" | "minutos" | "problemas";

/** Categoría opcional de un hábito. */
export type HabitCategory =
  | "salud"
  | "estudio"
  | "orden"
  | "ejercicio"
  | "idioma"
  | "otra";

/** Definición de un hábito. */
export interface Habit {
  id: string;
  name: string;
  type: HabitType;
  /** Objetivo diario. check: 1 · count: nº de veces · duration: minutos. */
  target: number;
  unit: HabitUnit;
  category?: HabitCategory;
  /** Si está pausado (false) no aparece en la vista "Hoy". */
  active: boolean;
}

/** Vista derivada de un hábito + su valor actual (para la UI). */
export interface HabitProgress {
  habit: Habit;
  value: number;
  percent: number;
  status: HabitStatus;
}

/** Registro de un hábito en una fecha concreta. Aún sin persistencia. */
export interface HabitLog {
  habitId: string;
  /** Fecha en formato YYYY-MM-DD. */
  date: string;
  value: number;
}

/** Datos para crear un hábito nuevo. */
export interface NewHabitInput {
  name: string;
  type: HabitType;
  target: number;
  unit: HabitUnit;
  category?: HabitCategory;
}

/** Campos editables de un hábito existente. */
export interface HabitEditInput {
  name: string;
  target: number;
  category?: HabitCategory;
}
