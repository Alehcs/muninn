export type CalendarDayStatus =
  | "completed"
  | "good"
  | "partial"
  | "low"
  | "empty";

export function getCalendarDayStatus(percent: number): CalendarDayStatus {
  if (percent >= 100) return "completed";
  if (percent >= 70) return "good";
  if (percent >= 30) return "partial";
  if (percent >= 1) return "low";
  return "empty";
}
