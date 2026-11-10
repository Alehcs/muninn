import type { CalendarDayDetails as CalendarDayDetailsData } from "@/features/calendar/hooks/useCalendarMonth";

interface CalendarDayDetailsProps {
  details: CalendarDayDetailsData;
}

function formatProgress(value: number, target: number, unit: string): string {
  return `${value} / ${target} ${unit}`;
}

export default function CalendarDayDetails({
  details,
}: CalendarDayDetailsProps) {
  return (
    <aside className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-text-muted">Fecha seleccionada</p>
          <h3 className="mt-1 font-semibold">{details.date}</h3>
        </div>
        <p className="text-3xl font-semibold">{details.percent}%</p>
      </div>

      <p className="mt-3 text-sm text-text-muted">
        {details.completed} / {details.total} hábitos completados
      </p>

      <div className="mt-5 flex flex-col gap-2">
        {details.habitProgress.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
            No hay hábitos activos para este día.
          </p>
        ) : (
          details.habitProgress.map((progress) => (
            <div
              key={progress.habit.id}
              className="rounded-lg bg-surface-hover px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{progress.habit.name}</p>
                <p className="text-sm font-semibold">{progress.percent}%</p>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                {formatProgress(
                  progress.value,
                  progress.habit.target,
                  progress.habit.unit,
                )}
              </p>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
