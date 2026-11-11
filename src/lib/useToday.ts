import { useSyncExternalStore } from "react";
import { getLocalDate } from "@/features/habits/utils/date";

/**
 * "Hoy" compartido: la fecha local `YYYY-MM-DD`, que se actualiza sola si la
 * app sigue abierta al pasar la medianoche. Un único intervalo de un minuto
 * (mientras haya alguien suscrito) y una comprobación al volver a la ventana,
 * por si el equipo estuvo en suspensión. Lo usan los hábitos, las tareas y el
 * panel "Hoy".
 */
const CHECK_EVERY_MS = 60_000;

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function emit(): void {
  listeners.forEach((listener) => listener());
}

function onWake(): void {
  if (document.visibilityState === "visible") emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    timer = setInterval(emit, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", emit);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (timer !== null) clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", emit);
    }
  };
}

/** Fecha local de hoy. Solo provoca un nuevo render cuando el día cambia. */
export function useToday(): string {
  return useSyncExternalStore(subscribe, getLocalDate, getLocalDate);
}
