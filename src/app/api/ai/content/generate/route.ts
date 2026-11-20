export const maxDuration=120;
import {resolveContentBrief,contentBriefPrompt} from "@/modules/clients/content-brief";
import {loadAiClientContext,assertClientContext,clientContextPrompt} from "@/lib/ai/client-context";
import { generateWithOpenRouter, contentModel, aiFailure, CONTENT_TEMPERATURE, GLOBAL_HUMANIZATION_RULES } from "@/lib/ai/openrouter";
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
Se houver o bloco [DNA_DA_CAMPANHA] no briefing ou contexto, utilize prioritariamente esse resumo enxuto (Público-alvo, Dor Principal, Desejo Principal, Mecanismo Único, 3 Objeções e Tom de Voz) para direcionar a peça.

DIRETRIZES INEGOCIÁVEIS DA OTIMIZZA:
1. Respeite o tom cadastrado e o público da peça. Use clareza e precisão, sem impor linguagem corporativa a pacientes, consumidores ou outros públicos.
2. Parta do tema, objetivo e etapa da jornada. Quando uma dor for selecionada, trabalhe essa dor; quando não se aplicar, não force problemas artificiais.
3. Não use travessões longos excessivos nem clichês de autoajuda corporativa.
4. Linguagem em português do Brasil impecável e natural.

REGRA CRÍTICA DE CRIAÇÃO NARRATIVA (NUNCA FATIAR DE INÍCIO):
- Nunca gere roteiros de Reels ou legendas já "fatiados" em frases curtas de impacto desde a primeira linha.
- Sempre construa primeiro o FIO CONDUTOR / HISTÓRIA CORRIDA (como uma conversa real e envolvente entre duas pessoas que se entendem).
- Somente após estabelecer a narrativa completa e fluida com começo, meio e fim, faça a decupagem nos tempos de vídeo (ex: 00s–04s, 04s–15s, etc.), garantindo conexão emocional, ritmo de fala natural e autenticidade.

${GLOBAL_HUMANIZATION_RULES}`;

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

Entregue uma lista numerada de 1 a 10 com variações que mantenham o gancho forte, curiosidade ou quebra de crença. Sem clichês de IA.`;
    } else if (!userPrompt || !userPrompt.trim()) {
      if (format === "REELS") {
        userPrompt = `Crie DUAS OPÇÕES DISTINTAS E COMPLETAS de roteiro para vídeo/Reels do Instagram (máximo 60 segundos cada) com base na headline e tema:

HEADLINE ESCOLHIDA: "${selectedHeadline || centralIdea}"
CLIENTE / MARCA: ${clientName || "Otimizza"}
PÚBLICO-ALVO: ${audience}
TOM DE VOZ: ${tone || "Direto e didático"}
CTA FINAL: ${cta || "Iniciar conversa no WhatsApp"}

OBEDIÊNCIA À REGRA CRÍTICA DE ROTEIRO (ETAPAS OBRIGATÓRIAS POR OPÇÃO):
Passo 1: Escreva primeiro o [FIO CONDUTOR / HISTÓRIA CORRIDA] — o texto contínuo como uma conversa real, fluida e empática entre duas pessoas, sem cortes artificiais ou frases soltas.
Passo 2: Só depois apresente a [DECUPAGEM POR TEMPOS DO VÍDEO]:
- 00s–04s (Gancho visual/falado): quebra de padrão e retenção imediata
- 04s–15s (Conexão e Dor): diálogo direto sobre o problema real
- 15s–45s (Desenvolvimento & Mecanismo Único): explicação prática e quebra de objeção
- 45s–60s (Fechamento & CTA): chamada natural para a ação

=== OPÇÃO 1: ÂNGULO DIRETO / CONFRONTACIONAL RESPEITOSO ===

=== OPÇÃO 2: ÂNGULO NARRATIVO / DIAGNÓSTICO DE BASTIDORES ===`;
      } else if (format === "CAROUSEL") {
        userPrompt = `Crie DUAS OPÇÕES DISTINTAS E COMPLETAS de estrutura de carrossel para o Instagram (7 a 9 slides cada) com base na headline e tema:

HEADLINE ESCOLHIDA: "${selectedHeadline || centralIdea}"
CLIENTE / MARCA: ${clientName || "Otimizza"}
PÚBLICO-ALVO: ${audience}
TOM DE VOZ: ${tone || "Direto e didático"}
CTA FINAL: ${cta || "Salvar este post e mandar no WhatsApp"}

Formate cada opção slide a slide com linguagem humana e natural:
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

METODOLOGIA OBRIGATÓRIA:
1. Primeiro redija a ideia como um raciocínio contínuo e humano (história corrida de uma conversa franca), sem jargões corporativos ou fórmulas de teleprompter.
2. Em seguida estruture a legenda final:
   - Gancho inicial que dialoga com a headline (primeiras 2 linhas antes do botão "mais").
   - Desenvolvimento com 2 a 3 parágrafos bem conectados e fáceis de ler.
   - Fechamento com chamada para ação clara.
   - 1 parágrafo alternativo de abertura para testes.`;
      }
    }

    const generated = await generateWithOpenRouter({
      model: contentModel(),
      temperature: CONTENT_TEMPERATURE,
      customApiKey,
      messages: [{ role: "system", content: systemInstructions }, { role: "user", content: userPrompt }],
      maxTokens: 8000
    });
    return NextResponse.json({success:true,result:generated.text,modelUsed:generated.model,source:generated.source,contextUsed:{companyId:clientContext.companyId,sources:clientContext.sources}});
  } catch(error:unknown){const failure=aiFailure(error);return NextResponse.json(failure.body,{status:failure.status});}
}
