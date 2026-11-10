import FormCard, { Field } from "@/components/FormCard";
import { inputCls } from "@/components/formStyles";
import { optional } from "@/lib/text";
import { useState } from "react";
import type { Note, NoteInput } from "../types";

interface NoteFormProps {
  initial?: Note;
  onSubmit: (values: NoteInput) => void;
  onCancel: () => void;
}


export default function NoteForm({ initial, onSubmit, onCancel }: NoteFormProps) {
  const isEdit = initial !== undefined;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [pinned, setPinned] = useState(initial?.pinned ?? false);

  const valid = title.trim().length > 0 && content.trim().length > 0;

  const handleSubmit = () => {
    if (!valid) return;
    onSubmit({
      title: title.trim(),
      content: content.trim(),
      category: optional(category),
      pinned,
    });
  };

  return (
    <FormCard
      title={isEdit ? "Editar nota" : "Nueva nota"}
      submitLabel={isEdit ? "Guardar cambios" : "Crear nota"}
      valid={valid}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
        <Field label="Título">
          <input
            className={inputCls}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ej. Ideas para backend"
          />
        </Field>

        <Field label="Categoría">
          <input
            className={inputCls}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Lista, idea, recurso..."
          />
        </Field>
      </div>

      <Field label="Contenido (Cmd/Ctrl+Enter para guardar)">
        <textarea
          className={`${inputCls} min-h-56 resize-y leading-6`}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="- Item libre&#10;- Link importante&#10;- Idea suelta"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-text-muted">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(event) => setPinned(event.target.checked)}
          className="h-4 w-4 accent-accent"
        />
        Fijar arriba
      </label>
    </FormCard>
  );
}
