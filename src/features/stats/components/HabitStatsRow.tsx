import CompactRow from "@/components/CompactRow";
import type { HabitStats } from "../hooks/useStats";

interface HabitStatsRowProps {
  stats: HabitStats;
}

/** Columnas numéricas de la tabla de estadísticas (misma plantilla en cabecera y filas). */
export const STATS_COLUMNS = "grid grid-cols-4 gap-2 w-[22rem] shrink-0 text-right tabular-nums";

/** Fila compacta con las métricas de un hábito. */
export default function HabitStatsRow({ stats }: HabitStatsRowProps) {
  return (
    <CompactRow
      trailing={
        <div className={`${STATS_COLUMNS} text-sm`}>
          <span>{stats.currentStreak} d</span>
          <span>{stats.bestStreak} d</span>
          <span>{stats.compliance7}%</span>
          <span>{stats.compliance30}%</span>
        </div>
      }
    >
      <span className="shrink-0 truncate text-sm font-medium">
        {stats.habit.name}
      </span>
      <span className="min-w-0 truncate text-xs text-text-muted">
        objetivo {stats.habit.target} {stats.habit.unit}
      </span>
    </CompactRow>
  );
}
