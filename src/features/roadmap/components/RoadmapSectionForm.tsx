import FormCard, { Field } from "@/components/FormCard";
import { inputCls } from "@/components/formStyles";
import { useState } from "react";
import type { RoadmapSection, RoadmapSectionInput } from "../types";

interface RoadmapSectionFormProps {
  initial?: RoadmapSection;
  onSubmit: (values: RoadmapSectionInput) => void;
  onCancel: () => void;
}


export default function RoadmapSectionForm({
  initial,
  onSubmit,
  onCancel,
}: RoadmapSectionFormProps) {
  const isEdit = initial !== undefined;
  const [name, setName] = useState(initial?.name ?? "");
  const valid = name.trim().length > 0;

  const handleSubmit = () => {
    if (!valid) return;
    onSubmit({ name: name.trim() });
  };

  return (
    <FormCard
      title={isEdit ? "Editar sección" : "Nueva sección"}
      submitLabel={isEdit ? "Guardar cambios" : "Crear sección"}
      valid={valid}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      note="El orden de las secciones se cambia arrastrándolas por su asa."
    >
      <Field label="Nombre">
        <input
          className={inputCls}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej. Systems fundamentals"
        />
      </Field>
    </FormCard>
  );
}
