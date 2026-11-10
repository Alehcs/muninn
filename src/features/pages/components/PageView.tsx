import { useNavigation } from "@/app/NavigationContext";
import Button from "@/components/Button";
import PageHeader from "@/components/PageHeader";
import { usePages } from "../hooks/usePages";
import { usePageCommands } from "../hooks/usePageCommands";
import { pageTitle } from "../types";
import PageDocument from "./PageDocument";
import PagesIndexView from "./PagesIndexView";

/** Vista "Páginas": el índice, o una página concreta si hay `pageId`. */
export default function PageView() {
  const { location, navigate } = useNavigation();
  const store = usePages();
  const commands = usePageCommands();
  const pageId = location.pageId;

  if (pageId === undefined) return <PagesIndexView />;

  if (store.status === "loading") {
    return <p className="p-8 text-sm text-text-muted">Cargando páginas…</p>;
  }
  if (store.status === "error") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-text-muted">No se pudieron cargar las páginas.</p>
        <Button onClick={() => void store.reload()}>Reintentar</Button>
      </div>
    );
  }

  const page = store.getPage(pageId);

  if (!page || page.deletedAt !== null) {
    return (
      <>
        <PageHeader title="Páginas" />
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-8 py-24 text-center">
          <p className="text-sm text-text-muted">
            {page
              ? `«${pageTitle(page)}» está en la papelera.`
              : "Esta página no existe (puede que se haya eliminado)."}
          </p>
          <div className="flex gap-2">
            {page && (
              <Button onClick={() => void commands.restore(page)}>Restaurar</Button>
            )}
            <Button variant="ghost" onClick={() => navigate({ view: "pages" })}>
              Ver todas las páginas
            </Button>
          </div>
        </div>
      </>
    );
  }

  return <PageDocument key={page.id} page={page} />;
}
