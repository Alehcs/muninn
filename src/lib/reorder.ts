/** Lógica pura para reordenar listas por arrastre. */

/** Mueve el elemento de `from` a `to` (copia nueva). */
export function arrayMove<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list.slice();
  }
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Mueve `activeId` a la posición que ocupa `overId` (semántica de dnd-kit). */
export function moveToPositionOf(
  ids: string[],
  activeId: string,
  overId: string,
): string[] {
  return arrayMove(ids, ids.indexOf(activeId), ids.indexOf(overId));
}

/**
 * Reordena solo los elementos visibles de una lista completa (p. ej. con
 * "ocultar completados"): los visibles se permutan entre los huecos que ya
 * ocupaban y los ocultos no se mueven. Devuelve la lista completa.
 */
export function reorderVisible(
  allIds: string[],
  visibleIds: string[],
  activeId: string,
  overId: string,
): string[] {
  if (!visibleIds.includes(activeId) || !visibleIds.includes(overId)) {
    return allIds.slice();
  }
  const visible = new Set(visibleIds);
  const reordered = moveToPositionOf(visibleIds, activeId, overId);
  let cursor = 0;
  return allIds.map((id) => (visible.has(id) ? reordered[cursor++] : id));
}

/** Numera `ids` como 1…n (la posición que se guarda en la base). */
export function renumber(
  ids: string[],
  start = 1,
): { id: string; position: number }[] {
  return ids.map((id, index) => ({ id, position: start + index }));
}
