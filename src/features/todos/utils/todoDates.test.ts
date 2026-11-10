import { describe, expect, it } from "vitest";
import {
  addDays,
  dueLabel,
  formatShortDate,
  groupByDay,
  isOverdue,
  parseDateKey,
  toDateKey,
} from "./todoDates";

// lunes 10 de noviembre de 2025
const TODAY = "2025-11-10";

describe("todoDates", () => {
  it("toDateKey y parseDateKey son inversas y rechazan fechas imposibles", () => {
    expect(toDateKey(new Date(2025, 10, 5))).toBe("2025-11-05");
    expect(toDateKey(parseDateKey("2026-02-28")!)).toBe("2026-02-28");
    expect(parseDateKey("2026-02-30")).toBeNull();
    expect(parseDateKey("17/11/2025")).toBeNull();
  });

  it("addDays cruza meses y años", () => {
    expect(addDays("2025-11-30", 1)).toBe("2025-12-01");
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2025-03-01", -1)).toBe("2025-02-28");
  });

  it("formatShortDate: día de la semana, día y mes; con año si no es el actual", () => {
    expect(formatShortDate("2025-11-17", TODAY)).toBe("lun 17 nov");
    expect(formatShortDate("2025-11-12", TODAY)).toBe("mié 12 nov");
    expect(formatShortDate("2026-01-05", TODAY)).toBe("lun 5 ene 2026");
  });

  it("dueLabel: Hoy, Mañana, Ayer o la fecha corta", () => {
    expect(dueLabel(TODAY, TODAY)).toBe("Hoy");
    expect(dueLabel("2025-11-11", TODAY)).toBe("Mañana");
    expect(dueLabel("2025-11-09", TODAY)).toBe("Ayer");
    expect(dueLabel("2025-11-17", TODAY)).toBe("lun 17 nov");
    expect(dueLabel("2025-11-01", TODAY)).toBe("sáb 1 nov");
  });

  it("isOverdue: solo las fechas anteriores a hoy", () => {
    expect(isOverdue("2025-11-09", TODAY)).toBe(true);
    expect(isOverdue(TODAY, TODAY)).toBe(false);
    expect(isOverdue("2025-11-11", TODAY)).toBe(false);
    expect(isOverdue(undefined, TODAY)).toBe(false);
  });

  it("groupByDay agrupa por día en orden y conserva el orden dentro del día", () => {
    const items = [
      { id: "a", dueDate: "2025-11-17" },
      { id: "b", dueDate: "2025-11-11" },
      { id: "c", dueDate: "2025-11-17" },
      { id: "d" },
    ];
    const groups = groupByDay(items, TODAY);
    expect(groups.map((group) => group.date)).toEqual(["2025-11-11", "2025-11-17"]);
    expect(groups[0].label).toBe("Mañana · mar 11 nov");
    expect(groups[1].label).toBe("lun 17 nov");
    expect(groups[1].items.map((item) => item.id)).toEqual(["a", "c"]);
  });
});
