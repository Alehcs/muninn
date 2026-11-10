import { useSyncExternalStore } from "react";

export type ToastKind = "error" | "success" | "info";

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

/** Milisegundos hasta que el aviso se cierra solo. */
const DURATION: Record<ToastKind, number> = {
  error: 8000,
  success: 4000,
  info: 5000,
};
const MAX_VISIBLE = 4;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function push(kind: ToastKind, message: string): number {
  // Un mismo mensaje repetido no apila avisos idénticos.
  const existing = toasts.find(
    (toast) => toast.kind === kind && toast.message === message,
  );
  if (existing) return existing.id;

  const id = nextId++;
  toasts = [...toasts, { id, kind, message }].slice(-MAX_VISIBLE);
  timers.set(
    id,
    setTimeout(() => dismiss(id), DURATION[kind]),
  );
  emit();
  return id;
}

/** Cierra un aviso. */
export function dismiss(id: number): void {
  const timer = timers.get(id);
  if (timer !== undefined) clearTimeout(timer);
  timers.delete(id);
  if (!toasts.some((toast) => toast.id === id)) return;
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

/**
 * Avisos globales: se pueden lanzar desde cualquier hook o servicio sin pasar
 * props. `<Toaster />` (montado una vez en el layout) los muestra.
 */
export const notify = {
  error: (message: string) => push("error", message),
  success: (message: string) => push("success", message),
  info: (message: string) => push("info", message),
};

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Toast[] {
  return toasts;
}

/** Lista de avisos activos (para `<Toaster />`). */
export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Solo para tests. */
export function clearToastsForTesting(): void {
  timers.forEach((timer) => clearTimeout(timer));
  timers.clear();
  toasts = [];
  emit();
}
