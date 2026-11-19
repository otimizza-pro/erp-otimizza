import { beforeEach, describe, expect, it, vi } from "vitest";
const { sql } = vi.hoisted(() => ({ sql: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ query: sql, withTransaction: (fn: (db: unknown) => unknown) => fn({ query: sql }) }));
import { getBrandPreset, saveBrandPreset } from "@/modules/clients/brand-preset";
const clientId = "22222222-2222-4222-8222-222222222222";
beforeEach(() => sql.mockReset());
describe("Identidade única nas configurações de conteúdo", () => {
 it("lê a descrição e o tom da identidade usada pelo DNA", async () => {
  sql.mockResolvedValue({ rows: [{ brand_context: "Marca atual",default_tones: ["Didático"] }] });
  expect(await getBrandPreset(clientId)).toMatchObject({ brand_context: "Marca atual" });
  expect(sql.mock.calls[0][0]).toContain("i.tone_of_voice AS default_tones");
  expect(sql.mock.calls[0][0]).not.toContain("p.brand_context");
 });
 it("altera campos compartilhados na identidade e preserva propriedades omitidas", async () => {
  sql.mockResolvedValue({ rowCount: 1, rows: [{ client_id: clientId }] });
  await saveBrandPreset({ clientId,brandContext: "Contexto melhorado com IA" });
  const [identityStatement,params] = sql.mock.calls[1];
  expect(identityStatement).toContain("INSERT INTO client_identities");
  expect(identityStatement).toContain("ELSE client_identities.tone_of_voice");
  expect(params[1]).toBe("Contexto melhorado com IA");
  expect(JSON.parse(params[5])).not.toContain("defaultTones");
  expect(sql.mock.calls[2][0]).not.toContain("brand_context");
 });
});
