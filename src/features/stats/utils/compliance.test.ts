import { describe, expect, it } from "vitest";
import type { Habit } from "@/features/habits/types";
import {
  getHabitCompliancePercent,
  getOverallCompliancePercent,
} from "./compliance";

const habit = (id: string, target: number): Habit => ({
  id,
  name: id,
  type: "count",
  target,
  unit: "veces",
  active: true,
});

const dates = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"];

describe("compliance", () => {
  const a = habit("a", 2);
  const b = habit("b", 1);
  const values = {
    a: { "2026-01-01": 2, "2026-01-02": 1, "2026-01-03": 3 },
    b: { "2026-01-01": 1 },
  };

  it("calcula el cumplimiento de un hábito", () => {
    expect(getHabitCompliancePercent(a, dates, values)).toBe(50);
    expect(getHabitCompliancePercent(b, dates, values)).toBe(25);
  });

  it("calcula el cumplimiento agregado", () => {
    expect(getOverallCompliancePercent([a, b], dates, values)).toBe(38);
  });

  it("devuelve 0 sin datos", () => {
    expect(getHabitCompliancePercent(a, [], values)).toBe(0);
    expect(getOverallCompliancePercent([], dates, values)).toBe(0);
  });
});
