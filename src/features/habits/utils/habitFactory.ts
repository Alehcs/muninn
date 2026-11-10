import type { Habit, NewHabitInput } from "../types";

let sequence = 0;

/** Genera un id único para hábitos creados en runtime. */
function generateId(): string {
  sequence += 1;
  return `habit-${Date.now().toString(36)}-${sequence}`;
}

/** Construye un hábito nuevo (activo) a partir de los datos del formulario. */
export function buildHabit(input: NewHabitInput): Habit {
  return {
    id: generateId(),
    name: input.name.trim(),
    type: input.type,
    target: input.target,
    unit: input.unit,
    category: input.category,
    active: true,
  };
}
