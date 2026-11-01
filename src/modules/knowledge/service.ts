import { query, withTransaction } from "@/lib/db/pool";
import {
  KnowledgePage,
  KnowledgePageTreeNode,
  KnowledgePageVersion,
  KnowledgeInfoType,
  CreateKnowledgePageDTO,
  UpdateKnowledgePageDTO,
  PublicKnowledgePage,
  ConsolidatedKnowledgeDocument
} from "./types";
import { sanitizeKnowledgeHtml, htmlToMarkdown } from "./sanitizer";

/**
 * Converte string para slug url-friendly
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .substring(0, 100);
}

/**
 * Semeia a estrutura inicial de 9 páginas como rascunho com orientações neutras,
 * caso o módulo esteja recém-instalado e sem registros.
 */
export async function ensureInitialStructure(): Promise<void> {
  const countRes = await query<{ count: string }>(`SELECT COUNT(*)::text as count FROM knowledge_pages`);
  if (parseInt(countRes.rows[0]?.count || "0", 10) > 0) {
    return;
  }

  const initialPages = [
    {
      title: "Essência da marca",
      slug: "essencia-da-marca",
      order: 1,
      summary: "Missão, visão, valores e princípios fundamentais que guiam a empresa.",
      contentHtml: `<h1>Essência da marca</h1><p>Espaço reservado para documentar a essência da marca Otimizza: o propósito de atuação da organização, os valores inegociáveis e os princípios fundamentais que norteiam todas as decisões internas e relacionamentos com clientes e parceiros.</p><hr><h2>Diretrizes para preenchimento</h2><ul><li>Qual é a missão fundamental da empresa?</li><li>Quais são os 3 a 5 valores essenciais praticados no dia a dia?</li><li>Qual é a visão de longo prazo para a marca e o produto?</li></ul>`
    },
    {
      title: "Posicionamento e diferenciais",
      slug: "posicionamento-e-diferenciais",
      order: 2,
      summary: "Como a Otimizza se posiciona no mercado e quais são seus diferenciais estratégicos.",
      contentHtml: `<h1>Posicionamento e diferenciais</h1><p>Espaço reservado para registrar a proposta de valor única da Otimizza no mercado de gestão empresarial e financeira, destacando seus diferenciais competitivos e a categoria onde a marca busca liderança.</p><hr><h2>Diretrizes para preenchimento</h2><ul><li>Em qual categoria de mercado a Otimizza atua?</li><li>Quais dores centrais o cliente resolve com a Otimizza que concorrentes não atendem bem?</li><li>Quais são os diferenciais operacionais e tecnológicos da solução?</li></ul>`
    },
    {
      title: "Público e perfis de clientes",
      slug: "publico-e-perfis-de-clientes",
      order: 3,
      summary: "Segmentos de clientes atendidos, perfil de cliente ideal (ICP) e personas.",
      contentHtml: `<h1>Público e perfis de clientes</h1><p>Espaço reservado para mapear os segmentos de empresas e tomadores de decisão aos quais as soluções da Otimizza se destinam com maior aderência e retorno sobre investimento.</p><hr><h2>Diretrizes para preenchimento</h2><ul><li>Qual é o Perfil de Cliente Ideal (ICP): faturamento, porte e maturidade de gestão?</li><li>Quem é o tomador de decisão e quem é o usuário operacional?</li><li>Quais desafios recorrentes esse público enfrenta na gestão diária?</li></ul>`
    },
    {
      title: "Serviços e ofertas",
      slug: "servicos-e-ofertas",
      order: 4,
      summary: "Estrutura do portfólio de produtos, serviços, combos e modelos de contratação.",
      contentHtml: `<h1>Serviços e ofertas</h1><p>Espaço reservado para detalhar a proposta comercial e o modelo de entrega de serviços e produtos do catálogo da Otimizza.</p><hr><h2>Diretrizes para preenchimento</h2><ul><li>Quais são os principais módulos e serviços disponibilizados?</li><li>Como se estruturam as modalidades de contratação (mensalidades recorrentes, projetos avulsos)?</li><li>Quais são as políticas comerciais e pacotes estratégicos (combos)?</li></ul>`
    },
    {
      title: "Tom de voz e comunicação",
      slug: "tom-de-voz-e-comunicacao",
      order: 5,
      summary: "Diretrizes de comunicação, vocabulário recomendado e tom nos pontos de contato.",
      contentHtml: `<h1>Tom de voz e comunicação</h1><p>Espaço reservado para definir a personalidade da comunicação da marca com o mercado, prospects e clientes.</p><hr><h2>Diretrizes para preenchimento</h2><ul><li>A comunicação é direta, consultiva, técnica ou didática?</li><li>Quais termos e expressões devem ser reforçados e quais devem ser evitados?</li><li>Como tratar objeções e dúvidas com clareza e credibilidade?</li></ul>`
    },
    {
      title: "Identidade visual",
      slug: "identidade-visual",
      order: 6,
      summary: "Diretrizes visuais da marca, paleta de cores, tipografia e boas práticas de aplicação.",
      contentHtml: `<h1>Identidade visual</h1><p>Espaço reservado para orientações sobre a aplicação correta dos elementos visuais da Otimizza em interfaces, relatórios, propostas comerciais e documentos.</p><hr><h2>Diretrizes para preenchimento</h2><ul><li>Cores primárias e complementares da marca.</li><li>Tipografia padrão para títulos, textos e dados analíticos.</li><li>Diretrizes de aplicação de logomarca e contraste visual.</li></ul>`
    },
    {
      title: "Estratégia de conteúdo",
      slug: "estrategia-de-conteudo",
      order: 7,
      summary: "Pilares temáticos, canais e objetivos de conteúdo institucional e comercial.",
      contentHtml: `<h1>Estratégia de conteúdo</h1><p>Espaço reservado para registrar a metodologia e os pilares de conteúdo produzidos para atrair, educar e engajar clientes ideais.</p><hr><h2>Diretrizes para preenchimento</h2><ul><li>Quais são os principais temas abordados pela marca (ex: gestão de caixa, precificação, eficiência operacional)?</li><li>Quais canais têm prioridade (ex: documentação, artigos, materiais ricos)?</li><li>Qual é o objetivo de cada etapa de conteúdo no funil comercial?</li></ul>`
    },
    {
      title: "Objetivos e prioridades",
      slug: "objetivos-e-prioridades",
      order: 8,
      summary: "Metas de negócio, prioridades estratégicas e foco dos ciclos correntes.",
      contentHtml: `<h1>Objetivos e prioridades</h1><p>Espaço reservado para documentar os objetivos estratégicos prioritários da empresa no período atual, permitindo que IAs e equipes alinhem suas entregas.</p><hr><h2>Diretrizes para preenchimento</h2><ul><li>Quais são os 3 principais objetivos estratégicos do ciclo corrente?</li><li>Quais iniciativas têm prioridade máxima de execução?</li><li>Quais métricas chave (KPIs) medem o sucesso dessas iniciativas?</li></ul>`
    },
    {
      title: "Decisões e aprendizados",
      slug: "decisoes-e-aprendizados",
      order: 9,
      summary: "Registro histórico de decisões estratégicas tomadas, testes realizados e aprendizados.",
      contentHtml: `<h1>Decisões e aprendizados</h1><p>Espaço reservado para compilar o histórico de decisões importantes já tomadas, premissas validadas e aprendizados de negócio, evitando retrabalho e contradições com diretrizes passadas.</p><hr><h2>Diretrizes para preenchimento</h2><ul><li>Decisões estratégicas aprovadas e justificativas.</li><li>Hipóteses testadas e resultados obtidos.</li><li>O que NÃO fazer com base em aprendizados anteriores da empresa.</li></ul>`
    }
  ];

  for (const p of initialPages) {
    const textClean = p.contentHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    await query(
      `INSERT INTO knowledge_pages (
        title, slug, order_index, summary, info_type, status,
        draft_content_html, draft_content_text, draft_content_json
      ) VALUES ($1, $2, $3, $4, 'DIRECTIVE', 'DRAFT', $5, $6, $7)`,
      [
        p.title,
        p.slug,
        p.order,
        p.summary,
        p.contentHtml,
        textClean,
        JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: p.summary }] }] })
      ]
    );
  }
}

