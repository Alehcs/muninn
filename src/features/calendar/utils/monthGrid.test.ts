import { describe, expect, it } from "vitest";
import {
  getMonthRange,
  getMonthWeeks,
  shiftMonthKey,
} from "./monthGrid";

describe("monthGrid", () => {
  it("desplaza meses cruzando de año", () => {
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
    expect(shiftMonthKey("2026-05", 0)).toBe("2026-05");
  });

  it("devuelve el rango del mes, incluido febrero bisiesto", () => {
    expect(getMonthRange("2026-02")).toEqual({
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });
    expect(getMonthRange("2028-02").endDate).toBe("2028-02-29");
  });

  it("genera semanas completas que empiezan en lunes", () => {
    // Noviembre 2026 empieza en domingo y termina en lunes.
    const weeks = getMonthWeeks("2026-11");
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0][0].date).toBe("2026-10-26");
    expect(weeks[0][0].inMonth).toBe(false);
    expect(weeks[0][6].date).toBe("2026-11-01");
    expect(weeks[0][6].inMonth).toBe(true);
    const last = weeks[weeks.length - 1];
    expect(last[6].date).toBe("2026-12-06");
    expect(weeks.flat().filter((day) => day.inMonth)).toHaveLength(30);
  });
});
