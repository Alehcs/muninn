/**
 * Nivel del mapa de calor de un día según su cumplimiento:
 * 0 → 0 %, 1 → 1-49 %, 2 → 50-99 %, 3 → 100 %.
 */
export type CalendarHeatLevel = 0 | 1 | 2 | 3;

export function getHeatLevel(percent: number): CalendarHeatLevel {
  if (percent >= 100) return 3;
  if (percent >= 50) return 2;
  if (percent >= 1) return 1;
  return 0;
}
