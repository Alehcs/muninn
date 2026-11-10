import { cn } from "@/utils/cn";

interface DailyProgressSummaryProps {
  percent: number;
  completed: number;
  total: number;
}

export default function DailyProgressSummary({
  percent,
  completed,
  total,
}: DailyProgressSummaryProps) {
  const done = percent >= 100;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-text-muted">Progreso de hoy</p>
          <p className="text-3xl font-semibold">{percent}%</p>
        </div>
        <p className="text-sm text-text-muted">
          {completed} / {total} hábitos completados
        </p>
      </div>
      <div className="mt-4 h-2 w-full rounded-full bg-surface-hover">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            done ? "bg-success" : "bg-accent",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
