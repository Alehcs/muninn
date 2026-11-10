import { useMemo, useState } from "react";
import Button from "@/components/Button";
import { Page, PageStrip } from "@/components/PageHeader";
import { inputCls } from "@/components/formStyles";
import { confirm } from "@/lib/confirm";
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

  const handleDelete = async (note: Note) => {
    const ok = await confirm({
      title: "Eliminar nota",
      message: `¿Eliminar la nota "${note.title}"?`,
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;

    setForm({ open: false });
    void notes.deleteNote(note.id);
  };

  if (notes.status === "loading") {
    return (
      <Page title="Notas" width="4xl">
        <p className="text-sm text-text-muted">Cargando notas…</p>
      </Page>
    );
  }

  if (notes.status === "error") {
    return (
      <Page title="Notas" width="4xl">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-semibold">No se pudieron cargar las notas</h2>
          <p className="mt-1 text-sm text-text-muted">
            Cierra y vuelve a abrir la app. Tus datos siguen siendo locales.
          </p>
          <Button className="mt-4" variant="ghost" onClick={() => void notes.reload()}>
            Reintentar
          </Button>
        </div>
      </Page>
    );
  }

  return (
    <Page
      title="Notas"
      width="4xl"
      primaryAction={{
        label: "Nueva nota",
        onClick: () => setForm({ open: true }),
        hidden: form.open,
      }}
    >
      <PageStrip>
        <label className="flex min-w-0 flex-1 items-center gap-2 text-xs font-medium text-text-muted">
          Buscar
          <input
            type="search"
            className={inputCls}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Título, categoría o contenido"
          />
        </label>
      </PageStrip>

      {form.open && (
        <div className="mb-5">
          <NoteForm
            initial={form.note}
            onSubmit={handleSubmit}
            onCancel={() => setForm({ open: false })}
          />
        </div>
      )}

      {filteredNotes.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-5">
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
        <div className="flex flex-col gap-4">
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={() => setForm({ open: true, note })}
              onDelete={() => void handleDelete(note)}
              onTogglePinned={() => void notes.togglePinned(note.id)}
            />
          ))}
        </div>
      )}
    </Page>
  );
}
