import { inputCls, labelCls } from "@/components/formStyles";
import { useState } from "react";
import Button from "@/components/Button";
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
  { value: "check", label: "Check (completar)" },
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
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="mb-4 font-medium">
        {isEdit ? "Editar hábito" : "Nuevo hábito"}
      </h3>

      <div className="flex flex-col gap-3">
        <div>
          <label className={labelCls}>Nombre</label>
          <input
            className={`${inputCls} disabled:opacity-60`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej. Beber agua"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className={labelCls}>Tipo</label>
            <select
              className={`${inputCls} disabled:opacity-60`}
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
          </div>
          <div className="w-32">
            <label className={labelCls}>Objetivo diario</label>
            <input
              type="number"
              min="1"
              className={`${inputCls} disabled:opacity-60`}
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className={labelCls}>Unidad</label>
            <select
              className={`${inputCls} disabled:opacity-60`}
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
          </div>
          <div className="flex-1">
            <label className={labelCls}>Categoría (opcional)</label>
            <select
              className={`${inputCls} disabled:opacity-60`}
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
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="primary" onClick={handleSubmit} disabled={!valid}>
          {isEdit ? "Guardar cambios" : "Crear hábito"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      {isEdit && (
        <p className="mt-3 text-xs text-text-muted">
          El tipo y la unidad no se pueden cambiar tras crear el hábito.
        </p>
      )}
    </div>
  );
}
