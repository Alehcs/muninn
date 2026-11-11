import DailyProgressSummary from "@/features/habits/components/DailyProgressSummary";
import HabitRow from "@/features/habits/components/HabitRow";
import type { HabitsStore } from "@/features/habits/hooks/useHabits";
import TodayPages from "@/features/pages/components/TodayPages";
import TodayTasks from "@/features/todos/components/TodayTasks";
import HabitTimerPanel from "@/features/timer/components/HabitTimerPanel";
import { useHabitTimerContext } from "@/features/timer/HabitTimerContext";
import { Page } from "@/components/PageHeader";
import { useToday } from "@/lib/useToday";
import { parseDateKey } from "@/features/todos/utils/todoDates";

interface TodayViewProps {
  store: HabitsStore;
}

/**
 * Inicio de la app. Dos columnas (se apilan por debajo de 900 px):
 * hábitos de hoy a la izquierda; tareas y páginas a la derecha.
 */
export default function TodayView({ store }: TodayViewProps) {
  const {
    todayHabits,
    daily,
    toggleCheck,
    increment,
    decrement,
    addMinutes,
    reset,
  } = store;
  const timer = useHabitTimerContext();
  const todayKey = useToday();
  const today = (parseDateKey(todayKey) ?? new Date()).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Page
      title="Hoy"
      subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
      width="5xl"
    >
      <div className="grid items-start gap-6 min-[900px]:grid-cols-2">
        <section aria-labelledby="today-habits-heading">
          <h2 id="today-habits-heading" className="mb-2 text-sm font-medium">
            Hábitos de hoy
          </h2>

          <DailyProgressSummary
            percent={daily.percent}
            completed={daily.completed}
            total={daily.total}
            title="Progreso"
          />

          <HabitTimerPanel
            timer={timer.activeTimer}
            message={timer.message}
            onPause={timer.pauseTimer}
            onResume={timer.resumeTimer}
            onCancel={timer.cancelTimer}
            onFinish={timer.finishTimer}
          />

          {todayHabits.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">
              No hay hábitos activos. Actívalos desde "Hábitos".
            </p>
          ) : (
            <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface p-1">
              {todayHabits.map((progress) => (
                <HabitRow
                  key={progress.habit.id}
                  progress={progress}
                  onToggleCheck={() => toggleCheck(progress.habit.id)}
                  onIncrement={() => increment(progress.habit.id)}
                  onDecrement={() => decrement(progress.habit.id)}
                  onAddMinutes={(minutes) =>
                    addMinutes(progress.habit.id, minutes)
                  }
                  onReset={() => reset(progress.habit.id)}
                  onStartTimer={
                    progress.habit.type === "duration"
                      ? (minutes) => timer.startTimer(progress.habit, minutes)
                      : undefined
                  }
                  timerDisabled={!timer.canStartTimer(progress.habit.id)}
                />
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-col gap-6">
          <TodayTasks />
          <TodayPages />
        </div>
      </div>
    </Page>
  );
}
