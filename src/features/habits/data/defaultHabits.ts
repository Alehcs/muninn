import type { Habit } from "../types";

/** Hábitos mock iniciales. Sustituibles por datos persistidos más adelante. */
export const defaultHabits: Habit[] = [
  {
    id: "make-bed",
    name: "Hacer la cama",
    type: "check",
    target: 1,
    unit: "completado",
    category: "orden",
    active: true,
  },
  {
    id: "brush-teeth",
    name: "Lavarse los dientes",
    type: "count",
    target: 2,
    unit: "veces",
    category: "salud",
    active: true,
  },
  {
    id: "reading",
    name: "Lectura diaria",
    type: "duration",
    target: 30,
    unit: "minutos",
    category: "estudio",
    active: true,
  },
  {
    id: "leetcode",
    name: "LeetCode diario",
    type: "count",
    target: 1,
    unit: "problemas",
    category: "estudio",
    active: true,
  },
  {
    id: "language",
    name: "Aprendizaje de idioma",
    type: "duration",
    target: 60,
    unit: "minutos",
    category: "idioma",
    active: true,
  },
];
