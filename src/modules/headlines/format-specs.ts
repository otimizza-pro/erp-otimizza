export type ContentChannelMode = "SOCIAL_MEDIA" | "ADS";

export type WriterFormatKey =
  | "REELS"
  | "CAPTION"
  | "CAROUSEL"
  | "LANDING_PAGE"
  | "META_ADS"
  | "GOOGLE_ADS";

export interface FormatSpecsConfig {
  contentMode: ContentChannelMode;
  // Reels / Vídeo
  reelsDuration: string;
  reelsStyle: string;
  reelsIncludeOnScreen: boolean;
  reelsIncludeBroll: boolean;
  reelsIncludeDeliveryNotes: boolean;
  // Legenda / Feed 4:5 / Post estático / Stories
  captionLength: string;
  captionStructure: string;
  captionEmojiLevel: string;
  captionIncludeAltHook: boolean;
  captionIncludeHashtags: boolean;
  // Carrossel
  carouselSlides: number;
  carouselType: string;
  carouselWordLimit: string;
  carouselIncludeSaveShare: boolean;
  // Site / Landing Page
  lpGoal: string;
  lpIncludePains: boolean;
  lpIncludeFaq: boolean;
  lpIncludeGuarantee: boolean;
  // Meta Ads
  metaAdsPlacement: string;
  metaAdsObjective: string;
  metaAdsVariations: boolean;
  // Google Ads
  googleAdsCampaignType: string;
  googleAdsFocus: string;
  googleAdsIncludeExtensions: boolean;
}

export const DEFAULT_FORMAT_SPECS: FormatSpecsConfig = {
  contentMode: "SOCIAL_MEDIA",
  reelsDuration: "30 a 45 segundos (Alta Retenção)",
  reelsStyle: "Falando para câmera (Talking Head)",
  reelsIncludeOnScreen: true,
  reelsIncludeBroll: true,
  reelsIncludeDeliveryNotes: true,
  captionLength: "Média (~600 a 1.200 caracteres)",
  captionStructure: "PAS (Problema, Agitação, Solução)",
  captionEmojiLevel: "Mínimo (Executivo e sóbrio)",
  captionIncludeAltHook: true,
  captionIncludeHashtags: true,
  carouselSlides: 8,
  carouselType: "Passo a Passo / Guia Prático",
  carouselWordLimit: "Máx 25-30 palavras por slide (Design limpo)",
  carouselIncludeSaveShare: true,
  lpGoal: "Agendamento de Diagnóstico / Reunião Estratégica",
  lpIncludePains: true,
  lpIncludeFaq: true,
  lpIncludeGuarantee: true,
  metaAdsPlacement: "Feed & Stories (4:5 / 9:16)",
  metaAdsObjective: "Conversão Direta / Lead Qualificado",
  metaAdsVariations: true,
  googleAdsCampaignType: "Rede de Pesquisa (Search)",
  googleAdsFocus: "Intenção de Compra / Fundo de Funil",
  googleAdsIncludeExtensions: true,
};

export const REELS_DURATION_OPTIONS = [
  { id: "15 a 30s (Ultra Dinâmico / Viral)", label: "15-30s (Viral)" },
  { id: "30 a 45 segundos (Alta Retenção)", label: "30-45s (Padrão)" },
  { id: "45 a 60s (Aprofundado / Aula)", label: "45-60s (Aula)" },
  { id: "60 a 90s (Explicação Completa)", label: "60-90s (Profundo)" },
] as const;

export const REELS_STYLE_OPTIONS = [
  "Falando para câmera (Talking Head)",
  "Voz em Off com Cenas de Bastidores (B-roll)",
  "Diálogo / Encenação de 2 Personagens (Empresário vs Cliente)",
  "Tutorial Prático / Gravação de Tela",
  "Pergunta & Resposta / Análise de Caso Real",
] as const;

