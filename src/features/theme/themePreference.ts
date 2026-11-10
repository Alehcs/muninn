import type { ThemePreference } from "./types";

export const THEME_STORAGE_KEY = "aurhabits.theme";

const VALID: readonly ThemePreference[] = [
  "auto",
  "morning",
  "afternoon",
  "night",
];

/** Subconjunto de `Storage` que usamos (facilita los tests). */
export type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && VALID.includes(value as ThemePreference);
}

function defaultStorage(): PreferenceStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    // Acceso bloqueado (modo privado, políticas del navegador…).
    return null;
  }
}

/** Lee la preferencia guardada, de forma síncrona. Por defecto, "auto". */
export function readStoredPreference(
  storage: PreferenceStorage | null = defaultStorage(),
): ThemePreference {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY);
    return isThemePreference(value) ? value : "auto";
  } catch {
    return "auto";
  }
}

/** Guarda la preferencia. Devuelve false si no se pudo (no es grave). */
export function writeStoredPreference(
  value: ThemePreference,
  storage: PreferenceStorage | null = defaultStorage(),
): boolean {
  try {
    if (storage === null) return false;
    storage.setItem(THEME_STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}