/**
 * Valida se definir `newParentId` para a página `pageId` geraria um ciclo na árvore.
 */
export async function validateNoCycle(pageId: string, newParentId: string | null): Promise<void> {
  if (!newParentId) return;
  if (pageId === newParentId) {
    throw new Error("Uma página não pode ser pai de si mesma.");
  }

  let currentId: string | null = newParentId;
  const visited = new Set<string>([pageId]);

  while (currentId) {
    if (visited.has(currentId)) {
      throw new Error("Operação inválida: criar esta relação causaria um ciclo hierárquico.");
    }
    visited.add(currentId);

    const parentRow: { rows: Array<{ parent_id: string | null }> } = await query<{ parent_id: string | null }>(
      `SELECT parent_id FROM knowledge_pages WHERE id = $1`,
      [currentId]
    );
    currentId = parentRow.rows[0]?.parent_id ?? null;
  }
}

/**
 * Retorna todas as páginas da administração (incluindo rascunhos e arquivados).
 */
export async function listAdminPages(options?: {
  status?: string;
  infoType?: string;
  search?: string;
}): Promise<KnowledgePage[]> {
  await ensureInitialStructure();

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (options?.status && options.status !== "ALL") {
    conditions.push(`p.status = $${paramIdx++}`);
    params.push(options.status);
  }

  if (options?.infoType && options.infoType !== "ALL") {
    conditions.push(`p.info_type = $${paramIdx++}`);
    params.push(options.infoType);
  }

  if (options?.search && options.search.trim().length > 0) {
    conditions.push(`(p.title ILIKE $${paramIdx} OR p.draft_content_text ILIKE $${paramIdx} OR p.slug ILIKE $${paramIdx})`);
    params.push(`%${options.search.trim()}%`);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT 
      p.*,
      parent.title as parent_title,
      (SELECT COUNT(*)::int FROM knowledge_pages c WHERE c.parent_id = p.id) as children_count
    FROM knowledge_pages p
    LEFT JOIN knowledge_pages parent ON parent.id = p.parent_id
    ${whereClause}
    ORDER BY p.parent_id NULLS FIRST, p.order_index ASC, p.title ASC
  `;

  const res = await query<KnowledgePage>(sql, params);
  return res.rows;
}

/**
 * Constrói a árvore de páginas hierárquica completa para a área administrativa.
 */
export async function getAdminPageTree(): Promise<KnowledgePageTreeNode[]> {
  const pages = await listAdminPages({ status: "ALL" });
  return buildTree(pages);
}

/**
 * Função utilitária pura para construir nós em árvore a partir de lista flat
 */
function buildTree(
  pages: KnowledgePage[],
  parentId: string | null = null,
  depth = 0,
  currentPath: string[] = []
): KnowledgePageTreeNode[] {
  const matching = pages.filter(p => p.parent_id === parentId);
  return matching.map(page => {
    const nextPath = [...currentPath, page.title];
    const children = buildTree(pages, page.id, depth + 1, nextPath);
    return {
      ...page,
      depth,
      path: nextPath,
      children
    };
  });
}

/**
 * Obtém uma página administrativa por ID.
 */
export async function getAdminPageById(id: string): Promise<KnowledgePage | null> {
  const res = await query<KnowledgePage>(
    `SELECT p.*, parent.title as parent_title
     FROM knowledge_pages p
     LEFT JOIN knowledge_pages parent ON parent.id = p.parent_id
     WHERE p.id = $1`,
    [id]
  );
  return res.rows[0] || null;
}

/**
 * Cria uma nova página na base de conhecimento.
 */
export async function createPage(dto: CreateKnowledgePageDTO, userId?: string | null): Promise<KnowledgePage> {
  let slug = dto.slug ? generateSlug(dto.slug) : generateSlug(dto.title);
  if (!slug) slug = `pagina-${Date.now()}`;

  // Prevenção de colisão de slug
  const existingSlug = await query<{ id: string }>(`SELECT id FROM knowledge_pages WHERE slug = $1`, [slug]);
  if (existingSlug.rows.length > 0) {
    slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  if (dto.parent_id) {
    const parent = await query(`SELECT id FROM knowledge_pages WHERE id = $1`, [dto.parent_id]);
    if (parent.rows.length === 0) {
      throw new Error("Página pai informada não existe.");
    }
  }

  const rawHtml = dto.draft_content_html || "<p></p>";
  const cleanHtml = sanitizeKnowledgeHtml(rawHtml);
  const textClean = cleanHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const jsonContent = dto.draft_content_json || { type: "doc", content: [{ type: "paragraph" }] };

  const insertSql = `
    INSERT INTO knowledge_pages (
      parent_id, slug, title, summary, info_type, status,
      has_unpublished_changes, order_index, tags,
      draft_content_json, draft_content_html, draft_content_text,
      last_reviewed_at, next_review_at
    ) VALUES ($1, $2, $3, $4, $5, 'DRAFT', true, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *;
  `;

  const res = await query<KnowledgePage>(insertSql, [
    dto.parent_id || null,
    slug,
    dto.title.trim(),
    dto.summary?.trim() || null,
    dto.info_type || "DIRECTIVE",
    dto.order_index ?? 0,
    dto.tags || [],
    JSON.stringify(jsonContent),
    cleanHtml,
    textClean,
    dto.last_reviewed_at || new Date().toISOString(),
    dto.next_review_at || null
  ]);

  const newPage = res.rows[0];

  // Grava versão inicial
  await query(
    `INSERT INTO knowledge_page_versions (
      page_id, version_number, title, summary, info_type,
      content_json, content_html, content_text, tags, created_by,
      change_summary
    ) VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, 'Criação inicial da página')`,
    [
      newPage.id,
      newPage.title,
      newPage.summary,
      newPage.info_type,
      JSON.stringify(jsonContent),
      cleanHtml,
      textClean,
      newPage.tags,
      userId || null
    ]
  );

  return newPage;
}

/**
 * Atualiza metadados e rascunho de uma página, com proteção contra concorrência e detecção de ciclos.
 */
export async function updatePage(
  id: string,
  dto: UpdateKnowledgePageDTO,
  userId?: string | null
): Promise<KnowledgePage> {
  const current = await getAdminPageById(id);
  if (!current) {
    throw new Error("Página não encontrada.");
  }

  // Controle de concorrência otimista (se fornecido expected_updated_at)
  if (dto.expected_updated_at) {
    const currentDate = new Date(current.updated_at).getTime();
    const expectedDate = new Date(dto.expected_updated_at).getTime();
    if (Math.abs(currentDate - expectedDate) > 2000) {
      throw new Error(
        "CONCORRÊNCIA: Esta página foi modificada em outra sessão. Atualize a página para carregar as alterações mais recentes antes de salvar."
      );
    }
  }

  // Validação de hierarquia e ciclo
  if (dto.parent_id !== undefined && dto.parent_id !== current.parent_id) {
    await validateNoCycle(id, dto.parent_id);
  }

  // Tratamento de slug e preservação de links antigos
  let slug = current.slug;
  if (dto.slug && dto.slug.trim() !== current.slug) {
    const candidate = generateSlug(dto.slug);
    if (candidate !== current.slug) {
      const clash = await query<{ id: string }>(
        `SELECT id FROM knowledge_pages WHERE slug = $1 AND id <> $2`,
        [candidate, id]
      );
      if (clash.rows.length > 0) {
        throw new Error(`O endereço (slug) "${candidate}" já está em uso por outra página.`);
      }

      // Registra o slug antigo para redirecionamento transparente
      await query(
        `INSERT INTO knowledge_page_slug_redirects (page_id, old_slug)
         VALUES ($1, $2)
         ON CONFLICT (old_slug) DO UPDATE SET page_id = EXCLUDED.page_id`,
        [id, current.slug]
      );
      slug = candidate;
    }
  }

  // Processamento de conteúdo
  const cleanHtml = dto.draft_content_html !== undefined
    ? sanitizeKnowledgeHtml(dto.draft_content_html)
    : current.draft_content_html;

  const textClean = dto.draft_content_html !== undefined
    ? cleanHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    : current.draft_content_text;

  const jsonContent = dto.draft_content_json !== undefined
    ? dto.draft_content_json
    : current.draft_content_json;

  const updateSql = `
    UPDATE knowledge_pages
    SET
      title = COALESCE($1, title),
      slug = $2,
      parent_id = $3,
      summary = $4,
      info_type = COALESCE($5, info_type),
      order_index = COALESCE($6, order_index),
      tags = COALESCE($7, tags),
      draft_content_json = $8,
      draft_content_html = $9,
      draft_content_text = $10,
      last_reviewed_at = COALESCE($11, last_reviewed_at),
      next_review_at = $12,
      has_unpublished_changes = true,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $13
    RETURNING *;
  `;

  const res = await query<KnowledgePage>(updateSql, [
    dto.title?.trim() || null,
    slug,
    dto.parent_id !== undefined ? dto.parent_id : current.parent_id,
    dto.summary !== undefined ? (dto.summary?.trim() || null) : current.summary,
    dto.info_type || null,
    dto.order_index !== undefined ? dto.order_index : null,
    dto.tags || null,
    JSON.stringify(jsonContent),
    cleanHtml,
    textClean,
    dto.last_reviewed_at || null,
    dto.next_review_at !== undefined ? dto.next_review_at : current.next_review_at,
    id
  ]);

  const updatedPage = res.rows[0];

  // Cria nova versão no histórico
  const nextVersionNum = current.version_count + 1;
  await query(
    `INSERT INTO knowledge_page_versions (
      page_id, version_number, title, summary, info_type,
      content_json, content_html, content_text, tags, created_by,
      change_summary
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Atualização de rascunho')`,
    [
      id,
      nextVersionNum,
      updatedPage.title,
      updatedPage.summary,
      updatedPage.info_type,
      JSON.stringify(jsonContent),
      cleanHtml,
      textClean,
      updatedPage.tags,
      userId || null
    ]
  );

  await query(`UPDATE knowledge_pages SET version_count = $1 WHERE id = $2`, [nextVersionNum, id]);
  return updatedPage;
}

/**
 * Publica uma página tornando o rascunho acessível externamente.
 */
export async function publishPage(id: string, userId?: string | null): Promise<KnowledgePage> {
  const current = await getAdminPageById(id);
  if (!current) throw new Error("Página não encontrada.");

  // Se tem pai, o pai precisa estar publicado para manter a coerência da árvore
  if (current.parent_id) {
    const parentRes = await query<{ status: string; title: string }>(
      `SELECT status, title FROM knowledge_pages WHERE id = $1`,
      [current.parent_id]
    );
    if (parentRes.rows[0]?.status !== "PUBLISHED") {
      throw new Error(
        `Para publicar esta subpágina, a página pai "${parentRes.rows[0]?.title}" deve estar publicada primeiro.`
      );
    }
  }

  const res = await query<KnowledgePage>(
    `UPDATE knowledge_pages
     SET
       status = 'PUBLISHED',
       has_unpublished_changes = false,
       published_content_json = draft_content_json,
       published_content_html = draft_content_html,
       published_content_text = draft_content_text,
       published_at = CURRENT_TIMESTAMP,
       published_by = $1,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *;`,
    [userId || null, id]
  );

  // Marca os arquivos anexados à página como públicos
  await query(`UPDATE knowledge_page_files SET is_published = true WHERE page_id = $1`, [id]);

  // Registra snapshot de publicação no histórico
  const nextVer = current.version_count + 1;
  await query(
    `INSERT INTO knowledge_page_versions (
      page_id, version_number, title, summary, info_type,
      content_json, content_html, content_text, tags, created_by,
      is_published_snapshot, change_summary
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, 'Publicação oficial')`,
    [
      id,
      nextVer,
      current.title,
      current.summary,
      current.info_type,
      JSON.stringify(current.draft_content_json),
      current.draft_content_html,
      current.draft_content_text,
      current.tags,
      userId || null
    ]
  );

  await query(`UPDATE knowledge_pages SET version_count = $1 WHERE id = $2`, [nextVer, id]);
  return res.rows[0];
}

/**
 * Retira uma página da publicação.
 * Em cascata atômica: retira também todos os seus descendentes da leitura externa,
 * evitando que subpáginas fiquem expostas sem pai conforme Seção 4 da especificação.
 */
export async function unpublishPage(id: string): Promise<KnowledgePage> {
  const current = await getAdminPageById(id);
  if (!current) throw new Error("Página não encontrada.");

  return await withTransaction(async (client) => {
    // 1. Coleta todos os descendentes
    const descendantsRes = await client.query<{ id: string }>(`
      WITH RECURSIVE subpages AS (
        SELECT id FROM knowledge_pages WHERE id = $1
        UNION ALL
        SELECT p.id FROM knowledge_pages p
        INNER JOIN subpages s ON s.id = p.parent_id
      )
      SELECT id FROM subpages;
    `, [id]);

    const idsToUnpublish = descendantsRes.rows.map(r => r.id);

    // 2. Retira da publicação todos os nós
    await client.query(`
      UPDATE knowledge_pages
      SET
        status = 'DRAFT',
        has_unpublished_changes = true,
        published_content_json = NULL,
        published_content_html = NULL,
        published_content_text = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($1::uuid[]);
    `, [idsToUnpublish]);

    // 3. Bloqueia os arquivos para leitura externa
    await client.query(`
      UPDATE knowledge_page_files
      SET is_published = false
      WHERE page_id = ANY($1::uuid[]);
    `, [idsToUnpublish]);

    const res = await client.query<KnowledgePage>(
      `SELECT * FROM knowledge_pages WHERE id = $1`,
      [id]
    );
    return res.rows[0];
  });
}

/**
 * Arquiva uma página (retirando ela e descendentes da publicação).
 */
export async function archivePage(id: string): Promise<KnowledgePage> {
  await unpublishPage(id);
  const res = await query<KnowledgePage>(
    `UPDATE knowledge_pages
     SET status = 'ARCHIVED', archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *;`,
    [id]
  );
  return res.rows[0];
}

/**
 * Restaura uma página arquivada como rascunho.
 */
export async function restorePage(id: string): Promise<KnowledgePage> {
  const res = await query<KnowledgePage>(
    `UPDATE knowledge_pages
     SET status = 'DRAFT', archived_at = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *;`,
    [id]
  );
  return res.rows[0];
}

/**
 * Duplica uma página como rascunho.
 */
export async function duplicatePage(id: string, userId?: string | null): Promise<KnowledgePage> {
  const original = await getAdminPageById(id);
  if (!original) throw new Error("Página não encontrada.");

  const newTitle = `${original.title} (Cópia)`;
  return await createPage(
    {
      title: newTitle,
      parent_id: original.parent_id,
      summary: original.summary,
      info_type: original.info_type,
      tags: [...original.tags],
      draft_content_json: original.draft_content_json,
      draft_content_html: original.draft_content_html,
      draft_content_text: original.draft_content_text
    },
    userId
  );
}

/**
 * Reordena ou move páginas na hierarquia.
 */
export async function movePage(id: string, newParentId: string | null, newOrderIndex: number): Promise<void> {
  await validateNoCycle(id, newParentId);
  await query(
    `UPDATE knowledge_pages
     SET parent_id = $1, order_index = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [newParentId, newOrderIndex, id]
  );
}

/**
 * Histórico de versões de uma página.
 */
export async function getPageVersions(
  pageId: string,
  page = 1,
  limit = 20
): Promise<{ versions: KnowledgePageVersion[]; total: number }> {
  const offset = (page - 1) * limit;

  const countRes = await query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM knowledge_page_versions WHERE page_id = $1`,
    [pageId]
  );
  const total = parseInt(countRes.rows[0]?.count || "0", 10);

  const res = await query<KnowledgePageVersion>(
    `SELECT v.*
     FROM knowledge_page_versions v
     WHERE v.page_id = $1
     ORDER BY v.version_number DESC
     LIMIT $2 OFFSET $3`,
    [pageId, limit, offset]
  );

  return { versions: res.rows, total };
}

/**
 * Restaura uma versão histórica como o rascunho atual da página.
 */
export async function restorePageVersion(
  pageId: string,
  versionNumber: number,
  userId?: string | null
): Promise<KnowledgePage> {
  const verRes = await query<KnowledgePageVersion>(
    `SELECT * FROM knowledge_page_versions WHERE page_id = $1 AND version_number = $2`,
    [pageId, versionNumber]
  );
  const ver = verRes.rows[0];
  if (!ver) throw new Error("Versão não encontrada.");

  return await updatePage(
    pageId,
    {
      title: ver.title,
      summary: ver.summary,
      info_type: ver.info_type,
      tags: ver.tags,
      draft_content_json: ver.content_json,
      draft_content_html: ver.content_html,
      draft_content_text: ver.content_text
    },
    userId
  );
}

// ==============================================================================
// FUNÇÕES DE LEITURA EXTERNA / PÚBLICA (SEM LOGIN)
// ==============================================================================

/**
 * Obtém a árvore de páginas estritamente públicas (publicadas e com todos os ancestrais publicados).
 */
export async function getPublicTree(): Promise<KnowledgePageTreeNode[]> {
  await ensureInitialStructure();

  // Uma página só é publicamente elegível se ela for PUBLISHED e TODOS os seus pais forem PUBLISHED
  const sql = `
    WITH RECURSIVE public_hierarchy AS (
      SELECT id, parent_id, slug, title, summary, info_type, status,
             order_index, tags, last_reviewed_at, next_review_at,
             published_content_html, published_content_text, published_at, updated_at
      FROM knowledge_pages
      WHERE parent_id IS NULL AND status = 'PUBLISHED'
      
      UNION ALL
      
      SELECT c.id, c.parent_id, c.slug, c.title, c.summary, c.info_type, c.status,
             c.order_index, c.tags, c.last_reviewed_at, c.next_review_at,
             c.published_content_html, c.published_content_text, c.published_at, c.updated_at
      FROM knowledge_pages c
      INNER JOIN public_hierarchy p ON p.id = c.parent_id
      WHERE c.status = 'PUBLISHED'
    )
    SELECT * FROM public_hierarchy
    ORDER BY parent_id NULLS FIRST, order_index ASC, title ASC;
  `;

  const res = await query<KnowledgePage>(sql);
  return buildTree(res.rows);
}

/**
 * Busca uma página pública individual por slug (ou por slug antigo via redirect).
 */
export async function getPublicPageBySlug(slug: string): Promise<{
  page: PublicKnowledgePage | null;
  redirectSlug?: string;
}> {
  await ensureInitialStructure();

  // 1. Tenta buscar direto por slug atual
  const pageRes = await query<KnowledgePage>(
    `SELECT * FROM knowledge_pages WHERE slug = $1 AND status = 'PUBLISHED'`,
    [slug]
  );

  // 2. Se não encontrou, checa na tabela de redirects antigos
  if (pageRes.rows.length === 0) {
    const redir = await query<{ old_slug: string; page_id: string; current_slug: string; status: string }>(
      `SELECT r.old_slug, r.page_id, p.slug as current_slug, p.status
       FROM knowledge_page_slug_redirects r
       JOIN knowledge_pages p ON p.id = r.page_id
       WHERE r.old_slug = $1 AND p.status = 'PUBLISHED'`,
      [slug]
    );

    if (redir.rows.length > 0) {
      return { page: null, redirectSlug: redir.rows[0].current_slug };
    }
    return { page: null };
  }

  const raw = pageRes.rows[0];

  // Verifica se todos os ancestrais estão publicados
  if (raw.parent_id) {
    const ancestorCheck = await query<{ unpub_count: string }>(`
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id, status FROM knowledge_pages WHERE id = $1
        UNION ALL
        SELECT p.id, p.parent_id, p.status FROM knowledge_pages p
        INNER JOIN ancestors a ON a.parent_id = p.id
      )
      SELECT COUNT(*)::text as unpub_count FROM ancestors WHERE status <> 'PUBLISHED';
    `, [raw.parent_id]);

    if (parseInt(ancestorCheck.rows[0]?.unpub_count || "0", 10) > 0) {
      return { page: null }; // Ancestral não publicado oculta o descendente
    }
  }

  // Monta breadcrumbs
  const breadcrumbsRes = await query<{ slug: string; title: string }>(`
    WITH RECURSIVE breadcrumbs AS (
      SELECT id, parent_id, slug, title, 1 as lvl FROM knowledge_pages WHERE id = $1
      UNION ALL
      SELECT p.id, p.parent_id, p.slug, p.title, b.lvl + 1 FROM knowledge_pages p
      INNER JOIN breadcrumbs b ON b.parent_id = p.id
    )
    SELECT slug, title FROM breadcrumbs ORDER BY lvl DESC;
  `, [raw.id]);

  // Subpáginas diretas publicadas
  const subpagesRes = await query<{ slug: string; title: string; summary: string | null; info_type: KnowledgeInfoType }>(
    `SELECT slug, title, summary, info_type
     FROM knowledge_pages
     WHERE parent_id = $1 AND status = 'PUBLISHED'
     ORDER BY order_index ASC, title ASC`,
    [raw.id]
  );

  const publicPage: PublicKnowledgePage = {
    id: raw.id,
    slug: raw.slug,
    parent_id: raw.parent_id,
    title: raw.title,
    summary: raw.summary,
    info_type: raw.info_type,
    tags: raw.tags || [],
    last_reviewed_at: raw.last_reviewed_at,
    next_review_at: raw.next_review_at,
    content_html: raw.published_content_html || "<p></p>",
    published_at: raw.published_at || raw.updated_at,
    updated_at: raw.updated_at,
    breadcrumbs: breadcrumbsRes.rows,
    subpages: subpagesRes.rows
  };

  return { page: publicPage };
}

/**
 * Busca no conteúdo público
 */
export async function searchPublicPages(term: string): Promise<Array<{
  slug: string;
  title: string;
  summary: string | null;
  info_type: string;
  snippet: string;
}>> {
  if (!term || term.trim().length < 2) return [];

  const pattern = `%${term.trim()}%`;
  const res = await query<{
    slug: string;
    title: string;
    summary: string | null;
    info_type: string;
    published_content_text: string;
  }>(
    `SELECT slug, title, summary, info_type, published_content_text
     FROM knowledge_pages
     WHERE status = 'PUBLISHED'
       AND (title ILIKE $1 OR published_content_text ILIKE $1 OR summary ILIKE $1)
     ORDER BY title ASC
     LIMIT 15`,
    [pattern]
  );

  return res.rows.map(r => {
    const text = r.published_content_text || r.summary || "";
    const idx = text.toLowerCase().indexOf(term.toLowerCase());
    const start = Math.max(0, idx - 40);
    const end = Math.min(text.length, idx + term.length + 60);
    const snippet = (start > 0 ? "..." : "") + text.substring(start, end).trim() + (end < text.length ? "..." : "");

    return {
      slug: r.slug,
      title: r.title,
      summary: r.summary,
      info_type: r.info_type,
      snippet: snippet || text.substring(0, 100)
    };
  });
}

/**
 * Coleta todo o conteúdo consolidado para /estrategia-otimizza/completo e /estrategia-otimizza/contexto.md.
 */
export async function getConsolidatedDocument(): Promise<ConsolidatedKnowledgeDocument> {
  const tree = await getPublicTree();

  // Lista flat em ordem de profundidade e índice
  const flatPages: PublicKnowledgePage[] = [];

  function flatten(nodes: KnowledgePageTreeNode[], parentBreadcrumbs: Array<{ slug: string; title: string }> = []) {
    for (const node of nodes) {
      const currentCrumb = [...parentBreadcrumbs, { slug: node.slug, title: node.title }];
      const subpages = node.children.map(c => ({
        slug: c.slug,
        title: c.title,
        summary: c.summary,
        info_type: c.info_type
      }));

      flatPages.push({
        id: node.id,
        slug: node.slug,
        parent_id: node.parent_id,
        title: node.title,
        summary: node.summary,
        info_type: node.info_type,
        tags: node.tags || [],
        last_reviewed_at: node.last_reviewed_at,
        next_review_at: node.next_review_at,
        content_html: node.published_content_html || "<p></p>",
        published_at: node.published_at || node.updated_at,
        updated_at: node.updated_at,
        breadcrumbs: currentCrumb,
        subpages
      });

      if (node.children && node.children.length > 0) {
        flatten(node.children, currentCrumb);
      }
    }
  }

  flatten(tree);

  let latestUpdate = new Date(0).toISOString();
  for (const p of flatPages) {
    if (p.updated_at > latestUpdate) latestUpdate = p.updated_at;
  }

  return {
    generated_at: new Date().toISOString(),
    last_updated_at: latestUpdate === new Date(0).toISOString() ? new Date().toISOString() : latestUpdate,
    pages_count: flatPages.length,
    tree,
    all_published_pages: flatPages
  };
}

/**
 * Gera a versão em texto puro Markdown para /estrategia-otimizza/contexto.md.
 */
export async function getConsolidatedMarkdown(): Promise<string> {
  const doc = await getConsolidatedDocument();

  const infoTypeLabels: Record<string, string> = {
    DIRECTIVE: "DIRETRIZ APROVADA",
    HYPOTHESIS: "HIPÓTESE EM AVALIAÇÃO",
    HISTORICAL: "REGISTRO HISTÓRICO"
  };

  let md = "";
  md += `# Manual Vivo da Estratégia e Identidade — Otimizza ERP\n\n`;
  md += `> **Documento Oficial de Contexto Empresarial para IA Externa**\n`;
  md += `> Gerado em: ${new Date(doc.generated_at).toLocaleString("pt-BR")}\n`;
  md += `> Última Atualização do Conteúdo Publicado: ${new Date(doc.last_updated_at).toLocaleString("pt-BR")}\n`;
  md += `> Total de Páginas Publicadas: ${doc.pages_count}\n`;
  md += `> URL Oficial: https://erp-otimizza-pearl.vercel.app/estrategia-otimizza\n\n`;

  md += `---\n\n`;
  md += `## Índice Geral da Documentação\n\n`;

  for (const page of doc.all_published_pages) {
    const indent = "  ".repeat(Math.max(0, page.breadcrumbs.length - 1));
    const typeLabel = infoTypeLabels[page.info_type] || page.info_type;
    md += `${indent}- [${page.title}](#${page.slug}) *(${typeLabel})*\n`;
  }

  md += `\n---\n\n`;

  for (const page of doc.all_published_pages) {
    const typeLabel = infoTypeLabels[page.info_type] || page.info_type;
    const breadcrumbStr = page.breadcrumbs.map(b => b.title).join(" > ");

    md += `<a id="${page.slug}"></a>\n\n`;
    md += `# ${page.title}\n\n`;
    md += `**Caminho Hierárquico:** \`${breadcrumbStr}\`  \n`;
    md += `**Tipo de Informação:** \`${typeLabel}\`  \n`;
    md += `**Link Original:** https://erp-otimizza-pearl.vercel.app/estrategia-otimizza/${page.slug}  \n`;

    if (page.last_reviewed_at) {
      md += `**Última Revisão:** ${new Date(page.last_reviewed_at).toLocaleDateString("pt-BR")}  \n`;
    }
    if (page.next_review_at) {
      md += `**Próxima Revisão Prevista:** ${new Date(page.next_review_at).toLocaleDateString("pt-BR")}  \n`;
    }
    if (page.tags && page.tags.length > 0) {
      md += `**Tags:** ${page.tags.map(t => `#${t}`).join(" ")}  \n`;
    }
    if (page.summary) {
      md += `\n> **Resumo Executivo:** ${page.summary}\n`;
    }

    md += `\n`;

    // Converte o HTML sanitizado da página para Markdown determinístico
    const pageMd = htmlToMarkdown(page.content_html);
    md += pageMd ? pageMd : "_Nenhum conteúdo publicado nesta página._";
    md += `\n\n---\n\n`;
  }

  return md;
}
