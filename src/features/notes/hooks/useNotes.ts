import { useCallback, useEffect, useState } from "react";
import * as noteRepo from "../storage/noteRepository";
import type { Note, NoteInput } from "../types";

export type NotesStatus = "loading" | "ready" | "error";

export interface NotesStore {
  status: NotesStatus;
  notes: Note[];
  reload: () => Promise<void>;
  createNote: (input: NoteInput) => Promise<void>;
  updateNote: (id: string, input: NoteInput) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  togglePinned: (id: string) => Promise<void>;
}

export function useNotes(): NotesStore {
  const [status, setStatus] = useState<NotesStatus>("loading");
  const [notes, setNotes] = useState<Note[]>([]);

  const reload = useCallback(async () => {
    try {
      const stored = await noteRepo.listNotes();
      setNotes(stored);
      setStatus("ready");
    } catch (error) {
      console.error("Notes operation failed", error);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createNote = useCallback(
    async (input: NoteInput) => {
      try {
        await noteRepo.insertNote(input);
        await reload();
      } catch (error) {
        console.error("Notes operation failed", error);
        setStatus("error");
      }
    },
    [reload],
  );

  const updateNote = useCallback(
    async (id: string, input: NoteInput) => {
      try {
        await noteRepo.updateNote(id, input);
        await reload();
      } catch (error) {
        console.error("Notes operation failed", error);
        setStatus("error");
      }
    },
    [reload],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      try {
        await noteRepo.deleteNote(id);
        await reload();
      } catch (error) {
        console.error("Notes operation failed", error);
        setStatus("error");
      }
    },
    [reload],
  );

  const togglePinned = useCallback(
    async (id: string) => {
      const note = notes.find((item) => item.id === id);
      if (!note) return;

      try {
        await noteRepo.setNotePinned(id, !note.pinned);
        await reload();
      } catch (error) {
        console.error("Notes operation failed", error);
        setStatus("error");
      }
    },
    [notes, reload],
  );

  return {
    status,
    notes,
    reload,
    createNote,
    updateNote,
    deleteNote,
    togglePinned,
  };
}
