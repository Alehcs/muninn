import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePomodoroTimer } from "@/features/study/hooks/usePomodoroTimer";
import type { PomodoroConfig } from "@/features/study/utils/pomodoroPresets";
import {
  DEFAULT_CUSTOM_POMODORO,
  POMODORO_PRESETS,
} from "@/features/study/utils/pomodoroPresets";

type PomodoroTimer = ReturnType<typeof usePomodoroTimer>;

interface PomodoroContextValue {
  timer: PomodoroTimer;
  /** Preset elegido, o "custom". */
  selectedId: string;
  customConfig: PomodoroConfig;
  /** Configuración efectiva (preset o personalizada). */
  selectedConfig: PomodoroConfig;
  /** ¿Hay una sesión en marcha o en pausa? (bloquea cambiar la configuración). */
  configLocked: boolean;
  selectPreset: (config: PomodoroConfig, id: string) => void;
  selectCustom: () => void;
  setCustomConfig: (config: PomodoroConfig) => void;
}

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

/**
 * Mantiene el pomodoro (y la configuración elegida) montado en `App`, de modo
 * que sigue corriendo al navegar entre vistas.
 */
export function PomodoroProvider({ children }: { children: ReactNode }) {
  const timer = usePomodoroTimer();
  const [selectedId, setSelectedId] = useState(POMODORO_PRESETS[0].id);
  const [customConfig, setCustomConfig] = useState<PomodoroConfig>(
    DEFAULT_CUSTOM_POMODORO,
  );

  const selectPreset = useCallback((config: PomodoroConfig, id: string) => {
    setSelectedId(id);
    setCustomConfig((current) => ({ ...current, ...config }));
  }, []);
  const selectCustom = useCallback(() => setSelectedId("custom"), []);

  const selectedConfig = useMemo<PomodoroConfig>(() => {
    if (selectedId === "custom") return customConfig;
    return (
      POMODORO_PRESETS.find((preset) => preset.id === selectedId) ??
      POMODORO_PRESETS[0]
    );
  }, [customConfig, selectedId]);

  const configLocked = timer.status === "running" || timer.status === "paused";

  const value: PomodoroContextValue = {
    timer,
    selectedId,
    customConfig,
    selectedConfig,
    configLocked,
    selectPreset,
    selectCustom,
    setCustomConfig,
  };

  return (
    <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>
  );
}

export function usePomodoro(): PomodoroContextValue {
  const value = useContext(PomodoroContext);
  if (value === null) {
    throw new Error("usePomodoro debe usarse dentro de <PomodoroProvider>.");
  }
  return value;
}
