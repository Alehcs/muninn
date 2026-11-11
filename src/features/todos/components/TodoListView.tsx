import { useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import { Page } from "@/components/PageHeader";
import Tabs, { TabPanel, type TabItem } from "@/components/Tabs";
import { consumeTaskFocus } from "@/lib/commandPalette";
import { usePrimaryAction } from "@/lib/usePrimaryAction";
import { useTodoList } from "../hooks/useTodoList";
import { useToday } from "@/lib/useToday";
import { groupByDay } from "../utils/todoDates";
import { filterForTab, tabCounts, type TodoTab } from "../utils/todoViews";
import TodoList from "./TodoList";
import TodoQuickAdd from "./TodoQuickAdd";

const ID_PREFIX = "todos";

const EMPTY_MESSAGES: Record<TodoTab, string> = {
  pending: "Sin tareas pendientes.",
  today: "Nada vence hoy ni está vencido.",
  upcoming: "No hay tareas con fecha futura.",
  completed: "Aún no has completado ninguna tarea.",
};

export default function TodoListView() {
  const todo = useTodoList();
  const [tab, setTab] = useState<TodoTab>("pending");
  const quickAddRef = useRef<HTMLInputElement>(null);
  const today = useToday();

  // Cmd/Ctrl+N: foco en el campo de alta rápida.
  usePrimaryAction(() => quickAddRef.current?.focus());

  // "Nueva tarea" desde la paleta de búsqueda: al cargar, foco en el alta rápida.
  const ready = todo.status === "ready";
  useEffect(() => {
    if (ready && consumeTaskFocus()) quickAddRef.current?.focus();
  }, [ready]);

  if (todo.status === "loading") {
    return (
      <Page title="Tareas">
        <p className="text-sm text-text-muted">Cargando tareas…</p>
      </Page>
    );
  }

  if (todo.status === "error") {
    return (
      <Page title="Tareas">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-semibold">No se pudieron cargar las tareas</h2>
          <p className="mt-1 text-sm text-text-muted">
            Cierra y vuelve a abrir la app. Tus datos siguen siendo locales.
          </p>
          <Button className="mt-4" variant="ghost" onClick={() => void todo.reload()}>
            Reintentar
          </Button>
        </div>
      </Page>
    );
  }

  const counts = tabCounts(todo.items, today);
  const tabs: TabItem<TodoTab>[] = [
    { id: "pending", label: "Pendientes", count: counts.pending },
    { id: "today", label: "Hoy", count: counts.today },
    { id: "upcoming", label: "Próximas", count: counts.upcoming },
    { id: "completed", label: "Completadas", count: counts.completed },
  ];
  const items = filterForTab(todo.items, tab, today);

  return (
    <Page
      title="Tareas"
      toolbar={
        <Tabs
          tabs={tabs}
          value={tab}
          onChange={setTab}
          label="Filtros de tareas"
          idPrefix={ID_PREFIX}
        />
      }
    >
      <TodoQuickAdd
        inputRef={quickAddRef}
        today={today}
        defaultDueDate={tab === "today" ? today : undefined}
        onAdd={(input) => void todo.createTodo(input)}
      />

      <TabPanel idPrefix={ID_PREFIX} id={tab} className="mt-3">
        {items.length === 0 ? (
          <p className="px-2 text-sm text-text-muted">{EMPTY_MESSAGES[tab]}</p>
        ) : tab === "upcoming" ? (
          <div className="flex flex-col gap-3">
            {groupByDay(items, today).map((group) => (
              <section key={group.date} aria-label={group.label}>
                <h2 className="px-2 pb-1 text-xs font-medium text-text-muted">
                  {group.label}
                </h2>
                <TodoList store={todo} items={group.items} today={today} />
              </section>
            ))}
          </div>
        ) : (
          <TodoList
            store={todo}
            items={items}
            today={today}
            sortable={tab === "pending"}
          />
        )}
      </TabPanel>
    </Page>
  );
}
