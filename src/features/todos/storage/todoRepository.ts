import { createId } from "@/lib/ids";
import { nullable, optional } from "@/lib/text";
import { runBatch } from "@/lib/db/batch";
import { getDatabase } from "@/lib/db/database";
import { toPriority, type TodoInput, type TodoItem, type TodoPriority } from "../types";

interface TodoItemRow {
  id: string;
  title: string;
  notes: string | null;
  completed: number;
  order_index: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  due_date: string | null;
  priority: number;
  page_id: string | null;
}

const COLUMNS = `id, title, notes, completed, order_index, created_at, updated_at,
  completed_at, due_date, priority, page_id`;

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
    dueDate: optional(row.due_date),
    priority: toPriority(row.priority),
    pageId: optional(row.page_id),
  };
}

/** Todas las tareas, en orden manual (las completadas al final). */
export async function listTodoItems(): Promise<TodoItem[]> {
  const db = await getDatabase();
  const rows = await db.select<TodoItemRow[]>(
    `SELECT ${COLUMNS}
       FROM todo_items
      ORDER BY completed ASC, order_index ASC, created_at ASC, id ASC`,
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

/** Crea una tarea al final del orden manual. */
export async function insertTodoItem(input: TodoInput): Promise<TodoItem> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const item: TodoItem = {
    id: createId("todo"),
    title: input.title,
    notes: optional(input.notes),
    completed: false,
    orderIndex: await getNextOrderIndex(),
    createdAt: now,
    updatedAt: now,
    dueDate: optional(input.dueDate),
    priority: input.priority ?? 0,
    pageId: optional(input.pageId),
  };

  await db.execute(
    `INSERT INTO todo_items
       (id, title, notes, completed, order_index, created_at, updated_at,
        completed_at, due_date, priority, page_id)
     VALUES ($1, $2, $3, 0, $4, $5, $6, NULL, $7, $8, $9)`,
    [
      item.id,
      item.title,
      item.notes ?? null,
      item.orderIndex,
      now,
      now,
      item.dueDate ?? null,
      item.priority,
      item.pageId ?? null,
    ],
  );

  return item;
}

/** Guarda todos los campos editables; el orden manual no se toca. */
export async function updateTodoItem(
  id: string,
  input: TodoInput,
): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    `UPDATE todo_items
        SET title = $1,
            notes = $2,
            due_date = $3,
            priority = $4,
            page_id = $5,
            updated_at = $6
      WHERE id = $7`,
    [
      input.title,
      nullable(input.notes),
      nullable(input.dueDate),
      input.priority ?? 0,
      nullable(input.pageId),
      new Date().toISOString(),
      id,
    ],
  );
}

/** Edición en línea: solo la fecha límite (`null` la quita). */
export async function setTodoDueDate(
  id: string,
  dueDate: string | null,
): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `UPDATE todo_items SET due_date = $1, updated_at = $2 WHERE id = $3`,
    [dueDate, new Date().toISOString(), id],
  );
}

/** Edición en línea: solo la prioridad. */
export async function setTodoPriority(
  id: string,
  priority: TodoPriority,
): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `UPDATE todo_items SET priority = $1, updated_at = $2 WHERE id = $3`,
    [priority, new Date().toISOString(), id],
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

/**
 * Guarda un nuevo orden manual en una sola transacción. `positions` viene de
 * `renumber`: cada tarea con su posición 1…n.
 */
export async function reorderTodoItems(
  positions: { id: string; position: number }[],
): Promise<void> {
  await runBatch(
    positions.map(({ id, position }) => ({
      sql: `UPDATE todo_items SET order_index = $1 WHERE id = $2`,
      params: [position, id],
    })),
  );
}

export async function deleteTodoItem(id: string): Promise<void> {
  const db = await getDatabase();
  await db.execute(`DELETE FROM todo_items WHERE id = $1`, [id]);
}
