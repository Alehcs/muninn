import { inputCls, labelCls } from "@/components/formStyles";
import { useMemo, useState } from "react";
import Button from "@/components/Button";
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
  const [order, setOrder] = useState(initial ? String(initial.order) : "");

  const parsedOrder = useMemo(() => {
    if (order.trim() === "") return undefined;
    return Number(order);
  }, [order]);

  const validOrder =
    parsedOrder === undefined ||
    (Number.isInteger(parsedOrder) && parsedOrder > 0);
  const valid = name.trim().length > 0 && validOrder;

  const handleSubmit = () => {
    if (!valid) return;
    onSubmit({
      name: name.trim(),
      order: parsedOrder,
    });
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="font-medium">
        {isEdit ? "Editar sección" : "Nueva sección"}
      </h3>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
        <div>
          <label className={labelCls}>Nombre</label>
          <input
            className={inputCls}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej. Systems fundamentals"
          />
        </div>

        <div>
          <label className={labelCls}>Orden</label>
          <input
            className={inputCls}
            inputMode="numeric"
            min="1"
            type="number"
            value={order}
            onChange={(event) => setOrder(event.target.value)}
            placeholder="Auto"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={handleSubmit} disabled={!valid}>
          {isEdit ? "Guardar cambios" : "Crear sección"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
