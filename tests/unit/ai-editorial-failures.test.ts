import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const { query, transaction, auth } = vi.hoisted(() => ({ query: vi.fn(), transaction: vi.fn(), auth: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ query, withTransaction: transaction }));
vi.mock("@/lib/auth/require-auth", () => ({ requireAdminUser: auth }));
import { POST } from "@/app/api/content-studio/editorial-lines/generate/route";

describe("Geração editorial não persiste substitutos em caso de falha", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("OPENROUTER_API_KEY", "unit-test-key");
    vi.stubGlobal("fetch", vi.fn());
    auth.mockResolvedValue({ id: "admin" });
    query.mockImplementation((sql: string) => Promise.resolve({rows: sql.includes("FROM client_identities") ? [{brand_context:"Empresa teste",target_audiences:["Consumidores"]}] : sql.includes("FROM client_audiences") ? [{name:"Consumidores"}] : sql.includes("FROM clients ") ? [{name:"Cliente"}] : []}));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  const request = () => new NextRequest("http://localhost/api/content-studio/editorial-lines/generate", { method: "POST", body: JSON.stringify({ clientId: "11111111-1111-4111-8111-111111111111" }) });
  it("não salva pilares quando falta crédito", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("saldo insuficiente", { status: 402 }));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect((await response.json()).success).toBe(false);
    expect(transaction).not.toHaveBeenCalled();
  });
  it("não salva resposta estruturada incompleta", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ choices: [{ message: { content: '[{"pillar_name":"Pilar"}]' }, finish_reason: "stop" }] }));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(transaction).not.toHaveBeenCalled();
  });
  it("não anuncia sucesso se a transação falha", async () => {
    const pillar = { pillar_name: "Nome", theme: "Tema", objective: "Objetivo", preferred_formats: ["REELS"], frequency_per_month: 4, notes: "" };
    vi.mocked(fetch).mockResolvedValue(Response.json({ choices: [{ message: { content: JSON.stringify([pillar, pillar, pillar, pillar]) }, finish_reason: "stop" }] }));
    transaction.mockRejectedValue(new Error("database unavailable"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect((await response.json()).success).toBe(false);
  });
});
