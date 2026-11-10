import { useState } from "react";
import Button from "@/components/Button";
import { Page, PageStrip } from "@/components/PageHeader";
import { confirm } from "@/lib/confirm";
import TodoItemForm from "./TodoItemForm";
import TodoItemRow from "./TodoItemRow";
import { useTodoList } from "../hooks/useTodoList";
import type { TodoInput, TodoItem } from "../types";

type FormState = { open: false } | { open: true; item?: TodoItem };

export default function TodoListView() {
  const todo = useTodoList();
  const [form, setForm] = useState<FormState>({ open: false });

  const handleSubmit = (values: TodoInput) => {
    if (!form.open) return;

    if (form.item) {
      void todo.updateTodo(form.item.id, values);
    } else {
      void todo.createTodo(values);
    }
    setForm({ open: false });
  };

  const handleDelete = async (item: TodoItem) => {
    const ok = await confirm({
      title: "Eliminar tarea",
      message: `¿Eliminar la tarea "${item.title}"?`,
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    setForm({ open: false });
    void todo.deleteTodo(item.id);
  };

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

  return (
    <Page
      title="Tareas"
      primaryAction={{
        label: "Nueva tarea",
        onClick: () => setForm({ open: true }),
        hidden: form.open,
      }}
    >
      <PageStrip>
        <p className="text-sm text-text-muted">
          <span className="text-lg font-semibold text-text">{todo.percent}%</span>{" "}
          · {todo.completed}/{todo.total} tareas
        </p>
        <div
          className="h-2 min-w-32 flex-1 overflow-hidden rounded-full bg-surface-hover"
          role="progressbar"
          aria-label="Progreso de tareas"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={todo.percent}
        >
          <div
            className="h-full rounded-full bg-success"
            style={{ width: `${todo.percent}%` }}
          />
        </div>
      </PageStrip>

      {form.open && (
        <div className="mb-5">
          <TodoItemForm
            initial={form.item}
            onSubmit={handleSubmit}
            onCancel={() => setForm({ open: false })}
          />
        </div>
      )}

      {todo.items.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-medium">Sin tareas todavía</h3>
          <p className="mt-1 text-sm text-text-muted">
            Crea una tarea nueva cuando algo no pertenezca a hábitos ni listas.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {todo.items.map((item) => (
            <TodoItemRow
              key={item.id}
              item={item}
              onToggle={() => void todo.toggleTodo(item.id)}
              onEdit={() => setForm({ open: true, item })}
              onDelete={() => void handleDelete(item)}
            />
          ))}
        </div>
      )}
    </Page>
  );
}
