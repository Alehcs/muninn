import type { BatchStatement } from "@/lib/db/batch";
import { renumber } from "@/lib/reorder";
import type { RoadmapItem, RoadmapSection } from "../types";

/**
 * Sentencias que renumeran los items de una sección como 1…n según
 * `orderedIds`. Se ejecutan juntas en un único `runBatch`.
 */
export function buildItemOrderStatements(
  orderedIds: string[],
  now: string,
): BatchStatement[] {
  return renumber(orderedIds).map(({ id, position }) => ({
    sql: `UPDATE roadmap_items SET order_index = $1, updated_at = $2 WHERE id = $3`,
    params: [position, now, id],
  }));
}

/**
 * Sentencias que renumeran las secciones como 1…n y copian el nuevo orden a
 * `section_order` de sus items (columna desnormalizada).
 */
export function buildSectionOrderStatements(
  orderedIds: string[],
  now: string,
): BatchStatement[] {
  return renumber(orderedIds).flatMap(({ id, position }) => [
    {
      sql: `UPDATE roadmap_sections SET section_order = $1, updated_at = $2 WHERE id = $3`,
      params: [position, now, id],
    },
    {
      sql: `UPDATE roadmap_items SET section_order = $1 WHERE section_id = $2`,
      params: [position, id],
    },
  ]);
}

/** Aplica al estado local el nuevo orden de los items de una sección. */
export function applyItemOrder(
  items: RoadmapItem[],
  sectionId: string,
  orderedIds: string[],
): RoadmapItem[] {
  const positions = new Map(
    renumber(orderedIds).map(({ id, position }) => [id, position]),
  );
  return items
    .map((item) =>
      item.sectionId === sectionId && positions.has(item.id)
        ? { ...item, orderIndex: positions.get(item.id)! }
        : item,
    )
    .sort(
      (a, b) => a.sectionOrder - b.sectionOrder || a.orderIndex - b.orderIndex,
    );
}

/** Aplica al estado local el nuevo orden de las secciones (y de sus items). */
export function applySectionOrder(
  sections: RoadmapSection[],
  items: RoadmapItem[],
  orderedIds: string[],
): { sections: RoadmapSection[]; items: RoadmapItem[] } {
  const positions = new Map(
    renumber(orderedIds).map(({ id, position }) => [id, position]),
  );
  const nextSections = sections
    .map((section) =>
      positions.has(section.id)
        ? { ...section, order: positions.get(section.id)! }
        : section,
    )
    .sort((a, b) => a.order - b.order);
  const nextItems = items
    .map((item) =>
      positions.has(item.sectionId)
        ? { ...item, sectionOrder: positions.get(item.sectionId)! }
        : item,
    )
    .sort(
      (a, b) => a.sectionOrder - b.sectionOrder || a.orderIndex - b.orderIndex,
    );
  return { sections: nextSections, items: nextItems };
}
