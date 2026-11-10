import { FileText, Pin } from "lucide-react";
import { useNavigation } from "@/app/NavigationContext";
import CompactRow from "@/components/CompactRow";
import { dueLabel, toDateKey } from "@/features/todos/utils/todoDates";
import { usePages } from "../hooks/usePages";
import { comparePages } from "../utils/pageTree";
import { pageTitle, type Page } from "../types";

/** Páginas que muestra el panel "Hoy". */
const MAX_PAGES = 5;

/**
 * Las páginas que se enseñan en "Hoy": primero las fijadas y, si sobra
 * sitio, las editadas más recientemente. Solo páginas activas.
 */
export function pickHomePages(pages: readonly Page[], max = MAX_PAGES): Page[] {
  const active = pages.filter((page) => page.deletedAt === null);
  const pinned = active.filter((page) => page.pinned).sort(comparePages).slice(0, max);
  const recent = active
    .filter((page) => !page.pinned)
    .sort((a, b) =>
      a.updatedAt === b.updatedAt ? 0 : a.updatedAt < b.updatedAt ? 1 : -1,
    )
    .slice(0, Math.max(0, max - pinned.length));
  return [...pinned, ...recent];
}

/** Bloque "Páginas" del panel "Hoy": fijadas y recientes; un clic las abre. */
export default function TodayPages() {
  const { status, pages } = usePages();
  const { navigate } = useNavigation();
  const today = toDateKey(new Date());
  const shown = pickHomePages(pages);

  return (
    <section aria-labelledby="today-pages-heading">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id="today-pages-heading" className="text-sm font-medium">
          Páginas
        </h2>
        <button
          type="button"
          onClick={() => navigate("pages")}
          className="text-xs text-text-muted transition-colors hover:text-text"
        >
          Ver todas
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface p-1">
        {status === "ready" && shown.length === 0 ? (
          <p className="px-3 py-1.5 text-sm text-text-muted">Aún no hay páginas.</p>
        ) : (
          shown.map((page) => (
            <CompactRow
              key={page.id}
              onActivate={() => navigate({ view: "pages", pageId: page.id })}
              leading={
                page.icon ? (
                  <span aria-hidden="true" className="w-4 shrink-0 text-center text-sm leading-none">
                    {page.icon}
                  </span>
                ) : (
                  <FileText
                    size={14}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="shrink-0 text-text-muted"
                  />
                )
              }
              trailing={
                page.pinned ? (
                  <Pin
                    size={12}
                    strokeWidth={1.75}
                    aria-label="Fijada"
                    className="shrink-0 text-text-muted"
                  />
                ) : (
                  <span className="shrink-0 text-xs text-text-muted">
                    {dueLabel(toDateKey(new Date(page.updatedAt)), today)}
                  </span>
                )
              }
            >
              <span className="min-w-0 truncate text-sm" title={pageTitle(page)}>
                {pageTitle(page)}
              </span>
            </CompactRow>
          ))
        )}
      </div>
    </section>
  );
}
