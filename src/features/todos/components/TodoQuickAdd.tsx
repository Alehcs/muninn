import { useEffect, useState } from "react";
import type { Ref } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/utils/cn";
import type { TodoInput, TodoPriority } from "../types";
import { TodoDueControl, TodoPriorityControl } from "./TodoControls";

interface TodoQuickAddProps {
  onAdd: (input: TodoInput) => void;
  /** Hoy (YYYY-MM-DD), para los atajos de fecha. */
  today: string;
  /** Fecha con la que nace cada tarea (p. ej. hoy en la pestaña "Hoy"). */
  defaultDueDate?: string;
  /** Página a la que se enlazan las tareas nuevas. */
  pageId?: string;
  placeholder?: string;
  /** Sin controles de fecha y prioridad (panel "Hoy"). */
  bare?: boolean;
  /** Campo de texto, para llevarle el foco desde fuera (Cmd/Ctrl+N). */
  inputRef?: Ref<HTMLInputElement>;
  /** Sin borde de caja: para integrarlo en una línea discreta. */
  className?: string;
}

/**
 * Alta rápida de tareas: Enter crea y deja el foco para la siguiente; Escape
 * vacía el campo. A la derecha, fecha y prioridad opcionales de la tarea que
 * se está escribiendo.
 */
export default function TodoQuickAdd({
  onAdd,
  today,
  defaultDueDate,
  pageId,
  placeholder = "Añadir tarea…",
  bare,
  inputRef,
  className,
}: TodoQuickAddProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState<string | undefined>(defaultDueDate);
  const [priority, setPriority] = useState<TodoPriority>(0);

  // Al cambiar de pestaña cambia la fecha con la que nacen las tareas.
  useEffect(() => {
    setDueDate(defaultDueDate);
  }, [defaultDueDate]);

  const submit = () => {
    const trimmed = title.trim();
    if (trimmed.length === 0) return;
    onAdd({
      title: trimmed,
      dueDate: dueDate ?? null,
      priority,
      pageId: pageId ?? null,
    });
    setTitle("");
    setPriority(0);
    setDueDate(defaultDueDate);
  };

  return (
    <div
      className={cn(
        "flex h-9 items-center gap-2 rounded-lg border border-border bg-surface pl-3 pr-1 text-text-muted focus-within:border-accent focus-within:text-text",
        className,
      )}
    >
      <Plus size={15} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
      <input
        ref={inputRef}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          } else if (event.key === "Escape" && title.length > 0) {
            event.preventDefault();
            event.stopPropagation();
            setTitle("");
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder.replace(/…$/, "")}
        className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
      />
      {!bare && (
        <>
          <TodoDueControl
            value={dueDate}
            onChange={(value) => setDueDate(value ?? undefined)}
            today={today}
            mode={dueDate ? "chip" : "icon"}
            subject="la tarea nueva"
          />
          <TodoPriorityControl
            value={priority}
            onChange={setPriority}
            mode={priority > 0 ? "mark" : "icon"}
            subject="la tarea nueva"
          />
        </>
      )}
    </div>
  );
}
