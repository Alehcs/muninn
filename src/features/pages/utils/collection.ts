/**
 * Lógica pura de las colecciones: lectura/escritura tolerante de `properties`,
 * columnas, valores de celda, cambio de tipo, orden y filtro. Sin base de datos
 * ni React: todo lo que escribe va por `mergeProperties`, que nunca pisa las
 * claves ajenas (p. ej. `categoria`).
 *
 * Forma guardada (en `pages.properties`, JSON):
 *   colección: { columns: Column[], view?: { sort?, filter? }, …otras claves }
 *   fila:      { values: { [columnId]: valor }, …otras claves }
 */

export type ColumnType = "text" | "number" | "select" | "checkbox" | "date" | "url";

export const COLUMN_TYPES: readonly ColumnType[] = [
  "text",
  "number",
  "select",
  "checkbox",
  "date",
  "url",
];

export const COLUMN_TYPE_LABEL: Record<ColumnType, string> = {
  text: "Texto",
  number: "Número",
  select: "Selección",
  checkbox: "Casilla",
  date: "Fecha",
  url: "Enlace",
};

export interface SelectOption {
  id: string;
  label: string;
}

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  /** Solo en `select`. */
  options?: SelectOption[];
}

/** string (text, url, date "YYYY-MM-DD", id de opción), number o boolean. */
export type CellValue = string | number | boolean;
export type RowValues = Record<string, CellValue>;
export type Properties = Record<string, unknown>;

/** Id de la "columna" del título al ordenar. */
export const TITLE_COLUMN = "title";

export interface SortSpec {
  columnId: string;
  dir: "asc" | "desc";
}

export interface FilterSpec {
  columnId: string;
  /** select: id de opción ("" = sin valor); checkbox: "true" | "false". */
  value: string;
}

export interface ViewSpec {
  sort?: SortSpec;
  filter?: FilterSpec;
}

/* ---------- ids ---------- */

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

/* ---------- parseo tolerante ---------- */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** JSON de `properties` → objeto. Cualquier cosa rara da `{}`. */
export function parseProperties(raw: string): Properties {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function isColumnType(value: unknown): value is ColumnType {
  return typeof value === "string" && (COLUMN_TYPES as readonly string[]).includes(value);
}

function readOptions(value: unknown): SelectOption[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const options: SelectOption[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== "string" || item.id === "") continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    options.push({ id: item.id, label: typeof item.label === "string" ? item.label : item.id });
  }
  return options;
}

/** Columnas de una colección. Descarta las inválidas y los ids repetidos. */
export function readColumns(properties: Properties): Column[] {
  if (!Array.isArray(properties.columns)) return [];
  const seen = new Set<string>();
  const columns: Column[] = [];
  for (const item of properties.columns) {
    if (!isRecord(item) || typeof item.id !== "string" || item.id === "") continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const type = isColumnType(item.type) ? item.type : "text";
    const column: Column = {
      id: item.id,
      name: typeof item.name === "string" ? item.name : "",
      type,
    };
    if (type === "select") column.options = readOptions(item.options);
    columns.push(column);
  }
  return columns;
}

function isCellValue(value: unknown): value is CellValue {
  return (
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

/** Valores de una fila (`properties.values`), sin lo que no sea un valor válido. */
export function readValues(properties: Properties): RowValues {
  if (!isRecord(properties.values)) return {};
  const values: RowValues = {};
  for (const [key, value] of Object.entries(properties.values)) {
    if (isCellValue(value)) values[key] = value;
  }
  return values;
}

export function readView(properties: Properties): ViewSpec {
  const view = properties.view;
  if (!isRecord(view)) return {};
  const result: ViewSpec = {};
  const { sort, filter } = view;
  if (
    isRecord(sort) &&
    typeof sort.columnId === "string" &&
    (sort.dir === "asc" || sort.dir === "desc")
  ) {
    result.sort = { columnId: sort.columnId, dir: sort.dir };
  }
  if (isRecord(filter) && typeof filter.columnId === "string" && typeof filter.value === "string") {
    result.filter = { columnId: filter.columnId, value: filter.value };
  }
  return result;
}

/* ---------- fusión ---------- */

/**
 * Copia de `base` con los cambios de `changes` aplicados clave a clave.
 * `undefined` borra la clave. No toca ninguna otra.
 */
export function mergeProperties(base: Properties, changes: Properties): Properties {
  const next: Properties = { ...base };
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) delete next[key];
    else next[key] = value;
  }
  return next;
}

