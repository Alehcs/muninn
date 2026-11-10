import { useCallback, useEffect, useMemo, useState } from "react";
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

  const reload = useCallback(async () => {
    try {
      const stored = await todoRepo.listTodoItems();
      setItems(stored);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const refresh = useCallback(async () => {
    await reload();
  }, [reload]);

  const createTodo = useCallback(
    async (input: TodoInput) => {
      try {
        await todoRepo.insertTodoItem(input);
        await refresh();
      } catch {
        setStatus("error");
      }
    },
    [refresh],
  );

  const updateTodo = useCallback(
    async (id: string, input: TodoInput) => {
      try {
        await todoRepo.updateTodoItem(id, input);
        await refresh();
      } catch {
        setStatus("error");
      }
    },
    [refresh],
  );

  const deleteTodo = useCallback(
    async (id: string) => {
      try {
        await todoRepo.deleteTodoItem(id);
        await refresh();
      } catch {
        setStatus("error");
      }
    },
    [refresh],
  );

  const toggleTodo = useCallback(
    async (id: string) => {
      const item = items.find((current) => current.id === id);
      if (!item) return;

      try {
        await todoRepo.setTodoCompleted(id, !item.completed);
        await refresh();
      } catch {
        setStatus("error");
      }
    },
    [items, refresh],
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
