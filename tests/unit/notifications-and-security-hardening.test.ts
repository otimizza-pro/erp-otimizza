import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { sql, auth, getContract } = vi.hoisted(() => ({
  sql: vi.fn(),
  auth: vi.fn(),
  getContract: vi.fn(),
}));

vi.mock("@/lib/db/pool", () => ({
  query: sql,
  withTransaction: async (fn: (c: { query: typeof sql }) => unknown) => fn({ query: sql }),
  getDbPool: () => ({ query: sql, connect: vi.fn() }),
}));

vi.mock("@/lib/auth/require-auth", () => ({
  requireAdminUser: auth,
}));

vi.mock("@/modules/contracts/service", () => ({
  getContractById: getContract,
  createContractVersion: vi.fn(),
  cancelContract: vi.fn(),
  updateContract: vi.fn(),
  archiveContract: vi.fn(),
  reactivateContract: vi.fn(),
}));

vi.mock("@/modules/passwords/crypto", () => ({
  encryptPassword: (v: string) => `enc:${v}`,
  decryptPassword: (v: string) => v.replace(/^enc:/, ""),
}));

import { NotificationService } from "@/modules/notifications/service";
import { syncOperationalAlerts } from "@/modules/notifications/alerts-sync";
import { GET as getContractRoute, POST as postContractRoute } from "@/app/api/contracts/[id]/route";
import { PUT as updatePasswordRoute } from "@/app/api/passwords/route";
import { CrmService } from "@/modules/crm/service";

describe("Notifications engine and security hardening", () => {
  beforeEach(() => {
    sql.mockReset();
    auth.mockReset();
    getContract.mockReset();
    auth.mockResolvedValue({ id: "admin" });
  });

  it("blocks unauthenticated access to contracts/[id] GET and POST", async () => {
    auth.mockRejectedValueOnce(new Error("unauthorized"));
    const getRes = await getContractRoute(new Request("http://localhost/api/contracts/1"), {
      params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
    });
    expect(getRes.status).toBe(401);
    expect(getContract).not.toHaveBeenCalled();

    auth.mockRejectedValueOnce(new Error("unauthorized"));
    const postRes = await postContractRoute(
      new Request("http://localhost/api/contracts/1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) }
    );
    expect(postRes.status).toBe(401);
  });

  it("upserts notifications with dedup_key and exposes createSafeNotification without throwing", async () => {
    const fakeRow = {
      id: "notif-1",
      title: "Cobrança vencida",
      message: "REC-01 venceu",
      type: "ALERT",
      category: "FINANCIAL",
      severity: "critical",
      dedup_key: "alert:rec:1:2026-11-25",
      entity_type: "receivable",
      entity_id: "11111111-1111-4111-8111-111111111111",
      link_url: "/financial/receivables/1",
      read: false,
      metadata: {},
      resolved_at: null,
      created_at: new Date("2026-11-25T10:00:00Z"),
    };
    sql.mockResolvedValueOnce({ rows: [fakeRow] });

    const created = await NotificationService.createNotification({
      title: "Cobrança vencida",
      message: "REC-01 venceu",
      type: "ALERT",
      category: "FINANCIAL",
      severity: "critical",
      dedupKey: "alert:rec:1:2026-11-25",
      entityType: "receivable",
      entityId: "11111111-1111-4111-8111-111111111111",
      linkUrl: "/financial/receivables/1",
    });

    expect(created.dedupKey).toBe("alert:rec:1:2026-11-25");
    expect(sql.mock.calls[0][0]).toContain("ON CONFLICT (dedup_key)");

    sql.mockRejectedValueOnce(new Error("db down"));
    await expect(
      NotificationService.createSafeNotification({
        title: "Falha tolerada",
        message: "Não deve interromper fluxo",
        type: "INFO",
        linkUrl: "/",
      })
    ).resolves.toBeUndefined();
  });

  it("sweeps overdue items and skips empty results without errors", async () => {
    sql.mockResolvedValue({ rows: [] });
    const summary = await syncOperationalAlerts(true);
    expect(summary).toEqual({ synced: true, generatedCount: 0 });
    expect(sql.mock.calls.length).toBeGreaterThanOrEqual(8);
  });

  it("preserves existing encrypted_password when PUT /api/passwords omits password", async () => {
    const id = "22222222-2222-4222-8222-222222222222";
    sql.mockResolvedValueOnce({
      rows: [{ id, title: "Meta Ads", username: "admin@otimizza.com", website: "https://business.facebook.com" }],
    });

    const req = new NextRequest("http://localhost/api/passwords", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify({
        id,
        title: "Meta Ads",
        username: "admin@otimizza.com",
        website: "https://business.facebook.com",
        password: "",
      }),
    });
    const res = await updatePasswordRoute(req);
    expect(res.status).toBe(200);
    const [stmt, params] = sql.mock.calls[0];
    expect(stmt).not.toContain("encrypted_password");
    expect(params).toHaveLength(5);
  });

  it("rejects non-UUID pipelineId safely in getCrmKpis using parameterized SQL", async () => {
    await expect(CrmService.getCrmKpis("invalid-uuid'; DROP TABLE crm_leads;--")).rejects.toThrow(/Invalid UUID/i);
    expect(sql).not.toHaveBeenCalled();

    const pipelineId = "33333333-3333-4333-8333-333333333333";
    sql.mockResolvedValue({ rows: [{ count: 0, total: 0, total_open: 0, weighted_open: 0, won_mrr: 0 }] });
    await CrmService.getCrmKpis(pipelineId);
    expect(sql.mock.calls.some(([q, p]) => String(q).includes("pipeline_id = $1") && Array.isArray(p) && p[0] === pipelineId)).toBe(true);
  });
});