/** Valores de celda vacíos no se guardan. */
export function isEmptyValue(value: CellValue | null | undefined): boolean {
  return value === undefined || value === null || value === "" || value === false;
}

/** Propiedades de una fila con `value` en `columnId` (vacío = quita la clave). */
export function withRowValue(
  properties: Properties,
  columnId: string,
  value: CellValue | null | undefined,
): Properties {
  const values = readValues(properties);
  if (isEmptyValue(value)) delete values[columnId];
  else values[columnId] = value as CellValue;
  return mergeProperties(properties, {
    values: Object.keys(values).length === 0 ? undefined : values,
  });
}

export function withColumns(properties: Properties, columns: Column[]): Properties {
  return mergeProperties(properties, { columns });
}

export function withView(properties: Properties, view: ViewSpec): Properties {
  return mergeProperties(properties, {
    view: view.sort || view.filter ? view : undefined,
  });
}

/* ---------- columnas ---------- */

export function addColumn(columns: Column[], input: { name: string; type: ColumnType }): Column[] {
  const column: Column = { id: newId("col"), name: input.name.trim(), type: input.type };
  if (input.type === "select") column.options = [];
  return [...columns, column];
}

export function renameColumn(columns: Column[], id: string, name: string): Column[] {
  return columns.map((column) => (column.id === id ? { ...column, name: name.trim() } : column));
}

export function removeColumn(columns: Column[], id: string): Column[] {
  return columns.filter((column) => column.id !== id);
}

/** Quita `columnId` de los valores de una fila. */
export function withoutRowValue(properties: Properties, columnId: string): Properties {
  return withRowValue(properties, columnId, undefined);
}

export function addOption(column: Column, label: string): { column: Column; option: SelectOption } {
  const option = { id: newId("opt"), label: label.trim() };
  return { column: { ...column, options: [...(column.options ?? []), option] }, option };
}

export function renameOption(column: Column, optionId: string, label: string): Column {
  return {
    ...column,
    options: (column.options ?? []).map((option) =>
      option.id === optionId ? { ...option, label: label.trim() } : option,
    ),
  };
}

export function removeOption(column: Column, optionId: string): Column {
  return { ...column, options: (column.options ?? []).filter((option) => option.id !== optionId) };
}

export function optionLabel(column: Column, optionId: unknown): string | undefined {
  return column.options?.find((option) => option.id === optionId)?.label;
}

/* ---------- cambio de tipo ---------- */

