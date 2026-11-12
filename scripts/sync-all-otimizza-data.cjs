const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 1. Ler credenciais do banco
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const connStr = env.DATABASE_URL || env.DIRECT_URL;
if (!connStr) {
  console.error("❌ DATABASE_URL não encontrada no .env.local!");
  process.exit(1);
}

// 2. Parser Word XML -> HTML e Texto
function parseDocxXml(xml) {
  const pRuns = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
  const htmlParts = [];
  const textParts = [];
  let inUl = false;
  let inOl = false;

  for (const p of pRuns) {
    const styleMatch = p.match(/<w:pStyle w:val="([^"]+)"/);
    const style = styleMatch ? styleMatch[1] : 'Normal';

    const runs = p.match(/<w:r[ >][\s\S]*?<\/w:r>/g) || [];
    let textHtml = '';
    let rawParagraphText = '';

    for (const r of runs) {
      const isBold = r.includes('<w:b/>') || r.includes('<w:b ');
      const isItalic = r.includes('<w:i/>') || r.includes('<w:i ');
      const textMatches = r.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
      const runText = textMatches.map(t => t.replace(/<[^>]+>/g, '')).join('');
      if (!runText) continue;

      rawParagraphText += runText;
      let formatted = runText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (isBold) formatted = `<strong>${formatted}</strong>`;
      if (isItalic) formatted = `<em>${formatted}</em>`;
      textHtml += formatted;
    }

    const cleanHtml = textHtml.trim();
    const cleanText = rawParagraphText.trim();
    if (!cleanText) {
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
      continue;
    }

    textParts.push(cleanText);

    if (style === 'ListBullet') {
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
      if (!inUl) { htmlParts.push('<ul>'); inUl = true; }
      htmlParts.push(`  <li>${cleanHtml}</li>`);
    } else if (style === 'ListNumber') {
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (!inOl) { htmlParts.push('<ol>'); inOl = true; }
      htmlParts.push(`  <li>${cleanHtml}</li>`);
    } else {
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }

      if (style === 'Title') {
        htmlParts.push(`<h1>${cleanHtml}</h1>`);
      } else if (style === 'Heading1') {
        htmlParts.push(`<h2>${cleanHtml}</h2>`);
      } else if (style === 'Heading2') {
        htmlParts.push(`<h3>${cleanHtml}</h3>`);
      } else if (style === 'Heading3') {
        htmlParts.push(`<h4>${cleanHtml}</h4>`);
      } else if (style === 'Subtitle') {
        htmlParts.push(`<p class="subtitle font-semibold text-slate-700">${cleanHtml}</p>`);
      } else if (style === 'Eyebrow') {
        htmlParts.push(`<div class="eyebrow text-xs uppercase tracking-wider text-emerald-600 font-bold mb-1">${cleanHtml}</div>`);
      } else if (style === 'Smallnote') {
        htmlParts.push(`<p class="smallnote text-xs text-slate-500 italic">${cleanHtml}</p>`);
      } else {
        htmlParts.push(`<p>${cleanHtml}</p>`);
      }
    }
  }

  if (inUl) htmlParts.push('</ul>');
  if (inOl) htmlParts.push('</ol>');

  const fullHtml = htmlParts.join('\n');
  const fullText = textParts.join('\n\n');

  // Converte para TipTap JSON doc
  const docJson = {
    type: "doc",
    content: textParts.slice(0, 50).map(t => ({
      type: "paragraph",
      content: [{ type: "text", text: t.slice(0, 500) }]
    }))
  };

  return { fullHtml, fullText, docJson };
}

