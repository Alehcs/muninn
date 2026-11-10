import { afterEach, describe, expect, it } from "vitest";
import {
  clearConfirmsForTesting,
  confirm,
  getActiveConfirm,
  hasOpenConfirm,
  settleConfirm,
} from "./confirm";

afterEach(() => clearConfirmsForTesting());

function settleActive(accepted: boolean): void {
  const active = getActiveConfirm();
  if (active === null) throw new Error("No hay diálogo abierto");
  settleConfirm(active.id, accepted);
}

describe("confirm", () => {
  it("resuelve true al aceptar y false al cancelar", async () => {
    const accepted = confirm({ title: "a", message: "b", destructive: true });
    expect(hasOpenConfirm()).toBe(true);
    expect(getActiveConfirm()?.destructive).toBe(true);
    settleActive(true);
    await expect(accepted).resolves.toBe(true);
    expect(hasOpenConfirm()).toBe(false);

    const cancelled = confirm({ title: "a", message: "b" });
    settleActive(false);
    await expect(cancelled).resolves.toBe(false);
  });

  it("muestra las peticiones una tras otra", async () => {
    const first = confirm({ title: "1", message: "x" });
    const second = confirm({ title: "2", message: "y" });
    expect(getActiveConfirm()?.title).toBe("1");
    settleActive(true);
    await expect(first).resolves.toBe(true);
    expect(getActiveConfirm()?.title).toBe("2");
    settleActive(false);
    await expect(second).resolves.toBe(false);
    expect(hasOpenConfirm()).toBe(false);
  });

  it("ignora resolver dos veces la misma petición", async () => {
    const pending = confirm({ title: "a", message: "b" });
    const id = getActiveConfirm()!.id;
    settleConfirm(id, true);
    settleConfirm(id, false);
    await expect(pending).resolves.toBe(true);
  });
});
