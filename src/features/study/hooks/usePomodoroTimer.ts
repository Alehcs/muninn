import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PomodoroConfig } from "@/features/study/utils/pomodoroPresets";

export type PomodoroPhase = "focus" | "break";
export type PomodoroStatus = "idle" | "running" | "paused" | "finished";
export type PomodoroDisplayStatus =
  | "Enfoque"
  | "Descanso"
  | "Pausado"
  | "Finalizado";

export interface PomodoroSummary {
  cyclesCompleted: number;
  focusCompletedMinutes: number;
  breaksCompleted: number;
}

interface PomodoroSession {
  status: Exclude<PomodoroStatus, "idle">;
  phase: PomodoroPhase;
  config: PomodoroConfig;
  currentCycle: number;
  remainingMs: number;
  phaseDurationMs: number;
  summary: PomodoroSummary;
}

const MINUTE_MS = 60_000;

const EMPTY_SUMMARY: PomodoroSummary = {
  cyclesCompleted: 0,
  focusCompletedMinutes: 0,
  breaksCompleted: 0,
};

function toDurationMs(minutes: number): number {
  return minutes * MINUTE_MS;
}

function normalizeConfig(config: PomodoroConfig): PomodoroConfig {
  return {
    focusMinutes: Math.max(1, Math.round(config.focusMinutes)),
    breakMinutes: Math.max(1, Math.round(config.breakMinutes)),
    cycles: Math.max(1, Math.round(config.cycles)),
  };
}

function createSession(config: PomodoroConfig): PomodoroSession {
  const normalized = normalizeConfig(config);
  const focusDurationMs = toDurationMs(normalized.focusMinutes);

  return {
    status: "running",
    phase: "focus",
    config: normalized,
    currentCycle: 1,
    remainingMs: focusDurationMs,
    phaseDurationMs: focusDurationMs,
    summary: EMPTY_SUMMARY,
  };
}

function finishSession(session: PomodoroSession): PomodoroSession {
  return {
    ...session,
    status: "finished",
    remainingMs: 0,
  };
}

function advanceSession(session: PomodoroSession): PomodoroSession {
  if (session.phase === "focus") {
    const summary: PomodoroSummary = {
      ...session.summary,
      cyclesCompleted: session.summary.cyclesCompleted + 1,
      focusCompletedMinutes:
        session.summary.focusCompletedMinutes + session.config.focusMinutes,
    };

    if (session.currentCycle >= session.config.cycles) {
      return finishSession({ ...session, summary });
    }

    const breakDurationMs = toDurationMs(session.config.breakMinutes);
    return {
      ...session,
      phase: "break",
      remainingMs: breakDurationMs,
      phaseDurationMs: breakDurationMs,
      summary,
    };
  }

  const summary: PomodoroSummary = {
    ...session.summary,
    breaksCompleted: session.summary.breaksCompleted + 1,
  };
  const focusDurationMs = toDurationMs(session.config.focusMinutes);

  return {
    ...session,
    phase: "focus",
    currentCycle: Math.min(session.config.cycles, session.currentCycle + 1),
    remainingMs: focusDurationMs,
    phaseDurationMs: focusDurationMs,
    summary,
  };
}

function getDisplayStatus(session: PomodoroSession | null): PomodoroDisplayStatus {
  if (session === null) return "Enfoque";
  if (session.status === "paused") return "Pausado";
  if (session.status === "finished") return "Finalizado";
  return session.phase === "focus" ? "Enfoque" : "Descanso";
}

export function usePomodoroTimer() {
  const [session, setSession] = useState<PomodoroSession | null>(null);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    if (session?.status !== "running") return undefined;

    lastTickRef.current = Date.now();
    const intervalId = window.setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - lastTickRef.current;
      lastTickRef.current = now;

      setSession((current) => {
        if (current === null || current.status !== "running") return current;

        const remainingMs = current.remainingMs - elapsedMs;
        if (remainingMs > 0) return { ...current, remainingMs };

        return advanceSession(current);
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [session?.status]);

  const start = useCallback((config: PomodoroConfig) => {
    lastTickRef.current = Date.now();
    setSession(createSession(config));
  }, []);

  const pause = useCallback(() => {
    setSession((current) =>
      current?.status === "running" ? { ...current, status: "paused" } : current,
    );
  }, []);

  const resume = useCallback(() => {
    lastTickRef.current = Date.now();
    setSession((current) =>
      current?.status === "paused" ? { ...current, status: "running" } : current,
    );
  }, []);

  const skipBreak = useCallback(() => {
    setSession((current) => {
      if (current === null || current.phase !== "break") return current;
      if (current.currentCycle >= current.config.cycles) {
        return finishSession(current);
      }

      const focusDurationMs = toDurationMs(current.config.focusMinutes);
      lastTickRef.current = Date.now();

      return {
        ...current,
        status: "running",
        phase: "focus",
        currentCycle: current.currentCycle + 1,
        remainingMs: focusDurationMs,
        phaseDurationMs: focusDurationMs,
      };
    });
  }, []);

  const cancel = useCallback(() => {
    setSession(null);
  }, []);

  const restart = useCallback(() => {
    setSession((current) => {
      if (current === null) return current;
      lastTickRef.current = Date.now();
      return createSession(current.config);
    });
  }, []);

  const progressPercent = useMemo(() => {
    if (session === null || session.phaseDurationMs <= 0) return 0;
    const elapsedMs = session.phaseDurationMs - session.remainingMs;
    return Math.min(100, Math.max(0, Math.round((elapsedMs / session.phaseDurationMs) * 100)));
  }, [session]);

  const status: PomodoroStatus = session?.status ?? "idle";
  const displayStatus = getDisplayStatus(session);

  return {
    status,
    displayStatus,
    phase: session?.phase ?? "focus",
    currentCycle: session?.currentCycle ?? 0,
    totalCycles: session?.config.cycles ?? 0,
    remainingMs: session?.remainingMs ?? 0,
    phaseDurationMs: session?.phaseDurationMs ?? 0,
    progressPercent,
    activeConfig: session?.config ?? null,
    plannedFocusMinutes:
      session === null ? 0 : session.config.focusMinutes * session.config.cycles,
    summary: status === "finished" ? session?.summary ?? EMPTY_SUMMARY : null,
    canStart: session === null || status === "finished",
    canPause: status === "running",
    canResume: status === "paused",
    canSkipBreak:
      session !== null && session.phase === "break" && status !== "finished",
    canCancel: session !== null && status !== "finished",
    canRestart: session !== null,
    start,
    pause,
    resume,
    skipBreak,
    cancel,
    restart,
  };
}
