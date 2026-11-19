import {describe,it,expect,vi,beforeEach} from "vitest";
const {sql}=vi.hoisted(()=>({sql:vi.fn()}));
vi.mock("@/lib/db/pool",()=>({query:vi.fn(),withTransaction:async(fn:(client:{query:typeof sql})=>unknown)=>fn({query:sql})}));
import {deleteServiceCategories} from "@/modules/catalog/service";
beforeEach(()=>sql.mockReset());
describe("Permanent category deletion",()=>{
 it("blocks linked services without archiving or deleting",async()=>{sql.mockResolvedValueOnce({rows:[{id:"a",name:"Web"}]}).mockResolvedValueOnce({rows:[{name:"Web"}]});await expect(deleteServiceCategories(["a"])).rejects.toThrow("desvincule");expect(sql.mock.calls.some(([text])=>/DELETE FROM|UPDATE service_categories/.test(text))).toBe(false);});
 it("blocks children outside the selected batch",async()=>{sql.mockResolvedValueOnce({rows:[{id:"a",name:"Web"}]}).mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:[{id:"child"}]});await expect(deleteServiceCategories(["a"])).rejects.toThrow("subcategorias");expect(sql).toHaveBeenCalledTimes(3);});
 it("deletes selected leaves before their parent and audits both",async()=>{sql.mockResolvedValueOnce({rows:[{id:"a",name:"Parent"},{id:"b",name:"Child"}]}).mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:[{id:"b"}]}).mockResolvedValueOnce({rows:[{id:"a"}]}).mockResolvedValue({rows:[]});expect(await deleteServiceCategories(["a","b","a"])).toMatchObject({action:"deleted",count:2});expect(sql.mock.calls[4][1]).toEqual([["a"]]);expect(sql.mock.calls.filter(([text])=>text.includes("INSERT INTO audit_logs"))).toHaveLength(2);});
 it("rejects missing categories before deleting",async()=>{sql.mockResolvedValueOnce({rows:[]});await expect(deleteServiceCategories(["missing"])).rejects.toThrow("não existe");expect(sql).toHaveBeenCalledTimes(1);});
});
