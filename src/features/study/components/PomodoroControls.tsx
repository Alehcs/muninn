import Button from "@/components/Button";
import type { PomodoroStatus } from "@/features/study/hooks/usePomodoroTimer";

interface PomodoroControlsProps {
  status: PomodoroStatus;
  canStart: boolean;
  canPause: boolean;
  canResume: boolean;
  canSkipBreak: boolean;
  canCancel: boolean;
  canRestart: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkipBreak: () => void;
  onCancel: () => void;
  onRestart: () => void;
}

export default function PomodoroControls({
  status,
  canStart,
  canPause,
  canResume,
  canSkipBreak,
  canCancel,
  canRestart,
  onStart,
  onPause,
  onResume,
  onSkipBreak,
  onCancel,
  onRestart,
}: PomodoroControlsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {canStart && (
        <Button onClick={onStart}>
          {status === "finished" ? "Iniciar otra vez" : "Iniciar"}
        </Button>
      )}

      {canPause && (
        <Button variant="ghost" onClick={onPause}>
          Pausar
        </Button>
      )}

      {canResume && (
        <Button onClick={onResume}>
          Reanudar
        </Button>
      )}

      <Button
        variant="ghost"
        onClick={onSkipBreak}
        disabled={!canSkipBreak}
      >
        Saltar descanso
      </Button>

      {canCancel && (
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      )}

      {canRestart && (
        <Button variant="ghost" onClick={onRestart}>
          Reiniciar
        </Button>
      )}
    </div>
  );
}
