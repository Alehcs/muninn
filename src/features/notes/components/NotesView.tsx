import { useMemo, useState } from "react";
import Button from "@/components/Button";
import NoteCard from "./NoteCard";
import NoteForm from "./NoteForm";
import { useNotes } from "../hooks/useNotes";
import type { Note, NoteInput } from "../types";

type FormState = { open: false } | { open: true; note?: Note };

export default function NotesView() {
  const notes = useNotes();
  const [form, setForm] = useState<FormState>({ open: false });
  const [query, setQuery] = useState("");

  const filteredNotes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized.length === 0) return notes.notes;

    return notes.notes.filter((note) => {
      const haystack = `${note.title} ${note.category ?? ""} ${note.content}`;
      return haystack.toLowerCase().includes(normalized);
    });
  }, [notes.notes, query]);

  const handleSubmit = (values: NoteInput) => {
    if (!form.open) return;

    if (form.note) {
      void notes.updateNote(form.note.id, values);
    } else {
      void notes.createNote(values);
    }
    setForm({ open: false });
  };

  const handleDelete = (note: Note) => {
    const ok = window.confirm(`Eliminar la nota "${note.title}"?`);
    if (!ok) return;

    setForm({ open: false });
    void notes.deleteNote(note.id);
  };

  if (notes.status === "loading") {
    return (
      <section className="mx-auto max-w-4xl">
        <p className="text-sm text-text-muted">Cargando notas…</p>
      </section>
    );
  }

  if (notes.status === "error") {
    return (
      <section className="mx-auto max-w-4xl">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-semibold">No se pudieron cargar las notas</h2>
          <p className="mt-1 text-sm text-text-muted">
            Cierra y vuelve a abrir la app. Tus datos siguen siendo locales.
          </p>
          <Button className="mt-4" variant="ghost" onClick={() => void notes.reload()}>
            Reintentar
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-text-muted">Notas</p>
            <h2 className="mt-1 text-2xl font-semibold">Notas y listas libres</h2>
            <p className="mt-2 max-w-2xl text-sm text-text-muted">
              Apuntes, listas, ideas, links y cualquier cosa que no necesite checkbox.
            </p>
          </div>

          {!form.open && (
            <Button onClick={() => setForm({ open: true })}>Nueva nota</Button>
          )}
        </div>

        <div className="mt-5">
          <label className="mb-1 block text-xs font-medium text-text-muted">
            Buscar
          </label>
          <input
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Título, categoría o contenido"
          />
        </div>
      </div>

      {form.open && (
        <div className="mt-5">
          <NoteForm
            initial={form.note}
            onSubmit={handleSubmit}
            onCancel={() => setForm({ open: false })}
          />
        </div>
      )}

      {filteredNotes.length === 0 ? (
        <div className="mt-6 rounded-xl border border-border bg-surface p-5">
          <h3 className="font-medium">
            {notes.notes.length === 0 ? "Sin notas todavía" : "Sin resultados"}
          </h3>
          <p className="mt-1 text-sm text-text-muted">
            {notes.notes.length === 0
              ? "Crea una nota nueva para guardar listas libres, ideas o recursos."
              : "Prueba con otra búsqueda."}
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={() => setForm({ open: true, note })}
              onDelete={() => handleDelete(note)}
              onTogglePinned={() => void notes.togglePinned(note.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
