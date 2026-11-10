import { useMemo, useState } from "react";
import Button from "@/components/Button";
import CalendarDayDetails from "@/features/calendar/components/CalendarDayDetails";
import CalendarMonthView from "@/features/calendar/components/CalendarMonthView";
import { useCalendarMonth } from "@/features/calendar/hooks/useCalendarMonth";
import type { HabitsStore } from "@/features/habits/hooks/useHabits";
import {
  getCurrentMonthKey,
  getMonthRange,
  shiftMonthKey,
} from "@/features/calendar/utils/monthGrid";
import { getLocalDate } from "@/features/habits/utils/date";

interface CalendarViewProps {
  store: HabitsStore;
}

export default function CalendarView({ store }: CalendarViewProps) {
  const [monthKey, setMonthKey] = useState(() => getCurrentMonthKey());
  const [selectedDate, setSelectedDate] = useState(() => getLocalDate());
  const calendar = useCalendarMonth(monthKey, store.habits);
  const details = useMemo(
    () => calendar.getDetailsForDate(selectedDate),
    [calendar, selectedDate],
  );

  const navigateMonth = (offset: number) => {
    const nextMonthKey = shiftMonthKey(monthKey, offset);
    setMonthKey(nextMonthKey);
    setSelectedDate(getMonthRange(nextMonthKey).startDate);
  };

  return (
    <section className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Calendario mensual</h2>
          <p className="text-sm text-text-muted">
            Revisa el cumplimiento diario de tus hábitos activos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigateMonth(-1)}>
            Mes anterior
          </Button>
          <Button variant="ghost" onClick={() => navigateMonth(1)}>
            Mes siguiente
          </Button>
        </div>
      </div>

      {calendar.status === "error" ? (
        <p className="mt-6 rounded-xl border border-border bg-surface px-6 py-8 text-center text-sm text-text-muted">
          No se pudo cargar el calendario.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className={calendar.status === "loading" ? "opacity-60" : ""}>
            <CalendarMonthView
              monthKey={monthKey}
              selectedDate={selectedDate}
              summariesByDate={calendar.summariesByDate}
              onSelectDate={setSelectedDate}
            />
          </div>
          <CalendarDayDetails details={details} />
        </div>
      )}
    </section>
  );
}
