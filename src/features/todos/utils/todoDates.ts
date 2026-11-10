/** Lógica pura de fechas de tareas. Todas las fechas son YYYY-MM-DD locales. */

const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Fecha local de un `Date` en formato YYYY-MM-DD. */
export function toDateKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Interpreta YYYY-MM-DD como fecha local (mediodía, a salvo de cambios de hora). */
export function parseDateKey(value: string): Date | null {
  const match = DATE_RE.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  const date = new Date(year, month, day, 12);
  return date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
    ? date
    : null;
}

/** Desplaza una fecha YYYY-MM-DD un número de días. */
export function addDays(value: string, days: number): string {
  const date = parseDateKey(value);
  if (!date) return value;
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** "lun 17 nov" (con el año si no es el de `today`). */
export function formatShortDate(value: string, today: string): string {
  const date = parseDateKey(value);
  if (!date) return value;
  const base = `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === Number(today.slice(0, 4))
    ? base
    : `${base} ${date.getFullYear()}`;
}

/** Etiqueta de una fecha límite: "Hoy", "Mañana", "Ayer" o "lun 17 nov". */
export function dueLabel(value: string, today: string): string {
  if (value === today) return "Hoy";
  if (value === addDays(today, 1)) return "Mañana";
  if (value === addDays(today, -1)) return "Ayer";
  return formatShortDate(value, today);
}

/** ¿La fecha ya pasó? (hoy no cuenta como vencida). */
export function isOverdue(value: string | undefined, today: string): boolean {
  return value !== undefined && value < today;
}

export interface DayGroup<T> {
  /** YYYY-MM-DD */
  date: string;
  /** "Mañana · mar 18 nov" */
  label: string;
  items: T[];
}

/** Agrupa por día (orden ascendente) conservando el orden dado dentro de cada día. */
export function groupByDay<T extends { dueDate?: string }>(
  items: readonly T[],
  today: string,
): DayGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    if (item.dueDate === undefined) continue;
    const list = groups.get(item.dueDate);
    if (list) list.push(item);
    else groups.set(item.dueDate, [item]);
  }
  return [...groups.keys()]
    .sort()
    .map((date) => {
      const relative = dueLabel(date, today);
      const short = formatShortDate(date, today);
      return {
        date,
        label: relative === short ? short : `${relative} · ${short}`,
        items: groups.get(date)!,
      };
    });
}
