import { describe, expect, it } from "vitest";
import {
  arrayMove,
  moveToPositionOf,
  renumber,
  reorderVisible,
} from "./reorder";

describe("arrayMove / moveToPositionOf", () => {
  it("mueve hacia delante y hacia atrás sin mutar", () => {
    const list = ["a", "b", "c", "d"];
    expect(arrayMove(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(arrayMove(list, 3, 1)).toEqual(["a", "d", "b", "c"]);
    expect(list).toEqual(["a", "b", "c", "d"]);
  });

  it("ignora índices fuera de rango", () => {
    expect(arrayMove(["a", "b"], 0, 5)).toEqual(["a", "b"]);
    expect(moveToPositionOf(["a", "b"], "x", "a")).toEqual(["a", "b"]);
  });

  it("coloca el elemento en la posición del destino", () => {
    expect(moveToPositionOf(["a", "b", "c"], "a", "c")).toEqual(["b", "c", "a"]);
    expect(moveToPositionOf(["a", "b", "c"], "c", "a")).toEqual(["c", "a", "b"]);
  });
});

describe("reorderVisible", () => {
  it("sin ocultos equivale a mover", () => {
    const all = ["a", "b", "c"];
    expect(reorderVisible(all, all, "c", "a")).toEqual(["c", "a", "b"]);
  });

  it("deja los ocultos en su sitio", () => {
    // b y d están ocultos (completados)
    const all = ["a", "b", "c", "d", "e"];
    const visible = ["a", "c", "e"];
    expect(reorderVisible(all, visible, "e", "a")).toEqual(["e", "b", "a", "d", "c"]);
  });

  it("no cambia nada si algún id no es visible", () => {
    const all = ["a", "b", "c"];
    expect(reorderVisible(all, ["a", "c"], "b", "a")).toEqual(all);
  });
});

describe("renumber", () => {
  it("numera desde 1 por defecto", () => {
    expect(renumber(["x", "y"])).toEqual([
      { id: "x", position: 1 },
      { id: "y", position: 2 },
    ]);
  });

  it("admite otro inicio", () => {
    expect(renumber(["x"], 10)).toEqual([{ id: "x", position: 10 }]);
  });
});
