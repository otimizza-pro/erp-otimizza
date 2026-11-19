import {describe,it,expect,vi,beforeEach} from "vitest";
const {sql}=vi.hoisted(()=>({sql:vi.fn()}));
vi.mock("@/lib/db/pool",()=>({withTransaction:async(fn:(client:{query:typeof sql})=>unknown)=>fn({query:sql})}));
import {archiveRecord} from "@/modules/records/archive";
const id="11111111-1111-4111-8111-111111111111";
beforeEach(()=>sql.mockReset());
describe("Record archival",()=>{
 it("preserves business status and records a reversible archive change",async()=>{
  sql.mockResolvedValue({rows:[{id,archived_at:null}]});await archiveRecord("opportunity",id,true);
  const update=sql.mock.calls.find(([q])=>q.startsWith("UPDATE"));expect(update?.[0]).toContain("archived_at=CASE WHEN $2");expect(update?.[0]).not.toContain("status=");expect(update?.[1]).toEqual([id,true]);expect(sql.mock.calls.some(([q])=>q.startsWith("DELETE"))).toBe(false);
 });
 it("does not announce success for a missing record",async()=>{sql.mockResolvedValue({rows:[]});await expect(archiveRecord("project",id,false)).rejects.toThrow("não encontrado");expect(sql).toHaveBeenCalledTimes(1);});
});
