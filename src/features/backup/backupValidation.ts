import {
  type BackupAppMetadataRow,
  type BackupFile,
  type BackupHabitLogRow,
  type BackupHabitRow,
  type BackupNoteRow,
  type BackupRoadmapItemRow,
  type BackupRoadmapRow,
  type BackupRoadmapSectionRow,
  type BackupTodoItemRow,
} from "./backupTypes";
import type { HabitCategory, HabitType, HabitUnit } from "@/features/habits/types";

const HABIT_TYPES: HabitType[] = ["check", "count", "duration"];
const HABIT_UNITS: HabitUnit[] = [
  "completado",
  "veces",
  "minutos",
  "problemas",
];
const HABIT_CATEGORIES: HabitCategory[] = [
  "salud",
  "estudio",
  "orden",
  "ejercicio",
  "idioma",
  "otra",
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isBinaryNumber(value: unknown): value is number {
  return value === 0 || value === 1;
}

function validateHabit(value: unknown): BackupHabitRow {
  if (!isObject(value)) throw new Error("Un hábito del backup no es válido.");

  const habit = value;
  if (!isString(habit.id)) throw new Error("Un hábito no tiene id válido.");
  if (!isString(habit.name)) throw new Error("Un hábito no tiene nombre válido.");
  if (!HABIT_TYPES.includes(habit.type as HabitType)) {
    throw new Error(`El hábito "${habit.id}" tiene type inválido.`);
  }
  if (
    typeof habit.target_value !== "number" ||
    !Number.isInteger(habit.target_value) ||
    habit.target_value <= 0
  ) {
    throw new Error(`El hábito "${habit.id}" tiene objetivo inválido.`);
  }
  if (!HABIT_UNITS.includes(habit.unit as HabitUnit)) {
    throw new Error(`El hábito "${habit.id}" tiene unit inválida.`);
  }
  if (
    habit.category !== null &&
    !HABIT_CATEGORIES.includes(habit.category as HabitCategory)
  ) {
    throw new Error(`El hábito "${habit.id}" tiene categoría inválida.`);
  }
  if (!isBinaryNumber(habit.active)) {
    throw new Error(`El hábito "${habit.id}" tiene active inválido.`);
  }
  if (!isString(habit.created_at) || !isString(habit.updated_at)) {
    throw new Error(`El hábito "${habit.id}" no tiene fechas internas válidas.`);
  }

  return {
    id: habit.id,
    name: habit.name,
    type: habit.type as HabitType,
    target_value: habit.target_value,
    unit: habit.unit as HabitUnit,
    category: habit.category as HabitCategory | null,
    active: habit.active,
    created_at: habit.created_at,
    updated_at: habit.updated_at,
  };
}

function validateLog(
  value: unknown,
  habitIds: Set<string>,
): BackupHabitLogRow {
  if (!isObject(value)) throw new Error("Un log del backup no es válido.");

  const log = value;
  if (!isString(log.id)) throw new Error("Un log no tiene id válido.");
  if (!isString(log.habit_id) || !habitIds.has(log.habit_id)) {
    throw new Error(`El log "${log.id}" referencia un habit_id inexistente.`);
  }
  if (!isDateString(log.date)) {
    throw new Error(`El log "${log.id}" tiene fecha inválida.`);
  }
  if (
    typeof log.value !== "number" ||
    !Number.isInteger(log.value) ||
    log.value < 0
  ) {
    throw new Error(`El log "${log.id}" tiene value inválido.`);
  }
  if (!isBinaryNumber(log.completed)) {
    throw new Error(`El log "${log.id}" tiene completed inválido.`);
  }
  if (!isOptionalString(log.note)) {
    throw new Error(`El log "${log.id}" tiene note inválida.`);
  }
  if (!isString(log.created_at) || !isString(log.updated_at)) {
    throw new Error(`El log "${log.id}" no tiene fechas internas válidas.`);
  }

  return {
    id: log.id,
    habit_id: log.habit_id,
    date: log.date,
    value: log.value,
    completed: log.completed,
    note: log.note,
    created_at: log.created_at,
    updated_at: log.updated_at,
  };
}

/**
 * Tipo de dato esperado en una columna:
 * - "id": texto no vacío.
 * - "text": texto obligatorio (puede estar vacío).
 * - "text?": texto o null.
 * - "int": número entero.
 * - "bool": 0 o 1.
 */
type FieldKind = "id" | "text" | "text?" | "int" | "bool";

type RowSpec<Row> = { [Column in keyof Row]: FieldKind };

function matchesKind(value: unknown, kind: FieldKind): boolean {
  switch (kind) {
    case "id":
      return isString(value);
    case "text":
      return typeof value === "string";
    case "text?":
      return isOptionalString(value);
    case "int":
      return typeof value === "number" && Number.isInteger(value);
    case "bool":
      return isBinaryNumber(value);
  }
}

/** Nombre legible de las tablas cuyo nombre técnico no se muestra al usuario. */
const TABLE_LABELS: Record<string, string> = {
  roadmaps: "listas",
  roadmap_sections: "secciones de listas",
  roadmap_items: "items de listas",
};

/**
 * Valida una lista de filas contra su especificación y comprueba que la
 * clave primaria no se repita. Devuelve solo las columnas conocidas.
 */
function validateRows<Row>(
  value: unknown,
  table: string,
  spec: RowSpec<Row>,
  primaryKey: keyof Row & string,
): Row[] {
  const name = TABLE_LABELS[table] ?? table;
  if (!Array.isArray(value)) throw new Error(`Falta la sección ${name} del backup.`);

  const columns = Object.keys(spec) as (keyof Row & string)[];
  const seen = new Set<unknown>();

  return value.map((item, index) => {
    if (!isObject(item)) {
      throw new Error(`La fila ${index + 1} de ${name} no es válida.`);
    }

    const row: Record<string, unknown> = {};
    for (const column of columns) {
      if (!matchesKind(item[column], spec[column])) {
        throw new Error(
          `La fila ${index + 1} de ${name} tiene "${column}" inválido.`,
        );
      }
      row[column] = item[column];
    }

    const key = row[primaryKey];
    if (seen.has(key)) {
      throw new Error(`"${String(key)}" está duplicado en ${name}.`);
    }
    seen.add(key);

    return row as Row;
  });
}

const ROADMAP_SPEC: RowSpec<BackupRoadmapRow> = {
  id: "id",
  title: "text",
  description: "text?",
  created_at: "id",
  updated_at: "id",
};

const ROADMAP_SECTION_SPEC: RowSpec<BackupRoadmapSectionRow> = {
  id: "id",
  roadmap_id: "id",
  name: "text",
  section_order: "int",
  created_at: "id",
  updated_at: "id",
};

const ROADMAP_ITEM_SPEC: RowSpec<BackupRoadmapItemRow> = {
  id: "id",
  roadmap_id: "text?",
  section_id: "text?",
  section: "text",
  section_order: "int",
  title: "text",
  description: "text?",
  type: "text?",
  completed: "bool",
  order_index: "int",
  notes: "text?",
  url: "text?",
  created_at: "id",
  updated_at: "id",
  completed_at: "text?",
};

const TODO_ITEM_SPEC: RowSpec<BackupTodoItemRow> = {
  id: "id",
  title: "text",
  notes: "text?",
  completed: "bool",
  order_index: "int",
  created_at: "id",
  updated_at: "id",
  completed_at: "text?",
};

const NOTE_SPEC: RowSpec<BackupNoteRow> = {
  id: "id",
  title: "text",
  content: "text",
  category: "text?",
  pinned: "bool",
  created_at: "id",
  updated_at: "id",
};

const APP_METADATA_SPEC: RowSpec<BackupAppMetadataRow> = {
  key: "id",
  value: "text",
  updated_at: "id",
};

export function validateBackupFile(value: unknown): BackupFile {
  if (!isObject(value)) throw new Error("El archivo no contiene un objeto JSON.");
  if (!isObject(value.metadata)) throw new Error("Falta metadata del backup.");

  const version = value.metadata.backupVersion;
  if (version !== 1 && version !== 2) {
    throw new Error("La versión del backup no es compatible.");
  }
  if (value.metadata.app !== "Aurhabits") {
    throw new Error("El backup no corresponde a Aurhabits.");
  }
  if (!isString(value.metadata.exportedAt)) {
    throw new Error("La metadata no tiene fecha de exportación válida.");
  }
  if (!Array.isArray(value.habits)) throw new Error("Falta la lista habits.");
  if (!Array.isArray(value.habit_logs)) {
    throw new Error("Falta la lista habit_logs.");
  }

  const habits = value.habits.map(validateHabit);
  const habitIds = new Set<string>();
  for (const habit of habits) {
    if (habitIds.has(habit.id)) {
      throw new Error(`El hábito "${habit.id}" está duplicado.`);
    }
    habitIds.add(habit.id);
  }

  const logIds = new Set<string>();
  const logDays = new Set<string>();
  const habit_logs = value.habit_logs.map((log) => {
    const validated = validateLog(log, habitIds);
    if (logIds.has(validated.id)) {
      throw new Error(`El log "${validated.id}" está duplicado.`);
    }
    logIds.add(validated.id);

    // La base solo admite un registro por hábito y día.
    const day = `${validated.habit_id}|${validated.date}`;
    if (logDays.has(day)) {
      throw new Error(
        `Hay más de un log para el hábito "${validated.habit_id}" el ${validated.date}.`,
      );
    }
    logDays.add(day);

    return validated;
  });

  const exportedAt = value.metadata.exportedAt;

  if (version === 1) {
    return {
      metadata: { backupVersion: 1, exportedAt, app: "Aurhabits" },
      habits,
      habit_logs,
    };
  }

  return {
    metadata: { backupVersion: 2, exportedAt, app: "Aurhabits" },
    habits,
    habit_logs,
    roadmaps: validateRows(value.roadmaps, "roadmaps", ROADMAP_SPEC, "id"),
    roadmap_sections: validateRows(
      value.roadmap_sections,
      "roadmap_sections",
      ROADMAP_SECTION_SPEC,
      "id",
    ),
    roadmap_items: validateRows(
      value.roadmap_items,
      "roadmap_items",
      ROADMAP_ITEM_SPEC,
      "id",
    ),
    todo_items: validateRows(value.todo_items, "todo_items", TODO_ITEM_SPEC, "id"),
    notes: validateRows(value.notes, "notes", NOTE_SPEC, "id"),
    app_metadata: validateRows(
      value.app_metadata,
      "app_metadata",
      APP_METADATA_SPEC,
      "key",
    ),
  };
}
