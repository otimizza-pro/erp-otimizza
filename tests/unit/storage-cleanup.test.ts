import {afterEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({query:vi.fn(),remove:vi.fn()}));
vi.mock("@/lib/db/pool",()=>({withTransaction:(callback:(client:{query:typeof mocks.query})=>unknown)=>callback({query:mocks.query})}));
vi.mock("@/modules/documents/storage",()=>({DocumentStorage:{deleteFile:mocks.remove}}));
import {processStorageCleanup} from "@/modules/documents/cleanup";
afterEach(()=>vi.resetAllMocks());
describe("Retryable external cleanup",()=>{
 it("never removes a file that is still referenced",async()=>{
  mocks.query.mockResolvedValueOnce({rows:[{storage_path:"shared.pdf"}]}).mockResolvedValueOnce({rows:[{id:"other-version"}]});
  expect(await processStorageCleanup()).toEqual({deleted:0,failed:0});expect(mocks.remove).not.toHaveBeenCalled();
 });
 it("keeps failed files in the retry queue",async()=>{
  mocks.query.mockResolvedValueOnce({rows:[{storage_path:"file.pdf"}]}).mockResolvedValueOnce({rows:[]}).mockResolvedValue({rows:[]});
  mocks.remove.mockRejectedValue(new Error("offline"));
  expect(await processStorageCleanup()).toEqual({deleted:0,failed:1});
  expect(mocks.query.mock.calls.some(call=>String(call[0]).startsWith("UPDATE storage_cleanup_queue"))).toBe(true);
  expect(mocks.query.mock.calls.some(call=>String(call[0]).startsWith("DELETE"))).toBe(false);
 });
 it("removes a queue entry only after Storage confirms deletion",async()=>{
  mocks.query.mockResolvedValueOnce({rows:[{storage_path:"file.pdf"}]}).mockResolvedValueOnce({rows:[]}).mockResolvedValue({rows:[]});
  mocks.remove.mockResolvedValue(undefined);
  expect(await processStorageCleanup()).toEqual({deleted:1,failed:0});
  expect(mocks.query.mock.calls.at(-1)?.[0]).toContain("DELETE FROM storage_cleanup_queue");
 });
});
