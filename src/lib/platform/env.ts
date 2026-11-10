/** Indica si la app corre dentro de la ventana de Tauri (y no en un navegador). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
