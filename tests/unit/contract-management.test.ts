import {describe,it,expect,vi,beforeEach} from "vitest";
const {sql,read}=vi.hoisted(()=>({sql:vi.fn(),read:vi.fn()}));
vi.mock("@/lib/db/pool",()=>({query:read,withTransaction:async(fn:(client:{query:typeof sql})=>unknown)=>fn({query:sql})}));
import {setContractVisibility,deleteContract} from "@/modules/contracts/service";
beforeEach(()=>{sql.mockReset();read.mockReset();});
describe("Contract management",()=>{
 it("blocks archiving active contracts",async()=>{sql.mockResolvedValueOnce({rows:[{status:"ACTIVE"}]});await expect(setContractVisibility("a","archive","test")).rejects.toThrow("Cancele");expect(sql).toHaveBeenCalledTimes(1);});
 it("rejects only drafts",async()=>{sql.mockResolvedValueOnce({rows:[{status:"ACTIVE"}]});await expect(setContractVisibility("a","reject","test")).rejects.toThrow("rascunhos");});
 it("blocks rejection when invoices exist",async()=>{sql.mockResolvedValueOnce({rows:[{status:"DRAFT"}]}).mockResolvedValueOnce({rows:[{id:"invoice"}]});await expect(setContractVisibility("a","reject","test")).rejects.toThrow("cobranças");expect(sql).toHaveBeenCalledTimes(2);});
 it("does not swallow the original deletion error",async()=>{const now=new Date();read.mockResolvedValueOnce({rowCount:1,rows:[{id:"a",client_id:"b",contract_number:"CTR",status:"DRAFT",created_at:now,updated_at:now}]}).mockResolvedValueOnce({rows:[]});sql.mockResolvedValueOnce({rows:[{id:"a"}]}).mockResolvedValueOnce({rows:[]}).mockRejectedValueOnce(new Error("original database failure"));await expect(deleteContract("a","test")).rejects.toThrow("original database failure");expect(sql).toHaveBeenCalledTimes(3);});
 it("preserves all settlements including reversals",async()=>{const now=new Date();read.mockResolvedValueOnce({rowCount:1,rows:[{id:"a",client_id:"b",contract_number:"CTR",status:"DRAFT",created_at:now,updated_at:now}]}).mockResolvedValueOnce({rows:[]});sql.mockResolvedValueOnce({rows:[{id:"a"}]}).mockResolvedValueOnce({rows:[{id:"settlement"}]});await expect(deleteContract("a","test")).rejects.toThrow("estornos");expect(sql).toHaveBeenCalledTimes(2);});
});
