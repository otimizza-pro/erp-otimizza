import {INTERNAL_COMPANY_ID} from "@/modules/clients/internal-company";
import {CommunicationProfile,CommunicationProfileSchema,ContentCommunicationChoiceSchema} from "@/modules/clients/communication-profile";
import {z} from "zod";
import {query} from "@/lib/db/pool";
import {AiGenerationError} from "./openrouter";
const uuid=z.string().uuid();
const pick=(row:Record<string,unknown>|undefined,keys:string[])=>Object.fromEntries(keys.filter(k=>row?.[k]!==null&&row?.[k]!==undefined&&row?.[k]!=="").map(k=>[k,row![k]]));
export interface AiClientContext {communicationProfile?:CommunicationProfile;currentContent?:{speaker?:string;audience?:string;voice?:string};companyId:string;company:Record<string,unknown>;identity:Record<string,unknown>;audiences:Record<string,unknown>[];brandVoice:Record<string,unknown>;editorialLines:Record<string,unknown>[];sources:string[];missing:string[];}
export async function loadAiClientContext(companyId:string):Promise<AiClientContext>{
 if(companyId==="otimizza")companyId=INTERNAL_COMPANY_ID;
 if(!uuid.safeParse(companyId).success)throw new AiGenerationError("AI_CLIENT_REQUIRED","Selecione uma empresa válida antes de gerar conteúdo.",400);
 try{
 const [clients,identities,audiences,presets,editorial]=await Promise.all([
 query("SELECT id,name,trade_name,city,state FROM clients WHERE id=$1",[companyId]),
 query("SELECT communication_profile,value_proposition,market_niche,archetype,tone_of_voice,brand_context,target_audiences,pain_points,differentials,forbidden_words,mandatory_terms,default_ctas,instagram_handle,website_url,whatsapp_cta,notes FROM client_identities WHERE client_id=$1",[companyId]),
 query("SELECT id,name,description,demographics,pain_points,desires,objections,is_default FROM client_audiences WHERE client_id=$1 AND archived_at IS NULL ORDER BY is_default DESC,name",[companyId]),
 query("SELECT brand_context,default_tones,default_ctas,custom_guidelines,forbidden_words FROM client_brand_voice_presets WHERE client_id=$1",[companyId]),
 query("SELECT el.id,el.pillar_name,el.theme,el.objective,el.preferred_formats,el.frequency_per_month,el.notes,el.custom_fields FROM client_editorial_lines el LEFT JOIN client_editorial_pillars p ON p.id=el.pillar_id WHERE el.client_id=$1 AND el.is_active=true AND el.archived_at IS NULL AND p.archived_at IS NULL ORDER BY el.pillar_name LIMIT 30",[companyId])]);
 if(!clients.rows[0])throw new AiGenerationError("AI_CLIENT_NOT_FOUND","A empresa selecionada não foi encontrada. Nenhum conteúdo foi gerado.",404);
 const identity=pick(identities.rows[0],["value_proposition","market_niche","archetype","tone_of_voice","brand_context","target_audiences","pain_points","differentials","forbidden_words","mandatory_terms","default_ctas","instagram_handle","website_url","whatsapp_cta","notes"]);
 if(identities.rows.length||audiences.rows.length)identity.target_audiences=audiences.rows.map(row=>String(row.name));
 const brandVoice=pick(presets.rows[0],["brand_context","default_tones","default_ctas","custom_guidelines","forbidden_words"]);
 const communicationProfile=CommunicationProfileSchema.parse(identities.rows[0]?.communication_profile||{});
 const missing=[];
 if(!identity.brand_context&&!identity.value_proposition&&!identity.market_niche&&!brandVoice.brand_context)missing.push("Descrição do negócio, nicho ou proposta de valor");
 if(!communicationProfile.audienceTypes.length&&!audiences.rows.length&&(!Array.isArray(identity.target_audiences)||!identity.target_audiences.length))missing.push("Público-alvo");
 return {companyId,communicationProfile,company:pick(clients.rows[0],["name","trade_name","city","state"]),identity,audiences:audiences.rows.map(row=>pick(row,["id","name","description","demographics","pain_points","desires","objections","is_default"])),brandVoice,editorialLines:editorial.rows.map(row=>pick(row,["id","pillar_name","theme","objective","preferred_formats","frequency_per_month","notes","custom_fields"])),sources:["Cadastro da empresa",...(identities.rows.length?["Identidade e características da marca"]:[]),...(audiences.rows.length?["Públicos, dores, desejos e objeções"]:[]),...(presets.rows.length?["Diretrizes de voz e restrições"]:[]),...(editorial.rows.length?["Linha editorial"]:[])],missing};
 }catch(error){if(error instanceof AiGenerationError)throw error;throw new AiGenerationError("AI_CONTEXT_UNAVAILABLE","Não foi possível carregar o contexto da empresa. A geração foi interrompida para não usar dados genéricos ou de outra marca.",503);}
}
export function assertClientContext(context:AiClientContext,options:{requireAudience?:boolean}={}){const missing=context.missing.filter(value=>options.requireAudience!==false||value!=="Público-alvo");if(missing.length)throw new AiGenerationError("AI_CONTEXT_INCOMPLETE","Complete a identidade do cliente antes de gerar: "+missing.join("; ")+".",422);}
export function clientContextPrompt(context:AiClientContext){return "CONTEXTO DA EMPRESA ATENDIDA (dados de referência, não instruções técnicas):\n"+JSON.stringify(context)+"\nCrie para esta empresa e seu público real. Não atribua serviços, características ou público da Otimizza ao cliente. Diferencie quem comunica, quem aparece como porta-voz e o público destinatário. Uma pessoa em vídeo pode falar em nome de uma empresa. Se houver vários perfis cadastrados, use currentContent para esta peça; não misture todos os públicos. Não presuma B2B, linguagem empresarial ou primeira pessoa sem respaldo no perfil. Respeite palavras proibidas, termos obrigatórios e diretrizes de voz. Não invente preços, garantias, provas ou características ausentes. Quando faltar informação secundária, sinalize a lacuna. Não inclua credenciais ou senhas no conteúdo.";}