export function parseNumber(text: string): number | undefined {
  const cleaned = text.trim().replace(",", ".");
  if (cleaned === "") return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

const TRUE_WORDS = new Set(["sí", "si", "yes", "true", "x", "1", "verdadero"]);

function parseDate(text: string): string | undefined {
  const trimmed = text.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(trimmed);
  if (!match) return undefined;
  const [, d, m, y] = match;
  const day = Number(d);
  const month = Number(m);
  if (day < 1 || day > 31 || month < 1 || month > 12) return undefined;
  return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** El valor como texto legible (para pasar a otro tipo o buscar). */
export function valueAsText(column: Column, value: CellValue | undefined): string {
  if (value === undefined) return "";
  if (column.type === "select") return optionLabel(column, value) ?? "";
  if (column.type === "checkbox") return value === true ? "Sí" : "";
  return String(value);
}

/**
 * Convierte un valor al nuevo tipo; `undefined` = no se puede (se pierde).
 * Para `select` de destino, `optionByLabel` mapea etiqueta → id de opción.
 */
export function convertValue(
  column: Column,
  value: CellValue | undefined,
  to: ColumnType,
  optionByLabel: ReadonlyMap<string, string>,
): CellValue | undefined {
  if (value === undefined || isEmptyValue(value)) return undefined;
  const text = valueAsText(column, value);
  switch (to) {
    case "text":
    case "url":
      return text === "" ? undefined : text;
    case "number":
      if (column.type === "checkbox") return value === true ? 1 : undefined;
      return parseNumber(text);
    case "checkbox":
      if (column.type === "number") return value === 1 ? true : undefined;
      return TRUE_WORDS.has(text.trim().toLocaleLowerCase()) ? true : undefined;
    case "date":
      return column.type === "text" || column.type === "url" || column.type === "select"
        ? parseDate(text)
        : undefined;
    case "select":
      return optionByLabel.get(text.trim().toLocaleLowerCase());
  }
}

export interface TypeChangePlan {
  column: Column;
  /** Nuevo valor por fila (solo las filas que tenían valor); `undefined` = se pierde. */
  values: Map<string, CellValue | undefined>;
  /** Cuántos valores no se pueden convertir y se perderán. */
  lost: number;
}

/**
 * Calcula el cambio de tipo de una columna sobre los valores actuales.
 * Al pasar a `select` se crean opciones con los valores distintos que había
 * (o se conservan las ya existentes si la columna ya era `select`).
 */
export function planTypeChange(
  column: Column,
  to: ColumnType,
  rows: ReadonlyArray<{ id: string; values: RowValues }>,
): TypeChangePlan {
  const next: Column = { id: column.id, name: column.name, type: to };
  const optionByLabel = new Map<string, string>();

  if (to === "select") {
    next.options = [];
    for (const row of rows) {
      const raw = row.values[column.id];
      if (raw === undefined) continue;
      const label = valueAsText(column, raw).trim();
      const key = label.toLocaleLowerCase();
      if (label === "" || optionByLabel.has(key)) continue;
      const existing = column.options?.find((option) => option.label === label);
      const option = existing ?? { id: newId("opt"), label };
      next.options.push(option);
      optionByLabel.set(key, option.id);
    }
  }

  const values = new Map<string, CellValue | undefined>();
  let lost = 0;
  for (const row of rows) {
    const raw = row.values[column.id];
    if (raw === undefined) continue;
    const converted = convertValue(column, raw, to, optionByLabel);
    values.set(row.id, converted);
    if (converted === undefined) lost += 1;
  }
  return { column: next, values, lost };
}

/* ---------- ordenar y filtrar ---------- */

export interface RowLike {
  id: string;
  title: string;
  sortOrder: number;
  createdAt: string;
  properties: Properties;
}

/** Orden manual: sort_order, luego antigüedad. */
export function compareManual(a: RowLike, b: RowLike): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.id < b.id ? -1 : 1;
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, "es", { sensitivity: "base", numeric: true });
}

/**
 * Filas ordenadas por una columna. Las celdas vacías van siempre al final
 * (también en descendente). Estable: empata por orden manual.
 */
