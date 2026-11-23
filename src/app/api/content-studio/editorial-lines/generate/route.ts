export const maxDuration=120;
import {loadAiClientContext,assertClientContext,clientContextPrompt} from "@/lib/ai/client-context";
import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {query,withTransaction} from "@/lib/db/pool";
import {requireAdminUser} from "@/lib/auth/require-auth";
import {generateWithOpenRouter,strategyModel,parseAiJson,aiFailure,STRATEGY_TEMPERATURE,STRATEGY_CAMPAIGN_DNA_INSTRUCTION} from "@/lib/ai/openrouter";
import {normalizeFrequencyLevel} from "@/modules/clients/content-settings";
export const dynamic="force-dynamic";
const pillarsSchema=z.array(z.object({pillar_name:z.string().trim().min(1).max(255),theme:z.string().trim().min(1).max(255),objective:z.string().trim().min(1),preferred_formats:z.array(z.string().min(1)).min(1),frequency_per_month:z.union([z.enum(["Alta","Média","Baixa"]),z.string(),z.number()]).transform(normalizeFrequencyLevel).default("Média"),notes:z.string().default("")})).length(4);
export async function POST(request:NextRequest){
 try{await requireAdminUser();}catch{return NextResponse.json({success:false,error:"Acesso não autorizado"},{status:401});}
 const body=z.object({clientId:z.string().uuid()}).safeParse(await request.json().catch(()=>null));
 if(!body.success)return NextResponse.json({success:false,error:"Informe um cliente válido"},{status:400});
 try{
 const context=await loadAiClientContext(body.data.clientId);
 assertClientContext(context);
 const generated=await generateWithOpenRouter({
   model:strategyModel(),
   temperature:STRATEGY_TEMPERATURE,
   maxTokens:6000,
   messages:[
     {role:"system",content:'Você é um estrategista de conteúdo sênior. Mantenha raciocínio lógico rigoroso, estruturação estritamente fiel ao briefing e zero alucinação. Crie quatro pilares editoriais específicos ao cliente, em português do Brasil. Não invente provas ou resultados. No campo notes do pilar prioritário, inclua o bloco sintetizado [DNA_DA_CAMPANHA] (Público-alvo, Dor Principal, Desejo Principal, Mecanismo Único, 3 Objeções e Tom de Voz). Retorne somente um array JSON com exatamente quatro objetos: {"pillar_name":"nome curto","theme":"tema até 255 caracteres","objective":"objetivo","preferred_formats":["REELS","CAROUSEL"],"frequency_per_month":4,"notes":"orientações"}.'},
     {role:"user",content:clientContextPrompt(context)}
   ]
 });
 const pillars=parseAiJson(generated.text,pillarsSchema);
 const editorialLines=await withTransaction(async client=>{const rows=[];for(const pillar of pillars){const result=await client.query("INSERT INTO client_editorial_lines(client_id,pillar_name,theme,objective,preferred_formats,frequency_per_month,notes,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,true) RETURNING *",[body.data.clientId,pillar.pillar_name,pillar.theme,pillar.objective,pillar.preferred_formats,pillar.frequency_per_month,pillar.notes]);rows.push(result.rows[0]);}return rows;});
 return NextResponse.json({success:true,editorialLines,source:generated.source,modelUsed:generated.model,contextUsed:{companyId:context.companyId,sources:context.sources},message:"Quatro linhas editoriais geradas pela IA e salvas."});
 }catch(error){const failure=aiFailure(error);return NextResponse.json(failure.body,{status:failure.status});}
}
