import HabitForm from "@/features/habits/components/HabitForm";
import HabitManagementCard from "@/features/habits/components/HabitManagementCard";
import type { HabitsStore } from "@/features/habits/hooks/useHabits";
import type { Habit } from "@/features/habits/types";
import { confirm } from "@/lib/confirm";

/** Estado del formulario: cerrado, o abierto para crear (sin habit) o editar. */
export type HabitFormState = { open: false } | { open: true; habit?: Habit };

interface HabitsViewProps {
  store: HabitsStore;
  /** El estado del formulario vive en la vista "Hábitos" (cabecera + atajo). */
  form: HabitFormState;
  onFormChange: (form: HabitFormState) => void;
}

/** Pestaña "Gestión" de Hábitos: alta, edición, pausa y borrado. */
export default function HabitsView({
  store,
  form,
  onFormChange,
}: HabitsViewProps) {
  const { habits, createHabit, updateHabit, toggleActive, deleteHabit } = store;

  const handleDelete = async (habit: Habit) => {
    const ok = await confirm({
      title: "Eliminar hábito",
      message: `¿Eliminar el hábito "${habit.name}"? Esto también eliminará todo su historial. Si solo quieres dejar de verlo en "Hoy", usa Pausar.`,
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;

    onFormChange({ open: false });
    deleteHabit(habit.id);
  };

  return (
    <section>
      <p className="text-sm text-text-muted">
        Los hábitos activos aparecen en la vista "Hoy".
      </p>

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
              onFormChange({ open: false });
            }}
            onCancel={() => onFormChange({ open: false })}
          />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {habits.map((habit) => (
          <HabitManagementCard
            key={habit.id}
            habit={habit}
            onEdit={() => onFormChange({ open: true, habit })}
            onToggleActive={() => toggleActive(habit.id)}
            onDelete={() => void handleDelete(habit)}
          />
        ))}
      </div>
    </section>
  );
}
