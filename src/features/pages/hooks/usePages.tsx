import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { confirm } from "@/lib/confirm";
import { notify } from "@/lib/notify";
import * as pageRepo from "../storage/pageRepository";
import { pageTitle, type Page } from "../types";
import MovePageDialog from "../components/MovePageDialog";
import NewCollectionDialog from "../components/NewCollectionDialog";
import {
  withRowValue,
  withView,
  type CellValue,
  type CollectionTemplate,
  type ColumnType,
  type ViewSpec,
} from "../utils/collection";
import { forgetDraft, rememberDraft } from "../utils/pageDrafts";
import { buildTree, getCollectionOf, getTrashRoots, type PageNode } from "../utils/pageTree";

export type PagesStatus = "loading" | "ready" | "error";

export interface PagesStore {
  status: PagesStatus;
  /** Todas las filas (activas y en la papelera). */
  pages: Page[];
  /** Páginas activas, como árbol (fijadas primero). */
  tree: PageNode[];
  /** Entradas de la papelera (raíces de cada grupo borrado junto). */
  trash: Page[];
  getPage: (id: string) => Page | undefined;
  reload: () => Promise<void>;
  /** Crea una página (vacía, sin título) y devuelve su id, o null si falla. */
  createPage: (parentId?: string | null) => Promise<string | null>;
  /** Guarda el cuerpo. Lanza si falla, para que el editor conserve el texto. */
  saveContent: (id: string, markdown: string) => Promise<void>;
  saveTitle: (id: string, title: string) => Promise<void>;
  saveIcon: (id: string, icon: string | null) => Promise<void>;
  saveCategory: (id: string, category: string) => Promise<void>;
  setPinned: (id: string, pinned: boolean) => Promise<void>;
  movePage: (id: string, parentId: string | null) => Promise<void>;
  /** Abre el diálogo "Nueva colección" (vacía o con plantilla) bajo `parentId`. */
  requestNewCollection: (
    parentId: string | null,
    onCreated?: (id: string) => void,
  ) => void;
  createCollection: (
    parentId: string | null,
    template?: CollectionTemplate,
  ) => Promise<string | null>;
  /** Convierte una página sin subpáginas en colección. */
  convertToCollection: (id: string) => Promise<boolean>;
  /** Crea una fila al final de la colección y devuelve su id. */
  createRow: (collectionId: string, title: string) => Promise<string | null>;
  /** Valor de una celda: se refleja al instante y se guarda a continuación. */
  saveRowValue: (rowId: string, columnId: string, value: CellValue | null) => Promise<void>;
  saveView: (collectionId: string, view: ViewSpec) => Promise<void>;
  addColumn: (collectionId: string, input: { name: string; type: ColumnType }) => Promise<void>;
  renameColumn: (collectionId: string, columnId: string, name: string) => Promise<void>;
  deleteColumn: (collectionId: string, columnId: string) => Promise<void>;
  /** Devuelve cuántos valores se perdieron al convertir. */
  changeColumnType: (collectionId: string, columnId: string, to: ColumnType) => Promise<number>;
  addOption: (collectionId: string, columnId: string, label: string) => Promise<void>;
  renameOption: (
    collectionId: string,
    columnId: string,
    optionId: string,
    label: string,
  ) => Promise<void>;
  deleteOption: (collectionId: string, columnId: string, optionId: string) => Promise<void>;
  /** Fija el orden manual de las filas (ids en el orden deseado). */
  reorderRows: (orderedIds: string[]) => Promise<void>;
  /** Abre el selector "Mover a…" para una página. */
  requestMove: (id: string) => void;
  trashPage: (id: string) => Promise<void>;
  restorePage: (id: string) => Promise<void>;
  deletePermanently: (id: string) => Promise<void>;
}

const PagesContext = createContext<PagesStore | null>(null);

export function usePages(): PagesStore {
  const store = useContext(PagesContext);
  if (store === null) throw new Error("usePages debe usarse dentro de <PagesProvider>.");
  return store;
}

/**
 * Estado compartido de las páginas (barra lateral, índice y vista de página).
 * Los cambios se escriben primero en la base y luego se reflejan en memoria;
 * si una escritura falla se avisa y se recarga lo que hay realmente.
 */
