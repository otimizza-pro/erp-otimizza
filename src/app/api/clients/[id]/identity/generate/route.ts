export const maxDuration=120;
import {NextResponse} from "next/server";
import {z} from "zod";
import {requireAdminUser} from "@/lib/auth/require-auth";
import {loadAiClientContext,clientContextPrompt} from "@/lib/ai/client-context";
import {generateWithOpenRouter,strategyModel,parseAiJson,aiFailure,AiGenerationError,STRATEGY_TEMPERATURE} from "@/lib/ai/openrouter";
import {identityFieldPrompts,identityAiFieldSchema,identityDraftSchema} from "@/modules/clients/identity-ai";
import {query} from "@/lib/db/pool";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 try{await requireAdminUser();}catch{return NextResponse.json({success:false,error:"Acesso não autorizado"},{status:401});}
 try{
  const {id}=await params;if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:"Cliente inválido"},{status:400});
  const input=z.object({field:identityAiFieldSchema,draft:identityDraftSchema}).safeParse(await request.json());
  if(!input.success)return NextResponse.json({success:false,error:"Campo ou contexto inválido"},{status:400});
  const context=await loadAiClientContext(id);
  const briefing=await query("SELECT extracted_identity FROM client_briefing_sessions WHERE client_id=$1 AND status='COMPLETED' ORDER BY completed_at DESC LIMIT 1",[id]);
  const ext=briefing.rows[0]?.extracted_identity||{};
  const keys=["companyDescription","brandContext","marketNiche","valueProposition","targetAudience","targetAudiences","painPoints","differentials","differentialsList","toneOfVoice","competitors","contentGoals","communicationProfile"];
  const briefingData=Object.fromEntries(keys.filter(key=>ext[key]!==undefined).map(key=>[key,ext[key]]));
  const draft=input.data.draft;
  const hasBusinessContext =
    Boolean(draft.brandContext?.trim()) ||
    Boolean(draft.marketNiche?.trim()) ||
    Boolean(draft.valueProposition?.trim()) ||
    Boolean(context.identity?.brand_context) ||
    Boolean(context.identity?.market_niche) ||
    Boolean(context.identity?.value_proposition) ||
    Boolean(context.company?.name) ||
    Object.keys(briefingData).length > 0;

  if (!hasBusinessContext) throw new AiGenerationError("AI_CONTEXT_INCOMPLETE","Descreva a empresa, sua atuação ou preencha o briefing antes de pedir sugestões. Apenas o nome não é contexto suficiente.",422);
  const field=identityFieldPrompts[input.data.field];

  // Identificar itens já cadastrados para o campo solicitado
  let existingItems: string[] = [];
  const rawExisting = (draft as Record<string, unknown>)[input.data.field];
  if (Array.isArray(rawExisting)) {
    existingItems = rawExisting.map((s) => String(s).trim()).filter(Boolean);
  } else if (typeof rawExisting === "string" && rawExisting.trim()) {
    existingItems = [rawExisting.trim()];
  }

  const result=await generateWithOpenRouter({
    model:strategyModel(),
    temperature:0.7,
    maxTokens:2500,
    messages:[
      {
        role:"system",
        content:
          "Você é um estrategista sênior de posicionamento, branding e copywriting. Gere conteúdo rico, persuasivo, diversificado e altamente profissional em português brasileiro, alinhado aos dados fornecidos. " +
          "REGRA CRÍTICA DE NÃO REPETIÇÃO: É expressamente proibido repetir, duplicar ou gerar paráfrases/sinônimos óbvios de itens que já estejam cadastrados. Por exemplo: se já existe 'Atendimento Individualizado', NÃO gere 'Atendimento individualizado 1 a 1' nem 'Atendimento personalizado'. Todo conteúdo sugerido deve ser 100% INÉDITO, explorando novos ângulos, metodologias, benefícios e pontos de vista ainda não abordados. " +
          "Para campos de lista, traga opções abundantes e variadas. Para campos de texto único, apresente opções bem estruturadas e concisas. Responda estritamente em JSON no formato { \"value\": "+(field.list?"[\"string\"]":"\"string\"")+", \"missing\": [\"string\"] }. "+field.instruction
      },
      {
        role:"user",
        content:
          clientContextPrompt(context) +
          "\nBriefing finalizado: "+JSON.stringify(briefingData) +
          "\nRascunho em edição: "+JSON.stringify(draft) +
          (existingItems.length > 0
            ? "\n\n⚠️ ITENS JÁ CADASTRADOS NESTE CAMPO (PROIBIDO REPETIR OU GERAR SINÔNIMOS):\n" +
              JSON.stringify(existingItems, null, 2) +
              "\nATENÇÃO OBRIGATÓRIA: Não gere nenhum item igual ou parecido com a lista acima. Traga apenas sugestões inéditas e complementares."
            : "") +
          "\nCampo solicitado: "+input.data.field
      }
    ]
  });
  const schema=z.object({value:field.list?z.array(z.string().trim().min(1).max(2000)).min(1).max(25):z.string().trim().min(1).max(12000),missing:z.array(z.string()).default([])});
  const parsed=parseAiJson(result.text,schema);

  // Normalização e filtro rigoroso pós-geração para evitar que duplicatas ou variações quase idênticas cheguem ao usuário
  function normalizeText(str: string): string {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  if (Array.isArray(parsed.value) && existingItems.length > 0) {
    const existingNormalized = existingItems.map(normalizeText);
    const seen = new Set<string>();

    parsed.value = (parsed.value as string[]).filter((item: string) => {
      const norm = normalizeText(item);
      if (!norm || seen.has(norm)) return false;
      seen.add(norm);

      // Correspondência exata normalizada com itens já existentes
      if (existingNormalized.includes(norm)) return false;

      // Correspondência de variação (ex: "atendimentoindividualizado1a1" vs "atendimentoindividualizado")
      for (const ex of existingNormalized) {
        if (norm.length >= 8 && ex.length >= 8) {
          if (norm.startsWith(ex) || ex.startsWith(norm) || norm.includes(ex) || ex.includes(norm)) {
            return false;
          }
        }
      }
      return true;
    });
  }

  if(input.data.field==="archetype"&&!['SABIO','AMIGO','CRIADOR','HEROI','MAGO','GOVERNANTE'].includes(String(parsed.value)))throw new AiGenerationError("AI_INVALID_STRUCTURE","A IA não retornou um arquétipo válido.");
  return NextResponse.json({success:true,source:result.source,model:result.model,...parsed});
 }catch(error){const failure=aiFailure(error);return NextResponse.json(failure.body,{status:failure.status});}
}
