import { useState } from "react";
import { cn } from "@/utils/cn";
import type { HabitProgress, HabitStatus, HabitType } from "../types";

interface HabitCardProps {
  progress: HabitProgress;
  onToggleCheck: () => void;
  onIncrement: () => void;
  onAddMinutes: (minutes: number) => void;
  onReset: () => void;
  onStartTimer?: (minutes: number) => void;
  timerDisabled?: boolean;
}

const TYPE_LABELS: Record<HabitType, string> = {
  check: "Check",
  count: "Conteo",
  duration: "Duración",
};

const STATUS_META: Record<HabitStatus, { label: string; badge: string }> = {
  pending: { label: "Pendiente", badge: "bg-surface-hover text-text-muted" },
  "in-progress": { label: "En progreso", badge: "bg-accent/20 text-accent" },
  completed: { label: "Completado", badge: "bg-success/20 text-success" },
};

const BTN_BASE =
  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40";
const BTN_PRIMARY = cn(
  BTN_BASE,
  "bg-accent text-accent-foreground hover:bg-accent-hover",
);
const BTN_GHOST = cn(
  BTN_BASE,
  "border border-border text-text-muted hover:bg-surface-hover hover:text-text",
);
const TIMER_OPTIONS = [15, 30, 45, 60];

function formatProgress(progress: HabitProgress): string {
  const { habit, value } = progress;
  if (habit.type === "check") {
    return value > 0 ? "Completado" : "Sin completar";
  }
  return `${value} / ${habit.target} ${habit.unit}`;
}

export default function HabitCard({
  progress,
  onToggleCheck,
  onIncrement,
  onAddMinutes,
  onReset,
  onStartTimer,
  timerDisabled = false,
}: HabitCardProps) {
  const { habit, percent, status } = progress;
  const statusMeta = STATUS_META[status];
  const isCompleted = status === "completed";
  const [showTimerOptions, setShowTimerOptions] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{habit.name}</p>
          <p className="text-xs text-text-muted">{TYPE_LABELS[habit.type]}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            statusMeta.badge,
          )}
        >
          {statusMeta.label}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-text-muted">{formatProgress(progress)}</span>
        <span className="font-medium">{percent}%</span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-surface-hover">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isCompleted ? "bg-success" : "bg-accent",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {habit.type === "check" && (
          <button
            className={isCompleted ? BTN_GHOST : BTN_PRIMARY}
            onClick={onToggleCheck}
          >
            {isCompleted ? "Desmarcar" : "Marcar como hecho"}
          </button>
        )}

        {habit.type === "count" && (
          <>
            <button className={BTN_PRIMARY} onClick={onIncrement}>
              +1
            </button>
            <button className={BTN_GHOST} onClick={onReset}>
              Reiniciar
            </button>
          </>
        )}

        {habit.type === "duration" && (
          <>
            <button className={BTN_PRIMARY} onClick={() => onAddMinutes(15)}>
              +15 min
            </button>
            <button className={BTN_PRIMARY} onClick={() => onAddMinutes(30)}>
              +30 min
            </button>
            <button className={BTN_GHOST} onClick={onReset}>
              Reiniciar
            </button>
            {onStartTimer && (
              <div className="mt-2 flex basis-full flex-wrap items-center gap-2 border-t border-border pt-3">
                <button
                  className={BTN_GHOST}
                  disabled={timerDisabled}
                  onClick={() => setShowTimerOptions((open) => !open)}
                >
                  Iniciar timer
                </button>
                {showTimerOptions &&
                  TIMER_OPTIONS.map((minutes) => (
                    <button
                      key={minutes}
                      className={BTN_GHOST}
                      disabled={timerDisabled}
                      onClick={() => {
                        setShowTimerOptions(false);
                        onStartTimer(minutes);
                      }}
                    >
                      {minutes} min
                    </button>
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
