import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Autosaver, type SaveStatus } from "./autosave";

function setup(initial = "base") {
  let current: string | null = initial;
  const saves: string[] = [];
  const statuses: SaveStatus[] = [];
  let failNext = 0;
  const saver = new Autosaver({
    save: async (value) => {
      if (failNext > 0) {
        failNext--;
        throw new Error("disco lleno");
      }
      saves.push(value);
    },
    readCurrent: () => current,
    onStatus: (status) => statuses.push(status),
    delayMs: 600,
    retryMs: 5000,
  });
  saver.setBaseline(initial);
  return {
    saver,
    saves,
    statuses,
    type: (value: string) => {
      current = value;
      saver.schedule();
    },
    fail: (times: number) => (failNext = times),
  };
}

describe("Autosaver", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("no escribe nada si el valor es igual al base (abrir no escribe)", async () => {
    const { saver, saves } = setup("hola");
    saver.schedule();
    await vi.advanceTimersByTimeAsync(5000);
    await saver.flush();
    expect(saves).toEqual([]);
  });

  it("espera ~600 ms sin cambios y guarda una sola vez", async () => {
    const { type, saves } = setup();
    type("a");
    await vi.advanceTimersByTimeAsync(400);
    type("ab");
    await vi.advanceTimersByTimeAsync(400);
    expect(saves).toEqual([]);
    await vi.advanceTimersByTimeAsync(300);
    expect(saves).toEqual(["ab"]);
  });

  it("no vuelve a escribir un valor ya guardado, y sí si vuelve al base tras guardar", async () => {
    const { type, saver, saves } = setup("base");
    type("nuevo");
    await saver.flush();
    await saver.flush();
    expect(saves).toEqual(["nuevo"]);
    type("base");
    await saver.flush();
    expect(saves).toEqual(["nuevo", "base"]);
  });

  it("flush guarda ya, sin esperar, y acepta el último valor conocido", async () => {
    const { saver, saves } = setup();
    await saver.flush("al salir");
    expect(saves).toEqual(["al salir"]);
  });

  it("si falla, avisa, conserva el valor y reintenta", async () => {
    const { type, fail, saves, statuses } = setup();
    fail(1);
    type("importante");
    await vi.advanceTimersByTimeAsync(700);
    expect(saves).toEqual([]);
    expect(statuses.at(-1)).toBe("error");
    await vi.advanceTimersByTimeAsync(5000);
    expect(saves).toEqual(["importante"]);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("reintenta con el valor pendiente aunque el editor ya no exista", async () => {
    const h = setup();
    h.fail(1);
    await h.saver.flush("texto final");
    expect(h.saves).toEqual([]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(h.saves).toEqual(["texto final"]);
  });

  it("sin base (editor sin iniciar) no escribe", async () => {
    const saves: string[] = [];
    const saver = new Autosaver({ save: async (v) => void saves.push(v), readCurrent: () => "x" });
    saver.schedule();
    await saver.flush("x");
    expect(saves).toEqual([]);
  });

  it("un cambio durante un guardado se guarda justo después, sin solaparse", async () => {
    let release: () => void = () => undefined;
    const saves: string[] = [];
    let current = "base";
    let inside = 0;
    let overlapped = false;
    const saver = new Autosaver({
      save: async (value) => {
        inside++;
        if (inside > 1) overlapped = true;
        await new Promise<void>((resolve) => (release = resolve));
        saves.push(value);
        inside--;
      },
      readCurrent: () => current,
    });
    saver.setBaseline("base");

    current = "uno";
    const first = saver.flush();
    current = "dos";
    const second = saver.flush();
    release();
    await vi.advanceTimersByTimeAsync(0);
    release();
    await Promise.all([first, second]);
    expect(saves).toEqual(["uno", "dos"]);
    expect(overlapped).toBe(false);
  });
});
