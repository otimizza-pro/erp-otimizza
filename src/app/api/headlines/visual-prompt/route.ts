import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { loadAiClientContext } from "@/lib/ai/client-context";
import { generateWithOpenRouter, strategyModel, GLOBAL_HUMANIZATION_RULES } from "@/lib/ai/openrouter";
import { query } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  clientId: z.string().uuid(),
  contentId: z.string().uuid().optional(),
  headline: z.string().min(1).max(2000),
  subheadline: z.string().max(2000).optional(),
  format: z.string().min(1).max(100),
  textContent: z.string().max(20000).optional(),
  draftOnly: z.boolean().optional(),
  visualType: z.enum(["REELS_COVER", "CAROUSEL_CARDS", "FEED_IMAGE", "AD_CREATIVE"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = inputSchema.parse(body);

    const context = await loadAiClientContext(data.clientId);
    let textContent = data.textContent;
    if (data.contentId) {
      const { rows: [post] } = await query(
        `SELECT selected_reels, selected_carousel, selected_caption
         FROM content_calendar_items WHERE id = $1 AND client_id = $2 AND archived_at IS NULL`,
        [data.contentId, context.companyId],
      );
      if (!post) return NextResponse.json({ error: "Peça indisponível para este cliente." }, { status: 404 });
      const format = data.format.toLowerCase();
      textContent ||= (format.includes("reel") ? post.selected_reels :
        /carrossel|carousel/.test(format) ? post.selected_carousel : post.selected_caption) || undefined;
    }

    // Determina o tipo visual adequado
    let visualType = data.visualType;
    if (!visualType) {
      const f = data.format.toLowerCase();
      if (f.includes("reels") || f.includes("vídeo") || f.includes("video")) {
        visualType = "REELS_COVER";
      } else if (f.includes("carrossel") || f.includes("carousel")) {
        visualType = "CAROUSEL_CARDS";
      } else if (f.includes("anúncio") || f.includes("ads")) {
        visualType = "AD_CREATIVE";
      } else {
        visualType = "FEED_IMAGE";
      }
    }

    const typeInstructions = {
      REELS_COVER: `
TIPO: CAPA DE REELS / VÍDEO (Formato 9:16 vertical)
- Foco absoluto na área segura central (1:1 / 1080x1080) onde o feed do Instagram exibe a capa.
- Sujeito com expressão facial marcante e autêntica (olhar nos olhos do espectador, atitude de especialista confiável ou momento de reflexão profunda).
- Iluminação cinematográfica contrastada (rim light, luz suave de preenchimento, fundo com profundidade de campo desfocado / bokeh).
- Espaço limpo e sem poluição para sobreposição de texto em tipografia bold de alto impacto.
- Evite rostos artificiais com dentes perfeitos demais ou pessoas genéricas de banco de imagens gratuitas.`,

      CAROUSEL_CARDS: `
TIPO: CARDS DE CARROSSEL VISUAL (Formato 4:5 vertical)
- Direção de arte para os slides principais:
  1. Card de Capa: Fundo sólido ou textura minimalista, alto contraste, elemento de gancho visual (ícone gráfico ou foto conceitual limpa).
  2. Cards de Conteúdo: Diagramação arejada, espaço para listas e micro-diagramas, hierarquia visual impecável.
  3. Card de Fechamento / CTA: Conclusão clara com direcionamento para ação e elementos gráficos da marca.
- Paleta de cores alinhada à sofisticação da marca e tipografia legível mesmo em telas menores.`,

      FEED_IMAGE: `
TIPO: ARTE DE POST ESTÁTICO (Formato 4:5 vertical / 1080x1350)
- Composição equilibrada com a regra dos terços.
- Fotografia realista de altíssima qualidade ou design editorial moderno.
- Cores marcantes mas não saturadas artificialmente.
- Elemento central que interrompe a rolagem do feed instantaneamente.`,

      AD_CREATIVE: `
TIPO: CRIATIVO VISUAL DE ALTA CONVERSÃO (Meta Ads / Google)
- Gancho visual imediato: elemento surpresa ou quebra de expectativa nos primeiros milissegundos.
- Demonstração visual do contraste entre "Antes do Problema" vs "Depois da Solução".
- Contraste elevado para destacar no feed entre conteúdos orgânicos.
- Foco em clareza da proposta de valor.`,
    };

    const systemPrompt = `Você é um Diretor de Arte e Especialista em Criação de Prompts Visuais para ferramentas de IA (Midjourney v6, DALL-E 3, Recraft, Leonardo, Flux) e para briefs de designers gráficos.

Sua tarefa é gerar um PROMPT DETALHADO em inglês e português, pronto para ser copiado e colado na ferramenta de geração de imagem ou enviado para um designer.

${GLOBAL_HUMANIZATION_RULES}

${typeInstructions[visualType]}

ESTRUTURA DA RESPOSTA:
Retorne um objeto JSON com:
- promptEnglish: Prompt profissional completo em inglês, com descritores de iluminação, lentes (ex: 85mm f/1.4), estilo, textura, color grading e proporção de tela (--ar 9:16 ou --ar 4:5).
- promptPortuguese: O mesmo prompt em português brasileiro para fácil compreensão da equipe.
- coverTextSuggestion: Sugestão de texto curto (máximo 5 a 7 palavras) para colocar graficamente na imagem/capa.
- artDirectionNotes: 2 a 3 diretrizes rápidas de diagramação, cores e posicionamento para o designer ou editor.
- recommendedAspect: "9:16" (se Reels) ou "4:5" (se Feed/Carrossel/Anúncio).`;

    const userPrompt = `
DADOS DO CLIENTE E DO CONTEÚDO:
Empresa: ${context.company.name}
Nicho: ${context.identity.market_niche || "Não informado"}
Proposta de Valor: ${context.identity.value_proposition || "Não informado"}
Arquétipo: ${context.identity.archetype || "Sábio / Especialista"}
Tom de Voz: ${Array.isArray(context.identity.tone_of_voice) ? context.identity.tone_of_voice.join(", ") : "Profissional"}

PEÇA EM CRIAÇÃO:
Formato: ${data.format}
Tipo Visual Alvo: ${visualType}
Headline Escolhida: "${data.headline}"
Subheadline: "${data.subheadline || ""}"
Texto / Resumo do Conteúdo: "${textContent ? textContent.slice(0, 1500) : "Sem texto completo"}"

Gere o prompt visual ultra detalhado agora em JSON.`;

    const result = await generateWithOpenRouter({
      model: strategyModel(),
      temperature: 0.7,
      maxTokens: 2000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    let parsed;
    try {
      const cleanJson = result.text.replace(/```json\n?|\n?```/g, "").trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      parsed = {
        promptEnglish: `Professional editorial photograph for ${context.company.name}, high end aesthetic, 85mm portrait lens, dramatic studio lighting, minimalist background, 8k resolution, authentic atmosphere --ar ${visualType === "REELS_COVER" ? "9:16" : "4:5"}`,
        promptPortuguese: `Fotografia editorial profissional para ${context.company.name}, estética premium, iluminação de estúdio dramática, fundo minimalista.`,
        coverTextSuggestion: data.headline,
        artDirectionNotes: "Mantenha a tipografia contrastante e a área central desobstruída.",
        recommendedAspect: visualType === "REELS_COVER" ? "9:16" : "4:5",
      };
    }

    if (data.contentId && !data.draftOnly) {
      const saved = await query(
        `UPDATE content_calendar_items 
         SET visual_prompt = $1, visual_format = $2, updated_at = NOW() 
         WHERE id = $3 AND client_id = $4 AND archived_at IS NULL`,
        [parsed.promptEnglish, visualType, data.contentId, context.companyId]
      );
      if (!saved.rowCount) return NextResponse.json({ error: "A peça mudou antes de salvar o visual." }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      visualType,
      ...parsed,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Erro ao gerar prompt visual:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao gerar prompt visual." },
      { status: 500 }
    );
  }
}
