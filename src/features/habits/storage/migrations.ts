import type Database from "@tauri-apps/plugin-sql";

/** Sentencias idempotentes que crean el esquema local. */
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
  db: Database,
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

/** Crea el esquema si no existe. Seguro de ejecutar en cada arranque. */
export async function runMigrations(db: Database): Promise<void> {
  for (const statement of SCHEMA) {
    await db.execute(statement);
  }

  for (const column of ROADMAP_ITEM_COLUMNS) {
    await ensureColumn(db, "roadmap_items", column.name, column.definition);
  }

  for (const statement of POST_COLUMN_INDEXES) {
    await db.execute(statement);
  }
}
