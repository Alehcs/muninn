import { getDatabase } from "@/lib/db/database";
import { listHabits } from "@/features/habits/storage/habitRepository";
import { listPages } from "@/features/pages/storage/pageRepository";
import { listTodoItems } from "@/features/todos/storage/todoRepository";
import { getCollectionOf } from "@/features/pages/utils/pageTree";
import { pageTitle } from "@/features/pages/types";
import { plainTextToMarkdown } from "@/features/pages/utils/plainTextToMarkdown";
import { prepareEntry, type PreparedEntry, type SearchEntry } from "./searchCore";

/** Lo que hace falta para abrir un resultado. */
export type SearchRef =
  | { kind: "page"; pageId: string }
  | { kind: "task"; todoId: string }
  | { kind: "item"; roadmapId: string; itemId: string }
  | { kind: "habit"; habitId: string };

export type IndexEntry = PreparedEntry<SearchRef>;

interface RoadmapItemSearchRow {
  id: string;
  roadmap_id: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  section_name: string | null;
  roadmap_title: string | null;
}

/** Items de todas las listas con el nombre de su lista y sección. */
async function listRoadmapItemRows(): Promise<RoadmapItemSearchRow[]> {
  const db = await getDatabase();
  return db.select<RoadmapItemSearchRow[]>(
    `SELECT i.id,
            COALESCE(i.roadmap_id, s.roadmap_id) AS roadmap_id,
            i.title, i.description, i.notes,
            COALESCE(s.name, i.section) AS section_name,
            r.title AS roadmap_title
       FROM roadmap_items i
       LEFT JOIN roadmap_sections s ON s.id = i.section_id
       LEFT JOIN roadmaps r ON r.id = COALESCE(i.roadmap_id, s.roadmap_id)
      ORDER BY r.created_at ASC, COALESCE(s.section_order, i.section_order) ASC, i.order_index ASC`,
  );
}

/**
 * Índice ligero para la paleta: se carga al abrirla y se filtra en memoria.
 * Las páginas en la papelera no entran; las filas de una colección sí, con la
 * colección como contexto.
 */
export async function loadSearchIndex(): Promise<IndexEntry[]> {
  const [pages, todos, itemRows, habits] = await Promise.all([
    listPages(),
    listTodoItems(),
    listRoadmapItemRows(),
    listHabits(),
  ]);

  const entries: SearchEntry<SearchRef>[] = [];

  const active = pages.filter((page) => page.deletedAt === null);
  for (const page of active) {
    const collection = getCollectionOf(active, page);
    entries.push({
      id: page.id,
      kind: "page",
      title: pageTitle(page),
      body: page.contentFormat === "plain" ? plainTextToMarkdown(page.content) : page.content,
      context: collection
        ? `Colección ${pageTitle(collection)}`
        : page.kind === "collection"
          ? "Colección"
          : undefined,
      ref: { kind: "page", pageId: page.id },
    });
  }

  for (const todo of todos) {
    entries.push({
      id: todo.id,
      kind: "task",
      title: todo.title,
      body: todo.notes ?? "",
      context: todo.completed ? "Completada" : undefined,
      ref: { kind: "task", todoId: todo.id },
    });
  }

  for (const row of itemRows) {
    if (row.roadmap_id === null) continue;
    const where = [row.roadmap_title, row.section_name].filter(
      (part): part is string => part !== null && part !== "",
    );
    entries.push({
      id: row.id,
      kind: "item",
      title: row.title,
      body: [row.description, row.notes].filter(Boolean).join("\n"),
      context: where.join(" › ") || undefined,
      ref: { kind: "item", roadmapId: row.roadmap_id, itemId: row.id },
    });
  }

  for (const habit of habits) {
    entries.push({
      id: habit.id,
      kind: "habit",
      title: habit.name,
      body: "",
      context: habit.active ? undefined : "Pausado",
      ref: { kind: "habit", habitId: habit.id },
    });
  }

  return entries.map(prepareEntry);
}
