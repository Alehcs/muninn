import type { StatsSummaryData } from "../hooks/useStats";

interface StatsSummaryProps {
  summary: StatsSummaryData;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="px-4 py-2.5">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/** Cuatro métricas en una sola franja. */
export default function StatsSummary({ summary }: StatsSummaryProps) {
  return (
    <div className="grid grid-cols-2 divide-x divide-border rounded-xl border border-border bg-surface sm:grid-cols-4">
      <Metric label="Cumplimiento 7 días" value={`${summary.compliance7}%`} />
      <Metric label="Cumplimiento 30 días" value={`${summary.compliance30}%`} />
      <Metric label="Hábitos activos" value={summary.activeHabits} />
      <Metric label="Completados hoy" value={summary.completedToday} />
    </div>
  );
}
