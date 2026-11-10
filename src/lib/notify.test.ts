import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearToastsForTesting,
  dismiss,
  notify,
  useToasts,
  type Toast,
} from "./notify";

/** Lee los avisos activos renderizando un componente mínimo. */
function current(): Toast[] {
  let seen: Toast[] = [];
  function Probe() {
    seen = useToasts();
    return null;
  }
  renderToString(createElement(Probe));
  return seen;
}

describe("notify", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    clearToastsForTesting();
    vi.useRealTimers();
  });

  it("añade avisos y los cierra solos", () => {
    notify.success("Hecho");
    notify.error("Falló");
    expect(current().map((t) => t.message)).toEqual(["Hecho", "Falló"]);

    vi.advanceTimersByTime(4100);
    expect(current().map((t) => t.message)).toEqual(["Falló"]);
    vi.advanceTimersByTime(4000);
    expect(current()).toEqual([]);
  });

  it("se pueden cerrar a mano y no se duplican", () => {
    const id = notify.info("Uno");
    notify.info("Uno");
    expect(current()).toHaveLength(1);
    dismiss(id);
    expect(current()).toEqual([]);
  });
});
