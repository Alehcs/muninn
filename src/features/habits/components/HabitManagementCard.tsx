import Button from "@/components/Button";
import { cn } from "@/utils/cn";
import type { Habit, HabitType } from "../types";

interface HabitManagementCardProps {
  habit: Habit;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

const TYPE_LABELS: Record<HabitType, string> = {
  check: "Una vez",
  count: "Conteo",
  duration: "Duración",
};

export default function HabitManagementCard({
  habit,
  onEdit,
  onToggleActive,
  onDelete,
}: HabitManagementCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-5",
        !habit.active && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2">
        <p className="font-medium">{habit.name}</p>
        {!habit.active && (
          <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-muted">
            Pausado
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-text-muted">
        {TYPE_LABELS[habit.type]} · objetivo {habit.target} {habit.unit}
        {habit.category ? ` · ${habit.category}` : ""}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="ghost" onClick={onEdit}>
          Editar
        </Button>
        <Button variant="ghost" onClick={onToggleActive}>
          {habit.active ? "Pausar" : "Activar"}
        </Button>
        <Button variant="ghost" onClick={onDelete}>
          Eliminar
        </Button>
      </div>
    </div>
  );
}
