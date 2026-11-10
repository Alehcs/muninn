import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import CalendarDayCell from "./CalendarDayCell";
import type { CalendarDaySummary } from "@/features/calendar/hooks/useCalendarMonth";
import {
  getMonthWeeks,
  getMonthLabel,
} from "@/features/calendar/utils/monthGrid";
import { getLocalDate } from "@/features/habits/utils/date";

interface CalendarMonthViewProps {
  monthKey: string;
  selectedDate: string;
  summariesByDate: Record<string, CalendarDaySummary>;
  onSelectDate: (date: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const LEGEND = [
  { label: "0 %", className: "bg-surface-hover/60" },
  { label: "1-49 %", className: "bg-accent/20" },
  { label: "50-99 %", className: "bg-accent/55" },
  { label: "100 %", className: "bg-success/60" },
];

/** Mapa de calor del mes con la navegación entre meses en su cabecera. */
export default function CalendarMonthView({
  monthKey,
  selectedDate,
  summariesByDate,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
  onToday,
}: CalendarMonthViewProps) {
  const weeks = getMonthWeeks(monthKey);
  const today = getLocalDate();

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-1">
        <p className="mr-auto text-sm font-semibold first-letter:uppercase">
          {getMonthLabel(monthKey)}
        </p>
        <Button variant="quiet" className="px-2 py-1 text-xs" onClick={onToday}>
          Hoy
        </Button>
        <IconButton icon={ChevronLeft} label="Mes anterior" onClick={onPreviousMonth} />
        <IconButton icon={ChevronRight} label="Mes siguiente" onClick={onNextMonth} />
      </div>
      <div className="grid grid-cols-7 gap-1.5">
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
            today={day.date === today}
            future={day.date > today}
            summary={summariesByDate[day.date]}
            onSelect={() => onSelectDate(day.date)}
          />
        ))}
      </div>
      <ul
        aria-label="Leyenda"
        className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted"
      >
        {LEGEND.map((entry) => (
          <li key={entry.label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`h-3 w-3 rounded ${entry.className}`} />
            {entry.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
