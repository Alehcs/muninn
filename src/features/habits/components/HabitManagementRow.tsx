import { Pause, Pencil, Play, Trash2 } from "lucide-react";
import CompactRow from "@/components/CompactRow";
import IconButton from "@/components/IconButton";
import { cn } from "@/utils/cn";
import type { Habit, HabitType } from "../types";

interface HabitManagementRowProps {
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

/** Fila compacta de gestión: nombre, tipo · objetivo · categoría y acciones por icono. */
export default function HabitManagementRow({
  habit,
  onEdit,
  onToggleActive,
  onDelete,
}: HabitManagementRowProps) {
  return (
    <CompactRow
      dimmed={!habit.active}
      actions={
        <>
          <IconButton icon={Pencil} label={`Editar ${habit.name}`} onClick={onEdit} />
          <IconButton
            icon={habit.active ? Pause : Play}
            label={`${habit.active ? "Pausar" : "Activar"} ${habit.name}`}
            onClick={onToggleActive}
          />
          <IconButton
            icon={Trash2}
            tone="danger"
            label={`Eliminar ${habit.name}`}
            onClick={onDelete}
          />
        </>
      }
      trailing={
        !habit.active ? (
          <span className="shrink-0 rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-muted">
            Pausado
          </span>
        ) : undefined
      }
    >
      <span className="shrink-0 text-sm font-medium">{habit.name}</span>
      <span
        className={cn("min-w-0 truncate text-xs text-text-muted")}
        title={`${TYPE_LABELS[habit.type]} · objetivo ${habit.target} ${habit.unit}${habit.category ? ` · ${habit.category}` : ""}`}
      >
        {TYPE_LABELS[habit.type]} · objetivo {habit.target} {habit.unit}
        {habit.category ? ` · ${habit.category}` : ""}
      </span>
    </CompactRow>
  );
}
