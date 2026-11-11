import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Toaster from "@/components/Toaster";
import ConfirmDialogHost from "@/components/ConfirmDialog";
import CommandPalette from "@/features/search/CommandPalette";
import { isPaletteOpen, togglePalette } from "@/lib/commandPalette";
import { hasOpenConfirm } from "@/lib/confirm";
import { confirmDiscardChanges } from "@/lib/unsavedChanges";
import { resolveShortcut, runPrimaryAction } from "@/lib/shortcuts";
import { NavigationContext } from "@/app/NavigationContext";
import {
  sameLocation,
  toLocation,
  type Location,
  type NavigateTarget,
} from "@/app/navigation";

/** Id del contenedor con scroll (lo usa `scrollMainToTop`). */
export const MAIN_ID = "main-content";

interface MainLayoutProps {
  location: Location;
  onNavigate: (location: Location) => void;
  children: ReactNode;
}

/**
 * Esqueleto de la app: barra lateral + contenido. Cada vista pinta su propia
 * cabecera (`PageHeader`). Aquí viven también los atajos globales.
 */
export default function MainLayout({
  location,
  onNavigate,
  children,
}: MainLayoutProps) {
  const { view, pageId } = location;
  const mainRef = useRef<HTMLElement>(null);
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;
  const locationRef = useRef(location);
  locationRef.current = location;

  /** Navega, pidiendo confirmación si hay un formulario con cambios sin guardar. */
  const requestNavigate = useCallback(async (target: NavigateTarget) => {
    const next = toLocation(target);
    if (sameLocation(next, locationRef.current)) return;
    if (!(await confirmDiscardChanges())) return;
    onNavigateRef.current(next);
  }, []);

  const navigation = useMemo(
    () => ({
      location,
      navigate: (target: NavigateTarget) => void requestNavigate(target),
    }),
    [location, requestNavigate],
  );

  // Al cambiar de vista o de página, el contenido vuelve arriba.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [view, pageId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      // Con un diálogo abierto, los atajos globales no actúan.
      if (hasOpenConfirm()) return;

      const action = resolveShortcut(event);
      if (action === null) return;

      // Con la paleta abierta solo Cmd/Ctrl+K (cerrarla) actúa; el resto es suyo.
      if (isPaletteOpen() && action.type !== "search") return;

      // Todos llevan Cmd/Ctrl, así que funcionan también al escribir en un campo.
      event.preventDefault();
      if (action.type === "navigate") void requestNavigate(action.view);
      else if (action.type === "search") togglePalette();
      else runPrimaryAction();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestNavigate]);

  return (
    <NavigationContext.Provider value={navigation}>
      <div className="flex h-screen w-screen overflow-hidden bg-bg text-text">
        <Sidebar />
        <main ref={mainRef} id={MAIN_ID} className="min-w-0 flex-1 overflow-y-auto">
          {children}
        </main>
        <Toaster />
        <CommandPalette />
        <ConfirmDialogHost />
      </div>
    </NavigationContext.Provider>
  );
}
