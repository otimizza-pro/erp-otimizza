export const maxDuration=120;
import {resolveContentBrief,contentBriefPrompt} from "@/modules/clients/content-brief";
import {loadAiClientContext,assertClientContext,clientContextPrompt} from "@/lib/ai/client-context";
import { generateWithOpenRouter, contentModel, aiFailure } from "@/lib/ai/openrouter";
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  clientId:z.union([z.string().uuid(),z.literal("otimizza")]),
  editorialBrief:z.unknown(),
  format:z.enum(["HEADLINES","CAPTION","REELS","CAROUSEL","LANDING_PAGE","SIMILAR_HEADLINES"]),
  prompt:z.string().max(20000).default(""),
  centralIdea:z.string().max(5000).default(""),
  selectedHeadline:z.string().max(2000).optional(),
  favoriteHeadlines:z.array(z.string().max(2000)).max(30).optional(),
  customApiKey:z.string().max(512).optional(),
  formatConfig:z.record(z.string(),z.unknown()).optional(),
});

interface GeneratePayload {
  clientId: string;
  editorialBrief?:unknown;
  communicationChoice?:{speaker?:string;audience?:string;voice?:string};
  format: "HEADLINES" | "CAPTION" | "REELS" | "CAROUSEL" | "LANDING_PAGE" | "SIMILAR_HEADLINES";
  prompt: string;
  clientName?: string;
  centralIdea: string;
  selectedHeadline?: string;
  favoriteHeadlines?: string[];
  audience?: string;
  tone?: string;
  cta?: string;
  customApiKey?: string;
  formatConfig?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const parsed=payloadSchema.safeParse(await request.json());
    if(!parsed.success) return NextResponse.json({error:"Dados de geração inválidos.",details:parsed.error.flatten()},{status:400});
    if(JSON.stringify(parsed.data).length>50000) return NextResponse.json({error:"O pedido excede o limite de tamanho."},{status:413});
    const body: GeneratePayload = parsed.data;
    const {
      format,
      prompt,
      centralIdea,
      selectedHeadline,
      favoriteHeadlines,
      customApiKey
    } = body;

    if (!centralIdea?.trim() && !prompt?.trim() && !selectedHeadline?.trim()) {
      return NextResponse.json({ error: "Ideia central ou prompt são obrigatórios." }, { status: 400 });
    }

    const clientContext = await loadAiClientContext(body.clientId);
    assertClientContext(clientContext);
    const pieceBrief=resolveContentBrief(clientContext,body.editorialBrief);
    const clientName=String(clientContext.company.trade_name||clientContext.company.name);
    const audience=pieceBrief.audience,tone=pieceBrief.tone,cta=pieceBrief.cta;
    clientContext.currentContent={speaker:pieceBrief.speaker,audience:pieceBrief.audience,voice:pieceBrief.voice};

    // 1. Buscar contexto relevante da Base de Conhecimento Estratégica da Otimizza
    let strategicContext = "";
    try {
      let slugFilter = "05-comunicacao-e-copywriting";
      if (format === "REELS") slugFilter = "07-roteiros-e-presenca-em-camera";
      else if (format === "CAROUSEL") slugFilter = "08-design-para-redes-sociais";
      else if (format === "LANDING_PAGE") slugFilter = "12-comunicacao-do-site-e-landing-pages";

      const kbRes = await query<{ title: string; excerpt: string }>(
        `SELECT title, substring(published_content_text from 1 for 2500) as excerpt
         FROM knowledge_pages
         WHERE slug = $1 OR slug = '01-estrategia-e-direcao-da-operacao'
         ORDER BY order_index ASC LIMIT 2`,
        [slugFilter]
      );

      if (kbRes.rows.length > 0) {
        strategicContext = kbRes.rows
          .map(r => `--- DIRETRIZ OFICIAL: ${r.title} ---\n${r.excerpt}`)
          .join("\n\n");
      }
    } catch (e) {
      console.error("Falha ao carregar contexto estratégico:", e);
      return NextResponse.json({success:false,error:"A base de conhecimento está indisponível. A geração não foi executada sem esse contexto."},{status:503});
    }

    let systemInstructions = `Você é o Diretor Criativo e Redator Sênior da assessoria de marketing Otimizza.
Você cria conteúdos para a empresa identificada no contexto, usando seu público real, sua oferta e sua identidade. A Otimizza é a assessoria responsável, não necessariamente a marca anunciada.

DIRETRIZES INEGOCIÁVEIS DA OTIMIZZA:
1. Respeite o tom cadastrado e o público da peça. Use clareza e precisão, sem impor linguagem corporativa a pacientes, consumidores ou outros públicos. Nunca use jargões vazios ("revolucionário", "mergulhe", "no mundo dinâmico de hoje", "transforme de uma vez por todas").
2. Parta do tema, objetivo e etapa da jornada. Quando uma dor for selecionada, trabalhe essa dor; quando não se aplicar, não force problemas artificiais.
3. Não use travessões longos excessivos nem clichês de autoajuda corporativa.
4. Linguagem em português do Brasil impecável e natural.`;

