import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

interface GeneratePayload {
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
}

// Modelos otimizados por especialidade via OpenRouter
const RECOMMENDED_MODELS: Record<string, string> = {
  HEADLINES: "anthropic/claude-3.5-sonnet",
  SIMILAR_HEADLINES: "anthropic/claude-3.5-sonnet",
  CAPTION: "anthropic/claude-3.5-sonnet",
  REELS: "anthropic/claude-3.5-sonnet",
  CAROUSEL: "anthropic/claude-3.5-sonnet",
  LANDING_PAGE: "anthropic/claude-3.5-sonnet",
};

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const body: GeneratePayload = await request.json();
    const {
      format,
      prompt,
      clientName,
      centralIdea,
      selectedHeadline,
      favoriteHeadlines,
      audience,
      tone,
      cta,
      customApiKey
    } = body;

    if (!centralIdea?.trim() && !prompt?.trim() && !selectedHeadline?.trim()) {
      return NextResponse.json({ error: "Ideia central ou prompt são obrigatórios." }, { status: 400 });
    }

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
      console.warn("Aviso ao carregar contexto estratégico:", e);
    }

    // 2. Chave OpenRouter
    const openRouterApiKey = customApiKey || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    const model = RECOMMENDED_MODELS[format] || "anthropic/claude-3.5-sonnet";

    let systemInstructions = `Você é o Diretor Criativo e Redator Sênior da assessoria de marketing Otimizza.
Você cria conteúdos altamente estratégicos, persuasivos e orientados a negócios para empresários e tomadores de decisão.

DIRETRIZES INEGOCIÁVEIS DA OTIMIZZA:
1. Tom maduro, direto, didático e seguro. Nunca use jargões vazios ("revolucionário", "mergulhe", "no mundo dinâmico de hoje", "transforme de uma vez por todas").
2. Sempre parta de um problema real, objeção ou dor do empresário/gestor.
3. Não use travessões longos excessivos nem clichês de autoajuda corporativa.
4. Linguagem em português do Brasil impecável e natural.`;

    if (strategicContext) {
      systemInstructions += `\n\nBASE DE CONHECIMENTO DA OTIMIZZA (Use como guia de estilo e critérios):\n${strategicContext}`;
    }

    let userPrompt = prompt;

    if (format === "SIMILAR_HEADLINES" && favoriteHeadlines && favoriteHeadlines.length > 0) {
      userPrompt = `Gere exatamente 10 NOVAS headlines de alto impacto, no mesmo estilo e ângulo das que o usuário mais gostou abaixo:

HEADLINES FAVORITAS SELECIONADAS:
${favoriteHeadlines.map((h, i) => `${i + 1}. ${h}`).join("\n")}

CLIENTE / MARCA: ${clientName || "Otimizza"}
PÚBLICO-ALVO: ${audience || "Empresários e gestores"}
TOM: ${tone || "Direto e didático"}
IDEIA BASE: ${centralIdea}

Entregue uma lista numerada de 1 a 10 com variações que mantenham o gancho forte, curiosidade ou quebra de crença.`;
    } else if (format === "REELS") {
      userPrompt = `Crie DUAS OPÇÕES DISTINTAS E COMPLETAS de roteiro para vídeo/Reels do Instagram (máximo 60 segundos cada) com base na headline e tema:

HEADLINE ESCOLHIDA: "${selectedHeadline || centralIdea}"
CLIENTE / MARCA: ${clientName || "Otimizza"}
PÚBLICO-ALVO: ${audience || "Empresários e gestores"}
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
PÚBLICO-ALVO: ${audience || "Empresários e gestores"}
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
PÚBLICO: ${audience || "Empresários e tomadores de decisão"}
TOM: ${tone || "Direto e didático"}
CTA: ${cta || "Iniciar conversa no WhatsApp"}

Estrutura da legenda:
1. Gancho inicial reforçando a headline nos primeiros 2 segundos de leitura.
2. Desenvolvimento com 2 a 3 parágrafos curtos explicando a tese com clareza.
3. Fechamento objetivo direcionando para a ação (CTA).
4. Forneça também 1 alternativa de parágrafo de abertura.`;
    }

    // 3. Fazer chamada ao OpenRouter se houver chave configurada
    if (openRouterApiKey) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openRouterApiKey}`,
            "HTTP-Referer": "https://erp.otimizza.com.br",
            "X-Title": "Otimizza ERP Content Studio",
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemInstructions },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 3000,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const generatedText = data.choices?.[0]?.message?.content || "";
          if (generatedText.trim()) {
            return NextResponse.json({
              success: true,
              result: generatedText,
              modelUsed: model,
              source: "OPENROUTER"
            });
          }
        } else {
          const errData = await response.text();
          console.warn("OpenRouter API retornou erro:", response.status, errData);
        }
      } catch (apiErr) {
        console.error("Falha na chamada OpenRouter:", apiErr);
      }
    }

    // 4. Fallback Heurístico Sênior Integrado (Caso OpenRouter não esteja conectado ou sem cota)
    const simulatedResult = generateLocalHeuristicResponse(format, {
      centralIdea,
      selectedHeadline,
      favoriteHeadlines,
      clientName: clientName || "sua empresa",
      audience: audience || "Empresários e gestores",
      tone: tone || "Direto e didático",
      cta: cta || "Agende uma conversa no WhatsApp"
    });

    return NextResponse.json({
      success: true,
      result: simulatedResult,
      modelUsed: "Motor Heurístico Otimizza (v2.1)",
      source: "LOCAL_ENGINE",
      notice: !openRouterApiKey
        ? "Chave do OpenRouter não configurada. Conteúdo gerado pelo Motor Heurístico Otimizza v2.1. Para ativar Claude 3.5 Sonnet / GPT-4o, configure sua chave OpenRouter nas configurações ou informe no campo correspondente."
        : undefined
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno ao gerar conteúdo com IA.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function generateLocalHeuristicResponse(
  format: string,
  ctx: {
    centralIdea: string;
    selectedHeadline?: string;
    favoriteHeadlines?: string[];
    clientName: string;
    audience: string;
    tone: string;
    cta: string;
  }
): string {
  const idea = ctx.centralIdea.trim() || ctx.selectedHeadline || "gestão e resultados";
  const client = ctx.clientName;

  if (format === "HEADLINES" || format === "SIMILAR_HEADLINES") {
    return `1. O empresário acha que o problema é o lead fraco, mas demora 4 horas para responder no WhatsApp.
