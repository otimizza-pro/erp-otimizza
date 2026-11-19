import {z} from "zod";
import type {AiClientContext} from "@/lib/ai/client-context";
import {AiGenerationError} from "@/lib/ai/openrouter";
export const FUNNEL_STAGES={TOP:"Topo · descoberta",MIDDLE:"Meio · consideração",BOTTOM:"Fundo · decisão",AFTER_SALE:"Pós-venda · relacionamento"} as const;
export const JOURNEY_STAGES={DISCOVERY:"Aprendizado e descoberta",PROBLEM:"Reconhecimento da necessidade",CONSIDERATION:"Consideração de soluções",DECISION:"Decisão de contratação ou compra",RETENTION:"Uso, relacionamento e fidelização"} as const;
export const contentBriefSchema=z.object({themeId:z.string().uuid(),speaker:z.string().trim().min(1).max(300),voice:z.string().trim().min(1).max(300),audience:z.string().trim().min(1).max(1500),funnel:z.enum(["TOP","MIDDLE","BOTTOM","AFTER_SALE"]),journey:z.enum(["DISCOVERY","PROBLEM","CONSIDERATION","DECISION","RETENTION"]),goal:z.string().trim().min(3).max(1000),pain:z.string().trim().min(1).max(2000),tone:z.string().trim().min(1).max(500),cta:z.string().trim().min(1).max(1000)});
export type ContentBrief=z.infer<typeof contentBriefSchema>;
export function resolveContentBrief(context:AiClientContext,raw:unknown){
 const input=contentBriefSchema.safeParse(raw);if(!input.success)throw new AiGenerationError("AI_BRIEF_REQUIRED","Complete emissor, público, tema, funil, jornada, objetivo, dor (ou não se aplica), tom e CTA antes de gerar.",422);
 const value=input.data;const theme=context.editorialLines.find(line=>line.id===value.themeId);if(!theme)throw new AiGenerationError("AI_THEME_INVALID","Selecione um tema da linha editorial desta empresa.",422);
 if(!context.communicationProfile?.speakerTypes.includes(value.speaker)||!context.communicationProfile?.contentVoices.includes(value.voice))throw new AiGenerationError("AI_SPEAKER_INVALID","Defina quem comunica e como aparece entre os perfis cadastrados na Identidade & DNA.",422);
 const audienceOptions=[...context.audiences.map(a=>String(a.name)),...(Array.isArray(context.identity.target_audiences)?context.identity.target_audiences:[]),...(context.communicationProfile.audienceTypes||[])];
 if(!audienceOptions.includes(value.audience))throw new AiGenerationError("AI_AUDIENCE_INVALID","Escolha um público cadastrado desta empresa.",422);
 const pains=[...(Array.isArray(context.identity.pain_points)?context.identity.pain_points:[]),...context.audiences.flatMap(a=>Array.isArray(a.pain_points)?a.pain_points:[])];
 if(value.pain!=="NOT_APPLICABLE"&&!pains.includes(value.pain))throw new AiGenerationError("AI_PAIN_INVALID","Escolha uma dor cadastrada ou não se aplica.",422);
 const validJourneys={TOP:["DISCOVERY","PROBLEM"],MIDDLE:["PROBLEM","CONSIDERATION"],BOTTOM:["DECISION"],AFTER_SALE:["RETENTION"]};
 if(!validJourneys[value.funnel].includes(value.journey))throw new AiGenerationError("AI_JOURNEY_INVALID","A etapa da jornada precisa corresponder ao funil de conteúdo selecionado.",422);
 return {...value,pillar:String(theme.pillar_name),theme:String(theme.theme),themeObjective:theme.objective||"",themeCustomFields:theme.custom_fields||[],audienceDetails:context.audiences.find(a=>a.name===value.audience)||null};
}
export function contentBriefPrompt(brief:ReturnType<typeof resolveContentBrief>){return "BRIEF DA PEÇA (seguir estas escolhas, sem misturar todos os públicos):\n"+JSON.stringify(brief)+"\nSe pain=NOT_APPLICABLE, use objetivo e tema sem forçar uma dor. Adapte a profundidade, o CTA e o ângulo à etapa do funil e da jornada. Não transforme uma pauta de descoberta em venda agressiva.";}
