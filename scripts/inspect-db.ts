import { query, getDbPool, KNOWN_PRODUCTION_PROJECT_REF, extractProjectRef } from "../src/lib/db/pool";
import { getEnv } from "../src/lib/env";

async function main() {
  const env = getEnv();
  console.log("=== VERIFICAÇÃO DE AMBIENTE ===");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  const activeConn = process.env.NODE_ENV === "test" ? env.DATABASE_URL_TEST : env.DATABASE_URL;
  const projectRef = extractProjectRef(activeConn);
  console.log("Supabase Project Ref Conectado:", projectRef);
  console.log("Ref Produção Conhecida:", KNOWN_PRODUCTION_PROJECT_REF);

  if (projectRef === KNOWN_PRODUCTION_PROJECT_REF) {
    throw new Error("🚨 PERIGO: Conectado ao projeto de PRODUÇÃO! Abortando imediatamente!");
  }
  console.log("✅ AMBIENTE SEGURO: Não é a base de produção.");

  // Verificar tabelas existentes
  const { rows: tables } = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  console.log("\n=== TABELAS NO SCHEMA PUBLIC ===");
  for (const t of tables) {
    const { rows: countRes } = await query(`SELECT count(*) FROM "${t.table_name}"`);
    console.log(`- ${t.table_name}: ${countRes[0].count} registros`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Erro na inspeção:", err);
  process.exit(1);
});

