import { getDatabase } from "./database";

/** Fila reducida usada para reconstruir el progreso del día. */
interface HabitLogValueRow {
  habit_id: string;
  value: number;
}

/** Fila usada para reconstruir progreso en un rango de fechas. */
interface HabitLogRangeRow extends HabitLogValueRow {
  date: string;
}

interface EarliestLogRow {
  date: string | null;
}

function generateLogId(): string {
  return `log-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/** Devuelve los valores registrados en una fecha, indexados por id de hábito. */
export async function getValuesForDate(
  date: string,
): Promise<Record<string, number>> {
  const db = await getDatabase();
  const rows = await db.select<HabitLogValueRow[]>(
    `SELECT habit_id, value FROM habit_logs WHERE date = $1`,
    [date],
  );
  return Object.fromEntries(rows.map((row) => [row.habit_id, row.value]));
}

/**
 * Devuelve los valores registrados en un rango inclusivo de fechas,
 * indexados por id de hábito y luego por fecha YYYY-MM-DD.
 */
export async function getValuesForDateRange(
  startDate: string,
  endDate: string,
): Promise<Record<string, Record<string, number>>> {
  const db = await getDatabase();
  const rows = await db.select<HabitLogRangeRow[]>(
    `SELECT habit_id, date, value
       FROM habit_logs
      WHERE date >= $1 AND date <= $2
      ORDER BY date ASC`,
    [startDate, endDate],
  );

  const values: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    values[row.habit_id] ??= {};
    values[row.habit_id][row.date] = row.value;
  }
  return values;
}

/** Devuelve la primera fecha con logs, si existe. */
export async function getEarliestLogDate(): Promise<string | null> {
  const db = await getDatabase();
  const rows = await db.select<EarliestLogRow[]>(
    `SELECT MIN(date) AS date FROM habit_logs`,
  );
  return rows[0]?.date ?? null;
}

/**
 * Registra el progreso de un hábito en una fecha.
 * Crea el log si no existe; lo actualiza si ya existe (un log por día).
 */
export async function upsertLog(
  habitId: string,
  date: string,
  value: number,
  completed: boolean,
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO habit_logs
       (id, habit_id, date, value, completed, note, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NULL, $6, $7)
     ON CONFLICT (habit_id, date) DO UPDATE SET
       value = excluded.value,
       completed = excluded.completed,
       updated_at = excluded.updated_at`,
    [generateLogId(), habitId, date, value, completed ? 1 : 0, now, now],
  );
}

/** Elimina todos los logs de un hábito (al borrarlo). */
export async function deleteLogsForHabit(habitId: string): Promise<void> {
  const db = await getDatabase();
  await db.execute(`DELETE FROM habit_logs WHERE habit_id = $1`, [habitId]);
}