    if (strategicContext) {
      systemInstructions += `\n\nBASE DE CONHECIMENTO DA OTIMIZZA (Use como guia de estilo e critérios):\n${strategicContext}`;
    }

    systemInstructions += "\n\n" + clientContextPrompt(clientContext)+"\n"+contentBriefPrompt(pieceBrief);
    let userPrompt = prompt;

    if (format === "SIMILAR_HEADLINES" && favoriteHeadlines && favoriteHeadlines.length > 0) {
      userPrompt = `Gere exatamente 10 NOVAS headlines de alto impacto, no mesmo estilo e ângulo das que o usuário mais gostou abaixo:

HEADLINES FAVORITAS SELECIONADAS:
${favoriteHeadlines.map((h, i) => `${i + 1}. ${h}`).join("\n")}

CLIENTE / MARCA: ${clientName || "Otimizza"}
PÚBLICO-ALVO: ${audience}
TOM: ${tone || "Direto e didático"}
IDEIA BASE: ${centralIdea}

Entregue uma lista numerada de 1 a 10 com variações que mantenham o gancho forte, curiosidade ou quebra de crença.`;
    } else if (!userPrompt || !userPrompt.trim()) {
      if (format === "REELS") {
        userPrompt = `Crie DUAS OPÇÕES DISTINTAS E COMPLETAS de roteiro para vídeo/Reels do Instagram (máximo 60 segundos cada) com base na headline e tema:

HEADLINE ESCOLHIDA: "${selectedHeadline || centralIdea}"
CLIENTE / MARCA: ${clientName || "Otimizza"}
PÚBLICO-ALVO: ${audience}
TOM DE VOZ: ${tone || "Direto e didático"}
CTA FINAL: ${cta || "Iniciar conversa no WhatsApp"}

Formate com clareza:

=== OPÇÃO 1: ÂNGULO DIRETO / CONFRONTACIONAL RESPEITOSO ===
[Duração estimada: 45s]
- Gancho (0s-5s): Fala de impacto e texto na tela
- Desenvolvimento (5s-35s): Raciocínio, exemplo concreto e quebra de crença
- Fechamento & CTA (35s-45s): Chamada para ação clara

=== OPÇÃO 2: ÂNGULO NARRATIVO / DIAGNÓSTICO DE BASTIDORES ===
[Duração estimada: 50s]
- Gancho (0s-5s): Fala de impacto e texto na tela
- Desenvolvimento (5s-40s): História ou cena cotidiana de empresa
- Fechamento & CTA (40s-50s): Chamada para ação clara`;
      } else if (format === "CAROUSEL") {
        userPrompt = `Crie DUAS OPÇÕES DISTINTAS E COMPLETAS de estrutura de carrossel para o Instagram (7 a 9 slides cada) com base na headline e tema:

HEADLINE ESCOLHIDA: "${selectedHeadline || centralIdea}"
CLIENTE / MARCA: ${clientName || "Otimizza"}
PÚBLICO-ALVO: ${audience}
TOM DE VOZ: ${tone || "Direto e didático"}
CTA FINAL: ${cta || "Salvar este post e mandar no WhatsApp"}

Formate cada opção slide a slide:
=== OPÇÃO 1: ESTRUTURA PROBLEMA -> EXPLICAÇÃO -> AÇÃO PRÁTICA ===
- Slide 1 (Capa): Título + Subtítulo curto
- Slide 2 a Slide N-1: Progressão lógica do argumento (máx 30 palavras por slide)
- Slide Final: Resumo + CTA

=== OPÇÃO 2: ESTRUTURA MITO -> DESCONSTRUÇÃO -> REGRA CLARA ===
- Slide 1 (Capa): Título provocativo + Subtítulo
- Slide 2 a Slide N-1: Desmistificação e exemplo real
- Slide Final: Conclusão + CTA`;
      } else if (format === "CAPTION" && selectedHeadline) {
        userPrompt = `Escreva uma legenda completa para o Instagram a partir da seguinte headline aprovada:

HEADLINE APROVADA: "${selectedHeadline}"
CLIENTE: ${clientName || "Otimizza"}
PÚBLICO: ${audience}
TOM: ${tone || "Direto e didático"}
CTA: ${cta || "Iniciar conversa no WhatsApp"}

Estrutura da legenda:
1. Gancho inicial reforçando a headline nos primeiros 2 segundos de leitura.
2. Desenvolvimento com 2 a 3 parágrafos curtos explicando a tese com clareza.
3. Fechamento objetivo direcionando para a ação (CTA).
4. Forneça também 1 alternativa de parágrafo de abertura.`;
      }
    }

    const generated = await generateWithOpenRouter({model:contentModel(),customApiKey,messages:[{role:"system",content:systemInstructions},{role:"user",content:userPrompt}],maxTokens:8000});
    return NextResponse.json({success:true,result:generated.text,modelUsed:generated.model,source:generated.source,contextUsed:{companyId:clientContext.companyId,sources:clientContext.sources}});
  } catch(error:unknown){const failure=aiFailure(error);return NextResponse.json(failure.body,{status:failure.status});}
}
