import { cn } from "@/utils/cn";
import type { CalendarGridDay } from "@/features/calendar/utils/monthGrid";
import type { CalendarDaySummary } from "@/features/calendar/hooks/useCalendarMonth";
import type { CalendarHeatLevel } from "@/features/calendar/utils/dayStatus";

interface CalendarDayCellProps {
  day: CalendarGridDay;
  selected: boolean;
  /** Es el día de hoy (se marca con borde). */
  today: boolean;
  /** Día posterior a hoy: aún no hay dato. */
  future: boolean;
  summary?: CalendarDaySummary;
  onSelect: () => void;
}

/** Fondos del mapa de calor: tokens de tema con distinta opacidad. */
const HEAT_STYLES: Record<CalendarHeatLevel, string> = {
  0: "bg-surface-hover/60",
  1: "bg-accent/20",
  2: "bg-accent/55",
  3: "bg-success/60",
};

/** Celda del mapa de calor: solo el número; el % exacto va en title/aria-label. */
export default function CalendarDayCell({
  day,
  selected,
  today,
  future,
  summary,
  onSelect,
}: CalendarDayCellProps) {
  const hasData = day.inMonth && !future && summary !== undefined;
  const description = !day.inMonth
    ? `${day.dayNumber}, otro mes`
    : !hasData
      ? `${day.date}: sin dato`
      : `${day.date}: ${summary.percent}% cumplido`;

  return (
    <button
      type="button"
      title={description}
      aria-label={description}
      aria-pressed={day.inMonth ? selected : undefined}
      aria-current={today ? "date" : undefined}
      disabled={!day.inMonth}
      onClick={onSelect}
      className={cn(
        "flex h-11 items-center justify-center rounded-lg border text-sm tabular-nums transition-colors disabled:cursor-default",
        hasData ? HEAT_STYLES[summary.level] : "bg-transparent text-text-muted/50",
        hasData && "text-text",
        !day.inMonth && "opacity-30",
        today ? "border-text" : "border-transparent",
        day.inMonth && "hover:border-accent",
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
      )}
    >
      {day.dayNumber}
    </button>
  );
}
