import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { getTimeTheme } from "./getTimeTheme";
import { themeTokens } from "./themeTokens";
import type { ThemeMode, ThemePreference } from "./types";

/** Estilo inline con las variables CSS de color que consume Tailwind. */
type ThemeStyle = CSSProperties & Record<`--color-${string}`, string>;

function toThemeStyle(mode: ThemeMode): ThemeStyle {
  const t = themeTokens[mode];
  return {
    "--color-bg": t.bg,
    "--color-surface": t.surface,
    "--color-surface-hover": t.surfaceHover,
    "--color-border": t.border,
    "--color-text": t.text,
    "--color-text-muted": t.textMuted,
    "--color-accent": t.accent,
    "--color-accent-foreground": t.accentForeground,
    "--color-accent-hover": t.accentHover,
    "--color-success": t.success,
  };
}

/**
 * Resuelve el tema activo.
 * - Modo automático: sigue la hora del día y se refresca cada minuto.
 * - Override manual (`setPreference`): fija un tema, útil para desarrollo/pruebas.
 */
export function useTimeTheme() {
  const [preference, setPreference] = useState<ThemePreference>("auto");
  const [autoMode, setAutoMode] = useState<ThemeMode>(() =>
    getTimeTheme(new Date()),
  );

  useEffect(() => {
    const id = window.setInterval(
      () => setAutoMode(getTimeTheme(new Date())),
      60_000,
    );
    return () => window.clearInterval(id);
  }, []);

  const mode: ThemeMode = preference === "auto" ? autoMode : preference;
  const style = useMemo(() => toThemeStyle(mode), [mode]);

  return { preference, setPreference, mode, style };
}
