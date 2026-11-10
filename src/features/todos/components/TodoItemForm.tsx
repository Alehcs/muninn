import FormCard, { Field } from "@/components/FormCard";
import { inputCls } from "@/components/formStyles";
import { optional } from "@/lib/text";
import { useMemo, useState } from "react";
import type { TodoInput, TodoItem } from "../types";

interface TodoItemFormProps {
  initial?: TodoItem;
  onSubmit: (values: TodoInput) => void;
  onCancel: () => void;
}


export default function TodoItemForm({
  initial,
  onSubmit,
  onCancel,
}: TodoItemFormProps) {
  const isEdit = initial !== undefined;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
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
  const valid = title.trim().length > 0 && validOrder;

  const handleSubmit = () => {
    if (!valid) return;
    onSubmit({
      title: title.trim(),
      notes: optional(notes),
      orderIndex: parsedOrderIndex,
    });
  };

  return (
    <FormCard
      title={isEdit ? "Editar tarea" : "Nueva tarea"}
      submitLabel={isEdit ? "Guardar cambios" : "Crear tarea"}
      valid={valid}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
        <Field label="Título">
          <input
            className={inputCls}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ej. Revisar la migración de la lista"
          />
        </Field>

        <Field label="Orden">
          <input
            className={inputCls}
            inputMode="numeric"
            min="1"
            type="number"
            value={orderIndex}
            onChange={(event) => setOrderIndex(event.target.value)}
            placeholder="Auto"
          />
        </Field>
      </div>

      <Field label="Notas (opcional · Cmd/Ctrl+Enter para guardar)">
        <textarea
          className={`${inputCls} min-h-24 resize-y`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Contexto corto, pasos o recordatorios"
        />
      </Field>
    </FormCard>
  );
}
