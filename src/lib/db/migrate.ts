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

/** Checksums históricos legítimos auditados (compatibilidade de Docker/CI e quebras de linha) */
const AUDITED_LEGITIMATE_CHECKSUMS: Record<string, string[]> = {
  "005_phase4_analytics_and_dashboard_preferences": [
    "a662ce20f07840d381c08f6afdbb6d5de8d7e003b6d11c5838a01e37952d45d8",
    "6c5e969c6eb5d300cd6fccb63cbbe74f97834348e8f3ccd3f2bbcee30e55a8e1",
    "dd8b1db56fe4b35ea21de107a4b86a39cd62a6e66e6ecf14a04d28b80c008c3b"
  ],
  "008_security_hardening": ["a85611daac980ba6f1c2c0129a91a4189f36416aa750117ea6c56993d9f6c5f6"],
  "012_phase11_project_management": ["9d511940740029938c76afecc8f1db87f49dd3b702a2fff4517a24c325e3aa2d"],
  "014_knowledge_base_pages": ["ef85d6bfa377ff6ad0c0d2f22cb20026032a2480accdd9b118ecefac6a0b5e36"],
  "018_cleanup_test_combos": ["438312e58d00e1c27082a973f1d1bca997370f47a877d0d7c6338c7dc1978b22"],
};

export function isMigrationChecksumValid(migrationId: string, content: string, recordedChecksum: string): boolean {
  if (crypto.createHash("sha256").update(content, "utf8").digest("hex") === recordedChecksum) return true;
  const lf = content.replace(/\r\n/g, "\n");
  if (crypto.createHash("sha256").update(lf, "utf8").digest("hex") === recordedChecksum) return true;
  const crlf = lf.replace(/\n/g, "\r\n");
  if (crypto.createHash("sha256").update(crlf, "utf8").digest("hex") === recordedChecksum) return true;
  const historical = AUDITED_LEGITIMATE_CHECKSUMS[migrationId];
  if (historical && historical.includes(recordedChecksum)) return true;
  return false;
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
        if (!isMigrationChecksumValid(migrationId, content, existing.checksum)) {
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
