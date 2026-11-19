import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({query:vi.fn(),contract:vi.fn(),documents:vi.fn()}));
vi.mock("@/lib/db/pool",()=>({query:mocks.query,withTransaction:(fn:(client:{query:typeof mocks.query})=>unknown)=>fn({query:mocks.query})}));
vi.mock("@/modules/contracts/service",()=>({deleteContract:mocks.contract}));
vi.mock("@/modules/documents/service",()=>({DocumentService:{purgeDocumentsByIds:mocks.documents}}));
import {purgeClient} from "@/modules/clients/service";
const clientId="10000000-0000-4000-8000-000000000001";
beforeEach(()=>{
 vi.resetAllMocks();mocks.documents.mockResolvedValue(0);mocks.contract.mockResolvedValue({success:true});
 mocks.query.mockImplementation(async(sql:string)=>{
  if(sql.includes("SELECT * FROM clients"))return {rows:[{id:clientId,name:"Company"}]};
  if(sql.includes("SELECT id FROM contracts"))return {rows:[{id:"contract"}]};
  return {rows:[],rowCount:0};
 });
});
describe("Client purge preserves financial integrity",()=>{
 it("blocks before deleting any documents if settlements or reversals exist",async()=>{
  mocks.query.mockResolvedValueOnce({rows:[{id:clientId,name:"Company"}]}).mockResolvedValueOnce({rows:[{id:"settlement"}]});
  await expect(purgeClient(clientId)).rejects.toThrow(/histórico de baixas/);
  expect(mocks.documents).not.toHaveBeenCalled();expect(mocks.contract).not.toHaveBeenCalled();
  expect(mocks.query.mock.calls.some(call=>String(call[0]).includes("DELETE"))).toBe(false);
 });
 it("reuses contract deletion rather than maintaining a second financial cleanup",async()=>{
  expect((await purgeClient(clientId)).clientDeleted).toBe(true);
  expect(mocks.contract).toHaveBeenCalledWith("contract",expect.any(String),expect.objectContaining({query:mocks.query}));
  expect(mocks.query.mock.calls.some(call=>String(call[0]).includes("DELETE FROM contract_items"))).toBe(false);
 });
 it("stops client deletion when a contract cannot be deleted",async()=>{
  mocks.contract.mockRejectedValue(new Error("protected contract"));
  await expect(purgeClient(clientId)).rejects.toThrow("protected contract");
  expect(mocks.query.mock.calls.some(call=>String(call[0]).startsWith("DELETE FROM clients"))).toBe(false);
 });
});
