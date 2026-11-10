import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Habit } from "@/features/habits/types";

type TimerStatus = "running" | "paused";

interface TimerState {
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

function getElapsedMs(timer: TimerState, now: number): number {
  if (timer.status === "paused" || timer.startedAt === null) {
    return timer.elapsedBeforePauseMs;
  }

  return timer.elapsedBeforePauseMs + (now - timer.startedAt);
}

function toCompletedMinutes(timer: TimerState, elapsedMs: number): number {
  return Math.min(timer.plannedMinutes, Math.floor(elapsedMs / 60_000));
}

export function useHabitTimer({ onComplete }: UseHabitTimerOptions) {
  const onCompleteRef = useRef(onComplete);
  const [timer, setTimer] = useState<TimerState | null>(null);
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
    setTimer((current) => {
      if (current === null) return current;

      const elapsedMs = getElapsedMs(current, Date.now());
      const completedMinutes = toCompletedMinutes(current, elapsedMs);

      if (completedMinutes > 0) {
        onCompleteRef.current(current.habitId, completedMinutes);
      }

      setMessage(
        `${current.habitName}: timer finalizado manualmente (+${completedMinutes} min).`,
      );

      return null;
    });
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
