import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setDatabaseForTesting } from "@/lib/db/database";
import { runMigrations } from "@/lib/db/migrations";
import type { BackupFile } from "@/features/backup/backupTypes";
import { ALL_TABLES } from "@/features/backup/backupTypes";
import { createTestDatabase, type TestDatabase } from "@/test/testDatabase";
import { readBackupData, replaceBackupData } from "./backupRepository";

const T = "2026-01-01T00:00:00.000Z";

async function seed({ db }: TestDatabase) {
  await db.execute(
    `INSERT INTO habits VALUES ('h1','Leer','duration',30,'minutos','estudio',1,$1,$1),
                               ('h2','Agua','count',8,'veces',NULL,0,$1,$1)`,
    [T],
  );
  await db.execute(
    `INSERT INTO habit_logs VALUES ('l1','h1','2026-01-01',30,1,'nota',$1,$1),
                                   ('l2','h2','2026-01-02',3,0,NULL,$1,$1)`,
    [T],
  );
  await db.execute(`INSERT INTO roadmaps VALUES ('r1','Ruta','desc',$1,$1)`, [T]);
  await db.execute(`INSERT INTO roadmap_sections VALUES ('s1','r1','Sección',1,$1,$1)`, [T]);
  await db.execute(
    `INSERT INTO roadmap_items
       (id, roadmap_id, section_id, section, section_order, title, description, type,
        completed, order_index, notes, url, created_at, updated_at, completed_at)
     VALUES ('i1','r1','s1','Sección',1,'Item','d','t',1,1,'n','https://x.test',$1,$1,$1),
            ('i2',NULL,NULL,'Vieja',2,'Otro',NULL,NULL,0,2,NULL,NULL,$1,$1,NULL)`,
    [T],
  );
  await db.execute(
    `INSERT INTO todo_items VALUES ('t1','Tarea',NULL,0,1,$1,$1,NULL),
                                   ('t2','Hecha','n',1,2,$1,$1,$1)`,
    [T],
  );
  await db.execute(
    `INSERT INTO notes VALUES ('n1','Nota','contenido','cat',1,$1,$1),
                              ('n2','Otra','x',NULL,0,$1,$1)`,
    [T],
  );
  await db.execute(`INSERT INTO app_metadata VALUES ('clave','valor',$1)`, [T]);
}

/** replaceBackupData marca el roadmap como sembrado; se compara sin esa clave. */
function withoutSeedFlag<T extends { app_metadata: { key: string }[] }>(data: T): T {
  return {
    ...data,
    app_metadata: data.app_metadata.filter((row) => row.key !== "roadmap_seeded"),
  };
}

describe("backup: ida y vuelta", () => {
  let test: TestDatabase;

  beforeEach(async () => {
    test = await createTestDatabase();
    await runMigrations(test.db);
    setDatabaseForTesting(test.db);
  });

  afterEach(() => setDatabaseForTesting(null));

  it("leer, vaciar, restaurar y leer da lo mismo", async () => {
    await seed(test);
    const first = await readBackupData();
    expect(first.habits).toHaveLength(2);
    expect(first.roadmap_items).toHaveLength(2);

    for (const table of ALL_TABLES) {
      await test.db.execute(`DELETE FROM ${table}`);
    }
    expect((await readBackupData()).habits).toHaveLength(0);

    const backup: BackupFile = {
      metadata: { backupVersion: 2, exportedAt: T, app: "Aurhabits" },
      ...first,
    };
    await replaceBackupData(backup);

    const second = await readBackupData();
    expect(withoutSeedFlag(second)).toEqual(withoutSeedFlag(first));
    expect(second.app_metadata.some((row) => row.key === "roadmap_seeded")).toBe(true);
  });
});
