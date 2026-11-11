import { SHORTCUT_VIEWS, type View } from "@/app/navigation";

/** Parte de un KeyboardEvent que necesitamos (facilita los tests). */
export interface KeyLike {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

export type ShortcutAction =
  | { type: "navigate"; view: View }
  | { type: "primary" }
  | { type: "search" };

/**
 * Traduce una pulsación en una acción global, o null si no es un atajo.
 * - Cmd/Ctrl+1…6: entradas de la barra lateral, en orden.
 * - Cmd/Ctrl+,: Configuración.
 * - Cmd/Ctrl+N: acción principal de la vista actual.
 * - Cmd/Ctrl+K: búsqueda global.
 */
export function resolveShortcut(event: KeyLike): ShortcutAction | null {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) return null;

  if (/^[1-9]$/.test(event.key) && !event.shiftKey) {
    const view = SHORTCUT_VIEWS[Number(event.key) - 1];
    return view === undefined ? null : { type: "navigate", view };
  }
  if (event.key === "," && !event.shiftKey) {
    return { type: "navigate", view: "settings" };
  }
  if (event.key.toLowerCase() === "n" && !event.shiftKey) {
    return { type: "primary" };
  }
  if (event.key.toLowerCase() === "k" && !event.shiftKey) {
    return { type: "search" };
  }
  return null;
}

/** ¿El foco está en un elemento donde se escribe texto? */
export function isEditableTarget(
  target: { tagName?: string; isContentEditable?: boolean } | null,
): boolean {
  if (target === null) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName?.toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/* ---- Acción principal de la vista actual ---------------------------------
   Cada vista registra una función (p. ej. "Nueva nota"); Cmd/Ctrl+N la
   dispara. Si hay varias registradas (vista + sub-vista) manda la última. */

type PrimaryHandler = () => void;

const handlers: PrimaryHandler[] = [];

/** Registra la acción principal. Devuelve la función para anularla. */
export function registerPrimaryAction(handler: PrimaryHandler): () => void {
  handlers.push(handler);
  return () => {
    const index = handlers.lastIndexOf(handler);
    if (index !== -1) handlers.splice(index, 1);
  };
}

/** Ejecuta la acción principal activa. Devuelve false si no hay ninguna. */
export function runPrimaryAction(): boolean {
  const handler = handlers[handlers.length - 1];
  if (handler === undefined) return false;
  handler();
  return true;
}