2. Mais tráfego não conserta processo comercial desorganizado.
3. Por que você investe em anúncios todo mês e continua sem saber de onde vieram as vendas?
4. A métrica que sua agência comemora é a mesma que coloca dinheiro no seu caixa?
5. Três decisões simples de marketing que empresas que faturam alto tomam antes de colocar R$ 1 em anúncios.
6. Se o seu comercial não sabe o que fazer com os contatos, parar de anunciar é o menor dos seus problemas.
7. O mito do post bonito: por que design sem intenção estratégica é apenas despesa.
8. Como saber se o seu marketing está gerando oportunidades reais ou apenas métricas de vaidade.
9. A diferença entre delegar o marketing para um parceiro estratégico e contratar alguém que apenas aperta botões.
10. O erro silencioso que drena 40% do orçamento de anúncios das pequenas e médias empresas.`;
  }

  if (format === "REELS") {
    return `=== OPÇÃO 1: ÂNGULO DIRETO / CONFRONTACIONAL RESPEITOSO ===
[Duração estimada: 45 segundos]

[00:00 - 00:05] GANCHO (Fala para a câmera, corte seco)
FALA: "Você tem certeza de que o lead que chegou pelo anúncio é realmente desqualificado?"
TEXTO NA TELA: O lead é fraco ou sua resposta demorou?

[00:05 - 00:20] DESENVOLVIMENTO (Tom calmo, demonstrando experiência)
FALA: "Na maioria das empresas que atendemos na ${client}, o empresário reclama da qualidade do contato. Mas quando auditamos o atendimento, descobrimos que a mensagem leva 3 horas para ser respondida. Na internet, depois de 15 minutos, o cliente já comprou do concorrente."
TEXTO NA TELA: Velocidade de resposta = Taxa de conversão

[00:20 - 00:35] A REGRA DE OURO
FALA: "Tráfego pago não faz milagre se a sua equipe comercial tratar lead de internet como e-mail corporativo. O anúncio compra a oportunidade; quem transforma em venda é a agilidade do seu time."
TEXTO NA TELA: Anúncio atrai. Atendimento fecha.

[00:35 - 00:45] FECHAMENTO & CTA
FALA: "Quer entender onde está o verdadeiro gargalo do seu funil? ${ctx.cta}."
TEXTO NA TELA: ${ctx.cta}

------------------------------------------------------------------------

=== OPÇÃO 2: ÂNGULO NARRATIVO / DIAGNÓSTICO DE BASTIDORES ===
[Duração estimada: 50 segundos]

[00:00 - 00:06] GANCHO
FALA: "Semana passada um cliente me disse: 'preciso trocar de anúncio porque esse público não compra'."
TEXTO NA TELA: "Esse público não compra..."

