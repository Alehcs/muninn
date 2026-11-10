import FormCard, { Field } from "@/components/FormCard";
import { inputCls } from "@/components/formStyles";
import { optional } from "@/lib/text";
import { useState } from "react";
import type { Roadmap, RoadmapInput } from "../types";

interface RoadmapFormProps {
  initial?: Roadmap;
  onSubmit: (values: RoadmapInput) => void;
  onCancel: () => void;
}


export default function RoadmapForm({
  initial,
  onSubmit,
  onCancel,
}: RoadmapFormProps) {
  const isEdit = initial !== undefined;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const valid = title.trim().length > 0;

  const handleSubmit = () => {
    if (!valid) return;
    onSubmit({
      title: title.trim(),
      description: optional(description),
    });
  };

  return (
    <FormCard
      title={isEdit ? "Editar lista" : "Nueva lista"}
      submitLabel={isEdit ? "Guardar cambios" : "Crear lista"}
      valid={valid}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    >
      <Field label="Nombre">
        <input
          className={inputCls}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ej. Backend mastery"
        />
      </Field>

      <Field label="Descripción (opcional · Cmd/Ctrl+Enter para guardar)">
        <textarea
          className={`${inputCls} min-h-20 resize-y`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Enfoque, objetivo o criterio de esta lista"
        />
      </Field>
    </FormCard>
  );
}
