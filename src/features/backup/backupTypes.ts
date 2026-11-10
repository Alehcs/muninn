import type { HabitCategory, HabitType, HabitUnit } from "@/features/habits/types";

/**
 * Versión que escribe la app al exportar.
 * - v1: solo hábitos y sus registros.
 * - v2: todos los datos (hábitos, registros, roadmaps, tareas, notas y metadata).
 */
export const BACKUP_VERSION = 2;

export interface BackupMetadata<Version extends 1 | 2 = 1 | 2> {
  backupVersion: Version;
  exportedAt: string;
  app: "Aurhabits";
}

export interface BackupHabitRow {
  id: string;
  name: string;
  type: HabitType;
  target_value: number;
  unit: HabitUnit;
  category: HabitCategory | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface BackupHabitLogRow {
  id: string;
  habit_id: string;
  date: string;
  value: number;
  completed: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackupRoadmapRow {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackupRoadmapSectionRow {
  id: string;
  roadmap_id: string;
  name: string;
  section_order: number;
  created_at: string;
  updated_at: string;
}

export interface BackupRoadmapItemRow {
  id: string;
  roadmap_id: string | null;
  section_id: string | null;
  section: string;
  section_order: number;
  title: string;
  description: string | null;
  type: string | null;
  completed: number;
  order_index: number;
  notes: string | null;
  url: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface BackupTodoItemRow {
  id: string;
  title: string;
  notes: string | null;
  completed: number;
  order_index: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface BackupNoteRow {
  id: string;
  title: string;
  content: string;
  category: string | null;
  pinned: number;
  created_at: string;
  updated_at: string;
}

export interface BackupAppMetadataRow {
  key: string;
  value: string;
  updated_at: string;
}

/** Tablas presentes en cualquier versión de backup. */
export interface BackupHabitTables {
  habits: BackupHabitRow[];
  habit_logs: BackupHabitLogRow[];
}

/** Tablas añadidas en la versión 2. */
export interface BackupWorkspaceTables {
  roadmaps: BackupRoadmapRow[];
  roadmap_sections: BackupRoadmapSectionRow[];
  roadmap_items: BackupRoadmapItemRow[];
  todo_items: BackupTodoItemRow[];
  notes: BackupNoteRow[];
  app_metadata: BackupAppMetadataRow[];
}

export type BackupTables = BackupHabitTables & BackupWorkspaceTables;
export type BackupTableName = keyof BackupTables;

/** Backup antiguo: solo hábitos y registros. */
export interface BackupFileV1 extends BackupHabitTables {
  metadata: BackupMetadata<1>;
}

/** Backup completo. */
export interface BackupFileV2 extends BackupTables {
  metadata: BackupMetadata<2>;
}

export type BackupFile = BackupFileV1 | BackupFileV2;

export function isFullBackup(backup: BackupFile): backup is BackupFileV2 {
  return backup.metadata.backupVersion === 2;
}

/**
 * Columnas de cada tabla, en el orden en que se leen y se insertan.
 * Es la única lista que usan la exportación y la importación.
 */
export const BACKUP_TABLE_COLUMNS: {
  [Table in BackupTableName]: readonly (keyof BackupTables[Table][number] &
    string)[];
} = {
  habits: [
    "id",
    "name",
    "type",
    "target_value",
    "unit",
    "category",
    "active",
    "created_at",
    "updated_at",
  ],
  habit_logs: [
    "id",
    "habit_id",
    "date",
    "value",
    "completed",
    "note",
    "created_at",
    "updated_at",
  ],
  roadmaps: ["id", "title", "description", "created_at", "updated_at"],
  roadmap_sections: [
    "id",
    "roadmap_id",
    "name",
    "section_order",
    "created_at",
    "updated_at",
  ],
  roadmap_items: [
    "id",
    "roadmap_id",
    "section_id",
    "section",
    "section_order",
    "title",
    "description",
    "type",
    "completed",
    "order_index",
    "notes",
    "url",
    "created_at",
    "updated_at",
    "completed_at",
  ],
  todo_items: [
    "id",
    "title",
    "notes",
    "completed",
    "order_index",
    "created_at",
    "updated_at",
    "completed_at",
  ],
  notes: [
    "id",
    "title",
    "content",
    "category",
    "pinned",
    "created_at",
    "updated_at",
  ],
  app_metadata: ["key", "value", "updated_at"],
};

/** Tablas que contiene un backup v1. Los registros van antes que los hábitos. */
export const HABIT_TABLES: readonly BackupTableName[] = ["habit_logs", "habits"];

/** Todas las tablas, con las dependientes antes que sus padres. */
export const ALL_TABLES: readonly BackupTableName[] = [
  "habit_logs",
  "habits",
  "roadmap_items",
  "roadmap_sections",
  "roadmaps",
  "todo_items",
  "notes",
  "app_metadata",
];
