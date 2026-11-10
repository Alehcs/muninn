import { createId } from "@/lib/ids";
import { nullable, optional } from "@/lib/text";
import { runBatch, type BatchStatement } from "@/lib/db/batch";
import { getDatabase } from "@/lib/db/database";
import {
  DEFAULT_ROADMAP_ID,
  DEFAULT_ROADMAP_SECTIONS,
  defaultRoadmap,
  defaultRoadmapItems,
} from "../data/defaultRoadmapItems";
import type {
  Roadmap,
  RoadmapInput,
  RoadmapItem,
  RoadmapItemInput,
  RoadmapSection,
  RoadmapSectionInput,
} from "../types";

const ROADMAP_SEEDED_KEY = "roadmap_seeded";

interface MetadataRow {
  value: string;
}

interface CountRow {
  total: number;
}

interface RoadmapRow {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface RoadmapSectionRow {
  id: string;
  roadmap_id: string;
  name: string;
  section_order: number;
  created_at: string;
  updated_at: string;
}

interface RoadmapItemRow {
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

function toRoadmap(row: RoadmapRow): Roadmap {
  return {
    id: row.id,
    title: row.title,
    description: optional(row.description),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRoadmapSection(row: RoadmapSectionRow): RoadmapSection {
  return {
    id: row.id,
    roadmapId: row.roadmap_id,
    name: row.name,
    order: row.section_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRoadmapItem(row: RoadmapItemRow): RoadmapItem {
  return {
    id: row.id,
    roadmapId: row.roadmap_id ?? DEFAULT_ROADMAP_ID,
    sectionId: row.section_id ?? "",
    section: row.section,
    sectionOrder: row.section_order,
    title: row.title,
    description: optional(row.description),
    type: optional(row.type),
    completed: row.completed === 1,
    orderIndex: row.order_index,
    notes: optional(row.notes),
    url: optional(row.url),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: optional(row.completed_at),
  };
}

async function getMetadata(key: string): Promise<string | null> {
  const db = await getDatabase();
  const rows = await db.select<MetadataRow[]>(
    `SELECT value FROM app_metadata WHERE key = $1`,
    [key],
  );

  return rows[0]?.value ?? null;
}

async function setMetadata(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO app_metadata (key, value, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`,
    [key, value, now],
  );
}

async function countRows(table: string): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<CountRow[]>(
    `SELECT COUNT(*) AS total FROM ${table}`,
  );

  return rows[0]?.total ?? 0;
}

async function countUnlinkedItems(): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<CountRow[]>(
    `SELECT COUNT(*) AS total
       FROM roadmap_items
      WHERE roadmap_id IS NULL
         OR roadmap_id = ''
         OR section_id IS NULL
         OR section_id = ''`,
  );

  return rows[0]?.total ?? 0;
}

async function insertDefaultRoadmapAndSections(): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT OR IGNORE INTO roadmaps
       (id, title, description, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      defaultRoadmap.id,
      defaultRoadmap.title,
      defaultRoadmap.description ?? null,
      now,
      now,
    ],
  );

  for (const section of DEFAULT_ROADMAP_SECTIONS) {
    await db.execute(
      `INSERT OR IGNORE INTO roadmap_sections
         (id, roadmap_id, name, section_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        section.id,
        section.roadmapId,
        section.name,
        section.order,
        now,
        now,
      ],
    );
  }
}

async function adoptLegacyItems(): Promise<void> {
  const db = await getDatabase();

  for (const section of DEFAULT_ROADMAP_SECTIONS) {
    await db.execute(
      `UPDATE roadmap_items
          SET roadmap_id = $1,
              section_id = $2,
              section = $3,
              section_order = $4
        WHERE (roadmap_id IS NULL OR roadmap_id = $1)
          AND (section_id IS NULL OR section_id = '')
          AND section = $3`,
      [DEFAULT_ROADMAP_ID, section.id, section.name, section.order],
    );
  }
}

async function insertDefaultRoadmapItemsIfEmpty(): Promise<void> {
  const db = await getDatabase();
  const itemCount = await countRows("roadmap_items");

  if (itemCount > 0) return;

  const now = new Date().toISOString();
  for (const item of defaultRoadmapItems) {
    await db.execute(
      `INSERT OR IGNORE INTO roadmap_items
         (id, roadmap_id, section_id, section, section_order, title,
          description, type, completed, order_index, notes, url,
          created_at, updated_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        item.id,
        item.roadmapId,
        item.sectionId,
        item.section,
        item.sectionOrder,
        item.title,
        item.description ?? null,
        item.type ?? null,
        item.completed ? 1 : 0,
        item.orderIndex,
        item.notes ?? null,
        item.url ?? null,
        now,
        now,
        item.completedAt ?? null,
      ],
    );
  }
}

export async function seedDefaultRoadmapIfNeeded(): Promise<void> {
  const seeded = await getMetadata(ROADMAP_SEEDED_KEY);
  const roadmapCount = await countRows("roadmaps");
  const unlinkedItems = await countUnlinkedItems();

  if (unlinkedItems > 0) {
    await insertDefaultRoadmapAndSections();
    await adoptLegacyItems();
    await setMetadata(ROADMAP_SEEDED_KEY, "true");
    return;
  }

  if (roadmapCount === 0 && seeded !== "true") {
    await insertDefaultRoadmapAndSections();
    await insertDefaultRoadmapItemsIfEmpty();
    await setMetadata(ROADMAP_SEEDED_KEY, "true");
  }
}

export async function listRoadmaps(): Promise<Roadmap[]> {
  const db = await getDatabase();
  const rows = await db.select<RoadmapRow[]>(
    `SELECT id, title, description, created_at, updated_at
       FROM roadmaps
      ORDER BY created_at ASC, title ASC`,
  );

  return rows.map(toRoadmap);
}

export async function insertRoadmap(input: RoadmapInput): Promise<Roadmap> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const roadmap: Roadmap = {
    id: createId("roadmap"),
    title: input.title,
    description: nullable(input.description) ?? undefined,
    createdAt: now,
    updatedAt: now,
  };

  await db.execute(
    `INSERT INTO roadmaps
       (id, title, description, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [roadmap.id, roadmap.title, roadmap.description ?? null, now, now],
  );

  return roadmap;
}

export async function updateRoadmap(
  id: string,
  input: RoadmapInput,
): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `UPDATE roadmaps
        SET title = $1,
            description = $2,
            updated_at = $3
      WHERE id = $4`,
    [input.title, nullable(input.description), new Date().toISOString(), id],
  );
}

export async function deleteRoadmap(id: string): Promise<void> {
  await runBatch([
    {
      sql: `DELETE FROM roadmap_items
      WHERE roadmap_id = $1
         OR ($1 = $2 AND (roadmap_id IS NULL OR roadmap_id = ''))`,
      params: [id, DEFAULT_ROADMAP_ID],
    },
    { sql: `DELETE FROM roadmap_sections WHERE roadmap_id = $1`, params: [id] },
    { sql: `DELETE FROM roadmaps WHERE id = $1`, params: [id] },
  ]);
}

export async function listRoadmapSections(
  roadmapId: string,
): Promise<RoadmapSection[]> {
  const db = await getDatabase();
  const rows = await db.select<RoadmapSectionRow[]>(
    `SELECT id, roadmap_id, name, section_order, created_at, updated_at
       FROM roadmap_sections
      WHERE roadmap_id = $1
      ORDER BY section_order ASC, created_at ASC`,
    [roadmapId],
  );

  return rows.map(toRoadmapSection);
}

export async function getRoadmapSection(
  id: string,
): Promise<RoadmapSection | null> {
  const db = await getDatabase();
  const rows = await db.select<RoadmapSectionRow[]>(
    `SELECT id, roadmap_id, name, section_order, created_at, updated_at
       FROM roadmap_sections
      WHERE id = $1`,
    [id],
  );

  return rows[0] ? toRoadmapSection(rows[0]) : null;
}

export async function getNextSectionOrder(
  roadmapId: string,
): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<{ next_order: number | null }[]>(
    `SELECT COALESCE(MAX(section_order), 0) + 1 AS next_order
       FROM roadmap_sections
      WHERE roadmap_id = $1`,
    [roadmapId],
  );

  return rows[0]?.next_order ?? 1;
}

export async function insertRoadmapSection(
  roadmapId: string,
  input: RoadmapSectionInput,
): Promise<RoadmapSection> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const order = input.order ?? (await getNextSectionOrder(roadmapId));
  const section: RoadmapSection = {
    id: createId("roadmap-section"),
    roadmapId,
    name: input.name,
    order,
    createdAt: now,
    updatedAt: now,
  };

  await db.execute(
    `INSERT INTO roadmap_sections
       (id, roadmap_id, name, section_order, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [section.id, section.roadmapId, section.name, section.order, now, now],
  );

  return section;
}

export async function updateRoadmapSection(
  id: string,
  input: RoadmapSectionInput,
): Promise<void> {
  const db = await getDatabase();
  const current = await getRoadmapSection(id);
  if (!current) return;

  const order = input.order ?? current.order;
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE roadmap_sections
        SET name = $1,
            section_order = $2,
            updated_at = $3
      WHERE id = $4`,
    [input.name, order, now, id],
  );
  await db.execute(
    `UPDATE roadmap_items
        SET section = $1,
            section_order = $2,
            updated_at = $3
      WHERE section_id = $4`,
    [input.name, order, now, id],
  );
}

export async function deleteRoadmapSection(id: string): Promise<void> {
  const section = await getRoadmapSection(id);

  const deleteItems: BatchStatement = section
    ? {
        sql: `DELETE FROM roadmap_items
        WHERE section_id = $1
           OR (
             section = $2
             AND (
               roadmap_id = $3
               OR ($3 = $4 AND (roadmap_id IS NULL OR roadmap_id = ''))
             )
           )`,
        params: [id, section.name, section.roadmapId, DEFAULT_ROADMAP_ID],
      }
    : { sql: `DELETE FROM roadmap_items WHERE section_id = $1`, params: [id] };

  await runBatch([
    deleteItems,
    { sql: `DELETE FROM roadmap_sections WHERE id = $1`, params: [id] },
  ]);
}

export async function listRoadmapItems(
  roadmapId: string,
): Promise<RoadmapItem[]> {
  const db = await getDatabase();
  const rows = await db.select<RoadmapItemRow[]>(
    `SELECT i.id,
            i.roadmap_id,
            i.section_id,
            COALESCE(s.name, i.section) AS section,
            COALESCE(s.section_order, i.section_order) AS section_order,
            i.title,
            i.description,
            i.type,
            i.completed,
            i.order_index,
            i.notes,
            i.url,
            i.created_at,
            i.updated_at,
            i.completed_at
       FROM roadmap_items i
       LEFT JOIN roadmap_sections s ON s.id = i.section_id
      WHERE i.roadmap_id = $1
      ORDER BY section_order ASC, i.order_index ASC, i.created_at ASC`,
    [roadmapId],
  );

  return rows.map(toRoadmapItem);
}

export async function getNextOrderIndex(sectionId: string): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<{ next_order: number | null }[]>(
    `SELECT COALESCE(MAX(order_index), 0) + 1 AS next_order
       FROM roadmap_items
      WHERE section_id = $1`,
    [sectionId],
  );

  return rows[0]?.next_order ?? 1;
}

export async function insertRoadmapItem(
  input: RoadmapItemInput,
): Promise<RoadmapItem | null> {
  const section = await getRoadmapSection(input.sectionId);
  if (!section) return null;

  const db = await getDatabase();
  const now = new Date().toISOString();
  const orderIndex =
    input.orderIndex ?? (await getNextOrderIndex(input.sectionId));
  const item: RoadmapItem = {
    id: createId("roadmap-item"),
    roadmapId: section.roadmapId,
    sectionId: section.id,
    section: section.name,
    sectionOrder: section.order,
    title: input.title,
    description: nullable(input.description) ?? undefined,
    type: nullable(input.type) ?? undefined,
    completed: false,
    orderIndex,
    notes: nullable(input.notes) ?? undefined,
    url: nullable(input.url) ?? undefined,
    createdAt: now,
    updatedAt: now,
  };

  await db.execute(
    `INSERT INTO roadmap_items
       (id, roadmap_id, section_id, section, section_order, title,
        description, type, completed, order_index, notes, url,
        created_at, updated_at, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NULL)`,
    [
      item.id,
      item.roadmapId,
      item.sectionId,
      item.section,
      item.sectionOrder,
      item.title,
      item.description ?? null,
      item.type ?? null,
      0,
      item.orderIndex,
      item.notes ?? null,
      item.url ?? null,
      now,
      now,
    ],
  );

  return item;
}

export async function updateRoadmapItem(
  id: string,
  input: RoadmapItemInput,
): Promise<void> {
  const section = await getRoadmapSection(input.sectionId);
  if (!section) return;

  const db = await getDatabase();
  const orderIndex =
    input.orderIndex ?? (await getNextOrderIndex(input.sectionId));

  await db.execute(
    `UPDATE roadmap_items
        SET roadmap_id = $1,
            section_id = $2,
            section = $3,
            section_order = $4,
            title = $5,
            description = $6,
            type = $7,
            order_index = $8,
            notes = $9,
            url = $10,
            updated_at = $11
      WHERE id = $12`,
    [
      section.roadmapId,
      section.id,
      section.name,
      section.order,
      input.title,
      nullable(input.description),
      nullable(input.type),
      orderIndex,
      nullable(input.notes),
      nullable(input.url),
      new Date().toISOString(),
      id,
    ],
  );
}

export async function setRoadmapItemCompleted(
  id: string,
  completed: boolean,
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE roadmap_items
        SET completed = $1,
            completed_at = $2,
            updated_at = $3
      WHERE id = $4`,
    [completed ? 1 : 0, completed ? now : null, now, id],
  );
}

export async function deleteRoadmapItem(id: string): Promise<void> {
  const db = await getDatabase();
  await db.execute(`DELETE FROM roadmap_items WHERE id = $1`, [id]);
}
