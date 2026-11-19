import {z} from "zod";
import {creationAreas} from "./catalog";

export const scopeSchema=z.object({clientId:z.string().uuid(),area:z.string().refine(area=>Object.hasOwn(creationAreas,area),"Área inválida")});
export const creationInputSchema=scopeSchema.extend({
  outputIndex:z.number().int().min(0).max(3),
  audience:z.string().trim().min(1).max(1500),
  guidance:z.string().max(6000).default(""),
  inputs:z.record(z.string(),z.string().max(8000)),
}).superRefine((input,ctx)=>{
  const definition=creationAreas[input.area];if(!definition)return;
  if(!definition.outputs[input.outputIndex])ctx.addIssue({code:"custom",path:["outputIndex"],message:"Escolha um material disponível nesta área."});
  for(const field of definition.fields){
    if(field.required&&!input.inputs[field.key]?.trim())ctx.addIssue({code:"custom",path:["inputs",field.key],message:"Preencha: "+field.label});
  }
  if(Object.keys(input.inputs).some(key=>!definition.fields.some(field=>field.key===key)))ctx.addIssue({code:"custom",path:["inputs"],message:"O formulário contém campos de outra área."});
  if(JSON.stringify(input.inputs).length>35000)ctx.addIssue({code:"custom",path:["inputs"],message:"Reduza os dados fornecidos a até 35 mil caracteres."});
});
export type CreationInput=z.infer<typeof creationInputSchema>;
export const materialSchema=z.object({
  title:z.string().trim().min(1).max(255),
  content:z.string().trim().min(30).max(60000),
  html:z.string().max(100000).nullable().default(null),
  pending:z.array(z.string().trim().min(1).max(1000)).max(30).default([]),
});
export type CreationMaterial=z.output<typeof materialSchema>;
