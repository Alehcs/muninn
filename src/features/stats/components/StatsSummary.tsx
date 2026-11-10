import type { StatsSummaryData } from "../hooks/useStats";

interface StatsSummaryProps {
  summary: StatsSummaryData;
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

export default function StatsSummary({ summary }: StatsSummaryProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <MetricCard label="Cumplimiento últimos 7 días" value={`${summary.compliance7}%`} />
      <MetricCard label="Cumplimiento últimos 30 días" value={`${summary.compliance30}%`} />
      <MetricCard label="Hábitos activos" value={summary.activeHabits} />
      <MetricCard label="Completados hoy" value={summary.completedToday} />
    </div>
  );
}
