import { getDatabase } from "@/features/habits/storage/database";
import type { TodoInput, TodoItem } from "../types";

interface TodoItemRow {
  id: string;
  title: string;
  notes: string | null;
  completed: number;
  order_index: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function optional(value: string | null): string | undefined {
  return value === null || value.trim() === "" ? undefined : value;
}

function nullable(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}

function generateTodoId(): string {
  return `todo-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function toTodoItem(row: TodoItemRow): TodoItem {
  return {
    id: row.id,
    title: row.title,
    notes: optional(row.notes),
    completed: row.completed === 1,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: optional(row.completed_at),
  };
}

export async function listTodoItems(): Promise<TodoItem[]> {
  const db = await getDatabase();
  const rows = await db.select<TodoItemRow[]>(
    `SELECT id, title, notes, completed, order_index, created_at, updated_at, completed_at
       FROM todo_items
      ORDER BY completed ASC, order_index ASC, created_at ASC`,
  );

  return rows.map(toTodoItem);
}

export async function getNextOrderIndex(): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<{ next_order: number | null }[]>(
    `SELECT COALESCE(MAX(order_index), 0) + 1 AS next_order FROM todo_items`,
  );

  return rows[0]?.next_order ?? 1;
}

export async function insertTodoItem(input: TodoInput): Promise<TodoItem> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const orderIndex = input.orderIndex ?? (await getNextOrderIndex());
  const item: TodoItem = {
    id: generateTodoId(),
    title: input.title,
    notes: nullable(input.notes) ?? undefined,
    completed: false,
    orderIndex,
    createdAt: now,
    updatedAt: now,
  };

  await db.execute(
    `INSERT INTO todo_items
       (id, title, notes, completed, order_index, created_at, updated_at, completed_at)
     VALUES ($1, $2, $3, 0, $4, $5, $6, NULL)`,
    [item.id, item.title, item.notes ?? null, item.orderIndex, now, now],
  );

  return item;
}

export async function updateTodoItem(
  id: string,
  input: TodoInput,
): Promise<void> {
  const db = await getDatabase();
  const orderIndex = input.orderIndex ?? (await getNextOrderIndex());

  await db.execute(
    `UPDATE todo_items
        SET title = $1,
            notes = $2,
            order_index = $3,
            updated_at = $4
      WHERE id = $5`,
    [
      input.title,
      nullable(input.notes),
      orderIndex,
      new Date().toISOString(),
      id,
    ],
  );
}

export async function setTodoCompleted(
  id: string,
  completed: boolean,
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE todo_items
        SET completed = $1,
            completed_at = $2,
            updated_at = $3
      WHERE id = $4`,
    [completed ? 1 : 0, completed ? now : null, now, id],
  );
}

export async function deleteTodoItem(id: string): Promise<void> {
  const db = await getDatabase();
  await db.execute(`DELETE FROM todo_items WHERE id = $1`, [id]);
}