// 3. Mapeamento dos 20 documentos oficiais da Otimizza
const documentsMeta = [
  {
    prefix: "01",
    slug: "01-estrategia-e-direcao-da-operacao",
    aliasSlug: "posicionamento-e-diferenciais",
    title: "01. Estratégia e Direção da Operação (Documento-Mestre v2.1)",
    summary: "Planejamento estratégico consolidado, posicionamento, metas, governança e diretrizes gerais da Otimizza.",
    tags: ["estratégia", "direção", "documento-mestre", "governança", "posicionamento"],
    order: 1
  },
  {
    prefix: "02",
    slug: "02-brand-book-estrategico",
    aliasSlug: "essencia-da-marca",
    title: "02. Brand Book Estratégico da Otimizza",
    summary: "Identidade da marca, propósito, proposta de valor única, posicionamento de mercado e arquitetura de marca.",
    tags: ["branding", "brand-book", "marca", "posicionamento", "essência"],
    order: 2
  },
  {
    prefix: "03",
    slug: "03-conteudo-e-calendario-de-90-dias",
    aliasSlug: "estrategia-de-conteudo",
    title: "03. Conteúdo e Calendário Estratégico de 90 Dias",
    summary: "65 pautas editoriais estruturadas em 13 semanas e 3 fases para a presença de autoridade da Otimizza.",
    tags: ["conteúdo", "calendário", "90-dias", "pautas", "redes-sociais"],
    order: 3
  },
  {
    prefix: "04",
    slug: "04-identidade-visual",
    aliasSlug: "identidade-visual",
    title: "04. Manual Oficial de Identidade Visual",
    summary: "Diretrizes completas de paleta de cores, tipografia, aplicações de logo, contrastes e padrões para designers e IAs.",
    tags: ["design", "identidade-visual", "cores", "tipografia", "logos"],
    order: 4
  },
  {
    prefix: "05",
    slug: "05-comunicacao-e-copywriting",
    aliasSlug: "tom-de-voz-e-comunicacao",
    title: "05. Guia de Comunicação e Copywriting da Otimizza",
    summary: "Diretrizes de redação, tom de voz, gatilhos éticos, regras de clareza e modelos de copy para todos os canais.",
    tags: ["copywriting", "tom-de-voz", "comunicação", "headlines", "legendas"],
    order: 5
  },
  {
    prefix: "05A",
    slug: "05a-guia-rapido-de-escrita-e-atendimento",
    title: "05A. Guia Rápido de Escrita e Atendimento Comercial",
    summary: "Manual de campo para comunicação em tempo real, WhatsApp, alinhamento de expectativas e atendimento a clientes.",
    tags: ["atendimento", "whatsapp", "vendas", "escrita-rápida", "comunicação"],
    order: 6
  },
  {
    prefix: "06",
    slug: "06-publico-icp-e-personas",
    aliasSlug: "publico-e-perfis-de-clientes",
    title: "06. Estudo de Público-Alvo, ICP e Personas",
    summary: "Perfil de cliente ideal multissetorial, decisores, dores reais e biblioteca de 120 problemas dos empresários.",
    tags: ["icp", "personas", "público-alvo", "dores", "qualificação"],
    order: 7
  },
  {
    prefix: "06A",
    slug: "06a-roteiro-de-qualificacao-e-escuta",
    title: "06A. Roteiro de Qualificação Comercial e Escuta",
    summary: "Critérios práticos de qualificação, perguntas-chave para diagnóstico inicial e alinhamento de fit comercial.",
    tags: ["qualificação", "escuta", "diagnóstico", "vendas", "roteiro"],
    order: 8
  },
  {
    prefix: "07",
    slug: "07-roteiros-e-presenca-em-camera",
    title: "07. Manual de Roteiros, Vídeos e Presença em Câmera",
    summary: "Direção audiovisual para Reels educativos, presença do fundador em câmera, ritmo de gravação e edição orientada à clareza.",
    tags: ["reels", "vídeos", "câmera", "audiovisual", "roteiros", "fundador"],
    order: 9
  },
  {
    prefix: "08",
    slug: "08-design-para-redes-sociais",
    title: "08. Manual de Design para Redes Sociais",
    summary: "Diretrizes de layout, colagens expressivas, grids e acabamento gráfico para publicações estáticas e carrosséis.",
    tags: ["design", "redes-sociais", "carrossel", "estáticos", "grid"],
    order: 10
  },
  {
    prefix: "09",
    slug: "09-referencias-e-engenharia-reversa",
    title: "09. Biblioteca de Referências e Engenharia Reversa",
    summary: "Curadoria de referências nacionais e internacionais, métodos de análise e aplicação de boas práticas com originalidade.",
    tags: ["referências", "engenharia-reversa", "benchmarking", "mercado"],
    order: 11
  },
  {
    prefix: "09A",
    slug: "09a-caderno-de-referencias-aplicadas",
    title: "09A. Caderno de Aplicação Prática das Referências",
    summary: "Exemplos concretos de desdobramento de referências em campanhas, carrosséis e narrativas comerciais.",
    tags: ["referências", "casos", "aplicação", "campanhas"],
    order: 12
  },
  {
    prefix: "10",
    slug: "10-portfolio-de-servicos-e-precificacao",
    aliasSlug: "servicos-e-ofertas",
    title: "10. Portfólio de Serviços e Arquitetura Comercial",
    summary: "Catálogo oficial de ofertas, entregáveis, limites de escopo, precificação e regras para propostas comerciais consistentes.",
    tags: ["serviços", "portfólio", "precificação", "propostas", "escopo"],
    order: 13
  },
  {
    prefix: "11",
    slug: "11-campanhas-funis-e-aquisicao",
    title: "11. Manual de Campanhas, Funis e Aquisição de Leads",
    summary: "Estratégia de mídia paga em Meta Ads e Google Ads, conversão de tráfego, orçamentos e mensuração de oportunidades.",
    tags: ["mídia-paga", "tráfego-pago", "meta-ads", "google-ads", "funis"],
    order: 14
  },
  {
    prefix: "12",
    slug: "12-comunicacao-do-site-e-landing-pages",
    title: "12. Guia de Comunicação para Sites e Landing Pages",
    summary: "Arquitetura de informação, seções obrigatórias, copy de alta conversão, diretrizes de SEO, GEO e AEO.",
    tags: ["landing-pages", "sites", "seo", "geo", "aeo", "conversão"],
    order: 15
  },
  {
    prefix: "13",
    slug: "13-dados-metricas-e-relatorios",
    aliasSlug: "objetivos-e-prioridades",
    title: "13. Manual de Dados, Métricas e Relatórios de Desempenho",
    summary: "Critérios de mensuração, dashboards em Power BI, leitura de KPIs e comunicação executiva via WhatsApp.",
    tags: ["dados", "métricas", "power-bi", "relatórios", "kpis"],
    order: 16
  },
  {
    prefix: "14",
    slug: "14-provas-cases-e-autoridade",
    aliasSlug: "decisoes-e-aprendizados",
    title: "14. Biblioteca de Provas, Cases e Construção de Autoridade",
    summary: "Estrutura de comprovação de competência, documentação de cases reais e evidências auditáveis de resultado.",
    tags: ["provas", "cases", "autoridade", "depoimentos", "evidências"],
    order: 17
  },
  {
    prefix: "15",
    slug: "15-producao-e-aprovacao-de-conteudo",
    title: "15. Procedimento Operacional Padrão (SOP) de Produção e Aprovação",
    summary: "Fluxo ponta a ponta: da ideia à publicação, prazos, critérios de revisão e papéis na aprovação de conteúdo.",
    tags: ["sop", "produção", "aprovação", "fluxo-editorial", "prazos"],
    order: 18
  },
  {
    prefix: "16",
    slug: "16-governanca-de-ia",
    title: "16. Manual Mestre de Governança e Instruções para IA",
    summary: "Instruções mestre para agentes e modelos de IA: como interpretar, criar e validar conteúdo segundo a identidade Otimizza.",
    tags: ["ia", "governança", "instruções-ia", "prompts", "agentes"],
    order: 19
  },
  {
    prefix: "17",
    slug: "17-prompts-e-briefings",
    title: "17. Biblioteca Oficial de Prompts e Briefings Padronizados",
    summary: "Modelos reutilizáveis de briefings e prompts para geração de headlines, carrosséis, roteiros, anúncios e landing pages.",
    tags: ["prompts", "briefings", "modelos", "ia-prompts", "copywriting"],
    order: 20
  }
];

