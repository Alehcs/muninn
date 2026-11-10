import Button from "@/components/Button";
import type { Note } from "../types";

interface NoteCardProps {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePinned: () => void;
}

export default function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePinned,
}: NoteCardProps) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words font-semibold">{note.title}</h3>
            {note.pinned && (
              <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-muted">
                Fijada
              </span>
            )}
            {note.category && (
              <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-muted">
                {note.category}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Actualizada {new Date(note.updatedAt).toLocaleDateString("es-ES")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={onTogglePinned} className="px-2 py-1 text-xs">
            {note.pinned ? "Soltar" : "Fijar"}
          </Button>
          <Button variant="ghost" onClick={onEdit} className="px-2 py-1 text-xs">
            Editar
          </Button>
          <Button variant="ghost" onClick={onDelete} className="px-2 py-1 text-xs">
            Eliminar
          </Button>
        </div>
      </div>

      <p className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-bg px-3 py-3 text-sm leading-6 text-text-muted">
        {note.content}
      </p>
    </article>
  );
}
