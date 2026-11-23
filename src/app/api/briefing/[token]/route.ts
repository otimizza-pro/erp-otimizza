import { NextRequest, NextResponse } from "next/server";
import { syncBriefingIdentity } from "@/modules/clients/briefing-identity";
import { query, withTransaction } from "@/lib/db/pool";
import { encryptPassword } from "@/modules/passwords/crypto";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { generateWithOpenRouter, strategyModel, parseAiJson } from "@/lib/ai/openrouter";

const messageSchema = z.object({
  action: z.enum(["MESSAGE", "DONT_KNOW", "DECISION", "SUBMIT_CREDENTIALS", "SKIP_CREDENTIALS"]),
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
}

const sofiaAiSchema = z.object({
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
});

function stripAsterisks(text: string): string {
  if (!text) return "";
  return text.replace(/\*\*/g, "").replace(/\*/g, "");
}

async function callSofiaAi({
  company,
  contact,
  notes,
  history,
  extracted,
  userMessage,
  isDontKnow = false,
}: {
  company: string;
  contact: string;
  notes: string;
  history: ChatMessage[];
  extracted: Record<string, unknown>;
  userMessage: string;
  isDontKnow?: boolean;
}): Promise<z.infer<typeof sofiaAiSchema>> {
  const currentStep = getCurrentStepFromHistory(extracted);

  const formattedHistory = history.slice(-12).map((m) => {
    const role = m.sender === "user" ? contact : "Sofia";
    return `${role}: ${stripAsterisks(m.text)}`;
  }).join("\n");

  const systemPrompt = `Você é a Sofia, consultora e estrategista sênior de inteligência da Otimizza Growth.
Você está conduzindo uma conversa de onboarding amigável, inteligente e consultiva com ${contact}, representante da empresa ${company}.

OBJETIVO DO BRIEFING:
Mapear de forma conversacional os 4 pilares essenciais da ${company} para estruturação da estratégia de redes sociais:
1. targetAudience (Público-alvo: quem é o cliente ideal, dores, necessidades, perfis - se tiver mais de um público, acolha e anote todos!)
2. differentials (Diferenciais: o que torna a empresa a melhor escolha, qualidade, autoridade, diferenciais concretos)
3. toneOfVoice (Tom de voz: como a marca deve soar nas redes, postura e linguagem)
4. competitors (Concorrentes e perfis de referência que admiram ou acompanham)

DADOS INICIAIS DA EMPRESA:
- Empresa: ${company}
- Contato: ${contact}
- Notas e Contexto Inicial: ${notes || "Não informado"}
- Estado atual do mapeamento: ${JSON.stringify(extracted)}
- Pilar atual em foco: ${currentStep}

REGRAS DE CONVERSAÇÃO E INTELIGÊNCIA:
- Você é uma pessoa real conversando ao vivo. NUNCA soe como um formulário burocrático ou script mecânico.
- Preste atenção no que a pessoa diz e reaja com inteligência ao conteúdo dela antes de fazer a próxima pergunta.
- Se a pessoa disser que tem mais públicos ou que faltou algo (ex: "eu só disse um público, mas tem mais"), NUNCA mude de assunto! Acolha com entusiasmo, valide o que ela já disse e pergunte quais são os outros públicos.
- Se o usuário responder de forma curta ou pedir sugestão (isDontKnow = ${isDontKnow}), forneça 2 a 3 sugestões inteligentes e específicas para o nicho da ${company}, com uma sugestão em suggestedData e opções em options.
- Quando um pilar estiver bem mapeado, faça um breve fechamento natural de 1 frase e faça a transição suave para o próximo pilar.
- Faça apenas UMA pergunta por vez para manter a conversa dinâmica e agradável.
- Quando os 4 pilares estiverem cobertos com dados consistentes, parabenize a pessoa, faça um resumo de 2 frases dos pilares acordados e convide para a etapa de credenciais do Instagram (definindo isCredentialStep: true).

REGRA RIGOROSA DE FORMATAÇÃO (INVIOLÁVEL):
- NUNCA USE ASTERISCOS DUPLOS (**) EM NENHUM LUGAR DO TEXTO.
- Não use ** para títulos, não use ** para nomes de empresas, não use ** para perguntas ou destaques.
- Use texto puro com boa pontuação, quebras de linha e emojis moderados e simpáticos (1 a 2 por mensagem).

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "replyText": "Texto caloroso, inteligente e conversacional da Sofia (SEM NENHUM ASTERISCO **)",
  "extractedUpdates": {
    "targetAudience": "resumo cumulativo dos públicos identificados até agora (ou omitir se nada novo)",
    "differentials": "resumo cumulativo dos diferenciais identificados (ou omitir se nada novo)",
    "toneOfVoice": ["diretrizes do tom de voz se identificadas"],
    "competitors": "concorrentes ou referências identificados (ou omitir se nada novo)"
  },
  "currentTopic": "targetAudience" | "differentials" | "toneOfVoice" | "competitors" | "credentials" | "completed",
  "isCredentialStep": boolean,
  "options": [
    { "label": "Texto do botão rápido (sem **)", "value": "Texto do valor" }
  ],
  "suggestedData": { "field": "campo", "value": "sugestão caso seja o momento de sugerir" }
}`;

  try {
    const aiRes = await generateWithOpenRouter({
      model: strategyModel(),
      temperature: 0.6,
      maxTokens: 1200,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Histórico recente da conversa:\n${formattedHistory}\n\nÚltima mensagem do usuário (${contact}): "${userMessage}"\n${isDontKnow ? "[Atenção: O usuário solicitou sugestões para este tópico]" : ""}`,
        },
      ],
    });

    const parsed = parseAiJson(aiRes.text, sofiaAiSchema);
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
    console.warn("Sofia AI fallback ativado:", err instanceof Error ? err.message : err);
    return getConversationalFallback(userMessage, currentStep, company, contact, extracted, isDontKnow);
  }
}

function getConversationalFallback(
  userMessage: string,
  currentStep: string,
  company: string,
  contact: string,
  extracted: Record<string, unknown>,
  isDontKnow: boolean
): z.infer<typeof sofiaAiSchema> {
  const msgLower = userMessage.toLowerCase();

  // Caso o usuário diga que tem mais ou queira complementar
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
    const suggestion = getSmartSuggestionForStep(currentStep, company, "");
    return {
      replyText: `Sem problemas, ${contact}! Preparei uma sugestão pensada no perfil da ${company}:\n\n"${suggestion.text}"\n\nEssa linha faz sentido para você ou gostaria de ajustar?`,
      extractedUpdates: {},
      currentTopic: currentStep as "targetAudience" | "differentials" | "toneOfVoice" | "competitors",
      isCredentialStep: false,
      suggestedData: {
        field: suggestion.field,
        value: suggestion.text,
      },
      options: [
        { label: "👍 Aprovar esta sugestão", value: "APPROVE", action: "APPROVE" },
        { label: "✏️ Vou personalizar", value: "CUSTOM", action: "ADJUST" },
        { label: "🔄 Ver outra opção", value: "RETRY", action: "RETRY" },
      ],
    };
  }

  if (currentStep === "targetAudience") {
    return {
      replyText: `Excelente, anotei os detalhes sobre o público-alvo da ${company}!\n\nAgora me conta: Qual é o principal diferencial da ${company}? O que faz os clientes escolherem vocês em vez de qualquer outra opção no mercado?`,
      extractedUpdates: { targetAudience: userMessage },
      currentTopic: "differentials",
      isCredentialStep: false,
      options: [
        { label: "🤷‍♂️ Me dê sugestões de diferenciais", value: "DONT_KNOW_DIFF", action: "DONT_KNOW" },
      ],
    };
  }

  if (currentStep === "differentials") {
    return {
      replyText: `Muito bom! Esse diferencial nos dá um posicionamento forte para conteúdos de autoridade e credibilidade.\n\nE sobre o Tom de Voz da ${company} nas redes, como você quer que a marca se comunique?`,
      extractedUpdates: { differentials: userMessage },
      currentTopic: "toneOfVoice",
      isCredentialStep: false,
      options: [
        { label: "Especialista & Direto", value: "TONE_EXPERT", action: "APPROVE", payload: "Direto, técnico e de autoridade" },
        { label: "Próximo & Acolhedor", value: "TONE_FRIENDLY", action: "APPROVE", payload: "Acessível, empático e caloroso" },
        { label: "Elegante & Premium", value: "TONE_PREMIUM", action: "APPROVE", payload: "Sofisticado e exclusivo" },
        { label: "🤷‍♂️ Me sugira o melhor tom", value: "DONT_KNOW_TONE", action: "DONT_KNOW" },
      ],
    };
  }

  if (currentStep === "toneOfVoice") {
    return {
      replyText: `Tom de voz alinhado! Isso garante que todas as postagens falem com a postura certa.\n\nVocê tem perfis de concorrentes ou marcas de referência que admira ou acompanha no Instagram? Se tiver, me envie o @ ou o nome deles.`,
      extractedUpdates: { toneOfVoice: [userMessage] },
      currentTopic: "competitors",
      isCredentialStep: false,
      options: [
        { label: "🤷‍♂️ Não tenho referências agora", value: "NO_COMP", action: "APPROVE", payload: "Sem referências diretas informadas" },
      ],
    };
  }

  // Finalização e Credenciais
  return {
    replyText: `Perfeito, ${contact}! Já mapeamos todos os pilares estratégicos da ${company} com clareza.\n\nPara que a equipe da Otimizza possa configurar seu perfil e agendar as publicações com agilidade, você pode registrar o usuário e senha do Instagram no cofre seguro abaixo (criptografia AES-256).\n\nSe preferir, pode enviar depois pelo nosso canal de atendimento no WhatsApp!`,
    extractedUpdates: { competitors: userMessage },
    currentTopic: "credentials",
    isCredentialStep: true,
    options: [
      { label: "📲 Prefiro enviar pelo WhatsApp", value: "WHATSAPP", action: "NEXT" },
    ],
  };
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
        id, token, project_id, task_id, client_id,
        company_name, contact_name, website_url, maps_url, instagram_url,
        initial_notes, competitor_notes, conversation_history, extracted_identity,
        status, progress_percent, credentials_saved, completed_at, created_at
      FROM public.client_briefing_sessions
      WHERE token = $1
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

    // Sanitiza histórico antigo para nunca exibir asteriscos
    history = history.map((msg) => ({
      ...msg,
      text: stripAsterisks(msg.text),
      options: msg.options?.map((opt) => ({
        ...opt,
        label: stripAsterisks(opt.label),
        value: stripAsterisks(opt.value),
      })),
    }));

    if (history.length === 0) {
      const introMsg: ChatMessage = {
        id: "msg_intro",
        sender: "assistant",
        text: `Olá, ${row.contact_name}! 👋 Sou a Sofia, especialista em estratégia da Otimizza.\n\nA equipe da Otimizza já me passou o contexto inicial da ${row.company_name} e estou aqui para conversarmos sobre o posicionamento e as redes sociais da sua marca.\n\n💡 Dica importante: Este briefing foi desenhado para ser uma conversa rápida e direta. Se em algum momento você não souber uma resposta, basta clicar em "Não sei" ou pedir uma sugestão — eu mesma crio opções para você aprovar!\n\nPodemos iniciar agora?`,
        options: [
          { label: "🚀 Sim, vamos iniciar!", value: "START", action: "APPROVE" },
          { label: "Como vai funcionar?", value: "EXPLAIN", action: "EXPLAIN" },
        ],
        timestamp: new Date().toISOString(),
      };
      history.push(introMsg);

      await query(
        `UPDATE public.client_briefing_sessions SET conversation_history = $1, status = 'IN_PROGRESS', progress_percent = 20 WHERE id = $2`,
        [JSON.stringify(history), row.id]
      );
      row.conversation_history = history;
      row.progress_percent = 20;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        token: row.token,
        companyName: row.company_name,
        contactName: row.contact_name,
        websiteUrl: row.website_url,
        mapsUrl: row.maps_url,
        instagramUrl: row.instagram_url,
        initialNotes: row.initial_notes,
        competitorNotes: row.competitor_notes,
        conversationHistory: history,
        extractedIdentity: row.extracted_identity || {},
        status: row.status,
        progressPercent: row.progress_percent || 20,
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
      `SELECT * FROM public.client_briefing_sessions WHERE token = $1 LIMIT 1`,
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
    const contact = session.contact_name || "Parceiro";
    const notes = session.initial_notes || "";
    let progress = Number(session.progress_percent) || 20;
    const now = new Date().toISOString();

    // 1. TRATAMENTO DE CREDENCIAIS
    if (action === "SUBMIT_CREDENTIALS") {
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
        text: `Excelente! Seus dados de acesso foram recebidos com segurança e criptografados no cofre da Otimizza.\n\nCom isso, finalizamos nosso briefing com sucesso! Todas as informações estratégicas da ${company} foram salvas e entregues para a nossa equipe iniciar os trabalhos.`,
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
        text: "Prefiro enviar os acessos diretamente pelo canal de atendimento da Otimizza.",
        timestamp: now,
      });

      history.push({
        id: `ast_${Date.now()}`,
        sender: "assistant",
        text: `Sem problema nenhum! Você pode combinar o envio dos acessos com a nossa equipe no momento que for mais conveniente.\n\nCom isso, já temos tudo o que precisamos para dar a largada na estratégia da ${company}!`,
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

        // Chama a IA para fazer a transição inteligente para o próximo ponto
        const aiResponse = await callSofiaAi({
          company,
          contact,
          notes,
          history,
          extracted,
          userMessage: `Aprovei a sugestão de ${suggestedField}: "${suggestedValue}"`,
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
          timestamp: now,
        });
      } else if (decision === "RETRY" && suggestedField) {
        const altSuggestion = getAlternativeSuggestion(suggestedField, company, notes);
        history.push({
          id: `ast_${Date.now()}`,
          sender: "assistant",
          text: `Sem problemas! Aqui está outra proposta com um ângulo diferente:\n\n"${altSuggestion}"\n\nO que acha desta?`,
          suggestedData: {
            field: suggestedField,
            value: altSuggestion,
          },
          options: [
            { label: "👍 Aprovar esta sugestão", value: "APPROVE", action: "APPROVE" },
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
        text: "Não sei responder com certeza, pode me sugerir uma boa opção?",
        timestamp: now,
      });

      const aiResponse = await callSofiaAi({
        company,
        contact,
        notes,
        history,
        extracted,
        userMessage: "Não sei o que responder agora, me dê sugestões personalizadas para a minha empresa.",
        isDontKnow: true,
      });

      history.push({
        id: `ast_${Date.now()}`,
        sender: "assistant",
        text: stripAsterisks(aiResponse.replyText),
        options: aiResponse.options,
        suggestedData: aiResponse.suggestedData,
        isCredentialStep: aiResponse.isCredentialStep,
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
        history.push({
          id: `ast_${Date.now()}`,
          sender: "assistant",
          text: `Maravilha, ${contact}! Vamos direto ao ponto. 🚀\n\nPrimeira pergunta: Quem é o cliente ideal da ${company}?\nMe conta quem costuma comprar ou contratar vocês, e quais são os principais perfis ou públicos que vocês atendem. Se tiver mais de um público, pode me falar todos!`,
          options: [
            { label: "🤷‍♂️ Não sei ao certo, me sugira!", value: "DONT_KNOW_AUDIENCE", action: "DONT_KNOW" },
          ],
          timestamp: now,
        });
      } else {
        const aiResponse = await callSofiaAi({
          company,
          contact,
          notes,
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
          timestamp: now,
        });
      }
    }

    // Atualização de progresso
    const isCompleted = progress >= 100 || (action === "DECISION" && decision === "APPROVE" && suggestedValue === "FINALIZE");
    const answered = ["targetAudience", "differentials", "toneOfVoice", "competitors"].filter((field) => {
      const value = extracted[field];
      return typeof value === "string" ? value.trim().length > 0 : Array.isArray(value) && value.length > 0;
    }).length;

    if (isCompleted && answered < 4) {
      return NextResponse.json({ error: "Conclua as quatro etapas do briefing antes de finalizar." }, { status: 400 });
    }

    if (!isCompleted) {
      progress = session.credentials_saved || action === "SKIP_CREDENTIALS" ? 98 : Math.max(25, Math.round((answered / 4) * 90));
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

function getSmartSuggestionForStep(step: string, company: string, notes: string): { field: string; text: string } {
  if (step === "targetAudience") {
    if (notes.toLowerCase().includes("b2b") || notes.toLowerCase().includes("empresa")) {
      return {
        field: "targetAudience",
        text: `Empresários, diretores e tomadores de decisão que buscam eficiência, previsibilidade e soluções comprovadas para seus negócios.`,
      };
    }
    return {
      field: "targetAudience",
      text: `Consumidores e decisores qualificados que valorizam atendimento ágil, transparência e confiança acima do menor preço.`,
    };
  }

  if (step === "differentials") {
    return {
      field: "differentials",
      text: `Atendimento consultivo e próximo, cumprimento rigoroso de prazos e foco absoluto em entregar resultados reais para o cliente.`,
    };
  }

  if (step === "toneOfVoice") {
    return {
      field: "toneOfVoice",
      text: `Direto e didático: comunicamos com clareza técnica e autoridade, sem enrolação ou jargões vazios.`,
    };
  }

  return {
    field: "competitors",
    text: `Foco em posicionamento próprio e superior, tornando a concorrência irrelevante através de autoridade e proximidade.`,
  };
}

function getAlternativeSuggestion(field: string, _company: string, _notes: string): string {
  if (field === "targetAudience") {
    return `Profissionais liberais e empresas em fase de crescimento que precisam delegar demandas operacionais para focar na estratégia.`;
  }
  if (field === "differentials") {
    return `Metodologia estruturada, suporte humanizado de alta resposta e garantia de qualidade em cada etapa da entrega.`;
  }
  if (field === "toneOfVoice") {
    return `Enérgico e persuasivo: foco no crescimento e na superação dos desafios diários do cliente.`;
  }
  return `Referências que trabalham com conteúdo educativo e didático com alta retenção visual.`;
}
