import type { ThemeMode } from "./types";

/**
 * Devuelve el tema correspondiente a la hora dada.
 * morning 06:00-11:59 · afternoon 12:00-18:59 · night 19:00-05:59.
 */
export function getTimeTheme(date: Date): ThemeMode {
  const hour = date.getHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 19) return "afternoon";
  return "night";
}
