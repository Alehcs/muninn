import { useEffect, useMemo, useState } from "react";
import * as habitLogRepo from "@/features/habits/storage/habitLogRepository";
import type { Habit, HabitProgress } from "@/features/habits/types";
import {
  getDailyProgress,
  getHabitProgress,
} from "@/features/habits/utils/progress";
import type { DailyProgress } from "@/features/habits/utils/progress";
import { getDateRange } from "@/features/stats/utils/dateRange";
import { getCalendarDayStatus } from "@/features/calendar/utils/dayStatus";
import type { CalendarDayStatus } from "@/features/calendar/utils/dayStatus";
import { getMonthRange } from "@/features/calendar/utils/monthGrid";

type CalendarStatus = "loading" | "ready" | "error";

type ValuesByDate = Record<string, Record<string, number>>;

export interface CalendarDaySummary extends DailyProgress {
  date: string;
  status: CalendarDayStatus;
}

export interface CalendarDayDetails extends DailyProgress {
  date: string;
  habitProgress: HabitProgress[];
}

interface CalendarMonthState {
  status: CalendarStatus;
  summariesByDate: Record<string, CalendarDaySummary>;
  getDetailsForDate: (date: string) => CalendarDayDetails;
}

function indexValuesByDate(
  valuesByHabit: Record<string, Record<string, number>>,
): ValuesByDate {
  const valuesByDate: ValuesByDate = {};

  for (const [habitId, values] of Object.entries(valuesByHabit)) {
    for (const [date, value] of Object.entries(values)) {
      valuesByDate[date] ??= {};
      valuesByDate[date][habitId] = value;
    }
  }

  return valuesByDate;
}

export function useCalendarMonth(
  monthKey: string,
  habits: Habit[],
): CalendarMonthState {
  const activeHabits = useMemo(
    () => habits.filter((habit) => habit.active),
    [habits],
  );
  const { startDate, endDate } = useMemo(
    () => getMonthRange(monthKey),
    [monthKey],
  );
  const monthDates = useMemo(
    () => getDateRange(startDate, endDate),
    [startDate, endDate],
  );
  const [status, setStatus] = useState<CalendarStatus>("loading");
  const [valuesByDate, setValuesByDate] = useState<ValuesByDate>({});

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    void habitLogRepo
      .getValuesForDateRange(startDate, endDate)
      .then((valuesByHabit) => {
        if (cancelled) return;
        setValuesByDate(indexValuesByDate(valuesByHabit));
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setValuesByDate({});
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [endDate, startDate]);

  const summariesByDate = useMemo(() => {
    const summaries: Record<string, CalendarDaySummary> = {};

    for (const date of monthDates) {
      const daily = getDailyProgress(activeHabits, valuesByDate[date] ?? {});
      summaries[date] = {
        date,
        ...daily,
        status: getCalendarDayStatus(daily.percent),
      };
    }

    return summaries;
  }, [activeHabits, monthDates, valuesByDate]);

  const getDetailsForDate = (date: string): CalendarDayDetails => {
    const values = valuesByDate[date] ?? {};
    const daily = getDailyProgress(activeHabits, values);

    return {
      date,
      ...daily,
      habitProgress: activeHabits.map((habit) =>
        getHabitProgress(habit, values[habit.id] ?? 0),
      ),
    };
  };

  return { status, summariesByDate, getDetailsForDate };
}
