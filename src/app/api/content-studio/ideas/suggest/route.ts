import {loadAiClientContext,assertClientContext,clientContextPrompt} from "@/lib/ai/client-context";
import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {query} from "@/lib/db/pool";
import {requireAdminUser} from "@/lib/auth/require-auth";
import {generateWithOpenRouter,strategyModel,parseAiJson,aiFailure} from "@/lib/ai/openrouter";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
 try{await requireAdminUser();}catch{return NextResponse.json({success:false,error:"Acesso não autorizado"},{status:401});}
 const body=z.object({clientId:z.string().uuid()}).safeParse(await request.json().catch(()=>null));
 if(!body.success)return NextResponse.json({success:false,error:"Informe um cliente válido"},{status:400});
 try{
 const context=await loadAiClientContext(body.data.clientId);
 assertClientContext(context);
 const generated=await generateWithOpenRouter({model:strategyModel(),maxTokens:4000,messages:[{role:"system",content:"Você é um estrategista de conteúdo. Escreva em português do Brasil, usando somente o contexto fornecido. Não invente provas ou resultados. Retorne somente um array JSON com exatamente 5 ideias de conteúdo, todas strings não vazias."},{role:"user",content:clientContextPrompt(context)+"\nSugira cinco pautas distintas adequadas ao público e ao negócio deste cliente."}]});
 const ideas=parseAiJson(generated.text,z.array(z.string().trim().min(1)).length(5));
 return NextResponse.json({success:true,ideas,source:generated.source,modelUsed:generated.model,contextUsed:{companyId:context.companyId,sources:context.sources}});
 }catch(error){const failure=aiFailure(error);return NextResponse.json(failure.body,{status:failure.status});}
}
