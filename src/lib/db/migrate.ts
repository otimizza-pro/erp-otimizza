import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getMigrationDbPool } from "./pool";

interface MigrationRecord {
  id: string;
  name: string;
  checksum: string;
  applied_at: Date;
}

export async function runMigrations(): Promise<void> {
  const migrationsDir = path.resolve(process.cwd(), "database/migrations");
  console.log(`🔍 Buscando migrações em: ${migrationsDir}`);

  try {
    await fs.access(migrationsDir);
  } catch {
    console.log("ℹ️ Diretório de migrações não encontrado. Criando diretório...");
    await fs.mkdir(migrationsDir, { recursive: true });
    return;
  }

  const pool = getMigrationDbPool();

  try {
    // 1. Garantir existência da tabela de controle de migrações
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Obter migrações já aplicadas
    const { rows: applied } = await pool.query<MigrationRecord>(
      "SELECT id, name, checksum, applied_at FROM _migrations ORDER BY id ASC;"
    );
    const appliedMap = new Map(applied.map((m) => [m.id, m]));

    // 3. Listar arquivos .sql
    const files = (await fs.readdir(migrationsDir))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("ℹ️ Nenhum arquivo de migração .sql encontrado.");
      return;
    }

    let appliedCount = 0;

    for (const file of files) {
      const migrationId = path.parse(file).name;
      const filePath = path.join(migrationsDir, file);
      const content = await fs.readFile(filePath, "utf-8");
      const checksum = crypto.createHash("sha256").update(content, "utf8").digest("hex");

      if (appliedMap.has(migrationId)) {
        const existing = appliedMap.get(migrationId)!;
        if (existing.checksum !== checksum) {
          console.warn(
            `⚠️ ALERTA: O arquivo de migração "${file}" foi alterado após ter sido aplicado!`
          );
        }
        continue;
      }

      console.log(`⚙️ Aplicando migração: ${file}...`);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(content);
        await client.query(
          "INSERT INTO _migrations (id, name, checksum) VALUES ($1, $2, $3);",
          [migrationId, file, checksum]
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`❌ Erro ao aplicar migração ${file}:`, err);
        throw err;
      } finally {
        client.release();
      }

      console.log(`✅ Migração ${file} aplicada com sucesso.`);
      appliedCount++;
    }

    if (appliedCount === 0) {
      console.log("✨ Todas as migrações já estão atualizadas.");
    } else {
      console.log(`🎉 Total de ${appliedCount} migração(ões) aplicada(s) com sucesso.`);
    }
  } finally {
    await pool.end();
  }
}

// Execução direta via CLI (npm run db:migrate)
if (process.argv[1] && process.argv[1].includes("migrate.ts")) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(`::error::Falha crítica ao executar migrações: ${err instanceof Error ? err.stack || err.message : String(err)}`);
      console.error("❌ Falha crítica ao executar migrações:", err);
      process.exit(1);
    });
}
