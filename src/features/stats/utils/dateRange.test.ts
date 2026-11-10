import { describe, expect, it } from "vitest";
import { getDateRange, getDateRangeEndingOn } from "./dateRange";

describe("dateRange", () => {
  it("devuelve un rango inclusivo", () => {
    expect(getDateRange("2026-02-27", "2026-03-02")).toEqual([
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
      "2026-03-02",
    ]);
  });

  it("devuelve vacío si el inicio es posterior al fin", () => {
    expect(getDateRange("2026-03-02", "2026-03-01")).toEqual([]);
  });

  it("devuelve los últimos N días incluyendo el final", () => {
    expect(getDateRangeEndingOn("2026-03-01", 3)).toEqual([
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
    ]);
    expect(getDateRangeEndingOn("2026-03-01", 0)).toEqual([]);
  });
});
