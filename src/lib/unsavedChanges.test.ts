import { afterEach, describe, expect, it } from "vitest";
import { clearConfirmsForTesting, getActiveConfirm, settleConfirm } from "./confirm";
import {
  clearDirtyFormsForTesting,
  confirmDiscardChanges,
  hasUnsavedChanges,
  setFormDirty,
} from "./unsavedChanges";

afterEach(() => {
  clearDirtyFormsForTesting();
  clearConfirmsForTesting();
});

describe("unsavedChanges", () => {
  it("sin formularios sucios no pregunta", async () => {
    expect(hasUnsavedChanges()).toBe(false);
    expect(await confirmDiscardChanges()).toBe(true);
    expect(getActiveConfirm()).toBeNull();
  });

  it("registra y limpia formularios por identificador", () => {
    const a = Symbol("a");
    const b = Symbol("b");
    setFormDirty(a, true);
    setFormDirty(b, true);
    setFormDirty(a, false);
    expect(hasUnsavedChanges()).toBe(true);
    setFormDirty(b, false);
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("con cambios pide confirmación y respeta la respuesta", async () => {
    setFormDirty(Symbol("f"), true);

    const cancelled = confirmDiscardChanges();
    const request = getActiveConfirm();
    expect(request?.destructive).toBe(true);
    settleConfirm(request!.id, false);
    expect(await cancelled).toBe(false);

    const accepted = confirmDiscardChanges();
    settleConfirm(getActiveConfirm()!.id, true);
    expect(await accepted).toBe(true);
  });
});
