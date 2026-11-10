import { renumber, reorderVisible } from "@/lib/reorder";
import type { TodoItem } from "../types";

/** Pestañas de la vista Tareas. */
export type TodoTab = "pending" | "today" | "upcoming" | "completed";

/** Vencidas y alta prioridad antes; dentro del mismo día, el orden manual. */
function compareByDue(a: TodoItem, b: TodoItem): number {
  const dueA = a.dueDate ?? "";
  const dueB = b.dueDate ?? "";
  if (dueA !== dueB) return dueA < dueB ? -1 : 1;
  if (a.priority !== b.priority) return b.priority - a.priority;
  return a.orderIndex - b.orderIndex || (a.createdAt < b.createdAt ? -1 : 1);
}

/** Orden manual (el que se reordena por arrastre). */
function compareManual(a: TodoItem, b: TodoItem): number {
  return (
    a.orderIndex - b.orderIndex ||
    (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0) ||
    (a.id < b.id ? -1 : 1)
  );
}

/** Sin completar, en orden manual. */
export function filterPending(items: readonly TodoItem[]): TodoItem[] {
  return items.filter((item) => !item.completed).sort(compareManual);
}

/** Sin completar y con fecha de hoy o anterior: primero las más vencidas. */
export function filterToday(items: readonly TodoItem[], today: string): TodoItem[] {
  return items
    .filter((item) => !item.completed && item.dueDate !== undefined && item.dueDate <= today)
    .sort(compareByDue);
}

/** Sin completar y con fecha posterior a hoy, por fecha. */
export function filterUpcoming(items: readonly TodoItem[], today: string): TodoItem[] {
  return items
    .filter((item) => !item.completed && item.dueDate !== undefined && item.dueDate > today)
    .sort(compareByDue);
}

/** Completadas, las más recientes primero. */
export function filterCompleted(items: readonly TodoItem[]): TodoItem[] {
  return items
    .filter((item) => item.completed)
    .sort((a, b) => {
      const doneA = a.completedAt ?? a.updatedAt;
      const doneB = b.completedAt ?? b.updatedAt;
      return doneA === doneB ? 0 : doneA < doneB ? 1 : -1;
    });
}

export function filterForTab(
  items: readonly TodoItem[],
  tab: TodoTab,
  today: string,
): TodoItem[] {
  switch (tab) {
    case "pending":
      return filterPending(items);
    case "today":
      return filterToday(items, today);
    case "upcoming":
      return filterUpcoming(items, today);
    case "completed":
      return filterCompleted(items);
  }
}

export function tabCounts(
  items: readonly TodoItem[],
  today: string,
): Record<TodoTab, number> {
  return {
    pending: filterPending(items).length,
    today: filterToday(items, today).length,
    upcoming: filterUpcoming(items, today).length,
    completed: filterCompleted(items).length,
  };
}

/**
 * Nuevo orden manual tras arrastrar `activeId` sobre `overId` dentro de
 * `visibleIds` (un subconjunto de las pendientes, p. ej. las de una página).
 * Devuelve las posiciones 1…n de TODAS las pendientes, listas para guardar.
 */
export function reorderPending(
  items: readonly TodoItem[],
  visibleIds: string[],
  activeId: string,
  overId: string,
): { id: string; position: number }[] {
  const allIds = filterPending(items).map((item) => item.id);
  return renumber(reorderVisible(allIds, visibleIds, activeId, overId));
}
