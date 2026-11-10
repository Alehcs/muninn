import { useEffect, useMemo, useState } from "react";
import * as habitLogRepo from "@/features/habits/storage/habitLogRepository";
import type { Habit } from "@/features/habits/types";
import { getLocalDate } from "@/features/habits/utils/date";
import type { DailyProgress } from "@/features/habits/utils/progress";
import {
  getDateRange,
  getDateRangeEndingOn,
} from "@/features/stats/utils/dateRange";
import {
  getHabitCompliancePercent,
  getOverallCompliancePercent,
} from "@/features/stats/utils/compliance";
import type { LogValuesByHabit } from "@/features/stats/utils/compliance";
import {
  getBestStreak,
  getCurrentStreak,
} from "@/features/stats/utils/streaks";

type StatsStatus = "loading" | "ready" | "error";

export interface HabitStats {
  habit: Habit;
  currentStreak: number;
  bestStreak: number;
  compliance7: number;
  compliance30: number;
}

export interface StatsSummaryData {
  compliance7: number;
  compliance30: number;
  activeHabits: number;
  completedToday: number;
}

interface UseStatsInput {
  habits: Habit[];
  daily: DailyProgress;
}

interface StatsState {
  status: StatsStatus;
  summary: StatsSummaryData;
  habitStats: HabitStats[];
}

const EMPTY_VALUES: LogValuesByHabit = {};

export function useStats({ habits, daily }: UseStatsInput): StatsState {
  const today = useMemo(() => getLocalDate(), []);
  const activeHabits = useMemo(
    () => habits.filter((habit) => habit.active),
    [habits],
  );
  const dates7 = useMemo(() => getDateRangeEndingOn(today, 7), [today]);
  const dates30 = useMemo(() => getDateRangeEndingOn(today, 30), [today]);
  const [status, setStatus] = useState<StatsStatus>("loading");
  const [historyDates, setHistoryDates] = useState<string[]>([today]);
  const [valuesByHabit, setValuesByHabit] =
    useState<LogValuesByHabit>(EMPTY_VALUES);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setStatus("loading");
        const earliestLogDate = await habitLogRepo.getEarliestLogDate();
        const startDate = earliestLogDate ?? dates30[0] ?? today;
        const values = await habitLogRepo.getValuesForDateRange(
          startDate,
          today,
        );

        if (cancelled) return;
        setHistoryDates(getDateRange(startDate, today));
        setValuesByHabit(values);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setHistoryDates([today]);
        setValuesByHabit(EMPTY_VALUES);
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dates30, today]);

  const summary = useMemo<StatsSummaryData>(
    () => ({
      compliance7: getOverallCompliancePercent(
        activeHabits,
        dates7,
        valuesByHabit,
      ),
      compliance30: getOverallCompliancePercent(
        activeHabits,
        dates30,
        valuesByHabit,
      ),
      activeHabits: activeHabits.length,
      completedToday: daily.completed,
    }),
    [activeHabits, daily.completed, dates7, dates30, valuesByHabit],
  );

  const habitStats = useMemo<HabitStats[]>(
    () =>
      activeHabits.map((habit) => ({
        habit,
        currentStreak: getCurrentStreak(habit, historyDates, valuesByHabit),
        bestStreak: getBestStreak(habit, historyDates, valuesByHabit),
        compliance7: getHabitCompliancePercent(habit, dates7, valuesByHabit),
        compliance30: getHabitCompliancePercent(habit, dates30, valuesByHabit),
      })),
    [activeHabits, dates7, dates30, historyDates, valuesByHabit],
  );

  return { status, summary, habitStats };
}
