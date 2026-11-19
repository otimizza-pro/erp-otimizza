import {NextResponse} from "next/server";
import {z} from "zod";
import {requireAdminUser} from "@/lib/auth/require-auth";
import {loadAiClientContext} from "@/lib/ai/client-context";
import {aiFailure} from "@/lib/ai/openrouter";
import {creationInputSchema,scopeSchema,materialSchema} from "@/modules/digital-presence/schemas";
import {generatePresence,listPresence,savePresence} from "@/modules/digital-presence/service";

export async function GET(request:Request){
  try{await requireAdminUser();}catch{return NextResponse.json({success:false,error:"Acesso não autorizado"},{status:401});}
  const input=scopeSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!input.success)return NextResponse.json({success:false,error:"Empresa ou área inválida"},{status:400});
  try{
    const context=await loadAiClientContext(input.data.clientId);
    let materials:Awaited<ReturnType<typeof listPresence>>=[];let historyError="";
    try{materials=await listPresence(input.data.clientId,input.data.area);}catch{historyError="Não foi possível carregar os materiais salvos. Confira a conexão e a migração 031.";}
    const audiences=Array.from(new Set([...context.audiences.map(a=>String(a.name)),...(Array.isArray(context.identity.target_audiences)?context.identity.target_audiences.map(String):[]),...(context.communicationProfile?.audienceTypes||[])]));
    return NextResponse.json({success:true,materials,historyError,context:{audiences,missing:context.missing,sources:context.sources,summary:String(context.identity.brand_context||context.identity.value_proposition||context.brandVoice.brand_context||"")}});
  }catch(error){const failure=aiFailure(error);return NextResponse.json(failure.body,{status:failure.status});}
}
export async function POST(request:Request){
  let user;try{user=await requireAdminUser();}catch{return NextResponse.json({success:false,error:"Acesso não autorizado"},{status:401});}
  try{
    const raw=await request.json();const input=creationInputSchema.safeParse(raw);
    if(!input.success)return NextResponse.json({success:false,error:input.error.issues.map(i=>i.message).join(". ")},{status:400});
    if(raw.action==="GENERATE")return NextResponse.json({success:true,...await generatePresence(input.data)});
    if(raw.action==="SAVE"){
      const material=materialSchema.safeParse(raw.material);const model=z.string().max(150).nullable().safeParse(raw.model??null);
      if(!material.success||!model.success)return NextResponse.json({success:false,error:"Revise o material antes de salvar"},{status:400});
      return NextResponse.json({success:true,document:await savePresence(input.data,material.data,user.id,model.data)},{status:201});
    }
    return NextResponse.json({success:false,error:"Ação inválida"},{status:400});
  }catch(error){console.error("Falha na criação de presença digital",error);const failure=aiFailure(error);return NextResponse.json(failure.body,{status:failure.status});}
}
