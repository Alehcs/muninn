import { createId } from "@/lib/ids";
import { runBatch, type BatchStatement } from "@/lib/db/batch";
import { getDatabase } from "@/lib/db/database";
import type { ContentFormat, Page, PageKind } from "../types";

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

function parseProperties(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

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
}

/** Crea una página al final de sus hermanas. Las páginas nuevas son Markdown. */
export async function createPage(input: NewPageInput = {}): Promise<Page> {
  const now = new Date().toISOString();
  const id = createId("page");
  const parentId = input.parentId ?? null;
  const title = input.title ?? "";
  const content = input.content ?? "";

  await runBatch([
    {
      sql: `INSERT INTO pages
              (id, parent_id, title, icon, content, content_format, kind,
               properties, pinned, sort_order, deleted_at, created_at, updated_at)
            VALUES ($1, $2, $3, NULL, $4, 'markdown', 'page', '{}', 0,
                    COALESCE((SELECT MAX(sort_order) + 1 FROM pages WHERE parent_id IS $2), 0),
                    NULL, $5, $5)`,
      params: [id, parentId, title, content, now],
    },
  ]);

  return {
    id,
    parentId,
    title,
    content,
    contentFormat: "markdown",
    kind: "page",
    properties: {},
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
