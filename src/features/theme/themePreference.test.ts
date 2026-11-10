import { describe, expect, it } from "vitest";
import {
  THEME_STORAGE_KEY,
  isThemePreference,
  readStoredPreference,
  writeStoredPreference,
  type PreferenceStorage,
} from "./themePreference";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  const storage: PreferenceStorage = {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
  return { storage, data };
}

const broken: PreferenceStorage = {
  getItem: () => {
    throw new Error("bloqueado");
  },
  setItem: () => {
    throw new Error("bloqueado");
  },
};

describe("themePreference", () => {
  it("usa auto si no hay nada guardado", () => {
    expect(readStoredPreference(memoryStorage().storage)).toBe("auto");
  });

  it("recupera lo guardado", () => {
    const { storage } = memoryStorage();
    expect(writeStoredPreference("night", storage)).toBe(true);
    expect(readStoredPreference(storage)).toBe("night");
  });

  it("ignora valores desconocidos", () => {
    const { storage } = memoryStorage({ [THEME_STORAGE_KEY]: "rosa" });
    expect(readStoredPreference(storage)).toBe("auto");
    expect(isThemePreference("morning")).toBe(true);
    expect(isThemePreference(3)).toBe(false);
  });

  it("no lanza si el almacenamiento falla o no existe", () => {
    expect(readStoredPreference(broken)).toBe("auto");
    expect(writeStoredPreference("night", broken)).toBe(false);
    expect(readStoredPreference(null)).toBe("auto");
    expect(writeStoredPreference("night", null)).toBe(false);
  });
});
