import { useState } from "react";
import Button from "@/components/Button";
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

  const handleDelete = (item: TodoItem) => {
    const ok = window.confirm(`Eliminar la tarea "${item.title}"?`);
    if (!ok) return;
    setForm({ open: false });
    void todo.deleteTodo(item.id);
  };

  if (todo.status === "loading") {
    return (
      <section className="mx-auto max-w-3xl">
        <p className="text-sm text-text-muted">Cargando tareas…</p>
      </section>
    );
  }

  if (todo.status === "error") {
    return (
      <section className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-semibold">No se pudo cargar TODO</h2>
          <p className="mt-1 text-sm text-text-muted">
            Cierra y vuelve a abrir la app. Tus datos siguen siendo locales.
          </p>
          <Button className="mt-4" variant="ghost" onClick={() => void todo.reload()}>
            Reintentar
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl">
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-text-muted">TODO</p>
            <h2 className="mt-1 text-2xl font-semibold">Lista de tareas</h2>
            <p className="mt-2 max-w-2xl text-sm text-text-muted">
              Cosas sueltas que necesitan una casa temporal.
            </p>
          </div>

          {!form.open && (
            <Button onClick={() => setForm({ open: true })}>
              Nueva tarea
            </Button>
          )}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
          <div>
            <p className="text-3xl font-semibold">{todo.percent}%</p>
            <p className="mt-1 text-sm text-text-muted">
              {todo.completed}/{todo.total} tareas
            </p>
          </div>

          <div className="flex min-h-16 flex-col justify-center">
            <div className="h-3 overflow-hidden rounded-full bg-bg">
              <div
                className="h-full rounded-full bg-success"
                style={{ width: `${todo.percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {form.open && (
        <div className="mt-5">
          <TodoItemForm
            initial={form.item}
            onSubmit={handleSubmit}
            onCancel={() => setForm({ open: false })}
          />
        </div>
      )}

      {todo.items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-border bg-surface p-5">
          <h3 className="font-medium">Sin tareas todavía</h3>
          <p className="mt-1 text-sm text-text-muted">
            Crea una tarea nueva cuando algo no pertenezca a hábitos ni roadmap.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {todo.items.map((item) => (
            <TodoItemRow
              key={item.id}
              item={item}
              onToggle={() => void todo.toggleTodo(item.id)}
              onEdit={() => setForm({ open: true, item })}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
