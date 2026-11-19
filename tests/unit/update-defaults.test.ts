import {describe,expect,it} from "vitest";
import {UpdateLeadSchema,UpdatePipelineSchema,UpdateStageSchema,CreateLeadSchema} from "@/modules/crm/schemas";
import {UpdateProjectSchema,UpdateTaskSchema,CreateTaskSchema} from "@/modules/projects/types";

describe("Partial updates preserve omitted fields",()=>{
 it.each([
  ["lead",UpdateLeadSchema], ["pipeline",UpdatePipelineSchema], ["stage",UpdateStageSchema],
  ["project",UpdateProjectSchema], ["task",UpdateTaskSchema],
 ])("does not populate creation defaults on an empty %s patch",(_name,schema)=>{
  expect(schema.parse({})).toEqual({});
 });
 it("changes only the requested lead field, without resetting acquisition or budget",()=>{
  expect(UpdateLeadSchema.parse({qualificationNotes:"Perfil analisado"})).toEqual({qualificationNotes:"Perfil analisado"});
 });
 it("keeps defaults when creating a record",()=>{
  expect(CreateLeadSchema.parse({personType:"PJ",name:"Company"})).toMatchObject({source:"OUTROS",acquisitionType:"NAO_INFORMADO",estimatedBudget:0});
  expect(CreateTaskSchema.parse({projectId:"10000000-0000-4000-8000-000000000001",title:"Review"})).toMatchObject({status:"TODO",priority:"MEDIUM",estimatedHours:1,orderIndex:1});
 });
});