export function sortRows<T extends RowLike>(
  rows: readonly T[],
  columns: readonly Column[],
  sort: SortSpec | undefined,
): T[] {
  const manual = [...rows].sort(compareManual);
  if (!sort) return manual;
  const column = sort.columnId === TITLE_COLUMN ? undefined : columns.find((c) => c.id === sort.columnId);
  if (sort.columnId !== TITLE_COLUMN && !column) return manual;
  const sign = sort.dir === "asc" ? 1 : -1;

  const key = (row: T): CellValue | undefined => {
    if (!column) return row.title.trim() === "" ? undefined : row.title;
    const value = readValues(row.properties)[column.id];
    if (value === undefined) return undefined;
    if (column.type === "select") {
      const index = (column.options ?? []).findIndex((option) => option.id === value);
      return index === -1 ? undefined : index;
    }
    if (column.type === "checkbox") return value === true ? 1 : undefined;
    return value;
  };

  const decorated = manual.map((row, index) => ({ row, index, value: key(row) }));
  decorated.sort((a, b) => {
    if (a.value === undefined || b.value === undefined) {
      if (a.value === b.value) return a.index - b.index;
      return a.value === undefined ? 1 : -1;
    }
    const result =
      typeof a.value === "number" && typeof b.value === "number"
        ? a.value - b.value
        : compareText(String(a.value), String(b.value));
    return result === 0 ? a.index - b.index : result * sign;
  });
  return decorated.map((item) => item.row);
}

/** Filtra por texto del título y por el valor de una columna `select` o `checkbox`. */
export function filterRows<T extends RowLike>(
  rows: readonly T[],
  columns: readonly Column[],
  options: { query?: string; filter?: FilterSpec },
): T[] {
  const needle = (options.query ?? "").trim().toLocaleLowerCase();
  const filter = options.filter;
  const column = filter ? columns.find((c) => c.id === filter.columnId) : undefined;
  const activeFilter = filter && column && (column.type === "select" || column.type === "checkbox");

  return rows.filter((row) => {
    if (needle !== "" && !row.title.toLocaleLowerCase().includes(needle)) return false;
    if (activeFilter) {
      const value = readValues(row.properties)[column.id];
      if (column.type === "checkbox") return (value === true) === (filter.value === "true");
      return filter.value === "" ? value === undefined : value === filter.value;
    }
    return true;
  });
}

/** Recuento de filas por opción de una columna `select` (+ sin valor). */
export function countByOption(
  rows: readonly RowLike[],
  column: Column,
): { option: SelectOption; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = readValues(row.properties)[column.id];
    if (typeof value === "string") counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return (column.options ?? []).map((option) => ({ option, count: counts.get(option.id) ?? 0 }));
}

/* ---------- plantillas ---------- */

export interface CollectionTemplate {
  id: string;
  name: string;
  description: string;
  icon?: string;
  /** Título por defecto de la colección. */
  title: string;
  columns: ReadonlyArray<{ name: string; type: ColumnType; options?: readonly string[] }>;
}

/** Para añadir una plantilla, basta una entrada más aquí. */
export const COLLECTION_TEMPLATES: readonly CollectionTemplate[] = [
  {
    id: "empty",
    name: "Vacía",
    description: "Solo el título; añade tú las columnas.",
    title: "",
    columns: [],
  },
  {
    id: "books",
    name: "Lista de libros",
    description: "Autor, estado de lectura, valoración y fuente.",
    title: "Libros",
    columns: [
      { name: "Autor", type: "text" },
      { name: "Estado", type: "select", options: ["Por leer", "Leyendo", "Leído"] },
      { name: "Valoración", type: "number" },
      { name: "Fuente", type: "url" },
    ],
  },
];

/** Columnas nuevas (con ids propios) a partir de una plantilla. */
export function columnsFromTemplate(template: CollectionTemplate): Column[] {
  return template.columns.map((spec) => {
    const column: Column = { id: newId("col"), name: spec.name, type: spec.type };
    if (spec.type === "select") {
      column.options = (spec.options ?? []).map((label) => ({ id: newId("opt"), label }));
    }
    return column;
  });
}

/* ---------- enlaces ---------- */

/** Dirección abrible de un valor `url` (añade https:// si falta). */
export function normalizeUrl(value: string): string | null {
  const text = value.trim();
  if (text === "" || /\s/.test(text)) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** "2026-11-10" → "10 nov 2026" (sin pasar por zonas horarias). */
export function formatDateValue(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}