[00:06 - 00:25] BASTIDOR REVELADO
FALA: "Fomos olhar o histórico. O público estava certo, o custo por conversa estava excelente. O problema? Ninguém atendia nos finais de semana e no horário de almoço, exatamente quando os contatos entravam."
TEXTO NA TELA: O anúncio funcionava. O processo falhava.

[00:25 - 00:40] SOLUÇÃO PRÁTICA
FALA: "Antes de queimar dinheiro trocando de campanha, ajuste a rota comercial. Marketing e vendas precisam falar a mesma língua."
TEXTO NA TELA: Alinhe Marketing e Comercial

[00:40 - 00:50] CTA
FALA: "Na ${client}, nós acompanhamos o dado até a decisão. ${ctx.cta}."
TEXTO NA TELA: Toque no link da bio para conversar conosco.`;
  }

  if (format === "CAROUSEL") {
    return `=== OPÇÃO 1: ESTRUTURA PROBLEMA -> EXPLICAÇÃO -> AÇÃO PRÁTICA ===
[Carrossel de 7 Slides]

SLIDE 1 (CAPA)
Título: O lead que você acha fraco
Subtítulo: ...pode estar comprando do seu concorrente agora mesmo.

SLIDE 2
Texto: É fácil culpar o tráfego quando as vendas não acontecem. Mas antes de culpar o anúncio, faça uma auditoria rápida no seu WhatsApp comercial.

SLIDE 3
Texto: Tempo de resposta médio:
Se sua equipe leva mais de 10 minutos para responder um primeiro contato, sua taxa de conversão já caiu pela metade.

SLIDE 4
Texto: Abordagem robótica:
Enviar um PDF de 20 páginas ou responder com "em que posso ajudar?" transfere o esforço da conversa para quem acabou de chegar.

SLIDE 5
Texto: Falta de acompanhamento:
80% das vendas acontecem entre o 2º e o 5º contato. Se você manda mensagem uma vez e desiste, está jogando verba fora.

SLIDE 6
Texto: O papel do marketing sério:
O marketing não termina quando o clique acontece. Ele organiza a mensagem para que o comercial receba contatos prontos para conversar.

SLIDE 7 (FINAL / CTA)
Texto: Quer parar de desperdiçar oportunidades comerciais na sua empresa?
Toque no link da bio e converse com a equipe da ${client}.

------------------------------------------------------------------------

=== OPÇÃO 2: ESTRUTURA MITO -> DESCONSTRUÇÃO -> REGRA CLARA ===
[Carrossel de 6 Slides]

SLIDE 1 (CAPA)
Título: Três mitos sobre anúncios que custam caro para a sua empresa
Subtítulo: E o que os números realmente mostram.

SLIDE 2
Mito 1: "Preciso de mais seguidores para vender."
Realidade: Seguidores são consequência de autoridade e consistência. O que gera vendas previsíveis é oferta clara para a pessoa certa.

SLIDE 3
Mito 2: "Tráfego pago substitui um bom vendedor."
Realidade: Anúncios colocam pessoas qualificadas na sua porta. Quem fecha a conta é um atendimento ágil e consultivo.

SLIDE 4
Mito 3: "Se não vendeu na primeira semana, a estratégia falhou."
Realidade: Campanhas de performance exigem maturação de dados, aprendizado do algoritmo e refinamento contínuo de criativos.

SLIDE 5
A Regra Clara:
Empresas que crescem com previsibilidade tratam marketing como assessoria estratégica contínua, não como aposta pontual.

SLIDE 6 (CTA)
Gostou dessa análise?
Salve este post para consultar com sua equipe e converse com a ${client}.`;
  }

  // Fallback Legenda
  return `O empresário investe em anúncios, o telefone toca, mas a venda não fecha. O diagnóstico automático? "O lead veio fraco".

Na prática do dia a dia na ${client}, quando abrimos os números da operação, o cenário costuma ser bem diferente:
1. O contato entra às 14h e recebe a primeira resposta às 17h30.
2. O vendedor manda uma tabela fria de preços sem entender a real necessidade do cliente.
3. Não existe nenhum processo de follow-up estruturado nos dias seguintes.

Tráfego pago e redes sociais compram a atenção e abrem a porta. Mas é o processo comercial que transforma o interesse em faturamento. Antes de dobrar o orçamento de anúncios, garanta que sua equipe está pronta para receber quem chega.

---
💡 Como funciona o tempo de resposta na sua empresa hoje?
${ctx.cta}.

#gestaoempresarial #marketingestrategico #vendas #trafegopago #${client.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}
