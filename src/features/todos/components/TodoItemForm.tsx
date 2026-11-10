import { useMemo, useState } from "react";
import Button from "@/components/Button";
import type { TodoInput, TodoItem } from "../types";

interface TodoItemFormProps {
  initial?: TodoItem;
  onSubmit: (values: TodoInput) => void;
  onCancel: () => void;
}

const inputCls =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent";
const labelCls = "mb-1 block text-xs font-medium text-text-muted";

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
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
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="font-medium">{isEdit ? "Editar tarea" : "Nueva tarea"}</h3>

      <div className="mt-4 flex flex-col gap-3">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
          <div>
            <label className={labelCls}>Título</label>
            <input
              className={inputCls}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. Revisar migración de Roadmap"
            />
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

        <div>
          <label className={labelCls}>Notas (opcional)</label>
          <textarea
            className={`${inputCls} min-h-24 resize-y`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Contexto corto, pasos o recordatorios"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={handleSubmit} disabled={!valid}>
          {isEdit ? "Guardar cambios" : "Crear tarea"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