export const CAPTION_LENGTH_OPTIONS = [
  { value: "Curta (~300 a 500 caracteres)", label: "Curta (~300 a 500 carac.)" },
  { value: "Média (~600 a 1.200 caracteres)", label: "Média (~600 a 1.200 carac. - Padrão)" },
  { value: "Longa / Storytelling (~1.300 a 2.200 caracteres)", label: "Longa / Storytelling (~1.300 a 2.200 carac.)" },
] as const;

export const CAPTION_STRUCTURE_OPTIONS = [
  "PAS (Problema, Agitação, Solução)",
  "AIDA (Atenção, Interesse, Desejo, Ação)",
  "Storytelling de Bastidores Reais",
  "Direta ao Ponto / 3 Dicas Práticas",
  "Quebra de Crença + Reposicionamento",
] as const;

export const CAPTION_EMOJI_OPTIONS = [
  "Mínimo (Executivo e sóbrio)",
  "Moderado (Marcadores e tópicos)",
  "Nenhum (100% formal)",
] as const;

export const CAROUSEL_SLIDE_COUNTS = [5, 6, 8, 10, 12] as const;

export const CAROUSEL_TYPE_OPTIONS = [
  "Passo a Passo / Guia Prático",
  "5 Erros Fatais / Checklist",
  "Desconstrução de Mito / Opinião Impopular",
  "Estudo de Caso / Antes e Depois",
  "Comparação de Alternativas / Critérios",
] as const;

export const CAROUSEL_DENSITY_OPTIONS = [
  { value: "Máx 25-30 palavras por slide (Design limpo)", label: "Máx 25-30 palavras (Design limpo)" },
  { value: "Máx 45 palavras por slide (Mais explicativo)", label: "Máx 45 palavras (Mais explicativo)" },
] as const;

export const LP_GOAL_OPTIONS = [
  { value: "Agendamento de Diagnóstico / Reunião Estratégica", label: "Agendamento de Diagnóstico / Reunião" },
  { value: "Venda Direta de Serviço / Consultoria", label: "Venda Direta de Serviço / Consultoria" },
  { value: "Captura de Lead / Isca Digital / Download", label: "Captura de Lead / Isca Digital" },
] as const;

export const META_ADS_PLACEMENT_OPTIONS = [
  "Feed & Stories (4:5 / 9:16)",
  "Reels Ads (Vídeo Curto Dinâmico)",
  "Carrossel de Oferta / Catálogo",
] as const;

export const META_ADS_OBJECTIVE_OPTIONS = [
  "Conversão Direta / Lead Qualificado",
  "Quebra de Objeção + Prova Social",
  "Oferta Direta com Urgência Real",
  "Retargeting (Público Quente)",
] as const;

export const GOOGLE_ADS_CAMPAIGN_OPTIONS = [
  "Rede de Pesquisa (Search)",
  "Performance Max (PMax)",
  "YouTube Ads / Vídeo In-Stream",
] as const;

export const GOOGLE_ADS_FOCUS_OPTIONS = [
  "Intenção de Compra / Fundo de Funil",
  "Autoridade Local & Diagnóstico",
  "Comparação / Diferenciação de Serviço",
] as const;

export const DEFAULT_TONES = [
  "Direto e didático",
  "Confrontacional respeitoso",
  "Consultivo e técnico",
  "Narrativo de bastidores",
  "Provocador e reflexivo",
] as const;

export const DEFAULT_CTAS = [
  "Iniciar conversa qualificada no WhatsApp",
  "Enviar mensagem no Direct do Instagram",
  "Comente a palavra-chave abaixo",
  "Toque no link da bio para saber mais",
  "Salve este post para consultar com sua equipe",
] as const;

