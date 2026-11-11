import { beforeEach, describe, expect, it } from "vitest";
import {
  claimPage,
  clearDraftsForTesting,
  forgetDraft,
  getDraft,
  isCurrentOwner,
  rememberDraft,
} from "./pageDrafts";

beforeEach(clearDraftsForTesting);

describe("pageDrafts", () => {
  it("guarda y devuelve el borrador por página", () => {
    rememberDraft("a", "uno");
    rememberDraft("b", "dos");
    expect(getDraft("a")).toBe("uno");
    expect(getDraft("b")).toBe("dos");
    expect(getDraft("c")).toBeUndefined();
  });

  it("un guardado tardío no borra un borrador más nuevo", () => {
    rememberDraft("a", "v1");
    rememberDraft("a", "v2");
    forgetDraft("a", "v1");
    expect(getDraft("a")).toBe("v2");
    forgetDraft("a", "v2");
    expect(getDraft("a")).toBeUndefined();
  });

  it("forgetDraft sin condición lo descarta", () => {
    rememberDraft("a", "v1");
    forgetDraft("a");
    expect(getDraft("a")).toBeUndefined();
  });

  it("solo la última instancia que reclama la página es la responsable", () => {
    const old = claimPage("a");
    expect(isCurrentOwner("a", old)).toBe(true);
    const fresh = claimPage("a");
    expect(isCurrentOwner("a", old)).toBe(false);
    expect(isCurrentOwner("a", fresh)).toBe(true);
    expect(isCurrentOwner("b", fresh)).toBe(false);
  });
});
