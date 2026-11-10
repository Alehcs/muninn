import type { HabitStats } from "../hooks/useStats";

interface HabitStatsCardProps {
  stats: HabitStats;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-hover px-3 py-2">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

export default function HabitStatsCard({ stats }: HabitStatsCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="font-medium">{stats.habit.name}</p>
      <p className="mt-0.5 text-xs text-text-muted">
        Objetivo {stats.habit.target} {stats.habit.unit}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatPill label="Racha actual" value={`${stats.currentStreak} días`} />
        <StatPill label="Mejor racha" value={`${stats.bestStreak} días`} />
        <StatPill label="Últimos 7 días" value={`${stats.compliance7}%`} />
        <StatPill label="Últimos 30 días" value={`${stats.compliance30}%`} />
      </div>
    </div>
  );
}
