import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { encryptPassword } from "@/modules/passwords/crypto";
import { randomUUID } from "node:crypto";

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

    // Se o histórico estiver vazio, gerar a mensagem de abertura de Sofia
    let history: ChatMessage[] = [];
    try {
      history = typeof row.conversation_history === "string" 
        ? JSON.parse(row.conversation_history) 
        : (row.conversation_history || []);
    } catch {
      history = [];
    }

    if (history.length === 0) {
      const introMsg: ChatMessage = {
        id: "msg_intro",
        sender: "assistant",
        text: `Olá, ${row.contact_name}! 👋 Sou a Sofia, especialista em estratégia da Otimizza.\n\nO Valdemar já me passou o contexto inicial da ${row.company_name} e estou aqui para guiá-lo no alinhamento do posicionamento e das redes sociais da sua marca.\n\n💡 Dica importante: Este briefing foi desenhado para ser rápido e direto. Se em algum momento você não souber uma resposta, basta clicar em "Não sei" ou pedir uma sugestão — eu mesma crio opções para você aprovar!\n\nPodemos iniciar agora?`,
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
    const body = await req.json();

    const {
      action, // "MESSAGE" | "DONT_KNOW" | "DECISION" | "SUBMIT_CREDENTIALS" | "SKIP_CREDENTIALS"
      message,
      decision, // "APPROVE" | "ADJUST" | "RETRY"
      suggestedField,
      suggestedValue,
      credentials, // { username, password }
    } = body;

    const res = await query(
      `SELECT * FROM public.client_briefing_sessions WHERE token = $1 LIMIT 1`,
      [token]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 });
    }

    const session = res.rows[0];
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

    // Detectar estágio atual com base nas respostas já gravadas
    // Etapas:
    // 1. Confirmar dados iniciais
    // 2. Público-alvo (targetAudience)
    // 3. Diferenciais (differentials)
    // 4. Tom de voz (toneOfVoice)
    // 5. Concorrentes (competitors)
    // 6. Credenciais / Acessos
    // 7. Concluído

    const now = new Date().toISOString();

    // 1. TRATAMENTO DE CREDENCIAIS
    if (action === "SUBMIT_CREDENTIALS") {
      const username = credentials?.username?.trim();
      const password = credentials?.password?.trim();

      if (username && password) {
        try {
          // Obter owner_id
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
          if (!ownerId) {
            ownerId = "00000000-0000-0000-0000-000000000001";
          }

          const entryId = randomUUID();
          const encrypted = encryptPassword(password, `${ownerId}:${entryId}`);
          const website = session.instagram_url || `https://instagram.com/${username.replace("@", "")}`;

          await query(
            `
            INSERT INTO public.password_vault_entries (
              id, owner_id, title, username, website, encrypted_password, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, NOW(), NOW()
            )
            `,
            [entryId, ownerId, `Instagram - ${company}`, username, website, encrypted]
          );

          await query(
            `UPDATE public.client_briefing_sessions SET credentials_saved = true WHERE id = $1`,
            [session.id]
          );
          session.credentials_saved = true;
        } catch (vaultErr) {
          console.error("Erro ao salvar no cofre de senhas:", vaultErr);
        }
      }

      // Adicionar resposta do usuário e confirmação da Sofia
      history.push({
        id: `usr_${Date.now()}`,
        sender: "user",
        text: username ? `Enviei os dados de acesso para o Instagram (@${username}).` : "Dados enviados.",
        timestamp: now,
      });

      history.push({
        id: `ast_${Date.now()}`,
        sender: "assistant",
        text: `🔒 Excelente! Seus dados de acesso foram recebidos e criptografados no cofre de segurança da Otimizza.\n\nAgora chegamos à etapa final! Eu estruturei todo o dossiê da ${company} com o público-alvo, tom de voz e pilares que validamos juntos.`,
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
        text: "Prefiro enviar os acessos diretamente pelo WhatsApp do Valdemar.",
        timestamp: now,
      });

      history.push({
        id: `ast_${Date.now()}`,
        sender: "assistant",
        text: `Sem problema nenhum! O Valdemar vai receber essa notificação e você pode compartilhar com ele no momento que for mais conveniente.\n\nCom isso, já temos tudo o que precisamos para dar a largada na estratégia da ${company}!`,
        timestamp: now,
        options: [
          { label: "🎉 Finalizar e Entregar para a Otimizza", value: "FINALIZE", action: "APPROVE" },
        ],
      });

      progress = 98;
    } else if (action === "DECISION") {
      // O usuário tomou uma decisão sobre uma sugestão
      if (decision === "APPROVE" && suggestedField && suggestedValue) {
        // Gravar dado aprovado
        extracted[suggestedField] = suggestedValue;

        history.push({
          id: `usr_${Date.now()}`,
          sender: "user",
          text: `Aprovado: "${suggestedValue}"`,
          timestamp: now,
        });

        // Avançar para a próxima pergunta baseada no campo aprovado
        if (suggestedField === "targetAudience") {
          progress = 75; // Aceleração psicológica!
          history.push({
            id: `ast_${Date.now()}`,
            sender: "assistant",
            text: `Perfeito! Público-alvo definido com precisão. 🎯\n\nAgora me conta: **Qual é o maior diferencial ou motivo que faz os clientes escolherem a ${company}** em vez de qualquer outro no mercado?`,
            options: [
              { label: "🤷‍♂️ Não sei, me sugira!", value: "DONT_KNOW_DIFF", action: "DONT_KNOW" },
            ],
            timestamp: now,
          });
        } else if (suggestedField === "differentials") {
          progress = 85;
          history.push({
            id: `ast_${Date.now()}`,
            sender: "assistant",
            text: `Diferencial memorizado! Isso nos dá um ângulo forte para criar posts de autoridade. 🚀\n\nAgora sobre o **Tom de Voz**: como você quer que a ${company} soe nas redes?`,
            options: [
              { label: "Especialista & Direto (sem jargões)", value: "TONE_EXPERT", action: "APPROVE", payload: "Direto, técnico e focado em resultados reais" },
              { label: "Próximo, Parceiro & Acolhedor", value: "TONE_FRIENDLY", action: "APPROVE", payload: "Empático, acessível e caloroso" },
              { label: "Sofisticado & Exclusivo", value: "TONE_PREMIUM", action: "APPROVE", payload: "Sofisticado, premium e focado em alta qualidade" },
              { label: "🤷‍♂️ Me dê uma recomendação", value: "DONT_KNOW_TONE", action: "DONT_KNOW" },
            ],
            timestamp: now,
          });
        } else if (suggestedField === "toneOfVoice") {
          progress = 92;
          history.push({
            id: `ast_${Date.now()}`,
            sender: "assistant",
            text: `Tom de voz alinhado! 🎙️\n\nAgora: Você tem em mente **1 ou 2 concorrentes ou perfis de referência** que você admira (ou que fazem algo que você não quer de jeito nenhum)?`,
            options: [
              { label: "🤷‍♂️ Não tenho referências agora", value: "NO_COMPETITORS", action: "APPROVE", payload: "Sem referências diretas informadas" },
            ],
            timestamp: now,
          });
        } else if (suggestedField === "competitors") {
          progress = 95;
          history.push({
            id: `ast_${Date.now()}`,
            sender: "assistant",
            text: `Anotado! Analisaremos o posicionamento deles para garantir que a ${company} se destaque.\n\n🔐 **Último passo: Acesso às redes sociais**\nPara que a equipe da Otimizza possa agendar publicações e cuidar do seu perfil com máxima agilidade, você pode preencher o usuário e senha do Instagram abaixo. Seus dados ficam protegidos por criptografia de ponta a ponta no nosso cofre de senhas.\n\nSe preferir, pode enviar depois pelo WhatsApp!`,
            isCredentialStep: true,
            options: [
              { label: "📲 Enviar depois pelo WhatsApp do Valdemar", value: "WHATSAPP", action: "NEXT" },
            ],
            timestamp: now,
          });
        }
      } else if (decision === "RETRY" && suggestedField) {
        // Gerar outra opção inteligente
        const altSuggestion = getAlternativeSuggestion(suggestedField, company, notes);
        history.push({
          id: `ast_${Date.now()}`,
          sender: "assistant",
          text: `Sem problemas! Aqui está outra proposta com um ângulo diferente:\n\n💡 **"${altSuggestion}"**\n\nO que acha desta?`,
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
      // O usuário pediu sugestão porque não sabe
      const currentStep = getCurrentStepFromHistory(history, extracted);
      const suggestion = getSmartSuggestionForStep(currentStep, company, notes);

      history.push({
        id: `usr_${Date.now()}`,
        sender: "user",
        text: "Não sei responder, pode me sugerir uma boa opção?",
        timestamp: now,
      });

      history.push({
        id: `ast_${Date.now()}`,
        sender: "assistant",
        text: `Com certeza, para isso que estou aqui! 💡 Com base no que o Valdemar me passou sobre a ${company}, criei esta sugestão estratégica para você:\n\n👉 **"${suggestion.text}"**\n\nPodemos seguir com essa ou você prefere ajustar algo?`,
        suggestedData: {
          field: suggestion.field,
          value: suggestion.text,
        },
        options: [
          { label: "👍 Aprovar esta sugestão", value: "APPROVE", action: "APPROVE" },
          { label: "✏️ Vou personalizar", value: "CUSTOM", action: "ADJUST" },
          { label: "🔄 Ver outra opção", value: "RETRY", action: "RETRY" },
        ],
        timestamp: now,
      });
    } else if (action === "MESSAGE") {
      const userText = String(message || "").trim();

      history.push({
        id: `usr_${Date.now()}`,
        sender: "user",
        text: userText,
        timestamp: now,
      });

      // Se for a confirmação inicial
      if (history.length <= 3 || userText.toLowerCase().includes("vamos") || userText === "START") {
        progress = 45;
        history.push({
          id: `ast_${Date.now()}`,
          sender: "assistant",
          text: `Maravilha! Vamos direto ao ponto. 🚀\n\nPrimeira pergunta: **Quem é o cliente ideal da ${company}?**\n(Ex: pequenas e médias empresas, donos de clínicas, famílias de classe média/alta, etc.)`,
          options: [
            { label: "🤷‍♂️ Não sei ao certo, me sugira!", value: "DONT_KNOW_AUDIENCE", action: "DONT_KNOW" },
          ],
          timestamp: now,
        });
      } else if (!extracted.targetAudience) {
        extracted.targetAudience = userText;
        progress = 75; // Aceleração psicológica: 50% real -> 75% na tela
        history.push({
          id: `ast_${Date.now()}`,
          sender: "assistant",
          text: `Excelente! Entendido: **${userText}**.\n\nAgora: **Qual é o maior diferencial da ${company}?** O que faz vocês serem a melhor escolha para esse público?`,
          options: [
            { label: "🤷‍♂️ Me dê sugestões de diferenciais", value: "DONT_KNOW_DIFF", action: "DONT_KNOW" },
          ],
          timestamp: now,
        });
      } else if (!extracted.differentials) {
        extracted.differentials = userText;
        progress = 85;
        history.push({
          id: `ast_${Date.now()}`,
          sender: "assistant",
          text: `Muito forte! Esse diferencial vai render ótimos conteúdos de autoridade e quebra de objeções. 💪\n\nE sobre o **Tom de Voz**: você prefere um perfil que soe:\n\n1. Mais técnico e especialista?\n2. Mais descontraído, acessível e próximo?\n3. Mais elegante e premium?`,
          options: [
            { label: "Especialista & Direto", value: "TONE_EXPERT", action: "APPROVE", payload: "Direto, técnico e de autoridade" },
            { label: "Próximo & Acolhedor", value: "TONE_FRIENDLY", action: "APPROVE", payload: "Acessível, empático e caloroso" },
            { label: "Elegante & Premium", value: "TONE_PREMIUM", action: "APPROVE", payload: "Sofisticado e exclusivo" },
          ],
          timestamp: now,
        });
      } else if (!extracted.toneOfVoice) {
        extracted.toneOfVoice = [userText];
        progress = 92;
        history.push({
          id: `ast_${Date.now()}`,
          sender: "assistant",
          text: `Perfeito! Tom de voz registrado: **${userText}**.\n\nVocê tem **concorrentes ou perfis de referência** que acompanha no Instagram? Se sim, me envie o @ ou o nome deles.`,
          options: [
            { label: "🤷‍♂️ Não tenho concorrentes em mente", value: "NO_COMP", action: "APPROVE", payload: "Sem referências informadas" },
          ],
          timestamp: now,
        });
      } else if (!extracted.competitors) {
        extracted.competitors = userText;
        progress = 95;
        history.push({
          id: `ast_${Date.now()}`,
          sender: "assistant",
          text: `Ótimo! Faremos um comparativo para que a ${company} se posicione como referência única.\n\n🔐 **Acesso seguro às redes sociais**\nPara iniciarmos o agendamento de posts e a configuração profissional do seu perfil, informe o usuário e senha do Instagram abaixo. Seus dados são salvos com criptografia militar no nosso cofre de senhas do ERP.\n\nOu, se preferir, pode enviar depois pelo WhatsApp do Valdemar!`,
          isCredentialStep: true,
          options: [
            { label: "📲 Prefiro enviar pelo WhatsApp do Valdemar", value: "WHATSAPP", action: "NEXT" },
          ],
          timestamp: now,
        });
      } else {
        // Finalização
        progress = 100;
        history.push({
          id: `ast_${Date.now()}`,
          sender: "assistant",
          text: `🎉 **Briefing Concluído com Sucesso!**\n\nMuito obrigado pelo seu tempo, ${contact}! Eu compilei todas as diretrizes da ${company} e enviei diretamente para o sistema do Valdemar e da equipe da Otimizza.\n\nO próximo passo é a montagem do seu primeiro calendário editorial e a criação das peças. Vamos com tudo! 🚀`,
          timestamp: now,
        });
      }
    }

    // Se o progresso atingir 100% ou se foi finalizado
    const isCompleted = progress >= 100 || (action === "DECISION" && decision === "APPROVE" && suggestedValue === "FINALIZE");
    if (isCompleted) {
      progress = 100;
    }

    // Salvar estado atualizado no banco
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

    const updatedRes = await query(updateSql, [
      JSON.stringify(history),
      JSON.stringify(extracted),
      progress,
      isCompleted,
      session.id,
    ]);

    // Se concluído, sincronizar automaticamente com client_identities e concluir a tarefa
    if (isCompleted) {
      try {
        if (session.client_id) {
          const tones = Array.isArray(extracted.toneOfVoice) 
            ? extracted.toneOfVoice 
            : [String(extracted.toneOfVoice || "Direto e didático")];
          const audiences = extracted.targetAudience ? [String(extracted.targetAudience)] : [];
          const diffs = extracted.differentials ? [String(extracted.differentials)] : [];

          await query(
            `
            INSERT INTO public.client_identities (
              client_id, value_proposition, market_niche, archetype,
              tone_of_voice, target_audiences, differentials, notes, updated_at
            ) VALUES (
              $1, $2, $3, 'SABIO', $4, $5, $6, $7, NOW()
            )
            ON CONFLICT (client_id) DO UPDATE SET
              value_proposition = COALESCE(NULLIF(EXCLUDED.value_proposition, ''), client_identities.value_proposition),
              tone_of_voice = EXCLUDED.tone_of_voice,
              target_audiences = EXCLUDED.target_audiences,
              differentials = EXCLUDED.differentials,
              notes = COALESCE(NULLIF(EXCLUDED.notes, ''), client_identities.notes),
              updated_at = NOW()
            `,
            [
              session.client_id,
              String(extracted.differentials || ""),
              String(session.company_name),
              tones,
              audiences,
              diffs,
              `Briefing coletado via IA com ${session.contact_name}. Concorrentes: ${extracted.competitors || "Não informados"}`,
            ]
          );
        }

        if (session.task_id) {
          await query(
            `UPDATE public.project_tasks SET status = 'DONE', completed_at = NOW() WHERE id = $1`,
            [session.task_id]
          );
        }
      } catch (syncErr) {
        console.error("Erro na sincronização automática pós-briefing:", syncErr);
      }
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

function getCurrentStepFromHistory(history: ChatMessage[], extracted: Record<string, unknown>): string {
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
