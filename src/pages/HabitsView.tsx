import { useState } from "react";
import Button from "@/components/Button";
import HabitForm from "@/features/habits/components/HabitForm";
import HabitManagementCard from "@/features/habits/components/HabitManagementCard";
import type { HabitsStore } from "@/features/habits/hooks/useHabits";
import type { Habit } from "@/features/habits/types";

interface HabitsViewProps {
  store: HabitsStore;
}

/** Estado del formulario: cerrado, o abierto para crear (sin habit) o editar. */
type FormState = { open: false } | { open: true; habit?: Habit };

export default function HabitsView({ store }: HabitsViewProps) {
  const { habits, createHabit, updateHabit, toggleActive, deleteHabit } = store;
  const [form, setForm] = useState<FormState>({ open: false });

  const handleDelete = (habit: Habit) => {
    const ok = window.confirm(
      `Eliminar el hábito "${habit.name}"? Esto también eliminará todo su historial. Si solo quieres dejar de verlo en "Hoy", usa Pausar.`,
    );
    if (!ok) return;

    setForm({ open: false });
    deleteHabit(habit.id);
  };

  return (
    <section className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Gestión de hábitos</h2>
          <p className="text-sm text-text-muted">
            Los hábitos activos aparecen en la vista "Hoy".
          </p>
        </div>
        {!form.open && (
          <Button onClick={() => setForm({ open: true })}>Nuevo hábito</Button>
        )}
      </div>

      {form.open && (
        <div className="mt-4">
          <HabitForm
            initial={form.habit}
            onSubmit={(values) => {
              if (form.habit) {
                updateHabit(form.habit.id, {
                  name: values.name,
                  target: values.target,
                  category: values.category,
                });
              } else {
                createHabit(values);
              }
              setForm({ open: false });
            }}
            onCancel={() => setForm({ open: false })}
          />
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {habits.map((habit) => (
          <HabitManagementCard
            key={habit.id}
            habit={habit}
            onEdit={() => setForm({ open: true, habit })}
            onToggleActive={() => toggleActive(habit.id)}
            onDelete={() => handleDelete(habit)}
          />
        ))}
      </div>
    </section>
  );
}
