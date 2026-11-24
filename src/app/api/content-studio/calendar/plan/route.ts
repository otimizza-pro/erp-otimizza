export const maxDuration=120;
import {resolveContentBrief} from "@/modules/clients/content-brief";
import {NextResponse} from "next/server";
import {z} from "zod";
import {requireAdminUser} from "@/lib/auth/require-auth";
import {loadAiClientContext,assertClientContext,clientContextPrompt} from "@/lib/ai/client-context";
import {generateWithOpenRouter,strategyModel,parseAiJson,aiFailure,AiGenerationError,STRATEGY_TEMPERATURE} from "@/lib/ai/openrouter";
import {query,withTransaction} from "@/lib/db/pool";
import {calendarPlanItemSchema,calendarPlanSchema,reuseCalendarIdeas,validateCalendarMonth} from "@/modules/clients/calendar-plan";
import {brainstormDay,normalizeBrainstormText} from "@/modules/headlines/brainstorm-sources";

export async function POST(request:Request){
 try{await requireAdminUser();}catch{return NextResponse.json({success:false,error:"Acesso não autorizado"},{status:401});}
 const input=z.object({action:z.enum(["GENERATE","SAVE"]),clientId:z.string().uuid(),month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),count:z.number().int().min(1).max(31).default(12),guidance:z.string().max(4000).default(""),seasonalDates:z.array(z.object({date:z.iso.date(),name:z.string().max(300),category:z.enum(["commercial","holiday","cultural"])})).max(500).default([]),items:calendarPlanSchema.optional()}).safeParse(await request.json().catch(()=>null));
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
     const exists=await client.query("SELECT id FROM content_calendar_items WHERE client_id=$1 AND scheduled_date=$2::date AND lower(trim(title))=lower(trim($3)) AND content_type='SOCIAL_MEDIA' AND archived_at IS NULL",[data.clientId,item.scheduledDate,item.title]);if(exists.rows.length)continue;
     if(item.brainstormIdeaId){
      const idea=await client.query("SELECT id FROM content_brainstorm_ideas WHERE id=$1 AND client_id=$2 AND content_id IS NULL AND status IN ('IDEA','SAVED_FOR_LATER') FOR UPDATE",[item.brainstormIdeaId,data.clientId]);
      if(!idea.rowCount)continue;
     }
     const created=await client.query("INSERT INTO content_calendar_items(client_id,editorial_line_id,title,central_idea,scheduled_date,scheduled_time,format,status,content_type,notes,editorial_brief) VALUES($1,$2,$3,$4,$5,$6,$7,'PLANNED','SOCIAL_MEDIA',$8,$9) RETURNING id",[data.clientId,item.editorialLineId,item.title,item.centralIdea,item.scheduledDate,item.scheduledTime,item.format,item.notes,JSON.stringify(item.editorialBrief)]);
     if(item.brainstormIdeaId)await client.query("UPDATE content_brainstorm_ideas SET content_id=$2,status='SAVED_FOR_LATER',updated_at=now() WHERE id=$1",[item.brainstormIdeaId,created.rows[0].id]);
     count++;
    }return count;
   });return NextResponse.json({success:true,added});
  }
  if(!context.editorialLines.length)throw new AiGenerationError("AI_EDITORIAL_REQUIRED","Cadastre ou gere os pilares e temas antes de planejar o calendário.",422);
  if(!context.communicationProfile?.speakerTypes.length||!context.communicationProfile.contentVoices.length)throw new AiGenerationError("AI_COMMUNICATION_REQUIRED","Complete quem comunica e como aparece na Identidade & DNA antes de planejar conteúdos.",422);
  const [existing, backlog]=await Promise.all([
   query<{title:string;scheduled_date:string;format:string}>("SELECT title,scheduled_date::text,format FROM content_calendar_items WHERE client_id=$1 AND archived_at IS NULL AND to_char(scheduled_date,'YYYY-MM')=$2",[data.clientId,data.month]),
   query<Parameters<typeof reuseCalendarIdeas>[1][number]>(
    `SELECT id,title,angle,target_audience,editorial_line_id,format,goal,rationale,source_date::text
     FROM content_brainstorm_ideas WHERE client_id=$1 AND content_id IS NULL AND status IN ('IDEA','SAVED_FOR_LATER')
       AND (source_date IS NULL OR to_char(source_date,'YYYY-MM')=$2)
     ORDER BY (status='SAVED_FOR_LATER') DESC, created_at DESC LIMIT 100`,[data.clientId,data.month]),
  ]);
  const reused=reuseCalendarIdeas(context,backlog.rows,existing.rows,data.month,data.count,brainstormDay());
  const remaining=data.count-reused.length;
  const options={speakers:context.communicationProfile.speakerTypes,voices:context.communicationProfile.contentVoices,audiences:[...context.audiences.map(a=>String(a.name)),...(Array.isArray(context.identity.target_audiences)?context.identity.target_audiences:[]),...(context.communicationProfile.audienceTypes||[])],pains:[...(Array.isArray(context.identity.pain_points)?context.identity.pain_points:[]),...context.audiences.flatMap(a=>Array.isArray(a.pain_points)?a.pain_points:[])]};
  if(!remaining)return NextResponse.json({success:true,source:"BANK",items:reused,options,reusedCount:reused.length});
  try {
  const result=await generateWithOpenRouter({
    model:strategyModel(),
    temperature:STRATEGY_TEMPERATURE,
    reasoningEffort:"low", maxTokens:Math.min(48000, Math.max(6000, remaining * 2400)),
    messages:[
      {role:"system",content:'Você é planejador editorial e estrategista de conteúdo sênior. Mantenha raciocínio lógico analítico, estruturação fiel ao briefing e zero alucinação. Produza exatamente a quantidade solicitada de pautas diferentes, distribuídas no mês, alinhadas aos pilares, público e tom do cliente. Equilibre formatos. Não invente datas comemorativas, promoções, provas, disponibilidade ou resultados. Horários são sugestões, não horários de maior desempenho medidos. Não repita pautas existentes. Use apenas IDs de temas do cliente no contexto. Retorne array JSON [{"title":"pauta concreta","centralIdea":"ângulo e orientação para criação","scheduledDate":"YYYY-MM-DD","scheduledTime":"18:00","format":"Reels","editorialLineId":"UUID do tema","notes":"orientação de produção"}]. Formatos permitidos: Post estático, Reels, Carrossel, Stories. Cada item precisa de editorialBrief:{themeId:"mesmo UUID de editorialLineId",speaker:"opção cadastrada",voice:"opção cadastrada",audience:"nome de público cadastrado",funnel:"TOP|MIDDLE|BOTTOM|AFTER_SALE",journey:"DISCOVERY|PROBLEM|CONSIDERATION|DECISION|RETENTION",goal:"objetivo",pain:"dor cadastrada ou NOT_APPLICABLE",tone:"tom",cta:"chamada"}. Compatibilidade: TOP permite DISCOVERY ou PROBLEM; MIDDLE permite PROBLEM ou CONSIDERATION; BOTTOM exige DECISION; AFTER_SALE exige RETENTION. Distribua as pautas entre etapas conforme objetivo mensal. Português brasileiro.'},
      {role:"user",content:clientContextPrompt(context)+"\nMês: "+data.month+". Quantidade adicional: "+remaining+". Orientações: "+data.guidance+"\nDatas de referência selecionadas (não significam promoção ou participação confirmada): "+JSON.stringify(data.seasonalDates.filter(event=>event.date.startsWith(data.month+"-")))+"\nJá programados: "+JSON.stringify(existing.rows)+"\nPautas reaproveitadas nesta rodada: "+JSON.stringify(reused.map(({title,scheduledDate})=>({title,scheduledDate})))}
    ]
  });
  const generated=parseAiJson(result.text,z.array(calendarPlanItemSchema.omit({brainstormIdeaId:true})).min(1).max(31));
  if(generated.length!==remaining||!validateCalendarMonth(generated,data.month))throw new AiGenerationError("AI_INVALID_PERIOD","A IA não respeitou a quantidade ou o mês solicitado. Nenhum conteúdo foi salvo.");
  const titles=new Set([...existing.rows,...reused].map(item=>normalizeBrainstormText(item.title)));
  const items=[...reused,...generated.filter(item=>{const key=normalizeBrainstormText(item.title);if(titles.has(key))return false;titles.add(key);return true;})];
  const ids=new Set(context.editorialLines.map(line=>String(line.id)));if(items.some(item=>item.editorialLineId&&!ids.has(item.editorialLineId)))throw new AiGenerationError("AI_INVALID_STRUCTURE","A IA retornou um tema inválido. Nenhum conteúdo foi salvo.");
  for(const item of items)resolveContentBrief(context,item.editorialBrief);
  return NextResponse.json({success:true,source:result.source,model:result.model,items,options,reusedCount:reused.length,
    warning:items.length<data.count?"Sugestões repetidas foram removidas.":undefined});
  } catch (error) {
   if (!reused.length) throw error;
   return NextResponse.json({success:true,source:"BANK",items:reused,options,reusedCount:reused.length,warning:"A IA não completou as lacunas. As ideias do banco estão disponíveis para revisão."});
  }
 }catch(error){const failure=aiFailure(error);return NextResponse.json(failure.body,{status:failure.status});}
}
