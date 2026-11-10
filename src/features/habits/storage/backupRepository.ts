import { getDatabase } from "@/lib/db/database";
import {
  ALL_TABLES,
  BACKUP_TABLE_COLUMNS,
  HABIT_TABLES,
  isFullBackup,
  type BackupFile,
  type BackupTableName,
  type BackupTables,
} from "@/features/backup/backupTypes";

/** Orden estable de lectura para que dos exportaciones iguales coincidan. */
const EXPORT_ORDER: Record<BackupTableName, string> = {
  habits: "created_at ASC, id ASC",
  habit_logs: "date ASC, habit_id ASC",
  roadmaps: "created_at ASC, id ASC",
  roadmap_sections: "roadmap_id ASC, section_order ASC, id ASC",
  roadmap_items: "section_order ASC, order_index ASC, id ASC",
  todo_items: "order_index ASC, created_at ASC, id ASC",
  notes: "created_at ASC, id ASC",
  app_metadata: "key ASC",
};

/** Clave que marca que el roadmap de ejemplo ya se sembró una vez. */
const ROADMAP_SEEDED_KEY = "roadmap_seeded";

async function readTable<Table extends BackupTableName>(
  table: Table,
): Promise<BackupTables[Table]> {
  const db = await getDatabase();
  const columns = BACKUP_TABLE_COLUMNS[table].join(", ");

  return db.select<BackupTables[Table]>(
    `SELECT ${columns} FROM ${table} ORDER BY ${EXPORT_ORDER[table]}`,
  );
}

/** Lee todas las tablas de datos del usuario. */
export async function readBackupData(): Promise<BackupTables> {
  return {
    habits: await readTable("habits"),
    habit_logs: await readTable("habit_logs"),
    roadmaps: await readTable("roadmaps"),
    roadmap_sections: await readTable("roadmap_sections"),
    roadmap_items: await readTable("roadmap_items"),
    todo_items: await readTable("todo_items"),
    notes: await readTable("notes"),
    app_metadata: await readTable("app_metadata"),
  };
}

/**
 * Reemplaza los datos locales por los del backup.
 * Un backup v1 solo trae hábitos y registros, así que solo toca esas dos
 * tablas: notas, tareas y roadmaps se quedan como están.
 */
export async function replaceBackupData(backup: BackupFile): Promise<void> {
  const db = await getDatabase();
  const full = isFullBackup(backup);
  const tables = full ? ALL_TABLES : HABIT_TABLES;
  // En un backup v1 las tablas nuevas no existen; no se leen porque `tables`
  // se limita a las de hábitos.
  const rowsByTable: Partial<Record<BackupTableName, readonly object[]>> = backup;

  await db.execute("BEGIN TRANSACTION");
  try {
    for (const table of tables) {
      await db.execute(`DELETE FROM ${table}`);
    }

    // Se insertan en orden inverso: primero los padres, luego lo que depende.
    for (const table of [...tables].reverse()) {
      const columns = BACKUP_TABLE_COLUMNS[table];
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
      const statement = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;

      for (const row of rowsByTable[table] ?? []) {
        const values = row as Record<string, unknown>;
        await db.execute(
          statement,
          columns.map((column) => values[column] ?? null),
        );
      }
    }

    if (full) {
      // Un backup completo define el estado de los roadmaps: si el usuario
      // había borrado el de ejemplo, no debe volver a sembrarse.
      const now = new Date().toISOString();
      await db.execute(
        `INSERT INTO app_metadata (key, value, updated_at)
         VALUES ($1, 'true', $2)
         ON CONFLICT (key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`,
        [ROADMAP_SEEDED_KEY, now],
      );
    }

    await db.execute("COMMIT");
  } catch (error) {
    await db.execute("ROLLBACK").catch(() => undefined);
    throw error;
  }
}
