import { describe, expect, it } from "vitest";
import { resolveManualFinish, type TimerState } from "./useHabitTimer";

const START = 1_000_000;

function running(overrides: Partial<TimerState> = {}): TimerState {
  return {
    habitId: "h1",
    habitName: "Leer",
    plannedMinutes: 30,
    plannedMs: 30 * 60_000,
    status: "running",
    startedAt: START,
    elapsedBeforePauseMs: 0,
    ...overrides,
  };
}

describe("resolveManualFinish", () => {
  it("suma solo los minutos completos transcurridos", () => {
    const result = resolveManualFinish(running(), START + 12 * 60_000 + 59_000);
    expect(result.minutes).toBe(12);
    expect(result.message).toContain("+12 min");
  });

  it("no suma nada antes del primer minuto", () => {
    expect(resolveManualFinish(running(), START + 59_000).minutes).toBe(0);
  });

  it("no supera los minutos planeados", () => {
    expect(resolveManualFinish(running(), START + 90 * 60_000).minutes).toBe(30);
  });

  it("cuenta el tiempo acumulado antes de una pausa", () => {
    const paused = running({
      status: "paused",
      startedAt: null,
      elapsedBeforePauseMs: 7 * 60_000 + 10_000,
    });
    expect(resolveManualFinish(paused, START + 999 * 60_000).minutes).toBe(7);
  });

  it("es pura: llamarla dos veces (modo estricto) da el mismo resultado y no toca el timer", () => {
    const timer = running();
    const snapshot = JSON.stringify(timer);
    const now = START + 5 * 60_000;
    const first = resolveManualFinish(timer, now);
    const second = resolveManualFinish(timer, now);
    expect(second).toEqual(first);
    expect(JSON.stringify(timer)).toBe(snapshot);
  });
});
