import { createId } from "@/lib/ids";
import { nullable, optional } from "@/lib/text";
import { getDatabase } from "@/lib/db/database";
import type { Note, NoteInput } from "../types";

interface NoteRow {
  id: string;
  title: string;
  content: string;
  category: string | null;
  pinned: number;
  created_at: string;
  updated_at: string;
}

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: optional(row.category),
    pinned: row.pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listNotes(): Promise<Note[]> {
  const db = await getDatabase();
  const rows = await db.select<NoteRow[]>(
    `SELECT id, title, content, category, pinned, created_at, updated_at
       FROM notes
      ORDER BY pinned DESC, updated_at DESC, created_at DESC`,
  );

  return rows.map(toNote);
}

export async function insertNote(input: NoteInput): Promise<Note> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const note: Note = {
    id: createId("note"),
    title: input.title,
    content: input.content,
    category: nullable(input.category) ?? undefined,
    pinned: input.pinned,
    createdAt: now,
    updatedAt: now,
  };

  await db.execute(
    `INSERT INTO notes
       (id, title, content, category, pinned, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      note.id,
      note.title,
      note.content,
      note.category ?? null,
      note.pinned ? 1 : 0,
      now,
      now,
    ],
  );

  return note;
}

export async function updateNote(
  id: string,
  input: NoteInput,
): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `UPDATE notes
        SET title = $1,
            content = $2,
            category = $3,
            pinned = $4,
            updated_at = $5
      WHERE id = $6`,
    [
      input.title,
      input.content,
      nullable(input.category),
      input.pinned ? 1 : 0,
      new Date().toISOString(),
      id,
    ],
  );
}

export async function setNotePinned(
  id: string,
  pinned: boolean,
): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `UPDATE notes
        SET pinned = $1,
            updated_at = $2
      WHERE id = $3`,
    [pinned ? 1 : 0, new Date().toISOString(), id],
  );
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDatabase();
  await db.execute(`DELETE FROM notes WHERE id = $1`, [id]);
}
