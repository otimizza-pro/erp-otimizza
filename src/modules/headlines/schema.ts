import { z } from "zod";
const text = z.string().trim().max(8000).default("");
export const structures = ["Pergunta","Lista","Como fazer","Afirmação direta","Provocação","Curiosidade","Erro comum","Problema e solução","Benefício direto","Comparação","Mito e verdade","Alerta","Segredo/revelação","Estatística","Depoimento/caso real","Antes e depois","Comando","Desafio","Objeção","Oferta"];
export const angles = ["Dor","Desejo","Benefício","Oportunidade","Objeção","Transformação","Diferenciação","Conveniência","Prevenção","Custo de não agir","Identificação","Comparação"];
export const triggers = ["Curiosidade","Identificação","Autoridade","Prova social","Especificidade","Reciprocidade","Exclusividade","Novidade","Segurança","Redução de risco","Contraste","Compromisso","Pertencimento","Aversão à perda","Urgência real","Escassez real"];
export const awareness = ["Não reconhece o problema","Reconhece o problema","Conhece as soluções","Conhece o produto/serviço","Conhece a oferta e precisa decidir","Pedir recomendação"];
export const formats = ["Estático","Reels","Carrossel","Stories","Pesquisa","Landing page"];
export const briefSchema = z.object({
  audience:text,offer:text,goal:text,pain:text,desire:text,value:text,differential:text,bigIdea:text,
  awareness:z.string().max(200).default("Pedir recomendação"),funnel:z.enum(["TOP","MIDDLE","BOTTOM","AFTER_SALE"]).default("TOP"),journey:z.enum(["DISCOVERY","PROBLEM","CONSIDERATION","DECISION","RETENTION"]).default("DISCOVERY"),
  speaker:text,voice:text,themeId:z.string().uuid().or(z.literal("")).default(""),
  channel:z.string().max(100).default("Instagram"),placement:z.string().max(100).default("Feed"),format:z.enum(["Estático","Reels","Carrossel","Stories","Pesquisa","Landing page"]).default("Estático"),
  structures:z.array(z.string().max(100)).max(20).default([]),angles:z.array(z.string().max(100)).max(12).default([]),triggers:z.array(z.string().max(100)).max(16).default([]),
  tone:text,length:z.enum(["Curta","Média","Contextualizada"]).default("Curta"),maxCharacters:z.number().int().min(10).max(2000).default(120),
  creativity:z.enum(["Conservadora","Equilibrada","Exploratória"]).default("Equilibrada"),intensity:z.enum(["Sutil","Moderada","Forte"]).default("Moderada"),
  cta:text,requiredWords:text,forbiddenWords:text,temperature:text,sophistication:text,skepticism:text,mechanism:text,emotion:text,motivation:text,
  specificity:text,horizon:text,promise:text,objection:text,evidence:text,customerLanguage:text,competition:text,region:text,seasonality:text,
  conditions:text,visual:text,destination:text,hypothesis:text,context:text,
});
export type HeadlineBrief = z.infer<typeof briefSchema>;
export const blankBrief = briefSchema.parse({});
export function sameBrief(left:unknown,right:unknown){return JSON.stringify(briefSchema.parse(left))===JSON.stringify(briefSchema.parse(right));}
export function missingBrief(b:HeadlineBrief) {
  return [!b.audience&&"Público",!b.offer&&"Oferta/serviço",!b.goal&&"Objetivo",!b.pain&&!b.desire&&"Dor ou desejo",!b.bigIdea&&"Ideia central",!b.channel&&"Canal"].filter(Boolean) as string[];
}
const score=z.object({score:z.number().min(0).max(5),reason:z.string().max(500)});
const optionalList=z.preprocess(value=>value==null?[]:typeof value==='string'?(value.trim()?[value]:[]):value,z.array(z.string().max(1000)).max(10));
export const candidateSchema = z.object({headline:z.string().trim().min(1).max(2000),subheadline:z.string().trim().max(4000).default(""),structure:z.string().max(100),angle:z.string().max(100),triggers:z.array(z.string().max(100)).max(10),rationale:z.string().max(1200),evidence:optionalList,warnings:optionalList,scores:z.object({clarity:score,relevance:score,specificity:score,attention:score,congruence:score}).optional()});
export type CandidateText = z.infer<typeof candidateSchema>;
export function validateCandidates(raw:unknown,b:HeadlineBrief) {
  const values=z.array(candidateSchema).length(4).parse(raw);
  if(new Set(values.map(v=>v.headline.toLocaleLowerCase().replace(/\s+/g," "))).size!==4)throw new Error("A IA repetiu headlines na mesma resposta.");
  for(const v of values) {
    if(v.headline.length>b.maxCharacters)throw new Error("A IA ultrapassou o limite de caracteres.");
    if(["Estático","Landing page"].includes(b.format)&&!v.subheadline)throw new Error("A IA não entregou a subheadline obrigatória.");
  }
  return values;
}
export const defaults = { A:["google/gemini-3.8-flash","openai/gpt-5","google/gemma-4-26b-a4b-it:free","nvidia/nemotron-3.5-lightning:free"],B:["anthropic/claude-sonnet-5.5","meta-llama/llama-4-maverick","particle-ai/particle-1:free","nvidia/nemotron-3-ultra-550b-a55b:free"] };
export const fieldGroups = {
  "Estratégia": [["offer","Oferta / serviço"],["goal","Objetivo"],["pain","Dor principal"],["desire","Desejo principal"],["value","Proposta de valor"],["differential","Diferencial comprovado"],["bigIdea","Big Idea / pauta escolhida"],["objection","Objeção principal"]],
  "Execução": [["tone","Tom de voz"],["cta","CTA"],["requiredWords","Palavras obrigatórias"],["forbiddenWords","Palavras proibidas"],["visual","Contexto visual"],["destination","Destino / página"],["conditions","Condições confirmadas da oferta"],["evidence","Evidências: fonte, número, contexto, autorização"],["hypothesis","Hipótese de teste"]],
  "Avançados": [["temperature","Temperatura do público"],["sophistication","Sofisticação do mercado"],["skepticism","Ceticismo"],["mechanism","Mecanismo da solução"],["emotion","Emoção predominante"],["motivation","Motivação de compra"],["specificity","Detalhes concretos disponíveis"],["horizon","Horizonte temporal confirmado"],["promise","Tipo de promessa"],["customerLanguage","Expressões reais do cliente"],["competition","Alternativas / concorrência conhecida"],["region","Localização"],["seasonality","Sazonalidade"],["context","Orientações adicionais"]],
} as const;
