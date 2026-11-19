import { beforeEach, describe, expect, it, vi } from "vitest";

const { sql } = vi.hoisted(() => ({ sql: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ getDbPool: () => ({ query: sql }), query: sql, withTransaction: vi.fn(), afterCommit: vi.fn() }));
import { CrmService } from "@/modules/crm/service";

beforeEach(() => {
  sql.mockReset();
  sql.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe("Visibilidade dos leads convertidos", () => {
  for (const status of [undefined, "ALL"] as const) {
    it(`exclui convertidos e arquivados do filtro padrão ${status}`, async () => {
      await CrmService.listLeads({ status });
      for (const [query] of sql.mock.calls) {
        expect(query).toContain("l.status NOT IN ('ARCHIVED', 'CONVERTED')");
        expect(query).toContain("l.converted_client_id IS NULL");
        expect(query).toContain("l.archived_at IS NULL");
      }
    });
  }
  it("encontra também vínculos legados com status desatualizado na visão de convertidos", async () => {
    await CrmService.listLeads({ status: "CONVERTED" });
    for (const [query] of sql.mock.calls) {
      expect(query).toContain("l.status = 'CONVERTED' OR l.converted_client_id IS NOT NULL");
    }
  });
  it("não deixa um convertido reaparecer pelo filtro de novos", async () => {
    await CrmService.listLeads({ status: "NEW" });
    for (const [query] of sql.mock.calls) expect(query).toContain("l.converted_client_id IS NULL");
  });
});
