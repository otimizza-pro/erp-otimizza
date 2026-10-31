import { describe, it, expect } from "vitest";
import {
  extractProjectRef,
  assertSafeTestDatabase,
  assertSafeEnvironmentDatabase,
  KNOWN_PRODUCTION_PROJECT_REF,
} from "@/lib/db/pool";

describe("Segurança & Isolamento: Verificação Fail-Closed do Banco de Testes", () => {
  it("extrai corretamente o project ref a partir do hostname direto db.[REF].supabase.co", () => {
    const conn = "postgresql://postgres:pass@db.ffbdrcfokhoyouiiajzq.supabase.co:5432/postgres";
    expect(extractProjectRef(conn)).toBe("ffbdrcfokhoyouiiajzq");
  });

  it("extrai corretamente o project ref a partir do username do pooler postgres.[REF]", () => {
    const conn = "postgresql://postgres.ffbdrcfokhoyouiiajzq:pass@aws-1-us-west-2.pooler.supabase.com:6543/postgres";
    expect(extractProjectRef(conn)).toBe("ffbdrcfokhoyouiiajzq");
  });

  it("retorna null para conexões locais ou PostgreSQL tradicional", () => {
    const local = "postgresql://postgres:postgres@localhost:5432/sistema_erp_test";
    expect(extractProjectRef(local)).toBeNull();
  });

  it("BLOQUEIA (Fail-Closed) quando o banco de teste aponta para o mesmo project ref de produção", () => {
    const prodPooler = "postgresql://postgres.ffbdrcfokhoyouiiajzq:secret@aws-1-us-west-2.pooler.supabase.com:6543/postgres";
    const testDirect = "postgresql://postgres:secret@db.ffbdrcfokhoyouiiajzq.supabase.co:5432/postgres";

    expect(() => {
      assertSafeTestDatabase(testDirect, prodPooler, "ffbdrcfokhoyouiiajzq");
    }).toThrow(/FAIL-CLOSED BLOQUEIO DE SEGURANÇA/);
  });

  it("BLOQUEIA (Fail-Closed) quando a URL de teste é idêntica à URL de produção", () => {
    const local = "postgresql://postgres:postgres@localhost:5432/sistema_erp_prod";
    expect(() => {
      assertSafeTestDatabase(local, local);
    }).toThrow(/FAIL-CLOSED BLOQUEIO DE SEGURANÇA/);
  });

  it("PERMITE execução quando o banco de testes é um banco local isolado", () => {
    const prodPooler = "postgresql://postgres.ffbdrcfokhoyouiiajzq:secret@aws-1-us-west-2.pooler.supabase.com:6543/postgres";
    const localTest = "postgresql://postgres:postgres@localhost:5432/sistema_erp_test";

    expect(() => {
      assertSafeTestDatabase(localTest, prodPooler, "ffbdrcfokhoyouiiajzq");
    }).not.toThrow();
  });

  it("PERMITE execução quando o banco de testes é um projeto Supabase separado (staging ref diferente)", () => {
    const prodPooler = "postgresql://postgres.ffbdrcfokhoyouiiajzq:secret@aws-1-us-west-2.pooler.supabase.com:6543/postgres";
    const stagingPooler = "postgresql://postgres.stagingref12345678:secret@aws-1-us-west-2.pooler.supabase.com:6543/postgres";

    expect(() => {
      assertSafeTestDatabase(stagingPooler, prodPooler, "ffbdrcfokhoyouiiajzq");
    }).not.toThrow();
  });
});

describe("Segurança & Isolamento: Proteção Geral Backend contra Conexão de Preview/CI à Produção", () => {
  const prodConn = `postgresql://postgres.${KNOWN_PRODUCTION_PROJECT_REF}:secret@aws-1-us-west-2.pooler.supabase.com:6543/postgres`;
  const stagingConn = "postgresql://postgres.erpstaging99999999:secret@aws-1-us-west-2.pooler.supabase.com:6543/postgres";
  const localConn = "postgresql://postgres:postgres@localhost:5432/sistema_erp_dev";

  it("CASO NEGATIVO: Bloqueia Vercel Preview se tentar conectar ao banco de produção", () => {
    expect(() => {
      assertSafeEnvironmentDatabase(prodConn, { vercelEnv: "preview", isCi: false });
    }).toThrow(/FAIL-CLOSED BLOQUEIO DE SEGURANÇA.*PREVIEW \(Vercel\)/);
  });

  it("CASO NEGATIVO: Bloqueia CI (GitHub Actions) se tentar conectar ao banco de produção", () => {
    expect(() => {
      assertSafeEnvironmentDatabase(prodConn, { vercelEnv: "production", isCi: true });
    }).toThrow(/FAIL-CLOSED BLOQUEIO DE SEGURANÇA.*CI \(GitHub Actions\)/);
  });

  it("CASO POSITIVO: Permite Vercel Preview quando conectado ao banco de staging isolado", () => {
    expect(() => {
      assertSafeEnvironmentDatabase(stagingConn, { vercelEnv: "preview", isCi: false });
    }).not.toThrow();
  });

  it("CASO POSITIVO: Permite CI conectado a banco temporário ou staging", () => {
    expect(() => {
      assertSafeEnvironmentDatabase(localConn, { vercelEnv: "preview", isCi: true });
    }).not.toThrow();
  });

  it("CASO POSITIVO: Permite ambiente de Produção oficial conectar ao projeto de produção", () => {
    expect(() => {
      assertSafeEnvironmentDatabase(prodConn, { vercelEnv: "production", isCi: false });
    }).not.toThrow();
  });

  it("CASO POSITIVO: Permite ambiente de Desenvolvimento local conectar ao banco local", () => {
    expect(() => {
      assertSafeEnvironmentDatabase(localConn, { vercelEnv: "development", isCi: false });
    }).not.toThrow();
  });
});

