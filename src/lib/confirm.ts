import { useSyncExternalStore } from "react";

export interface ConfirmOptions {
  title: string;
  message: string;
  /** Texto del botón de confirmar. Por defecto, "Aceptar". */
  confirmLabel?: string;
  /** Texto del botón de cancelar. Por defecto, "Cancelar". */
  cancelLabel?: string;
  /** Pinta el botón de confirmar como acción destructiva. */
  destructive?: boolean;
}

export interface ConfirmRequest extends ConfirmOptions {
  id: number;
}

interface QueueEntry {
  request: ConfirmRequest;
  resolve: (accepted: boolean) => void;
}

let queue: QueueEntry[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

/**
 * Pide confirmación con el diálogo propio de la app (sustituye al confirm
 * nativo del navegador). Resuelve true si se acepta y false si se cancela.
 * Si hay varias peticiones a la vez, se muestran una tras otra.
 *
 *   if (!(await confirm({ title: "…", message: "…", destructive: true }))) return;
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    queue = [...queue, { request: { ...options, id: nextId++ }, resolve }];
    emit();
  });
}

/** Resuelve la petición visible (la usa `<ConfirmDialogHost />`). */
export function settleConfirm(id: number, accepted: boolean): void {
  const entry = queue.find((item) => item.request.id === id);
  if (entry === undefined) return;
  queue = queue.filter((item) => item !== entry);
  emit();
  entry.resolve(accepted);
}

/** ¿Hay un diálogo de confirmación abierto? */
export function hasOpenConfirm(): boolean {
  return queue.length > 0;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Petición visible ahora mismo, o null (referencia estable entre lecturas). */
export function getActiveConfirm(): ConfirmRequest | null {
  return queue[0]?.request ?? null;
}

/** Petición actualmente visible, o null. */
export function useActiveConfirm(): ConfirmRequest | null {
  return useSyncExternalStore(subscribe, getActiveConfirm, getActiveConfirm);
}

/** Solo para tests: cancela todo lo pendiente. */
export function clearConfirmsForTesting(): void {
  const pending = queue;
  queue = [];
  emit();
  pending.forEach((entry) => entry.resolve(false));
}
