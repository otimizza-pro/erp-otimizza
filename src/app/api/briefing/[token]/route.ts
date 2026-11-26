import { NextRequest, NextResponse } from "next/server";
import { syncBriefingIdentity } from "@/modules/clients/briefing-identity";
import { query, withTransaction } from "@/lib/db/pool";
import { encryptPassword } from "@/modules/passwords/crypto";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { generateWithOpenRouter, strategyModel, parseAiJson } from "@/lib/ai/openrouter";
import { formatContactFirstName } from "@/modules/clients/contact-name";
import { getClientDnaContext } from "@/modules/clients/dna-briefing-sync";
import { getCatalogItemsByClientId, syncCatalogItems } from "@/modules/clients/catalog-service";
import { NotificationService } from "@/modules/notifications/service";

const messageSchema = z.object({
  action: z.enum([
    "MESSAGE",
    "DONT_KNOW",
    "DECISION",
    "SUBMIT_CREDENTIALS",
    "SKIP_CREDENTIALS",
    "PAUSE",
    "SAVE_STEP",
    "AI_SUGGEST",
    "FINALIZE",
  ]),
  step: z.number().min(0).max(10).optional(),
  extractedIdentity: z.record(z.string(), z.unknown()).optional(),
  aiStepField: z.enum(["targetAudience", "differentials", "toneOfVoice", "competitors"]).optional(),
  message: z.string().max(6000).optional(),
  decision: z.enum(["APPROVE", "ADJUST", "RETRY"]).optional(),
  suggestedField: z.enum(["targetAudience", "differentials", "toneOfVoice", "competitors"]).optional(),
  suggestedValue: z.string().max(6000).optional(),
  credentials: z.object({ username: z.string().max(500), password: z.string().max(2000) }).nullish(),
});

export const dynamic = "force-dynamic";

interface ChatMessage {
  id: string;
  sender: "assistant" | "user";
  text: string;
  timestamp: string;
  options?: Array<{
    label: string;
    value: string;
    action?: "APPROVE" | "DONT_KNOW" | "ADJUST" | "RETRY" | "EXPLAIN" | "NEXT";
    payload?: unknown;
  }>;
  suggestedData?: {
    field: string;
    value: string;
  };
  isCredentialStep?: boolean;
  slider?: {
    id: string;
    field: string;
    title: string;
    leftLabel: string;
    rightLabel: string;
    defaultValue: number;
  };
  multiSelect?: {
    id: string;
    field: string;
    title: string;
    options: string[];
  };
}

const edivaniaAiSchema = z.object({
  replyText: z.string().min(1),
  extractedUpdates: z.object({
    targetAudience: z.string().optional(),
    differentials: z.string().optional(),
    toneOfVoice: z.union([z.string(), z.array(z.string())]).optional(),
    competitors: z.string().optional(),
  }).default({}),
  currentTopic: z.enum(["targetAudience", "differentials", "toneOfVoice", "competitors", "credentials", "completed"]).default("targetAudience"),
  isCredentialStep: z.boolean().default(false),
  options: z.array(z.object({
    label: z.string(),
    value: z.string(),
    action: z.enum(["APPROVE", "DONT_KNOW", "ADJUST", "RETRY", "EXPLAIN", "NEXT"]).optional(),
    payload: z.unknown().optional(),
  })).optional(),
  suggestedData: z.object({
    field: z.string(),
    value: z.string(),
  }).optional(),
  slider: z.object({
    id: z.string(),
    field: z.string(),
    title: z.string(),
    leftLabel: z.string(),
    rightLabel: z.string(),
    defaultValue: z.number().default(50),
  }).optional(),
  multiSelect: z.object({
    id: z.string(),
    field: z.string(),
    title: z.string(),
    options: z.array(z.string()),
  }).optional(),
});

function stripAsterisks(text: string): string {
  if (!text) return "";
  return text.replace(/\*\*/g, "").replace(/\*/g, "");
}

