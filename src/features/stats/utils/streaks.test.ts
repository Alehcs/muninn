import { describe, expect, it } from "vitest";
import type { Habit } from "@/features/habits/types";
import { getBestStreak, getCurrentStreak } from "./streaks";

const habit: Habit = {
  id: "h",
  name: "h",
  type: "check",
  target: 1,
  unit: "completado",
  active: true,
};
const dates = ["d1", "d2", "d3", "d4", "d5", "d6"];

describe("streaks", () => {
  it("cuenta la racha activa hasta el último día", () => {
    const values = { h: { d4: 1, d5: 1, d6: 1, d2: 1 } };
    expect(getCurrentStreak(habit, dates, values)).toBe(3);
  });

  it("la racha activa es 0 si el último día no se cumplió", () => {
    expect(getCurrentStreak(habit, dates, { h: { d5: 1 } })).toBe(0);
  });

  it("calcula la mejor racha del rango", () => {
    const values = { h: { d1: 1, d2: 1, d3: 1, d5: 1, d6: 1 } };
    expect(getBestStreak(habit, dates, values)).toBe(3);
    expect(getBestStreak(habit, dates, {})).toBe(0);
  });
});
