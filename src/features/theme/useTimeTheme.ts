import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { getTimeTheme } from "./getTimeTheme";
import { readStoredPreference, writeStoredPreference } from "./themePreference";
import { themeTokens } from "./themeTokens";
import type { ThemeMode, ThemePreference } from "./types";

/** Milisegundos que dura la transición suave al cambiar de tema. */
const THEME_TRANSITION_MS = 400;
const TRANSITION_CLASS = "theme-transition";

/** Variables CSS de color que consume Tailwind, para un tema. */
function themeVariables(mode: ThemeMode): Record<string, string> {
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
    "--color-danger": t.danger,
    "--color-danger-foreground": t.dangerForeground,
  };
}

let transitionTimer: number | undefined;

/** Activa `theme-transition` en el elemento raíz durante ~400 ms. */
function flashTransition(root: HTMLElement): void {
  root.classList.add(TRANSITION_CLASS);
  window.clearTimeout(transitionTimer);
  transitionTimer = window.setTimeout(
    () => root.classList.remove(TRANSITION_CLASS),
    THEME_TRANSITION_MS,
  );
}

/** Resuelve el tema real a partir de la preferencia y la hora actual. */
export function resolveThemeMode(
  preference: ThemePreference,
  now: Date = new Date(),
): ThemeMode {
  return preference === "auto" ? getTimeTheme(now) : preference;
}

/** Pinta las variables del tema en el elemento raíz del documento. */
export function applyTheme(
  mode: ThemeMode,
  root: HTMLElement = document.documentElement,
): void {
  for (const [name, value] of Object.entries(themeVariables(mode))) {
    root.style.setProperty(name, value);
  }
  root.dataset.theme = mode;
}

/**
 * Aplica el tema guardado antes del primer render (se llama desde `main.tsx`),
 * así no hay parpadeo con el tema por defecto.
 */
export function initTheme(): void {
  applyTheme(resolveThemeMode(readStoredPreference()));
}

/**
 * Resuelve el tema activo.
 * - Modo automático: sigue la hora del día y se refresca cada minuto.
 * - Preferencia manual: se guarda en localStorage y se lee al arrancar.
 * Las variables se aplican en `<html>`; al cambiar de tema se añade durante
 * ~400 ms la clase `theme-transition` para suavizar el cambio.
 */
export function useTimeTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    readStoredPreference(),
  );
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

  useLayoutEffect(() => {
    const root = document.documentElement;
    // El primer pintado (ya hecho por initTheme) no se anima.
    const changed =
      root.dataset.theme !== undefined && root.dataset.theme !== mode;
    if (changed) flashTransition(root);
    applyTheme(mode, root);
  }, [mode]);

  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    writeStoredPreference(value);
  }, []);

  return { preference, setPreference, mode };
}
