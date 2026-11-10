import { cn } from "@/utils/cn";
import type { HabitProgress, HabitStatus, HabitType } from "../types";

interface HabitHistoryCardProps {
  progress: HabitProgress;
}

const TYPE_LABELS: Record<HabitType, string> = {
  check: "Una vez",
  count: "Conteo",
  duration: "Duración",
};

const STATUS_META: Record<HabitStatus, { label: string; badge: string }> = {
  pending: { label: "Sin registro", badge: "bg-surface-hover text-text-muted" },
  "in-progress": { label: "En progreso", badge: "bg-accent/20 text-accent" },
  completed: { label: "Completado", badge: "bg-success/20 text-success" },
};

function formatProgress(progress: HabitProgress): string {
  const { habit, value } = progress;
  if (habit.type === "check") {
    return value > 0 ? "Completado" : "Sin completar";
  }
  return `${value} / ${habit.target} ${habit.unit}`;
}

export default function HabitHistoryCard({ progress }: HabitHistoryCardProps) {
  const { habit, percent, status } = progress;
  const statusMeta = STATUS_META[status];

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{habit.name}</p>
            {!habit.active && (
              <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-muted">
                Pausado
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted">
            {TYPE_LABELS[habit.type]} · objetivo {habit.target} {habit.unit}
          </p>
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
            status === "completed" ? "bg-success" : "bg-accent",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
