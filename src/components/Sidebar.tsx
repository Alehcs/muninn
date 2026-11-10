import {
  CalendarCheck,
  FilePlus2,
  ListChecks,
  Repeat,
  Plus,
  Settings,
  SquareCheckBig,
  StickyNote,
  Table2,
  Timer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ActiveTimerIndicator from "@/components/ActiveTimerIndicator";
import { useNavigation } from "@/app/NavigationContext";
import { NAV_GROUPS, SETTINGS_ITEM } from "@/app/navigation";
import type { NavItem, View } from "@/app/navigation";
import RowMenu from "@/components/RowMenu";
import PageTree from "@/features/pages/components/PageTree";
import { usePageCommands } from "@/features/pages/hooks/usePageCommands";
import { cn } from "@/utils/cn";

const ICONS: Record<View, LucideIcon> = {
  today: CalendarCheck,
  pages: StickyNote,
  todos: SquareCheckBig,
  roadmap: ListChecks,
  habits: Repeat,
  study: Timer,
  settings: Settings,
};

function NavButton({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: (view: View) => void;
}) {
  const Icon = ICONS[item.view];
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.view)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm transition-colors",
        active
          ? "bg-surface-hover font-medium text-text"
          : "text-text-muted hover:bg-surface-hover hover:text-text",
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent"
        />
      )}
      <Icon
        size={16}
        strokeWidth={1.5}
        aria-hidden="true"
        className={cn("shrink-0", active && "text-accent")}
      />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

/** "Páginas": entrada del índice, botón "+" y el árbol de páginas debajo. */
function PagesSection({ active }: { active: boolean }) {
  const { navigate } = useNavigation();
  const commands = usePageCommands();
  const item = NAV_GROUPS.flatMap((group) => group.items).find(
    (candidate) => candidate.view === "pages",
  )!;

  return (
    <>
      <div className="group/pages relative">
        <NavButton item={item} active={active} onNavigate={(view) => navigate(view)} />
        <div className="absolute right-1 top-0.5 opacity-0 focus-within:opacity-100 group-hover/pages:opacity-100 [@media(hover:none)]:opacity-100">
          <RowMenu
            label="Nueva página o colección"
            icon={Plus}
            floating
            items={[
              { label: "Nueva página", icon: FilePlus2, onSelect: () => void commands.createRoot() },
              { label: "Nueva colección", icon: Table2, onSelect: () => commands.createCollection(null) },
            ]}
          />
        </div>
      </div>
      <PageTree />
    </>
  );
}

export default function Sidebar() {
  const { location, navigate: onNavigate } = useNavigation();
  const view = location.view;
  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-[52px] items-center gap-2 px-5">
        <span
          aria-hidden="true"
          className="h-5 w-5 rounded-md bg-accent"
        />
        <span className="font-semibold">Aurhabits</span>
        {import.meta.env.DEV && (
          <span
            className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-medium text-text-muted"
            title="Modo desarrollo: usa aurhabits-dev.db, no tus datos reales"
          >
            DEV
          </span>
        )}
      </div>

      <nav
        aria-label="Principal"
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pt-2"
      >
        {NAV_GROUPS.map((group, index) => (
          <div key={group.label ?? index} className="flex flex-col gap-0.5">
            {group.label && (
              <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-text-muted/80">
                {group.label}
              </p>
            )}
            {group.items.map((item) =>
              item.view === "pages" ? (
                <PagesSection
                  key={item.view}
                  active={view === "pages" && location.pageId === undefined}
                />
              ) : (
                <NavButton
                  key={item.view}
                  item={item}
                  active={view === item.view}
                  onNavigate={onNavigate}
                />
              ),
            )}
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-2 border-t border-border p-3">
        <ActiveTimerIndicator />
        <NavButton
          item={SETTINGS_ITEM}
          active={view === SETTINGS_ITEM.view}
          onNavigate={onNavigate}
        />
      </div>
    </aside>
  );
}
