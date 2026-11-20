export const maxDuration=120;
import {NextResponse} from "next/server";
import {z} from "zod";
import {requireAdminUser} from "@/lib/auth/require-auth";
import {loadAiClientContext,assertClientContext,clientContextPrompt} from "@/lib/ai/client-context";
import {generateWithOpenRouter,strategyModel,parseAiJson,aiFailure,STRATEGY_TEMPERATURE} from "@/lib/ai/openrouter";
import {withTransaction} from "@/lib/db/pool";
const audienceSchema=z.array(z.object({name:z.string().trim().min(1).max(150),description:z.string().trim().min(1).max(2500),painPoints:z.array(z.string().min(1).max(1000)).max(8),desires:z.array(z.string().min(1).max(1000)).max(8),objections:z.array(z.string().min(1).max(1000)).max(8)})).min(1).max(6);
export async function POST(request:Request){
 try{await requireAdminUser();}catch{return NextResponse.json({success:false,error:"Acesso não autorizado"},{status:401});}
 const input=z.object({clientId:z.string().uuid(),action:z.enum(["GENERATE","SAVE"]),audiences:audienceSchema.optional()}).safeParse(await request.json().catch(()=>null));if(!input.success)return NextResponse.json({error:"Dados inválidos"},{status:400});
 try{const data=input.data;if(data.action==="SAVE"){if(!data.audiences)return NextResponse.json({error:"Revise os públicos antes de salvar"},{status:400});const added=await withTransaction(async client=>{const owner=await client.query("SELECT id FROM clients WHERE id=$1 FOR UPDATE",[data.clientId]);if(!owner.rows.length)throw new Error("Empresa não encontrada");let count=0;for(const audience of data.audiences!){const existing=await client.query("SELECT id FROM client_audiences WHERE client_id=$1 AND lower(trim(name))=lower(trim($2))",[data.clientId,audience.name]);if(existing.rows.length)continue;await client.query("INSERT INTO client_audiences(client_id,name,description,pain_points,desires,objections,is_default) VALUES($1,$2,$3,$4,$5,$6,false)",[data.clientId,audience.name,audience.description,audience.painPoints,audience.desires,audience.objections]);count++;}return count;});return NextResponse.json({success:true,added});}
 const context=await loadAiClientContext(data.clientId);assertClientContext(context,{requireAudience:false});
 const generated=await generateWithOpenRouter({
   model:strategyModel(),
   temperature:STRATEGY_TEMPERATURE,
   maxTokens:4000,
   messages:[
     {role:"system",content:'Você é estrategista de público e posicionamento. Mantenha raciocínio lógico e zero alucinação. Sugira 3 segmentos de público diferentes e úteis para a empresa. Baseie-se na identidade, na oferta e em quem o cliente declara atender. Não presuma B2B, não invente faturamento, idade, região, diagnósticos ou estatísticas. Dores, desejos e objeções inferidos devem ser identificados como hipóteses para revisão. Não repita públicos existentes. Português brasileiro. Retorne array JSON [{"name":"público","description":"descrição com critérios conhecidos e hipóteses identificadas","painPoints":[],"desires":[],"objections":[]}].'},
     {role:"user",content:clientContextPrompt(context)}
   ]
 });
 return NextResponse.json({success:true,source:generated.source,model:generated.model,audiences:parseAiJson(generated.text,audienceSchema)});
 }catch(error){const failure=aiFailure(error);return NextResponse.json(failure.body,{status:failure.status});}
}
