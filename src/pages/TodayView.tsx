import DailyProgressSummary from "@/features/habits/components/DailyProgressSummary";
import HabitCard from "@/features/habits/components/HabitCard";
import type { HabitsStore } from "@/features/habits/hooks/useHabits";
import HabitTimerPanel from "@/features/timer/components/HabitTimerPanel";
import { useHabitTimer } from "@/features/timer/hooks/useHabitTimer";

interface TodayViewProps {
  store: HabitsStore;
}

export default function TodayView({ store }: TodayViewProps) {
  const { todayHabits, daily, toggleCheck, increment, addMinutes, reset } =
    store;
  const timer = useHabitTimer({ onComplete: addMinutes });

  return (
    <section className="mx-auto max-w-2xl">
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

      <h2 className="mt-8 mb-3 text-lg font-semibold">Tus hábitos de hoy</h2>
      {todayHabits.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-text-muted">
          No hay hábitos activos. Crea o activa hábitos desde la sección
          "Hábitos".
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {todayHabits.map((progress) => (
            <HabitCard
              key={progress.habit.id}
              progress={progress}
              onToggleCheck={() => toggleCheck(progress.habit.id)}
              onIncrement={() => increment(progress.habit.id)}
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
  );
}
