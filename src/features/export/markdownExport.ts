/**
 * Exportación a Markdown: funciones PURAS que convierten los datos de la app
 * en una lista `{ path, content }[]` (rutas relativas con `/`). Escribirlos en
 * disco es cosa del comando de Rust `export_files`.
 *
 * Estructura generada:
 *   Páginas/…            una carpeta por página con subpáginas; colecciones con `_Índice.md`
 *   Tareas.md
 *   Listas/<nombre>.md
 *   Habitos.md
 */
import type { Habit } from "@/features/habits/types";
import { pageCategory, pageTitle, type Page } from "@/features/pages/types";
import {
  readColumns,
  readValues,
  sortRows,
  valueAsText,
  type CellValue,
  type Column,
} from "@/features/pages/utils/collection";
import { comparePages } from "@/features/pages/utils/pageTree";
import { plainTextToMarkdown } from "@/features/pages/utils/plainTextToMarkdown";
import type { Roadmap, RoadmapItem, RoadmapSection } from "@/features/roadmap/types";
import { PRIORITY_LABELS, type TodoItem } from "@/features/todos/types";

export interface ExportFile {
  /** Ruta relativa con `/`, sin `..` ni componentes vacíos. */
  path: string;
  content: string;
}

export interface ExportList {
  roadmap: Roadmap;
  sections: RoadmapSection[];
  items: RoadmapItem[];
}

export interface ExportData {
  /** Todas las páginas; las de la papelera se ignoran. */
  pages: Page[];
  todos: TodoItem[];
  lists: ExportList[];
  habits: Habit[];
}

/* ---------- nombres de archivo ---------- */

