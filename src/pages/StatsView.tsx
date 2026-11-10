import HabitStatsCard from "@/features/stats/components/HabitStatsCard";
import StatsSummary from "@/features/stats/components/StatsSummary";
import { useStats } from "@/features/stats/hooks/useStats";
import type { HabitsStore } from "@/features/habits/hooks/useHabits";

interface StatsViewProps {
  store: HabitsStore;
}

export default function StatsView({ store }: StatsViewProps) {
  const stats = useStats({ habits: store.habits, daily: store.daily });

  return (
    <section className="mx-auto max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold">Estadísticas simples</h2>
        <p className="text-sm text-text-muted">
          Cumplimiento y rachas basadas en tus registros locales.
        </p>
      </div>

      <div className="mt-6">
        <StatsSummary summary={stats.summary} />
      </div>

      <h3 className="mt-8 mb-3 text-lg font-semibold">Hábitos activos</h3>
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
        <div className="flex flex-col gap-3">
          {stats.habitStats.map((habitStats) => (
            <HabitStatsCard key={habitStats.habit.id} stats={habitStats} />
          ))}
        </div>
      )}
    </section>
  );
}
