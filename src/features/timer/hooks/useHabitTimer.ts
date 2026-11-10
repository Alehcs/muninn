import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Habit } from "@/features/habits/types";

export type TimerStatus = "running" | "paused";

export interface TimerState {
  habitId: string;
  habitName: string;
  plannedMinutes: number;
  plannedMs: number;
  status: TimerStatus;
  startedAt: number | null;
  elapsedBeforePauseMs: number;
}

export interface HabitTimerSnapshot {
  habitId: string;
  habitName: string;
  plannedMinutes: number;
  status: TimerStatus;
  elapsedMs: number;
  remainingMs: number;
  elapsedMinutes: number;
  percent: number;
}

interface UseHabitTimerOptions {
  onComplete: (habitId: string, minutes: number) => void;
}

export function getElapsedMs(timer: TimerState, now: number): number {
  if (timer.status === "paused" || timer.startedAt === null) {
    return timer.elapsedBeforePauseMs;
  }

  return timer.elapsedBeforePauseMs + (now - timer.startedAt);
}

function toCompletedMinutes(timer: TimerState, elapsedMs: number): number {
  return Math.min(timer.plannedMinutes, Math.floor(elapsedMs / 60_000));
}

/**
 * Resultado de finalizar un timer a mano: minutos completos a sumar (0 si no
 * llegó al primero) y mensaje. Es una función pura: el efecto de sumar los
 * minutos lo hace quien la llama, nunca dentro de un actualizador de estado.
 */
export function resolveManualFinish(
  timer: TimerState,
  now: number,
): { minutes: number; message: string } {
  const minutes = toCompletedMinutes(timer, getElapsedMs(timer, now));
  return {
    minutes,
    message: `${timer.habitName}: timer finalizado manualmente (+${minutes} min).`,
  };
}

export function useHabitTimer({ onComplete }: UseHabitTimerOptions) {
  const onCompleteRef = useRef(onComplete);
  const [timer, setTimer] = useState<TimerState | null>(null);
  // Copia síncrona del estado para leerlo en acciones sin usar actualizadores.
  const timerRef = useRef<TimerState | null>(null);
  timerRef.current = timer;
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (timer?.status !== "running") return undefined;

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [timer?.status]);

  useEffect(() => {
    if (timer?.status !== "running") return;

    const elapsedMs = getElapsedMs(timer, now);
    if (elapsedMs < timer.plannedMs) return;

    onCompleteRef.current(timer.habitId, timer.plannedMinutes);
    setMessage(`${timer.habitName}: timer finalizado (+${timer.plannedMinutes} min).`);
    setTimer(null);
  }, [now, timer]);

  const activeTimer = useMemo<HabitTimerSnapshot | null>(() => {
    if (timer === null) return null;

    const elapsedMs = Math.min(timer.plannedMs, getElapsedMs(timer, now));
    const remainingMs = Math.max(0, timer.plannedMs - elapsedMs);

    return {
      habitId: timer.habitId,
      habitName: timer.habitName,
      plannedMinutes: timer.plannedMinutes,
      status: timer.status,
      elapsedMs,
      remainingMs,
      elapsedMinutes: toCompletedMinutes(timer, elapsedMs),
      percent: Math.round((elapsedMs / timer.plannedMs) * 100),
    };
  }, [now, timer]);

  const startTimer = useCallback(
    (habit: Habit, plannedMinutes: number) => {
      if (timer !== null) {
        setMessage("Ya hay un timer activo. Finalízalo o cancélalo primero.");
        return;
      }

      const startedAt = Date.now();
      setNow(startedAt);
      setMessage(null);
      setTimer({
        habitId: habit.id,
        habitName: habit.name,
        plannedMinutes,
        plannedMs: plannedMinutes * 60_000,
        status: "running",
        startedAt,
        elapsedBeforePauseMs: 0,
      });
    },
    [timer],
  );

  const pauseTimer = useCallback(() => {
    setTimer((current) => {
      if (current === null || current.status === "paused") return current;

      return {
        ...current,
        status: "paused",
        startedAt: null,
        elapsedBeforePauseMs: getElapsedMs(current, Date.now()),
      };
    });
  }, []);

  const resumeTimer = useCallback(() => {
    setTimer((current) => {
      if (current === null || current.status === "running") return current;

      return {
        ...current,
        status: "running",
        startedAt: Date.now(),
      };
    });
  }, []);

  const cancelTimer = useCallback(() => {
    setTimer(null);
    setMessage("Timer cancelado. No se sumó progreso.");
  }, []);

  const finishTimer = useCallback(() => {
    const current = timerRef.current;
    if (current === null) return;

    // Primero el efecto (sumar minutos), fuera de cualquier actualizador:
    // en modo estricto los actualizadores se ejecutan dos veces.
    const { minutes, message: finishMessage } = resolveManualFinish(
      current,
      Date.now(),
    );
    timerRef.current = null;
    if (minutes > 0) onCompleteRef.current(current.habitId, minutes);
    setMessage(finishMessage);
    setTimer(null);
  }, []);

  const canStartTimer = useCallback(
    (habitId: string) => timer === null || timer.habitId === habitId,
    [timer],
  );

  return {
    activeTimer,
    message,
    startTimer,
    pauseTimer,
    resumeTimer,
    cancelTimer,
    finishTimer,
    canStartTimer,
  };
}