export const MAX_FILE_NAME = 80;
const FORBIDDEN_CHARS = /[/\\:*?"<>|\u0000-\u001f\u007f]/g;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * Nombre de archivo seguro (sin extensión): sin `/ \ : * ? " < > |` ni
 * caracteres de control, sin puntos iniciales ni finales, sin espacios
 * repetidos y de longitud acotada. Si no queda nada, `fallback`.
 */
export function sanitizeFileName(
  name: string,
  fallback = "Sin título",
  maxLength = MAX_FILE_NAME,
): string {
  let clean = name.replace(FORBIDDEN_CHARS, " ").replace(/\s+/g, " ").trim();
  clean = clean.replace(/^[.\s]+/, "");
  // Se corta por puntos de código para no partir un emoji.
  clean = Array.from(clean).slice(0, maxLength).join("");
  clean = clean.replace(/[.\s]+$/, "");
  if (clean === "") return fallback;
  return WINDOWS_RESERVED.test(clean) ? `${clean}_` : clean;
}

/**
 * Nombre que no choca con los ya usados (sin distinguir mayúsculas, porque
 * macOS y Windows tampoco las distinguen): añade " 2", " 3"… Lo registra.
 */
export function uniqueName(base: string, used: Set<string>): string {
  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` ${n}`;
    candidate = `${Array.from(base).slice(0, Math.max(1, MAX_FILE_NAME - suffix.length)).join("")}${suffix}`;
    n += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

/* ---------- piezas de Markdown / YAML ---------- */

/** Cadena YAML entre comillas dobles (JSON es un subconjunto válido). */
export function yamlString(value: string): string {
  return JSON.stringify(value);
}

type YamlValue = string | number | boolean | { [key: string]: YamlValue } | null | undefined;

function yamlLines(entries: [string, YamlValue][], indent = ""): string[] {
  const lines: string[] = [];
  for (const [key, value] of entries) {
    if (value === undefined || value === null) continue;
    if (typeof value === "object") {
      const inner = yamlLines(Object.entries(value), `${indent}  `);
      if (inner.length === 0) continue;
      lines.push(`${indent}${yamlString(key)}:`, ...inner);
    } else {
      const scalar = typeof value === "string" ? yamlString(value) : String(value);
      lines.push(`${indent}${yamlString(key)}: ${scalar}`);
    }
  }
  return lines;
}

/** Cabecera YAML. Las claves de primer nivel son simples (sin comillas). */
function frontMatter(top: [string, YamlValue][], properties?: Record<string, YamlValue>): string {
  const lines: string[] = ["---"];
  for (const [key, value] of top) {
    if (value === undefined || value === null || value === "") continue;
    // Las fechas ISO van sin comillas (YAML las lee como fecha); el resto, como cadena.
    lines.push(`${key}: ${typeof value === "string" && !RAW_KEYS.has(key) ? yamlString(value) : String(value)}`);
  }
  if (properties && Object.keys(properties).length > 0) {
    lines.push("propiedades:", ...yamlLines(Object.entries(properties), "  "));
  }
  lines.push("---");
  return lines.join("\n");
}

const RAW_KEYS = new Set(["creado", "editado"]);

/** Texto en una sola línea (para títulos, celdas y metadatos). */
function oneLine(text: string): string {
  return text.replace(/\s*\r?\n\s*/g, " ").trim();
}

/** Escapa lo que rompería un enlace `[texto](…)`. */
function linkText(text: string): string {
  return oneLine(text).replace(/([[\]\\])/g, "\\$1");
}

/** Ruta relativa lista para un enlace Markdown. */
export function linkPath(path: string): string {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part).replace(/\(/g, "%28").replace(/\)/g, "%29"))
    .join("/");
}

function tableCell(text: string): string {
  return oneLine(text).replace(/\|/g, "\\|");
}

function indentBlock(text: string, spaces = 2): string {
  const pad = " ".repeat(spaces);
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => (line.trim() === "" ? "" : pad + line))
    .join("\n");
}

function joinBlocks(blocks: string[]): string {
  return `${blocks.filter((block) => block.trim() !== "").join("\n\n")}\n`;
}

/** Cuerpo de una página en Markdown (las notas antiguas, en texto plano, se convierten). */
function bodyOf(page: Pick<Page, "content" | "contentFormat">): string {
  const body = page.contentFormat === "plain" ? plainTextToMarkdown(page.content) : page.content;
  return body.replace(/\s+$/, "");
}

/* ---------- páginas ---------- */

function cellYaml(column: Column, value: CellValue | undefined): YamlValue {
  if (value === undefined || value === "") return undefined;
  if (column.type === "number" && typeof value === "number") return value;
  if (column.type === "checkbox") return value === true;
  const text = valueAsText(column, value);
  return text === "" ? undefined : text;
}

/** Una página normal, con su cabecera YAML. */
export function pageToMarkdown(page: Page): string {
  const head = frontMatter([
    ["titulo", pageTitle(page)],
    ["creado", page.createdAt],
    ["editado", page.updatedAt],
    ["categoria", pageCategory(page)],
  ]);
  return joinBlocks([head, bodyOf(page)]);
}

/** Una fila de colección: sus propiedades van en la cabecera YAML. */
export function rowToMarkdown(row: Page, collection: Page): string {
  const columns = readColumns(collection.properties);
  const values = readValues(row.properties);
  const properties: Record<string, YamlValue> = {};
  for (const column of columns) {
    const value = cellYaml(column, values[column.id]);
    if (value !== undefined) properties[column.name || "Sin nombre"] = value;
  }
  const head = frontMatter(
    [
      ["titulo", pageTitle(row)],
      ["coleccion", pageTitle(collection)],
      ["creado", row.createdAt],
      ["editado", row.updatedAt],
      ["categoria", pageCategory(row)],
    ],
    properties,
  );
  return joinBlocks([head, bodyOf(row)]);
}

/**
 * Índice de una colección: su descripción y una tabla con todas las filas y
 * columnas. `rowFiles` da el nombre de archivo (en la misma carpeta) de cada
 * fila para enlazarla; sin él, el título va en texto plano.
 */
export function collectionIndexToMarkdown(
  collection: Page,
  rows: readonly Page[],
  rowFiles?: ReadonlyMap<string, string>,
): string {
  const columns = readColumns(collection.properties);
  const ordered = sortRows([...rows], columns, undefined);

  const head = frontMatter([
    ["titulo", pageTitle(collection)],
    ["tipo", "coleccion"],
    ["creado", collection.createdAt],
    ["editado", collection.updatedAt],
  ]);

  const headers = ["Título", ...columns.map((column) => column.name || "Sin nombre")];
  const lines = [
    `| ${headers.map(tableCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
  ];
  for (const row of ordered) {
    const values = readValues(row.properties);
    const file = rowFiles?.get(row.id);
    const title = file ? `[${linkText(pageTitle(row))}](${linkPath(file)})` : tableCell(pageTitle(row));
    const cells = columns.map((column) => tableCell(valueAsText(column, values[column.id])));
    lines.push(`| ${[title, ...cells].join(" | ")} |`);
  }
  const table = ordered.length === 0 ? "_Esta colección no tiene elementos._" : lines.join("\n");

  return joinBlocks([head, `# ${oneLine(pageTitle(collection))}`, bodyOf(collection), table]);
}

/** Nombre del índice dentro de la carpeta de una colección. */
export const COLLECTION_INDEX_FILE = "_Índice.md";

interface PageLayout {
  files: ExportFile[];
  /** Ruta del `.md` de cada página (el índice, en las colecciones). */
  pathOf: Map<string, string>;
}

/** Reparte las páginas activas en carpetas y archivos. */
function layoutPages(allPages: readonly Page[], rootDir: string): PageLayout {
  const active = allPages.filter((page) => page.deletedAt === null);
  const ids = new Set(active.map((page) => page.id));
  const childrenOf = new Map<string | null, Page[]>();
  for (const page of active) {
    // Una página cuya madre no está activa cuelga de la raíz.
    const key = page.parentId !== null && ids.has(page.parentId) ? page.parentId : null;
    const list = childrenOf.get(key) ?? [];
    list.push(page);
    childrenOf.set(key, list);
  }
  const byId = new Map(active.map((page) => [page.id, page]));

  const files: ExportFile[] = [];
  const pathOf = new Map<string, string>();

  const emit = (parentKey: string | null, dir: string, reserved: string[] = []) => {
    const siblings = [...(childrenOf.get(parentKey) ?? [])].sort(comparePages);
    const used = new Set(reserved.map((name) => name.toLowerCase()));
    const names = new Map<string, string>();
    for (const page of siblings) {
      names.set(page.id, uniqueName(sanitizeFileName(pageTitle(page)), used));
    }

    for (const page of siblings) {
      const name = names.get(page.id)!;
      const base = dir === "" ? name : `${dir}/${name}`;
      const children = childrenOf.get(page.id) ?? [];

      if (page.kind === "collection") {
        const indexPath = `${base}/${COLLECTION_INDEX_FILE}`;
        pathOf.set(page.id, indexPath);
        // Los nombres de archivo de las filas, para enlazarlas desde el índice.
        const rowNames = new Map<string, string>();
        const rowUsed = new Set([COLLECTION_INDEX_FILE.replace(/\.md$/, "").toLowerCase()]);
        const sortedRows = [...children].sort(comparePages);
        for (const row of sortedRows) {
          rowNames.set(row.id, `${uniqueName(sanitizeFileName(pageTitle(row)), rowUsed)}.md`);
        }
        files.push({
          path: indexPath,
          content: collectionIndexToMarkdown(page, children, rowNames),
        });
        emitRows(page, sortedRows, base, rowNames);
      } else {
        const path = `${base}.md`;
        pathOf.set(page.id, path);
        const parent = page.parentId === null ? undefined : byId.get(page.parentId);
        const isRow = parent?.kind === "collection";
        files.push({
          path,
          content: isRow ? rowToMarkdown(page, parent) : pageToMarkdown(page),
        });
        if (children.length > 0) emit(page.id, base);
      }
    }
  };

  /** Filas de una colección: nombres ya reservados por el índice. */
  const emitRows = (
    collection: Page,
    rows: readonly Page[],
    dir: string,
    rowNames: ReadonlyMap<string, string>,
  ) => {
    for (const row of rows) {
      const file = rowNames.get(row.id)!;
      const path = `${dir}/${file}`;
      pathOf.set(row.id, path);
      files.push({ path, content: rowToMarkdown(row, collection) });
      const children = childrenOf.get(row.id) ?? [];
      if (children.length > 0) emit(row.id, `${dir}/${file.replace(/\.md$/, "")}`);
    }
  };

  emit(null, rootDir);
  return { files, pathOf };
}

/** Markdown de UNA página (para "Exportar como Markdown…") y su nombre de archivo. */
export function singlePageToMarkdown(
  page: Page,
  allPages: readonly Page[],
): { fileName: string; content: string } {
  const fileName = `${sanitizeFileName(pageTitle(page))}.md`;
  if (page.kind === "collection") {
    const rows = allPages.filter((row) => row.parentId === page.id && row.deletedAt === null);
    return { fileName, content: collectionIndexToMarkdown(page, rows) };
  }
  const parent = page.parentId === null ? undefined : allPages.find((p) => p.id === page.parentId);
  const isRow = parent?.kind === "collection" && parent.deletedAt === null;
  return { fileName, content: isRow ? rowToMarkdown(page, parent) : pageToMarkdown(page) };
}

/* ---------- tareas ---------- */

function taskLine(
  todo: TodoItem,
  pages: ReadonlyMap<string, Page>,
  pathOf: ReadonlyMap<string, string>,
): string {
  const meta: string[] = [];
  if (todo.dueDate) meta.push(`vence ${todo.dueDate}`);
  if (todo.priority > 0) meta.push(`prioridad ${PRIORITY_LABELS[todo.priority].toLowerCase()}`);
  const page = todo.pageId ? pages.get(todo.pageId) : undefined;
  const pagePath = page ? pathOf.get(page.id) : undefined;
  if (page && pagePath) meta.push(`página: [${linkText(pageTitle(page))}](${linkPath(pagePath)})`);
  if (todo.completed && todo.completedAt) meta.push(`completada ${todo.completedAt.slice(0, 10)}`);

  const box = todo.completed ? "[x]" : "[ ]";
  const line = `- ${box} ${oneLine(todo.title)}${meta.length > 0 ? ` — ${meta.join(" · ")}` : ""}`;
  return todo.notes ? `${line}\n${indentBlock(todo.notes)}` : line;
}

export function tasksToMarkdown(
  todos: readonly TodoItem[],
  pages: readonly Page[],
  pathOf: ReadonlyMap<string, string>,
): string {
  const byId = new Map(pages.map((page) => [page.id, page]));
  const section = (title: string, list: readonly TodoItem[], empty: string) =>
    `## ${title}\n\n${list.length === 0 ? empty : list.map((todo) => taskLine(todo, byId, pathOf)).join("\n")}`;
  return joinBlocks([
    "# Tareas",
    section("Pendientes", todos.filter((todo) => !todo.completed), "_No hay tareas pendientes._"),
    section("Completadas", todos.filter((todo) => todo.completed), "_No hay tareas completadas._"),
  ]);
}

/* ---------- listas ---------- */

function itemLine(item: RoadmapItem): string {
  let line = `- ${item.completed ? "[x]" : "[ ]"} **${oneLine(item.title)}**`;
  if (item.type) line += ` _(${oneLine(item.type)})_`;
  if (item.url) line += ` — [enlace](<${item.url.trim()}>)`;
  const extra: string[] = [];
  if (item.description) extra.push(indentBlock(item.description));
  if (item.notes) extra.push(indentBlock(`**Notas:** ${item.notes}`));
  return extra.length > 0 ? `${line}\n\n${extra.join("\n\n")}\n` : line;
}

export function listToMarkdown({ roadmap, sections, items }: ExportList): string {
  const blocks: string[] = [`# ${oneLine(roadmap.title)}`];
  if (roadmap.description) blocks.push(roadmap.description.trim());

  const placed = new Set<string>();
  const groups: { name: string; items: RoadmapItem[] }[] = [];
  for (const section of [...sections].sort((a, b) => a.order - b.order)) {
    const own = items
      .filter((item) => item.sectionId === section.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    own.forEach((item) => placed.add(item.id));
    groups.push({ name: section.name, items: own });
  }
  // Items cuya sección ya no existe: se agrupan por el nombre que guardan.
  const orphans = items.filter((item) => !placed.has(item.id));
  for (const name of [...new Set(orphans.map((item) => item.section || "Sin sección"))]) {
    groups.push({
      name,
      items: orphans.filter((item) => (item.section || "Sin sección") === name),
    });
  }

  for (const group of groups) {
    blocks.push(
      `## ${oneLine(group.name)}\n\n${
        group.items.length === 0 ? "_Sin items._" : group.items.map(itemLine).join("\n")
      }`,
    );
  }
  return joinBlocks(blocks);
}

/* ---------- hábitos ---------- */

const HABIT_TYPE_LABEL: Record<Habit["type"], string> = {
  check: "Hecho / no hecho",
  count: "Contador",
  duration: "Duración",
};

export function habitsToMarkdown(habits: readonly Habit[]): string {
  const lines = [
    "| Hábito | Tipo | Objetivo diario | Categoría | Estado |",
    "| --- | --- | --- | --- | --- |",
    ...habits.map((habit) => {
      const target = habit.type === "check" ? "—" : `${habit.target} ${habit.unit}`;
      return `| ${[
        tableCell(habit.name),
        HABIT_TYPE_LABEL[habit.type],
        target,
        habit.category ?? "—",
        habit.active ? "Activo" : "Pausado",
      ].join(" | ")} |`;
    }),
  ];
  return joinBlocks([
    "# Hábitos",
    "Definición de cada hábito. Los registros diarios no se incluyen en esta exportación (están en el backup JSON).",
    habits.length === 0 ? "_No hay hábitos._" : lines.join("\n"),
  ]);
}

/* ---------- todo ---------- */

export const PAGES_DIR = "Páginas";

/**
 * Genera todos los archivos de la exportación. Los nombres de archivo van
 * saneados y sin colisiones; los enlaces entre archivos son relativos a la
 * raíz de la exportación.
 */
export function buildMarkdownExport(data: ExportData): ExportFile[] {
  const layout = layoutPages(data.pages, PAGES_DIR);
  const files: ExportFile[] = [...layout.files];

  files.push({
    path: "Tareas.md",
    content: tasksToMarkdown(data.todos, data.pages, layout.pathOf),
  });

  const listNames = new Set<string>();
  for (const list of data.lists) {
    const name = uniqueName(sanitizeFileName(list.roadmap.title, "Lista"), listNames);
    files.push({ path: `Listas/${name}.md`, content: listToMarkdown(list) });
  }

  files.push({ path: "Habitos.md", content: habitsToMarkdown(data.habits) });
  return files;
}

/** Un único Markdown con todos los archivos (modo navegador, sin carpetas). */
export function concatenateExport(files: readonly ExportFile[]): string {
  return files
    .map((file) => `<!-- ===== ${file.path} ===== -->\n\n${file.content.trimEnd()}\n`)
    .join("\n\n");
}
