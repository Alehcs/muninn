import CalendarDayCell from "./CalendarDayCell";
import type { CalendarDaySummary } from "@/features/calendar/hooks/useCalendarMonth";
import {
  getMonthWeeks,
  getMonthLabel,
} from "@/features/calendar/utils/monthGrid";

interface CalendarMonthViewProps {
  monthKey: string;
  selectedDate: string;
  summariesByDate: Record<string, CalendarDaySummary>;
  onSelectDate: (date: string) => void;
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function CalendarMonthView({
  monthKey,
  selectedDate,
  summariesByDate,
  onSelectDate,
}: CalendarMonthViewProps) {
  const weeks = getMonthWeeks(monthKey);

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="mb-4 text-sm font-medium capitalize text-text-muted">
        {getMonthLabel(monthKey)}
      </p>
      <div className="grid grid-cols-7 gap-2">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="px-1 text-center text-xs font-medium text-text-muted"
          >
            {weekday}
          </div>
        ))}
        {weeks.flat().map((day) => (
          <CalendarDayCell
            key={day.date}
            day={day}
            selected={day.date === selectedDate}
            summary={summariesByDate[day.date]}
            onSelect={() => onSelectDate(day.date)}
          />
        ))}
      </div>
    </div>
  );
}
