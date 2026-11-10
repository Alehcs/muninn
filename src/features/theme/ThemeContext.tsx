import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useTimeTheme } from "./useTimeTheme";
import type { ThemeMode, ThemePreference } from "./types";

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
  /** Tema realmente aplicado (resuelve "auto" según la hora). */
  mode: ThemeMode;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Mantiene el tema aplicado y lo comparte con Configuración. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { preference, setPreference, mode } = useTimeTheme();
  const value = useMemo(
    () => ({ preference, setPreference, mode }),
    [preference, setPreference, mode],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error("useTheme debe usarse dentro de <ThemeProvider>.");
  }
  return value;
}
