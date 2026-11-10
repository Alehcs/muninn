/** 0 sin prioridad, 1 baja, 2 media, 3 alta. */
export type TodoPriority = 0 | 1 | 2 | 3;

export interface TodoItem {
  id: string;
  title: string;
  notes?: string;
  completed: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  /** Fecha límite en formato YYYY-MM-DD (horario local). */
  dueDate?: string;
  priority: TodoPriority;
  /** Página (proyecto) a la que pertenece. */
  pageId?: string;
}

/** Datos editables de una tarea (los usan el alta y el formulario completo). */
export interface TodoInput {
  title: string;
  notes?: string;
  dueDate?: string | null;
  priority?: TodoPriority;
  pageId?: string | null;
}

export const PRIORITY_LABELS: Record<TodoPriority, string> = {
  0: "Sin prioridad",
  1: "Baja",
  2: "Media",
  3: "Alta",
};

export function toPriority(value: number): TodoPriority {
  return value === 1 || value === 2 || value === 3 ? value : 0;
}
