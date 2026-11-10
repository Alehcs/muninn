import type { ThemeMode, ThemeTokens } from "./types";

/** Paletas cozy inspiradas en la luz natural de cada franja del día. */
export const themeTokens: Record<ThemeMode, ThemeTokens> = {
  // Mañana clara: cielo suave, verde tenue, crema.
  morning: {
    bg: "#e8f0ec",
    surface: "#fbfdfc",
    surfaceHover: "#eef4f0",
    border: "#d4e3da",
    text: "#2b3a32",
    textMuted: "#607065",
    accent: "#2f775f",
    accentForeground: "#ffffff",
    accentHover: "#286650",
    success: "#287456",
    danger: "#b3382c",
    dangerForeground: "#ffffff",
  },
  // Tarde cálida: naranja suave, durazno, dorado.
  afternoon: {
    bg: "#faeede",
    surface: "#fff9f1",
    surfaceHover: "#f4e4d0",
    border: "#ecd7bd",
    text: "#3f3023",
    textMuted: "#836b53",
    accent: "#a85b16",
    accentForeground: "#ffffff",
    accentHover: "#8f4c12",
    success: "#357a3d",
    danger: "#b3321f",
    dangerForeground: "#ffffff",
  },
  // Noche calmada: azul profundo, violeta suave, blanco cálido.
  night: {
    bg: "#121830",
    surface: "#1b2240",
    surfaceHover: "#262e52",
    border: "#313a64",
    text: "#ebe9f6",
    textMuted: "#9095bd",
    accent: "#a99af4",
    accentForeground: "#121830",
    accentHover: "#b8abff",
    success: "#54bf9c",
    danger: "#f08a80",
    dangerForeground: "#121830",
  },
};
