import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/auth/require-auth", () => ({ requireAdminUser: mocks.auth }));
vi.mock("@/lib/db/pool", () => ({ query: mocks.query }));
import { GET, POST, PUT, DELETE } from "@/app/api/passwords/route";

const id = "71404bfc-cf9d-46ae-a498-68dcf172b11e";
function request(method: string, body?: unknown, origin = "https://erp.example") {
  return new NextRequest("https://erp.example/api/passwords", { method, headers: { origin, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
}
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ id: "owner", email: "user@example.com" }); });
describe("Password vault access", () => {
  it("blocks unauthenticated access before querying the database", async () => {
    mocks.auth.mockRejectedValue(new Error("Unauthorized"));
    for (const [method, handler] of [["GET", GET], ["POST", POST], ["PUT", PUT], ["DELETE", DELETE]] as const) {
      expect((await handler(request(method))).status).toBe(401);
    }
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("blocks cross-origin mutations", async () => {
    expect((await POST(request("POST", {}, "https://other.example"))).status).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("lists only metadata for the authenticated owner with no caching", async () => {
    mocks.query.mockResolvedValue({ rows: [] });
    const response = await GET(request("GET"));
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.query.mock.calls[0][0]).not.toContain("encrypted_password");
    expect(mocks.query.mock.calls[0][1]).toEqual(["owner"]);
  });
  it("scopes reveal and deletion to the authenticated owner", async () => {
    mocks.query.mockResolvedValue({ rows: [], rowCount: 0 });
    expect((await POST(request("POST", { action: "reveal", id }))).status).toBe(404);
    expect(mocks.query.mock.calls[0][1]).toEqual([id, "owner"]);
    expect((await DELETE(request("DELETE", { id }))).status).toBe(404);
    expect(mocks.query.mock.calls[1][1]).toEqual([id, "owner"]);
  });
  it("rejects unsafe site protocols", async () => {
    expect((await POST(request("POST", { title: "Test", username: "", website: "javascript:alert(1)", password: "secret" }))).status).toBe(400);
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
