import FormCard, { Field } from "@/components/FormCard";
import { inputCls } from "@/components/formStyles";
import { useState } from "react";
import type {
  Habit,
  HabitCategory,
  HabitType,
  HabitUnit,
  NewHabitInput,
} from "../types";

interface HabitFormProps {
  /** Si viene definido, el formulario funciona en modo edición. */
  initial?: Habit;
  onSubmit: (values: NewHabitInput) => void;
  onCancel: () => void;
}

const TYPE_OPTIONS: { value: HabitType; label: string }[] = [
  { value: "check", label: "Una vez (completar)" },
  { value: "count", label: "Conteo (repeticiones)" },
  { value: "duration", label: "Duración (minutos)" },
];

const UNIT_OPTIONS: HabitUnit[] = [
  "completado",
  "veces",
  "minutos",
  "problemas",
];

const CATEGORY_OPTIONS: HabitCategory[] = [
  "salud",
  "estudio",
  "orden",
  "ejercicio",
  "idioma",
  "otra",
];


export default function HabitForm({
  initial,
  onSubmit,
  onCancel,
}: HabitFormProps) {
  const isEdit = initial !== undefined;
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<HabitType>(initial?.type ?? "check");
  const [target, setTarget] = useState(String(initial?.target ?? 1));
  const [unit, setUnit] = useState<HabitUnit>(initial?.unit ?? "completado");
  const [category, setCategory] = useState<HabitCategory | "">(
    initial?.category ?? "",
  );

  const targetNumber = Number(target);
  const valid =
    name.trim().length > 0 &&
    Number.isFinite(targetNumber) &&
    targetNumber > 0;

  const handleSubmit = () => {
    if (!valid) return;
    onSubmit({
      name: name.trim(),
      type,
      target: targetNumber,
      unit,
      category: category === "" ? undefined : category,
    });
  };

  return (
    <FormCard
      title={isEdit ? "Editar hábito" : "Nuevo hábito"}
      submitLabel={isEdit ? "Guardar cambios" : "Crear hábito"}
      valid={valid}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      note={
        isEdit
          ? "El tipo y la unidad no se pueden cambiar tras crear el hábito."
          : undefined
      }
    >
      <Field label="Nombre">
        <input
          className={inputCls}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej. Beber agua"
        />
      </Field>

      <div className="flex gap-3">
        <Field label="Tipo" className="flex-1">
          <select
            className={inputCls}
            value={type}
            disabled={isEdit}
            onChange={(event) => setType(event.target.value as HabitType)}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Objetivo diario" className="w-32">
          <input
            type="number"
            min="1"
            className={inputCls}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
        </Field>
      </div>

      <div className="flex gap-3">
        <Field label="Unidad" className="flex-1">
          <select
            className={inputCls}
            value={unit}
            disabled={isEdit}
            onChange={(event) => setUnit(event.target.value as HabitUnit)}
          >
            {UNIT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Categoría (opcional)" className="flex-1">
          <select
            className={inputCls}
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as HabitCategory | "")
            }
          >
            <option value="">Sin categoría</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </FormCard>
  );
}
