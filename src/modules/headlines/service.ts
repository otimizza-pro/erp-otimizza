import { query, withTransaction } from "@/lib/db/pool";
import { loadAiClientContext } from "@/lib/ai/client-context";
import { generateWithOpenRouter, AiGenerationError, contentModel, strategyModel, parseAiJson } from "@/lib/ai/openrouter";
import { z } from "zod";
import { briefSchema, defaults, missingBrief, validateCandidates, structures, angles, triggers, awareness, type HeadlineBrief } from "./schema";
import { makeHeadlinePrompt, makeRunPrompt, editorialReview, headlineRules } from "./prompt";

export function teamModels() {
 return Object.fromEntries((["A","B"] as const).map(team=>[team,defaults[team].map((fallback,index)=>({slot:index+1,model:process.env[`OPENROUTER_HEADLINE_TEAM_${team}_${index+1}_MODEL`]?.trim()||fallback}))]));
}
export async function ownedWorkspace(id:string,user:string) {
 const r=await query(
  `SELECT w.*,c.selected_headline,c.selected_subheadline,c.headline_candidate_id,c.headline_content_stale,
          c.offer_name,c.editorial_line_id,c.format AS content_format,c.format_config,c.editorial_brief,
          c.central_idea,c.target_audience_name,c.tone_of_voice,c.call_to_action,
          c.scheduled_date::text AS scheduled_date,c.scheduled_time::text AS scheduled_time,
          c.project_id,p.name AS project_name
   FROM headline_workspaces w
   JOIN content_calendar_items c ON c.id=w.content_id
   LEFT JOIN projects p ON p.id=c.project_id
   WHERE w.id=$1 AND w.user_id=$2`,
  [id,user],
 );
 if(!r.rows[0])throw new Error("Peça não encontrada neste usuário.");return r.rows[0];
}
export async function workspaceState(id:string,user:string) {
 const workspace=await ownedWorkspace(id,user);
 const [rounds,runs,candidates]=await Promise.all([
  query("SELECT id,brief,prompt,style,created_at FROM headline_rounds WHERE workspace_id=$1 ORDER BY created_at",[id]),
  query("SELECT x.* FROM headline_runs x JOIN headline_rounds r ON r.id=x.round_id WHERE r.workspace_id=$1 ORDER BY x.created_at,x.team,x.slot,x.mode",[id]),
  query("SELECT x.* FROM headline_candidates x JOIN headline_rounds r ON r.id=x.round_id WHERE r.workspace_id=$1 ORDER BY x.created_at,x.id",[id]),
 ]);
 return {workspace,rounds:rounds.rows,runs:runs.rows,candidates:candidates.rows};
}
export async function createWorkspace(clientId:string,user:string,contentId?:string) {
 return withTransaction(async db=>{
  if(!(await db.query("SELECT id FROM clients WHERE id=$1",[clientId])).rowCount)throw new Error("Cliente não encontrado.");
  let id=contentId;let initial:Record<string,unknown>={};
  if(id) {
   const c=await db.query("SELECT * FROM content_calendar_items WHERE id=$1 AND client_id=$2 FOR UPDATE",[id,clientId]);if(!c.rowCount)throw new Error("A pauta não pertence a este cliente.");
   const item=c.rows[0];const normalizedFmt=item.format==='Post estático'?'Estático':(['Reels','Carrossel','Stories','Pesquisa','Landing page'].includes(item.format)?item.format:'Estático');
   const normalizedPlacement=normalizedFmt==='Reels'?'Reels':normalizedFmt==='Stories'?'Stories':'Feed';
   const existing=await db.query("SELECT id,user_id FROM headline_workspaces WHERE content_id=$1",[id]);
   if(existing.rows[0]) {if(existing.rows[0].user_id!==user)throw new Error("Peça de outro usuário.");return existing.rows[0].id as string;}
   const clientCtx=await loadAiClientContext(clientId).catch(()=>null);
   const dna=clientCtx?.identity||{};
   const profile=(dna.commercial_profile as Record<string,string>|undefined)||{};
   const catalogMatch=item.offer_name&&item.offer_name!=="Institucional / Marca"?(clientCtx?.catalogItems||[]).find(o=>String(o.name||"").trim().toLowerCase()===String(item.offer_name).trim().toLowerCase()):undefined;
   const editorialMatch=item.editorial_line_id?(clientCtx?.editorialLines||[]).find(l=>String(l.id)===String(item.editorial_line_id)):undefined;
   const first=(val:unknown)=>Array.isArray(val)&&val.length?String(val[0]||""):typeof val==="string"?val:"";
   const defaultAudience=item.editorial_brief?.audience||item.target_audience_name||String(clientCtx?.audiences.find(a=>a.is_default)?.name||clientCtx?.audiences[0]?.name||clientCtx?.communicationProfile?.audienceTypes[0]||"");
   const matchedAudience=clientCtx?.audiences.find(a=>String(a.name)===defaultAudience);
   const defaultSpeaker=item.editorial_brief?.speaker||(clientCtx?.communicationProfile?.speakerTypes.length===1?clientCtx.communicationProfile.speakerTypes[0]:"");
   const defaultVoice=item.editorial_brief?.voice||(clientCtx?.communicationProfile?.contentVoices.length===1?clientCtx.communicationProfile.contentVoices[0]:"");
   const defaultPain=item.editorial_brief?.pain||(catalogMatch?.target_pain_points?String(catalogMatch.target_pain_points).split(/\r?\n/)[0]?.trim():"")||first(matchedAudience?.pain_points)||first(dna.pain_points)||"";
   const defaultDesire=first(matchedAudience?.desires)||"";
   const defaultObjection=first(matchedAudience?.objections)||first(dna.sales_objections)||"";
   const defaultGoal=item.editorial_brief?.goal||String(editorialMatch?.objective||profile.commercialObjective||"");
   initial=item.headline_brief||{
    ...(item.editorial_brief||{}),
    offer:item.offer_name||profile.requestedScope||'',
    themeId:item.editorial_line_id||'',
    bigIdea:item.central_idea||'',
    format:normalizedFmt,
    placement:normalizedPlacement,
    audience:defaultAudience,
    speaker:defaultSpeaker,
    voice:defaultVoice,
    pain:defaultPain,
    desire:defaultDesire,
    objection:defaultObjection,
    goal:defaultGoal,
    value:String(dna.value_proposition||""),
    differential:Array.isArray(dna.differentials)?dna.differentials.join("; "):"",
    tone:item.tone_of_voice||item.editorial_brief?.tone||first(dna.tone_of_voice)||'',
    cta:item.call_to_action||item.editorial_brief?.cta||first(dna.default_ctas)||'',
    forbiddenWords:Array.isArray(dna.forbidden_words)?dna.forbidden_words.join("; "):"",
   };
  } else id=(await db.query("INSERT INTO content_calendar_items(client_id,title,central_idea,format,status) VALUES($1,'Nova pauta de headlines','','Post estático','PLANNED') RETURNING id",[clientId])).rows[0].id;
  return (await db.query("INSERT INTO headline_workspaces(client_id,user_id,content_id,brief) VALUES($1,$2,$3,$4::jsonb) RETURNING id",[clientId,user,id,JSON.stringify(initial)])).rows[0].id as string;
 });
}
export async function saveBrief(id:string,user:string,raw:unknown,revision:number) {
 const b=briefSchema.parse(raw);const w=await ownedWorkspace(id,user);
 const context=await loadAiClientContext(w.client_id);
 const allowed=[...context.audiences.map(a=>String(a.name)),...(context.communicationProfile?.audienceTypes||[])];
 if(b.audience&&!allowed.includes(b.audience))throw new Error("Selecione um público cadastrado deste cliente.");
 if(b.themeId&&!context.editorialLines.some(t=>t.id===b.themeId))throw new Error("Tema de outro cliente.");
 await withTransaction(async db=>{
  await db.query("SELECT id FROM content_calendar_items WHERE id=$1 FOR UPDATE", [w.content_id]);
  const updated=await db.query("UPDATE headline_workspaces SET brief=$3::jsonb,revision=revision+1,updated_at=NOW() WHERE id=$1 AND user_id=$2 AND revision=$4 RETURNING revision",[id,user,JSON.stringify(b),revision]);
  if(!updated.rowCount)throw new Error("Esta peça mudou em outra tela. Recarregue antes de salvar.");
  const editorial=b.themeId&&b.speaker&&b.voice&&b.audience&&b.goal&&b.tone&&b.cta?{themeId:b.themeId,speaker:b.speaker,voice:b.voice,audience:b.audience,funnel:b.funnel,journey:b.journey,goal:b.goal,pain:b.pain||"NOT_APPLICABLE",tone:b.tone,cta:b.cta}:null;
  await db.query(`UPDATE content_calendar_items SET central_idea=$2,title=CASE WHEN project_id IS NULL AND selected_headline IS NULL THEN COALESCE(NULLIF($2,''),title) ELSE title END,
   format=$3,tone_of_voice=$4,call_to_action=$5,target_audience_name=$6,headline_brief=$7::jsonb,editorial_brief=$8::jsonb,
   offer_name=COALESCE(NULLIF($9,''),offer_name),editorial_line_id=COALESCE(NULLIF($10,'')::uuid,editorial_line_id),
   headline_content_stale=CASE WHEN headline_brief IS DISTINCT FROM $7::jsonb AND (selected_caption IS NOT NULL OR selected_reels IS NOT NULL OR selected_carousel IS NOT NULL) THEN true ELSE headline_content_stale END,updated_at=NOW() WHERE id=$1`,
   [w.content_id,b.bigIdea,b.format==="Estático"?"Post estático":b.format,b.tone,b.cta,b.audience,JSON.stringify(b),editorial?JSON.stringify(editorial):null,b.offer||"",b.themeId||""]);
 });
 return workspaceState(id,user);
}
export async function styleContext(clientId:string,user:string,format:string) {
 const [profile,examples,performance]=await Promise.all([
  query("SELECT guidance,version FROM headline_style_profiles WHERE client_id=$1 AND user_id=$2 AND format=$3",[clientId,user,format]),
  query(`SELECT c.headline,c.subheadline,c.rating,c.reason,c.source FROM headline_candidates c JOIN headline_rounds r ON r.id=c.round_id JOIN headline_workspaces w ON w.id=r.workspace_id
    WHERE w.client_id=$1 AND w.user_id=$2 AND r.brief->>'format'=$3 AND c.rating<>0 ORDER BY c.created_at DESC LIMIT 40`,[clientId,user,format]),
  query(`SELECT c.headline,c.subheadline,sum(m.impressions)::int AS impressions,sum(m.clicks)::int AS clicks,sum(m.leads)::int AS leads FROM headline_measurements m JOIN headline_candidates c ON c.id=m.candidate_id JOIN headline_rounds r ON r.id=c.round_id JOIN headline_workspaces w ON w.id=r.workspace_id WHERE w.client_id=$1 AND w.user_id=$2 AND r.brief->>'format'=$3 GROUP BY c.id ORDER BY sum(m.impressions) DESC LIMIT 10`,[clientId,user,format])
 ]);
 return {guidance:profile.rows[0]?.guidance||"",version:profile.rows[0]?.version||0,initial:examples.rows.filter(x=>x.rating===1).length<3,positive:examples.rows.filter(x=>x.rating===1).slice(0,12),negative:examples.rows.filter(x=>x.rating===-1).slice(0,12),performanceObservations:performance.rows,performanceCaution:"Observações de peças completas, não prova causal da headline. Não copiar números como promessas. Use apenas para novas hipóteses."};
}
export async function createRound(id:string,user:string,revision:number) {
 const w=await ownedWorkspace(id,user);if(w.revision!==revision)throw new Error("Salve ou recarregue o briefing antes de gerar.");
 const b=briefSchema.parse(w.brief);const missing=missingBrief(b);if(missing.length)throw new Error("Complete: "+missing.join(", "));
 const count=await query("SELECT count(*)::int AS n FROM headline_rounds r JOIN headline_workspaces w ON w.id=r.workspace_id WHERE w.user_id=$1 AND r.created_at>NOW()-INTERVAL '1 day'",[user]);
 if(count.rows[0].n>=30)throw new Error("Limite diário de 30 rodadas atingido. Revise as rodadas existentes.");
 const context=await loadAiClientContext(w.client_id),style=await styleContext(w.client_id,user,b.format);
 const prompt=makeHeadlinePrompt(b,context);
 return withTransaction(async db=>{
  await db.query("SELECT id FROM headline_workspaces WHERE id=$1 FOR UPDATE",[id]);
  const fresh=await db.query("SELECT revision FROM headline_workspaces WHERE id=$1",[id]);if(fresh.rows[0].revision!==revision)throw new Error("Briefing alterado durante a preparação. Tente novamente.");
  const r=(await db.query("INSERT INTO headline_rounds(workspace_id,brief,prompt,context,style) VALUES($1,$2::jsonb,$3,$4::jsonb,$5::jsonb) RETURNING id",[id,JSON.stringify(b),prompt,JSON.stringify(context),JSON.stringify(style)])).rows[0];
  for(const model of teamModels().A)for(const mode of ["PROMPT","STYLE"])await db.query("INSERT INTO headline_runs(round_id,team,slot,mode,requested_model) VALUES($1,'A',$2,$3,$4)",[r.id,model.slot,mode,model.model]);
  return r.id as string;
 });
}
async function ownedRound(id:string,user:string) {
 const r=await query("SELECT r.*,w.client_id,w.user_id,w.content_id FROM headline_rounds r JOIN headline_workspaces w ON w.id=r.workspace_id WHERE r.id=$1 AND w.user_id=$2",[id,user]);
 if(!r.rows[0])throw new Error("Rodada não encontrada.");return r.rows[0];
}
export async function addBatch(roundId:string,user:string,team:"A"|"B",regenerate:boolean) {
 const round=await ownedRound(roundId,user);
 const currentStyle=await styleContext(round.client_id,user,briefSchema.parse(round.brief).format);
 return withTransaction(async db=>{
  await db.query("SELECT id FROM headline_rounds WHERE id=$1 FOR UPDATE",[roundId]);
  const existing=await db.query("SELECT * FROM headline_runs WHERE round_id=$1 AND team=$2 ORDER BY attempt DESC",[roundId,team]);
  if(existing.rows.some(x=>x.status==="PENDING"||x.status==="RUNNING"))return;
  if(!regenerate&&existing.rowCount)return;
  const rejected=await db.query("SELECT headline,subheadline,reason FROM headline_candidates WHERE round_id=$1 AND rating=-1 ORDER BY created_at DESC LIMIT 40",[roundId]);
  const attempt=(existing.rows[0]?.attempt||0)+1;if(attempt>10)throw new Error("Limite de 10 tentativas por time nesta rodada.");
  for(const model of teamModels()[team])for(const mode of ["PROMPT","STYLE"])await db.query("INSERT INTO headline_runs(round_id,team,slot,mode,attempt,requested_model,rejection_snapshot,style_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)",[roundId,team,model.slot,mode,attempt,model.model,JSON.stringify(rejected.rows),JSON.stringify(currentStyle)]);
 });
}
export async function executeRun(id:string,user:string) {
 const result=await query(`SELECT x.*,r.prompt,r.brief,r.style FROM headline_runs x JOIN headline_rounds r ON r.id=x.round_id JOIN headline_workspaces w ON w.id=r.workspace_id WHERE x.id=$1 AND w.user_id=$2`,[id,user]);
 const run=result.rows[0];if(!run)throw new Error("Execução não encontrada.");
 const claim=await query("UPDATE headline_runs SET status='RUNNING',started_at=NOW(),error=NULL WHERE id=$1 AND status='PENDING' RETURNING id",[id]);
 if(!claim.rowCount)return;
 const start=Date.now();let usage:unknown=null;let actual:string|null=null;
 try {
  const generated=await generateWithOpenRouter({model:run.requested_model,maxTokens:30000,reasoningEffort:"low",disableThinking:run.requested_model.startsWith('nvidia/nemotron-3.5-lightning'),temperature:run.brief.creativity==="Conservadora"?0.3:run.brief.creativity==="Exploratória"?0.9:0.65,timeoutMs:80000,messages:[{role:"system",content:headlineRules},{role:"user",content:makeRunPrompt(run.prompt,run.mode,run.style_snapshot||run.style,run.rejection_snapshot)}]});
  usage=generated.usage;actual=generated.model;
  const candidates=validateCandidates(JSON.parse(generated.text.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"").trim()),briefSchema.parse(run.brief));
  await withTransaction(async db=>{
   for(const value of candidates) {
    const reviewed=editorialReview(value,briefSchema.parse(run.brief));
    await db.query("INSERT INTO headline_candidates(round_id,run_id,headline,subheadline,metadata) VALUES($1,$2,$3,$4,$5::jsonb)",[run.round_id,id,value.headline,value.subheadline,JSON.stringify(reviewed)]);
   }
   await db.query("UPDATE headline_runs SET status='SUCCESS',actual_model=$2,usage=$3::jsonb,duration_ms=$4,finished_at=NOW() WHERE id=$1",[id,actual,JSON.stringify(usage),Date.now()-start]);
  });
 }catch(error) {
  if(error instanceof AiGenerationError){usage=error.usage||usage;actual=error.actualModel||actual;}
  await query("UPDATE headline_runs SET status='ERROR',actual_model=$2,usage=$3::jsonb,duration_ms=$4,error=$5,finished_at=NOW() WHERE id=$1",[id,actual,JSON.stringify(usage),Date.now()-start,error instanceof z.ZodError?"A IA não respeitou a estrutura solicitada. Tente novamente esta execução.":error instanceof SyntaxError?"A IA não entregou JSON válido. Tente novamente esta execução.":error instanceof Error?error.message:"Falha na geração"]);
 }
}
export async function retryRun(id:string,user:string) {
 const r=await query("SELECT x.* FROM headline_runs x JOIN headline_rounds r ON r.id=x.round_id JOIN headline_workspaces w ON w.id=r.workspace_id WHERE x.id=$1 AND w.user_id=$2",[id,user]);
 const old=r.rows[0];if(!old)throw new Error("Execução não encontrada.");
 if(old.status==="RUNNING"&&new Date(old.started_at).getTime()>Date.now()-180000)throw new Error("Esta execução ainda está em andamento.");
 if(!["ERROR","RUNNING"].includes(old.status))throw new Error("Repita apenas uma execução que falhou ou foi interrompida.");
 return withTransaction(async db=>{
  await db.query("SELECT id FROM headline_rounds WHERE id=$1 FOR UPDATE",[old.round_id]);
  const latest=(await db.query("SELECT * FROM headline_runs WHERE round_id=$1 AND team=$2 AND slot=$3 AND mode=$4 ORDER BY attempt DESC LIMIT 1",[old.round_id,old.team,old.slot,old.mode])).rows[0];
  if(latest.id!==old.id)throw new Error("Já existe uma tentativa mais recente nesta posição.");
  if(latest.attempt>=15)throw new Error("Limite de tentativas nesta posição atingido.");
  if(old.status==='RUNNING')await db.query("UPDATE headline_runs SET status='ERROR',error='Execução interrompida ou expirada',finished_at=NOW() WHERE id=$1",[id]);
  return (await db.query("INSERT INTO headline_runs(round_id,team,slot,mode,attempt,requested_model,rejection_snapshot,style_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb) RETURNING id",[old.round_id,old.team,old.slot,old.mode,latest.attempt+1,old.requested_model,JSON.stringify(old.rejection_snapshot),JSON.stringify(old.style_snapshot||null)])).rows[0].id as string;
 });
}
export async function feedback(id:string,user:string,rating:number,reason:string) {
 await withTransaction(async db=>{
  const r=await db.query("SELECT c.* FROM headline_candidates c JOIN headline_rounds r ON r.id=c.round_id JOIN headline_workspaces w ON w.id=r.workspace_id WHERE c.id=$1 AND w.user_id=$2 FOR UPDATE OF c",[id,user]);
  if(!r.rows[0])throw new Error("Headline não encontrada.");
  await db.query("UPDATE headline_candidates SET rating=$2,reason=$3,presented_at=COALESCE(presented_at,NOW()) WHERE id=$1",[id,rating,reason]);
  await db.query("INSERT INTO headline_events(candidate_id,user_id,action,data) VALUES($1,$2,'RATING',$3::jsonb)",[id,user,JSON.stringify({previous:r.rows[0].rating,rating,reason})]);
 });
}
export async function presentCandidates(ids:string[],user:string) {
 await query(`UPDATE headline_candidates c SET presented_at=COALESCE(presented_at,NOW()) FROM headline_rounds r,headline_workspaces w WHERE c.round_id=r.id AND r.workspace_id=w.id AND w.user_id=$2 AND c.id=ANY($1::uuid[])`,[ids,user]);
}
export async function selectCandidate(id:string,user:string) {
 return withTransaction(async db=>{
  const r=await db.query("SELECT c.*,w.content_id,r.brief FROM headline_candidates c JOIN headline_rounds r ON r.id=c.round_id JOIN headline_workspaces w ON w.id=r.workspace_id WHERE c.id=$1 AND w.user_id=$2",[id,user]);
  const c=r.rows[0];if(!c)throw new Error("Headline não encontrada.");
  const b=briefSchema.parse(c.brief);
  const editorial=b.themeId&&b.speaker&&b.voice&&b.audience&&b.goal&&b.tone&&b.cta?{themeId:b.themeId,speaker:b.speaker,voice:b.voice,audience:b.audience,funnel:b.funnel,journey:b.journey,goal:b.goal,pain:b.pain||"NOT_APPLICABLE",tone:b.tone,cta:b.cta}:null;
  const before=await db.query("SELECT headline_candidate_id FROM content_calendar_items WHERE id=$1 FOR UPDATE",[c.content_id]);
  await db.query(`UPDATE content_calendar_items SET selected_headline=$2::text,selected_subheadline=$3,headline_candidate_id=$4,title=CASE WHEN project_id IS NULL THEN $2::text ELSE title END,headline_brief=$5::jsonb,
    format=$6,central_idea=$7,tone_of_voice=$8,call_to_action=$9,target_audience_name=$10,editorial_brief=$11::jsonb,
    headline_content_stale=CASE WHEN headline_candidate_id IS DISTINCT FROM $4::uuid AND (selected_caption IS NOT NULL OR selected_reels IS NOT NULL OR selected_carousel IS NOT NULL) THEN true ELSE headline_content_stale END,updated_at=NOW() WHERE id=$1`,[c.content_id,c.headline,c.subheadline,c.id,JSON.stringify(c.brief),b.format==="Estático"?"Post estático":b.format,b.bigIdea,b.tone,b.cta,b.audience,editorial?JSON.stringify(editorial):null]);
    
  await db.query("INSERT INTO headline_events(candidate_id,user_id,action,data) VALUES($1,$2,'SELECT',$3::jsonb)",[id,user,JSON.stringify({previous:before.rows[0].headline_candidate_id})]);
  return c.content_id as string;
 });
}
export async function createHuman(roundId:string,user:string,headline:string,subheadline:string,inspiredBy:string[]) {
 const round=await ownedRound(roundId,user);if(["Estático","Landing page"].includes(round.brief.format)&&!subheadline.trim())throw new Error("Preencha também a subheadline.");
 return withTransaction(async db=>{
  if(inspiredBy.length) {
   const valid=await db.query("SELECT id FROM headline_candidates WHERE round_id=$1 AND id=ANY($2::uuid[])",[roundId,inspiredBy]);if(valid.rowCount!==new Set(inspiredBy).size)throw new Error("Inspirações de outra rodada.");
  }
  const c=(await db.query("INSERT INTO headline_candidates(round_id,headline,subheadline,source,rating,inspired_by,metadata) VALUES($1,$2,$3,'HUMAN',1,$4::uuid[],$5::jsonb) RETURNING id",[roundId,headline,subheadline,inspiredBy,JSON.stringify({rationale:"Criação/adaptação do usuário. Nenhum modelo recebe vitória automática."})])).rows[0];
  await db.query("INSERT INTO headline_events(candidate_id,user_id,action,data) VALUES($1,$2,'CREATE_HUMAN',$3::jsonb)",[c.id,user,JSON.stringify({inspiredBy})]);return c.id as string;
 });
}
export async function brainstorm(id:string,user:string,direction:string) {
 const w=await ownedWorkspace(id,user),context=await loadAiClientContext(w.client_id);
 const recent=await query("SELECT title,central_idea FROM content_calendar_items WHERE client_id=$1 AND archived_at IS NULL ORDER BY created_at DESC LIMIT 25",[w.client_id]);
 const schema=z.array(z.object({idea:z.string().min(1).max(1500),audience:z.string().max(1500),pain:z.string().max(1000),desire:z.string().max(1000),goal:z.string().max(1000),angle:z.string().max(200),format:z.string().max(100),rationale:z.string().max(1000),repetition:z.string().max(1000)})).length(5);
 const generated=await generateWithOpenRouter({model:strategyModel(),maxTokens:13500,messages:[{role:"system",content:"Sugira exatamente 5 pautas distintas, sem inventar fatos, evidências ou resultados. Use públicos cadastrados. Sinalize repetição. Retorne SOMENTE array JSON de objetos {idea,audience,pain,desire,goal,angle,format,rationale,repetition}."},{role:"user",content:JSON.stringify({context,brief:w.brief,direction,recent:recent.rows})}]});
 const ideas=parseAiJson(generated.text,schema);
 await query("UPDATE headline_workspaces SET brainstorm=$3::jsonb,updated_at=NOW() WHERE id=$1 AND user_id=$2",[id,user,JSON.stringify([...(w.brainstorm||[]),{ideas,model:generated.model,createdAt:new Date().toISOString()}])]);return ideas;
}
export async function saveStyle(clientId:string,user:string,format:string,guidance:string) {
 await query(`INSERT INTO headline_style_profiles(client_id,user_id,format,guidance) VALUES($1,$2,$3,$4) ON CONFLICT(client_id,user_id,format) DO UPDATE SET guidance=EXCLUDED.guidance,version=headline_style_profiles.version+1,updated_at=NOW()`,[clientId,user,format,guidance]);
}
export async function summarizeStyle(clientId:string,user:string,format:string) {
 const style=await styleContext(clientId,user,format);
 if(!style.positive.length&&!style.negative.length)throw new Error("Avalie ou escreva headlines para iniciar o aprendizado.");
 const generated=await generateWithOpenRouter({model:contentModel(),maxTokens:4800,messages:[{role:"system",content:"Resuma preferências editoriais observadas neste cliente e formato, com base nos exemplos e motivos. Não transforme ausência de avaliação em rejeição, não generalize uma rejeição a todo assunto. Preserve orientação explícita do usuário. Não invente fatos. Apenas um resumo breve editável em português."},{role:"user",content:JSON.stringify(style)}]});
 // Suggestion only: user reviews before replacing their own guidance.
 return generated.text;
}
export async function recommendBrief(id:string,user:string) {
 const w=await ownedWorkspace(id,user),context=await loadAiClientContext(w.client_id);
 const schema=z.object({structures:z.array(z.enum(structures as [string,...string[]])).min(1).max(4),angles:z.array(z.enum(angles as [string,...string[]])).min(1).max(3),triggers:z.array(z.enum(triggers as [string,...string[]])).max(3),awareness:z.enum(awareness as [string,...string[]]),rationale:z.string().max(1200)});
 const generated=await generateWithOpenRouter({model:strategyModel(),maxTokens:6000,messages:[{role:"system",content:"Recomende parâmetros editoriais pelo briefing. Não invente fatos sobre o público. Consciência é hipótese editável, não fato confirmado. Se faltar informação, use Pedir recomendação e explique. Sem evidência real não sugira prova social, escassez, urgência, estatística ou depoimento. Retorne SOMENTE JSON {structures:string[],angles:string[],triggers:string[],awareness:string,rationale:string}."},{role:"user",content:JSON.stringify({brief:w.brief,context,options:{structures,angles,triggers,awareness}})}]});
 return parseAiJson(generated.text,schema);
}
export async function createExperiment(user:string,raw:unknown) {
 const schema=z.object({workspaceId:z.string().uuid(),a:z.string().uuid(),b:z.string().uuid(),hypothesis:z.string().trim().min(3).max(2000),variable:z.string().trim().min(3).max(500),controls:z.string().trim().min(3).max(2000),metric:z.string().trim().min(2).max(100)});
 const v=schema.parse(raw);await ownedWorkspace(v.workspaceId,user);if(v.a===v.b)throw new Error("Selecione duas opções diferentes.");
 const match=await query("SELECT c.id FROM headline_candidates c JOIN headline_rounds r ON r.id=c.round_id WHERE r.workspace_id=$1 AND c.id=ANY($2::uuid[])",[v.workspaceId,[v.a,v.b]]);if(match.rowCount!==2)throw new Error("As duas opções precisam pertencer à mesma peça.");
 await query("INSERT INTO headline_experiments(workspace_id,candidate_a,candidate_b,hypothesis,variable,controls,metric) VALUES($1,$2,$3,$4,$5,$6,$7)",[v.workspaceId,v.a,v.b,v.hypothesis,v.variable,v.controls,v.metric]);
}
export async function finishExperiment(user:string,id:string,status:string,conclusion:string) {
 const r=await query("UPDATE headline_experiments e SET status=$3,conclusion=$4 FROM headline_workspaces w WHERE e.workspace_id=w.id AND e.id=$1 AND w.user_id=$2 RETURNING e.id",[id,user,status,conclusion]);if(!r.rowCount)throw new Error("Experimento não encontrado.");
}
export async function measurements(candidateId:string,user:string,raw:unknown) {
 const schema=z.object({from:z.iso.date(),to:z.iso.date(),impressions:z.number().int().nonnegative(),clicks:z.number().int().nonnegative(),leads:z.number().int().nonnegative(),sales:z.number().int().nonnegative(),spend:z.number().nonnegative().max(1e9),source:z.string().trim().min(3).max(1000)});
 const v=schema.parse(raw);if(v.from>v.to||v.clicks>v.impressions)throw new Error("Período ou contagem inválidos.");
 await withTransaction(async db=>{
  const row=(await db.query("SELECT w.content_id FROM headline_candidates c JOIN headline_rounds r ON r.id=c.round_id JOIN headline_workspaces w ON w.id=r.workspace_id WHERE c.id=$1 AND w.user_id=$2",[candidateId,user])).rows[0];if(!row)throw new Error("Headline não encontrada.");
  await db.query("SELECT id FROM content_calendar_items WHERE id=$1 FOR UPDATE",[row.content_id]);
  const overlap=await db.query("SELECT id FROM headline_measurements WHERE content_id=$1 AND daterange(date_from,date_to,'[]') && daterange($2::date,$3::date,'[]')",[row.content_id,v.from,v.to]);if(overlap.rowCount)throw new Error("Já há métricas deste conteúdo nesse período. Evite contagem duplicada.");
  await db.query("INSERT INTO headline_measurements(candidate_id,content_id,date_from,date_to,impressions,clicks,leads,sales,spend,source) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",[candidateId,row.content_id,v.from,v.to,v.impressions,v.clicks,v.leads,v.sales,v.spend,v.source]);
 });
}
export async function analytics(user:string,clientId?:string,from?:string,to?:string,format?:string) {
 if(from&&to&&from>to)throw new Error("Período inválido.");
 const scope=[user,clientId||null,from||null,to||null,format||null];
 const filter="w.user_id=$1 AND ($2::uuid IS NULL OR w.client_id=$2) AND ($3::date IS NULL OR r.created_at >= $3::date) AND ($4::date IS NULL OR r.created_at < $4::date+INTERVAL '1 day') AND ($5::text IS NULL OR r.brief->>'format'=$5)";
 const [runs,candidates,events,performance,library,experiments]=await Promise.all([
  query(`SELECT x.* FROM headline_runs x JOIN headline_rounds r ON r.id=x.round_id JOIN headline_workspaces w ON w.id=r.workspace_id WHERE ${filter}`,scope),
  query(`SELECT c.*,w.client_id,w.content_id,i.headline_candidate_id FROM headline_candidates c JOIN headline_rounds r ON r.id=c.round_id JOIN headline_workspaces w ON w.id=r.workspace_id JOIN content_calendar_items i ON i.id=w.content_id WHERE ${filter}`,scope),
  query(`SELECT e.* FROM headline_events e JOIN headline_candidates c ON c.id=e.candidate_id JOIN headline_rounds r ON r.id=c.round_id JOIN headline_workspaces w ON w.id=r.workspace_id WHERE ${filter}`,scope),
  query(`SELECT m.*,c.headline,c.source AS author_source,x.actual_model,x.requested_model,x.team,x.mode FROM headline_measurements m JOIN headline_candidates c ON c.id=m.candidate_id JOIN headline_rounds r ON r.id=c.round_id JOIN headline_workspaces w ON w.id=r.workspace_id LEFT JOIN headline_runs x ON x.id=c.run_id WHERE w.user_id=$1 AND ($2::uuid IS NULL OR w.client_id=$2) AND ($3::date IS NULL OR m.date_from >= $3::date) AND ($4::date IS NULL OR m.date_to <= $4::date) AND ($5::text IS NULL OR r.brief->>'format'=$5)`,scope),
  query(`SELECT c.id,c.headline,c.subheadline,c.rating,c.reason,c.source,w.client_id,r.brief->>'format' AS format FROM headline_candidates c JOIN headline_rounds r ON r.id=c.round_id JOIN headline_workspaces w ON w.id=r.workspace_id WHERE ${filter} AND c.rating<>0 ORDER BY c.created_at DESC LIMIT 200`,scope),
  query(`SELECT e.*,a.headline AS headline_a,b.headline AS headline_b FROM headline_experiments e JOIN headline_workspaces w ON w.id=e.workspace_id JOIN headline_candidates a ON a.id=e.candidate_a JOIN headline_candidates b ON b.id=e.candidate_b JOIN headline_rounds r ON r.id=a.round_id WHERE ${filter} ORDER BY e.created_at DESC LIMIT 100`,scope)
 ]);
 const groups=new Map<string,Record<string,unknown>>();
 for(const run of runs.rows) {
  const key=[run.actual_model||run.requested_model,run.team,run.mode].join("|");
  if(!groups.has(key))groups.set(key,{model:run.actual_model||run.requested_model,team:run.team,mode:run.mode,runs:0,errors:0,generated:0,presented:0,liked:0,disliked:0,neutral:0,winners:0,cost:0,unknownCost:0,totalMs:0});
  const g=groups.get(key)!;g.runs=Number(g.runs)+1;g.errors=Number(g.errors)+(run.status==="ERROR"?1:0);g.totalMs=Number(g.totalMs)+(run.duration_ms||0);
  if(run.usage?.cost!=null)g.cost=Number(g.cost)+Number(run.usage.cost);else g.unknownCost=Number(g.unknownCost)+1;
  const options=candidates.rows.filter(c=>c.run_id===run.id);g.generated=Number(g.generated)+options.length;
  for(const c of options){g.presented=Number(g.presented)+(c.presented_at?1:0);g.liked=Number(g.liked)+(c.rating===1?1:0);g.disliked=Number(g.disliked)+(c.rating===-1?1:0);g.neutral=Number(g.neutral)+(c.rating===0?1:0);g.winners=Number(g.winners)+(c.id===c.headline_candidate_id?1:0);}
 }
 return {groups:[...groups.values()],humanWinners:candidates.rows.filter(c=>c.source==="HUMAN"&&c.id===c.headline_candidate_id).length,events:events.rows.length,performance:performance.rows,library:library.rows,experiments:experiments.rows,selectedOptions:candidates.rows.filter(c=>c.id===c.headline_candidate_id||events.rows.some(e=>e.candidate_id===c.id&&e.action==='SELECT')).map(c=>({id:c.id,headline:c.headline}))};
}
