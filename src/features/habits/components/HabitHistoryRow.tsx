import CompactRow from "@/components/CompactRow";
import { cn } from "@/utils/cn";
import type { HabitProgress, HabitStatus } from "../types";

interface HabitHistoryRowProps {
  progress: HabitProgress;
}

const STATUS_LABELS: Record<HabitStatus, string> = {
  pending: "Sin registro",
  "in-progress": "En progreso",
  completed: "Completado",
};

function formatProgress({ habit, value }: HabitProgress): string {
  if (habit.type === "check") return value > 0 ? "Hecho" : "Sin completar";
  return `${value} / ${habit.target} ${habit.unit}`;
}

/** Fila compacta del historial de un día: nombre, avance, % y estado. */
export default function HabitHistoryRow({ progress }: HabitHistoryRowProps) {
  const { habit, percent, status } = progress;
  const completed = status === "completed";

  return (
    <CompactRow
      progress={percent}
      progressTone={completed ? "success" : "accent"}
      dimmed={!habit.active}
      trailing={
        <div className="flex shrink-0 items-center gap-3 text-sm tabular-nums">
          <span className="text-text-muted">{formatProgress(progress)}</span>
          <span className="w-10 text-right font-medium">{percent}%</span>
          <span
            className={cn(
              "w-24 text-right text-xs",
              completed ? "text-success" : "text-text-muted",
            )}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>
      }
    >
      <span className="shrink-0 text-sm font-medium">{habit.name}</span>
      {!habit.active && (
        <span className="shrink-0 rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-muted">
          Pausado
        </span>
      )}
    </CompactRow>
  );
}
