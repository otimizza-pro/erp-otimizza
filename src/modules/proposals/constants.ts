export interface PredefinedScenario {
  id: string;
  title: string;
  description: string;
  focus: string;
  metrics: string;
}

export const PREDEFINED_SCENARIOS: PredefinedScenario[] = [
  {
    id: "sem_presenca",
    title: "Sem Presença Digital Estruturada",
    description:
      "A empresa possui atuação consolidada no mercado presencial ou por indicações, mas ainda não conta com canais digitais ativos e estruturados para atrair novos clientes de forma previsível.",
    focus:
      "Construir a presença digital profissional da empresa, organizar os canais de contato e estruturar as primeiras ações de aquisição para gerar autoridade imediata e novos clientes qualificados.",
    metrics:
      "Volume de visitantes qualificados, contatos diretos gerados via WhatsApp e taxa de conversão das primeiras campanhas.",
  },
  {
    id: "sem_previsibilidade",
    title: "Presença Ativa sem Previsibilidade de Vendas",
    description:
      "A empresa já publica nas redes sociais e possui site, porém não conta com um funil de tráfego pago ativo e os resultados comerciais oscilam significativamente a cada mês.",
    focus:
      "Implementar campanhas estruturadas de tráfego pago (Google Ads e Meta Ads) e alinhar a comunicação para transformar visitantes em contatos frequentes e vendas regulares.",
    metrics:
      "Custo por Lead (CPL), volume semanal de oportunidades comerciais geradas e retorno sobre o investimento em anúncios (ROAS).",
  },
  {
    id: "site_desatualizado",
    title: "Site Desatualizado e Baixa Conversão",
    description:
      "O site atual não reflete a qualidade dos serviços prestados pela empresa, não oferece navegação fluida em celulares e perde a maioria dos visitantes antes que entrem em contato.",
    focus:
      "Desenvolver uma nova experiência digital de alta velocidade e design moderno, com foco total em conversão no WhatsApp e posicionamento de autoridade.",
    metrics:
      "Tempo de permanência na página, taxa de cliques no botão de WhatsApp e redução de abandono por lentidão.",
  },
  {
    id: "dependencia_indicacao",
    title: "Dependência Excessiva de Indicações Informais",
    description:
      "Quase a totalidade dos novos negócios depende de indicações orgânicas, o que limita o crescimento escalável e retira o controle sobre a receita futura da empresa.",
    focus:
      "Criar um canal independente de captação ativa de clientes via internet, atingindo pessoas que já estão procurando ativamente pelos serviços da empresa.",
    metrics:
      "Proporção de novos clientes vindos de canais digitais próprios em relação às indicações informais.",
  },
  {
    id: "expansao_mercado",
    title: "Expansão de Mercado e Lançamento de Serviços",
    description:
      "A empresa está expandindo sua área de atuação geográfica ou lançando novas soluções e precisa acelerar a tração comercial com marketing de resposta direta.",
    focus:
      "Posicionar a nova oferta no mercado com campanhas segmentadas por região e público-alvo, acelerando o ciclo de vendas e a captação de clientes.",
    metrics:
      "Alcance qualificado na região de expansão, leads segmentados por perfil ideal de cliente e volume de orçamentos solicitados.",
  },
];

export const DEFAULT_SERVICE_DELIVERABLES: Record<string, string[]> = {
  "Domínio": [
    "Consulta e registro oficial de domínio (.com.br, .com ou outras extensões)",
    "Registro com titularidade direta no CPF ou CNPJ do cliente",
    "Configuração de DNS profissional com proteção Cloudflare e segurança anti-DDoS",
    "Apontamento de servidores para a infraestrutura de hospedagem",
    "Configuração de e-mail corporativo (Purelymail / MX / SPF / DKIM / DMARC)",
    "Monitoramento de expiração e renovação anual assistida",
  ],
  "Hospedagem de Site": [
    "Servidor em nuvem de alta performance e baixa latência nacional",
    "Certificado de segurança SSL (HTTPS) incluso e renovado automaticamente",
    "Armazenamento em discos SSD de alta velocidade para carregamento instantâneo",
    "Rotina de backups periódicos com restauração rápida garantida",
    "Proteção anti-DDoS e firewall contra tentativas de invasão",
    "Monitoramento de uptime e estabilidade operacional 24/7",
  ],
  "Criação de WebSite": [
    "Design exclusivo e moderno alinhado à identidade visual da marca",
    "Layout 100% responsivo para celulares, tablets e computadores",
    "Otimização on-page para o Google (SEO estrutural e meta tags)",
    "Botões flutuantes de contato direto via WhatsApp e formulários dinâmicos",
    "Integração com Google Analytics 4 e Pixel de rastreamento de anúncios",
    "Página de alta conversão (Landing Page / Site Institucional)",
    "Configuração de segurança e velocidade otimizada com PageSpeed elevado",
    "Treinamento rápido e entrega das credenciais de acesso",
  ],
  "T.P. Google Ads": [
    "Estruturação profissional da conta no Google Ads",
    "Mapeamento profundo de palavras-chave com alta intenção de compra",
    "Criação e testes de anúncios responsivos de pesquisa focados em conversão",
    "Configuração de extensões de anúncio (chamada, sitelinks, snippets estruturados)",
    "Lista rigorosa e negativação contínua de termos irrelevantes",
    "Instalação e validação do acompanhamento de conversões (Google Tag Manager)",
    "Gestão e otimização semanal de lances com foco em menor Custo por Aquisição (CPA)",
    "Relatório mensal consolidado com métricas claras de desempenho e ROAS",
  ],
  "T.P. Meta Ads": [
    "Configuração do Gerenciador de Negócios (Meta Business Suite)",
    "Instalação e verificação do Pixel da Meta e API de Conversões",
    "Estruturação de públicos estratégicos (interesses, semelhantes/lookalike e remarketing)",
    "Criação de campanhas focadas em mensagens no WhatsApp e geração de leads",
    "Testes sistemáticos de criativos, vídeos, copys e chamadas para ação (CTA)",
    "Otimização diária de orçamento para evitar desperdício de verba publicitária",
    "Relatório mensal com análise de cliques, conversões e custo por lead (CPL)",
  ],
  "Social Media": [
    "Planejamento estratégico mensal com linha editorial alinhada ao posicionamento",
    "Criação de artes profissionais e persuasivas para o feed e stories",
    "Redação de legendas estratégicas com ganchos de engajamento e hashtags",
    "Roteiros e direcionamentos para gravação de Reels e vídeos curtos",
    "Orientações periódicas de melhores práticas para a equipe do cliente gravar",
    "Organização e envio prévio do cronograma para aprovação",
    "Análise mensal das publicações com melhor performance para replicar resultados",
  ],
};

export const HOW_WE_WORK_STEPS = [
  {
    step: "01",
    title: "Entendimento & Alinhamento",
    description:
      "Reunião inicial para levantar objetivos, acessos disponíveis e dados do negócio. Ponto de partida para entender a operação e estabelecer a linha de base.",
  },
  {
    step: "02",
    title: "Estratégia & Estruturação",
    description:
      "Definição de públicos, mensagens, canais e prioridades. Estruturação das ações de acordo com os objetivos e o orçamento disponível.",
  },
  {
    step: "03",
    title: "Execução & Otimização Contínua",
    description:
      "Orientação de materiais, otimização de canais, gestão ativa das campanhas e avaliação contínua de indicadores para ajuste das ações.",
  },
];
