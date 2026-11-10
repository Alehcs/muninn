import Button from "@/components/Button";
import { cn } from "@/utils/cn";
import type { TodoItem } from "../types";

interface TodoItemRowProps {
  item: TodoItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function TodoItemRow({
  item,
  onToggle,
  onEdit,
  onDelete,
}: TodoItemRowProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex gap-3">
        <input
          type="checkbox"
          checked={item.completed}
          onChange={onToggle}
          className="mt-1 h-4 w-4 accent-accent"
          aria-label={`Marcar ${item.title}`}
        />

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "break-words font-medium",
              item.completed && "text-text-muted line-through",
            )}
          >
            {item.title}
          </p>

          {item.notes && (
            <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-bg px-3 py-2 text-sm text-text-muted">
              {item.notes}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 pl-7">
        <Button variant="ghost" onClick={onEdit} className="px-2 py-1 text-xs">
          Editar
        </Button>
        <Button variant="ghost" onClick={onDelete} className="px-2 py-1 text-xs">
          Eliminar
        </Button>
      </div>
    </div>
  );
}
