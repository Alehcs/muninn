import { Pause, Timer } from "lucide-react";
import { usePomodoro } from "@/features/study/PomodoroContext";
import { formatTimer } from "@/features/study/utils/formatTimer";
import { useHabitTimerContext } from "@/features/timer/HabitTimerContext";
import { useNavigation } from "@/app/NavigationContext";
import type { View } from "@/app/navigation";

interface Chip {
  key: string;
  view: View;
  paused: boolean;
  time: string;
  name: string;
  title: string;
}

const CHIP_CLS =
  "flex h-8 w-full items-center gap-2 rounded-md bg-surface-hover px-2.5 text-left text-sm text-text transition-colors hover:bg-border";

/**
 * Indicador compacto en la barra lateral de los timers en marcha o en pausa
 * (pomodoro y timer de hábito). Al pulsarlo lleva a su vista.
 */
export default function ActiveTimerIndicator() {
  const { navigate: onNavigate } = useNavigation();
  const { timer: pomodoro } = usePomodoro();
  const { activeTimer: habitTimer } = useHabitTimerContext();

  const chips: Chip[] = [];

  if (pomodoro.status === "running" || pomodoro.status === "paused") {
    const name =
      pomodoro.status === "paused"
        ? "Enfoque (pausa)"
        : pomodoro.phase === "break"
          ? "Descanso"
          : `Enfoque ${pomodoro.currentCycle}/${pomodoro.totalCycles}`;
    chips.push({
      key: "pomodoro",
      view: "study",
      paused: pomodoro.status === "paused",
      time: formatTimer(pomodoro.remainingMs),
      name,
      title: "Ir a Enfoque",
    });
  }

  if (habitTimer !== null) {
    chips.push({
      key: "habit",
      view: "today",
      paused: habitTimer.status === "paused",
      time: formatTimer(habitTimer.remainingMs),
      name: habitTimer.habitName,
      title: "Ir a Hoy",
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onNavigate(chip.view)}
          title={chip.title}
          aria-label={`${chip.name}, ${chip.time}${chip.paused ? ", en pausa" : ""}. ${chip.title}`}
          className={CHIP_CLS}
        >
          {chip.paused ? (
            <Pause size={16} strokeWidth={1.5} className="shrink-0 text-text-muted" aria-hidden="true" />
          ) : (
            <Timer size={16} strokeWidth={1.5} className="shrink-0 text-accent" aria-hidden="true" />
          )}
          <span className="tabular-nums">{chip.time}</span>
          <span className="min-w-0 flex-1 truncate text-text-muted">
            {chip.name}
          </span>
        </button>
      ))}
    </div>
  );
}
