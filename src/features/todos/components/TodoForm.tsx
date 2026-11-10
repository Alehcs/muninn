import { useMemo, useState } from "react";
import FormCard, { Field } from "@/components/FormCard";
import { inputCls } from "@/components/formStyles";
import { usePages } from "@/features/pages/hooks/usePages";
import { flattenTree } from "@/features/pages/utils/pageTree";
import { pageTitle } from "@/features/pages/types";
import { optional } from "@/lib/text";
import { PRIORITY_LABELS, type TodoInput, type TodoItem, type TodoPriority } from "../types";

interface TodoFormProps {
  initial?: TodoItem;
  /** Página preseleccionada en una tarea nueva. */
  defaultPageId?: string;
  onSubmit: (values: TodoInput) => void;
  onCancel: () => void;
}

/** Formulario completo de una tarea: título, notas, fecha, prioridad y página. */
export default function TodoForm({
  initial,
  defaultPageId,
  onSubmit,
  onCancel,
}: TodoFormProps) {
  const isEdit = initial !== undefined;
  const { pages, tree } = usePages();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [priority, setPriority] = useState<TodoPriority>(initial?.priority ?? 0);
  const [pageId, setPageId] = useState(initial?.pageId ?? defaultPageId ?? "");

  const options = useMemo(() => {
    const list = flattenTree(tree).map(({ page, depth }) => ({
      id: page.id,
      label: `${"  ".repeat(depth)}${pageTitle(page)}`,
    }));
    // Una página en la papelera sigue enlazada hasta que el usuario la cambie.
    const linked = pages.find((page) => page.id === initial?.pageId);
    if (linked && linked.deletedAt !== null) {
      list.push({ id: linked.id, label: `${pageTitle(linked)} (en la papelera)` });
    }
    return list;
  }, [tree, pages, initial?.pageId]);

  const valid = title.trim().length > 0;

  const handleSubmit = () => {
    if (!valid) return;
    onSubmit({
      title: title.trim(),
      notes: optional(notes),
      dueDate: dueDate === "" ? null : dueDate,
      priority,
      pageId: pageId === "" ? null : pageId,
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
      <Field label="Título">
        <input
          className={inputCls}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ej. Revisar la migración de la lista"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Fecha">
          <input
            type="date"
            className={inputCls}
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </Field>

        <Field label="Prioridad">
          <select
            className={inputCls}
            value={priority}
            onChange={(event) => setPriority(Number(event.target.value) as TodoPriority)}
          >
            {([0, 1, 2, 3] as const).map((value) => (
              <option key={value} value={value}>
                {PRIORITY_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Página">
          <select
            className={inputCls}
            value={pageId}
            onChange={(event) => setPageId(event.target.value)}
          >
            <option value="">Sin página</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
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
