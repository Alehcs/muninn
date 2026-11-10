import { useEffect, useState } from "react";
import * as habitLogRepo from "../storage/habitLogRepository";

type HistoryStatus = "loading" | "ready" | "error";

interface HabitHistoryState {
  status: HistoryStatus;
  values: Record<string, number>;
}

/** Carga los valores registrados para una fecha concreta. */
export function useHabitHistory(date: string): HabitHistoryState {
  const [state, setState] = useState<HabitHistoryState>({
    status: "loading",
    values: {},
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", values: {} });

    void habitLogRepo
      .getValuesForDate(date)
      .then((values) => {
        if (!cancelled) setState({ status: "ready", values });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", values: {} });
      });

    return () => {
      cancelled = true;
    };
  }, [date]);

  return state;
}
