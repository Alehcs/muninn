import { Check, Minus, Play, Plus, RotateCcw } from "lucide-react";
import CompactRow from "@/components/CompactRow";
import IconButton from "@/components/IconButton";
import RowMenu from "@/components/RowMenu";
import { cn } from "@/utils/cn";
import type { HabitProgress } from "../types";

export interface HabitRowProps {
  progress: HabitProgress;
  /** check: marca/desmarca (también al hacer clic en toda la fila). */
  onToggleCheck: () => void;
  /** count: + y − (el − no baja de 0). */
  onIncrement: () => void;
  onDecrement: () => void;
  /** duration: +15 / +30. */
  onAddMinutes: (minutes: number) => void;
  onReset: () => void;
  /** duration: inicia el timer con los minutos elegidos en el menú. */
  onStartTimer?: (minutes: number) => void;
  timerDisabled?: boolean;
}

export const TIMER_OPTIONS = [15, 30, 45, 60];

const stepBtn =
  "rounded-md border border-border px-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-border/60 hover:text-text h-7 min-w-9";

/** Indicador de estado para count/duration (en check va la casilla). */
function StatusDot({ completed }: { completed: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
        completed
          ? "border-success bg-success text-bg"
          : "border-border text-transparent",
      )}
    >
      <Check size={11} strokeWidth={3} />
    </span>
  );
}

/**
 * Fila compacta de un hábito del día (check, count o duration), pensada para
 * apilarse en un panel con `divide-y`. La reutiliza la vista "Hoy".
 */
export default function HabitRow({
  progress,
  onToggleCheck,
  onIncrement,
  onDecrement,
  onAddMinutes,
  onReset,
  onStartTimer,
  timerDisabled = false,
}: HabitRowProps) {
  const { habit, value, percent, status } = progress;
  const completed = status === "completed";

  return (
    <CompactRow
      progress={percent}
      progressTone={completed ? "success" : "accent"}
      onActivate={habit.type === "check" ? onToggleCheck : undefined}
      leading={
        habit.type === "check" ? (
          <input
            type="checkbox"
            checked={value > 0}
            onChange={onToggleCheck}
            className="h-4 w-4 shrink-0 accent-success"
            aria-label={`Marcar ${habit.name}`}
          />
        ) : (
          <StatusDot completed={completed} />
        )
      }
      trailing={
        habit.type === "check" ? undefined : (
          <div className="flex shrink-0 items-center gap-1.5">
            {habit.type === "count" ? (
              <>
                <IconButton
                  icon={Minus}
                  label={`Restar uno a ${habit.name}`}
                  disabled={value <= 0}
                  onClick={onDecrement}
                  className="border border-border"
                />
                <span className="min-w-14 text-center text-sm tabular-nums text-text-muted">
                  {value} / {habit.target}
                </span>
                <IconButton
                  icon={Plus}
                  label={`Sumar uno a ${habit.name}`}
                  onClick={onIncrement}
                  className="border border-border"
                />
              </>
            ) : (
              <>
                <span className="mr-1 text-sm tabular-nums text-text-muted">
                  {value} / {habit.target} min
                </span>
                <button
                  type="button"
                  className={stepBtn}
                  onClick={() => onAddMinutes(15)}
                  aria-label={`Sumar 15 minutos a ${habit.name}`}
                >
                  +15
                </button>
                <button
                  type="button"
                  className={stepBtn}
                  onClick={() => onAddMinutes(30)}
                  aria-label={`Sumar 30 minutos a ${habit.name}`}
                >
                  +30
                </button>
                {onStartTimer && (
                  <RowMenu
                    icon={Play}
                    label={`Iniciar timer de ${habit.name}`}
                    disabled={timerDisabled}
                    items={TIMER_OPTIONS.map((minutes) => ({
                      label: `${minutes} min`,
                      onSelect: () => onStartTimer(minutes),
                    }))}
                  />
                )}
              </>
            )}
          </div>
        )
      }
      actions={
        <RowMenu
          label={`Más acciones de ${habit.name}`}
          items={[
            {
              label: "Reiniciar",
              icon: RotateCcw,
              onSelect: onReset,
              disabled: value <= 0,
            },
          ]}
        />
      }
    >
      <span
        className={cn(
          "min-w-0 truncate text-sm font-medium",
          completed && "font-normal text-text-muted line-through decoration-text-muted/50",
        )}
      >
        {habit.name}
      </span>
    </CompactRow>
  );
}
