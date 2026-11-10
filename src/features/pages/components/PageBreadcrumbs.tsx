import { ChevronRight } from "lucide-react";
import { useNavigation } from "@/app/NavigationContext";
import { pageTitle, type Page } from "../types";

interface PageBreadcrumbsProps {
  ancestors: Page[];
  current: Page;
}

/** Migas de pan de la cabecera: Páginas › ancestros › página actual. */
export default function PageBreadcrumbs({ ancestors, current }: PageBreadcrumbsProps) {
  const { navigate } = useNavigation();
  const link =
    "max-w-[14rem] shrink truncate rounded px-1 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text";

  return (
    <nav aria-label="Ruta de la página" className="flex min-w-0 items-center gap-0.5">
      <button type="button" className={link} onClick={() => navigate({ view: "pages" })}>
        Páginas
      </button>
      {ancestors.map((page) => (
        <span key={page.id} className="flex min-w-0 items-center gap-0.5">
          <ChevronRight size={12} aria-hidden="true" className="shrink-0 text-text-muted/60" />
          <button
            type="button"
            className={link}
            onClick={() => navigate({ view: "pages", pageId: page.id })}
          >
            {page.icon ? `${page.icon} ` : ""}
            {pageTitle(page)}
          </button>
        </span>
      ))}
      <ChevronRight size={12} aria-hidden="true" className="shrink-0 text-text-muted/60" />
      <span
        aria-current="page"
        className="min-w-0 truncate px-1 text-sm font-medium text-text"
      >
        {current.icon ? `${current.icon} ` : ""}
        {pageTitle(current)}
      </span>
    </nav>
  );
}