async function callEdivaniaAi({
  company,
  contact,
  notes,
  category,
  servicesOffered,
  history,
  extracted,
  userMessage,
  isDontKnow = false,
}: {
  company: string;
  contact: string;
  notes: string;
  category: string;
  servicesOffered: string;
  history: ChatMessage[];
  extracted: Record<string, unknown>;
  userMessage: string;
  isDontKnow?: boolean;
}): Promise<z.infer<typeof edivaniaAiSchema>> {
  const currentStep = getCurrentStepFromHistory(extracted);

  const formattedHistory = history.slice(-12).map((m) => {
    const role = m.sender === "user" ? contact : "Edivânia";
    return `${role}: ${stripAsterisks(m.text)}`;
  }).join("\n");

  const systemPrompt = `Você é a Edivânia, estrategista de comunicação e posicionamento da Otimizza Growth.
Você está conduzindo uma conversa de onboarding amigável, acolhedora, tranquila e muito humana com ${contact}, da empresa ${company}.

INFORMAÇÕES REAIS DO CLIENTE:
- Categoria / Nicho de Atuação: ${category || "Não informado"}
- O que ele vende / Serviços principais: ${servicesOffered || "Não informado"}
- Notas e Contexto Estratégico Prévio: ${notes || "Nenhum detalhe adicional informado"}
- Mapeamento atual: ${JSON.stringify(extracted)}
- Pilar em foco agora: ${currentStep}

DIRETRIZES DA PERSONALIDADE DA EDIVÂNIA:
- NUNCA chame a pessoa pelo nome da empresa (ex: NUNCA diga "Que maravilha, ${company}!" ou "Olá, ${company}"). Chame SEMPRE pelo primeiro nome da pessoa (${contact}).
- ZERO jargões técnicos de marketing! NUNCA use termos como "ICP", "Persona", "Arquétipo", "Ganchos de retenção", "Linha editorial", etc.
- Converse como uma pessoa amigável tomando um café com ${contact}. Seja empática, atenciosa e estimulante.
- EXEMPLOS DO NICHO OBRIGATÓRIOS: Utilize SEMPRE a categoria da empresa (${category}) e o que ela vende (${servicesOffered}) para formular as perguntas com situações do cotidiano deles!
- NUNCA confunda comentários e observações sobre públicos (ex: "eu só disse um público, mas tem mais", "temos outros públicos", "atendemos outros perfis") com diferenciais da marca! Diferenciais são os métodos exclusivos, atendimento de excelência, pontualidade e segurança da empresa.
- NUNCA salve mensagens como "eu só disse um público, mas tem mais", "não sei", "vamos lá" ou comentários do chat em differentials ou targetAudience!
- Se a empresa já possui públicos informados ou registrados no DNA, valide-os com a pessoa com simpatia (ex: "Vi que vocês atendem pessoas buscando [Públicos]. Você confirma esses perfis? Tem mais algum outro público que também procura vocês?").
- Se o usuário confirmar os públicos já cadastrados, valide com entusiasmo ("Perfeito!") e avance para os diferenciais da marca sem duplicar ou re-perguntar.
- Sobre tom de voz: pergunte de forma humana: "No dia a dia com seus clientes, como você prefere conversar nas redes sociais? De um jeito mais didático e explicativo, tirando dúvidas passo a passo, ou de um jeito mais leve, acolhedor e descontraído?".
- Ofereça entre 4 e 6 opções práticas e claras em "options", adaptadas para o nicho real do cliente.
- Ao tratar de tom de voz ou estilo, você pode incluir um campo "slider" para o cliente escolher o equilíbrio entre duas pontas (ex: Técnico <-> Acolhedor).
- Se o usuário disser que tem mais públicos ou quiser complementar (ex: "eu só disse um público, mas tem mais"), acolha com carinho: "Com certeza, me conta sobre os outros públicos também!".
- Faça APENAS UMA pergunta por vez para não cansar o cliente.
- Quando todos os 4 pilares estiverem cobertos com dados consistentes, parabenize a pessoa, resuma de forma calorosa e apresente a etapa de credenciais do Instagram (marcando isCredentialStep: true).

REGRA RIGOROSA DE FORMATAÇÃO (INVIOLÁVEL):
- NUNCA USE ASTERISCOS DUPLOS (**) EM NENHUM LUGAR DO TEXTO.
- Não use ** para títulos, perguntas ou nomes.
- Use texto puro com boa pontuação, quebras de linha e emojis moderados e simpáticos (1 a 2 por mensagem).

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "replyText": "Texto caloroso, amigável e conversacional da Edivânia (SEM ASTERISCOS **)",
  "extractedUpdates": {
    "targetAudience": "resumo cumulativo dos públicos identificados até agora",
    "differentials": "resumo cumulativo dos diferenciais identificados",
    "toneOfVoice": ["diretrizes do tom de voz se identificadas"],
    "competitors": "concorrentes ou referências identificados"
  },
  "currentTopic": "targetAudience" | "differentials" | "toneOfVoice" | "competitors" | "credentials" | "completed",
  "isCredentialStep": boolean,
  "options": [
    { "label": "Texto do botão rápido (sem **)", "value": "Texto do valor" }
  ],
  "suggestedData": { "field": "campo", "value": "sugestão caso seja o momento de sugerir" },
  "slider": { "id": "tom_equilibrio", "field": "toneOfVoice", "title": "Equilíbrio de tom", "leftLabel": "Didático & Técnico", "rightLabel": "Acolhedor & Próximo", "defaultValue": 50 }
}`;

  try {
    const aiRes = await generateWithOpenRouter({
      model: strategyModel(),
      temperature: 0.65,
      maxTokens: 1400,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Histórico recente da conversa:\n${formattedHistory}\n\nÚltima mensagem do usuário (${contact}): "${userMessage}"\n${isDontKnow ? "[Atenção: O usuário solicitou sugestões práticas ou exemplos para este ponto]" : ""}`,
        },
      ],
    });

    const parsed = parseAiJson(aiRes.text, edivaniaAiSchema);
    parsed.replyText = stripAsterisks(parsed.replyText);
    if (parsed.options) {
      parsed.options = parsed.options.map((opt) => ({
        ...opt,
        label: stripAsterisks(opt.label),
        value: stripAsterisks(opt.value),
      }));
    }
    if (parsed.suggestedData) {
      parsed.suggestedData.value = stripAsterisks(parsed.suggestedData.value);
    }
    return parsed;
  } catch (err) {
    console.warn("Edivânia AI fallback acionado:", err instanceof Error ? err.message : err);
    return getConversationalFallback(userMessage, currentStep, company, contact, category, servicesOffered, isDontKnow);
  }
}

function getConversationalFallback(
  userMessage: string,
  currentStep: string,
  company: string,
  contact: string,
  category: string,
  servicesOffered: string,
  isDontKnow: boolean
): z.infer<typeof edivaniaAiSchema> {
  const msgLower = userMessage.toLowerCase();

  if (msgLower.includes("tem mais") || msgLower.includes("outro público") || msgLower.includes("mais de um") || msgLower.includes("só disse um")) {
    return {
      replyText: `Perfeito, ${contact}! Te entendo perfeitamente. Pode me contar quais são os outros públicos que você atende, assim anotamos todos aqui no perfil da ${company}.`,
      extractedUpdates: {},
      currentTopic: "targetAudience",
      isCredentialStep: false,
      options: [
        { label: "🙋‍♂️ Deixa eu digitar os outros", value: "Vou complementar" },
      ],
    };
  }

  if (isDontKnow) {
    const suggestion = getSmartSuggestionForStep(currentStep, company, category, servicesOffered);
    return {
      replyText: `Sem problemas, ${contact}! Preparei uma sugestão inicial (Exemplo genérico) pensada no dia a dia da ${company} com ${category || "seus clientes"}:\n\n"${suggestion.text}"\n\nEssa linha combina com a sua realidade ou você gostaria de ajustar?`,
      extractedUpdates: {},
      currentTopic: currentStep as "targetAudience" | "differentials" | "toneOfVoice" | "competitors",
      isCredentialStep: false,
      suggestedData: {
        field: suggestion.field,
        value: suggestion.text,
      },
      options: [
        { label: "👍 Combina com a gente!", value: "APPROVE", action: "APPROVE" },
        { label: "✏️ Quero ajustar", value: "CUSTOM", action: "ADJUST" },
        { label: "🔄 Ver outra opção", value: "RETRY", action: "RETRY" },
      ],
    };
  }

  if (currentStep === "targetAudience") {
    return {
      replyText: `Excelente, anotei os detalhes sobre quem vocês atendem na ${company}!\n\nAgora me conta: o que faz as pessoas escolherem a ${company} e confiarem no seu trabalho? Pode ser o atendimento acolhedor, a pontualidade, a metodologia ou a qualidade do que você entrega.`,
      extractedUpdates: { targetAudience: userMessage },
      currentTopic: "differentials",
      isCredentialStep: false,
      options: [
        { label: "Atendimento próximo e dedicado", value: "Atendimento próximo e dedicado" },
        { label: "Pontualidade e cumprimento de prazos", value: "Pontualidade e cumprimento de prazos" },
        { label: "Metodologia comprovada e sem enrolação", value: "Metodologia comprovada e sem enrolação" },
        { label: "💡 Me dê sugestões pro meu nicho", value: "DONT_KNOW_DIFF", action: "DONT_KNOW" },
      ],
    };
  }

  if (currentStep === "differentials") {
    return {
      replyText: `Muito bom! Esse diferencial mostra muita credibilidade.\n\nE sobre o jeito de conversar nas redes sociais: como você gosta que a ${company} soe para quem acompanha você? Mais didático e explicativo, ou mais leve, acolhedor e próximo?`,
      extractedUpdates: { differentials: userMessage },
      currentTopic: "toneOfVoice",
      isCredentialStep: false,
      options: [
        { label: "Didático e Explicativo", value: "Didático, claro e explicativo" },
        { label: "Acolhedor e Próximo", value: "Acolhedor, humano e empático" },
        { label: "Elegante e Sofisticado", value: "Elegante, exclusivo e cuidadoso" },
        { label: "Descontraído e Leve", value: "Descontraído, direto e bem-humorado" },
      ],
      slider: {
        id: "slider_tom",
        field: "toneOfVoice",
        title: "Equilíbrio do seu jeito de falar",
        leftLabel: "Didático & Clínico",
        rightLabel: "Acolhedor & Próximo",
        defaultValue: 50,
      },
    };
  }

  if (currentStep === "toneOfVoice") {
    return {
      replyText: `Estilo de comunicação registrado! Isso ajuda a manter todas as postagens com a sua personalidade.\n\nVocê tem marcas ou perfis no Instagram que admira ou acompanha para inspiração? Se lembrar de algum @ ou nome, pode me mandar!`,
      extractedUpdates: { toneOfVoice: [userMessage] },
      currentTopic: "competitors",
      isCredentialStep: false,
      options: [
        { label: "Não tenho nenhuma referência em mente", value: "NO_COMP", action: "APPROVE", payload: "Sem referências diretas informadas" },
      ],
    };
  }

  return {
    replyText: `Maravilha, ${contact}! Mapeamos com muito cuidado a essência e o posicionamento da ${company}.\n\nPara que a equipe da Otimizza possa cuidar das publicações e configurar tudo com agilidade, você pode registrar o usuário e a senha do Instagram no cofre seguro abaixo (criptografia AES-256).\n\nOu, se preferir, pode enviar depois pelo WhatsApp para a nossa equipe!`,
    extractedUpdates: { competitors: userMessage },
    currentTopic: "credentials",
    isCredentialStep: true,
    options: [
      { label: "📲 Prefiro enviar pelo WhatsApp", value: "WHATSAPP", action: "NEXT" },
    ],
  };
}

async function getAiSuggestionsForCarousel({
  field,
  company,
  category,
  servicesOffered,
}: {
  field: "targetAudience" | "differentials" | "toneOfVoice" | "competitors";
  company: string;
  category: string;
  servicesOffered: string;
}): Promise<string[]> {
  const fieldDescriptions: Record<string, string> = {
    targetAudience: "públicos-alvo e perfis de clientes ideais (ex: 'Pessoas com dores crônicas buscando alívio seguro e qualidade de vida')",
    differentials: "diferenciais competitivos reais e atrativos (ex: 'Atendimento 100% individualizado e com hora marcada')",
    toneOfVoice: "estilos e tons de comunicação (ex: 'Didático e acolhedor, transmitindo confiança sem jargões')",
    competitors: "exemplos de perfis, tipos de referências ou estilos de conteúdo no Instagram",
  };

  const prompt = `Você é um estrategista sênior de marketing da Otimizza.
Gere exatamente 4 sugestões práticas, lúcidas, concisas e atrativas para a empresa "${company}".
Nicho de atuação: "${category || 'Serviços'}"
Serviços oferecidos: "${servicesOffered || 'Atendimento especializado'}"

Campo solicitado: ${fieldDescriptions[field] || field}

Regras:
1. Retorne APENAS um array JSON de strings no formato: ["Sugestão 1", "Sugestão 2", "Sugestão 3", "Sugestão 4"]
2. Sem asteriscos (**), sem prefixos numéricos, sem jargões corporativos vazios.
3. Cada sugestão deve ter entre 4 e 15 palavras, direta ao ponto e pronta para o cliente escolher com 1 clique.`;

  try {
    const res = await generateWithOpenRouter({
      model: strategyModel(),
      messages: [
        { role: "system", content: "Você é um gerador de sugestões estratégicas para onboarding de clientes. Responda apenas JSON puro." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      maxTokens: 500,
    });

    const parsed = parseAiJson(res.text, z.array(z.string()));
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .map((s) => stripAsterisks(String(s)).trim())
        .filter((s) => s.length > 3)
        .slice(0, 4);
    }
  } catch (err) {
    console.warn("Fallback de sugestões com IA:", err);
  }

  return getCuratedFallbackSuggestions(field, company, category, servicesOffered);
}

function getCuratedFallbackSuggestions(
  field: "targetAudience" | "differentials" | "toneOfVoice" | "competitors",
  _company: string,
  category: string,
  servicesOffered: string
): string[] {
  const isHealth = /fisioterap|pilates|saúde|médic|dor|coluna|reabilita|ortoped/i.test(`${category} ${servicesOffered}`);

  if (field === "targetAudience") {
    if (isHealth) {
      return [
        "Pessoas com dores no corpo e limitações buscando alívio seguro",
        "Adultos e idosos focados em mobilidade, postura e bem-estar",
        "Praticantes de atividade física que precisam de prevenção ou recuperação",
        "Profissionais que passam horas sentados e sofrem com dores posturais",
      ];
    }
    return [
      "Clientes que priorizam qualidade e confiança acima do menor preço",
      "Pessoas que buscam uma solução completa e sem dores de cabeça",
      "Moradores locais e famílias da região que valorizam credibilidade",
      "Profissionais com rotina corrida que buscam agilidade e atenção",
    ];
  }

  if (field === "differentials") {
    if (isHealth) {
      return [
        "Atendimento 100% individualizado com acompanhamento contínuo",
        "Avaliação detalhada da causa da dor antes de iniciar as sessões",
        "Ambiente acolhedor, tranquilo e com pontualidade rigorosa",
        "Metodologia personalizada para ganho real de mobilidade e autonomia",
      ];
    }
    return [
      "Atendimento próximo, consultivo e totalmente personalizado",
      "Pontualidade e cumprimento rigoroso dos prazos combinados",
      "Equipe especializada com metodologia transparente e suporte direto",
      "Ambiente acolhedor e infraestrutura moderna voltada à melhor experiência",
    ];
  }

  if (field === "toneOfVoice") {
    return [
      "Acolhedor e didático: ensina e tranquiliza sem termos difíceis",
      "Autoridade e segurança: especialista respeitado que passa total confiança",
      "Motivador e dinâmico: inspira transformação e disciplina positiva",
      "Elegante e sereno: refinado, discreto e focado em excelência",
    ];
  }

  return [
    `Perfis de referência no segmento de ${category || "saúde e serviços"} que educam com clareza`,
    "Contas com estética limpa, visual acolhedor e vídeos demonstrativos reais",
    "Referências que mostram bastidores e evolução real dos clientes",
    "Prefiro que a equipe da Otimizza recomende as melhores referências",
  ];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const res = await query(
      `
      SELECT 
        s.id, s.token, s.project_id, s.task_id, s.client_id,
        s.company_name, s.contact_name, s.website_url, s.maps_url, s.instagram_url,
        s.initial_notes, s.competitor_notes, s.conversation_history, s.extracted_identity,
        s.status, s.progress_percent, s.credentials_saved, s.completed_at, s.created_at,
        s.brand_history, s.core_promise, s.non_negotiables, s.sales_objections,
        s.cnpj, s.cnae_code, s.cnae_description, s.catalog_items,
        (
          SELECT cc.name 
          FROM public.client_contacts cc 
          WHERE cc.client_id = COALESCE(s.client_id, (SELECT p.client_id FROM public.project_tasks pt JOIN public.projects p ON p.id = pt.project_id WHERE pt.id = s.task_id))
          ORDER BY cc.is_primary DESC, cc.created_at ASC 
          LIMIT 1
        ) as contact_person_name
      FROM public.client_briefing_sessions s
      WHERE s.token = $1
      LIMIT 1
      `,
      [token]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Sessão de briefing não encontrada." }, { status: 404 });
    }

    const row = res.rows[0];

    let history: ChatMessage[] = [];
    try {
      history = typeof row.conversation_history === "string" 
        ? JSON.parse(row.conversation_history) 
        : (row.conversation_history || []);
    } catch {
      history = [];
    }

    // Sanitiza histórico para tema claro e sem asteriscos
    history = history.map((msg) => ({
      ...msg,
      text: stripAsterisks(msg.text),
      options: msg.options?.map((opt) => ({
        ...opt,
        label: stripAsterisks(opt.label),
        value: stripAsterisks(opt.value),
      })),
    }));

    const displayContact = formatContactFirstName(row.contact_person_name || row.contact_name, row.company_name);

    const effectiveClientId = row.client_id;
    let audiences: Array<{ id: string; name: string; description?: string | null }> = [];
    let category = "";
    let servicesOffered = "";
    let extracted = (typeof row.extracted_identity === "string" ? JSON.parse(row.extracted_identity) : row.extracted_identity) || {};

    if (effectiveClientId) {
      try {
        const dna = await getClientDnaContext(effectiveClientId);
        audiences = dna.audiences || [];
        category = dna.category;
        servicesOffered = dna.servicesOffered;

        if (Object.keys(extracted).length === 0) {
          extracted = { ...dna.initialExtractedIdentity };
        } else {
          extracted = {
            ...dna.initialExtractedIdentity,
            ...extracted,
          };
        }
      } catch (dnaErr) {
        console.warn("Aviso ao carregar DNA no briefing GET:", dnaErr);
      }
    }

    if (history.length === 0) {
      const introMsg: ChatMessage = {
        id: "msg_intro",
        sender: "assistant",
        text: `Olá, ${displayContact}! 👋 Sou a Edivânia, estrategista de comunicação aqui da Otimizza.\n\nA nossa equipe preparou o contexto inicial da ${row.company_name} e estou aqui para conversarmos de forma tranquila e descomplicada sobre a sua marca e os conteúdos para suas redes sociais.\n\nFique super à vontade: não é um teste e nem um questionário técnico! Se em algum momento você quiser sugestões ou preferir responder depois, basta me avisar.\n\nPodemos começar agora?`,
        options: [
          { label: "🚀 Sim, vamos começar!", value: "START", action: "APPROVE" },
          { label: "Como vai funcionar?", value: "EXPLAIN", action: "EXPLAIN" },
        ],
        timestamp: new Date().toISOString(),
      };
      history.push(introMsg);

      await query(
        `UPDATE public.client_briefing_sessions SET conversation_history = $1, status = 'IN_PROGRESS', progress_percent = 15 WHERE id = $2`,
        [JSON.stringify(history), row.id]
      );
      row.conversation_history = history;
      row.progress_percent = 15;
    }

    let catalogItems: unknown[] = [];
    if (effectiveClientId) {
      try {
        catalogItems = await getCatalogItemsByClientId(effectiveClientId);
      } catch (catErr) {
        console.warn("Aviso ao carregar catálogo no briefing GET:", catErr);
      }
    }
    if (catalogItems.length === 0 && Array.isArray(row.catalog_items) && row.catalog_items.length > 0) {
      catalogItems = row.catalog_items;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        token: row.token,
        companyName: row.company_name,
        contactName: displayContact,
        websiteUrl: row.website_url,
        mapsUrl: row.maps_url,
        instagramUrl: row.instagram_url,
        initialNotes: row.initial_notes,
        competitorNotes: row.competitor_notes,
        brandHistory: row.brand_history || "",
        corePromise: row.core_promise || "",
        nonNegotiables: row.non_negotiables || "",
        salesObjections: row.sales_objections || "",
        cnpj: row.cnpj || "",
        cnaeCode: row.cnae_code || "",
        cnaeDescription: row.cnae_description || "",
        catalogItems,
        conversationHistory: history,
        extractedIdentity: extracted,
        audiences,
        category,
        servicesOffered,
        status: row.status,
        progressPercent: row.progress_percent || 15,
        credentialsSaved: row.credentials_saved,
        completedAt: row.completed_at,
      },
    });
  } catch (err: unknown) {
    console.error("Erro ao carregar briefing público:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao carregar sessão." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const parsed = messageSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Resposta de briefing inválida." }, { status: 400 });
    const body = parsed.data;

    const {
      action,
      message,
      decision,
      suggestedField,
      suggestedValue,
      credentials,
    } = body;

    const res = await query(
      `
      SELECT 
        s.*,
        (
          SELECT cc.name 
          FROM public.client_contacts cc 
          WHERE cc.client_id = COALESCE(s.client_id, (SELECT p.client_id FROM public.project_tasks pt JOIN public.projects p ON p.id = pt.project_id WHERE pt.id = s.task_id))
          ORDER BY cc.is_primary DESC, cc.created_at ASC 
          LIMIT 1
        ) as contact_person_name
      FROM public.client_briefing_sessions s 
      WHERE s.token = $1 
      LIMIT 1
      `,
      [token]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 });
    }

    const session = res.rows[0];
    if (session.status === "COMPLETED") {
      return NextResponse.json({ error: "Este briefing já foi concluído. Solicite uma revisão à equipe." }, { status: 409 });
    }

    let history: ChatMessage[] = [];
    try {
      history = typeof session.conversation_history === "string"
        ? JSON.parse(session.conversation_history)
        : (session.conversation_history || []);
    } catch {
      history = [];
    }

    let extracted: Record<string, unknown> = {};
    try {
      extracted = typeof session.extracted_identity === "string"
        ? JSON.parse(session.extracted_identity)
        : (session.extracted_identity || {});
    } catch {
      extracted = {};
    }

    const company = session.company_name || "sua empresa";
    const contact = formatContactFirstName(session.contact_person_name || session.contact_name, company);
    let notes = session.initial_notes || "";
    let category = String(extracted.marketNiche || "");
    let servicesOffered = String(extracted.valueProposition || "");

    const effectiveClientId = session.client_id;
    if (effectiveClientId && (!notes || !category || !servicesOffered || !extracted.targetAudience)) {
      try {
        const dna = await getClientDnaContext(effectiveClientId);
        if (!notes) notes = dna.compiledInitialNotes;
        if (!category) category = dna.category;
        if (!servicesOffered) servicesOffered = dna.servicesOffered;
        if (!extracted.marketNiche && dna.category) extracted.marketNiche = dna.category;
        if (!extracted.valueProposition && dna.servicesOffered) extracted.valueProposition = dna.servicesOffered;
        if (!extracted.targetAudience && dna.initialExtractedIdentity.targetAudience) {
          extracted.targetAudience = dna.initialExtractedIdentity.targetAudience;
          extracted.targetAudiences = dna.initialExtractedIdentity.targetAudiences;
        }
        if (!extracted.differentials && dna.initialExtractedIdentity.differentials) {
          extracted.differentials = dna.initialExtractedIdentity.differentials;
        }
        if ((!extracted.toneOfVoice || (Array.isArray(extracted.toneOfVoice) && extracted.toneOfVoice.length === 0)) && dna.initialExtractedIdentity.toneOfVoice) {
          extracted.toneOfVoice = dna.initialExtractedIdentity.toneOfVoice;
        }
      } catch (dnaErr) {
        console.warn("Aviso ao carregar DNA no briefing público:", dnaErr);
      }
    }
    let progress = Number(session.progress_percent) || 15;
    const now = new Date().toISOString();

    // 0. AÇÕES DO NOVO CARROSSEL / WIZARD
    if (action === "AI_SUGGEST") {
      const field = body.aiStepField || "targetAudience";
      const suggestions = await getAiSuggestionsForCarousel({
        field,
        company,
        category,
        servicesOffered,
      });

      return NextResponse.json({
        success: true,
        data: {
          suggestions,
        },
      });
    }

    if (action === "SAVE_STEP") {
      const stepIndex = typeof body.step === "number" ? body.step : 0;
      if (body.extractedIdentity && typeof body.extractedIdentity === "object") {
        Object.assign(extracted, body.extractedIdentity);
      }

      const progressMap = [15, 30, 50, 70, 85, 95, 100];
      const newProgress = progressMap[stepIndex] ?? Math.min(95, 15 + stepIndex * 15);

      await query(
        `UPDATE public.client_briefing_sessions 
         SET extracted_identity = $1, progress_percent = $2, updated_at = NOW() 
         WHERE id = $3`,
        [JSON.stringify(extracted), newProgress, session.id]
      );

      if (Array.isArray(extracted.catalogItems) && extracted.catalogItems.length > 0) {
        await query(
          `UPDATE public.client_briefing_sessions SET catalog_items = $1::jsonb WHERE id = $2`,
          [JSON.stringify(extracted.catalogItems), session.id]
        );
        if (session.client_id) {
          try {
            await syncCatalogItems(session.client_id, extracted.catalogItems as Parameters<typeof syncCatalogItems>[1]);
          } catch (catErr) {
            console.warn("Aviso ao sincronizar catálogo do briefing:", catErr);
          }
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          progressPercent: newProgress,
          extractedIdentity: extracted,
        },
      });
    }

    if (action === "FINALIZE") {
      if (body.extractedIdentity && typeof body.extractedIdentity === "object") {
        Object.assign(extracted, body.extractedIdentity);
      }

      const username = credentials?.username?.trim();
      const password = credentials?.password?.trim();

      if (username && password) {
        try {
          const userRes = await query<{ id: string }>(
            "SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1"
          );
          let ownerId = userRes.rows[0]?.id;
          if (!ownerId) {
            const vaultRes = await query<{ owner_id: string }>(
              "SELECT owner_id FROM public.password_vault_entries LIMIT 1"
            );
            ownerId = vaultRes.rows[0]?.owner_id;
          }
          if (ownerId) {
            const entryId = randomUUID();
            const encrypted = encryptPassword(password, `${ownerId}:${entryId}`);
            const website = session.instagram_url || `https://instagram.com/${username.replace("@", "")}`;

            await query(
              `
              INSERT INTO public.password_vault_entries (
                id, owner_id, title, username, website, encrypted_password, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
              `,
              [entryId, ownerId, `Instagram - ${company}`, username, website, encrypted]
            );
            session.credentials_saved = true;
          }
        } catch (vaultErr) {
          console.error("Erro ao salvar no cofre durante FINALIZE:", vaultErr);
        }
      }

      const updateSql = `
        UPDATE public.client_briefing_sessions
        SET 
          extracted_identity = $1,
          progress_percent = 100,
          credentials_saved = $2,
          status = 'COMPLETED',
          completed_at = COALESCE(completed_at, NOW()),
          updated_at = NOW()
        WHERE id = $3
      `;

      await withTransaction(async (client) => {
        await client.query(updateSql, [
          JSON.stringify(extracted),
          !!session.credentials_saved,
          session.id,
        ]);

        if (session.client_id) {
          await syncBriefingIdentity(client, session.client_id, extracted, {
            instagram: session.instagram_url || (username ? `https://instagram.com/${username.replace("@", "")}` : ""),
            website: session.website_url || "",
            notes: session.initial_notes || "",
          });
        }

        if (session.task_id) {
          await client.query("UPDATE project_tasks SET status='DONE', completed_at=NOW() WHERE id=$1", [session.task_id]);
        }
      });

      await NotificationService.createSafeNotification({
        type: "BRIEFING_FINALIZED",
        severity: "success",
        category: "BRIEFING",
        dedupKey: `briefing-completed:${session.id}`,
        entityType: "briefing_session",
        entityId: session.id,
        title: `Briefing finalizado pelo cliente: ${company}`,
        message: "O briefing interativo foi enviado e a tarefa foi marcada como concluída",
        linkUrl: session.project_id ? `/projects/${session.project_id}` : "/projects",
      });

      return NextResponse.json({
        success: true,
        data: {
          progressPercent: 100,
          status: "COMPLETED",
          extractedIdentity: extracted,
          credentialsSaved: session.credentials_saved,
        },
      });
    }

    // 1. TRATAMENTO DE PAUSA (RESPONDER DEPOIS)
    if (action === "PAUSE") {
      history.push({
        id: `usr_${Date.now()}`,
        sender: "user",
        text: "Gostaria de responder depois / continuar mais tarde.",
        timestamp: now,
      });

      history.push({
        id: `ast_${Date.now()}`,
        sender: "assistant",
        text: `Fique super tranquilo(a), ${contact}! Suas respostas já estão salvas com segurança no nosso sistema.\n\nQuando você quiser retomar a conversa, basta abrir este mesmo link no seu computador ou celular que continuaremos exatamente de onde paramos. Até breve! 😊`,
        timestamp: now,
      });
    } else if (action === "SUBMIT_CREDENTIALS") {
      const username = credentials?.username?.trim();
      const password = credentials?.password?.trim();

      if (username && password) {
        try {
          const userRes = await query<{ id: string }>(
            "SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1"
          );
          let ownerId = userRes.rows[0]?.id;
          if (!ownerId) {
            const vaultRes = await query<{ owner_id: string }>(
              "SELECT owner_id FROM public.password_vault_entries LIMIT 1"
            );
            ownerId = vaultRes.rows[0]?.owner_id;
          }
          if (!ownerId) throw new Error("Responsável pelo cofre não configurado.");

          const entryId = randomUUID();
          const encrypted = encryptPassword(password, `${ownerId}:${entryId}`);
          const website = session.instagram_url || `https://instagram.com/${username.replace("@", "")}`;

          await withTransaction(async (client) => {
            await client.query(
              `
              INSERT INTO public.password_vault_entries (
                id, owner_id, title, username, website, encrypted_password, created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, NOW(), NOW()
              )
              `,
              [entryId, ownerId, `Instagram - ${company}`, username, website, encrypted]
            );

            await client.query(
              `UPDATE public.client_briefing_sessions SET credentials_saved = true WHERE id = $1`,
              [session.id]
            );
          });
          session.credentials_saved = true;
          await NotificationService.createSafeNotification({
            type: "BRIEFING_CREDENTIALS",
            severity: "info",
            category: "BRIEFING",
            entityType: "briefing_session",
            entityId: session.id,
            title: `Credenciais enviadas no briefing: ${company}`,
            message: "Os acessos do Instagram foram salvos no cofre de senhas",
            linkUrl: "/passwords",
          });
        } catch (vaultErr) {
          console.error("Erro ao salvar no cofre de senhas:", vaultErr);
          return NextResponse.json({ error: "Não foi possível salvar os acessos no cofre. Tente novamente ou escolha enviar os acessos depois." }, { status: 503 });
        }
      } else {
        return NextResponse.json({ error: "Informe usuário e senha para salvar os acessos." }, { status: 400 });
      }

      history.push({
        id: `usr_${Date.now()}`,
        sender: "user",
        text: username ? `Enviei os dados de acesso para o Instagram (@${username}).` : "Dados de acesso enviados.",
        timestamp: now,
      });

      history.push({
        id: `ast_${Date.now()}`,
        sender: "assistant",
        text: `Excelente! Seus dados de acesso foram recebidos com segurança e salvos no cofre da Otimizza.\n\nCom isso, finalizamos nosso papo com muito sucesso! Todas as orientações estratégicas da ${company} foram organizadas e entregues para a equipe iniciar as criações.`,
        timestamp: now,
        options: [
          { label: "🎉 Finalizar e Entregar para a Otimizza", value: "FINALIZE", action: "APPROVE" },
        ],
      });

      progress = 98;
    } else if (action === "SKIP_CREDENTIALS") {
      history.push({
        id: `usr_${Date.now()}`,
        sender: "user",
        text: "Prefiro enviar os acessos diretamente pelo WhatsApp da Otimizza.",
        timestamp: now,
      });

      history.push({
        id: `ast_${Date.now()}`,
        sender: "assistant",
        text: `Sem problema nenhum! Você pode combinar o envio dos acessos diretamente com a nossa equipe no momento que for mais conveniente.\n\nCom isso, já temos tudo o que precisamos para dar a largada na estratégia da ${company}!`,
        timestamp: now,
        options: [
          { label: "🎉 Finalizar e Entregar para a Otimizza", value: "FINALIZE", action: "APPROVE" },
        ],
      });

      progress = 98;
    } else if (action === "DECISION") {
      if (decision === "APPROVE" && suggestedField && suggestedValue) {
        extracted[suggestedField] = stripAsterisks(suggestedValue);

        history.push({
          id: `usr_${Date.now()}`,
          sender: "user",
          text: `Aprovado: "${stripAsterisks(suggestedValue)}"`,
          timestamp: now,
        });

        const aiResponse = await callEdivaniaAi({
          company,
          contact,
          notes,
          category,
          servicesOffered,
          history,
          extracted,
          userMessage: `Aprovei a opção de ${suggestedField}: "${suggestedValue}"`,
        });

        if (aiResponse.extractedUpdates) {
          Object.assign(extracted, aiResponse.extractedUpdates);
        }

        history.push({
          id: `ast_${Date.now()}`,
          sender: "assistant",
          text: stripAsterisks(aiResponse.replyText),
          options: aiResponse.options,
          suggestedData: aiResponse.suggestedData,
          isCredentialStep: aiResponse.isCredentialStep,
          slider: aiResponse.slider,
          multiSelect: aiResponse.multiSelect,
          timestamp: now,
        });
      } else if (decision === "RETRY" && suggestedField) {
        const altSuggestion = getAlternativeSuggestion(suggestedField, company, category, servicesOffered);
        history.push({
          id: `ast_${Date.now()}`,
          sender: "assistant",
          text: `Sem problemas! Aqui está outra ideia com um olhar diferente:\n\n"${altSuggestion}"\n\nEssa proposta combina mais com o seu dia a dia?`,
          suggestedData: {
            field: suggestedField,
            value: altSuggestion,
          },
          options: [
            { label: "👍 Essa combina mais!", value: "APPROVE", action: "APPROVE" },
            { label: "✏️ Vou digitar eu mesmo", value: "CUSTOM", action: "ADJUST" },
            { label: "🔄 Ver outra opção", value: "RETRY", action: "RETRY" },
          ],
          timestamp: now,
        });
      }
    } else if (action === "DONT_KNOW") {
      history.push({
        id: `usr_${Date.now()}`,
        sender: "user",
        text: "Pode me sugerir algumas opções pro meu nicho?",
        timestamp: now,
      });

      const aiResponse = await callEdivaniaAi({
        company,
        contact,
        notes,
        category,
        servicesOffered,
        history,
        extracted,
        userMessage: "Pode me dar exemplos e sugestões práticas para a minha empresa?",
        isDontKnow: true,
      });

      history.push({
        id: `ast_${Date.now()}`,
        sender: "assistant",
        text: stripAsterisks(aiResponse.replyText),
        options: aiResponse.options,
        suggestedData: aiResponse.suggestedData,
        isCredentialStep: aiResponse.isCredentialStep,
        slider: aiResponse.slider,
        multiSelect: aiResponse.multiSelect,
        timestamp: now,
      });
    } else if (action === "MESSAGE") {
      const userText = stripAsterisks(String(message || "").trim());

      history.push({
        id: `usr_${Date.now()}`,
        sender: "user",
        text: userText,
        timestamp: now,
      });

      const isStartMsg =
        history.length <= 2 ||
        userText.toLowerCase() === "start" ||
        userText.toLowerCase().includes("sim, vamos") ||
        userText.toLowerCase() === "vamos lá";

      if (isStartMsg) {
        const existingAudiencesText = extracted.targetAudience || extracted.targetAudiences;
        const hasExistingAudiences = !!(existingAudiencesText && (Array.isArray(existingAudiencesText) ? existingAudiencesText.length > 0 : String(existingAudiencesText).trim().length > 0));

        let startText = `Que maravilha, ${contact}! Vamos lá. ☕\n\nPara começar da forma mais prática possível: pensando no dia a dia da ${company}${category ? ` com ${category}` : ""}, quem costuma procurar os seus serviços? Me conta quem são os seus principais tipos de clientes. Se tiver mais de um perfil ou público, pode me falar todos!`;
        let startOptions: ChatMessage["options"] = [
          { label: "Clientes que buscam qualidade acima do preço", value: "Clientes que valorizam qualidade e confiança" },
          { label: "Pessoas com necessidades imediatas", value: "Pessoas com demandas pontuais e urgentes" },
          { label: "Famílias e moradores locais da região", value: "Moradores locais e famílias da região" },
          { label: "💡 Me dê exemplos pro meu nicho", value: "DONT_KNOW_AUDIENCE", action: "DONT_KNOW" },
        ];

        if (hasExistingAudiences) {
          const audienceSummary = Array.isArray(existingAudiencesText)
            ? existingAudiencesText.join(", ")
            : String(existingAudiencesText).split("\n")[0];

          startText = `Que maravilha, ${contact}! Vamos lá. ☕\n\nA nossa equipe já registrou no perfil da ${company} que vocês atendem principalmente:\n👉 ${audienceSummary}\n\nVocê confirma esses públicos no seu dia a dia? Tem mais algum outro perfil ou público que vocês também atendem e gostaria de acrescentar?`;
          startOptions = [
            { label: "👍 Sim, esses são os nossos públicos!", value: "Confirmados: " + audienceSummary, action: "APPROVE" },
            { label: "➕ Quero acrescentar outro público", value: "Temos outros públicos além desses", action: "ADJUST" },
            { label: "✏️ Quero ajustar os públicos", value: "Gostaria de ajustar os públicos", action: "ADJUST" },
            { label: "💡 Me dê exemplos pro meu nicho", value: "DONT_KNOW_AUDIENCE", action: "DONT_KNOW" },
          ];
        }

        history.push({
          id: `ast_${Date.now()}`,
          sender: "assistant",
          text: startText,
          options: startOptions,
          timestamp: now,
        });
      } else {
        const aiResponse = await callEdivaniaAi({
          company,
          contact,
          notes,
          category,
          servicesOffered,
          history,
          extracted,
          userMessage: userText,
        });

        if (aiResponse.extractedUpdates) {
          Object.assign(extracted, aiResponse.extractedUpdates);
        }

        history.push({
          id: `ast_${Date.now()}`,
          sender: "assistant",
          text: stripAsterisks(aiResponse.replyText),
          options: aiResponse.options,
          suggestedData: aiResponse.suggestedData,
          isCredentialStep: aiResponse.isCredentialStep,
          slider: aiResponse.slider,
          multiSelect: aiResponse.multiSelect,
          timestamp: now,
        });
      }
    }

    // Progresso
    const isCompleted = progress >= 100 || (action === "DECISION" && decision === "APPROVE" && suggestedValue === "FINALIZE");
    const answered = ["targetAudience", "differentials", "toneOfVoice", "competitors"].filter((field) => {
      const value = extracted[field];
      return typeof value === "string" ? value.trim().length > 0 : Array.isArray(value) && value.length > 0;
    }).length;

    if (isCompleted && answered < 4) {
      return NextResponse.json({ error: "Conclua as quatro etapas do briefing antes de finalizar." }, { status: 400 });
    }

    if (!isCompleted) {
      progress = session.credentials_saved || action === "SKIP_CREDENTIALS" ? 98 : Math.max(15, Math.round((answered / 4) * 90));
    } else {
      progress = 100;
    }

    const updateSql = `
      UPDATE public.client_briefing_sessions
      SET 
        conversation_history = $1,
        extracted_identity = $2,
        progress_percent = $3,
        status = CASE WHEN $4 = true THEN 'COMPLETED' ELSE 'IN_PROGRESS' END,
        completed_at = CASE WHEN $4 = true AND completed_at IS NULL THEN NOW() ELSE completed_at END,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;

    await withTransaction(async (client) => {
      const result = await client.query(updateSql, [JSON.stringify(history), JSON.stringify(extracted), progress, isCompleted, session.id]);
      if (isCompleted) {
        if (session.client_id) {
          await syncBriefingIdentity(client, session.client_id, extracted, {
            instagram: session.instagram_url || "",
            website: session.website_url || "",
            notes: session.initial_notes || "",
          });
        }
        if (session.task_id) {
          await client.query("UPDATE project_tasks SET status='DONE', completed_at=NOW() WHERE id=$1", [session.task_id]);
        }
      }
      return result;
    });

    if (isCompleted) {
      await NotificationService.createSafeNotification({
        type: "BRIEFING_COMPLETED",
        severity: "success",
        category: "BRIEFING",
        dedupKey: `briefing-completed:${session.id}`,
        entityType: "briefing_session",
        entityId: session.id,
        title: `Briefing concluído: ${company}`,
        message: "O cliente concluiu todas as etapas do briefing interativo",
        linkUrl: session.project_id ? `/projects/${session.project_id}` : "/projects",
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        progressPercent: progress,
        conversationHistory: history,
        extractedIdentity: extracted,
        status: isCompleted ? "COMPLETED" : "IN_PROGRESS",
        credentialsSaved: session.credentials_saved,
      },
    });
  } catch (err: unknown) {
    console.error("Erro ao processar mensagem do briefing:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno ao processar resposta." },
      { status: 500 }
    );
  }
}

function getCurrentStepFromHistory(extracted: Record<string, unknown>): string {
  if (!extracted.targetAudience) return "targetAudience";
  if (!extracted.differentials) return "differentials";
  if (!extracted.toneOfVoice) return "toneOfVoice";
  if (!extracted.competitors) return "competitors";
  return "targetAudience";
}

function getSmartSuggestionForStep(step: string, company: string, category: string, servicesOffered: string): { field: string; text: string } {
  if (step === "targetAudience") {
    return {
      field: "targetAudience",
      text: `Pessoas e famílias que valorizam um atendimento de confiança e personalizado para ${category || servicesOffered || "suas necessidades"}.`,
    };
  }

  if (step === "differentials") {
    return {
      field: "differentials",
      text: `Atendimento consultivo e próximo, cumprimento rigoroso de prazos e cuidado genuíno em cada etapa do atendimento.`,
    };
  }

  if (step === "toneOfVoice") {
    return {
      field: "toneOfVoice",
      text: `Acolhedor e didático: explicamos com clareza e empatia, transmitindo tranquilidade e confiança sem jargões complicados.`,
    };
  }

  return {
    field: "competitors",
    text: `Posicionamento próprio e autêntico, destacando a proximidade humana e o cuidado da ${company}.`,
  };
}

function getAlternativeSuggestion(field: string, _company: string, category: string, servicesOffered: string): string {
  if (field === "targetAudience") {
    return `Clientes que buscam uma solução completa com tranquilidade, sem dor de cabeça e com suporte direto.`;
  }
  if (field === "differentials") {
    return `Atenção aos mínimos detalhes, metodologia própria e suporte rápido para esclarecer qualquer dúvida.`;
  }
  if (field === "toneOfVoice") {
    return `Descontraído e humano: linguagem leve, acessível e focada em resolver o problema do cliente com simpatia.`;
  }
  return `Referências que trabalham com conteúdo acolhedor e visual limpo nas redes.`;
}
