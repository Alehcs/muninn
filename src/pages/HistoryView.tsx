import { useMemo, useState } from "react";
import DailyProgressSummary from "@/features/habits/components/DailyProgressSummary";
import HabitHistoryRow from "@/features/habits/components/HabitHistoryRow";
import { useHabitHistory } from "@/features/habits/hooks/useHabitHistory";
import type { HabitsStore } from "@/features/habits/hooks/useHabits";
import { getLocalDate } from "@/features/habits/utils/date";
import { getDailyProgress, getHabitProgress } from "@/features/habits/utils/progress";

interface HistoryViewProps {
  store: HabitsStore;
}

const inputCls =
  "rounded-lg border border-border bg-bg px-2 py-1 text-sm text-text focus:border-accent";

export default function HistoryView({ store }: HistoryViewProps) {
  const [selectedDate, setSelectedDate] = useState(() => getLocalDate());
  const history = useHabitHistory(selectedDate);
  const { habits } = store;

  const progressItems = useMemo(
    () =>
      habits.map((habit) =>
        getHabitProgress(habit, history.values[habit.id] ?? 0),
      ),
    [habits, history.values],
  );

  const daily = useMemo(
    () => getDailyProgress(habits, history.values),
    [habits, history.values],
  );

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Progreso registrado</h3>
        <label className="flex items-center gap-2 text-xs font-medium text-text-muted">
          Fecha
          <input
            className={inputCls}
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </label>
      </div>

      <DailyProgressSummary
        title="Progreso del día"
        percent={daily.percent}
        completed={daily.completed}
        total={daily.total}
      />

      {history.status === "loading" ? (
        <p className="mt-3 rounded-xl border border-border bg-surface px-6 py-8 text-center text-sm text-text-muted">
          Cargando historial…
        </p>
      ) : history.status === "error" ? (
        <p className="mt-3 rounded-xl border border-border bg-surface px-6 py-8 text-center text-sm text-text-muted">
          No se pudo cargar el historial de esa fecha.
        </p>
      ) : progressItems.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-text-muted">
          No hay hábitos creados todavía.
        </p>
      ) : (
        <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface p-1">
          {progressItems.map((progress) => (
            <HabitHistoryRow key={progress.habit.id} progress={progress} />
          ))}
        </div>
      )}
    </section>
  );
}
