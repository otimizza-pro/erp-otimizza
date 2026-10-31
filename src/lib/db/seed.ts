import fs from "node:fs/promises";
import path from "node:path";
import { getMigrationDbPool } from "./pool";

export async function runSyntheticSeed(): Promise<void> {
  const seedFile = path.resolve(process.cwd(), "database/seeds/synthetic_staging_seed.sql");
  console.log(`🌱 Aplicando seed sintético de homologação: ${seedFile}`);

  try {
    await fs.access(seedFile);
  } catch {
    console.error(`❌ Arquivo de seed não encontrado: ${seedFile}`);
    process.exit(1);
  }

  const sql = await fs.readFile(seedFile, "utf-8");
  const pool = getMigrationDbPool();

  try {
    await pool.query(sql);
    console.log("✅ Seed sintético aplicado com sucesso!");
  } catch (err: unknown) {
    console.error("❌ Erro ao aplicar seed sintético:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Execução direta via CLI (ex: tsx src/lib/db/seed.ts)
if (process.argv[1]?.endsWith("seed.ts")) {
  runSyntheticSeed().catch((err) => {
    console.error("❌ Falha fatal ao executar seed:", err);
    process.exit(1);
  });
}
