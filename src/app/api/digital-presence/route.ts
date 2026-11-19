import {NextResponse} from "next/server";
import {z} from "zod";
import {requireAdminUser} from "@/lib/auth/require-auth";
import {loadAiClientContext} from "@/lib/ai/client-context";
import {aiFailure} from "@/lib/ai/openrouter";
import {creationInputSchema,scopeSchema,materialSchema} from "@/modules/digital-presence/schemas";
import {generatePresence,listPresence,savePresence} from "@/modules/digital-presence/service";
import {withTransaction} from "@/lib/db/pool";

// Allow the provider timeout and database work to finish before the platform cuts the response.
export const maxDuration = 120;

export async function GET(request:Request){
  try{await requireAdminUser();}catch{return NextResponse.json({success:false,error:"Acesso não autorizado"},{status:401});}
  const input=scopeSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!input.success)return NextResponse.json({success:false,error:"Empresa ou área inválida"},{status:400});
  try{
    const context=await loadAiClientContext(input.data.clientId);
    let materials:Awaited<ReturnType<typeof listPresence>>=[];let historyError="";
    try{materials=await listPresence(input.data.clientId,input.data.area,new URL(request.url).searchParams.get("archived")==="true");}catch{historyError="Não foi possível carregar os materiais salvos. Confira a conexão e as migrações 031 e 034.";}
    const audiences=Array.from(new Set([...context.audiences.map(a=>String(a.name)),...(Array.isArray(context.identity.target_audiences)?context.identity.target_audiences.map(String):[]),...(context.communicationProfile?.audienceTypes||[])]));
    return NextResponse.json({success:true,materials,historyError,context:{audiences,missing:context.missing,sources:context.sources,summary:String(context.identity.brand_context||context.identity.value_proposition||context.brandVoice.brand_context||"")}});
  }catch(error){const failure=aiFailure(error);return NextResponse.json(failure.body,{status:failure.status});}
}

export async function PATCH(request:Request){
  try{await requireAdminUser();}catch{return NextResponse.json({success:false,error:"Acesso não autorizado"},{status:401});}
  try{
    const input=scopeSchema.extend({id:z.string().uuid(),action:z.enum(["ARCHIVE","RESTORE","DELETE"])}).parse(await request.json());
    await withTransaction(async client=>{
      const result=input.action==="DELETE"
        ?await client.query("DELETE FROM digital_presence_materials WHERE id=$1 AND client_id=$2 AND area=$3 RETURNING *",[input.id,input.clientId,input.area])
        :await client.query("UPDATE digital_presence_materials SET archived_at=CASE WHEN $4 THEN NOW() ELSE NULL END WHERE id=$1 AND client_id=$2 AND area=$3 RETURNING id",[input.id,input.clientId,input.area,input.action==="ARCHIVE"]);
      if(!result.rows.length)throw new Error("Material não encontrado nesta empresa e área.");
      await client.query("INSERT INTO audit_logs(entity_name,entity_id,action,old_data,new_data) VALUES('digital_presence_materials',$1,$2,$3,$4)",[input.id,input.action==="DELETE"?"DELETE":"UPDATE",input.action==="DELETE"?JSON.stringify(result.rows[0]):null,JSON.stringify({action:input.action})]);
    });return NextResponse.json({success:true});
  }catch(error){return NextResponse.json({success:false,error:error instanceof Error?error.message:"Não foi possível alterar o material."},{status:400});}
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
