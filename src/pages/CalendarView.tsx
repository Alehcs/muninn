import { useMemo, useState } from "react";
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

  const showMonth = (nextMonthKey: string) => {
    setMonthKey(nextMonthKey);
    const today = getLocalDate();
    // En el mes actual se selecciona hoy; en otro, el primer día.
    setSelectedDate(
      nextMonthKey === getCurrentMonthKey()
        ? today
        : getMonthRange(nextMonthKey).startDate,
    );
  };

  return (
    <section>
      {calendar.status === "error" ? (
        <p className="rounded-xl border border-border bg-surface px-6 py-8 text-center text-sm text-text-muted">
          No se pudo cargar el calendario.
        </p>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
          <div className={calendar.status === "loading" ? "opacity-60" : ""}>
            <CalendarMonthView
              monthKey={monthKey}
              selectedDate={selectedDate}
              summariesByDate={calendar.summariesByDate}
              onSelectDate={setSelectedDate}
              onPreviousMonth={() => showMonth(shiftMonthKey(monthKey, -1))}
              onNextMonth={() => showMonth(shiftMonthKey(monthKey, 1))}
              onToday={() => showMonth(getCurrentMonthKey())}
            />
          </div>
          <CalendarDayDetails
            details={details}
            future={selectedDate > getLocalDate()}
          />
        </div>
      )}
    </section>
  );
}
