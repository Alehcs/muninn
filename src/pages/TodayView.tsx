import DailyProgressSummary from "@/features/habits/components/DailyProgressSummary";
import HabitRow from "@/features/habits/components/HabitRow";
import type { HabitsStore } from "@/features/habits/hooks/useHabits";
import HabitTimerPanel from "@/features/timer/components/HabitTimerPanel";
import { useHabitTimerContext } from "@/features/timer/HabitTimerContext";
import { Page } from "@/components/PageHeader";

interface TodayViewProps {
  store: HabitsStore;
}

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
  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Page
      title="Hoy"
      subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
      width="2xl"
    >
      <DailyProgressSummary
        percent={daily.percent}
        completed={daily.completed}
        total={daily.total}
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
        <p className="mt-3 rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-text-muted">
          No hay hábitos activos. Crea o activa hábitos desde la sección
          "Hábitos".
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
    </Page>
  );
}