export function parseFormatSpecs(raw: unknown): FormatSpecsConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_FORMAT_SPECS };
  const record = raw as Record<string, unknown>;
  const numSlides = Number(record.carouselSlides);
  return {
    contentMode: record.contentMode === "ADS" ? "ADS" : "SOCIAL_MEDIA",
    reelsDuration:
      typeof record.reelsDuration === "string" && record.reelsDuration.trim()
        ? record.reelsDuration
        : DEFAULT_FORMAT_SPECS.reelsDuration,
    reelsStyle:
      typeof record.reelsStyle === "string" && record.reelsStyle.trim()
        ? record.reelsStyle
        : DEFAULT_FORMAT_SPECS.reelsStyle,
    reelsIncludeOnScreen:
      typeof record.reelsIncludeOnScreen === "boolean"
        ? record.reelsIncludeOnScreen
        : DEFAULT_FORMAT_SPECS.reelsIncludeOnScreen,
    reelsIncludeBroll:
      typeof record.reelsIncludeBroll === "boolean"
        ? record.reelsIncludeBroll
        : DEFAULT_FORMAT_SPECS.reelsIncludeBroll,
    reelsIncludeDeliveryNotes:
      typeof record.reelsIncludeDeliveryNotes === "boolean"
        ? record.reelsIncludeDeliveryNotes
        : DEFAULT_FORMAT_SPECS.reelsIncludeDeliveryNotes,
    captionLength:
      typeof record.captionLength === "string" && record.captionLength.trim()
        ? record.captionLength
        : DEFAULT_FORMAT_SPECS.captionLength,
    captionStructure:
      typeof record.captionStructure === "string" && record.captionStructure.trim()
        ? record.captionStructure
        : DEFAULT_FORMAT_SPECS.captionStructure,
    captionEmojiLevel:
      typeof record.captionEmojiLevel === "string" && record.captionEmojiLevel.trim()
        ? record.captionEmojiLevel
        : DEFAULT_FORMAT_SPECS.captionEmojiLevel,
    captionIncludeAltHook:
      typeof record.captionIncludeAltHook === "boolean"
        ? record.captionIncludeAltHook
        : DEFAULT_FORMAT_SPECS.captionIncludeAltHook,
    captionIncludeHashtags:
      typeof record.captionIncludeHashtags === "boolean"
        ? record.captionIncludeHashtags
        : DEFAULT_FORMAT_SPECS.captionIncludeHashtags,
    carouselSlides:
      Number.isFinite(numSlides) && numSlides >= 3 && numSlides <= 20
        ? Math.round(numSlides)
        : DEFAULT_FORMAT_SPECS.carouselSlides,
    carouselType:
      typeof record.carouselType === "string" && record.carouselType.trim()
        ? record.carouselType
        : DEFAULT_FORMAT_SPECS.carouselType,
    carouselWordLimit:
      typeof record.carouselWordLimit === "string" && record.carouselWordLimit.trim()
        ? record.carouselWordLimit
        : DEFAULT_FORMAT_SPECS.carouselWordLimit,
    carouselIncludeSaveShare:
      typeof record.carouselIncludeSaveShare === "boolean"
        ? record.carouselIncludeSaveShare
        : DEFAULT_FORMAT_SPECS.carouselIncludeSaveShare,
    lpGoal:
      typeof record.lpGoal === "string" && record.lpGoal.trim()
        ? record.lpGoal
        : DEFAULT_FORMAT_SPECS.lpGoal,
    lpIncludePains:
      typeof record.lpIncludePains === "boolean"
        ? record.lpIncludePains
        : DEFAULT_FORMAT_SPECS.lpIncludePains,
    lpIncludeFaq:
      typeof record.lpIncludeFaq === "boolean"
        ? record.lpIncludeFaq
        : DEFAULT_FORMAT_SPECS.lpIncludeFaq,
    lpIncludeGuarantee:
      typeof record.lpIncludeGuarantee === "boolean"
        ? record.lpIncludeGuarantee
        : DEFAULT_FORMAT_SPECS.lpIncludeGuarantee,
    metaAdsPlacement:
      typeof record.metaAdsPlacement === "string" && record.metaAdsPlacement.trim()
        ? record.metaAdsPlacement
        : DEFAULT_FORMAT_SPECS.metaAdsPlacement,
    metaAdsObjective:
      typeof record.metaAdsObjective === "string" && record.metaAdsObjective.trim()
        ? record.metaAdsObjective
        : DEFAULT_FORMAT_SPECS.metaAdsObjective,
    metaAdsVariations:
      typeof record.metaAdsVariations === "boolean"
        ? record.metaAdsVariations
        : DEFAULT_FORMAT_SPECS.metaAdsVariations,
    googleAdsCampaignType:
      typeof record.googleAdsCampaignType === "string" && record.googleAdsCampaignType.trim()
        ? record.googleAdsCampaignType
        : DEFAULT_FORMAT_SPECS.googleAdsCampaignType,
    googleAdsFocus:
      typeof record.googleAdsFocus === "string" && record.googleAdsFocus.trim()
        ? record.googleAdsFocus
        : DEFAULT_FORMAT_SPECS.googleAdsFocus,
    googleAdsIncludeExtensions:
      typeof record.googleAdsIncludeExtensions === "boolean"
        ? record.googleAdsIncludeExtensions
        : DEFAULT_FORMAT_SPECS.googleAdsIncludeExtensions,
  };
}

