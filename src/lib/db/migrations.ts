import type { SqlDatabase } from "./types";

/** Sentencias idempotentes que crean el esquema de la migración 1. */
const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    target_value INTEGER NOT NULL,
    unit TEXT NOT NULL,
    category TEXT,
    active INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS habit_logs (
    id TEXT PRIMARY KEY,
    habit_id TEXT NOT NULL,
    date TEXT NOT NULL,
    value INTEGER NOT NULL,
    completed INTEGER NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  // Garantiza como máximo un log por hábito y día.
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_logs_habit_date
     ON habit_logs (habit_id, date)`,
  `CREATE TABLE IF NOT EXISTS app_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS roadmaps (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS roadmap_sections (
    id TEXT PRIMARY KEY,
    roadmap_id TEXT NOT NULL,
    name TEXT NOT NULL,
    section_order INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS roadmap_items (
    id TEXT PRIMARY KEY,
    roadmap_id TEXT,
    section_id TEXT,
    section TEXT NOT NULL,
    section_order INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT,
    completed INTEGER NOT NULL,
    order_index INTEGER NOT NULL,
    notes TEXT,
    url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_roadmap_items_order
     ON roadmap_items (section_order, order_index)`,
  `CREATE INDEX IF NOT EXISTS idx_roadmap_sections_order
     ON roadmap_sections (roadmap_id, section_order)`,
  `CREATE TABLE IF NOT EXISTS todo_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    notes TEXT,
    completed INTEGER NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_todo_items_order
     ON todo_items (completed, order_index, created_at)`,
  `CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    pinned INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_notes_order
     ON notes (pinned DESC, updated_at DESC)`,
];

interface TableInfoRow {
  name: string;
}

const ROADMAP_ITEM_COLUMNS = [
  {
    name: "roadmap_id",
    definition: "roadmap_id TEXT",
  },
  {
    name: "section_id",
    definition: "section_id TEXT",
  },
];

const POST_COLUMN_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_roadmap_items_roadmap
     ON roadmap_items (roadmap_id, section_order, order_index)`,
  `CREATE INDEX IF NOT EXISTS idx_roadmap_items_section
     ON roadmap_items (section_id, order_index)`,
];

async function ensureColumn(
  db: SqlDatabase,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  const columns = await db.select<TableInfoRow[]>(`PRAGMA table_info(${table})`);
  const exists = columns.some((item) => item.name === column);

  if (!exists) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

/**
 * Migraciones versionadas, en orden ascendente de `version`.
 *
 * REGLA INVIOLABLE: una migración nunca hace DROP ni DELETE de datos de
 * usuario (ni tablas, ni columnas, ni filas). Solo añade: tablas, columnas,
 * índices o rellena valores nuevos. Si hay que reorganizar datos, se copian
 * a una estructura nueva y la antigua se deja intacta.
 *
 * Para añadir una migración, agrega un elemento al final con `version`
 * consecutiva; `CURRENT_SCHEMA_VERSION` se deriva solo.
 */
export interface Migration {
  version: number;
  name: string;
  up(db: SqlDatabase): Promise<void>;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "esquema inicial",
    // Idempotente a propósito: las bases creadas antes de existir el
    // versionado (user_version 0) ya contienen este esquema.
    async up(db) {
      for (const statement of SCHEMA) {
        await db.execute(statement);
      }

      for (const column of ROADMAP_ITEM_COLUMNS) {
        await ensureColumn(db, "roadmap_items", column.name, column.definition);
      }

      for (const statement of POST_COLUMN_INDEXES) {
        await db.execute(statement);
      }
    },
  },
];

export const CURRENT_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

export interface MigrationOptions {
  /**
   * Se invoca una sola vez antes de aplicar migraciones pendientes, siempre
   * que la base ya contenga datos de usuario (existe la tabla `habits`),
   * aunque su `user_version` sea 0 (bases anteriores al versionado). Una base
   * recién creada y vacía no lo invoca. Pensado para sacar una copia
   * automática. Si lanza un error, no se migra.
   */
  beforeMigrate?: (fromVersion: number, toVersion: number) => Promise<void>;
}

interface UserVersionRow {
  user_version: number;
}

/** ¿La base ya tiene datos de usuario? (la tabla `habits` es la señal). */
async function hasUserTables(db: SqlDatabase): Promise<boolean> {
  const rows = await db.select<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'habits'",
  );
  return rows.length > 0;
}

async function readSchemaVersion(db: SqlDatabase): Promise<number> {
  const rows = await db.select<UserVersionRow[]>("PRAGMA user_version");
  return rows[0]?.user_version ?? 0;
}

/** Aplica las migraciones pendientes. Seguro de ejecutar en cada arranque. */
export async function runMigrations(
  db: SqlDatabase,
  options: MigrationOptions = {},
): Promise<void> {
  const fromVersion = await readSchemaVersion(db);
  const pending = MIGRATIONS.filter((m) => m.version > fromVersion).sort(
    (a, b) => a.version - b.version,
  );
  if (pending.length === 0) return;

  if (options.beforeMigrate && (await hasUserTables(db))) {
    await options.beforeMigrate(fromVersion, pending[pending.length - 1].version);
  }

  for (const migration of pending) {
    await migration.up(db);
    // PRAGMA no admite parámetros; `version` es un entero propio, no del usuario.
    await db.execute(`PRAGMA user_version = ${Math.trunc(migration.version)}`);
  }
}
