import { cn } from "@/utils/cn";
import type { usePomodoroTimer } from "@/features/study/hooks/usePomodoroTimer";
import type { PomodoroConfig } from "@/features/study/utils/pomodoroPresets";
import {
  formatStudyMinutes,
  formatTimer,
} from "@/features/study/utils/formatTimer";
import PomodoroControls from "./PomodoroControls";

type PomodoroTimer = ReturnType<typeof usePomodoroTimer>;

interface PomodoroPanelProps {
  timer: PomodoroTimer;
  selectedConfig: PomodoroConfig;
}

function getSessionCopy(timer: PomodoroTimer): string {
  if (timer.status === "finished") return "Sesión completa. Buen trabajo.";
  if (timer.status === "paused") return "Pausa sostenida, sin perder el hilo.";
  if (timer.phase === "break" && timer.status === "running") {
    return "Suelta los hombros y vuelve con aire fresco.";
  }
  return "Respira, enfócate y avanza un poco más.";
}

export default function PomodoroPanel({
  timer,
  selectedConfig,
}: PomodoroPanelProps) {
  const activeConfig = timer.activeConfig ?? selectedConfig;
  const idle = timer.status === "idle";
  const remainingMs = idle
    ? activeConfig.focusMinutes * 60_000
    : timer.remainingMs;
  const currentCycle = idle ? 0 : timer.currentCycle;
  const totalCycles = idle ? activeConfig.cycles : timer.totalCycles;
  const plannedFocusMinutes = idle
    ? activeConfig.focusMinutes * activeConfig.cycles
    : timer.plannedFocusMinutes;
  const progressPercent = idle ? 0 : timer.progressPercent;
  const progressColor =
    timer.phase === "break" && timer.status !== "finished"
      ? "bg-success"
      : "bg-accent";

  return (
    <section
      className={cn(
        "rounded-xl border bg-surface p-6",
        timer.status === "finished"
          ? "border-success/60"
          : timer.phase === "break" && !idle
            ? "border-success/50"
            : "border-accent/50",
      )}
    >
      <div className="text-center">
        <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-bg px-3 py-1 text-xs font-medium text-text-muted">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              timer.phase === "break" && timer.status !== "finished"
                ? "bg-success"
                : "bg-accent",
            )}
          />
          {timer.displayStatus}
        </div>

        <p className="mt-5 text-sm text-text-muted">{getSessionCopy(timer)}</p>
        <p className="mt-4 text-7xl font-semibold tracking-normal text-text">
          {formatTimer(remainingMs)}
        </p>

        <div className="mx-auto mt-5 max-w-xl">
          <div className="flex items-center justify-between text-xs font-medium text-text-muted">
            <span>Progreso del ciclo</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="mt-2 h-3 w-full rounded-full bg-surface-hover">
            <div
              className={cn("h-full rounded-full transition-all", progressColor)}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-text-muted">Ciclo</p>
            <p className="mt-1 font-semibold">
              {currentCycle} / {totalCycles}
            </p>
          </div>
          <div>
            <p className="text-text-muted">Enfoque planificado</p>
            <p className="mt-1 font-semibold">
              {formatStudyMinutes(plannedFocusMinutes)}
            </p>
          </div>
          <div>
            <p className="text-text-muted">Descanso</p>
            <p className="mt-1 font-semibold">
              {formatStudyMinutes(activeConfig.breakMinutes)}
            </p>
          </div>
        </div>

        <div className="mt-7">
          <PomodoroControls
            status={timer.status}
            canStart={timer.canStart}
            canPause={timer.canPause}
            canResume={timer.canResume}
            canSkipBreak={timer.canSkipBreak}
            canCancel={timer.canCancel}
            canRestart={timer.canRestart}
            onStart={() => timer.start(selectedConfig)}
            onPause={timer.pause}
            onResume={timer.resume}
            onSkipBreak={timer.skipBreak}
            onCancel={timer.cancel}
            onRestart={timer.restart}
          />
        </div>

        {timer.summary && (
          <div className="mt-8 border-t border-border pt-5">
            <h3 className="text-sm font-semibold">Resumen de la sesión</h3>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-text-muted">Ciclos completados</p>
                <p className="mt-1 font-semibold">
                  {timer.summary.cyclesCompleted}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Enfoque completado</p>
                <p className="mt-1 font-semibold">
                  {formatStudyMinutes(timer.summary.focusCompletedMinutes)}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Descansos completados</p>
                <p className="mt-1 font-semibold">
                  {timer.summary.breaksCompleted}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
