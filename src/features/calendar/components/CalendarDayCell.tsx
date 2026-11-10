import { cn } from "@/utils/cn";
import type { CalendarGridDay } from "@/features/calendar/utils/monthGrid";
import type { CalendarDaySummary } from "@/features/calendar/hooks/useCalendarMonth";
import type { CalendarDayStatus } from "@/features/calendar/utils/dayStatus";

interface CalendarDayCellProps {
  day: CalendarGridDay;
  selected: boolean;
  summary?: CalendarDaySummary;
  onSelect: () => void;
}

const STATUS_STYLES: Record<CalendarDayStatus, string> = {
  completed: "border-success bg-success/20 text-text",
  good: "border-accent bg-accent/20 text-text",
  partial: "border-accent/60 bg-accent/10 text-text",
  low: "border-border bg-surface-hover text-text",
  empty: "border-border bg-surface text-text-muted",
};

export default function CalendarDayCell({
  day,
  selected,
  summary,
  onSelect,
}: CalendarDayCellProps) {
  const percent = summary?.percent ?? 0;
  const status = summary?.status ?? "empty";

  return (
    <button
      className={cn(
        "flex min-h-24 flex-col items-start justify-between rounded-xl border p-3 text-left transition-colors hover:border-accent disabled:cursor-default disabled:hover:border-border",
        STATUS_STYLES[status],
        !day.inMonth && "opacity-40",
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-bg",
      )}
      disabled={!day.inMonth}
      onClick={onSelect}
    >
      <span className="text-sm font-medium">{day.dayNumber}</span>
      <span className="text-lg font-semibold">{percent}%</span>
    </button>
  );
}
