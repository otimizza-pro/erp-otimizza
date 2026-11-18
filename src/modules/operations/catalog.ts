export const operationAreas = {
 editorial: {title: "Linha Editorial", tasks: ["Definir objetivos e público", "Definir pilares e temas", "Definir formatos e frequência", "Aprovar linha editorial com o cliente"]},
 calendar: {title: "Calendário de Conteúdo", tasks: ["Planejar pautas e datas", "Produzir textos e roteiros", "Aprovar conteúdos", "Agendar publicações", "Conferir publicações realizadas"]},
 "meta-ads": {title: "Anúncios Meta Ads", tasks: ["Conferir acesso ao portfólio e conta de anúncios", "Validar pixel e eventos", "Definir objetivo, público e orçamento", "Aprovar criativos e publicar campanha", "Revisar resultados semanalmente"]},
 "google-ads": {title: "Anúncios Google Ads", tasks: ["Conferir acesso à conta", "Configurar conversões", "Definir palavras-chave e negativas", "Revisar anúncios e página de destino", "Revisar termos de pesquisa e orçamento"]},
 domains: {title: "Domínios", tasks: ["Registrar domínio e titular", "Conferir DNS", "Registrar vencimento nas observações", "Confirmar renovação"]},
 hosting: {title: "Hospedagem", tasks: ["Registrar provedor e plano", "Configurar SSL", "Configurar backups", "Testar restauração e disponibilidade"]},
 "landing-pages": {title: "Landing Pages", tasks: ["Definir oferta e CTA", "Aprovar copy e layout", "Testar formulário e WhatsApp", "Validar conversões e publicar"]},
 websites: {title: "Sites Institucionais", tasks: ["Aprovar estrutura e conteúdo", "Implementar páginas", "Testar celular e formulários", "Validar SEO e publicar"]},
 "google-business": {title: "Google Meu Negócio", tasks: ["Verificar propriedade e acessos", "Atualizar dados e categorias", "Adicionar fotos e produtos", "Responder avaliações", "Revisar desempenho mensal"]},
 search: {title: "SEO, AEO, GEO, SXO", tasks: ["Auditar indexação e sitemap", "Revisar intenção de busca e conteúdo", "Revisar dados estruturados", "Revisar experiência e conversão", "Acompanhar Search Console"]},
 "web-settings": {title: "Outras Configurações", tasks: ["Configurar Google Analytics", "Validar Google Tag Manager", "Verificar consentimento e privacidade", "Medir performance do site", "Revisar eventos e integrações"]},
 acquisition: {title: "Aquisição", tasks: ["Definir público e oferta", "Configurar canais Inbound e Outbound", "Registrar origem e primeiro contato", "Definir metas e orçamento", "Revisar captação semanalmente"]},
 nutrition: {title: "Nutrição", tasks: ["Definir critérios de qualificação", "Registrar motivo e próximo contato", "Agendar atividade de acompanhamento", "Revisar atividades vencidas", "Reavaliar leads e encaminhar oportunidades"]},
 conversion: {title: "Conversão", tasks: ["Configurar funis e etapas comerciais", "Criar oportunidades de leads qualificados", "Agendar diagnóstico e proposta", "Registrar ganho ou perda", "Conferir vínculo com cliente e contrato"]},
 retention: {title: "Pós-venda", tasks: ["Executar onboarding", "Definir entregas e responsáveis", "Acompanhar contratos e renovações", "Realizar reunião de acompanhamento", "Registrar cancelamentos e expansão"]},
} as const;
export type OperationArea = keyof typeof operationAreas;
export const operationStatuses = ["NOT_CONFIGURED", "IN_PROGRESS", "CONFIGURED", "RUNNING", "NOT_APPLICABLE"] as const;
export type OperationStatus = typeof operationStatuses[number];
export interface OperationTask { status: OperationStatus; notes: string; }
