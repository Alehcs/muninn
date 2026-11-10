import { createId } from "@/lib/ids";
import type { Habit, NewHabitInput } from "../types";

/** Construye un hábito nuevo (activo) a partir de los datos del formulario. */
export function buildHabit(input: NewHabitInput): Habit {
  return {
    id: createId("habit"),
    name: input.name.trim(),
    type: input.type,
    target: input.target,
    unit: input.unit,
    category: input.category,
    active: true,
  };
}