export function normalizeWriterFormat(raw?: string | null): WriterFormatKey {
  if (!raw) return "REELS";
  const f = raw.toUpperCase();
  if (f.includes("REEL") || f.includes("VIDEO") || f.includes("VÍDEO")) return "REELS";
  if (f.includes("CARRO")) return "CAROUSEL";
  if (f.includes("SITE") || f.includes("LANDING") || f.includes("LP")) return "LANDING_PAGE";
  if (f.includes("META") || f.includes("FACEBOOK")) return "META_ADS";
  if (f.includes("GOOGLE") || f.includes("PESQUISA") || f.includes("BUSCA")) return "GOOGLE_ADS";
  return "CAPTION";
}

export function writerFormatToCalendarFormat(fmt: WriterFormatKey): string {
  if (fmt === "REELS") return "Reels";
  if (fmt === "CAROUSEL") return "Carrossel";
  if (fmt === "LANDING_PAGE") return "Landing page";
  return "Post estático";
}

export function buildTechnicalFormatPromptLines(format: WriterFormatKey, specs: FormatSpecsConfig): string[] {
  const lines: string[] = [];
  if (format === "REELS") {
    lines.push(`• Duração estimada do vídeo: ${specs.reelsDuration}.`);
    lines.push(`• Estilo de gravação: ${specs.reelsStyle}.`);
    lines.push("• Regra do Fluxo Contínuo: Escreva primeiro o [FIO CONDUTOR / HISTÓRIA CORRIDA] (conversa fluida e humana) e só depois decupe nos tempos com marcações [entre colchetes].");
    lines.push("• Teste da Leitura em Voz Alta: Frases com ritmo de respiração natural e conectivos falados ('e aí', 'só que', 'na prática', 'o ponto é que').");
    lines.push("• Crie DUAS OPÇÕES DISTINTAS E COMPLETAS de roteiro (Opção 1: Ângulo Direto/Confrontacional; Opção 2: Ângulo Narrativo/Bastidores).");
    if (specs.reelsIncludeOnScreen) lines.push("• Inclua indicações claras de [TEXTO NA TELA] (lettering) sincronizado com a fala.");
    if (specs.reelsIncludeBroll) lines.push("• Inclua sugestões de cortes de cena e B-rolls visuais a cada 3 a 5 segundos.");
    if (specs.reelsIncludeDeliveryNotes) lines.push("• Inclua instruções de entonação e linguagem corporal para quem vai gravar.");
  } else if (format === "CAPTION") {
    lines.push(`• Extensão da legenda: ${specs.captionLength}.`);
    lines.push(`• Estrutura de copy: ${specs.captionStructure}.`);
    lines.push(`• Uso de emojis: ${specs.captionEmojiLevel} (máximo 2 por peça).`);
    lines.push("• Storytelling e Proximidade: Parágrafos que conversam entre si com situação cotidiana real, sem listas secas ou frases isoladas.");
    if (specs.captionIncludeAltHook) lines.push("• Forneça 1 opção alternativa de primeiro parágrafo/gancho de abertura (para teste A/B).");
    lines.push("• Use quebras de linha limpas para garantir leitura escaneável no smartphone.");
    if (specs.captionIncludeHashtags) lines.push("• Inclua 4 a 6 hashtags estratégicas e nichadas ao final.");
  } else if (format === "CAROUSEL") {
    lines.push(`• Quantidade de slides: exatamente ${specs.carouselSlides} slides por opção.`);
    lines.push(`• Tipo de estrutura: ${specs.carouselType}.`);
    lines.push(`• Limite de palavras: ${specs.carouselWordLimit}.`);
    lines.push("• Crie DUAS OPÇÕES COMPLETAS de carrossel (Estrutura A e Estrutura B) slide a slide, com raciocínio encadeado entre os slides.");
    lines.push("• Slide 1 (Capa): Título com gancho que soe como um pensamento real do cliente + subtítulo explicativo curto.");
    lines.push("• Slides intermediários: Apenas uma ideia central por slide para leitura rápida.");
    if (specs.carouselIncludeSaveShare) lines.push("• Slide final: Resumo dos pontos + CTA claro convidando a SALVAR e COMPARTILHAR.");
  } else if (format === "LANDING_PAGE") {
    lines.push(`• Objetivo da Landing Page: ${specs.lpGoal}.`);
    lines.push("• Estrutura completa de copy dividida em blocos de conversão com parágrafos que conversam entre si:");
    lines.push("  - Dobra Superior (Hero): Headline de impacto autêntica, subheadline explicativa, CTA e pontos de valor.");
    if (specs.lpIncludePains) lines.push("  - Dores e Sintomas do ICP: Conexão imediata com os problemas cotidianos que o cliente enfrenta.");
    lines.push("  - Como Funciona / Solução: Passo a passo claro da entrega.");
    lines.push("  - Diferenciais e Autoridade: Por que esta marca/serviço.");
    if (specs.lpIncludeFaq) lines.push("  - FAQ: 4 a 5 dúvidas mais frequentes respondidas estrategicamente.");
    if (specs.lpIncludeGuarantee) lines.push("  - Chamada Final de Ação: CTA forte com garantia e alívio de risco (sem inventar termos não confirmados).");
  } else if (format === "META_ADS") {
    lines.push(`• Posicionamento no Meta Ads: ${specs.metaAdsPlacement}.`);
    lines.push(`• Objetivo estratégico do anúncio: ${specs.metaAdsObjective}.`);
    lines.push("• Entregue: Gancho das 2 primeiras linhas (para parar a rolagem), Texto Principal persuasivo, Headline do link e Descrição do botão/CTA.");
    if (specs.metaAdsVariations) lines.push("• Crie DUAS variações completas (Variação A: Foco em Dor/Diagnóstico; Variação B: Foco em Transformação/Autoridade).");
  } else if (format === "GOOGLE_ADS") {
    lines.push(`• Tipo de campanha Google Ads: ${specs.googleAdsCampaignType}.`);
    lines.push(`• Foco da intenção de busca: ${specs.googleAdsFocus}.`);
    lines.push("• Entregue até 10 Títulos (MÁXIMO RIGOROSO DE 30 CARACTERES cada) e 4 Descrições (MÁXIMO RIGOROSO DE 90 CARACTERES cada).");
    if (specs.googleAdsIncludeExtensions) lines.push("• Inclua sugestões de Sitelinks (título + 2 descrições curtas) e Frases de Destaque.");
  }
  lines.push("• LISTA NEGRA DE CLICHÊS DE IA (PROIBIDO USAR): 'desbloqueie', 'eleve', 'potencialize', 'mergulhe', 'no cenário atual', 'transforme sua jornada', 'alavanque', 'mude o jogo', 'solução definitiva'.");
  return lines;
}
