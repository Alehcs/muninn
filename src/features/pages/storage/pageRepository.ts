import { createId } from "@/lib/ids";
import { runBatch, type BatchStatement } from "@/lib/db/batch";
import { getDatabase } from "@/lib/db/database";
import type { ContentFormat, Page, PageKind } from "../types";
import {
  addColumn,
  addOption,
  columnsFromTemplate,
  mergeProperties,
  parseProperties,
  planTypeChange,
  readColumns,
  readValues,
  readView,
  removeColumn,
  removeOption,
  renameColumn,
  renameOption,
  withColumns,
  withRowValue,
  withView,
  withoutRowValue,
  type CellValue,
  type CollectionTemplate,
  type Column,
  type ColumnType,
  type Properties,
  type ViewSpec,
} from "../utils/collection";

interface PageRow {
  id: string;
  parent_id: string | null;
  title: string;
  icon: string | null;
  content: string;
  content_format: string;
  kind: string;
  properties: string;
  pinned: number;
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS = `id, parent_id, title, icon, content, content_format, kind,
  properties, pinned, sort_order, deleted_at, created_at, updated_at`;

function toPage(row: PageRow): Page {
  return {
    id: row.id,
    parentId: row.parent_id,
    title: row.title,
    icon: row.icon ?? undefined,
    content: row.content,
    contentFormat: row.content_format === "plain" ? "plain" : "markdown",
    kind: row.kind as PageKind,
    properties: parseProperties(row.properties),
    pinned: row.pinned === 1,
    sortOrder: row.sort_order,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Todas las páginas, activas y en la papelera (la vista las separa). */
export async function listPages(): Promise<Page[]> {
  const db = await getDatabase();
  const rows = await db.select<PageRow[]>(
    `SELECT ${COLUMNS} FROM pages ORDER BY sort_order ASC, created_at ASC, id ASC`,
  );
  return rows.map(toPage);
}

export async function getPage(id: string): Promise<Page | null> {
  const db = await getDatabase();
  const rows = await db.select<PageRow[]>(
    `SELECT ${COLUMNS} FROM pages WHERE id = $1`,
    [id],
  );
  return rows[0] ? toPage(rows[0]) : null;
}

export interface NewPageInput {
  parentId?: string | null;
  title?: string;
  content?: string;
  kind?: PageKind;
  properties?: Properties;
  icon?: string;
}

/** Crea una página al final de sus hermanas. Las páginas nuevas son Markdown. */
export async function createPage(input: NewPageInput = {}): Promise<Page> {
  const now = new Date().toISOString();
  const id = createId("page");
  const parentId = input.parentId ?? null;
  const title = input.title ?? "";
  const content = input.content ?? "";
  const kind = input.kind ?? "page";
  const properties = input.properties ?? {};
  const icon = input.icon ?? null;

  await runBatch([
    {
      sql: `INSERT INTO pages
              (id, parent_id, title, icon, content, content_format, kind,
               properties, pinned, sort_order, deleted_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, 'markdown', $6, $7, 0,
                    COALESCE((SELECT MAX(sort_order) + 1 FROM pages WHERE parent_id IS $2), 0),
                    NULL, $8, $8)`,
      // Los parámetros aparecen por primera vez en orden ($1…$8): Tauri los enlaza por posición.
      params: [id, parentId, title, icon, content, kind, JSON.stringify(properties), now],
    },
  ]);

  // Se vuelve a leer para devolver el `sort_order` que asignó la base.
  const stored = await getPage(id);
  if (stored) return stored;
  return {
    id,
    parentId,
    title,
    icon: icon ?? undefined,
    content,
    contentFormat: "markdown",
    kind,
    properties,
    pinned: false,
    sortOrder: 0,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export interface SavedContent {
  updatedAt: string;
  contentFormat: ContentFormat;
}

/**
 * Guarda el cuerpo (Markdown). Es lo único que pasa la página a
 * `content_format = 'markdown'`; llamarla es siempre una edición real.
 */
export async function savePageContent(
  id: string,
  markdown: string,
): Promise<SavedContent> {
  const db = await getDatabase();
  const updatedAt = new Date().toISOString();
  await db.execute(
    `UPDATE pages
        SET content = $1, content_format = 'markdown', updated_at = $2
      WHERE id = $3`,
    [markdown, updatedAt, id],
  );
  return { updatedAt, contentFormat: "markdown" };
}

export async function savePageTitle(id: string, title: string): Promise<string> {
  const db = await getDatabase();
  const updatedAt = new Date().toISOString();
  await db.execute(`UPDATE pages SET title = $1, updated_at = $2 WHERE id = $3`, [
    title,
    updatedAt,
    id,
  ]);
  return updatedAt;
}

export async function savePageIcon(id: string, icon: string | null): Promise<void> {
  const db = await getDatabase();
  await db.execute(`UPDATE pages SET icon = $1, updated_at = $2 WHERE id = $3`, [
    icon,
    new Date().toISOString(),
    id,
  ]);
}

/** Escribe (o quita, si está vacía) la categoría en `properties.categoria`. */
export async function savePageCategory(
  id: string,
  category: string,
): Promise<Record<string, unknown>> {
  const db = await getDatabase();
  const rows = await db.select<{ properties: string }[]>(
    `SELECT properties FROM pages WHERE id = $1`,
    [id],
  );
  const properties = parseProperties(rows[0]?.properties ?? "{}");
  const trimmed = category.trim();
  if (trimmed === "") delete properties.categoria;
  else properties.categoria = trimmed;

  await db.execute(`UPDATE pages SET properties = $1, updated_at = $2 WHERE id = $3`, [
    JSON.stringify(properties),
    new Date().toISOString(),
    id,
  ]);
  return properties;
}

/** Fijar/soltar no cuenta como edición de contenido: no toca `updated_at`. */
export async function setPagePinned(id: string, pinned: boolean): Promise<void> {
  const db = await getDatabase();
  await db.execute(`UPDATE pages SET pinned = $1 WHERE id = $2`, [pinned ? 1 : 0, id]);
}

/** Ids de la página y todos sus descendientes (cualquiera que sea su estado). */
const SUBTREE_CTE = `WITH RECURSIVE subtree(id) AS (
    SELECT id FROM pages WHERE id = $1
    UNION
    SELECT pages.id FROM pages JOIN subtree ON pages.parent_id = subtree.id
  )`;

/** ¿`candidateId` es `pageId` o está dentro de su subárbol? */
export async function isInSubtree(
  pageId: string,
  candidateId: string,
): Promise<boolean> {
  const db = await getDatabase();
  const rows = await db.select<{ id: string }[]>(
    `${SUBTREE_CTE} SELECT id FROM subtree WHERE id = $2`,
    [pageId, candidateId],
  );
  return rows.length > 0;
}

/** Mueve una página bajo otra (o a la raíz con `null`). Rechaza los ciclos. */
export async function movePage(id: string, newParentId: string | null): Promise<void> {
  if (newParentId !== null && (await isInSubtree(id, newParentId))) {
    throw new Error("Una página no puede moverse dentro de sí misma.");
  }
  if (newParentId !== null) {
    // Dentro de una colección solo viven filas: una página normal no puede entrar.
    const [moving, target] = await Promise.all([getPage(id), getPage(newParentId)]);
    if (target?.kind === "collection") {
      const parent = moving?.parentId ? await getPage(moving.parentId) : null;
      const isRow = parent?.kind === "collection" && parent.deletedAt === null;
      if (!moving || moving.kind === "collection" || !isRow) {
        throw new Error("Una página normal no puede moverse dentro de una colección.");
      }
    }
  }
  await runBatch([
    {
      // Los parámetros aparecen en orden ($1, $2): el plugin de Tauri los enlaza por posición.
      sql: `UPDATE pages
               SET parent_id = $1,
                   sort_order = COALESCE(
                     (SELECT MAX(sort_order) + 1 FROM pages WHERE parent_id IS $1), 0)
             WHERE id = $2`,
      params: [newParentId, id],
    },
  ]);
}

/**
 * Envía a la papelera la página y todos sus descendientes activos con la
 * MISMA marca de tiempo (así `restorePage` sabe cuáles se fueron con ella).
 * Devuelve esa marca.
 */
export async function trashPage(id: string): Promise<string> {
  const deletedAt = new Date().toISOString();
  await runBatch([
    {
      sql: `${SUBTREE_CTE}
            UPDATE pages SET deleted_at = $2
             WHERE id IN (SELECT id FROM subtree) AND deleted_at IS NULL`,
      params: [id, deletedAt],
    },
  ]);
  return deletedAt;
}

/**
 * Restaura la página y los descendientes que se fueron con ella (misma marca).
 * Si su madre sigue en la papelera (o ya no existe), vuelve a la raíz.
 */
export async function restorePage(id: string): Promise<void> {
  const db = await getDatabase();
  const rows = await db.select<{ deleted_at: string | null; parent_id: string | null }[]>(
    `SELECT deleted_at, parent_id FROM pages WHERE id = $1`,
    [id],
  );
  const target = rows[0];
  if (!target || target.deleted_at === null) return;

  const statements: BatchStatement[] = [];
  if (target.parent_id !== null) {
    statements.push({
      sql: `UPDATE pages SET parent_id = NULL
             WHERE id = $1
               AND NOT EXISTS (SELECT 1 FROM pages AS parent
                                WHERE parent.id = $2 AND parent.deleted_at IS NULL)`,
      params: [id, target.parent_id],
    });
  }
  statements.push({
    sql: `${SUBTREE_CTE}
          UPDATE pages SET deleted_at = NULL
           WHERE id IN (SELECT id FROM subtree) AND deleted_at = $2`,
    params: [id, target.deleted_at],
  });
  await runBatch(statements);
}

/**
 * Borra de verdad una página que YA está en la papelera, con los descendientes
 * que también están en ella. Una descendiente activa (p. ej. movida después)
 * no se borra: sube a la raíz. Sobre una página activa no hace nada. Las
 * tareas enlazadas no se borran: pasan a `page_id = NULL`.
 */
export async function deletePagePermanently(id: string): Promise<void> {
  const db = await getDatabase();
  const rows = await db.select<{ deleted_at: string | null }[]>(
    `SELECT deleted_at FROM pages WHERE id = $1`,
    [id],
  );
  if (!rows[0] || rows[0].deleted_at === null) return;

  await runBatch([
    {
      sql: `${SUBTREE_CTE}
            UPDATE pages SET parent_id = NULL
             WHERE deleted_at IS NULL
               AND parent_id IN (SELECT id FROM subtree WHERE id IN
                                 (SELECT id FROM pages WHERE deleted_at IS NOT NULL))`,
      params: [id],
    },
    {
      // Las tareas de las páginas que se borran no se pierden: se quedan sin página.
      sql: `${SUBTREE_CTE}
            UPDATE todo_items SET page_id = NULL
             WHERE page_id IN (SELECT id FROM subtree WHERE id IN
                               (SELECT id FROM pages WHERE deleted_at IS NOT NULL))`,
      params: [id],
    },
    {
      sql: `${SUBTREE_CTE}
            DELETE FROM pages
             WHERE id IN (SELECT id FROM subtree) AND deleted_at IS NOT NULL`,
      params: [id],
    },
  ]);
}

/* ------------------------------------------------------------------ */
/* Colecciones                                                         */
/* ------------------------------------------------------------------ */

/** Crea una colección (con las columnas de la plantilla, si hay) al final de sus hermanas. */
export async function createCollection(
  input: { parentId?: string | null; template?: CollectionTemplate } = {},
): Promise<Page> {
  const template = input.template;
  return createPage({
    parentId: input.parentId ?? null,
    title: template?.title ?? "",
    icon: template?.icon,
    kind: "collection",
    properties: { columns: template ? columnsFromTemplate(template) : [] },
  });
}

async function readRawProperties(id: string): Promise<Properties | null> {
  const db = await getDatabase();
  const rows = await db.select<{ properties: string }[]>(
    `SELECT properties FROM pages WHERE id = $1`,
    [id],
  );
  return rows[0] ? parseProperties(rows[0].properties) : null;
}

/**
 * Convierte una página normal sin subpáginas en colección. Sus `properties`
 * (p. ej. `categoria`) se conservan; solo se añade `columns`. Devuelve false si
 * no procede (no existe, ya es colección o tiene subpáginas).
 */
export async function convertToCollection(id: string): Promise<boolean> {
  const db = await getDatabase();
  const rows = await db.select<{ kind: string; properties: string; children: number }[]>(
    `SELECT kind, properties,
            (SELECT COUNT(*) FROM pages AS c WHERE c.parent_id = pages.id AND c.deleted_at IS NULL) AS children
       FROM pages WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  const target = rows[0];
  if (!target || target.kind !== "page" || Number(target.children) > 0) return false;

  const properties = mergeProperties(parseProperties(target.properties), {
    columns: readColumns(parseProperties(target.properties)),
  });
  await runBatch([
    {
      sql: `UPDATE pages SET kind = 'collection', properties = $1, updated_at = $2 WHERE id = $3`,
      params: [JSON.stringify(properties), new Date().toISOString(), id],
    },
  ]);
  return true;
}

interface RowProps {
  id: string;
  properties: Properties;
}

async function listRowProperties(collectionId: string): Promise<RowProps[]> {
  const db = await getDatabase();
  const rows = await db.select<{ id: string; properties: string }[]>(
    `SELECT id, properties FROM pages WHERE parent_id = $1`,
    [collectionId],
  );
  return rows.map((row) => ({ id: row.id, properties: parseProperties(row.properties) }));
}

function updateProps(id: string, properties: Properties, touch: boolean, now: string) {
  return {
    sql: touch
      ? `UPDATE pages SET properties = $1, updated_at = $2 WHERE id = $3`
      : `UPDATE pages SET properties = $1 WHERE id = $2`,
    params: touch ? [JSON.stringify(properties), now, id] : [JSON.stringify(properties), id],
  };
}

/**
 * Cambia las columnas de una colección y, de forma atómica, reescribe las
 * filas que lo necesiten. `rewrite` devuelve las nuevas propiedades de una fila
 * o `null` si no cambia.
 */
async function changeColumns(
  collectionId: string,
  change: (properties: Properties, columns: Column[]) => Properties,
  rewrite?: (row: RowProps) => Properties | null,
): Promise<void> {
  const properties = await readRawProperties(collectionId);
  if (properties === null) throw new Error("La colección no existe.");
  const now = new Date().toISOString();
  const statements: BatchStatement[] = [
    updateProps(collectionId, change(properties, readColumns(properties)), true, now),
  ];
  if (rewrite) {
    for (const row of await listRowProperties(collectionId)) {
      const next = rewrite(row);
      if (next !== null) statements.push(updateProps(row.id, next, false, now));
    }
  }
  await runBatch(statements);
}

/** Si el orden o el filtro activos usan lo que se borra, se quitan. */
function cleanView(properties: Properties, drop: { columnId: string; optionId?: string }): Properties {
  const view = readView(properties);
  const next: ViewSpec = { ...view };
  if (view.sort?.columnId === drop.columnId && drop.optionId === undefined) delete next.sort;
  if (view.filter?.columnId === drop.columnId) {
    if (drop.optionId === undefined || view.filter.value === drop.optionId) delete next.filter;
  }
  return withView(properties, next);
}

export async function addCollectionColumn(
  collectionId: string,
  input: { name: string; type: ColumnType },
): Promise<void> {
  await changeColumns(collectionId, (properties, columns) =>
    withColumns(properties, addColumn(columns, input)),
  );
}

export async function renameCollectionColumn(
  collectionId: string,
  columnId: string,
  name: string,
): Promise<void> {
  await changeColumns(collectionId, (properties, columns) =>
    withColumns(properties, renameColumn(columns, columnId, name)),
  );
}

/** Elimina la columna y sus valores en todas las filas. */
export async function deleteCollectionColumn(
  collectionId: string,
  columnId: string,
): Promise<void> {
  await changeColumns(
    collectionId,
    (properties, columns) => cleanView(withColumns(properties, removeColumn(columns, columnId)), { columnId }),
    (row) => (columnId in readValues(row.properties) ? withoutRowValue(row.properties, columnId) : null),
  );
}

/** Cambia el tipo y convierte los valores; devuelve cuántos se perdieron. */
export async function changeCollectionColumnType(
  collectionId: string,
  columnId: string,
  to: ColumnType,
): Promise<number> {
  const properties = await readRawProperties(collectionId);
  if (properties === null) throw new Error("La colección no existe.");
  const column = readColumns(properties).find((candidate) => candidate.id === columnId);
  if (!column || column.type === to) return 0;

  const rows = await listRowProperties(collectionId);
  const plan = planTypeChange(
    column,
    to,
    rows.map((row) => ({ id: row.id, values: readValues(row.properties) })),
  );
  await changeColumns(
    collectionId,
    (current, columns) =>
      cleanView(
        withColumns(
          current,
          columns.map((candidate) => (candidate.id === columnId ? plan.column : candidate)),
        ),
        { columnId },
      ),
    (row) =>
      plan.values.has(row.id) ? withRowValue(row.properties, columnId, plan.values.get(row.id)) : null,
  );
  return plan.lost;
}

export async function addColumnOption(
  collectionId: string,
  columnId: string,
  label: string,
): Promise<void> {
  await changeColumns(collectionId, (properties, columns) =>
    withColumns(
      properties,
      columns.map((column) => (column.id === columnId ? addOption(column, label).column : column)),
    ),
  );
}

export async function renameColumnOption(
  collectionId: string,
  columnId: string,
  optionId: string,
  label: string,
): Promise<void> {
  await changeColumns(collectionId, (properties, columns) =>
    withColumns(
      properties,
      columns.map((column) =>
        column.id === columnId ? renameOption(column, optionId, label) : column,
      ),
    ),
  );
}

/** Elimina la opción; las filas que la tenían se quedan sin valor. */
export async function deleteColumnOption(
  collectionId: string,
  columnId: string,
  optionId: string,
): Promise<void> {
  await changeColumns(
    collectionId,
    (properties, columns) =>
      cleanView(
        withColumns(
          properties,
          columns.map((column) => (column.id === columnId ? removeOption(column, optionId) : column)),
        ),
        { columnId, optionId },
      ),
    (row) =>
      readValues(row.properties)[columnId] === optionId
        ? withoutRowValue(row.properties, columnId)
        : null,
  );
}

/** Guarda el orden/filtro de la vista de la colección. */
export async function saveCollectionView(collectionId: string, view: ViewSpec): Promise<void> {
  const properties = await readRawProperties(collectionId);
  if (properties === null) return;
  const db = await getDatabase();
  await db.execute(`UPDATE pages SET properties = $1 WHERE id = $2`, [
    JSON.stringify(withView(properties, view)),
    collectionId,
  ]);
}

/** Escribe un valor de celda de una fila (vacío = quita el valor), fusionando. */
export async function saveRowValue(
  rowId: string,
  columnId: string,
  value: CellValue | null,
): Promise<Properties> {
  const properties = await readRawProperties(rowId);
  if (properties === null) throw new Error("La fila no existe.");
  const next = withRowValue(properties, columnId, value);
  const db = await getDatabase();
  await db.execute(`UPDATE pages SET properties = $1, updated_at = $2 WHERE id = $3`, [
    JSON.stringify(next),
    new Date().toISOString(),
    rowId,
  ]);
  return next;
}

/** Crea una fila (subpágina de la colección) al final. */
export async function createRow(
  collectionId: string,
  title = "",
  values: Record<string, CellValue> = {},
): Promise<Page> {
  return createPage({
    parentId: collectionId,
    title,
    properties: Object.keys(values).length > 0 ? { values } : {},
  });
}

/** Fija el orden manual de las filas: `orderedIds[i]` pasa a `sort_order = i`. */
export async function reorderPages(orderedIds: readonly string[]): Promise<void> {
  await runBatch(
    orderedIds.map((id, index) => ({
      sql: `UPDATE pages SET sort_order = $1 WHERE id = $2`,
      params: [index, id],
    })),
  );
}
