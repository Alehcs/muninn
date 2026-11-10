import FormCard, { Field } from "@/components/FormCard";
import { inputCls } from "@/components/formStyles";
import { optional } from "@/lib/text";
import { useState } from "react";
import type {
  RoadmapItem,
  RoadmapItemInput,
  RoadmapSection,
} from "../types";

interface RoadmapItemFormProps {
  initial?: RoadmapItem;
  defaultSectionId?: string;
  sectionOptions: RoadmapSection[];
  onSubmit: (values: RoadmapItemInput) => void;
  onCancel: () => void;
}


export default function RoadmapItemForm({
  initial,
  defaultSectionId,
  sectionOptions,
  onSubmit,
  onCancel,
}: RoadmapItemFormProps) {
  const firstSectionId = sectionOptions[0]?.id ?? "";
  const isEdit = initial !== undefined;
  const [sectionId, setSectionId] = useState(
    initial?.sectionId ?? defaultSectionId ?? firstSectionId,
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState(initial?.type ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const valid = sectionId.length > 0 && title.trim().length > 0;

  const handleSubmit = () => {
    if (!valid) return;

    onSubmit({
      sectionId,
      title: title.trim(),
      description: optional(description),
      type: optional(type),
      notes: optional(notes),
      url: optional(url),
    });
  };

  return (
    <FormCard
      title={isEdit ? "Editar item" : "Nuevo item de la lista"}
      submitLabel={isEdit ? "Guardar cambios" : "Crear item"}
      valid={valid}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      note="El orden se cambia arrastrando el item en la lista. Si lo mueves a otra sección, queda al final de ella."
    >
      <Field label="Sección">
        <select
          className={inputCls}
          value={sectionId}
          onChange={(event) => setSectionId(event.target.value)}
        >
          {sectionOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
        <Field label="Título">
          <input
            className={inputCls}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ej. System design basics"
          />
        </Field>

        <Field label="Tipo (opcional)">
          <input
            className={inputCls}
            value={type}
            onChange={(event) => setType(event.target.value)}
            placeholder="Course, Skill..."
          />
        </Field>
      </div>

      <Field label="Descripción (opcional)">
        <input
          className={inputCls}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Contexto corto sobre qué significa completar esto"
        />
      </Field>

      <Field label="Notas (opcional · Cmd/Ctrl+Enter para guardar)">
        <textarea
          className={`${inputCls} min-h-24 resize-y`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Recursos, criterios personales, recordatorios..."
        />
      </Field>

      <Field label="Link (opcional)">
        <input
          className={inputCls}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://..."
        />
      </Field>
    </FormCard>
  );
}
