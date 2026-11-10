import { inputCls, labelCls } from "@/components/formStyles";
import { optional } from "@/lib/text";
import { useMemo, useState } from "react";
import Button from "@/components/Button";
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
  const [orderIndex, setOrderIndex] = useState(
    initial ? String(initial.orderIndex) : "",
  );

  const parsedOrderIndex = useMemo(() => {
    if (orderIndex.trim() === "") return undefined;
    return Number(orderIndex);
  }, [orderIndex]);

  const validOrder =
    parsedOrderIndex === undefined ||
    (Number.isInteger(parsedOrderIndex) && parsedOrderIndex > 0);
  const valid = sectionId.length > 0 && title.trim().length > 0 && validOrder;

  const handleSubmit = () => {
    if (!valid) return;

    onSubmit({
      sectionId,
      title: title.trim(),
      description: optional(description),
      type: optional(type),
      orderIndex: parsedOrderIndex,
      notes: optional(notes),
      url: optional(url),
    });
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="font-medium">
        {isEdit ? "Editar item" : "Nuevo item del roadmap"}
      </h3>

      <div className="mt-4 flex flex-col gap-3">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
          <div>
            <label className={labelCls}>Sección</label>
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
          </div>

          <div>
            <label className={labelCls}>Orden</label>
            <input
              className={inputCls}
              inputMode="numeric"
              min="1"
              type="number"
              value={orderIndex}
              onChange={(event) => setOrderIndex(event.target.value)}
              placeholder="Auto"
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <div>
            <label className={labelCls}>Título</label>
            <input
              className={inputCls}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. System design basics"
            />
          </div>

          <div>
            <label className={labelCls}>Tipo (opcional)</label>
            <input
              className={inputCls}
              value={type}
              onChange={(event) => setType(event.target.value)}
              placeholder="Course, Skill..."
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Descripción (opcional)</label>
          <input
            className={inputCls}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Contexto corto sobre qué significa completar esto"
          />
        </div>

        <div>
          <label className={labelCls}>Notas (opcional)</label>
          <textarea
            className={`${inputCls} min-h-24 resize-y`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Recursos, criterios personales, recordatorios..."
          />
        </div>

        <div>
          <label className={labelCls}>Link (opcional)</label>
          <input
            className={inputCls}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={handleSubmit} disabled={!valid}>
          {isEdit ? "Guardar cambios" : "Crear item"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      <p className="mt-3 text-xs text-text-muted">
        Deja el orden vacío para enviarlo al final de la sección.
      </p>
    </div>
  );
}
