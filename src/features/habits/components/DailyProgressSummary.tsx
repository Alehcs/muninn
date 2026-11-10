import ThinProgress from "@/components/ThinProgress";

interface DailyProgressSummaryProps {
  percent: number;
  completed: number;
  total: number;
  title?: string;
}

/** Resumen compacto del día: porcentaje, barra fina y hábitos completados. */
export default function DailyProgressSummary({
  percent,
  completed,
  total,
  title = "Progreso de hoy",
}: DailyProgressSummaryProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface px-4 py-3">
      <p className="shrink-0 text-sm text-text-muted">
        {title}{" "}
        <span className="ml-1 text-xl font-semibold text-text">{percent}%</span>
      </p>
      <ThinProgress
        percent={percent}
        tone={percent >= 100 ? "success" : "accent"}
        label="Progreso del día"
        className="min-w-16 flex-1"
      />
      <p className="shrink-0 text-sm text-text-muted">
        {completed} / {total} completados
      </p>
    </div>
  );
}
