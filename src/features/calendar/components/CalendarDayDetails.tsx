import ThinProgress from "@/components/ThinProgress";
import type { CalendarDayDetails as CalendarDayDetailsData } from "@/features/calendar/hooks/useCalendarMonth";

interface CalendarDayDetailsProps {
  details: CalendarDayDetailsData;
  /** El día seleccionado es posterior a hoy: no hay datos que mostrar. */
  future?: boolean;
}

function formatProgress(value: number, target: number, unit: string): string {
  return `${value} / ${target} ${unit}`;
}

export default function CalendarDayDetails({
  details,
  future = false,
}: CalendarDayDetailsProps) {
  return (
    <aside className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-text-muted">Fecha seleccionada</p>
          <h3 className="mt-0.5 text-sm font-semibold">{details.date}</h3>
        </div>
        <p className="text-2xl font-semibold tabular-nums">
          {future ? "—" : `${details.percent}%`}
        </p>
      </div>

      {future ? (
        <p className="mt-3 text-sm text-text-muted">Aún no hay datos para este día.</p>
      ) : (
        <>
          <p className="mt-2 text-xs text-text-muted">
            {details.completed} / {details.total} hábitos completados
          </p>

          <div className="mt-3 flex flex-col divide-y divide-border">
            {details.habitProgress.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
                No hay hábitos activos para este día.
              </p>
            ) : (
              details.habitProgress.map((progress) => (
                <div key={progress.habit.id} className="py-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm">{progress.habit.name}</p>
                    <p className="shrink-0 text-xs tabular-nums text-text-muted">
                      {formatProgress(
                        progress.value,
                        progress.habit.target,
                        progress.habit.unit,
                      )}{" "}
                      · <span className="font-medium text-text">{progress.percent}%</span>
                    </p>
                  </div>
                  <ThinProgress
                    percent={progress.percent}
                    tone={progress.status === "completed" ? "success" : "accent"}
                    className="mt-1"
                  />
                </div>
              ))
            )}
          </div>
        </>
      )}
    </aside>
  );
}
