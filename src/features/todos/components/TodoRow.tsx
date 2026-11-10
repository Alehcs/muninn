import { useState } from "react";
import type { ReactNode } from "react";
import { FileText, Pencil, Trash2 } from "lucide-react";
import CompactRow from "@/components/CompactRow";
import IconButton from "@/components/IconButton";
import { pageTitle, type Page } from "@/features/pages/types";
import { cn } from "@/utils/cn";
import type { TodoItem, TodoPriority } from "../types";
import { TodoDueControl, TodoPriorityControl } from "./TodoControls";

interface TodoRowProps {
  item: TodoItem;
  /** Hoy (YYYY-MM-DD). */
  today: string;
  /** Página enlazada, si existe (puede estar en la papelera). */
  page?: Page;
  /** No mostrar el chip de página (ya se está dentro de ella). */
  hidePage?: boolean;
  /** No pintar el chip "Hoy" (el panel "Hoy" ya lo dice todo); sigue editable al pasar el cursor. */
  hideTodayChip?: boolean;
  onToggle: () => void;
  onChangeDue: (value: string | null) => void;
  onChangePriority: (value: TodoPriority) => void;
  onOpenPage?: (pageId: string) => void;
  /** Sin `onEdit` / `onDelete` la fila no muestra esas acciones. */
  onEdit?: () => void;
  onDelete?: () => void;
  /** Asa de arrastre que entrega `SortableList`. */
  handle?: ReactNode;
}

/**
 * Fila compacta de una tarea: casilla, título, chips de fecha y página,
 * marca de prioridad. Fecha y prioridad se editan en línea; Editar/Eliminar
 * aparecen al pasar el cursor. Las notas están en el detalle desplegable.
 */
export default function TodoRow({
  item,
  today,
  page,
  hidePage,
  hideTodayChip,
  onToggle,
  onChangeDue,
  onChangePriority,
  onOpenPage,
  onEdit,
  onDelete,
  handle,
}: TodoRowProps) {
  const [expanded, setExpanded] = useState(false);
  const inTrash = page !== undefined && page.deletedAt !== null;
  const showDueChip =
    item.dueDate !== undefined && !(hideTodayChip && item.dueDate === today);
  const showPage = !hidePage && page !== undefined && onOpenPage !== undefined;

  return (
    <CompactRow
      handle={handle}
      dimmed={item.completed}
      expanded={expanded}
      onToggleExpanded={() => setExpanded((current) => !current)}
      expandLabel={`${expanded ? "Ocultar" : "Mostrar"} notas de ${item.title}`}
      leading={
        <input
          type="checkbox"
          checked={item.completed}
          onChange={onToggle}
          className="h-4 w-4 shrink-0 accent-accent"
          aria-label={`Marcar ${item.title}`}
        />
      }
      trailing={
        <>
          {showPage && (
            <button
              type="button"
              onClick={() => onOpenPage(page.id)}
              title={
                inTrash
                  ? `${pageTitle(page)} (en la papelera)`
                  : `Abrir la página ${pageTitle(page)}`
              }
              className={cn(
                "inline-flex min-w-0 max-w-36 shrink items-center gap-1 rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-muted transition-colors hover:text-text group-hover:bg-border/60",
                inTrash && "opacity-50",
              )}
            >
              <FileText size={11} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
              <span className="truncate">{pageTitle(page)}</span>
            </button>
          )}
          {showDueChip && (
            <TodoDueControl
              value={item.dueDate}
              onChange={onChangeDue}
              today={today}
              mode="chip"
              subject={item.title}
            />
          )}
          {item.priority > 0 && (
            <TodoPriorityControl
              value={item.priority}
              onChange={onChangePriority}
              mode="mark"
              subject={item.title}
            />
          )}
        </>
      }
      actions={
        <>
          {!showDueChip && (
            <TodoDueControl
              value={item.dueDate}
              onChange={onChangeDue}
              today={today}
              mode="icon"
              subject={item.title}
            />
          )}
          {item.priority === 0 && (
            <TodoPriorityControl
              value={0}
              onChange={onChangePriority}
              mode="icon"
              subject={item.title}
            />
          )}
          {onEdit && (
            <IconButton icon={Pencil} label={`Editar ${item.title}`} onClick={onEdit} />
          )}
          {onDelete && (
            <IconButton
              icon={Trash2}
              label={`Eliminar ${item.title}`}
              tone="danger"
              onClick={onDelete}
            />
          )}
        </>
      }
      details={
        item.notes ? (
          <p className="whitespace-pre-wrap break-words rounded-lg bg-bg px-3 py-2 text-text-muted">
            {item.notes}
          </p>
        ) : (
          <p className="text-text-muted">
            Sin notas.{onEdit ? " Usa Editar para añadirlas." : ""}
          </p>
        )
      }
    >
      <span
        className={cn(
          "min-w-0 truncate text-sm",
          item.completed && "text-text-muted line-through",
        )}
        title={item.title}
      >
        {item.title}
      </span>
    </CompactRow>
  );
}
