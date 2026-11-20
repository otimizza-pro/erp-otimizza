import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/auth/require-auth", () => ({ requireAdminUser: vi.fn().mockResolvedValue({ id: "admin" }) }));
vi.mock("@/lib/db/pool", () => ({
  query,
  withTransaction: (run: (db: { query: typeof query }) => unknown) => run({ query }),
}));

import { GET, PATCH } from "@/app/api/content-studio/posts/[id]/checklist/route";
import { productionChecklistTemplate } from "@/modules/clients/production-checklist";

const id = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
const url = "http://localhost/api/content-studio/posts/" + id + "/checklist?clientId=" + clientId;
const context = { params: Promise.resolve({ id }) };
const update = (data: object) => new Request(url, {
  method: "PATCH",
  body: JSON.stringify({ clientId, formatKey: "reels", itemKey: "script", completed: true, ...data }),
});

beforeEach(() => query.mockReset());

describe("checklist de produção", () => {
  it("usa um modelo distinto para cada formato social suportado", () => {
    expect(productionChecklistTemplate("Reels")?.items).toHaveLength(5);
    expect(productionChecklistTemplate("Carrossel")?.items).toHaveLength(3);
    expect(productionChecklistTemplate("Post estático")?.items).toHaveLength(2);
    expect(productionChecklistTemplate("Landing page")).toBeNull();
  });

  it("lê as marcações salvas no post e formato corretos", async () => {
    query.mockResolvedValueOnce({ rows: [{ format: "Reels", content_type: "SOCIAL_MEDIA" }] })
      .mockResolvedValueOnce({ rows: [{ item_key: "script" }] });
    const result = await GET(new Request(url), context);
    expect(result.status).toBe(200);
    expect((await result.json()).items[0]).toMatchObject({ key: "script", completed: true });
    expect(query.mock.calls[0][1]).toEqual([id, clientId]);
  });

  it("recusa alterações feitas com o formato anterior", async () => {
    query.mockResolvedValueOnce({ rows: [{ format: "Carrossel", content_type: "SOCIAL_MEDIA" }] });
    const result = await PATCH(update({}), context);
    expect(result.status).toBe(409);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("permite desmarcar um item sem alterar o post", async () => {
    query.mockResolvedValueOnce({ rows: [{ format: "Reels", content_type: "SOCIAL_MEDIA" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const result = await PATCH(update({ completed: false }), context);
    expect(result.status).toBe(200);
    expect((await result.json()).items[0]).toMatchObject({ key: "script", completed: false });
    expect(query.mock.calls[1][1]).toEqual([id, "reels", "script", false]);
    expect(query.mock.calls[1][0]).toContain("INSERT INTO content_production_checklist");
  });
});
