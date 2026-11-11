/**
 * Borradores pendientes de guardar, por id de página (solo en memoria).
 *
 * Si guardar el cuerpo de una página falla y el usuario sale y la reabre antes
 * de que el reintento funcione, la página recargada no debe mostrar la versión
 * anterior de la base: se reabre con este borrador y se vuelve a guardar.
 *
 * `claimPage` / `isCurrentOwner` evitan que el reintento de una instancia
 * antigua (ya cerrada) pise con un texto viejo lo que escribe la nueva.
 */
const drafts = new Map<string, string>();
const owners = new Map<string, number>();
let nextToken = 1;

/** Anota el texto que se va a guardar (se llama justo antes de escribir). */
export function rememberDraft(pageId: string, markdown: string): void {
  drafts.set(pageId, markdown);
}

/** Borrador pendiente de la página, o undefined. */
export function getDraft(pageId: string): string | undefined {
  return drafts.get(pageId);
}

/**
 * Descarta el borrador. Con `onlyIf`, solo si sigue siendo ese mismo texto:
 * un guardado que termina tarde no borra un borrador más nuevo.
 */
export function forgetDraft(pageId: string, onlyIf?: string): void {
  if (onlyIf !== undefined && drafts.get(pageId) !== onlyIf) return;
  drafts.delete(pageId);
}

/** Una instancia abierta de la página se declara la responsable de guardarla. */
export function claimPage(pageId: string): number {
  const token = nextToken++;
  owners.set(pageId, token);
  return token;
}

export function isCurrentOwner(pageId: string, token: number): boolean {
  return owners.get(pageId) === token;
}

/** Solo para tests. */
export function clearDraftsForTesting(): void {
  drafts.clear();
  owners.clear();
}
