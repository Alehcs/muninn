import { getDatabase } from "@/lib/db/database";
import { defaultHabits } from "../data/defaultHabits";
import type {
  Habit,
  HabitCategory,
  HabitEditInput,
  HabitType,
  HabitUnit,
} from "../types";

/** Fila tal como se almacena en la tabla `habits`. */
interface HabitRow {
  id: string;
  name: string;
  type: string;
  target_value: number;
  unit: string;
  category: string | null;
  active: number;
}

/** Convierte una fila de la base de datos al modelo de dominio. */
function toHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    type: row.type as HabitType,
    target: row.target_value,
    unit: row.unit as HabitUnit,
    category:
      row.category === null ? undefined : (row.category as HabitCategory),
    active: row.active === 1,
  };
}

/** Devuelve todos los hábitos (activos y pausados), ordenados por creación. */
export async function listHabits(): Promise<Habit[]> {
  const db = await getDatabase();
  const rows = await db.select<HabitRow[]>(
    `SELECT id, name, type, target_value, unit, category, active
       FROM habits
       ORDER BY created_at ASC`,
  );
  return rows.map(toHabit);
}

/** Inserta un hábito nuevo. */
export async function insertHabit(habit: Habit): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO habits
       (id, name, type, target_value, unit, category, active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      habit.id,
      habit.name,
      habit.type,
      habit.target,
      habit.unit,
      habit.category ?? null,
      habit.active ? 1 : 0,
      now,
      now,
    ],
  );
}

/** Actualiza los campos editables de un hábito existente. */
export async function updateHabit(
  id: string,
  patch: HabitEditInput,
): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `UPDATE habits
        SET name = $1, target_value = $2, category = $3, updated_at = $4
      WHERE id = $5`,
    [
      patch.name,
      patch.target,
      patch.category ?? null,
      new Date().toISOString(),
      id,
    ],
  );
}

/** Activa o pausa un hábito. */
export async function setHabitActive(
  id: string,
  active: boolean,
): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `UPDATE habits SET active = $1, updated_at = $2 WHERE id = $3`,
    [active ? 1 : 0, new Date().toISOString(), id],
  );
}

/** Elimina definitivamente un hábito y sus logs en una transacción. */
export async function deleteHabit(id: string): Promise<void> {
  const db = await getDatabase();

  await db.execute("BEGIN TRANSACTION");
  try {
    await db.execute(`DELETE FROM habit_logs WHERE habit_id = $1`, [id]);
    await db.execute(`DELETE FROM habits WHERE id = $1`, [id]);
    await db.execute("COMMIT");
  } catch (error) {
    await db.execute("ROLLBACK").catch(() => undefined);
    throw error;
  }
}

/**
 * Inserta los hábitos por defecto. Se usa solo cuando la tabla está vacía.
 * `INSERT OR IGNORE` lo hace idempotente ante arranques concurrentes.
 */
export async function seedDefaultHabits(): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  for (const habit of defaultHabits) {
    await db.execute(
      `INSERT OR IGNORE INTO habits
         (id, name, type, target_value, unit, category, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        habit.id,
        habit.name,
        habit.type,
        habit.target,
        habit.unit,
        habit.category ?? null,
        habit.active ? 1 : 0,
        now,
        now,
      ],
    );
  }
}
