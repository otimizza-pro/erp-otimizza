import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getMigrationDbPool } from "./pool";

interface AppliedMigrationRow {
  id: string;
  name: string;
  checksum: string;
  applied_at: string;
}

export async function checkMigrationStatus(): Promise<void> {
  const migrationsDir = path.resolve(process.cwd(), "database/migrations");
  const pool = getMigrationDbPool();

  try {
    const { rows: applied } = await pool.query<AppliedMigrationRow>(
      "SELECT id, name, checksum, applied_at FROM _migrations ORDER BY id ASC;"
    );
    const appliedMap = new Map(applied.map((m) => [m.id, m]));

    const files = (await fs.readdir(migrationsDir))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    console.log("\n📋 Status das Migrações:");
    console.log("--------------------------------------------------------------------------------");
    console.log(
      `${"ID / Arquivo".padEnd(35)} | ${"Status".padEnd(12)} | ${"Aplicado em"}`
    );
    console.log("--------------------------------------------------------------------------------");

    for (const file of files) {
      const id = path.parse(file).name;
      const content = await fs.readFile(path.join(migrationsDir, file), "utf-8");
      const currentChecksum = crypto.createHash("sha256").update(content, "utf8").digest("hex");

      if (appliedMap.has(id)) {
        const record = appliedMap.get(id);
        const match = record && record.checksum === currentChecksum ? "OK" : "MODIFICADO";
        const dateStr = record ? new Date(record.applied_at).toLocaleString("pt-BR") : "-";
        console.log(
          `${file.padEnd(35)} | ${("APLICADO (" + match + ")").padEnd(12)} | ${dateStr}`
        );
      } else {
        console.log(`${file.padEnd(35)} | ${"PENDENTE".padEnd(12)} | -`);
      }
    }
    console.log("--------------------------------------------------------------------------------\n");
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    if (errorObj?.code === "42P01") {
      console.log("ℹ️ Tabela de migrações (_migrations) ainda não existe. Nenhuma migração foi aplicada.");
    } else {
      console.error("❌ Erro ao consultar status das migrações:", errorObj?.message ?? err);
      throw err;
    }
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].includes("status.ts")) {
  checkMigrationStatus()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Falha:", err);
      process.exit(1);
    });
}
