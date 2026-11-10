import FormCard, { Field } from "@/components/FormCard";
import { inputCls } from "@/components/formStyles";
import { useMemo, useState } from "react";
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
    <FormCard
      title={isEdit ? "Editar sección" : "Nueva sección"}
      submitLabel={isEdit ? "Guardar cambios" : "Crear sección"}
      valid={valid}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
        <Field label="Nombre">
          <input
            className={inputCls}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej. Systems fundamentals"
          />
        </Field>

        <Field label="Orden">
          <input
            className={inputCls}
            inputMode="numeric"
            min="1"
            type="number"
            value={order}
            onChange={(event) => setOrder(event.target.value)}
            placeholder="Auto"
          />
        </Field>
      </div>
    </FormCard>
  );
}
