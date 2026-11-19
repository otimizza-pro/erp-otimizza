import {resolveContentBrief} from "@/modules/clients/content-brief";
import {NextResponse} from "next/server";
import {z} from "zod";
import {requireAdminUser} from "@/lib/auth/require-auth";
import {loadAiClientContext,assertClientContext,clientContextPrompt} from "@/lib/ai/client-context";
import {generateWithOpenRouter,strategyModel,parseAiJson,aiFailure,AiGenerationError} from "@/lib/ai/openrouter";
import {query,withTransaction} from "@/lib/db/pool";
import {calendarPlanSchema,validateCalendarMonth} from "@/modules/clients/calendar-plan";
export async function POST(request:Request){
 try{await requireAdminUser();}catch{return NextResponse.json({success:false,error:"Acesso não autorizado"},{status:401});}
 const input=z.object({action:z.enum(["GENERATE","SAVE"]),clientId:z.string().uuid(),month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),count:z.number().int().min(1).max(31).default(12),guidance:z.string().max(4000).default(""),items:calendarPlanSchema.optional()}).safeParse(await request.json().catch(()=>null));
 if(!input.success)return NextResponse.json({success:false,error:"Confira mês, quantidade e dados do calendário"},{status:400});
 try{
  const data=input.data;
  const context=await loadAiClientContext(data.clientId);assertClientContext(context);
  if(data.action==="SAVE"){
   if(!data.items||!validateCalendarMonth(data.items,data.month))throw new AiGenerationError("AI_INVALID_PERIOD","Todas as datas precisam pertencer ao mês selecionado.",400);
   const added=await withTransaction(async client=>{
    const company=await client.query("SELECT id FROM clients WHERE id=$1 FOR UPDATE",[data.clientId]);if(!company.rows.length)throw new Error("Empresa não encontrada. Confira as migrações.");
    const allowed=await client.query<{id:string}>("SELECT id FROM client_editorial_lines WHERE client_id=$1",[data.clientId]);const allowedIds=new Set(allowed.rows.map(line=>line.id));
    let count=0;for(const item of data.items!){const brief=resolveContentBrief(context,item.editorialBrief);if(item.editorialLineId!==brief.themeId)throw new Error("O tema da pauta difere do direcionamento editorial.");if(item.editorialLineId&&!allowedIds.has(item.editorialLineId))throw new Error("O tema não pertence à empresa selecionada.");
     const exists=await client.query("SELECT id FROM content_calendar_items WHERE client_id=$1 AND scheduled_date=$2::date AND lower(trim(title))=lower(trim($3)) AND content_type='SOCIAL_MEDIA'",[data.clientId,item.scheduledDate,item.title]);if(exists.rows.length)continue;
     await client.query("INSERT INTO content_calendar_items(client_id,editorial_line_id,title,central_idea,scheduled_date,scheduled_time,format,status,content_type,notes,editorial_brief) VALUES($1,$2,$3,$4,$5,$6,$7,'PLANNED','SOCIAL_MEDIA',$8,$9)",[data.clientId,item.editorialLineId,item.title,item.centralIdea,item.scheduledDate,item.scheduledTime,item.format,item.notes,JSON.stringify(item.editorialBrief)]);count++;
    }return count;
   });return NextResponse.json({success:true,added});
  }
  if(!context.editorialLines.length)throw new AiGenerationError("AI_EDITORIAL_REQUIRED","Cadastre ou gere os pilares e temas antes de planejar o calendário.",422);
  if(!context.communicationProfile?.speakerTypes.length||!context.communicationProfile.contentVoices.length)throw new AiGenerationError("AI_COMMUNICATION_REQUIRED","Complete quem comunica e como aparece na Identidade & DNA antes de planejar conteúdos.",422);
  const existing=await query("SELECT title,scheduled_date,format FROM content_calendar_items WHERE client_id=$1 AND to_char(scheduled_date,'YYYY-MM')=$2",[data.clientId,data.month]);
  const result=await generateWithOpenRouter({model:strategyModel(),maxTokens:8000,messages:[{role:"system",content:'Você é planejador editorial. Produza exatamente a quantidade solicitada de pautas diferentes, distribuídas no mês, alinhadas aos pilares, público e tom do cliente. Equilibre formatos. Não invente datas comemorativas, promoções, provas, disponibilidade ou resultados. Horários são sugestões, não horários de maior desempenho medidos. Não repita pautas existentes. Use apenas IDs de temas do cliente no contexto. Retorne array JSON [{"title":"pauta concreta","centralIdea":"ângulo e orientação para criação","scheduledDate":"YYYY-MM-DD","scheduledTime":"18:00","format":"Reels","editorialLineId":"UUID do tema","notes":"orientação de produção"}]. Formatos permitidos: Post estático, Reels, Carrossel, Stories. Cada item precisa de editorialBrief:{themeId:"mesmo UUID de editorialLineId",speaker:"opção cadastrada",voice:"opção cadastrada",audience:"nome de público cadastrado",funnel:"TOP|MIDDLE|BOTTOM|AFTER_SALE",journey:"DISCOVERY|PROBLEM|CONSIDERATION|DECISION|RETENTION",goal:"objetivo",pain:"dor cadastrada ou NOT_APPLICABLE",tone:"tom",cta:"chamada"}. Compatibilidade: TOP permite DISCOVERY ou PROBLEM; MIDDLE permite PROBLEM ou CONSIDERATION; BOTTOM exige DECISION; AFTER_SALE exige RETENTION. Distribua as pautas entre etapas conforme objetivo mensal. Português brasileiro.'},{role:"user",content:clientContextPrompt(context)+"\nMês: "+data.month+". Quantidade: "+data.count+". Orientações: "+data.guidance+"\nJá programados: "+JSON.stringify(existing.rows)}]});
  const items=parseAiJson(result.text,calendarPlanSchema);if(items.length!==data.count||!validateCalendarMonth(items,data.month))throw new AiGenerationError("AI_INVALID_PERIOD","A IA não respeitou a quantidade ou o mês solicitado. Nenhum conteúdo foi salvo.");
  const ids=new Set(context.editorialLines.map(line=>String(line.id)));if(items.some(item=>item.editorialLineId&&!ids.has(item.editorialLineId)))throw new AiGenerationError("AI_INVALID_STRUCTURE","A IA retornou um tema inválido. Nenhum conteúdo foi salvo.");
  for(const item of items)resolveContentBrief(context,item.editorialBrief);
  return NextResponse.json({success:true,source:result.source,model:result.model,items,options:{speakers:context.communicationProfile?.speakerTypes||[],voices:context.communicationProfile?.contentVoices||[],audiences:[...context.audiences.map(a=>String(a.name)),...(Array.isArray(context.identity.target_audiences)?context.identity.target_audiences:[]),...(context.communicationProfile?.audienceTypes||[])],pains:[...(Array.isArray(context.identity.pain_points)?context.identity.pain_points:[]),...context.audiences.flatMap(a=>Array.isArray(a.pain_points)?a.pain_points:[])]}});
 }catch(error){const failure=aiFailure(error);return NextResponse.json(failure.body,{status:failure.status});}
}
