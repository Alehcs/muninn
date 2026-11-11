import { useSyncExternalStore } from "react";

/**
 * Estado abierto/cerrado de la paleta de búsqueda global. Vive fuera de React
 * para que lo abran a la vez el atajo Cmd/Ctrl+K (layout) y el botón de la
 * barra lateral.
 */
let open = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function openPalette(): void {
  if (open) return;
  open = true;
  emit();
}

export function closePalette(): void {
  if (!open) return;
  open = false;
  emit();
}

export function togglePalette(): void {
  open = !open;
  emit();
}

export function isPaletteOpen(): boolean {
  return open;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePaletteOpen(): boolean {
  return useSyncExternalStore(subscribe, isPaletteOpen, isPaletteOpen);
}

/* ---- "Nueva tarea" desde la paleta -----------------------------------------
   La paleta navega a Tareas y la vista, al montarse, recoge esta petición para
   dar el foco al campo de alta rápida. Caduca por si la navegación se cancela. */

const TASK_FOCUS_TTL_MS = 3000;
let taskFocusRequestedAt = 0;

export function requestTaskFocus(): void {
  taskFocusRequestedAt = Date.now();
}

/** ¿Hay una petición vigente? La consume: solo devuelve true una vez. */
export function consumeTaskFocus(): boolean {
  const pending = Date.now() - taskFocusRequestedAt < TASK_FOCUS_TTL_MS;
  taskFocusRequestedAt = 0;
  return pending;
}
