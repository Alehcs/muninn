import { cn } from "@/utils/cn";
import type { View } from "@/app/navigation";

interface SidebarProps {
  view: View;
  onNavigate: (view: View) => void;
}

const NAV_ITEMS: { label: string; view: View }[] = [
  { label: "Hoy", view: "today" },
  { label: "Estudio", view: "study" },
  { label: "Roadmap", view: "roadmap" },
  { label: "TODO", view: "todos" },
  { label: "Notas", view: "notes" },
  { label: "Calendario", view: "calendar" },
  { label: "Historial", view: "history" },
  { label: "Estadísticas", view: "stats" },
  { label: "Hábitos", view: "habits" },
  { label: "Configuración", view: "settings" },
];

export default function Sidebar({ view, onNavigate }: SidebarProps) {
  return (
    <aside className="flex w-60 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="h-8 w-8 rounded-lg bg-accent" />
        <span className="text-lg font-semibold">Aurhabits</span>
        {import.meta.env.DEV && (
          <span
            className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-medium text-text-muted"
            title="Modo desarrollo: usa aurhabits-dev.db, no tus datos reales"
          >
            DEV
          </span>
        )}
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className={cn(
              "rounded-lg px-3 py-2 text-left text-sm transition-colors",
              view === item.view
                ? "bg-accent text-accent-foreground"
                : "text-text-muted hover:bg-surface-hover hover:text-text",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
