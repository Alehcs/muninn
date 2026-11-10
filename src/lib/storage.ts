/** Lectura/escritura de JSON en localStorage a prueba de fallos
    (modo privado, almacenamiento bloqueado, JSON corrupto…). */

export function readStored<T>(
  key: string,
  fallback: T,
  isValid?: (value: unknown) => value is T,
): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (isValid === undefined) return parsed as T;
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin almacenamiento: la preferencia solo dura mientras la app esté abierta.
  }
}
