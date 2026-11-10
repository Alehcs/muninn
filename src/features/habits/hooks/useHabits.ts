import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notify } from "@/lib/notify";
import { buildHabit } from "../utils/habitFactory";
import { getLocalDate } from "../utils/date";
import { getDailyProgress, getHabitProgress } from "../utils/progress";
import type { DailyProgress } from "../utils/progress";
import * as habitRepo from "../storage/habitRepository";
import * as habitLogRepo from "../storage/habitLogRepository";
import type {
  Habit,
  HabitEditInput,
  HabitProgress,
  NewHabitInput,
} from "../types";

/** Estado de inicialización de la base de datos. */
export type HabitsStatus = "loading" | "ready" | "error";

interface ReloadOptions {
  seedDefaults?: boolean;
  showLoading?: boolean;
}

/** API del estado de hábitos, compartida por las vistas "Hoy" y "Hábitos". */
export interface HabitsStore {
  status: HabitsStatus;
  /** Todos los hábitos: activos y pausados. */
  habits: Habit[];
  /** Hábitos activos con su progreso del día (para la vista "Hoy"). */
  todayHabits: HabitProgress[];
  daily: DailyProgress;
  // Acciones de progreso diario.
  toggleCheck: (id: string) => void;
  increment: (id: string) => void;
  /** Resta 1 (nunca baja de 0). */
  decrement: (id: string) => void;
  addMinutes: (id: string, minutes: number) => void;
  reset: (id: string) => void;
  // CRUD de hábitos.
  createHabit: (input: NewHabitInput) => void;
  updateHabit: (id: string, patch: HabitEditInput) => void;
  toggleActive: (id: string) => void;
  deleteHabit: (id: string) => void;
  reload: (options?: ReloadOptions) => Promise<void>;
}

/**
 * Estado de hábitos respaldado por SQLite.
 * Al montar carga los datos; si la tabla está vacía siembra los hábitos por
 * defecto. Las acciones actualizan el estado local y persisten en la DB.
 */
export function useHabits(): HabitsStore {
  const [status, setStatus] = useState<HabitsStatus>("loading");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [values, setValues] = useState<Record<string, number>>({});
  const [currentDate, setCurrentDate] = useState(() => getLocalDate());

  const loadedRef = useRef(false);

  const reload = useCallback(
    async (options: ReloadOptions = {}) => {
      try {
        const { seedDefaults = true, showLoading = true } = options;
        if (showLoading) setStatus("loading");
        let stored = await habitRepo.listHabits();
        if (stored.length === 0 && seedDefaults) {
          await habitRepo.seedDefaultHabits();
          stored = await habitRepo.listHabits();
        }
        const todayValues = await habitLogRepo.getValuesForDate(currentDate);
        setHabits(stored);
        setValues(todayValues);
        loadedRef.current = true;
        setStatus("ready");
      } catch (error) {
        console.error("No se pudieron cargar los hábitos", error);
        // La pantalla de error completa solo aparece si falla la carga inicial.
        if (loadedRef.current) {
          setStatus("ready");
          notify.error("No se pudieron recargar tus hábitos.");
        } else {
          setStatus("error");
        }
      }
    },
    [currentDate],
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setCurrentDate((previous) => {
        const next = getLocalDate();
        return next === previous ? previous : next;
      });
    }, 60_000);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void reload().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  /**
   * Si una escritura falla, la interfaz ya mostraba el cambio como hecho:
   * se avisa y se recarga desde la base para que la pantalla refleje la verdad.
   */
  const handleWriteError = (error: unknown) => {
    console.error("No se pudo guardar el cambio", error);
    notify.error("No se pudo guardar el cambio. Se han recargado tus datos.");
    void reload({ seedDefaults: false, showLoading: false });
  };

  const applyValue = (
    habitId: string,
    compute: (current: number) => number,
  ) => {
    const next = Math.max(0, compute(values[habitId] ?? 0));
    setValues((prev) => ({ ...prev, [habitId]: next }));

    const habit = habits.find((item) => item.id === habitId);
    if (habit) {
      const completed = next >= habit.target;
      void habitLogRepo
        .upsertLog(habitId, currentDate, next, completed)
        .catch(handleWriteError);
    }
  };

  const toggleCheck = (id: string) =>
    applyValue(id, (value) => (value > 0 ? 0 : 1));
  const increment = (id: string) => applyValue(id, (value) => value + 1);
  const decrement = (id: string) => applyValue(id, (value) => value - 1);
  const addMinutes = (id: string, minutes: number) =>
    applyValue(id, (value) => value + minutes);
  const reset = (id: string) => applyValue(id, () => 0);

  const createHabit = (input: NewHabitInput) => {
    const habit = buildHabit(input);
    setHabits((prev) => [...prev, habit]);
    setValues((prev) => ({ ...prev, [habit.id]: 0 }));
    void habitRepo.insertHabit(habit).catch(handleWriteError);
  };

  const updateHabit = (id: string, patch: HabitEditInput) => {
    setHabits((prev) =>
      prev.map((habit) => (habit.id === id ? { ...habit, ...patch } : habit)),
    );
    void habitRepo.updateHabit(id, patch).catch(handleWriteError);
  };

  const toggleActive = (id: string) => {
    const habit = habits.find((item) => item.id === id);
    const nextActive = !(habit?.active ?? true);
    setHabits((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, active: nextActive } : item,
      ),
    );
    void habitRepo.setHabitActive(id, nextActive).catch(handleWriteError);
  };

  const deleteHabit = (id: string) => {
    setHabits((prev) => prev.filter((habit) => habit.id !== id));
    setValues((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    void habitRepo.deleteHabit(id).catch(handleWriteError);
  };

  const activeHabits = useMemo(
    () => habits.filter((habit) => habit.active),
    [habits],
  );

  const todayHabits = useMemo(
    () =>
      activeHabits.map((habit) =>
        getHabitProgress(habit, values[habit.id] ?? 0),
      ),
    [activeHabits, values],
  );

  const daily = useMemo(
    () => getDailyProgress(activeHabits, values),
    [activeHabits, values],
  );

  return {
    status,
    habits,
    todayHabits,
    daily,
    toggleCheck,
    increment,
    decrement,
    addMinutes,
    reset,
    createHabit,
    updateHabit,
    toggleActive,
    deleteHabit,
    reload,
  };
}
