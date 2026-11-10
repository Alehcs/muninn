import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notify } from "@/lib/notify";
import * as todoRepo from "../storage/todoRepository";
import type { TodoInput, TodoItem } from "../types";

export type TodoStatus = "loading" | "ready" | "error";

export interface TodoListStore {
  status: TodoStatus;
  items: TodoItem[];
  completed: number;
  total: number;
  percent: number;
  reload: () => Promise<void>;
  createTodo: (input: TodoInput) => Promise<void>;
  updateTodo: (id: string, input: TodoInput) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
}

export function useTodoList(): TodoListStore {
  const [status, setStatus] = useState<TodoStatus>("loading");
  const [items, setItems] = useState<TodoItem[]>([]);

  const loadedRef = useRef(false);

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

  const refresh = useCallback(async () => {
    await reload();
  }, [reload]);

  /** Un fallo al guardar avisa y recarga para mostrar lo que hay realmente. */
  const handleWriteError = useCallback(
    async (error: unknown) => {
      console.error("Todo operation failed", error);
      notify.error("No se pudo guardar el cambio en las tareas.");
      await reload();
    },
    [reload],
  );

  const createTodo = useCallback(
    async (input: TodoInput) => {
      try {
        await todoRepo.insertTodoItem(input);
        await refresh();
      } catch (error) {
        await handleWriteError(error);
      }
    },
    [refresh, handleWriteError],
  );

  const updateTodo = useCallback(
    async (id: string, input: TodoInput) => {
      try {
        await todoRepo.updateTodoItem(id, input);
        await refresh();
      } catch (error) {
        await handleWriteError(error);
      }
    },
    [refresh, handleWriteError],
  );

  const deleteTodo = useCallback(
    async (id: string) => {
      try {
        await todoRepo.deleteTodoItem(id);
        await refresh();
      } catch (error) {
        await handleWriteError(error);
      }
    },
    [refresh, handleWriteError],
  );

  const toggleTodo = useCallback(
    async (id: string) => {
      const item = items.find((current) => current.id === id);
      if (!item) return;

      try {
        await todoRepo.setTodoCompleted(id, !item.completed);
        await refresh();
      } catch (error) {
        await handleWriteError(error);
      }
    },
    [items, refresh, handleWriteError],
  );

  const completed = useMemo(
    () => items.filter((item) => item.completed).length,
    [items],
  );
  const total = items.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    status,
    items,
    completed,
    total,
    percent,
    reload,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
  };
}
