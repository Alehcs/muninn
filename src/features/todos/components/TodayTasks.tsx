import { useNavigation } from "@/app/NavigationContext";
import { useTodoList } from "../hooks/useTodoList";
import { toDateKey } from "../utils/todoDates";
import { filterToday } from "../utils/todoViews";
import TodoList from "./TodoList";
import TodoQuickAdd from "./TodoQuickAdd";

/** Tareas visibles en el panel "Hoy"; el resto se ve en la vista Tareas. */
const MAX_VISIBLE = 6;

/**
 * Bloque "Tareas" del panel "Hoy": vencidas y de hoy, con alta rápida que
 * crea con fecha de hoy y enlace a la vista completa.
 */
export default function TodayTasks() {
  const todo = useTodoList();
  const { navigate } = useNavigation();
  const today = toDateKey(new Date());

  const due = filterToday(todo.items, today);
  const visible = due.slice(0, MAX_VISIBLE);
  const hidden = due.length - visible.length;

  return (
    <section aria-labelledby="today-tasks-heading">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id="today-tasks-heading" className="text-sm font-medium">
          Tareas
          {todo.status === "ready" && due.length > 0 && (
            <span className="ml-1.5 text-xs font-normal tabular-nums text-text-muted">
              {due.length}
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => navigate("todos")}
          className="text-xs text-text-muted transition-colors hover:text-text"
        >
          Ver todas
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface p-1">
        <TodoQuickAdd
          bare
          today={today}
          defaultDueDate={today}
          onAdd={(input) => void todo.createTodo(input)}
          className="border-transparent bg-transparent"
        />
        {todo.status === "error" ? (
          <p className="px-3 py-1.5 text-sm text-text-muted">
            No se pudieron cargar las tareas.
          </p>
        ) : todo.status === "ready" && due.length === 0 ? (
          <p className="px-3 py-1.5 text-sm text-text-muted">Nada para hoy.</p>
        ) : (
          <TodoList store={todo} items={visible} today={today} hideTodayChip />
        )}
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => navigate("todos")}
            className="px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-text"
          >
            y {hidden} más…
          </button>
        )}
      </div>
    </section>
  );
}
