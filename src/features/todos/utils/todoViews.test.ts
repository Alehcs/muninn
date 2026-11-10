import { describe, expect, it } from "vitest";
import type { TodoItem } from "../types";
import {
  filterCompleted,
  filterForTab,
  filterPending,
  filterToday,
  filterUpcoming,
  reorderPending,
  tabCounts,
} from "./todoViews";

const TODAY = "2025-11-10";

function todo(id: string, overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id,
    title: id,
    completed: false,
    orderIndex: 1,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    priority: 0,
    ...overrides,
  };
}

const ITEMS: TodoItem[] = [
  todo("sin-fecha", { orderIndex: 2 }),
  todo("vencida", { orderIndex: 3, dueDate: "2025-11-05" }),
  todo("hoy-baja", { orderIndex: 4, dueDate: TODAY, priority: 1 }),
  todo("hoy-alta", { orderIndex: 5, dueDate: TODAY, priority: 3 }),
  todo("manana", { orderIndex: 1, dueDate: "2025-11-11" }),
  todo("lejos", { orderIndex: 6, dueDate: "2026-01-01" }),
  todo("hecha-vieja", {
    completed: true,
    completedAt: "2025-11-01T10:00:00.000Z",
    dueDate: TODAY,
  }),
  todo("hecha-nueva", { completed: true, completedAt: "2025-11-09T10:00:00.000Z" }),
];

const ids = (list: TodoItem[]) => list.map((item) => item.id);

describe("filtros de las pestañas", () => {
  it("Pendientes: sin completar, en orden manual", () => {
    expect(ids(filterPending(ITEMS))).toEqual([
      "manana",
      "sin-fecha",
      "vencida",
      "hoy-baja",
      "hoy-alta",
      "lejos",
    ]);
  });

  it("Hoy: vencidas y de hoy (las más antiguas antes, luego prioridad)", () => {
    expect(ids(filterToday(ITEMS, TODAY))).toEqual(["vencida", "hoy-alta", "hoy-baja"]);
  });

  it("Hoy no incluye completadas aunque tengan fecha de hoy", () => {
    expect(ids(filterToday(ITEMS, TODAY))).not.toContain("hecha-vieja");
  });

  it("Próximas: solo fechas futuras, por fecha", () => {
    expect(ids(filterUpcoming(ITEMS, TODAY))).toEqual(["manana", "lejos"]);
  });

  it("Completadas: las más recientes primero", () => {
    expect(ids(filterCompleted(ITEMS))).toEqual(["hecha-nueva", "hecha-vieja"]);
  });

  it("filterForTab y tabCounts son coherentes", () => {
    expect(ids(filterForTab(ITEMS, "today", TODAY))).toEqual(
      ids(filterToday(ITEMS, TODAY)),
    );
    expect(tabCounts(ITEMS, TODAY)).toEqual({
      pending: 6,
      today: 3,
      upcoming: 2,
      completed: 2,
    });
  });
});

describe("reorderPending", () => {
  it("renumera todas las pendientes 1…n tras mover una", () => {
    const visible = filterPending(ITEMS).map((item) => item.id);
    const positions = reorderPending(ITEMS, visible, "lejos", "manana");
    expect(positions.map((entry) => entry.id)).toEqual([
      "lejos",
      "manana",
      "sin-fecha",
      "vencida",
      "hoy-baja",
      "hoy-alta",
    ]);
    expect(positions.map((entry) => entry.position)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("con un subconjunto visible, las ocultas no se mueven de sitio", () => {
    // Solo "vencida" y "lejos" visibles (p. ej. las de una página).
    const positions = reorderPending(ITEMS, ["vencida", "lejos"], "lejos", "vencida");
    expect(positions.map((entry) => entry.id)).toEqual([
      "manana",
      "sin-fecha",
      "lejos",
      "hoy-baja",
      "hoy-alta",
      "vencida",
    ]);
  });

  it("las completadas no entran en la renumeración", () => {
    const visible = filterPending(ITEMS).map((item) => item.id);
    const positions = reorderPending(ITEMS, visible, "manana", "lejos");
    expect(positions.map((entry) => entry.id)).not.toContain("hecha-nueva");
  });
});
