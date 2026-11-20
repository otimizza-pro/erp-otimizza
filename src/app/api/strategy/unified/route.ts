import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { StrategySeedService } from "@/modules/strategy/seed";

export const dynamic = "force-dynamic";

export interface UnifiedStrategyBlock {
  id: string;
  sectionId?: string;
  blockType: string;
  title: string;
  instructions?: string;
  content: { text?: string; list?: string[]; [key: string]: unknown };
  classification: "DECLARADO" | "DECIDIDO" | "HIPOTESE" | "RECOMENDACAO" | "PENDENTE";
  dataNature?: string;
  gridWidth?: number;
}

export interface UnifiedStrategySection {
  id: string;
  title: string;
  description?: string;
  blocks: UnifiedStrategyBlock[];
}

export interface UnifiedStrategyHeadline {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  category: "DIAGNOSIS" | "BUSINESS" | "GROWTH" | "TOOLS" | "GOALS" | "BUDGETS" | "COMPETITORS" | "DECISIONS";
  iconName: string;
  sections: UnifiedStrategySection[];
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId") || "otimizza";

  try {
    // 1. Caso OTIMIZZA GROWTH (Padrão)
    if (companyId === "otimizza") {
      // Garantir dados semeados
      await StrategySeedService.seedAll().catch(() => {});

      // Buscar todos os documentos com seções e blocos
      const docsRes = await query(`
        SELECT d.id, d.code, d.title, d.category, d.topic_number, d.description
        FROM public.strategy_documents d
        ORDER BY d.topic_number ASC NULLS LAST, d.code ASC
      `);

      const sectionsRes = await query(`
        SELECT s.id, s.document_id, s.title, s.description, s.sort_order
        FROM public.strategy_sections s
        ORDER BY s.sort_order ASC, s.created_at ASC
      `);

      const blocksRes = await query(`
        SELECT b.id, b.section_id, b.block_type, b.title, b.instructions, b.content,
               b.classification, b.data_nature, b.grid_width, b.sort_order
        FROM public.strategy_blocks b
        ORDER BY b.sort_order ASC, b.created_at ASC
      `);

      // Mapear blocos por section_id
      const blocksBySection = new Map<string, UnifiedStrategyBlock[]>();
      for (const b of blocksRes.rows) {
        if (!blocksBySection.has(b.section_id)) {
          blocksBySection.set(b.section_id, []);
        }
        blocksBySection.get(b.section_id)!.push({
          id: b.id,
          sectionId: b.section_id,
          blockType: b.block_type,
          title: b.title,
          instructions: b.instructions,
          content: b.content || {},
          classification: b.classification,
          dataNature: b.data_nature,
          gridWidth: b.grid_width || 12,
        });
      }

      // Mapear seções por document_id
      const sectionsByDoc = new Map<string, UnifiedStrategySection[]>();
      for (const s of sectionsRes.rows) {
        if (!sectionsByDoc.has(s.document_id)) {
          sectionsByDoc.set(s.document_id, []);
        }
        sectionsByDoc.get(s.document_id)!.push({
          id: s.id,
          title: s.title,
          description: s.description,
          blocks: blocksBySection.get(s.id) || [],
        });
      }

      // Agrupar nos 8 Headlines Unificados
      const headlines: UnifiedStrategyHeadline[] = [
        {
          id: "headline_diagnosis",
          code: "DIAGNOSIS",
          title: "1. Empresa & Diagnóstico Inicial",
          subtitle: "Identidade da marca, estágio atual, diagnóstico de gargalos, forças e fraquezas (SWOT)",
          category: "DIAGNOSIS",
          iconName: "Building",
          sections: [],
        },
        {
          id: "headline_business",
          code: "BUSINESS",
          title: "2. Gestão Empresarial & Pilares do Negócio",
          subtitle: "Modelo de negócio, posicionamento central, canais prioritários e proposta de valor",
          category: "BUSINESS",
          iconName: "Briefcase",
          sections: [],
        },
        {
          id: "headline_growth",
          code: "GROWTH",
          title: "3. Marketing & Crescimento (Growth)",
          subtitle: "Geração de demanda, estratégia dos 4 funis, aquisição qualificada e esteira de conteúdo",
          category: "GROWTH",
          iconName: "TrendingUp",
          sections: [],
        },
        {
          id: "headline_tools",
          code: "TOOLS",
          title: "4. Ferramentas, Tecnologias & Automações",
          subtitle: "Stack tecnológica, softwares de automação, CRMs, IAs e infraestrutura",
          category: "TOOLS",
          iconName: "Layers",
          sections: [],
        },
        {
          id: "headline_goals",
          code: "GOALS",
          title: "5. Objetivos Estratégicos & OKRs",
          subtitle: "Metas trimestrais, indicadores chave de performance (KPIs) e alvos de vendas",
          category: "GOALS",
          iconName: "CheckCircle2",
          sections: [],
        },
        {
          id: "headline_budgets",
          code: "BUDGETS",
          title: "6. Orçamentos & Planejamento Financeiro",
          subtitle: "Budget de marketing, investimentos em mídia paga, alocação de recursos e metas de CAC",
          category: "BUDGETS",
          iconName: "DollarSign",
          sections: [],
        },
        {
          id: "headline_competitors",
          code: "COMPETITORS",
          title: "7. Concorrentes & Benchmarking",
          subtitle: "Mapeamento de competidores diretos, gaps de mercado e diferenciação competitiva",
          category: "COMPETITORS",
          iconName: "Target",
          sections: [],
        },
        {
          id: "headline_decisions",
          code: "DECISIONS",
          title: "8. Decisões Estratégicas & Próximos Passos",
          subtitle: "Registro de diretrizes aprovadas, regras inegociáveis e backlog de ações prioritárias",
          category: "DECISIONS",
          iconName: "ShieldCheck",
          sections: [],
        },
      ];

      // Distribuir as seções de cada documento no headline correspondente
      for (const doc of docsRes.rows) {
        const docSections = sectionsByDoc.get(doc.id) || [];
        if (docSections.length === 0) continue;

        let targetHeadlineId = "headline_diagnosis";
        const c = doc.code.toUpperCase();

        if (c.startsWith("DIAG-")) {
          targetHeadlineId = "headline_diagnosis";
        } else if (c === "MKT-01" || c === "MKT-02" || c === "MKT-04" || c === "MKT-05") {
          targetHeadlineId = "headline_business";
        } else if (c === "MKT-07" || c === "MKT-08" || c === "MKT-09" || c === "MKT-23") {
          targetHeadlineId = "headline_growth";
        } else if (c === "MKT-06" || c === "MKT-15") {
          targetHeadlineId = "headline_tools";
        } else if (c === "MKT-10" || c === "MKT-12" || c === "MKT-13" || c === "MKT-14") {
          targetHeadlineId = "headline_goals";
        } else if (c === "MKT-11") {
          targetHeadlineId = "headline_budgets";
        } else if (c === "MKT-03") {
          targetHeadlineId = "headline_competitors";
        } else if (c === "MKT-24") {
          targetHeadlineId = "headline_decisions";
        } else {
          targetHeadlineId = "headline_growth";
        }

        const targetHeadline = headlines.find((h) => h.id === targetHeadlineId);
        if (targetHeadline) {
          docSections.forEach((s) => {
            targetHeadline.sections.push({
              ...s,
              title: `${doc.code}: ${s.title}`,
            });
          });
        }
      }

      return NextResponse.json({
        success: true,
        company: { id: "otimizza", name: "Otimizza Growth", isOtimizza: true },
        headlines,
      });
    }

    // 2. Caso CLIENTE ESPECÍFICO (Empresa selecionada)
    const clientRes = await query<{
      id: string;
      name: string;
      trade_name: string | null;
      email: string | null;
      phone: string | null;
    }>(`SELECT id, name, trade_name, email, phone FROM public.clients WHERE id = $1`, [companyId]);

    if (clientRes.rows.length === 0) {
      return NextResponse.json({ error: "Empresa/Cliente não encontrado." }, { status: 404 });
    }

    const client = clientRes.rows[0];
    const clientDisplayName = client.trade_name || client.name;

    // Buscar Identidade do Cliente
    const idRes = await query(`SELECT * FROM public.client_identities WHERE client_id = $1`, [companyId]);
    const ci = idRes.rows[0] || {};

    // Buscar briefing se houver
    const briefingRes = await query(
      `SELECT extracted_identity, initial_notes, competitor_notes FROM public.client_briefing_sessions WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [companyId]
    );
    const briefing = briefingRes.rows[0];
    const ext = briefing?.extracted_identity || {};

    // Construir os 8 Headlines Personalizados para esta Empresa
    const companyHeadlines: UnifiedStrategyHeadline[] = [
      {
        id: "headline_diagnosis",
        code: "DIAGNOSIS",
        title: "1. Empresa & Diagnóstico Inicial",
        subtitle: `Posicionamento, dados institucionais e diagnóstico estratégico de ${clientDisplayName}`,
        category: "DIAGNOSIS",
        iconName: "Building",
        sections: [
          {
            id: `sec_${companyId}_diag_1`,
            title: "Identidade Institucional & Decisores",
            description: "Informações cadastrais e momento atual da empresa",
            blocks: [
              {
                id: `blk_${companyId}_empresa`,
                blockType: "TEXT",
                title: "Razão Social / Nome da Marca",
                classification: "DECIDIDO",
                content: { text: clientDisplayName },
              },
              {
                id: `blk_${companyId}_nicho`,
                blockType: "TEXT",
                title: "Nicho de Atuação & Ramo de Atividade",
                classification: ci.market_niche ? "DECIDIDO" : "DECLARADO",
                content: { text: ci.market_niche || ext.marketNiche || "Defina o nicho de mercado e especialidade da empresa." },
              },
              {
                id: `blk_${companyId}_momento`,
                blockType: "CALLOUT",
                title: "Diagnóstico e Contexto Estratégico",
                classification: "DECLARADO",
                content: { text: ci.brand_context || briefing?.initial_notes || "Contexto e histórico coletados durante o onboarding." },
              },
            ],
          },
        ],
      },
      {
        id: "headline_business",
        code: "BUSINESS",
        title: "2. Gestão Empresarial & Pilares do Negócio",
        subtitle: "Proposta Única de Valor, ICP e diferenciais competitivos",
        category: "BUSINESS",
        iconName: "Briefcase",
        sections: [
          {
            id: `sec_${companyId}_biz_1`,
            title: "Proposta de Valor & Diferenciais",
            blocks: [
              {
                id: `blk_${companyId}_uvp`,
                blockType: "TEXT",
                title: "Proposta Única de Valor (UVP)",
                classification: ci.value_proposition ? "DECIDIDO" : "HIPOTESE",
                content: { text: ci.value_proposition || ext.differentials || "Qual transformação ou resultado único a empresa entrega aos seus clientes?" },
              },
              {
                id: `blk_${companyId}_diffs`,
                blockType: "LIST",
                title: "Diferenciais Competitivos Reais",
                classification: "DECIDIDO",
                content: {
                  list: ci.differentials && ci.differentials.length > 0
                    ? ci.differentials
                    : ext.differentials
                    ? [String(ext.differentials)]
                    : ["Atendimento direto com especialistas", "Velocidade na entrega", "Qualidade garantida"],
                },
              },
            ],
          },
          {
            id: `sec_${companyId}_biz_2`,
            title: "Público-Alvo Prioritário (ICP)",
            blocks: [
              {
                id: `blk_${companyId}_audiences`,
                blockType: "LIST",
                title: "Perfis de Cliente Ideal",
                classification: "DECIDIDO",
                content: {
                  list: ci.target_audiences && ci.target_audiences.length > 0
                    ? ci.target_audiences
                    : ext.targetAudience
                    ? [String(ext.targetAudience)]
                    : ["Clientes B2B", "Consumidores finais de alto padrão"],
                },
              },
              {
                id: `blk_${companyId}_pains`,
                blockType: "LIST",
                title: "Dores e Problemas que a Empresa Resolve (Pain Points)",
                classification: "DECLARADO",
                content: {
                  list: ci.pain_points && ci.pain_points.length > 0
                    ? ci.pain_points
                    : ["Falta de previsibilidade", "Perda de tempo com processos manuais", "Dificuldade de encontrar profissionais qualificados"],
                },
              },
            ],
          },
        ],
      },
      {
        id: "headline_growth",
        code: "GROWTH",
        title: "3. Marketing & Crescimento (Growth)",
        subtitle: "Estratégia de conteúdo, tom de voz, canais e esteira de funis",
        category: "GROWTH",
        iconName: "TrendingUp",
        sections: [
          {
            id: `sec_${companyId}_growth_1`,
            title: "Diretrizes de Conteúdo & Tom de Voz",
            blocks: [
              {
                id: `blk_${companyId}_tone`,
                blockType: "LIST",
                title: "Tom de Voz da Marca Aprovado",
                classification: "DECIDIDO",
                content: {
                  list: ci.tone_of_voice && ci.tone_of_voice.length > 0
                    ? ci.tone_of_voice
                    : Array.isArray(ext.toneOfVoice)
                    ? ext.toneOfVoice
                    : ["Direto e didático", "Focado em autoridade e clareza"],
                },
              },
              {
                id: `blk_${companyId}_ctas`,
                blockType: "LIST",
                title: "Chamadas para Ação Padrão (CTAs)",
                classification: "DECIDIDO",
                content: {
                  list: ci.default_ctas && ci.default_ctas.length > 0
                    ? ci.default_ctas
                    : ["Envie uma mensagem no WhatsApp", "Agende uma consultoria sem custo", "Acesse o link na bio"],
                },
              },
            ],
          },
          {
            id: `sec_${companyId}_growth_2`,
            title: "Estratégia Visual para Redes Sociais",
            blocks: [
              {
                id: `blk_${companyId}_format`,
                blockType: "CALLOUT",
                title: "Formatos Padrão de Publicação",
                classification: "DECIDIDO",
                content: {
                  text: "Feed: 4:5 Vertical (1080x1350 px) para máximo aproveitamento de tela no Instagram. Stories & Reels: 9:16 Vertical (1080x1920 px).",
                },
              },
            ],
          },
        ],
      },
      {
        id: "headline_tools",
        code: "TOOLS",
        title: "4. Ferramentas, Tecnologias & Automações",
        subtitle: "Canais digitais ativos e stack utilizada",
        category: "TOOLS",
        iconName: "Layers",
        sections: [
          {
            id: `sec_${companyId}_tools_1`,
            title: "Presença Digital & Canais Oficiais",
            blocks: [
              {
                id: `blk_${companyId}_links`,
                blockType: "TEXT",
                title: "Site & Instagram",
                classification: "DECIDIDO",
                content: {
                  text: `Site: ${ci.website_url || "Não informado"} | Instagram: @${ci.instagram_handle || "Não informado"}`,
                },
              },
            ],
          },
        ],
      },
      {
        id: "headline_goals",
        code: "GOALS",
        title: "5. Objetivos Estratégicos & Metas",
        subtitle: "Alvos de crescimento, geração de leads e conversão",
        category: "GOALS",
        iconName: "CheckCircle2",
        sections: [
          {
            id: `sec_${companyId}_goals_1`,
            title: "Metas de Marketing & Vendas",
            blocks: [
              {
                id: `blk_${companyId}_leads_goal`,
                blockType: "TEXT",
                title: "Geração Mensal de Leads Qualificados",
                classification: "HIPOTESE",
                content: { text: "Gerar de 30 a 50 leads qualificados por mês via anúncios e tráfego orgânico estruturado." },
              },
            ],
          },
        ],
      },
      {
        id: "headline_budgets",
        code: "BUDGETS",
        title: "6. Orçamentos & Planejamento Financeiro",
        subtitle: "Investimentos em tráfego e mídia de performance",
        category: "BUDGETS",
        iconName: "DollarSign",
        sections: [
          {
            id: `sec_${companyId}_budgets_1`,
            title: "Planejamento de Mídia & Tráfego Pago",
            blocks: [
              {
                id: `blk_${companyId}_budget_media`,
                blockType: "CALLOUT",
                title: "Investimento Mensal Recomendado em Mídia",
                classification: "RECOMENDACAO",
                content: { text: "Alocação inicial de R$ 600 a R$ 1.500/mês distribuídos entre Meta Ads e Google Ads." },
              },
            ],
          },
        ],
      },
      {
        id: "headline_competitors",
        code: "COMPETITORS",
        title: "7. Concorrentes & Benchmarking",
        subtitle: "Mapeamento de referências e concorrentes do cliente",
        category: "COMPETITORS",
        iconName: "Target",
        sections: [
          {
            id: `sec_${companyId}_comp_1`,
            title: "Concorrentes & Referências Informadas",
            blocks: [
              {
                id: `blk_${companyId}_comp_list`,
                blockType: "TEXT",
                title: "Perfis e Marcas Monitoradas",
                classification: "DECLARADO",
                content: {
                  text: briefing?.competitor_notes || (ext.competitors ? String(ext.competitors) : "Nenhum concorrente cadastrado ainda para esta empresa."),
                },
              },
            ],
          },
        ],
      },
      {
        id: "headline_decisions",
        code: "DECISIONS",
        title: "8. Decisões Estratégicas & Próximos Passos",
        subtitle: "Diretrizes alinhadas e próximos entregáveis do cliente",
        category: "DECISIONS",
        iconName: "ShieldCheck",
        sections: [
          {
            id: `sec_${companyId}_dec_1`,
            title: "Alinhamento e Próximos Passos",
            blocks: [
              {
                id: `blk_${companyId}_action_1`,
                blockType: "CALLOUT",
                title: "Criação do Primeiro Calendário Editorial",
                classification: "DECIDIDO",
                content: { text: "Estruturar o calendário de publicações no Estúdio de Conteúdo com as headlines e dores aprovadas." },
              },
            ],
          },
        ],
      },
    ];

    return NextResponse.json({
      success: true,
      company: { id: client.id, name: clientDisplayName, isOtimizza: false },
      headlines: companyHeadlines,
    });
  } catch (err: unknown) {
    console.error("Erro na API de estratégia unificada:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno ao carregar estratégia." },
      { status: 500 }
    );
  }
}