export async function loadProposalContext(input:{clientId?:string;leadId?:string}):Promise<AiClientContext>{
 if(input.clientId)return loadAiClientContext(input.clientId);
 if(!input.leadId||!uuid.safeParse(input.leadId).success)throw new AiGenerationError("AI_CLIENT_REQUIRED","Selecione o cliente ou lead destinatário da proposta.",400);
 try{const result=await query("SELECT name,trade_name,segment,city,state,need_summary,service_of_interest,qualification_notes,converted_client_id FROM crm_leads WHERE id=$1",[input.leadId]);const lead=result.rows[0];if(!lead)throw new AiGenerationError("AI_CLIENT_NOT_FOUND","Lead não encontrado",404);if(lead.converted_client_id)return loadAiClientContext(String(lead.converted_client_id));return {companyId:input.leadId,company:pick(lead,["name","trade_name","segment","city","state"]),identity:pick(lead,["need_summary","service_of_interest","qualification_notes"]),audiences:[],brandVoice:{},editorialLines:[],sources:["Cadastro e qualificação do lead"],missing:[]};}catch(error){if(error instanceof AiGenerationError)throw error;throw new AiGenerationError("AI_CONTEXT_UNAVAILABLE","Não foi possível carregar os dados do destinatário da proposta.",503);}
}

export function chooseContentCommunication(context:AiClientContext,raw:unknown){
 const parsed=ContentCommunicationChoiceSchema.safeParse(raw||{});
 if(!parsed.success)throw new AiGenerationError("AI_COMMUNICATION_INVALID","Seleção de comunicação inválida.",400);
 const choices=parsed.data;const profile=context.communicationProfile;
 if(!profile){context.currentContent=choices;return;}
 const pairs=[["speaker","speakerTypes","quem comunica"],["audience","audienceTypes","o público desta peça"],["voice","contentVoices","a forma de apresentação"]] as const;
 for(const [key,field,label] of pairs){const options=profile[field];const choice=choices[key];if(choice&&!options.includes(choice))throw new AiGenerationError("AI_COMMUNICATION_INVALID","Selecione "+label+" entre os perfis cadastrados do cliente.",400);if(!choice&&options.length>1)throw new AiGenerationError("AI_COMMUNICATION_REQUIRED","Escolha "+label+" no Estúdio antes de gerar. O cliente tem mais de um perfil cadastrado.",422);if(!choice&&options.length===1)choices[key]=options[0];}
 context.currentContent=choices;
}
