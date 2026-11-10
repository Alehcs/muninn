import { describe, expect, it } from "vitest";
import type { Habit } from "../types";
import {
  getDailyProgress,
  getHabitProgress,
  getPercent,
  getStatus,
} from "./progress";

const habit = (overrides: Partial<Habit> = {}): Habit => ({
  id: "h1",
  name: "Leer",
  type: "duration",
  target: 30,
  unit: "minutos",
  active: true,
  ...overrides,
});

describe("progress", () => {
  it("calcula el porcentaje con tope en 100", () => {
    expect(getPercent(habit(), 15)).toBe(50);
    expect(getPercent(habit(), 90)).toBe(100);
    expect(getPercent(habit({ target: 0 }), 5)).toBe(0);
  });

  it("deriva el estado", () => {
    expect(getStatus(habit(), 0)).toBe("pending");
    expect(getStatus(habit(), 10)).toBe("in-progress");
    expect(getStatus(habit(), 30)).toBe("completed");
  });

  it("construye el progreso de un hábito", () => {
    expect(getHabitProgress(habit(), 15)).toMatchObject({
      percent: 50,
      status: "in-progress",
    });
  });

  it("resume el día", () => {
    expect(getDailyProgress([], {})).toEqual({ percent: 0, completed: 0, total: 0 });
    const habits = [habit({ id: "a" }), habit({ id: "b", target: 10 })];
    expect(getDailyProgress(habits, { a: 15, b: 10 })).toEqual({
      percent: 75,
      completed: 1,
      total: 2,
    });
  });
});
