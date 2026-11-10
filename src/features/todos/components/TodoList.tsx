import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigation } from "@/app/NavigationContext";
import SortableList from "@/components/SortableList";
import { usePages } from "@/features/pages/hooks/usePages";
import { confirm } from "@/lib/confirm";
import type { TodoListStore } from "../hooks/useTodoList";
import type { TodoItem } from "../types";
import { reorderPending } from "../utils/todoViews";
import TodoForm from "./TodoForm";
import TodoRow from "./TodoRow";

interface TodoListProps {
  store: TodoListStore;
  /** Las tareas que se muestran, en el orden en que se muestran. */
  items: TodoItem[];
  today: string;
  /** Permite reordenar por arrastre (solo con tareas pendientes). */
  sortable?: boolean;
  /** No mostrar el chip de página (ya se está dentro de ella). */
  hidePage?: boolean;
  /** No pintar el chip "Hoy" (panel "Hoy"). */
  hideTodayChip?: boolean;
}

/**
 * Lista de filas de tareas con todo lo común: edición en el sitio con el
 * formulario completo, confirmación al eliminar, apertura de la página
 * enlazada y reordenación por arrastre.
 */
export default function TodoList({
  store,
  items,
  today,
  sortable,
  hidePage,
  hideTodayChip,
}: TodoListProps) {
  const { pages } = usePages();
  const { navigate } = useNavigation();
  const [editingId, setEditingId] = useState<string | null>(null);

  const pageById = useMemo(
    () => new Map(pages.map((page) => [page.id, page])),
    [pages],
  );

  const handleDelete = async (item: TodoItem) => {
    const ok = await confirm({
      title: "Eliminar tarea",
      message: `¿Eliminar la tarea "${item.title}"?`,
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    setEditingId(null);
    void store.deleteTodo(item.id);
  };

  const renderItem = (item: TodoItem, handle?: ReactNode) =>
    editingId === item.id ? (
      <div className="my-1">
        <TodoForm
          initial={item}
          onSubmit={(values) => {
            setEditingId(null);
            void store.updateTodo(item.id, values);
          }}
          onCancel={() => setEditingId(null)}
        />
      </div>
    ) : (
      <TodoRow
        item={item}
        today={today}
        page={item.pageId ? pageById.get(item.pageId) : undefined}
        hidePage={hidePage}
        hideTodayChip={hideTodayChip}
        handle={handle}
        onToggle={() => void store.toggleTodo(item.id)}
        onChangeDue={(value) => void store.setDueDate(item.id, value)}
        onChangePriority={(value) => void store.setPriority(item.id, value)}
        onOpenPage={(pageId) => navigate({ view: "pages", pageId })}
        onEdit={() => setEditingId(item.id)}
        onDelete={() => void handleDelete(item)}
      />
    );

  if (sortable) {
    const visibleIds = items.map((item) => item.id);
    return (
      <SortableList
        items={items}
        noun="tarea"
        getLabel={(item) => item.title}
        onReorder={(activeId, overId) =>
          void store.reorderTodos(
            reorderPending(store.items, visibleIds, activeId, overId),
          )
        }
        renderItem={(item, handle) => renderItem(item, handle)}
      />
    );
  }

  return (
    <div>
      {items.map((item) => (
        <div key={item.id}>{renderItem(item)}</div>
      ))}
    </div>
  );
}
