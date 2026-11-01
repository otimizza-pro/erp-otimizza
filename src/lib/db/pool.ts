import pg from "pg";
import { getEnv } from "@/lib/env";

const { Pool } = pg;

declare global {
  var __dbPool: pg.Pool | undefined;
}

function shouldEnableSsl(connectionString: string): boolean {
  if (connectionString.includes("sslmode=require") || connectionString.includes("sslmode=no-verify")) {
    return true;
  }
  if (connectionString.includes(".supabase.co") || connectionString.includes(".pooler.supabase.com")) {
    return true;
  }
  return process.env.NODE_ENV === "production";
}

export function createPoolConfig(connectionString: string) {
  const isServerless = process.env.VERCEL === "1";
  const useSsl = shouldEnableSsl(connectionString);

  // Limpar parâmetros sslmode da query string para que o pg não force verify-full
  // garantindo compatibilidade com certificados auto-assinados de proxies intermediários
  let cleanedConnectionString = connectionString;
  if (useSsl) {
    cleanedConnectionString = connectionString
      .replace(/[?&]sslmode=[^&]+/g, "")
      .replace(/\?$/, "");
  }

  return {
    connectionString: cleanedConnectionString,
    // Em ambientes serverless (Vercel) conectados ao Supavisor/Pooler, cada lambda só precisa de 1 a 2 conexões
    max: isServerless ? 2 : (process.env.NODE_ENV === "production" ? 10 : 5),
    idleTimeoutMillis: isServerless ? 10000 : 30000,
    connectionTimeoutMillis: 5000,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

export function extractProjectRef(connStr: string): string | null {
  try {
    const url = new URL(connStr);
    const hostMatch = url.hostname.match(/db\.([a-z0-9]+)\.supabase\.co/i);
    if (hostMatch) return hostMatch[1].toLowerCase();

    const userMatch = decodeURIComponent(url.username).match(/(?:postgres|service_role)\.([a-z0-9]+)/i);
    if (userMatch) return userMatch[1].toLowerCase();

    return null;
  } catch {
    return null;
  }
}

export const KNOWN_PRODUCTION_PROJECT_REF = "ffbdrcfokhoyouiiajzq";

export function assertSafeEnvironmentDatabase(
  connUrl: string,
  options?: {
    vercelEnv?: string;
    isCi?: boolean;
    knownProdRef?: string;
  }
): void {
  const isPreview =
    options?.vercelEnv !== undefined
      ? options.vercelEnv === "preview"
      : process.env.VERCEL_ENV === "preview";
  const isCi =
    options?.isCi !== undefined
      ? options.isCi
      : process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";

  if (!isPreview && !isCi) {
    return;
  }

  const targetRef = extractProjectRef(connUrl);
  const prodRef = (
    options?.knownProdRef ||
    process.env.PRODUCTION_SUPABASE_PROJECT_REF ||
    KNOWN_PRODUCTION_PROJECT_REF
  ).toLowerCase();

  if (targetRef && prodRef && targetRef === prodRef) {
    const envName = isPreview ? "PREVIEW (Vercel)" : "CI (GitHub Actions)";
    throw new Error(
      `[FAIL-CLOSED BLOQUEIO DE SEGURANÇA] O ambiente ${envName} tentou conectar ao projeto Supabase de PRODUÇÃO (Ref: ${prodRef})! Execução bloqueada preventivamente para garantir isolamento absoluto de dados operacionais.`
    );
  }
}

export function assertSafeTestDatabase(
  testUrl: string,
  prodUrl: string,
  explicitProdRef?: string
): void {
  const prodRefFromUrl = extractProjectRef(prodUrl);
  const prodRef = (explicitProdRef || prodRefFromUrl || "").toLowerCase();
  const testRef = extractProjectRef(testUrl);

  if (prodRef && testRef && prodRef === testRef) {
    throw new Error(
      `[FAIL-CLOSED BLOQUEIO DE SEGURANÇA] O banco de testes (DATABASE_URL_TEST) aponta para o MESMO projeto Supabase de produção (Ref: ${prodRef}). Execução de testes cancelada para proteger dados operacionais!`
    );
  }

  try {
    const testParsed = new URL(testUrl);
    const prodParsed = new URL(prodUrl);

    const isPooler = testParsed.hostname.includes("pooler.supabase.com");
    if (isPooler) {
      if (testParsed.username && prodParsed.username && testParsed.username === prodParsed.username) {
        throw new Error(
          `[FAIL-CLOSED BLOQUEIO DE SEGURANÇA] DATABASE_URL_TEST aponta para o mesmo tenant do Pooler Supabase de produção (${testParsed.username}). Execução cancelada!`
        );
      }
    } else {
      const isLocalhost =
        testParsed.hostname === "localhost" ||
        testParsed.hostname === "127.0.0.1";

      if (
        !isLocalhost &&
        testParsed.hostname === prodParsed.hostname &&
        testParsed.port === prodParsed.port &&
        testParsed.pathname === prodParsed.pathname
      ) {
        throw new Error(
          `[FAIL-CLOSED BLOQUEIO DE SEGURANÇA] DATABASE_URL_TEST aponta exatamente para a mesma instância e banco de dados de produção (${testParsed.host}${testParsed.pathname}). Execução cancelada!`
        );
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("FAIL-CLOSED")) {
      throw err;
    }
  }
}

export function getDbPool(): pg.Pool {
  const env = getEnv();

  // Proteção fail-closed global: impede que Preview ou CI conectem à base de produção
  assertSafeEnvironmentDatabase(env.DATABASE_URL);
  if (env.DIRECT_URL) {
    assertSafeEnvironmentDatabase(env.DIRECT_URL);
  }

  // Em ambiente de teste: forçar DATABASE_URL_TEST e validação estrita fail-closed
  if (process.env.NODE_ENV === "test") {
    assertSafeTestDatabase(env.DATABASE_URL_TEST, env.DATABASE_URL, env.SUPABASE_PROJECT_REF);
    if (!global.__dbPool) {
      global.__dbPool = new Pool(createPoolConfig(env.DATABASE_URL_TEST));
    }
    return global.__dbPool;
  }

  // Em ambientes serverless na Vercel, reusar a instância na memória da lambda ativa
  if (process.env.VERCEL === "1") {
    if (!global.__dbPool) {
      global.__dbPool = new Pool(createPoolConfig(env.DATABASE_URL));
    }
    return global.__dbPool;
  }

  // Em produção tradicional
  if (process.env.NODE_ENV === "production") {
    return new Pool(createPoolConfig(env.DATABASE_URL));
  }

  // Em desenvolvimento local, reutilizar pool global para evitar vazamento no Hot Reload
  if (!global.__dbPool) {
    global.__dbPool = new Pool(createPoolConfig(env.DATABASE_URL));
  }

  return global.__dbPool;
}

export function getMigrationDbPool(): pg.Pool {
  const env = getEnv();
  // Em ambiente de teste, aplicar migrations estritamente no banco de teste isolado
  const connString =
    process.env.NODE_ENV === "test"
      ? env.DATABASE_URL_TEST
      : env.DIRECT_URL || env.DATABASE_URL;

  assertSafeEnvironmentDatabase(connString);
  return new Pool({
    ...createPoolConfig(connString),
    max: 1, // Migrations são executadas estritamente de forma serial
  });
}

export async function query<R extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<R>> {
  const pool = getDbPool();
  const start = Date.now();
  const res = await pool.query<R>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === "development" && duration > 100) {
    console.warn(`[SLOW QUERY] ${duration}ms: ${text.slice(0, 80)}...`);
  }
  return res;
}

export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDatabaseConnection(): Promise<{
  ok: boolean;
  latencyMs?: number;
  error?: string;
  provider?: string;
}> {
  const start = Date.now();
  const env = getEnv();
  const isSupabase = env.DATABASE_URL.includes("supabase.co") || env.DATABASE_URL.includes("supabase.com");

  try {
    const pool = getDbPool();
    await pool.query("SELECT 1 AS healthcheck");
    return {
      ok: true,
      latencyMs: Date.now() - start,
      provider: isSupabase ? "Supabase PostgreSQL" : "Local/Dedicated PostgreSQL",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Falha ao conectar no PostgreSQL";
    return {
      ok: false,
      error: message,
      provider: isSupabase ? "Supabase PostgreSQL" : "Local/Dedicated PostgreSQL",
    };
  }
}
