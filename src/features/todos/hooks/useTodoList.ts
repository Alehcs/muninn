import { useCallback, useEffect, useRef, useState } from "react";
import { notify } from "@/lib/notify";
import * as todoRepo from "../storage/todoRepository";
import type { TodoInput, TodoItem, TodoPriority } from "../types";

export type TodoStatus = "loading" | "ready" | "error";

export interface TodoListStore {
  status: TodoStatus;
  /** Todas las tareas (las vistas filtran con `utils/todoViews`). */
  items: TodoItem[];
  reload: () => Promise<void>;
  createTodo: (input: TodoInput) => Promise<void>;
  updateTodo: (id: string, input: TodoInput) => Promise<void>;
  setDueDate: (id: string, dueDate: string | null) => Promise<void>;
  setPriority: (id: string, priority: TodoPriority) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  /** Guarda posiciones 1…n (de `reorderPending`); se refleja al instante. */
  reorderTodos: (positions: { id: string; position: number }[]) => Promise<void>;
}

export function useTodoList(): TodoListStore {
  const [status, setStatus] = useState<TodoStatus>("loading");
  const [items, setItems] = useState<TodoItem[]>([]);

  const loadedRef = useRef(false);
  const itemsRef = useRef<TodoItem[]>([]);
  itemsRef.current = items;

  /** La pantalla de error completa solo aparece si falla la carga inicial. */
  const reload = useCallback(async () => {
    try {
      const stored = await todoRepo.listTodoItems();
      setItems(stored);
      loadedRef.current = true;
      setStatus("ready");
    } catch (error) {
      console.error("Todo operation failed", error);
      if (loadedRef.current) notify.error("No se pudieron recargar las tareas.");
      else setStatus("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Escribe y recarga; un fallo avisa y recarga para mostrar lo que hay realmente. */
  const write = useCallback(
    async (operation: () => Promise<unknown>) => {
      try {
        await operation();
      } catch (error) {
        console.error("Todo operation failed", error);
        notify.error("No se pudo guardar el cambio en las tareas.");
      }
      await reload();
    },
    [reload],
  );

  const createTodo = useCallback(
    (input: TodoInput) => write(() => todoRepo.insertTodoItem(input)),
    [write],
  );

  const updateTodo = useCallback(
    (id: string, input: TodoInput) => write(() => todoRepo.updateTodoItem(id, input)),
    [write],
  );

  const setDueDate = useCallback(
    (id: string, dueDate: string | null) =>
      write(() => todoRepo.setTodoDueDate(id, dueDate)),
    [write],
  );

  const setPriority = useCallback(
    (id: string, priority: TodoPriority) =>
      write(() => todoRepo.setTodoPriority(id, priority)),
    [write],
  );

  const deleteTodo = useCallback(
    (id: string) => write(() => todoRepo.deleteTodoItem(id)),
    [write],
  );

  const toggleTodo = useCallback(
    async (id: string) => {
      const item = itemsRef.current.find((current) => current.id === id);
      if (!item) return;
      await write(() => todoRepo.setTodoCompleted(id, !item.completed));
    },
    [write],
  );

  const reorderTodos = useCallback(
    async (positions: { id: string; position: number }[]) => {
      // Optimista: la lista salta a su sitio sin esperar a la base.
      const byId = new Map(positions.map((entry) => [entry.id, entry.position]));
      setItems((current) =>
        current.map((item) =>
          byId.has(item.id) ? { ...item, orderIndex: byId.get(item.id)! } : item,
        ),
      );
      await write(() => todoRepo.reorderTodoItems(positions));
    },
    [write],
  );

  return {
    status,
    items,
    reload,
    createTodo,
    updateTodo,
    setDueDate,
    setPriority,
    deleteTodo,
    toggleTodo,
    reorderTodos,
  };
}
