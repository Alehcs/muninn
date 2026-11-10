import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useHabitTimer } from "@/features/timer/hooks/useHabitTimer";

type HabitTimerValue = ReturnType<typeof useHabitTimer>;

const HabitTimerContext = createContext<HabitTimerValue | null>(null);

interface HabitTimerProviderProps {
  /** Se llama al terminar un timer con los minutos a sumar al hábito. */
  onComplete: (habitId: string, minutes: number) => void;
  children: ReactNode;
}

/**
 * Mantiene el timer de hábitos montado en `App`, de modo que sigue corriendo
 * al cambiar de vista.
 */
export function HabitTimerProvider({
  onComplete,
  children,
}: HabitTimerProviderProps) {
  const timer = useHabitTimer({ onComplete });
  return (
    <HabitTimerContext.Provider value={timer}>
      {children}
    </HabitTimerContext.Provider>
  );
}

export function useHabitTimerContext(): HabitTimerValue {
  const value = useContext(HabitTimerContext);
  if (value === null) {
    throw new Error(
      "useHabitTimerContext debe usarse dentro de <HabitTimerProvider>.",
    );
  }
  return value;
}
