export const maxDuration=120;
import {resolveContentBrief,contentBriefPrompt} from "@/modules/clients/content-brief";
import {loadAiClientContext,assertClientContext,clientContextPrompt} from "@/lib/ai/client-context";
import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {query} from "@/lib/db/pool";
import {requireAdminUser} from "@/lib/auth/require-auth";
import {generateWithOpenRouter,strategyModel,parseAiJson,aiFailure,STRATEGY_TEMPERATURE} from "@/lib/ai/openrouter";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
 try{await requireAdminUser();}catch{return NextResponse.json({success:false,error:"Acesso não autorizado"},{status:401});}
 const body=z.object({clientId:z.string().uuid(),editorialBrief:z.unknown(),count:z.union([z.literal(1),z.literal(5)]).default(5),editorialLineId:z.string().uuid().optional(),currentIdea:z.string().max(6000).optional(),audience:z.string().max(1000).optional(),format:z.string().max(100).optional()}).safeParse(await request.json().catch(()=>null));
 if(!body.success)return NextResponse.json({success:false,error:"Informe um cliente válido"},{status:400});
 try{
 const context=await loadAiClientContext(body.data.clientId);
 assertClientContext(context);
 const pieceBrief=resolveContentBrief(context,body.data.editorialBrief);
 const theme=body.data.editorialLineId?context.editorialLines.find(line=>line.id===body.data.editorialLineId):null;
 if(body.data.editorialLineId&&!theme)return NextResponse.json({error:"O tema não pertence à empresa selecionada"},{status:400});
 const generated=await generateWithOpenRouter({
   model:strategyModel(),
   temperature:STRATEGY_TEMPERATURE,
   maxTokens:4000,
   messages:[
     {role:"system",content:"Você é um estrategista de conteúdo. Mantenha raciocínio lógico analítico, estruturação fiel ao briefing e zero alucinação. Escreva em português do Brasil, usando somente o contexto fornecido. Não invente provas ou resultados. Retorne somente um array JSON com exatamente "+body.data.count+" ideias de conteúdo, todas strings não vazias."},
     {role:"user",content:clientContextPrompt(context)+"\n"+contentBriefPrompt(pieceBrief)+"\nQuantidade: "+body.data.count+". Tema escolhido: "+JSON.stringify(theme)+". Público desta peça: "+(body.data.audience||"seguir cadastro")+". Formato: "+(body.data.format||"livre")+". Ideia atual para desenvolver, se houver: "+(body.data.currentIdea||"nenhuma")+". Gere pauta específica, com ângulo útil ao público; não uma headline genérica."}
   ]
 });
 const ideas=parseAiJson(generated.text,z.array(z.string().trim().min(1)).length(body.data.count));
 return NextResponse.json({success:true,ideas,source:generated.source,modelUsed:generated.model,contextUsed:{companyId:context.companyId,sources:context.sources}});
 }catch(error){const failure=aiFailure(error);return NextResponse.json(failure.body,{status:failure.status});}
}
