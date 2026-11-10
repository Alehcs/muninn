import { describe, expect, it } from "vitest";
import { getHeatLevel } from "./dayStatus";

describe("getHeatLevel", () => {
  it.each([
    [0, 0],
    [1, 1],
    [49, 1],
    [50, 2],
    [99, 2],
    [100, 3],
    [130, 3],
    [-5, 0],
  ])("%i %% -> nivel %i", (percent, level) => {
    expect(getHeatLevel(percent)).toBe(level);
  });
});
