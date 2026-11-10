/** Temas disponibles según el momento del día. */
export type ThemeMode = "morning" | "afternoon" | "night";

/** Preferencia del usuario: automático por hora, o un tema fijo. */
export type ThemePreference = "auto" | ThemeMode;

/** Conjunto de colores que define un tema. */
export interface ThemeTokens {
  bg: string;
  surface: string;
  surfaceHover: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentForeground: string;
  accentHover: string;
  success: string;
}
