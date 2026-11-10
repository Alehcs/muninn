import { createContext, useContext } from "react";
import type { Location, NavigateTarget } from "./navigation";

export interface NavigationApi {
  location: Location;
  /**
   * Navega a una vista o a una ubicación (p. ej. `{ view: "pages", pageId }`).
   * Pide confirmación si hay un formulario con cambios sin guardar.
   */
  navigate: (target: NavigateTarget) => void;
}

export const NavigationContext = createContext<NavigationApi>({
  location: { view: "today" },
  navigate: () => undefined,
});

export function useNavigation(): NavigationApi {
  return useContext(NavigationContext);
}