export function PagesProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PagesStatus>("loading");
  const [pages, setPages] = useState<Page[]>([]);
  const [moving, setMoving] = useState<string | null>(null);
  const [newCollection, setNewCollection] = useState<{
    parentId: string | null;
    onCreated?: (id: string) => void;
  } | null>(null);
  const loadedRef = useRef(false);

  const reload = useCallback(async () => {
    try {
      setPages(await pageRepo.listPages());
      loadedRef.current = true;
      setStatus("ready");
    } catch (error) {
      console.error("Pages load failed", error);
      if (loadedRef.current) notify.error("No se pudieron recargar las páginas.");
      else setStatus("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const patch = useCallback((id: string, changes: Partial<Page>) => {
    setPages((current) =>
      current.map((page) => (page.id === id ? { ...page, ...changes } : page)),
    );
  }, []);

  /** Ejecuta una escritura; si falla, avisa y recarga el estado real. */
  const attempt = useCallback(
    async (message: string, write: () => Promise<void>): Promise<void> => {
      try {
        await write();
      } catch (error) {
        console.error(message, error);
        notify.error(message);
        await reload();
      }
    },
    [reload],
  );

  /** Acciones con identidad estable: no cambian al guardar o editar. */
  const actions = useMemo<Omit<PagesStore, "status" | "pages" | "tree" | "trash" | "getPage">>(() => {
    return {
      reload,
      requestMove: setMoving,
      requestNewCollection: (parentId, onCreated) => setNewCollection({ parentId, onCreated }),

      createCollection: async (parentId, template) => {
        try {
          const page = await pageRepo.createCollection({ parentId, template });
          setPages((current) => [...current, page]);
          return page.id;
        } catch (error) {
          console.error("Collection create failed", error);
          notify.error("No se pudo crear la colección.");
          return null;
        }
      },

      convertToCollection: async (id) => {
        try {
          const converted = await pageRepo.convertToCollection(id);
          if (converted) await reload();
          return converted;
        } catch (error) {
          console.error("Collection convert failed", error);
          notify.error("No se pudo convertir la página en colección.");
          return false;
        }
      },

      createRow: async (collectionId, title) => {
        try {
          const row = await pageRepo.createRow(collectionId, title);
          setPages((current) => [...current, row]);
          return row.id;
        } catch (error) {
          console.error("Row create failed", error);
          notify.error("No se pudo crear el elemento.");
          return null;
        }
      },

      saveRowValue: (rowId, columnId, value) => {
        // Optimista: la celda cambia ya; solo se toca esa fila.
        const now = new Date().toISOString();
        setPages((current) =>
          current.map((page) =>
            page.id === rowId
              ? { ...page, properties: withRowValue(page.properties, columnId, value), updatedAt: now }
              : page,
          ),
        );
        return attempt("No se pudo guardar el valor.", async () => {
          await pageRepo.saveRowValue(rowId, columnId, value);
        });
      },

      saveView: (collectionId, view) => {
        setPages((current) =>
          current.map((page) =>
            page.id === collectionId
              ? { ...page, properties: withView(page.properties, view) }
              : page,
          ),
        );
        return attempt("No se pudo guardar la vista.", () =>
          pageRepo.saveCollectionView(collectionId, view),
        );
      },

      addColumn: (collectionId, input) =>
        attempt("No se pudo añadir la columna.", async () => {
          await pageRepo.addCollectionColumn(collectionId, input);
          await reload();
        }),

      renameColumn: (collectionId, columnId, name) =>
        attempt("No se pudo renombrar la columna.", async () => {
          await pageRepo.renameCollectionColumn(collectionId, columnId, name);
          await reload();
        }),

      deleteColumn: (collectionId, columnId) =>
        attempt("No se pudo eliminar la columna.", async () => {
          await pageRepo.deleteCollectionColumn(collectionId, columnId);
          await reload();
        }),

      changeColumnType: async (collectionId, columnId, to) => {
        let lost = 0;
        await attempt("No se pudo cambiar el tipo de la columna.", async () => {
          lost = await pageRepo.changeCollectionColumnType(collectionId, columnId, to);
          await reload();
        });
        return lost;
      },

      addOption: (collectionId, columnId, label) =>
        attempt("No se pudo añadir la opción.", async () => {
          await pageRepo.addColumnOption(collectionId, columnId, label);
          await reload();
        }),

      renameOption: (collectionId, columnId, optionId, label) =>
        attempt("No se pudo renombrar la opción.", async () => {
          await pageRepo.renameColumnOption(collectionId, columnId, optionId, label);
          await reload();
        }),

      deleteOption: (collectionId, columnId, optionId) =>
        attempt("No se pudo eliminar la opción.", async () => {
          await pageRepo.deleteColumnOption(collectionId, columnId, optionId);
          await reload();
        }),

      reorderRows: (orderedIds) => {
        const position = new Map(orderedIds.map((id, index) => [id, index]));
        setPages((current) =>
          current.map((page) =>
            position.has(page.id) ? { ...page, sortOrder: position.get(page.id)! } : page,
          ),
        );
        return attempt("No se pudo guardar el orden.", () => pageRepo.reorderPages(orderedIds));
      },

      createPage: async (parentId = null) => {
        try {
          const page = await pageRepo.createPage({ parentId });
          setPages((current) => [...current, page]);
          return page.id;
        } catch (error) {
          console.error("Page create failed", error);
          notify.error("No se pudo crear la página.");
          return null;
        }
      },

      saveContent: async (id, markdown) => {
        // El borrador queda anotado hasta que se confirma la escritura: si falla y la
        // página se reabre antes del reintento, se recupera en lugar de la versión vieja.
        rememberDraft(id, markdown);
        const saved = await pageRepo.savePageContent(id, markdown);
        forgetDraft(id, markdown);
        patch(id, {
          content: markdown,
          contentFormat: saved.contentFormat,
          updatedAt: saved.updatedAt,
        });
      },

      saveTitle: (id, title) =>
        attempt("No se pudo guardar el título.", async () => {
          const updatedAt = await pageRepo.savePageTitle(id, title);
          patch(id, { title, updatedAt });
        }),

      saveIcon: (id, icon) =>
        attempt("No se pudo guardar el icono.", async () => {
          await pageRepo.savePageIcon(id, icon);
          patch(id, { icon: icon ?? undefined, updatedAt: new Date().toISOString() });
        }),

      saveCategory: (id, category) =>
        attempt("No se pudo guardar la categoría.", async () => {
          const properties = await pageRepo.savePageCategory(id, category);
          patch(id, { properties, updatedAt: new Date().toISOString() });
        }),

      setPinned: (id, pinned) =>
        attempt("No se pudo fijar la página.", async () => {
          await pageRepo.setPagePinned(id, pinned);
          patch(id, { pinned });
        }),

      movePage: (id, parentId) =>
        attempt("No se pudo mover la página.", async () => {
          await pageRepo.movePage(id, parentId);
          await reload();
        }),

      trashPage: (id) =>
        attempt("No se pudo enviar la página a la papelera.", async () => {
          await pageRepo.trashPage(id);
          await reload();
        }),

      restorePage: (id) =>
        attempt("No se pudo restaurar la página.", async () => {
          await pageRepo.restorePage(id);
          await reload();
        }),

      deletePermanently: (id) =>
        attempt("No se pudo eliminar la página.", async () => {
          await pageRepo.deletePagePermanently(id);
          forgetDraft(id);
          await reload();
        }),
    };
  }, [reload, patch, attempt]);

  const store = useMemo<PagesStore>(
    () => ({
      ...actions,
      status,
      pages,
      tree: buildTree(pages),
      trash: getTrashRoots(pages),
      getPage: (id) => pages.find((page) => page.id === id),
    }),
    [actions, status, pages],
  );

  const movingPage = moving === null ? undefined : store.getPage(moving);

  return (
    <PagesContext.Provider value={store}>
      {children}
      {newCollection && (
        <NewCollectionDialog
          onCancel={() => setNewCollection(null)}
          onCreate={async (template) => {
            const { parentId, onCreated } = newCollection;
            setNewCollection(null);
            const id = await store.createCollection(parentId, template);
            if (id !== null) onCreated?.(id);
          }}
        />
      )}
      {movingPage && (
        <MovePageDialog
          page={movingPage}
          pages={store.pages}
          tree={store.tree}
          onCancel={() => setMoving(null)}
          onSelect={async (parentId) => {
            setMoving(null);
            // Sacar una fila de su colección (o pasarla a otra) deja sus valores sin columna: se avisa.
            const from = getCollectionOf(store.pages, movingPage);
            if (from && parentId !== from.id) {
              const target = parentId === null ? undefined : store.getPage(parentId);
              const intoOther = target?.kind === "collection";
              const accepted = await confirm({
                title: "Mover fuera de la colección",
                message:
                  `«${pageTitle(movingPage)}» dejará de ser un elemento de «${pageTitle(from)}»` +
                  (intoOther
                    ? ` y pasará a la colección «${pageTitle(target)}», cuyas columnas son otras.`
                    : " y pasará a ser una página normal.") +
                  " Sus valores no se borran, pero dejarán de verse como propiedades; vuelven a verse si regresa a su colección.",
                confirmLabel: "Mover",
              });
              if (!accepted) return;
            }
            void store.movePage(movingPage.id, parentId);
          }}
        />
      )}
    </PagesContext.Provider>
  );
}
