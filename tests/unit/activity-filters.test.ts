import { beforeEach, describe, expect, it, vi } from "vitest";
const { sql } = vi.hoisted(() => ({ sql: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ getDbPool: () => ({ query: sql }), query: sql, withTransaction: vi.fn(), afterCommit: vi.fn() }));
import { CreateActivitySchema } from "@/modules/crm/schemas";
import { activityFiltersSchema, buildActivityWhere } from "@/modules/crm/activity-filters";
import { CrmService } from "@/modules/crm/service";

beforeEach(() => { sql.mockReset(); sql.mockResolvedValue({ rows: [] }); });

describe("Tarefas avulsas e filtros da agenda", () => {
  it("permite tarefa sem vínculo e mantém vínculo obrigatório na agenda comercial", () => {
    expect(CreateActivitySchema.parse({ recordKind: "TASK", activityType: "OTHER", title: "Organizar arquivos" }).recordKind).toBe("TASK");
    expect(() => CreateActivitySchema.parse({ activityType: "CALL", title: "Telefonar" })).toThrow();
    expect(() => CreateActivitySchema.parse({ recordKind: "TASK", activityType: "OTHER", title: "Organizar", leadId: "11111111-1111-4111-8111-111111111111" })).toThrow();
  });
  it.each(["LEAD", "CLIENT", "OPPORTUNITY"] as const)("filtra vínculo %s sem esconder outros vínculos do mesmo registro", targetType => {
    const { where } = buildActivityWhere({ targetType });
    expect(where).toContain(`a.${targetType === "OPPORTUNITY" ? "opportunity" : targetType.toLowerCase()}_id IS NOT NULL`);
    expect(where).not.toContain("_id IS NULL");
  });
  it("combina categoria, tipo, busca, prazo e status com parâmetros", () => {
    const search = "x' OR true --";
    const { where, values } = buildActivityWhere({ recordKind: "COMMERCIAL", activityType: "CALL", search, dueFrom: "2026-11-01", dueTo: "2026-11-30", status: "PENDING" });
    expect(where).toContain("a.record_kind = $1");
    expect(where).toContain("a.activity_type = $2");
    expect(where).not.toContain(search);
    expect(where).toContain("o.title ILIKE $3");
    expect(where).toContain("America/Sao_Paulo");
    expect(values).toEqual(["COMMERCIAL", "CALL", `%${search}%`, "2026-11-01", "2026-11-30", "PENDING"]);
  });
  it("considera pendências reagendadas no filtro de atrasadas", () => {
    expect(buildActivityWhere({ overdueOnly: true }).where).toContain("a.status IN ('PENDING', 'RESCHEDULED')");
  });
  it("rejeita intervalos invertidos e tipos desconhecidos", () => {
    expect(() => activityFiltersSchema.parse({ dueFrom: "2026-11-30", dueTo: "2026-11-01" })).toThrow();
    expect(() => activityFiltersSchema.parse({ recordKind: "INVALID" })).toThrow();
  });
  it("lista e indicadores usam os mesmos filtros e a paginação é parametrizada", async () => {
    const filters = { recordKind: "TASK" as const, search: "arquivos", archived: true, limit: 100, offset: 100 };
    await CrmService.listActivities(filters);
    await CrmService.getActivityMetrics({ ...filters, status: "COMPLETED" });
    const [[list, listValues], [metrics, metricsValues]] = sql.mock.calls;
    expect(list).toContain("LIMIT $3 OFFSET $4");
    expect(listValues).toEqual(["TASK", "%arquivos%", 100, 100]);
    expect(metricsValues).toEqual(["TASK", "%arquivos%"]);
    for (const query of [list, metrics]) {
      expect(query).toContain("a.archived_at IS NOT NULL");
      expect(query).toContain("a.record_kind = $1");
      expect(query).toContain("a.title ILIKE $2");
    }
    expect(metrics).not.toContain("AND a.status =");
  });
});
