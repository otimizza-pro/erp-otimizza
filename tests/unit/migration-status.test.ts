import {afterEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({query:vi.fn(),end:vi.fn()}));
vi.mock("@/lib/db/pool",()=>({getMigrationDbPool:()=>mocks}));
import {checkMigrationStatus} from "@/lib/db/status";
afterEach(()=>vi.resetAllMocks());
describe("Migration status reporting",()=>{
 it("propagates connectivity failures instead of reporting success",async()=>{
  mocks.query.mockRejectedValue(new Error("database offline"));
  await expect(checkMigrationStatus()).rejects.toThrow("database offline");
  expect(mocks.end).toHaveBeenCalledOnce();
 });
 it("recognizes a database with no migration history",async()=>{
  mocks.query.mockRejectedValue(Object.assign(new Error("missing table"),{code:"42P01"}));
  await expect(checkMigrationStatus()).resolves.toBeUndefined();
  expect(mocks.end).toHaveBeenCalledOnce();
 });
});
