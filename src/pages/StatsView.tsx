import HabitStatsRow, {
  STATS_COLUMNS,
} from "@/features/stats/components/HabitStatsRow";
import StatsSummary from "@/features/stats/components/StatsSummary";
import { useStats } from "@/features/stats/hooks/useStats";
import type { HabitsStore } from "@/features/habits/hooks/useHabits";

interface StatsViewProps {
  store: HabitsStore;
}

export default function StatsView({ store }: StatsViewProps) {
  const stats = useStats({ habits: store.habits, daily: store.daily });

  return (
    <section>
      <StatsSummary summary={stats.summary} />

      <h3 className="mt-5 mb-2 text-sm font-semibold">Hábitos activos</h3>
      {stats.status === "loading" ? (
        <p className="rounded-xl border border-border bg-surface px-6 py-8 text-center text-sm text-text-muted">
          Calculando estadísticas…
        </p>
      ) : stats.status === "error" ? (
        <p className="rounded-xl border border-border bg-surface px-6 py-8 text-center text-sm text-text-muted">
          No se pudieron cargar las estadísticas.
        </p>
      ) : stats.habitStats.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-text-muted">
          No hay hábitos activos para analizar.
        </p>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-1">
          <div className="flex items-center gap-2 px-2 pb-1 pt-1.5 text-xs text-text-muted">
            <span className="flex-1">Hábito</span>
            <div className={STATS_COLUMNS}>
              <span>Racha actual</span>
              <span>Mejor racha</span>
              <span>7 días</span>
              <span>30 días</span>
            </div>
          </div>
          <div className="divide-y divide-border border-t border-border">
            {stats.habitStats.map((habitStats) => (
              <HabitStatsRow key={habitStats.habit.id} stats={habitStats} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
