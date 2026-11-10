import Button from "@/components/Button";
import { formatTimerTime } from "@/features/timer/utils/timeFormat";
import type { HabitTimerSnapshot } from "@/features/timer/hooks/useHabitTimer";

interface HabitTimerPanelProps {
  timer: HabitTimerSnapshot | null;
  message: string | null;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onFinish: () => void;
}

export default function HabitTimerPanel({
  timer,
  message,
  onPause,
  onResume,
  onCancel,
  onFinish,
}: HabitTimerPanelProps) {
  if (timer === null && message === null) return null;

  return (
    <div className="mt-6 rounded-xl border border-border bg-surface p-5">
      {timer === null ? (
        <p className="text-sm text-text-muted">{message}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-text-muted">Timer activo</p>
              <h3 className="mt-1 font-semibold">{timer.habitName}</h3>
              <p className="mt-1 text-xs text-text-muted">
                Planeado: {timer.plannedMinutes} min · transcurrido:{" "}
                {timer.elapsedMinutes} min
              </p>
            </div>
            <p className="text-3xl font-semibold">
              {formatTimerTime(timer.remainingMs)}
            </p>
          </div>

          <div className="mt-4 h-2 w-full rounded-full bg-surface-hover">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${timer.percent}%` }}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {timer.status === "running" ? (
              <Button variant="ghost" onClick={onPause}>
                Pausar
              </Button>
            ) : (
              <Button variant="primary" onClick={onResume}>
                Reanudar
              </Button>
            )}
            <Button variant="ghost" onClick={onFinish}>
              Finalizar
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          </div>

          {message && <p className="mt-3 text-xs text-text-muted">{message}</p>}
        </>
      )}
    </div>
  );
}