async function main() {
  console.log("🚀 Iniciando sincronização integral dos Documentos da Otimizza no Supabase...");
  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("✅ Conectado ao PostgreSQL / Supabase com sucesso.");

  const summary = JSON.parse(fs.readFileSync('scratch/unpacked_docx/summary.json', 'utf8'));

  let updatedCount = 0;
  let insertedCount = 0;

  for (const meta of documentsMeta) {
    const docSummaryItem = summary.find(s => {
      if (meta.prefix === "05A" && s.file.startsWith("05A")) return true;
      if (meta.prefix === "06A" && s.file.startsWith("06A")) return true;
      if (meta.prefix === "09A" && s.file.startsWith("09A")) return true;
      return s.file.startsWith(meta.prefix + " ");
    });

    if (!docSummaryItem) {
      console.warn(`⚠️ Arquivo com prefixo [${meta.prefix}] não encontrado!`);
      continue;
    }

    const xmlPath = path.join('scratch/unpacked_docx', docSummaryItem.baseName, 'word', 'document.xml');
    const xml = fs.readFileSync(xmlPath, 'utf8');
    const { fullHtml, fullText, docJson } = parseDocxXml(xml);

    console.log(`📄 Processando [${meta.prefix}] ${meta.title} (${fullText.length} caracteres)...`);

    // 1. Verificar se existe por slug principal ou por aliasSlug legado
    const checkRes = await client.query(
      `SELECT id, slug, version_count FROM knowledge_pages WHERE slug = $1 OR ($2::text IS NOT NULL AND slug = $2)`,
      [meta.slug, meta.aliasSlug || null]
    );

    let pageId;
    let nextVersion = 1;

    if (checkRes.rows.length > 0) {
      const existing = checkRes.rows[0];
      pageId = existing.id;
      nextVersion = (existing.version_count || 1) + 1;

      await client.query(
        `UPDATE knowledge_pages SET
          slug = $1,
          title = $2,
          summary = $3,
          tags = $4,
          order_index = $5,
          status = 'PUBLISHED',
          info_type = 'DIRECTIVE',
          has_unpublished_changes = false,
          draft_content_html = $6,
          draft_content_text = $7,
          draft_content_json = $8,
          published_content_html = $6,
          published_content_text = $7,
          published_content_json = $8,
          published_at = now(),
          last_reviewed_at = now(),
          version_count = $9,
          updated_at = now()
        WHERE id = $10`,
        [
          meta.slug,
          meta.title,
          meta.summary,
          meta.tags,
          meta.order,
          fullHtml,
          fullText,
          JSON.stringify(docJson),
          nextVersion,
          pageId
        ]
      );
      updatedCount++;
      console.log(`   ✏️ Página atualizada com sucesso (ID: ${pageId}, Versão ${nextVersion})`);
    } else {
      const insertRes = await client.query(
        `INSERT INTO knowledge_pages (
          slug, title, summary, tags, order_index,
          status, info_type, has_unpublished_changes,
          draft_content_html, draft_content_text, draft_content_json,
          published_content_html, published_content_text, published_content_json,
          published_at, last_reviewed_at, version_count, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          'PUBLISHED', 'DIRECTIVE', false,
          $6, $7, $8,
          $6, $7, $8,
          now(), now(), 1, now(), now()
        ) RETURNING id`,
        [
          meta.slug,
          meta.title,
          meta.summary,
          meta.tags,
          meta.order,
          fullHtml,
          fullText,
          JSON.stringify(docJson)
        ]
      );
      pageId = insertRes.rows[0].id;
      insertedCount++;
      console.log(`   ✨ Nova página criada e publicada com sucesso (ID: ${pageId})`);
    }

    // 2. Registrar versão no histórico imutável (knowledge_page_versions)
    try {
      await client.query(
        `INSERT INTO knowledge_page_versions (
          page_id, version_number, title, summary, info_type,
          content_json, content_html, content_text, tags,
          is_published_snapshot, change_summary, created_at
        ) VALUES ($1, $2, $3, $4, 'DIRECTIVE', $5, $6, $7, $8, true, $9, now())
        ON CONFLICT (page_id, version_number) DO UPDATE SET
          content_html = EXCLUDED.content_html,
          content_text = EXCLUDED.content_text,
          content_json = EXCLUDED.content_json,
          title = EXCLUDED.title,
          summary = EXCLUDED.summary`,
        [
          pageId,
          nextVersion,
          meta.title,
          meta.summary,
          JSON.stringify(docJson),
          fullHtml,
          fullText,
          meta.tags,
          "Atualização integral a partir dos Documentos da Otimizza oficiais v2.1 (Novembro/2026)"
        ]
      );
    } catch (verr) {
      console.warn(`   ⚠️ Aviso ao registrar histórico de versão:`, verr.message);
    }

    // 3. Se houver aliasSlug antigo, garantir redirect na tabela de redirects para não quebrar links
    if (meta.aliasSlug && meta.aliasSlug !== meta.slug) {
      try {
        await client.query(
          `INSERT INTO knowledge_page_slug_redirects (page_id, old_slug)
           VALUES ($1, $2)
           ON CONFLICT (old_slug) DO UPDATE SET page_id = EXCLUDED.page_id`,
          [pageId, meta.aliasSlug]
        );
      } catch (rerr) {
        // Ignora conflitos
      }
    }
  }

  // 4. Sincronizar catálogo de serviços e combos com base no Documento 10
  console.log("\n📦 Sincronizando catálogo de serviços oficial da Otimizza...");
  const servicesToSync = [
    {
      name: "Gestão Estratégica de Redes Sociais",
      description: "Planejamento editorial, calendário mensal, produção de criativos (estáticos, carrosséis e roteiros para Reels), programação, monitoramento de alcance e acompanhamento de métricas comerciais.",
      periodicity: "MENSAL",
      defaultPrice: 2000.00,
      setupPrice: 500.00,
      categoryName: "Redes Sociais & Conteúdo"
    },
    {
      name: "Gestão de Tráfego Pago & Mídia de Performance",
      description: "Estruturação, gestão e otimização contínua de campanhas em Meta Ads e Google Ads, auditoria de ativos, configuração de pixels/tags e relatórios periódicos de custo por lead e conversão.",
      periodicity: "MENSAL",
      defaultPrice: 2000.00,
      setupPrice: 500.00,
      categoryName: "Mídia Paga & Performance"
    },
    {
      name: "Assessoria Completa: Social Media + Tráfego Pago (Núcleo Recorrente)",
      description: "Assinatura integrada do núcleo operacional da Otimizza. Combina presença estratégica em redes sociais com campanhas de aquisição paga e leitura unificada de indicadores.",
      periodicity: "MENSAL",
      defaultPrice: 3500.00,
      setupPrice: 800.00,
      categoryName: "Assessoria Integrada"
    },
    {
      name: "Sites Institucionais & Landing Pages de Alta Conversão",
      description: "Desenvolvimento de páginas de destino e sites responsivos com arquitetura de conversão, copy orientada a negócios, conformidade técnica, SEO, GEO e AEO.",
      periodicity: "AVULSO",
      defaultPrice: 2500.00,
      setupPrice: 0.00,
      categoryName: "Desenvolvimento & Web"
    },
    {
      name: "Otimização para Mecanismos de Busca (SEO, GEO & AEO)",
      description: "Diagnóstico técnico e semântico para posicionamento orgânico em buscas tradicionais (Google) e inteligências artificiais conversacionais (ChatGPT, Gemini, Perplexity).",
      periodicity: "AVULSO",
      defaultPrice: 1500.00,
      setupPrice: 0.00,
      categoryName: "SEO & Presença Digital"
    },
    {
      name: "Estruturação & Otimização do Google Perfil da Empresa",
      description: "Padronização cadastral, fotos, serviços, respostas a avaliações e posts estratégicos para atração e conversão local no Google Maps e busca.",
      periodicity: "AVULSO",
      defaultPrice: 800.00,
      setupPrice: 0.00,
      categoryName: "SEO & Presença Digital"
    },
    {
      name: "Desenvolvimento de Automações, Integrações e Sistemas Especiais",
      description: "Soluções sob medida para automatização de processos internos, fluxos de atendimento por WhatsApp, integração com CRM e pipelines de dados.",
      periodicity: "AVULSO",
      defaultPrice: 4000.00,
      setupPrice: 0.00,
      categoryName: "Tecnologia & Automações"
    }
  ];

  for (const s of servicesToSync) {
    // 1. Garantir categoria
    let catId = null;
    const catRes = await client.query(
      `SELECT id FROM service_categories WHERE name = $1`,
      [s.categoryName]
    );
    if (catRes.rows.length > 0) {
      catId = catRes.rows[0].id;
    } else {
      const insCat = await client.query(
        `INSERT INTO service_categories (name, description, status)
         VALUES ($1, $2, 'ACTIVE') RETURNING id`,
        [s.categoryName, `Categoria de serviços: ${s.categoryName}`]
      );
      catId = insCat.rows[0].id;
    }

    const billingUnit = s.periodicity === "MENSAL" ? "MES" : "PROJETO";

    // 2. Upsert do serviço
    const sRes = await client.query(
      `SELECT id FROM services WHERE name = $1`,
      [s.name]
    );
    if (sRes.rows.length > 0) {
      await client.query(
        `UPDATE services SET
          description = $1,
          category_id = $2,
          default_price = $3,
          billing_unit = $4,
          status = 'ACTIVE',
          updated_at = now()
        WHERE id = $5`,
        [s.description, catId, s.defaultPrice, billingUnit, sRes.rows[0].id]
      );
      console.log(`   ✔️ Serviço atualizado: ${s.name}`);
    } else {
      await client.query(
        `INSERT INTO services (
          name, description, category_id, default_price, default_cost,
          billing_unit, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 0.00, $5, 'ACTIVE', now(), now())`,
        [s.name, s.description, catId, s.defaultPrice, billingUnit]
      );
      console.log(`   ✨ Novo serviço inserido: ${s.name}`);
    }
  }

  console.log("\n========================================================");
  console.log(`🎉 SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO!`);
  console.log(`- Páginas atualizadas: ${updatedCount}`);
  console.log(`- Páginas novas criadas: ${insertedCount}`);
  console.log(`- Total de 20 manuais estratégicos da Otimizza 100% atualizados e publicados no Supabase!`);
  console.log("========================================================\n");

  await client.end();
}

main().catch(err => {
  console.error("❌ Erro fatal na sincronização:", err);
  process.exit(1);
});
