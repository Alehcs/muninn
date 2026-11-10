export interface PomodoroConfig {
  focusMinutes: number;
  breakMinutes: number;
  cycles: number;
}

export interface PomodoroPreset extends PomodoroConfig {
  id: string;
  label: string;
  description: string;
}

export const DEFAULT_POMODORO_CYCLES = 4;

export const POMODORO_PRESETS: PomodoroPreset[] = [
  {
    id: "classic-25",
    label: "25 + 5",
    description: "Ritmo clásico para empezar suave.",
    focusMinutes: 25,
    breakMinutes: 5,
    cycles: DEFAULT_POMODORO_CYCLES,
  },
  {
    id: "deep-45",
    label: "45 + 10",
    description: "Bloque largo con pausa breve.",
    focusMinutes: 45,
    breakMinutes: 10,
    cycles: DEFAULT_POMODORO_CYCLES,
  },
  {
    id: "steady-50",
    label: "50 + 10",
    description: "Para sesiones de lectura o práctica.",
    focusMinutes: 50,
    breakMinutes: 10,
    cycles: DEFAULT_POMODORO_CYCLES,
  },
  {
    id: "wide-60",
    label: "60 + 15",
    description: "Enfoque amplio con descanso generoso.",
    focusMinutes: 60,
    breakMinutes: 15,
    cycles: DEFAULT_POMODORO_CYCLES,
  },
];

export const DEFAULT_CUSTOM_POMODORO: PomodoroConfig = {
  focusMinutes: 30,
  breakMinutes: 5,
  cycles: 3,
};
