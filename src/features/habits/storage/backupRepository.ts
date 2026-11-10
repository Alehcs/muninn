import { runBatch, type BatchStatement } from "@/lib/db/batch";
import { getDatabase } from "@/lib/db/database";
import { COPY_NOTES_TO_PAGES_SQL } from "@/lib/db/migrations";
import {
  ALL_TABLES,
  BACKUP_TABLE_COLUMNS,
  HABIT_TABLES,
  V2_TABLES,
  hasPages,
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
  pages: "created_at ASC, id ASC",
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
    pages: await readTable("pages"),
    app_metadata: await readTable("app_metadata"),
  };
}

/**
 * Reemplaza los datos locales por los del backup.
 * - v3: reemplaza todas las tablas, `pages` incluida.
 * - v2 (sin `pages`): reemplaza sus tablas y reconstruye `pages` a partir de
 *   las notas importadas, igual que la migración 2.
 * - v1: solo hábitos y registros; notas, páginas, tareas y roadmaps se quedan
 *   como están.
 */
export async function replaceBackupData(backup: BackupFile): Promise<void> {
  const full = isFullBackup(backup);
  const withPages = hasPages(backup);
  const tables = withPages ? ALL_TABLES : full ? V2_TABLES : HABIT_TABLES;
  // En un backup v1 las tablas nuevas no existen; no se leen porque `tables`
  // se limita a las de hábitos.
  const rowsByTable: Partial<Record<BackupTableName, readonly object[]>> = backup;

  const statements: BatchStatement[] = tables.map((table) => ({
    sql: `DELETE FROM ${table}`,
  }));
  // Un v2 no trae páginas: se vacían para reconstruirlas desde las notas.
  if (full && !withPages) statements.push({ sql: "DELETE FROM pages" });

  // Se insertan en orden inverso: primero los padres, luego lo que depende.
  for (const table of [...tables].reverse()) {
    const columns = BACKUP_TABLE_COLUMNS[table];
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;

    for (const row of rowsByTable[table] ?? []) {
      const values = row as Record<string, unknown>;
      statements.push({
        sql,
        params: columns.map((column) => values[column] ?? null),
      });
    }
  }

  if (full && !withPages) {
    statements.push({ sql: COPY_NOTES_TO_PAGES_SQL });
  }

  if (full) {
    // Un backup completo define el estado de los roadmaps: si el usuario
    // había borrado el de ejemplo, no debe volver a sembrarse.
    statements.push({
      sql: `INSERT INTO app_metadata (key, value, updated_at)
         VALUES ($1, 'true', $2)
         ON CONFLICT (key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`,
      params: [ROADMAP_SEEDED_KEY, new Date().toISOString()],
    });
  }

  // Una sola transacción: si algo falla, no se borra ni se inserta nada.
  await runBatch(statements);
}
