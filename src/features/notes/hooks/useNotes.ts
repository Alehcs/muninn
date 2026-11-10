import { useCallback, useEffect, useRef, useState } from "react";
import { notify } from "@/lib/notify";
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

  const loadedRef = useRef(false);

  /** La pantalla de error completa solo aparece si falla la carga inicial. */
  const reload = useCallback(async () => {
    try {
      const stored = await noteRepo.listNotes();
      setNotes(stored);
      loadedRef.current = true;
      setStatus("ready");
    } catch (error) {
      console.error("Notes operation failed", error);
      if (loadedRef.current) notify.error("No se pudieron recargar las notas.");
      else setStatus("error");
    }
  }, []);

  /** Un fallo al guardar avisa y recarga para mostrar lo que hay realmente. */
  const handleWriteError = useCallback(
    async (error: unknown) => {
      console.error("Notes operation failed", error);
      notify.error("No se pudo guardar el cambio en las notas.");
      await reload();
    },
    [reload],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const createNote = useCallback(
    async (input: NoteInput) => {
      try {
        await noteRepo.insertNote(input);
        await reload();
      } catch (error) {
        await handleWriteError(error);
      }
    },
    [reload, handleWriteError],
  );

  const updateNote = useCallback(
    async (id: string, input: NoteInput) => {
      try {
        await noteRepo.updateNote(id, input);
        await reload();
      } catch (error) {
        await handleWriteError(error);
      }
    },
    [reload, handleWriteError],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      try {
        await noteRepo.deleteNote(id);
        await reload();
      } catch (error) {
        await handleWriteError(error);
      }
    },
    [reload, handleWriteError],
  );

  const togglePinned = useCallback(
    async (id: string) => {
      const note = notes.find((item) => item.id === id);
      if (!note) return;

      try {
        await noteRepo.setNotePinned(id, !note.pinned);
        await reload();
      } catch (error) {
        await handleWriteError(error);
      }
    },
    [notes, reload, handleWriteError],
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
