import { inputCls, labelCls } from "@/components/formStyles";
import { optional } from "@/lib/text";
import { useState } from "react";
import Button from "@/components/Button";
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
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="font-medium">
        {isEdit ? "Editar roadmap" : "Nuevo roadmap"}
      </h3>

      <div className="mt-4 flex flex-col gap-3">
        <div>
          <label className={labelCls}>Nombre</label>
          <input
            className={inputCls}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ej. Backend mastery"
          />
        </div>

        <div>
          <label className={labelCls}>Descripción (opcional)</label>
          <textarea
            className={`${inputCls} min-h-20 resize-y`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Enfoque, objetivo o criterio de este camino"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={handleSubmit} disabled={!valid}>
          {isEdit ? "Guardar cambios" : "Crear roadmap"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
