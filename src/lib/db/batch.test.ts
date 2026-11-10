import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase, type TestDatabase } from "@/test/testDatabase";
import { runBatch } from "./batch";
import { setDatabaseForTesting } from "./database";

async function names(test: TestDatabase): Promise<string[]> {
  const rows = await test.db.select<{ name: string }[]>(
    "SELECT name FROM t ORDER BY id",
  );
  return rows.map((row) => row.name);
}

describe("runBatch (conexión única)", () => {
  let test: TestDatabase;

  beforeEach(async () => {
    test = await createTestDatabase();
    await test.db.execute("CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT NOT NULL)");
    await test.db.execute("INSERT INTO t VALUES (1, 'a'), (2, 'b')");
    setDatabaseForTesting(test.db);
  });

  afterEach(() => setDatabaseForTesting(null));

  it("confirma todas las sentencias, con parámetros", async () => {
    await runBatch([
      { sql: "INSERT INTO t VALUES ($1, $2)", params: [3, "c"] },
      { sql: "DELETE FROM t WHERE id = $1", params: [1] },
      { sql: "UPDATE t SET name = 'B' WHERE id = 2" },
    ]);
    expect(await names(test)).toEqual(["B", "c"]);
  });

  it("revierte todo si falla una sentencia intermedia", async () => {
    await expect(
      runBatch([
        { sql: "DELETE FROM t" },
        { sql: "INSERT INTO t VALUES (9, 'x')" },
        { sql: "INSERT INTO tabla_inexistente VALUES (1)" },
        { sql: "INSERT INTO t VALUES (10, 'y')" },
      ]),
    ).rejects.toThrow();
    expect(await names(test)).toEqual(["a", "b"]);
  });

  it("tras un fallo se puede volver a usar (no queda transacción abierta)", async () => {
    await expect(
      runBatch([{ sql: "INSERT INTO t VALUES (1, 'duplicado')" }]),
    ).rejects.toThrow();
    await runBatch([{ sql: "INSERT INTO t VALUES (3, 'c')" }]);
    expect(await names(test)).toEqual(["a", "b", "c"]);
  });

  it("una lista vacía no hace nada", async () => {
    await runBatch([]);
    expect(await names(test)).toEqual(["a", "b"]);
  });
});
