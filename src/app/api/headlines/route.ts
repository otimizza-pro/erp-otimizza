import { requireAdminUser } from "@/lib/auth/require-auth";
import { query } from "@/lib/db/pool";
import { loadAiClientContext } from "@/lib/ai/client-context";
import * as service from "@/modules/headlines/service";
import { z } from "zod";
export const maxDuration=120;
export const dynamic="force-dynamic";
const uuid=z.string().uuid();
const bodySchema=z.discriminatedUnion("action",[
 z.object({action:z.literal("CREATE"),clientId:uuid,contentId:uuid.optional()}),
 z.object({action:z.literal("SAVE"),id:uuid,brief:z.unknown(),revision:z.number().int().positive()}),
 z.object({action:z.literal("ROUND"),id:uuid,revision:z.number().int().positive()}),
 z.object({action:z.literal("BATCH"),roundId:uuid,team:z.enum(["A","B"]),regenerate:z.boolean().default(false)}),
 z.object({action:z.literal("RUN"),id:uuid}),z.object({action:z.literal("RETRY"),id:uuid}),
 z.object({action:z.literal("RATE"),id:uuid,rating:z.number().int().min(-1).max(1),reason:z.string().trim().max(1000).default("")}),
 z.object({action:z.literal("PRESENT"),ids:z.array(uuid).max(100)}),
 z.object({action:z.literal("SELECT"),id:uuid}),
 z.object({action:z.literal("HUMAN"),roundId:uuid,headline:z.string().trim().min(1).max(2000),subheadline:z.string().trim().max(4000).default(""),inspiredBy:z.array(uuid).max(64).default([])}),
 z.object({action:z.literal("BRAINSTORM"),id:uuid,direction:z.string().max(6000)}),
 z.object({action:z.literal("STYLE_SAVE"),clientId:uuid,format:z.string().max(100),guidance:z.string().max(12000)}),
 z.object({action:z.literal("STYLE_SUGGEST"),clientId:uuid,format:z.string().max(100)}),
 z.object({action:z.literal("MEASURE"),id:uuid,data:z.unknown()}),
 z.object({action:z.literal("RECOMMEND"),id:uuid}),
 z.object({action:z.literal("EXPERIMENT"),data:z.unknown()}),
 z.object({action:z.literal("EXPERIMENT_STATUS"),id:uuid,status:z.enum(["PLANNED","RUNNING","COMPLETED"]),conclusion:z.string().max(4000)}),
]);
function failure(error:unknown) {return Response.json({error:error instanceof Error?error.message:"Falha na operação."},{status:400});}
export async function GET(request:Request) {
 let user;try{user=await requireAdminUser();}catch{return Response.json({error:"Não autorizado."},{status:401});}
 try {
  const p=new URL(request.url).searchParams,action=p.get("action"),client=p.get("clientId");if(client)uuid.parse(client);
  if(action==="context")return Response.json(await loadAiClientContext(uuid.parse(client)));
  if(action==="models")return Response.json(service.teamModels());
  if(action==="catalog") {
   const r=await fetch("https://openrouter.ai/api/v1/models",{signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error("Catálogo indisponível.");
   const raw=await r.json();const models=z.object({data:z.array(z.object({id:z.string()}))}).parse(raw).data;
   return Response.json(Object.entries(service.teamModels()).flatMap(([team,slots])=>slots.map(s=>({...s,team,available:models.some(m=>m.id===s.model)}))));
  }
  if(action==="analytics")return Response.json(await service.analytics(user.id,client||undefined,p.get("from")?z.iso.date().parse(p.get("from")):undefined,p.get("to")?z.iso.date().parse(p.get("to")):undefined,p.get("format")||undefined));
  if(action==="style")return Response.json(await service.styleContext(uuid.parse(client),user.id,p.get("format")||"Estático"));
  if(p.get("id"))return Response.json(await service.workspaceState(uuid.parse(p.get("id")),user.id));
  const rows=await query("SELECT w.id,w.content_id,w.updated_at,c.title,c.format FROM headline_workspaces w JOIN content_calendar_items c ON c.id=w.content_id WHERE w.user_id=$1 AND ($2::uuid IS NULL OR w.client_id=$2) AND c.archived_at IS NULL ORDER BY w.updated_at DESC LIMIT 100",[user.id,client]);return Response.json(rows.rows);
 }catch(error){return failure(error);}
}
export async function POST(request:Request) {
 let user;try{user=await requireAdminUser();}catch{return Response.json({error:"Não autorizado."},{status:401});}
 try {
  const raw=await request.text();if(raw.length>160000)throw new Error("Solicitação muito grande.");
  const b=bodySchema.parse(JSON.parse(raw));
  switch(b.action) {
   case "CREATE":return Response.json({id:await service.createWorkspace(b.clientId,user.id,b.contentId)});
   case "SAVE":return Response.json(await service.saveBrief(b.id,user.id,b.brief,b.revision));
   case "ROUND":return Response.json({id:await service.createRound(b.id,user.id,b.revision)});
   case "BATCH":await service.addBatch(b.roundId,user.id,b.team,b.regenerate);break;
   case "RUN":await service.executeRun(b.id,user.id);break;
   case "RETRY":return Response.json({id:await service.retryRun(b.id,user.id)});
   case "RATE":await service.feedback(b.id,user.id,b.rating,b.reason);break;
   case "PRESENT":await service.presentCandidates(b.ids,user.id);break;
   case "SELECT":return Response.json({contentId:await service.selectCandidate(b.id,user.id)});
   case "HUMAN":return Response.json({id:await service.createHuman(b.roundId,user.id,b.headline,b.subheadline,b.inspiredBy)});
   case "BRAINSTORM":return Response.json({ideas:await service.brainstorm(b.id,user.id,b.direction)});
   case "STYLE_SAVE":await service.saveStyle(b.clientId,user.id,b.format,b.guidance);break;
   case "STYLE_SUGGEST":return Response.json({guidance:await service.summarizeStyle(b.clientId,user.id,b.format)});
   case "MEASURE":await service.measurements(b.id,user.id,b.data);break;
   case "RECOMMEND":return Response.json(await service.recommendBrief(b.id,user.id));
   case "EXPERIMENT":await service.createExperiment(user.id,b.data);break;
   case "EXPERIMENT_STATUS":await service.finishExperiment(user.id,b.id,b.status,b.conclusion);break;
  }
  return Response.json({success:true});
 }catch(error){return failure(error);}
}
