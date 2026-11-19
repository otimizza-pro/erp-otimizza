import {beforeEach,describe,expect,it,vi} from "vitest";
const db=vi.hoisted(()=>({transaction:vi.fn(),query:vi.fn()}));
vi.mock("@/lib/db/pool",()=>({query:db.query,withTransaction:db.transaction}));
import {ProposalService} from "@/modules/proposals/service";
import {CreateProposalInputSchema,CreateProposalVersionInputSchema} from "@/modules/proposals/types";
const clientId="10000000-0000-4000-8000-000000000001";
const serviceId="20000000-0000-4000-8000-000000000001";
const proposalId="30000000-0000-4000-8000-000000000001";
const item={serviceId,quantity:"2",negotiatedUnitPrice:"125.50",unitCost:"20",discountAmount:"5"};
beforeEach(()=>{vi.clearAllMocks();db.transaction.mockResolvedValue({id:proposalId});});
describe("Validated proposal input boundary",()=>{
 it("normalizes numeric strings and defaults before pricing",()=>{
  const parsed=CreateProposalInputSchema.parse({title:"Proposta de serviços",clientId,validUntil:"2026-12-31",globalDiscount:"10",items:[item]});
  expect(parsed.globalDiscount).toBe(10);
  expect(parsed.items[0]).toMatchObject({quantity:2,negotiatedUnitPrice:125.5,unitCost:20,discountAmount:5,referenceUnitPrice:0});
  const version=CreateProposalVersionInputSchema.parse({proposalId,items:[item]});
  expect(version.globalDiscount).toBe(0);
  expect(typeof version.items[0].quantity).toBe("number");
 });
 it("rejects an invalid price before opening a creation transaction",async()=>{
  await expect(ProposalService.createProposal({title:"Proposta de serviços",clientId,validUntil:"2026-12-31",items:[{...item,negotiatedUnitPrice:"invalid"}]})).rejects.toThrow();
  expect(db.transaction).not.toHaveBeenCalled();expect(db.query).not.toHaveBeenCalled();
 });
 it("rejects an invalid global discount before opening a version transaction",async()=>{
  await expect(ProposalService.createProposalVersion({proposalId,globalDiscount:"invalid",items:[item]})).rejects.toThrow();
  expect(db.transaction).not.toHaveBeenCalled();expect(db.query).not.toHaveBeenCalled();
 });
});
