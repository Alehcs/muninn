import { ChevronRight } from "lucide-react";
import { usePersistentState } from "@/lib/usePersistentState";
import { cn } from "@/utils/cn";
import { useTodoList } from "../hooks/useTodoList";
import { toDateKey } from "../utils/todoDates";
import { filterCompleted, filterPending } from "../utils/todoViews";
import TodoList from "./TodoList";
import TodoQuickAdd from "./TodoQuickAdd";

const OPEN_KEY = "aurhabits.pageTasks.open";
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

/**
 * Bloque "Tareas" de una página (las páginas hacen de proyecto): las tareas
 * enlazadas a ella, con alta rápida y las mismas filas compactas. Sin tareas
 * se reduce a una línea para añadir la primera. Plegable; recuerda su estado.
 */
export default function PageTasks({ pageId }: { pageId: string }) {
  const todo = useTodoList();
  const [open, setOpen] = usePersistentState(OPEN_KEY, true, isBoolean);
  const today = toDateKey(new Date());

  if (todo.status !== "ready") return null;

  const linked = todo.items.filter((item) => item.pageId === pageId);
  const pending = filterPending(linked);
  const completed = filterCompleted(linked);

  const empty = linked.length === 0;

  // El alta rápida ocupa siempre el mismo sitio del árbol: al crear la primera
  // tarea el campo no se vuelve a montar y conserva el foco para la siguiente.
  return (
    <section
      aria-label="Tareas de la página"
      className={cn("mt-10", !empty && "border-t border-border pt-3")}
    >
      {!empty && (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="mb-1 flex items-center gap-1 rounded-md px-1 py-0.5 text-sm font-medium text-text-muted hover:text-text"
        >
          <ChevronRight
            size={14}
            strokeWidth={2}
            aria-hidden="true"
            className={cn("transition-transform", open && "rotate-90")}
          />
          Tareas
          <span className="ml-1 text-xs font-normal tabular-nums">
            {pending.length} pendientes
            {completed.length > 0 ? ` · ${completed.length} hechas` : ""}
          </span>
        </button>
      )}

      {!empty && open && (
        <div className="mb-2">
          <TodoList store={todo} items={pending} today={today} sortable hidePage />
          {completed.length > 0 && (
            <TodoList store={todo} items={completed} today={today} hidePage />
          )}
        </div>
      )}

      {(empty || open) && (
        <TodoQuickAdd
          today={today}
          pageId={pageId}
          bare={empty}
          placeholder="Añadir tarea a esta página"
          onAdd={(input) => void todo.createTodo(input)}
          className={empty ? "border-transparent bg-transparent" : undefined}
        />
      )}
    </section>
  );
}
