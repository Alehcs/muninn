import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isEditableTarget,
  registerPrimaryAction,
  resolveShortcut,
  runPrimaryAction,
  type KeyLike,
} from "./shortcuts";

function key(k: string, extra: Partial<KeyLike> = {}): KeyLike {
  return {
    key: k,
    metaKey: true,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    ...extra,
  };
}

describe("resolveShortcut", () => {
  it("Cmd/Ctrl+1…6 navegan en el orden de la barra lateral", () => {
    const views = ["today", "pages", "todos", "roadmap", "habits", "study"];
    views.forEach((view, index) => {
      expect(resolveShortcut(key(String(index + 1)))).toEqual({
        type: "navigate",
        view,
      });
    });
    expect(
      resolveShortcut(key("2", { metaKey: false, ctrlKey: true })),
    ).toEqual({ type: "navigate", view: "pages" });
  });

  it("Cmd/Ctrl+, abre Configuración", () => {
    expect(resolveShortcut(key(","))).toEqual({
      type: "navigate",
      view: "settings",
    });
  });

  it("Cmd/Ctrl+N es la acción principal", () => {
    expect(resolveShortcut(key("n"))).toEqual({ type: "primary" });
    expect(resolveShortcut(key("N", { shiftKey: true }))).toBeNull();
  });

  it("Cmd/Ctrl+K abre la búsqueda global", () => {
    expect(resolveShortcut(key("k"))).toEqual({ type: "search" });
    expect(resolveShortcut(key("K", { metaKey: false, ctrlKey: true }))).toEqual({
      type: "search",
    });
    expect(resolveShortcut(key("k", { shiftKey: true }))).toBeNull();
    expect(resolveShortcut(key("k", { metaKey: false }))).toBeNull();
  });

  it("ignora teclas sin Cmd/Ctrl, números fuera de rango y Alt", () => {
    expect(resolveShortcut(key("1", { metaKey: false }))).toBeNull();
    expect(resolveShortcut(key("n", { metaKey: false }))).toBeNull();
    expect(resolveShortcut(key("9"))).toBeNull();
    expect(resolveShortcut(key("1", { altKey: true }))).toBeNull();
  });
});

describe("isEditableTarget", () => {
  it("detecta campos de texto", () => {
    expect(isEditableTarget({ tagName: "INPUT" })).toBe(true);
    expect(isEditableTarget({ tagName: "textarea" })).toBe(true);
    expect(isEditableTarget({ tagName: "DIV", isContentEditable: true })).toBe(
      true,
    );
    expect(isEditableTarget({ tagName: "BUTTON" })).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe("acción principal", () => {
  const cleanups: Array<() => void> = [];
  afterEach(() => {
    cleanups.splice(0).forEach((fn) => fn());
  });

  it("sin acción registrada no hace nada", () => {
    expect(runPrimaryAction()).toBe(false);
  });

  it("ejecuta la última registrada y vuelve a la anterior al anularla", () => {
    const first = vi.fn();
    const second = vi.fn();
    cleanups.push(registerPrimaryAction(first));
    const unregisterSecond = registerPrimaryAction(second);
    cleanups.push(unregisterSecond);

    expect(runPrimaryAction()).toBe(true);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();

    unregisterSecond();
    runPrimaryAction();
    expect(first).toHaveBeenCalledTimes(1);
  });
});
