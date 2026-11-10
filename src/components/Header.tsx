import ThemeModeSelector from "@/features/theme/components/ThemeModeSelector";
import type { ThemePreference } from "@/features/theme/types";
import type { View } from "@/app/navigation";

interface HeaderProps {
  view: View;
  preference: ThemePreference;
  onPreferenceChange: (value: ThemePreference) => void;
}

const TITLES: Record<View, string> = {
  today: "Hoy",
  study: "Estudio",
  roadmap: "Roadmap",
  todos: "TODO",
  notes: "Notas",
  calendar: "Calendario",
  history: "Historial",
  stats: "Estadísticas",
  habits: "Hábitos",
  settings: "Configuración",
};

export default function Header({
  view,
  preference,
  onPreferenceChange,
}: HeaderProps) {
  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <header className="flex items-center justify-between border-b border-border px-8 py-4">
      <div>
        <h1 className="text-xl font-semibold">{TITLES[view]}</h1>
        {view === "today" && (
          <p className="text-sm capitalize text-text-muted">{today}</p>
        )}
      </div>
      <ThemeModeSelector value={preference} onChange={onPreferenceChange} />
    </header>
  );
}
