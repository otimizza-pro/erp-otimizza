import { query } from "@/lib/db/pool";

export class StrategySeedService {
  static async seedAll(): Promise<{ success: boolean; message: string }> {
    // 1. Verificar se já existem documentos semeados
    const countRes = await query(`SELECT count(*) as count FROM strategy_documents`);
    const count = parseInt(countRes.rows[0].count, 10);
    if (count >= 38) {
      return { success: true, message: "Base estratégica já semeada com sucesso." };
    }

    console.log("Iniciando semeadura idempotente do módulo estratégico da Otimizza...");

    // =========================================================================
    // A. 14 TÓPICOS DO DIAGNÓSTICO DO NEGÓCIO (Documento 01)
    // =========================================================================
    const diagnosticoTopics = [
      {
        num: 1,
        code: "DIAG-01",
        title: "Identificação e estágio atual",
        desc: "Identidade, responsabilidade e momento do negócio.",
        sections: [
          {
            title: "Identidade e Responsabilidade",
            blocks: [
              {
                title: "Empresa e Assinatura Visual",
                type: "TEXT",
                class: "DECIDIDO",
                content: {
                  text: "Otimizza é o negócio tratado neste planejamento. José Neto conduz as decisões e a operação inicial. A assinatura visual utilizada é Data & Growth, com símbolo de barras ascendentes e verde como base.",
                },
              },
              {
                title: "Momento do Negócio e Abrangência",
                type: "TEXT",
                class: "DECLARADO",
                content: {
                  text: "A empresa está em estruturação inicial. Atendimento nacional e remoto. Não há definição de expansão internacional ou atuação em marketplaces como prioridade.",
                },
              },
            ],
          },
          {
            title: "Pendências de Identificação",
            blocks: [
              {
                title: "Formalização e Início Efetivo",
                type: "CALLOUT",
                class: "PENDENTE",
                content: {
                  text: "Formalização societária, responsabilidades administrativas e data de início efetiva da operação não foram confirmadas. Quantidade de clientes ativos e receita atual permanecem sem atualização validada.",
                },
              },
            ],
          },
        ],
      },
      {
        num: 2,
        code: "DIAG-02",
        title: "Motivação e direção do negócio",
        desc: "Direção escolhida e necessidade de renda do fundador.",
        sections: [
          {
            title: "Direção Escolhida",
            blocks: [
              {
                title: "Posicionamento Estratégico",
                type: "TEXT",
                class: "DECIDIDO",
                content: {
                  text: "A Otimizza deve ser reconhecida pela capacidade de entender o negócio, estabelecer prioridades, orientar a execução e acompanhar resultados. A mídia paga complementa essa atuação estratégica.",
                },
              },
            ],
          },
          {
            title: "Objetivo Financeiro Declarado do Fundador",
            blocks: [
              {
                title: "Faixa de Retirada Pessoal Desejada (90 dias)",
                type: "CURRENCY",
                class: "DECLARADO",
                unit: "BRL/mês",
                content: {
                  rangeMin: 3000,
                  rangeMax: 5000,
                  observations: "Necessidade de retirada pessoal desejada em até 90 dias. Não representa projeção comercial validada.",
                },
              },
            ],
          },
        ],
      },
      {
        num: 3,
        code: "DIAG-03",
        title: "Proposta de valor inicial",
        desc: "Entendimento do negócio, prioridades, execução e acompanhamento.",
        sections: [
          {
            title: "Formulação Consolidada",
            blocks: [
              {
                title: "Proposta de Valor da Otimizza",
                type: "CALLOUT",
                class: "DECIDIDO",
                content: {
                  text: "Entender o negócio, estabelecer prioridades, orientar a execução e acompanhar os resultados. Combinamos análise de dados, planejamento e execução de marketing para ajudar empresas a compreender seu desempenho e direcionar ações de crescimento.",
                },
              },
            ],
          },
        ],
      },
      {
        num: 4,
        code: "DIAG-04",
        title: "Serviços e limites da atuação",
        desc: "Núcleo definido, fronteiras de site/conteúdo e limites do escopo.",
        sections: [
          {
            title: "Núcleo de Atuação Já Definido",
            blocks: [
              {
                title: "Entregáveis Principais",
                type: "LIST",
                class: "DECIDIDO",
                content: {
                  items: [
                    "Diagnóstico dos dados disponíveis e da presença digital",
                    "Planejamento de marketing e definição de prioridades",
                    "Gestão de tráfego pago (Google Ads e Meta Ads)",
                    "Briefings e orientação de campanhas",
                    "Análises, relatórios e dashboards de acompanhamento",
                    "Reuniões periódicas de acompanhamento estratégico",
                  ],
                },
              },
              {
                title: "Serviços Não Aprovados Automaticamente",
                type: "CALLOUT",
                class: "DECLARADO",
                content: {
                  text: "Gestão de marketplaces está FORA DO FOCO. SEO, busca por IA, e-mail marketing, CRM, automações, identidade visual e produção criativa completa de artes/vídeos aparecem nas referências visuais, mas NÃO constituem serviços aprovados da Otimizza.",
                },
              },
            ],
          },
        ],
      },
      {
        num: 5,
        code: "DIAG-05",
        title: "Público pretendido",
        desc: "Recortes aprovados de foco comercial e maturidade do cliente.",
        sections: [
          {
            title: "Recortes Aprovados de Foco Comercial",
            blocks: [
              {
                title: "Segmentos Prioritários",
                type: "TABLE",
                class: "DECIDIDO",
                content: {
                  columns: ["Segmento", "Proporção de Foco", "Características"],
                  rows: [
                    ["Lojas Virtuais Próprias (E-commerce)", "70%", "Operações com site próprio, vendas ativas e canal proprietário (marketplaces fora do foco principal)"],
                    ["Negócios de Serviços", "30%", "Prestadores de serviços qualificados com ticket médio relevante"],
                  ],
                },
              },
              {
                title: "Maturidade Pretendida dos Clientes",
                type: "TABLE",
                class: "DECIDIDO",
                content: {
                  columns: ["Nível de Maturidade", "Proporção", "Comportamento e Necessidade"],
                  rows: [
                    ["Empresas que já vendem com pouca clareza dos números", "80%", "Necessitam de organização de dados, alinhamento de canais e clareza de retorno"],
                    ["Operações já estruturadas", "20%", "Buscam escala com previsibilidade, otimização contínua e análise refinada"],
                  ],
                },
              },
            ],
          },
        ],
      },
      {
        num: 6,
        code: "DIAG-06",
        title: "Modelo de contratação e receita",
        desc: "Contratação mensal de marketing com diagnóstico incluso no 1º mês.",
        sections: [
          {
            title: "Entrada e Modelo de Faturamento",
            blocks: [
              {
                title: "Modelo Contratual Aprovado",
                type: "TEXT",
                class: "DECIDIDO",
                content: {
                  text: "Contratação mensal de assessoria de marketing. O diagnóstico inicial integra o primeiro mês (não foi escolhido como produto avulso pago separado na entrada padrão). O trabalho começa pela análise, avança para o plano e executa campanhas ainda no primeiro mês.",
                },
              },
            ],
          },
        ],
      },
      {
        num: 7,
        code: "DIAG-07",
        title: "Processo de entrega",
        desc: "Método: Analisar > Planejar > Executar > Otimizzar.",
        sections: [
          {
            title: "Método de Trabalho Aprovado da Otimizza",
            blocks: [
              {
                title: "Etapas do Método",
                type: "TABLE",
                class: "DECIDIDO",
                content: {
                  columns: ["Etapa", "Finalidade", "Entregáveis Típicos"],
                  rows: [
                    ["1. Analisar", "Entender o negócio, objetivos, dados, canais, campanhas, site e jornada", "Diagnóstico inicial na 1ª semana com limitações registradas"],
                    ["2. Planejar", "Definir prioridades, indicadores, ações, responsáveis e prazos", "Plano de ação e metas acordadas na 2ª semana"],
                    ["3. Executar", "Realizar o escopo contratado e orientar a equipe do cliente", "Gestão de campanhas e implementação técnica dentro do 1º mês"],
                    ["4. Otimizzar", "Comparar resultados, analisar desvios e ajustar o trabalho", "Relatórios comparativos e reuniões de revisão"],
                  ],
                },
              },
            ],
          },
        ],
      },
      {
        num: 8,
        code: "DIAG-08",
        title: "Pessoas e capacidade operacional",
        desc: "Disponibilidade declarada do fundador e modelo com especialistas.",
        sections: [
          {
            title: "Capacidade e Dedicação Declarada",
            blocks: [
              {
                title: "Disponibilidade Semanal do Fundador",
                type: "TEXT",
                class: "DECLARADO",
                content: {
                  text: "Disponibilidade de 11 a 20 horas semanais declarada para atendimento, execução, prospecção e administração da Otimizza. O fundador conduz a estratégia e poderá contratar especialistas por projeto sob demanda.",
                },
              },
            ],
          },
        ],
      },
      {
        num: 9,
        code: "DIAG-09",
        title: "Recursos e estrutura existentes",
        desc: "Materiais de marca, ERP próprio e infraestrutura tecnológica.",
        sections: [
          {
            title: "Ativos e Sistemas Conhecidos",
            blocks: [
              {
                title: "Infraestrutura Atual",
                type: "LIST",
                class: "DECLARADO",
                content: {
                  items: [
                    "Identidade visual com assinatura Data & Growth e cor verde institucional",
                    "ERP próprio desenvolvido em Next.js com banco PostgreSQL/Supabase",
                    "Caderno com 22 prints de referências do mercado (Mardini, Growth Lead, etc.)",
                    "Guia de tipografias e paletas preliminares",
                  ],
                },
              },
            ],
          },
        ],
      },
      {
        num: 10,
        code: "DIAG-10",
        title: "Situação comercial atual",
        desc: "Ponto de partida, abordagem de prospecção direta e canais.",
        sections: [
          {
            title: "Abordagem Comercial Escolhida",
            blocks: [
              {
                title: "Prospecção Ativa",
                type: "TEXT",
                class: "DECIDIDO",
                content: {
                  text: "Prospecção nacional e remota combinando mensagens personalizadas e ligações ativas. Não há dependência exclusiva de anúncios próprios para aquisição dos primeiros clientes. Foco em encontrar empresas que já vendem mas têm pouca clareza de números.",
                },
              },
            ],
          },
        ],
      },
      {
        num: 11,
        code: "DIAG-11",
        title: "Situação financeira inicial",
        desc: "Orçamento de início (R$ 301 a R$ 800) e meta de renda (R$ 3k a R$ 5k).",
        sections: [
          {
            title: "Recursos Próprios Declarados",
            blocks: [
              {
                title: "Faixa de Orçamento Próprio para 90 dias",
                type: "CURRENCY",
                class: "DECLARADO",
                unit: "BRL/mês",
                content: {
                  rangeMin: 301,
                  rangeMax: 800,
                  observations: "Orçamento próprio mensal declarado durante os primeiros 90 dias sem depender de novos contratos. Não representa custo já comprometido.",
                },
              },
            ],
          },
        ],
      },
      {
        num: 12,
        code: "DIAG-12",
        title: "Evidências de capacidade",
        desc: "Projeto demonstrativo de loja virtual de instrumentos musicais.",
        sections: [
          {
            title: "Projeto de Demonstração Planejado",
            blocks: [
              {
                title: "Demonstrativo Escolhido",
                type: "TEXT",
                class: "HIPOTESE",
                content: {
                  text: "Projeto fictício de uma loja virtual de instrumentos e acessórios musicais que já vende mas tem pouca clareza dos números. Incluirá dicionário de dados, perguntas de negócio, diagnóstico, dashboard e plano priorizado.",
                },
              },
            ],
          },
        ],
      },
      {
        num: 13,
        code: "DIAG-13",
        title: "Limitações, riscos e dependências",
        desc: "Escopo vs capacidade, pressão por renda e dependência do fundador.",
        sections: [
          {
            title: "Matriz Qualitativa de Riscos",
            blocks: [
              {
                title: "Principais Riscos Mapeados",
                type: "TABLE",
                class: "DECLARADO",
                content: {
                  columns: ["Risco", "Impacto Potencial", "Resposta Sugerida"],
                  rows: [
                    ["Escopo maior que a capacidade", "Análises, reuniões e mídia podem exceder 20h/semana", "Limites contratuais explícitos e medição rigorosa de horas"],
                    ["Pressão financeira inicial", "Incentivar preço insuficiente ou clientes fora do perfil", "Estimar contribuição marginal antes de fechar contrato"],
                    ["Falta de cases comerciais públicos", "Dificuldade na conversão de novos clientes", "Concluir e apresentar demonstrativo técnico consistente"],
                    ["Dependência de dados do cliente", "Atrasos na entrega por falta de acessos ou dados", "Requisitos formais de início de projeto"],
                  ],
                },
              },
            ],
          },
        ],
      },
      {
        num: 14,
        code: "DIAG-14",
        title: "Lacunas e pontos a validar",
        desc: "Pontos críticos antes de fechar oferta, custos e capacidade.",
        sections: [
          {
            title: "Checklist de Validações Críticas",
            blocks: [
              {
                title: "Itens a Resolver Antes de Comprometer Despesas",
                type: "CHECKLIST",
                class: "PENDENTE",
                content: {
                  items: [
                    { task: "Fixar preço padrão e escopo detalhado da assessoria recorrente", done: false },
                    { task: "Mapear lista e custos de especialistas terceiros por demanda", done: false },
                    { task: "Fixar data formal de início do horizonte de 90 dias", done: false },
                    { task: "Concluir o projeto demonstrativo de instrumentos musicais", done: false },
                    { task: "Validar roteiro e canais de prospecção ativa com potenciais clientes", done: false },
                  ],
                },
              },
            ],
          },
        ],
      },
    ];

    // Inserir os 14 tópicos do Diagnóstico
    for (const dt of diagnosticoTopics) {
      const docRes = await query(
        `
        INSERT INTO strategy_documents (code, title, category, topic_number, description, status)
        VALUES ($1, $2, 'DIAGNOSTICO', $3, $4, 'APROVADO')
        ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, updated_at = now()
        RETURNING id
        `,
        [dt.code, `${dt.num.toString().padStart(2, "0")}. ${dt.title}`, dt.num, dt.desc]
      );
      const docId = docRes.rows[0].id;

      for (let sIdx = 0; sIdx < dt.sections.length; sIdx++) {
        const s = dt.sections[sIdx];
        const secRes = await query(
          `
          INSERT INTO strategy_sections (document_id, title, sort_order)
          VALUES ($1, $2, $3)
          RETURNING id
          `,
          [docId, s.title, sIdx]
        );
        const secId = secRes.rows[0].id;

        for (let bIdx = 0; bIdx < s.blocks.length; bIdx++) {
          const b = s.blocks[bIdx];
          await query(
            `
            INSERT INTO strategy_blocks (
              section_id, block_type, title, content, classification,
              data_nature, unit, sort_order
            )
            VALUES ($1, $2, $3, $4, $5, 'MANUAL', $6, $7)
            `,
            [secId, b.type, b.title, b.content, b.class, (b as any).unit || null, bIdx]
          );
        }
      }
    }

    // =========================================================================
    // B. OS 24 TÓPICOS DE PLANEJAMENTO DE MARKETING
    // =========================================================================
    const marketingTopics = [
      { num: 1, title: "Diagnóstico do Negócio", desc: "Referência central aos 14 tópicos do diagnóstico do negócio." },
      { num: 2, title: "Análise de Mercado", desc: "Segmentos de e-commerce e serviços, demanda e oportunidades reais." },
      { num: 3, title: "Análise da Concorrência", desc: "Mardini, Growth Lead, Lead Hive, Agência FG, Webcer, Metris, DDA, AW Growth." },
      { num: 4, title: "Público-Alvo e Segmentação", desc: "Foco pretendido: 70% e-commerce próprio, 30% serviços; 80% já vendem com pouca clareza de dados." },
      { num: 5, title: "Comportamento do Consumidor", desc: "Dores com falta de retorno de agências tradicionais e necessidade de visão executiva." },
      { num: 6, title: "Síntese do Diagnóstico e Prioridades Estratégicas", desc: "SWOT integrada e definição de prioridades imediatas." },
      { num: 7, title: "Posicionamento, Branding e Identidade de Marca", desc: "Assinatura Data & Growth, método Analisar > Planejar > Executar > Otimizzar." },
      { num: 8, title: "Estratégia Comercial e de Oferta", desc: "Assessoria mensal continuada, diagnóstico incluso na primeira semana." },
      { num: 9, title: "Mix de Marketing (4Ps / 7Ps)", desc: "Produto, Preço, Praça, Promoção, Pessoas, Processos e Evidências Físicas." },
      { num: 10, title: "Objetivos, Metas e Indicadores", desc: "Metas de clientes, faturamento, conversão e retenção." },
      { num: 11, title: "Orçamento de Marketing e Viabilidade Financeira", desc: "Investimento planejado vs realizado no ERP, simulações de anúncios." },
      { num: 12, title: "Jornada, Experiência do Cliente e Funil de Marketing", desc: "Etapas da descoberta à renovação semestral." },
      { num: 13, title: "Estratégia de Comunicação", desc: "Mensagens claras, argumentos orientados a números e sem jargões vazios." },
      { num: 14, title: "CRM, Relacionamento, Retenção e Expansão", desc: "Acompanhamento interno dos clientes Otimizza via ERP." },
      { num: 15, title: "Marketing de Conteúdo", desc: "Pilares editoriais baseados em dados de e-commerce e clareza de gestão." },
      { num: 16, title: "Redes Sociais e Comunidades", desc: "LinkedIn e Instagram institucionais com posicionamento consultivo." },
      { num: 17, title: "Marketing de Busca e Presença Digital", desc: "Site erp.otimizza.com.br, Google Meu Negócio e presença orgânica." },
      { num: 18, title: "Tráfego Pago e Mídia", desc: "Campanhas de Google Search e Meta Ads focadas em tomadores de decisão." },
      { num: 19, title: "Parcerias e Marketing Offline", desc: "Parceiros de tecnologia, plataformas de e-commerce e contabilidades." },
      { num: 20, title: "Geração e Conversão de Leads", desc: "Processo de prospecção ativa e reuniões diagnósticas." },
      { num: 21, title: "Dados, BI e Plano de Mensuração", desc: "Dashboards gerenciais, métricas de CAC, LTV e ROAS." },
      { num: 22, title: "Tecnologia e Infraestrutura", desc: "ERP Next.js, Supabase, purelymail, Cloudflare e ferramentas de análise." },
      { num: 23, title: "Plano de Ação, Responsáveis e Execução", desc: "Ações 5W2H e cronograma de entregas." },
      { num: 24, title: "Monitoramento, Testes e Otimização", desc: "Ciclos de revisão quinzenal e ajustes contínuos." },
    ];

    for (const mt of marketingTopics) {
      const code = `MKT-${mt.num.toString().padStart(2, "0")}`;
      const docRes = await query(
        `
        INSERT INTO strategy_documents (code, title, category, topic_number, description, status)
        VALUES ($1, $2, 'MARKETING', $3, $4, 'APROVADO')
        ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, updated_at = now()
        RETURNING id
        `,
        [code, `${mt.num.toString().padStart(2, "0")}. ${mt.title}`, mt.num, mt.desc]
      );
      const docId = docRes.rows[0].id;

      // Seções padrão com conteúdo contextualizado
      const secRes = await query(
        `
        INSERT INTO strategy_sections (document_id, title, sort_order)
        VALUES ($1, 'Direcionamento e Contexto do Tópico', 0)
        RETURNING id
        `,
        [docId]
      );
      const secId = secRes.rows[0].id;

      await query(
        `
        INSERT INTO strategy_blocks (section_id, block_type, title, content, classification, data_nature, sort_order)
        VALUES ($1, 'TEXT', 'Situação Conhecida e Diretrizes', $2, 'DECIDIDO', 'MANUAL', 0)
        `,
        [
          secId,
          {
            text: `Tópico estratégico: ${mt.title}. Contexto aprovado da Otimizza: aplicação estrita do método Analisar > Planejar > Executar > Otimizzar, com foco comercial em lojas virtuais próprias (70%) e serviços (30%).`,
          },
        ]
      );

      await query(
        `
        INSERT INTO strategy_blocks (section_id, block_type, title, content, classification, data_nature, sort_order)
        VALUES ($1, 'CALLOUT', 'Pendências e Próximas Validações', $2, 'PENDENTE', 'MANUAL', 1)
        `,
        [
          secId,
          {
            text: `Validar hipóteses de resposta do mercado para ${mt.title}. Testar parâmetros com base em dados reais de execução no ERP Otimizza.`,
          },
        ]
      );
    }

    // =========================================================================
    // C. METAS INICIAIS NO BANCO (Incluindo caso de teste R$ 300)
    // =========================================================================
    await query(`
      INSERT INTO strategy_goals (
        name, category, goal_type, target_value, unit, period_type,
        start_date, source_type, evaluation_rule, notes
      )
      VALUES (
        'Investimento em Anúncios Próprios da Otimizza',
        'MARKETING',
        'PLANNED_INVESTMENT',
        300.00,
        'BRL',
        'MONTHLY',
        '2026-11-01',
        'FINANCIAL_EXPENSE',
        'INVESTMENT_EXECUTION',
        'Meta demonstrativa e operacional de acompanhamento de mídia paga própria.'
      )
      ON CONFLICT DO NOTHING;
    `);

    await query(`
      INSERT INTO strategy_goals (
        name, category, goal_type, target_value, unit, period_type,
        start_date, source_type, evaluation_rule, notes
      )
      VALUES (
        'Teto de Gastos Operacionais com Ferramentas',
        'FINANCEIRO',
        'MAXIMUM',
        500.00,
        'BRL',
        'MONTHLY',
        '2026-11-01',
        'FINANCIAL_EXPENSE',
        'COST_CEILING',
        'Limite máximo estipulado para assinaturas e infraestrutura inicial.'
      )
      ON CONFLICT DO NOTHING;
    `);

    // =========================================================================
    // D. FERRAMENTAS ESTRATÉGICAS (SWOT, CANVAS, ETC.)
    // =========================================================================
    await query(`
      INSERT INTO strategy_frameworks (framework_type, title, content)
      VALUES (
        'SWOT',
        'Matriz SWOT Inicial da Otimizza',
        $1
      )
      ON CONFLICT DO NOTHING;
    `, [
      JSON.stringify({
        strengths: [
          "Visão executiva combinando dados analíticos e tráfego pago",
          "Método estruturado em 4 etapas (Analisar > Planejar > Executar > Otimizzar)",
          "ERP próprio integrado conectando comercial, projetos e financeiro",
          "Atendimento próximo e consultivo",
        ],
        weaknesses: [
          "Operação inicial individual com limite de 11 a 20h semanais",
          "Ausência inicial de cases comerciais públicos homologados",
          "Limitações para produção criativa complexa de vídeo/design",
        ],
        opportunities: [
          "Mercado de e-commerces que já vendem mas não entendem seus números",
          "Demanda por assessoria orientada a negócios em vez de métricas de vaidade",
          "Contratação de especialistas sob demanda por projeto",
        ],
        threats: [
          "Concorrência de agências tradicionais com grandes equipes de criação",
          "Pressão por renda rápida antes da maturidade dos ciclos de venda",
          "Dependência da qualidade dos dados disponibilizados pelo cliente",
        ],
      }),
    ]);

    await query(`
      INSERT INTO strategy_frameworks (framework_type, title, content)
      VALUES (
        'CANVAS',
        'Business Model Canvas da Otimizza',
        $1
      )
      ON CONFLICT DO NOTHING;
    `, [
      JSON.stringify({
        valueProposition: "Assessoria de crescimento e clareza estratégica combinando análise de dados, planejamento e execução de campanhas para lojas virtuais e negócios de serviços.",
        customerSegments: "Lojas virtuais próprias (70%) e prestadores de serviços qualificados (30%) que já faturam mas têm pouca clareza do retorno sobre investimento.",
        channels: "Prospecção direta personalizada, reuniões remotas e canais digitais próprios.",
        customerRelationships: "Reuniões semanais, diagnósticos transparentes e suporte consultivo.",
        revenueStreams: "Mensalidade de assessoria contínua com diagnóstico inicial incluso no 1º mês.",
        keyResources: "ERP Otimizza, infraestrutura analítica, conhecimento em Google/Meta Ads e rede de especialistas.",
        keyActivities: "Diagnóstico de dados, planejamento de marketing, gestão de tráfego, análise de relatórios e reuniões de acompanhamento.",
        keyPartners: "Especialistas em desenvolvimento e design, plataformas de e-commerce e provedores de infraestrutura.",
        costStructure: "Ferramentas de gestão, infraestrutura tecnológica, impostos e remuneração de especialistas terceiros.",
      }),
    ]);

    console.log("Semeadura estratégica concluída com sucesso!");
    return { success: true, message: "Todos os tópicos, metas e ferramentas foram semeados com sucesso." };
  }
}

