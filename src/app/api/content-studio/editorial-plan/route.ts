export const maxDuration=120;
import {NextResponse} from "next/server";
import {z} from "zod";
import {requireAdminUser} from "@/lib/auth/require-auth";
import {loadAiClientContext,assertClientContext,clientContextPrompt} from "@/lib/ai/client-context";
import {generateWithOpenRouter,strategyModel,parseAiJson,aiFailure} from "@/lib/ai/openrouter";
import {withTransaction} from "@/lib/db/pool";
const lineSchema=z.object({pillar_name:z.string().trim().min(1).max(255),theme:z.string().trim().min(1).max(255),objective:z.string().trim().min(1).max(1500),preferred_formats:z.array(z.string().min(1)).min(1).max(4),frequency_per_month:z.number().int().min(1).max(31),notes:z.string().max(2000).default("")});
const linesSchema=z.array(lineSchema).min(1).max(24);
export async function POST(request:Request){
 try{await requireAdminUser();}catch{return NextResponse.json({success:false,error:"Acesso não autorizado"},{status:401});}
 const input=z.object({clientId:z.string().uuid(),action:z.enum(["GENERATE","SAVE"]),pillar:z.string().trim().max(255).optional(),lines:linesSchema.optional()}).safeParse(await request.json().catch(()=>null));
 if(!input.success)return NextResponse.json({success:false,error:"Dados de planejamento inválidos"},{status:400});
 try{
  const data=input.data;
  if(data.action==="SAVE"){
   if(!data.lines)return NextResponse.json({error:"Revise os temas antes de salvar"},{status:400});
   const result=await withTransaction(async client=>{const owner=await client.query("SELECT id FROM clients WHERE id=$1 FOR UPDATE",[data.clientId]);if(!owner.rows.length)throw new Error("Empresa não encontrada; confira as migrações.");let added=0;for(const line of data.lines!){const exists=await client.query("SELECT id FROM client_editorial_lines WHERE client_id=$1 AND lower(trim(pillar_name))=lower(trim($2)) AND lower(trim(theme))=lower(trim($3))",[data.clientId,line.pillar_name,line.theme]);if(exists.rows.length)continue;await client.query("INSERT INTO client_editorial_lines(client_id,pillar_name,theme,objective,preferred_formats,frequency_per_month,notes,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,true)",[data.clientId,line.pillar_name,line.theme,line.objective,line.preferred_formats,line.frequency_per_month,line.notes]);added++;}return added;});
   return NextResponse.json({success:true,added:result});
  }
  const context=await loadAiClientContext(data.clientId);assertClientContext(context);
  const result=await generateWithOpenRouter({model:strategyModel(),maxTokens:7000,messages:[{role:"system",content:'Você é estrategista editorial. Organize pilares amplos em temas recorrentes; não confunda tema com pauta de post. '+(data.pillar?'Gere 3 novos temas do pilar informado, preservando seu nome exatamente.':'Gere 4 pilares específicos ao negócio, com 3 temas recorrentes em cada pilar (12 registros).')+' Cada tema deve ter objetivo e orientação próprios. Não invente diferenciais, pesquisas ou resultados. Evite repetir os temas já cadastrados no contexto. Retorne somente array JSON: [{"pillar_name":"pilar","theme":"tema recorrente","objective":"objetivo","preferred_formats":["REELS","CAROUSEL"],"frequency_per_month":1,"notes":"orientação"}]. Português brasileiro.'},{role:"user",content:clientContextPrompt(context)+(data.pillar?"\nPilar selecionado: "+data.pillar:"")}]});
  const lines=parseAiJson(result.text,linesSchema);
  if(data.pillar&&lines.some(l=>l.pillar_name!==data.pillar))throw new Error("A IA alterou o pilar solicitado. Tente novamente.");
  return NextResponse.json({success:true,source:result.source,model:result.model,lines});
 }catch(error){const failure=aiFailure(error);return NextResponse.json(failure.body,{status:failure.status});}
}
