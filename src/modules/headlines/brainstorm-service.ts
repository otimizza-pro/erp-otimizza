import { query, withTransaction } from "@/lib/db/pool";
import { loadAiClientContext } from "@/lib/ai/client-context";
import { generateWithOpenRouter, strategyModel, parseAiJson, GLOBAL_HUMANIZATION_RULES } from "@/lib/ai/openrouter";
import { z } from "zod";

export interface BrainstormIdea {
  id: string;
  client_id: string;
  pillar_id: string | null;
  editorial_line_id: string | null;
  pillar_name: string;
  theme_name: string;
  title: string;
  angle: string;
  format: string;
  target_audience: string;
  pain_or_desire: string;
  goal: string;
  rationale: string;
  status: "IDEA" | "SAVED_FOR_LATER" | "REJECTED" | "HEADLINES_IN_PROGRESS" | "HEADLINE_CHOSEN" | "IN_CREATION" | "DONE" | "ARCHIVED";
  rejection_reason?: string;
  workspace_id: string | null;
  content_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PillarWithLines {
  id: string;
  name: string;
  lines: {
    id: string;
    theme: string;
    objective: string | null;
    preferred_formats: string[];
  }[];
}

export async function listPillarsAndLines(clientId: string): Promise<{
  pillars: { id: string; name: string }[];
  lines: { id: string; pillar_id: string | null; pillar_name: string; theme: string; objective: string | null; preferred_formats: string[] }[];
}> {
  const [pillarsRes, linesRes] = await Promise.all([
    query(
      `SELECT id, name FROM client_editorial_pillars 
       WHERE client_id = $1 AND archived_at IS NULL 
       ORDER BY name ASC`,
      [clientId]
    ),
    query(
      `SELECT id, pillar_id, pillar_name, theme, objective, preferred_formats 
       FROM client_editorial_lines 
       WHERE client_id = $1 AND is_active = true AND archived_at IS NULL 
       ORDER BY pillar_name ASC, theme ASC`,
      [clientId]
    ),
  ]);

  return {
    pillars: pillarsRes.rows as { id: string; name: string }[],
    lines: linesRes.rows as { id: string; pillar_id: string | null; pillar_name: string; theme: string; objective: string | null; preferred_formats: string[] }[],
  };
}

export async function listBrainstormIdeas(
  clientId: string,
  filters?: { pillarId?: string; format?: string; status?: string; includeRejected?: boolean }
): Promise<BrainstormIdea[]> {
  const conditions: string[] = ["client_id = $1"];
  const params: unknown[] = [clientId];

  if (filters?.pillarId) {
    params.push(filters.pillarId);
    conditions.push(`pillar_id = $${params.length}`);
  }
  if (filters?.format && filters.format !== "ALL") {
    params.push(filters.format);
    conditions.push(`format = $${params.length}`);
  }
  if (filters?.status && filters.status !== "ALL") {
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  } else if (!filters?.includeRejected) {
    conditions.push(`status != 'REJECTED'`);
  }

  const sql = `
    SELECT * FROM content_brainstorm_ideas
    WHERE ${conditions.join(" AND ")}
    ORDER BY created_at DESC
  `;

  const res = await query(sql, params);
  return res.rows as BrainstormIdea[];
}

export async function listRejectedIdeas(clientId: string): Promise<BrainstormIdea[]> {
  const res = await query(
    `SELECT * FROM content_brainstorm_ideas
     WHERE client_id = $1 AND status = 'REJECTED'
     ORDER BY updated_at DESC`,
    [clientId]
  );
  return res.rows as BrainstormIdea[];
}

const aiIdeaSchema = z.object({
  title: z.string().min(1).max(1000),
  pillar_name: z.string().max(200),
  theme_name: z.string().max(255),
  angle: z.string().max(200),
  format: z.string().max(100),
  target_audience: z.string().max(255),
  pain_or_desire: z.string().max(1000),
  goal: z.string().max(500),
  rationale: z.string().max(1000),
});

export async function generateBrainstormIdeas(input: {
  clientId: string;
  userId: string;
  pillarId?: string;
  editorialLineId?: string;
  direction?: string;
  count?: number;
}): Promise<Array<z.infer<typeof aiIdeaSchema> & { pillar_id?: string; editorial_line_id?: string }>> {
  const count = Math.min(Math.max(input.count || 5, 1), 10);
  const context = await loadAiClientContext(input.clientId);

  // 1. Pilares e linhas editoriais disponíveis
  const { pillars, lines } = await listPillarsAndLines(input.clientId);

  // 2. Conteúdos recentes para evitar repetições
  const recentPosts = await query(
    `SELECT title, central_idea FROM content_calendar_items 
     WHERE client_id = $1 AND archived_at IS NULL 
     ORDER BY created_at DESC LIMIT 25`,
    [input.clientId]
  );

  // 3. Ideias aprovadas e guardadas (estilo positivo)
  const approvedIdeas = await query(
    `SELECT title, angle, format, pillar_name, theme_name 
     FROM content_brainstorm_ideas 
     WHERE client_id = $1 AND status IN ('SAVED_FOR_LATER', 'HEADLINES_IN_PROGRESS', 'HEADLINE_CHOSEN', 'IN_CREATION', 'DONE') 
     ORDER BY updated_at DESC LIMIT 15`,
    [input.clientId]
  );

  // 4. Lista negra de ideias rejeitadas (anti-exemplos obrigatórios)
  const rejectedIdeas = await query(
    `SELECT title, angle, format, pillar_name, theme_name, rejection_reason 
     FROM content_brainstorm_ideas 
     WHERE client_id = $1 AND status = 'REJECTED' 
     ORDER BY updated_at DESC LIMIT 25`,
    [input.clientId]
  );

  const targetPillar = input.pillarId ? pillars.find((p) => p.id === input.pillarId) : null;
  const targetLine = input.editorialLineId ? lines.find((l) => l.id === input.editorialLineId) : null;

  const systemPrompt = `Você é um estrategista de conteúdo sênior e diretor criativo de social media.
Sua missão é fazer um BRAINSTORM DE CONTEÚDO para a empresa cliente, gerando temas e ideias de pautas para os próximos posts ANTES da criação de headlines.

${GLOBAL_HUMANIZATION_RULES}

DIRETRIZES FUNDAMENTAIS:
1. NÃO gere apenas títulos genéricos ou clickbaits. Gere TEMAS e IDEIAS DE CONTEÚDO substanciais, com ângulo específico e abordagem clara.
2. Cada ideia DEVE estar estritamente ancorada nos Pilares Estratégicos e Assuntos/Linhas Editoriais da empresa.
3. Use os públicos-alvo, dores e desejos reais cadastrados no DNA do cliente. Não invente públicos ou dados irreais.
4. DIVERSIFIQUE os formatos (Carrossel, Reels, Post estático, Stories) e ângulos (ex: "Erro comum", "Passo a passo", "Mito desmentido", "Estudo de caso", "Checklist", "Visão de bastidores").
5. EVITE REPETIÇÕES com os conteúdos já produzidos recentemente.
6. APRENDIZADO CONTÍNUO COM FEEDBACK DO CLIENTE:
   - Se houver exemplos de ideias que o cliente aprovou/guardou, use-os como referência de profundidade, vocabulário e preferências temáticas.
   - SE HOUVER LISTA NEGRA DE IDEIAS REJEITADAS: É TERMINANTEMENTE PROIBIDO sugerir temas parecidos, abordar os mesmos assuntos descartados ou usar os mesmos ângulos reprovados.
7. Retorne SOMENTE um array JSON com exatamente ${count} objetos. Cada objeto deve conter:
   - title: Tema/ideia central concreta e instigante do próximo conteúdo (ex: "Os 3 erros silenciosos no controle de caixa que drenam o lucro da loja")
   - pillar_name: Nome do pilar estratégico correspondente
   - theme_name: Nome do assunto/linha editorial correspondente
   - angle: Ângulo/abordagem (ex: "Erro Comum", "Passo a Passo Prático", "Mito vs Realidade", "Estudo de Caso")
   - format: Formato sugerido ("Carrossel", "Reels", "Post estático", "Stories")
   - target_audience: Público-alvo ao qual se destina (dos cadastrados)
   - pain_or_desire: A dor específica que o conteúdo alivia ou o desejo que ele ativa
   - goal: Objetivo da peça (ex: Educar, Quebrar Objeção, Atrair, Vender, Engajar)
   - rationale: Por que este tema funciona agora e gera identificação imediata com o público`;

  const userContent = JSON.stringify({
    empresa: {
      nome: context.company.name,
      posicionamento: context.identity.value_proposition,
      diferenciais: context.identity.differentials,
      tom_de_voz: context.identity.tone_of_voice,
      publicos_cadastrados: context.audiences.map((a) => ({
        nome: a.name,
        dores: a.pain_points,
        desejos: a.desires,
        objecoes: a.objections,
      })),
    },
    pilares_disponiveis: pillars.map((p) => p.name),
    linhas_editoriais_cadastradas: lines.map((l) => ({
      pilar: l.pillar_name,
      assunto: l.theme,
      objetivo: l.objective,
    })),
    foco_solicitado: {
      pilar_selecionado: targetPillar?.name || "Todos os pilares / distribuir equilibradamente",
      assunto_especifico: targetLine?.theme || "Livre dentro dos pilares",
      direcionamento_do_usuario: input.direction || "Gere as melhores ideias estratégicas para o momento atual",
    },
    ultimos_conteudos_publicados: recentPosts.rows.map((r) => r.title || r.central_idea),
    historico_ideias_aprovadas_estilo: approvedIdeas.rows.map((r) => ({
      tema: r.title,
      pilar: r.pillar_name,
      assunto: r.theme_name,
      angulo: r.angle,
      formato: r.format,
    })),
    lista_negra_ideias_rejeitadas_PROIBIDAS: rejectedIdeas.rows.map((r) => ({
      tema_reprovado: r.title,
      pilar: r.pillar_name,
      angulo: r.angle,
      motivo: r.rejection_reason || "Rejeitado pelo cliente",
    })),
  });

  const response = await generateWithOpenRouter({
    model: strategyModel(),
    maxTokens: 4000,
    temperature: 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });

  const parsed = parseAiJson(response.text, z.array(aiIdeaSchema));

  return parsed.map((idea) => {
    const matchedPillar = pillars.find(
      (p) => p.name.toLowerCase().trim() === idea.pillar_name.toLowerCase().trim()
    ) || targetPillar || pillars[0];

    const matchedLine = lines.find(
      (l) => l.theme.toLowerCase().trim() === idea.theme_name.toLowerCase().trim()
    ) || targetLine || lines[0];

    return {
      ...idea,
      pillar_name: matchedPillar?.name || idea.pillar_name,
      pillar_id: matchedPillar?.id,
      theme_name: matchedLine?.theme || idea.theme_name,
      editorial_line_id: matchedLine?.id,
    };
  });
}

export async function saveBrainstormIdea(input: {
  clientId: string;
  userId: string;
  title: string;
  pillarId?: string | null;
  editorialLineId?: string | null;
  pillarName?: string;
  themeName?: string;
  angle?: string;
  format?: string;
  targetAudience?: string;
  painOrDesire?: string;
  goal?: string;
  rationale?: string;
  status?: BrainstormIdea["status"];
  rejectionReason?: string;
}): Promise<BrainstormIdea> {
  const statusToUse = input.status || "SAVED_FOR_LATER";

  const res = await query(
    `INSERT INTO content_brainstorm_ideas (
      client_id, pillar_id, editorial_line_id, pillar_name, theme_name,
      title, angle, format, target_audience, pain_or_desire, goal, rationale,
      status, rejection_reason, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      input.clientId,
      input.pillarId || null,
      input.editorialLineId || null,
      input.pillarName || "",
      input.themeName || "",
      input.title.trim(),
      input.angle || "Abordagem Prática",
      input.format || "Carrossel",
      input.targetAudience || "",
      input.painOrDesire || "",
      input.goal || "",
      input.rationale || "",
      statusToUse,
      input.rejectionReason || "",
      input.userId,
    ]
  );

  return res.rows[0] as BrainstormIdea;
}

export async function rejectBrainstormIdea(ideaId: string, reason?: string): Promise<void> {
  await query(
    `UPDATE content_brainstorm_ideas 
     SET status = 'REJECTED', rejection_reason = $2, updated_at = NOW() 
     WHERE id = $1`,
    [ideaId, reason || "Rejeitado no brainstorm"]
  );
}

export async function restoreBrainstormIdea(ideaId: string): Promise<void> {
  await query(
    `UPDATE content_brainstorm_ideas 
     SET status = 'SAVED_FOR_LATER', rejection_reason = '', updated_at = NOW() 
     WHERE id = $1`,
    [ideaId]
  );
}

export async function deleteBrainstormIdea(ideaId: string): Promise<void> {
  await query(`DELETE FROM content_brainstorm_ideas WHERE id = $1`, [ideaId]);
}

export async function convertIdeaToHeadlines(
  ideaId: string,
  userId: string
): Promise<{ workspaceId: string; contentId: string }> {
  return withTransaction(async (db) => {
    // 1. Busca a ideia
    const ideaRes = await db.query(`SELECT * FROM content_brainstorm_ideas WHERE id = $1 FOR UPDATE`, [ideaId]);
    if (!ideaRes.rowCount) throw new Error("Ideia de brainstorm não encontrada.");
    const idea = ideaRes.rows[0];

    // Formato normalizado
    const calendarFormat =
      idea.format === "Reels"
        ? "Reels"
        : idea.format === "Carrossel"
        ? "Carrossel"
        : idea.format === "Stories"
        ? "Stories"
        : "Post estático";

    const headlineBriefFormat =
      idea.format === "Reels"
        ? "Reels"
        : idea.format === "Carrossel"
        ? "Carrossel"
        : idea.format === "Stories"
        ? "Stories"
        : "Estático";

    let contentId = idea.content_id;

    // 2. Se não existir peça no calendário, cria
    if (!contentId) {
      const contentRes = await db.query(
        `INSERT INTO content_calendar_items (
          client_id, editorial_line_id, title, central_idea,
          format, target_audience_name, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'IN_CREATION')
        RETURNING id`,
        [
          idea.client_id,
          idea.editorial_line_id || null,
          idea.title.slice(0, 80),
          idea.title,
          calendarFormat,
          idea.target_audience || null,
        ]
      );
      contentId = contentRes.rows[0].id;
    }

    // 3. Monta o briefing inicial para o laboratório de headlines
    const initialBrief = {
      bigIdea: idea.title,
      themeId: idea.editorial_line_id || "",
      format: headlineBriefFormat,
      audience: idea.target_audience || "",
      pain: idea.pain_or_desire || "",
      goal: idea.goal || "",
      angles: idea.angle ? [idea.angle] : ["Benefício direto"],
      structures: ["Curiosidade", "Pergunta provocativa"],
      triggers: ["Autoridade", "Novidade"],
      maxCharacters: 150,
      creativity: "Equilibrada",
      intensity: "Moderada",
      awareness: "Problema consciente",
      channel: "Instagram",
      placement: "Feed",
      length: "Média",
    };

    // 4. Cria ou localiza o workspace de headline
    let workspaceId = idea.workspace_id;
    const existingWs = await db.query(
      `SELECT id FROM headline_workspaces WHERE content_id = $1`,
      [contentId]
    );

    if (existingWs.rowCount) {
      workspaceId = existingWs.rows[0].id;
      await db.query(
        `UPDATE headline_workspaces SET brief = brief || $2::jsonb, updated_at = NOW() WHERE id = $1`,
        [workspaceId, JSON.stringify(initialBrief)]
      );
    } else {
      const wsRes = await db.query(
        `INSERT INTO headline_workspaces (client_id, user_id, content_id, brief)
         VALUES ($1, $2, $3, $4::jsonb)
         RETURNING id`,
        [idea.client_id, userId, contentId, JSON.stringify(initialBrief)]
      );
      workspaceId = wsRes.rows[0].id;
    }

    // 5. Atualiza o status da ideia
    await db.query(
      `UPDATE content_brainstorm_ideas 
       SET content_id = $1, workspace_id = $2, status = 'HEADLINES_IN_PROGRESS', updated_at = NOW()
       WHERE id = $3`,
      [contentId, workspaceId, ideaId]
    );

    return {
      workspaceId,
      contentId,
    };
  });
}
