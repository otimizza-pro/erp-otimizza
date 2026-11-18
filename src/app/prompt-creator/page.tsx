"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCompany } from "@/lib/context/company-context";
import {ContentCalendar} from "@/components/operations/content-calendar";
import {CommunicationProfileSchema,emptyCommunicationProfile} from "@/modules/clients/communication-profile";
import React, { useRef, Suspense, useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Sparkles,
  Users,
  Calendar,
  Layers,
  CheckCircle2,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit2,
  Key,
  BookOpen,
  ArrowRight,
  TrendingUp,
  FileText,
  Video,
  Send,
  Save,
  Clock,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  Sliders,
  Settings2,
  Hash,
  CheckSquare,
  Image as ImageIcon,
  Megaphone,
  Wand2,
  Lightbulb,
} from "lucide-react";

// Tipos
interface ClientRecord {
  id: string;
  name: string;
  trade_name?: string;
  type?: string;
}

interface AudienceRecord {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  demographics?: string;
  pain_points: string[];
  is_default: boolean;
}

interface EditorialLineRecord {
  id: string;
  client_id: string;
  pillar_name: string;
  theme: string;
  objective?: string;
  preferred_formats: string[];
}

interface CalendarItemRecord {
  id: string;
  client_id: string;
  client_name?: string;
  title: string;
  central_idea: string;
  format: string;
  scheduled_date?: string;
  scheduled_time?: string;
  status: string;
  selected_headline?: string;
  selected_caption?: string;
  selected_reels?: string;
  selected_carousel?: string;
}

const SOCIAL_FORMAT_OPTIONS = [
  { id: "HEADLINES", label: "Headlines", icon: TrendingUp, desc: "Títulos de alto impacto para carrosséis, reels ou anúncios." },
  { id: "CAPTION", label: "Legendas (Feed 4:5)", icon: FileText, desc: "Copy completa para post de feed com abertura, desenvolvimento e CTA." },
  { id: "REELS", label: "Roteiros de Reels (16:9)", icon: Video, desc: "Duas opções de roteiro cronometrado com falas e textos de tela." },
  { id: "CAROUSEL", label: "Carrossel (2 Opções)", icon: Layers, desc: "Duas estruturas completas slide a slide com limites de palavras." },
  { id: "LANDING_PAGE", label: "Texto de Landing Page", icon: BookOpen, desc: "Seções de oferta, benefícios, dores e conversão." },
];

const ADS_FORMAT_OPTIONS = [
  { id: "CAPTION", label: "Anúncio Feed (Meta Ads)", icon: FileText, desc: "Copy direta com gancho visual, corpo persuasivo e CTA de conversão." },
  { id: "REELS", label: "Roteiro de Anúncio Vídeo", icon: Video, desc: "Roteiro dinâmico para vídeos de tráfego pago (Stories/Reels Ads)." },
  { id: "HEADLINES", label: "Headlines de Alta Conversão", icon: TrendingUp, desc: "Títulos magnéticos testados para cliques e CTR elevado." },
  { id: "CAROUSEL", label: "Carrossel de Anúncio / Oferta", icon: Layers, desc: "Anúncios focados em quebra de objeções, prova social e oferta." },
  { id: "LANDING_PAGE", label: "Página de Destino do Anúncio", icon: BookOpen, desc: "Copy focada na conversão imediata do tráfego pago." },
];

const FORMAT_OPTIONS = SOCIAL_FORMAT_OPTIONS;

const DEFAULT_TONES = [
  "Direto e didático",
  "Confrontacional respeitoso",
  "Consultivo e técnico",
  "Narrativo de bastidores",
  "Provocador e reflexivo",
];

const DEFAULT_CTAS = [
  "Iniciar conversa qualificada no WhatsApp",
  "Enviar mensagem no Direct do Instagram",
  "Comente a palavra-chave abaixo",
  "Toque no link da bio para saber mais",
  "Salve este post para consultar com sua equipe",
];

function ContentStudioPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { selectedCompany, selectCompany, availableCompanies } = useCompany();
  const [activeTab, setActiveTabState] = useState<"STUDIO" | "CALENDAR" | "EDITORIAL">("STUDIO");
  useEffect(() => {const tab=searchParams.get("tab");setActiveTabState(tab==="CALENDAR"||tab==="EDITORIAL"?tab:"STUDIO");},[searchParams]);
  const setActiveTab = (tab:"STUDIO"|"CALENDAR"|"EDITORIAL") => {setActiveTabState(tab);router.replace("/prompt-creator"+(tab==="STUDIO"?"":"?tab="+tab),{scroll:false});};
  const [contentMode, setContentMode] = useState<"SOCIAL_MEDIA" | "ADS">("SOCIAL_MEDIA");

  // Dados carregados do sistema
  const [communicationProfile,setCommunicationProfile]=useState(emptyCommunicationProfile);
  const [pieceSpeaker,setPieceSpeaker]=useState("");
  const [pieceAudience,setPieceAudience]=useState("");
  const [pieceVoice,setPieceVoice]=useState("");
  const contextRequest=useRef(0);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  useEffect(() => { setSelectedClientId(selectedCompany.isOtimizza ? "" : selectedCompany.id); }, [selectedCompany.id, selectedCompany.isOtimizza]);
  const [audiences, setAudiences] = useState<AudienceRecord[]>([]);
  const [editorialLines, setEditorialLines] = useState<EditorialLineRecord[]>([]);
  const [calendarItems, setCalendarItems] = useState<CalendarItemRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Configuração do Conteúdo Atual
  const [format, setFormat] = useState<string>("HEADLINES");
  const [idea, setIdea] = useState("");
  const [selectedAudience, setSelectedAudience] = useState<string>("");
  const [selectedTone, setSelectedTone] = useState<string>("Direto e didático");
  const [customTone, setCustomTone] = useState<string>("");
  const [selectedCta, setSelectedCta] = useState<string>("Iniciar conversa qualificada no WhatsApp");
  const [customCta, setCustomCta] = useState<string>("");
  const [brandContext, setBrandContext] = useState("");
  const [scheduledDate, setScheduledDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [scheduledTime, setScheduledTime] = useState<string>("18:00");

  // Configurações Específicas por Formato:
  // 1. HEADLINES
  const [headlineCount, setHeadlineCount] = useState<number>(10);
  const [headlineStyles, setHeadlineStyles] = useState<string[]>([
    "Quebra de Crença",
    "Erro/Alerta ('Pare de...')",
    "Pergunta Provocativa",
  ]);
  const [headlineType, setHeadlineType] = useState<string>("Títulos Completos com Contexto");
  const [headlineUrgency, setHeadlineUrgency] = useState<boolean>(true);

  // 2. LEGENDAS
  const [captionLength, setCaptionLength] = useState<string>("Média (~600 a 1.200 caracteres)");
  const [captionStructure, setCaptionStructure] = useState<string>("PAS (Problema, Agitação, Solução)");
  const [captionEmojiLevel, setCaptionEmojiLevel] = useState<string>("Mínimo (Executivo e sóbrio)");
  const [captionIncludeAltHook, setCaptionIncludeAltHook] = useState<boolean>(true);
  const [captionIncludeHashtags, setCaptionIncludeHashtags] = useState<boolean>(true);

  // 3. REELS
  const [reelsDuration, setReelsDuration] = useState<string>("30 a 45 segundos (Alta Retenção)");
  const [reelsStyle, setReelsStyle] = useState<string>("Falando para câmera (Talking Head)");
  const [reelsIncludeOnScreen, setReelsIncludeOnScreen] = useState<boolean>(true);
  const [reelsIncludeBroll, setReelsIncludeBroll] = useState<boolean>(true);
  const [reelsIncludeDeliveryNotes, setReelsIncludeDeliveryNotes] = useState<boolean>(true);

  // 4. CARROSSEL
  const [carouselSlides, setCarouselSlides] = useState<number>(8);
  const [carouselType, setCarouselType] = useState<string>("Passo a Passo / Guia Prático");
  const [carouselWordLimit, setCarouselWordLimit] = useState<string>("Máx 25-30 palavras por slide (Design limpo)");
  const [carouselIncludeSaveShare, setCarouselIncludeSaveShare] = useState<boolean>(true);

  // 5. LANDING PAGE
  const [lpGoal, setLpGoal] = useState<string>("Agendamento de Diagnóstico / Reunião Estratégica");
  const [lpIncludeFaq, setLpIncludeFaq] = useState<boolean>(true);
  const [lpIncludePains, setLpIncludePains] = useState<boolean>(true);
  const [lpIncludeGuarantee, setLpIncludeGuarantee] = useState<boolean>(true);

  // Modais de Diálogo (CRUD Públicos, Linha Editorial e Próximo Passo)
  const [audienceModalOpen, setAudienceModalOpen] = useState(false);
  const [editingAudience, setEditingAudience] = useState<AudienceRecord | null>(null);
  const [newAudienceName, setNewAudienceName] = useState("");
  const [newAudienceDesc, setNewAudienceDesc] = useState("");
  const [newAudiencePain, setNewAudiencePain] = useState("");

  const [editorialModalOpen, setEditorialModalOpen] = useState(false);
  const [newPillarName, setNewPillarName] = useState("");
  const [newTheme, setNewTheme] = useState("");
  const [newObjective, setNewObjective] = useState("");

  // Dores e Diferenciais da Identidade do Cliente
  const [clientPains, setClientPains] = useState<string[]>([]);
  const [clientDifferentials, setClientDifferentials] = useState<string[]>([]);
  const [aiSuggestedIdeas, setAiSuggestedIdeas] = useState<string[]>([]);
  const [loadingSuggestedIdeas, setLoadingSuggestedIdeas] = useState<boolean>(false);
  const [generatingEditorialLines, setGeneratingEditorialLines] = useState<boolean>(false);

  // Chave OpenRouter
  const [openRouterKey, setOpenRouterKey] = useState<string>("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Saídas: Prompt & IA
  const [promptText, setPromptText] = useState("");
  const [aiOutput, setAiOutput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedAi, setCopiedAi] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);

  // Sequência Lógica de Headlines
  const [parsedHeadlines, setParsedHeadlines] = useState<string[]>([]);
  const [favoriteHeadlines, setFavoriteHeadlines] = useState<string[]>([]);
  const [chosenHeadline, setChosenHeadline] = useState<string>("");
  const [nextStepModalOpen, setNextStepModalOpen] = useState(false);

  // 1. Carregar lista de clientes ao montar
  useEffect(() => {
    fetchClients();
    const savedKey = localStorage.getItem("otimizza_openrouter_key");
    if (savedKey) setOpenRouterKey(savedKey);
  }, []);

  // 2. Carregar públicos, DNA e linhas editoriais ao mudar cliente
  useEffect(() => {
    if (!selectedClientId) {
      contextRequest.current++;
      setCommunicationProfile(emptyCommunicationProfile);
      setPieceSpeaker("");setPieceAudience("");setPieceVoice("");
      setAudiences([]);
      setEditorialLines([]);
      setBrandContext("");
      return;
    }
    loadClientData(selectedClientId);
  }, [selectedClientId]);

  // 3. Atualizar prompt automaticamente conforme os parâmetros mudam
  useEffect(() => {
    buildPrompt();
  }, [
    format,
    idea,
    selectedAudience,
    selectedTone,
    customTone,
    selectedCta,
    customCta,
    brandContext,
    chosenHeadline,
    headlineCount,
    headlineStyles,
    headlineType,
    headlineUrgency,
    captionLength,
    captionStructure,
    captionEmojiLevel,
    captionIncludeAltHook,
    captionIncludeHashtags,
    reelsDuration,
    reelsStyle,
    reelsIncludeOnScreen,
    reelsIncludeBroll,
    reelsIncludeDeliveryNotes,
    carouselSlides,
    carouselType,
    carouselWordLimit,
    carouselIncludeSaveShare,
    lpGoal,
    lpIncludeFaq,
    lpIncludePains,
    lpIncludeGuarantee,
  ]);

  // 4. Parse das headlines quando a IA responder no formato HEADLINES
  useEffect(() => {
    if ((format === "HEADLINES" || format === "SIMILAR_HEADLINES") && aiOutput) {
      const lines = aiOutput
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => /^\d+[\.\-\)]\s+/.test(l))
        .map((l) => l.replace(/^\d+[\.\-\)]\s+/, "").replace(/^["']|["']$/g, "").trim());

      if (lines.length > 0) {
        setParsedHeadlines(lines);
      }
    } else {
      setParsedHeadlines([]);
    }
  }, [aiOutput, format]);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/content-studio/clients");
      const data = await res.json();
      if (data.clients && data.clients.length > 0) {
        setClients(data.clients);
        // Selecionar o primeiro cliente por padrão se houver
        // O cliente é escolhido explicitamente no seletor global.
      }
    } catch (e) {
      console.error("Erro ao buscar clientes:", e);
    }
  };

  const loadClientData = async (clientId: string) => {
    const requestId=++contextRequest.current;
    setLoadingData(true);
    try {
      const [audRes, elRes, presetRes, calRes, identRes] = await Promise.all([
        fetch(`/api/content-studio/audiences?clientId=${clientId}`),
        fetch(`/api/content-studio/editorial-lines?clientId=${clientId}`),
        fetch(`/api/content-studio/brand-presets?clientId=${clientId}`),
        fetch(`/api/content-studio/calendar?clientId=${clientId}`),
        fetch(`/api/clients/${clientId}/identity`),
      ]);

      const [audData, elData, presetData, calData, identData] = await Promise.all([
        audRes.json(),
        elRes.json(),
        presetRes.json(),
        calRes.json(),
        identRes.ok ? identRes.json() : null,
      ]);

      if(requestId!==contextRequest.current)return;
      const profile=CommunicationProfileSchema.parse(identData?.communicationProfile||{});
      setCommunicationProfile(profile);
      setPieceSpeaker(profile.speakerTypes.length===1?profile.speakerTypes[0]:"");
      setPieceAudience(profile.audienceTypes.length===1?profile.audienceTypes[0]:"");
      setPieceVoice(profile.contentVoices.length===1?profile.contentVoices[0]:"");
      if (audData.audiences) {
        setAudiences(audData.audiences);
        const def = audData.audiences.find((a: AudienceRecord) => a.is_default);
        setSelectedAudience(def ? def.name : audData.audiences[0]?.name || "");
      }

      if (elData.editorialLines) {
        setEditorialLines(elData.editorialLines);
      }

      if (identData) {
        setClientPains(Array.isArray(identData.painPoints) ? identData.painPoints : []);
        setClientDifferentials(Array.isArray(identData.differentials) ? identData.differentials : []);
      } else {
        setClientPains([]);
        setClientDifferentials([]);
      }
      setAiSuggestedIdeas([]);

      if (identData && (identData.brandContext || identData.valueProposition)) {
        setBrandContext(identData.brandContext || identData.valueProposition);
        if (identData.toneOfVoice?.length > 0) setSelectedTone(identData.toneOfVoice[0]);
        if (identData.defaultCtas?.length > 0) setSelectedCta(identData.defaultCtas[0]);
        if (identData.targetAudiences?.length > 0 && !selectedAudience) {
          setSelectedAudience(identData.targetAudiences[0]);
        }
      } else if (presetData.preset) {
        setBrandContext(presetData.preset.brand_context || "");
        if (presetData.preset.default_tones?.[0]) setSelectedTone(presetData.preset.default_tones[0]);
        if (presetData.preset.default_ctas?.[0]) setSelectedCta(presetData.preset.default_ctas[0]);
      } else {
        // Fallback para contexto padrão Otimizza
        setBrandContext("");
      }

      if (calData.items) {
        setCalendarItems(calData.items);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do cliente:", err);
    } finally {
      if(requestId===contextRequest.current)setLoadingData(false);
    }
  };

  const handleGenerateEditorialLines = async () => {
    if (!selectedClientId) return;
    setGeneratingEditorialLines(true);
    try {
      const res = await fetch("/api/content-studio/editorial-lines/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClientId }),
      });
      const data = await res.json();
      if (!res.ok || data.success !== true || data.source !== "OPENROUTER") throw new Error(data.error || "A geração de linhas editoriais não foi confirmada.");
      if (data.editorialLines) {
        setEditorialLines(data.editorialLines);
        setNotification({ message: "4 Linhas Editoriais Geradas com Sucesso!", type: "success" });
      } else if (data.error) {
        setNotification({ message: data.error, type: "error" });
      }
    } catch (e) {
      console.error(e);
      setNotification({ message: e instanceof Error ? e.message : "Erro ao gerar linhas com IA.", type: "error" });
    } finally {
      setGeneratingEditorialLines(false);
    }
  };

  const handleSuggestIdeasWithAi = async () => {
    if (!selectedClientId) return;
    setLoadingSuggestedIdeas(true);
    setAiSuggestedIdeas([]);
    setNotification(null);
    try {
      const res = await fetch("/api/content-studio/ideas/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClientId }),
      });
      const data = await res.json();
      if (!res.ok || data.success !== true || data.source !== "OPENROUTER") throw new Error(data.error || "A geração de ideias não foi confirmada.");
      if (data.ideas && data.ideas.length > 0) {
        setAiSuggestedIdeas(data.ideas);
        setNotification({ message: "5 ideias estratégicas geradas pela IA!", type: "success" });
      }
    } catch (e) {
      console.error(e);
      setNotification({ message: e instanceof Error ? e.message : "Não foi possível gerar ideias pela IA.", type: "error" });
    } finally {
      setLoadingSuggestedIdeas(false);
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // Constrói o Prompt estruturado
  const buildPrompt = () => {
    const toneToUse = customTone.trim() || selectedTone;
    const ctaToUse = customCta.trim() || selectedCta;
    const clientName = selectedClient ? (selectedClient.trade_name || selectedClient.name) : "Otimizza";

    const lines: string[] = [
      "Atue como Diretor Criativo e Redator Sênior de Marketing. Escreva em português brasileiro com alto rigor editorial.",
      "",
      `CLIENTE / MARCA: ${clientName}`,
      `PÚBLICO-ALVO: ${pieceAudience || selectedAudience || "Público não informado; consultar a identidade da empresa"}`,
      `TOM DE VOZ: ${toneToUse}`,
      `CHAMADA PARA AÇÃO (CTA): ${ctaToUse}`,
    ];

    if (brandContext.trim()) {
      lines.push(`CONTEXTO E DNA DA MARCA:\n${brandContext.trim()}`);
    }

    if (chosenHeadline.trim()) {
      lines.push(`HEADLINE ESCOLHIDA:\n"${chosenHeadline.trim()}"`);
    }

    lines.push("");
    lines.push("PAUTA / IDEIA CENTRAL:");
    lines.push(idea.trim() || "[Defina a ideia central ou dor do cliente]");

    lines.push("");
    lines.push("REGRAS DE ENTREGA E CONFIGURAÇÕES ESPECÍFICAS:");
    if (format === "HEADLINES") {
      lines.push(`• Quantidade desejada: exatamente ${headlineCount} headlines.`);
      lines.push(`• Ângulos e estilos prioritários: ${headlineStyles.join(", ") || "Variações estratégicas"}.`);
      lines.push(`• Formato do título: ${headlineType}.`);
      if (headlineUrgency) lines.push("• Diretriz de tom: Foco em autoridade executiva, firmeza e seriedade.");
      lines.push("• Entregue em lista numerada de 1 a N.");
    } else if (format === "CAPTION") {
      lines.push(`• Extensão da legenda: ${captionLength}.`);
      lines.push(`• Estrutura de copy: ${captionStructure}.`);
      lines.push(`• Uso de emojis: ${captionEmojiLevel}.`);
      if (captionIncludeAltHook) lines.push("• Forneça 1 opção alternativa de primeiro parágrafo/gancho de abertura (para teste A/B).");
      lines.push("• Use quebras de linha limpas para garantir leitura escaneável no smartphone.");
      if (captionIncludeHashtags) lines.push("• Inclua 4 a 6 hashtags estratégicas e nichadas ao final.");
    } else if (format === "REELS") {
      lines.push(`• Duração estimada do vídeo: ${reelsDuration}.`);
      lines.push(`• Estilo de gravação: ${reelsStyle}.`);
      lines.push("• Crie DUAS OPÇÕES DISTINTAS E COMPLETAS de roteiro (Opção 1: Ângulo Direto/Confrontacional; Opção 2: Ângulo Narrativo/Bastidores).");
      if (reelsIncludeOnScreen) lines.push("• Inclua indicações claras de [TEXTO NA TELA] (lettering) sincronizado com a fala.");
      if (reelsIncludeBroll) lines.push("• Inclua sugestões de cortes de cena e B-rolls visuais a cada 3 a 5 segundos.");
      if (reelsIncludeDeliveryNotes) lines.push("• Inclua instruções de entonação e linguagem corporal para quem vai gravar.");
    } else if (format === "CAROUSEL") {
      lines.push(`• Quantidade de slides: exatamente ${carouselSlides} slides.`);
      lines.push(`• Tipo de estrutura: ${carouselType}.`);
      lines.push(`• Limite de palavras: ${carouselWordLimit}.`);
      lines.push("• Crie DUAS OPÇÕES COMPLETAS de carrossel (Estrutura A e Estrutura B) slide a slide.");
      lines.push("• Slide 1 (Capa): Título com gancho de alto impacto + subtítulo explicativo curto.");
      lines.push("• Slides intermediários: Apenas uma ideia central por slide para leitura rápida.");
      if (carouselIncludeSaveShare) lines.push("• Slide final: Resumo dos pontos + CTA claro convidando a SALVAR e COMPARTILHAR.");
    } else if (format === "LANDING_PAGE") {
      lines.push(`• Objetivo da Landing Page: ${lpGoal}.`);
      lines.push("• Estrutura completa de copy dividida em seções:");
      lines.push("  - Dobra Superior (Hero): Headline de impacto, subheadline explicativa, CTA e bullet points de valor.");
      if (lpIncludePains) lines.push("  - Dores e Sintomas do ICP: Conexão imediata com os problemas que o cliente enfrenta.");
      lines.push("  - Como Funciona / Solução: Passo a passo claro da entrega.");
      lines.push("  - Diferenciais e Autoridade: Por que esta assessoria/serviço.");
      if (lpIncludeFaq) lines.push("  - FAQ: 4 a 5 dúvidas mais frequentes respondidas estrategicamente.");
      if (lpIncludeGuarantee) lines.push("  - Chamada Final de Ação: CTA forte com garantia e alívio de risco.");
    }

    lines.push("• Evite clichês corporativos, travessões excessivos e promessas vazias. Mantenha vocabulário maduro.");

    setPromptText(lines.join("\n"));
  };

  // Disparo da IA com OpenRouter
  const handleGenerateAi = async (overrideFormat?: string, overridePayload?: Record<string, unknown>) => {
    if(loadingData){setNotification({message:"Aguarde o contexto do cliente terminar de carregar.",type:"info"});return;}
    setAiLoading(true);
    setAiOutput("");
    setNotification(null);

    const formatToUse = overrideFormat || format;
    const toneToUse = customTone.trim() || selectedTone;
    const ctaToUse = customCta.trim() || selectedCta;
    const clientName = selectedClient ? (selectedClient.trade_name || selectedClient.name) : "Otimizza";

    const formatConfigPayload = {
      headlineCount,
      headlineStyles,
      headlineType,
      headlineUrgency,
      captionLength,
      captionStructure,
      captionEmojiLevel,
      captionIncludeAltHook,
      captionIncludeHashtags,
      reelsDuration,
      reelsStyle,
      reelsIncludeOnScreen,
      reelsIncludeBroll,
      reelsIncludeDeliveryNotes,
      carouselSlides,
      carouselType,
      carouselWordLimit,
      carouselIncludeSaveShare,
      lpGoal,
      lpIncludeFaq,
      lpIncludePains,
      lpIncludeGuarantee,
    };

    try {
      const res = await fetch("/api/ai/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId || "otimizza",
          communicationChoice:{speaker:pieceSpeaker||undefined,audience:pieceAudience||undefined,voice:pieceVoice||undefined},
          format: formatToUse,
          prompt: promptText,
          clientName,
          centralIdea: idea,
          selectedHeadline: chosenHeadline,
          favoriteHeadlines,
          audience: selectedAudience,
          tone: toneToUse,
          cta: ctaToUse,
          customApiKey: openRouterKey.trim() || undefined,
          formatConfig: formatConfigPayload,
          ...overridePayload,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success !== true || data.source !== "OPENROUTER") {
        throw new Error(data.error || "A geração pela IA não foi confirmada.");
      }

      setAiOutput(data.result || "");
      if (data.notice) {
        setNotification({ message: data.notice, type: "info" });
      } else {
        setNotification({ message: `Conteúdo gerado com sucesso via ${data.modelUsed || "IA"}!`, type: "success" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha na chamada de IA.";
      setNotification({ message: msg, type: "error" });
    } finally {
      setAiLoading(false);
    }
  };

  // Gerar +10 semelhantes com base nas favoritas
  const handleGenerateSimilar = () => {
    if (favoriteHeadlines.length === 0) {
      alert("Selecione ao menos 1 headline favorita usando a caixa de seleção.");
      return;
    }
    handleGenerateAi("SIMILAR_HEADLINES", { favoriteHeadlines });
  };

  // Aprovar Headline e perguntar próximo passo
  const handleSelectHeadline = (hl: string) => {
    setChosenHeadline(hl);
    setNextStepModalOpen(true);
  };

  // Ramificação inteligente para próximo passo
  const proceedToNextStep = (nextFormat: "CAPTION" | "REELS" | "CAROUSEL") => {
    setFormat(nextFormat);
    setNextStepModalOpen(false);
    // Dispara a IA para o novo formato com a headline aprovada
    setTimeout(() => {
      handleGenerateAi(nextFormat, { selectedHeadline: chosenHeadline });
    }, 100);
  };

  // Salvar no Calendário do Cliente
  const handleSaveToCalendar = async () => {
    if (!selectedClientId) {
      alert("Selecione um cliente primeiro.");
      return;
    }

    try {
      const clientName = selectedClient ? (selectedClient.trade_name || selectedClient.name) : "Cliente";
      const res = await fetch("/api/content-studio/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          scheduledDate,
          scheduledTime,
          format,
          status: "IN_CREATION",
          title: chosenHeadline || idea.slice(0, 80) || `Peça de ${format}`,
          centralIdea: idea,
          targetAudienceName: selectedAudience,
          toneOfVoice: customTone || selectedTone,
          callToAction: customCta || selectedCta,
          promptUsed: promptText,
          headlinesGenerated: parsedHeadlines,
          selectedHeadline: chosenHeadline || null,
          captionsGenerated: format === "CAPTION" ? [aiOutput] : [],
          selectedCaption: format === "CAPTION" ? aiOutput : null,
          reelsOptions: format === "REELS" ? [aiOutput] : [],
          selectedReels: format === "REELS" ? aiOutput : null,
          carouselOptions: format === "CAROUSEL" ? [aiOutput] : [],
          selectedCarousel: format === "CAROUSEL" ? aiOutput : null,
        }),
      });

      if (res.ok) {
        setNotification({
          message: `Conteúdo salvo com sucesso no Calendário de ${clientName}!`,
          type: "success",
        });
        loadClientData(selectedClientId);
      } else {
        const d = await res.json();
        alert(d.error || "Erro ao salvar no calendário.");
      }
    } catch (e) {
      alert("Erro ao salvar no calendário.");
    }
  };

  // Salvar no Feed (Social Media 4:5) ou em Campanhas de Ads
  const handleSaveToFeedOrAds = async () => {
    if (!selectedClientId) {
      alert("Selecione um cliente primeiro.");
      return;
    }

    try {
      const res = await fetch("/api/content-studio/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          title: chosenHeadline || idea.slice(0, 80) || `Peça de ${format}`,
          centralIdea: idea,
          format,
          status: "PLANNED",
          contentType: contentMode,
          adStatus: "ACTIVE",
          postTag: contentMode === "ADS" ? "Campanha Ads" : (format === "CAROUSEL" ? "Carrossel" : format === "REELS" ? "Reels" : "Feed 4:5"),
          selectedHeadline: chosenHeadline || null,
          selectedCaption: format === "CAPTION" ? aiOutput : null,
          selectedReels: format === "REELS" ? aiOutput : null,
          selectedCarousel: format === "CAROUSEL" ? aiOutput : null,
          promptUsed: promptText,
          toneOfVoice: customTone || selectedTone,
          callToAction: customCta || selectedCta,
          scheduledDate,
        }),
      });

      if (res.ok) {
        setNotification({
          message: contentMode === "ADS" ? "Criativo salvo com sucesso em Campanhas & Ads!" : "Publicação salva com sucesso no Feed do Cliente (4:5)!",
          type: "success",
        });
      } else {
        alert("Erro ao salvar publicação.");
      }
    } catch {
      alert("Falha ao salvar publicação.");
    }
  };

  // Salvar DNA da Marca como padrão do cliente
  const handleSaveBrandPreset = async () => {
    if (!selectedClientId) return;
    try {
      const res = await fetch("/api/content-studio/brand-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          brandContext,
          defaultTones: [selectedTone],
          defaultCtas: [selectedCta],
        }),
      });
      if (res.ok) {
        setNotification({ message: "DNA e predefinições salvas com sucesso para o cliente!", type: "success" });
      }
    } catch {
      alert("Erro ao salvar predefinição.");
    }
  };

  // Salvar Público-Alvo
  const handleSaveAudience = async () => {
    if (!selectedClientId || !newAudienceName.trim()) {
      alert("Nome do público é obrigatório.");
      return;
    }

    try {
      const painArr = newAudiencePain.split("\n").map((p) => p.trim()).filter(Boolean);
      const isEditing = Boolean(editingAudience?.id);
      const endpoint = "/api/content-studio/audiences";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAudience?.id,
          clientId: selectedClientId,
          name: newAudienceName,
          description: newAudienceDesc,
          painPoints: painArr,
          isDefault: true,
        }),
      });

      if (res.ok) {
        setAudienceModalOpen(false);
        setEditingAudience(null);
        setNewAudienceName("");
        setNewAudienceDesc("");
        setNewAudiencePain("");
        loadClientData(selectedClientId);
      }
    } catch {
      alert("Erro ao salvar público.");
    }
  };

  // Excluir Público
  const handleDeleteAudience = async (id: string) => {
    if (!confirm("Deseja realmente remover este público-alvo?")) return;
    try {
      await fetch(`/api/content-studio/audiences?id=${id}`, { method: "DELETE" });
      loadClientData(selectedClientId);
    } catch {
      alert("Erro ao remover público.");
    }
  };

  return (
    <AppShell activeSection="prompt_creator">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Cabeçalho Superior do Estúdio */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                Pilar Produção
              </span>
              <span className="text-xs text-zinc-400">•</span>
              <span className="text-xs font-semibold text-zinc-500">Fábrica de Conteúdo com IA</span>
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight mt-1 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-emerald-600" />
              Estúdio de Criação de Conteúdo & IA
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Conecte a estratégia de marca aos melhores modelos de IA para produzir roteiros, carrosséis, legendas e headlines.
            </p>
          </div>

          {/* Abas Superiores */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl">
            <button
              onClick={() => setActiveTab("STUDIO")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "STUDIO" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              🎨 Estúdio Criativo
            </button>
            <button
              onClick={() => setActiveTab("CALENDAR")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "CALENDAR" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              📅 Calendário ({calendarItems.length})
            </button>
            <button
              onClick={() => setActiveTab("EDITORIAL")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "EDITORIAL" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              📚 Linhas Editoriais ({editorialLines.length})
            </button>
            <Link
              href="/prompt-creator/saved"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition flex items-center gap-1.5"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Feed & Criativos Salvos
            </Link>
          </div>
        </div>

        {/* Notificações / Alertas */}
        {notification && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
              notification.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : notification.type === "error"
                ? "bg-rose-50 text-rose-900 border-rose-200"
                : "bg-blue-50 text-blue-900 border-blue-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-xs font-bold underline opacity-70 hover:opacity-100">
              Fechar
            </button>
          </div>
        )}

        {/* ==================================================================== */}
        {/* ABA 1: ESTÚDIO CRIATIVO PRINCIPAL */}
        {/* ==================================================================== */}
        {activeTab==="STUDIO"&&(communicationProfile.speakerTypes.length>0||communicationProfile.audienceTypes.length>0||communicationProfile.contentVoices.length>0)&&<section className="p-4 bg-white border rounded-xl mb-4"><h2 className="font-semibold text-sm mb-3">Quem comunica e para quem é esta peça</h2><div className="grid gap-3 sm:grid-cols-3">{([{label:"Quem comunica",options:communicationProfile.speakerTypes,value:pieceSpeaker,set:setPieceSpeaker},{label:"Público desta peça",options:communicationProfile.audienceTypes,value:pieceAudience,set:setPieceAudience},{label:"Como aparece",options:communicationProfile.contentVoices,value:pieceVoice,set:setPieceVoice}]).map(field=><label className="text-xs" key={field.label}>{field.label}<select className="block w-full border rounded-lg p-2 mt-1" value={field.value} onChange={e=>field.set(e.target.value)} disabled={loadingData}><option value="">{field.options.length?"Selecione":"Não definido no cadastro"}</option>{field.options.map(option=><option key={option}>{option}</option>)}</select></label>)}</div></section>}
        {activeTab === "STUDIO" && (
          <div className="space-y-6">
            {/* BARRA DE SELEÇÃO DE CLIENTE & PONTO DE PARTIDA */}
            <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Selecionar Cliente com Digitação e Busca */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    1. Cliente do Conteúdo
                  </label>
                  <SearchableSelect
                    options={clients.map((c) => ({
                      value: c.id,
                      label: c.trade_name ? `${c.trade_name} (${c.name})` : c.name,
                    }))}
                    value={selectedClientId}
                    onChange={(val) => {setSelectedClientId(val); const company=availableCompanies.find(c=>c.id===val);if(company)selectCompany(company);}}
                    placeholder="Selecionar cliente..."
                    searchPlaceholder="Digitar para buscar cliente..."
                    className="w-full"
                  />
                </div>

                {/* 2. Selecionar da Linha Editorial */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
                      2. Ponto de Partida Editorial
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleGenerateEditorialLines}
                        disabled={generatingEditorialLines || !selectedClientId}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-lg border border-purple-200 transition"
                        title="Gerar automaticamente 4 pilares de alta conversão para este cliente"
                      >
                        {generatingEditorialLines ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-purple-600" />}
                        Gerar com IA
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorialModalOpen(true)}
                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        + Nova
                      </button>
                    </div>
                  </div>
                  <select
                    onChange={(e) => {
                      const line = editorialLines.find((l) => l.id === e.target.value);
                      if (line) {
                        setIdea(`${line.pillar_name}: ${line.theme}${line.objective ? ` - Objetivo: ${line.objective}` : ""}`);
                      }
                    }}
                    defaultValue=""
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                  >
                    <option value="">
                      {editorialLines.length === 0
                        ? "Nenhum pilar salvo. Clique em 'Gerar com IA' ao lado!"
                        : "Escolher pilar da linha editorial..."}
                    </option>
                    {editorialLines.map((el) => (
                      <option key={el.id} value={el.id}>
                        [{el.pillar_name}] {el.theme}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Agendamento no Calendário */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    3. Data & Horário de Publicação
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950"
                    />
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-24 px-2 py-2 rounded-xl border border-zinc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CAIXAS DE DIÁLOGO E DNA DA MARCA (Públicos, Tom e CTA em caixas visuais) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Card 1: Públicos-Alvo Salvos */}
              <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900">Públicos-Alvo</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAudience(null);
                      setNewAudienceName("");
                      setNewAudienceDesc("");
                      setNewAudiencePain("");
                      setAudienceModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="w-3 h-3" />
                    Adicionar
                  </button>
                </div>

                {audiences.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-2">Nenhum público salvo para este cliente.</p>
                ) : (
                  <div className="space-y-1.5">
                    {audiences.map((aud) => {
                      const isSelected = selectedAudience === aud.name;
                      return (
                        <div
                          key={aud.id}
                          onClick={() => setSelectedAudience(aud.name)}
                          className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition border ${
                            isSelected
                              ? "bg-blue-50 border-blue-300 text-blue-950 font-bold"
                              : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                          }`}
                        >
                          <span className="truncate">{aud.name}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAudience(aud);
                                setNewAudienceName(aud.name);
                                setNewAudienceDesc(aud.description || "");
                                setNewAudiencePain(aud.pain_points.join("\n"));
                                setAudienceModalOpen(true);
                              }}
                              className="p-1 text-zinc-400 hover:text-zinc-700"
                              title="Editar"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAudience(aud.id);
                              }}
                              className="p-1 text-rose-400 hover:text-rose-700"
                              title="Excluir"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Card 2: Tom de Voz */}
              <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900">Tom de Voz</h3>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400">Sugestões rápidas</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_TONES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setSelectedTone(t);
                        setCustomTone("");
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                        selectedTone === t && !customTone
                          ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs"
                          : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Ou digite um tom personalizado..."
                  value={customTone}
                  onChange={(e) => setCustomTone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-950"
                />
              </div>

              {/* Card 3: CTA Desejado */}
              <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-purple-600" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900">CTA (Chamada para Ação)</h3>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400">Conversão</span>
                </div>

                <div className="space-y-1">
                  {DEFAULT_CTAS.slice(0, 3).map((c) => (
                    <div
                      key={c}
                      onClick={() => {
                        setSelectedCta(c);
                        setCustomCta("");
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs truncate cursor-pointer transition border ${
                        selectedCta === c && !customCta
                          ? "bg-purple-600 text-white border-purple-600 font-bold"
                          : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      {c}
                    </div>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Ou digite um CTA personalizado..."
                  value={customCta}
                  onChange={(e) => setCustomCta(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-950"
                />
              </div>
            </div>

            {/* SELEÇÃO DE FORMATO & PAUTA / IDEIA CENTRAL */}
            <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-4">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                    {contentMode === "SOCIAL_MEDIA" ? "Formato Social Media" : "Formato Tráfego Pago & Meta Ads"}
                  </label>

                  {/* Switcher Social Media vs Ads */}
                  <div className="flex items-center bg-zinc-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setContentMode("SOCIAL_MEDIA");
                        setFormat("HEADLINES");
                      }}
                      className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 ${
                        contentMode === "SOCIAL_MEDIA"
                          ? "bg-white text-zinc-950 shadow-2xs font-bold"
                          : "text-zinc-600 hover:text-zinc-950"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-pink-600" />
                      Social Media (Feed 4:5)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setContentMode("ADS");
                        setFormat("CAPTION");
                      }}
                      className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 ${
                        contentMode === "ADS"
                          ? "bg-white text-zinc-950 shadow-2xs font-bold"
                          : "text-zinc-600 hover:text-zinc-950"
                      }`}
                    >
                      <Megaphone className="w-3.5 h-3.5 text-blue-600" />
                      Tráfego Pago & Ads
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {(contentMode === "SOCIAL_MEDIA" ? SOCIAL_FORMAT_OPTIONS : ADS_FORMAT_OPTIONS).map((f) => {
                    const Icon = f.icon;
                    const isSelected = format === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setFormat(f.id);
                          setAiOutput("");
                        }}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? "bg-zinc-950 text-white border-zinc-950 shadow-xs"
                            : "bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${isSelected ? "text-emerald-400" : "text-zinc-500"}`} />
                          <span className="text-xs font-bold">{f.label}</span>
                        </div>
                        <span className={`text-[10px] leading-tight ${isSelected ? "text-zinc-400" : "text-zinc-500"}`}>
                          {f.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PAINEL DINÂMICO DE CONFIGURAÇÕES ESPECÍFICAS DO FORMATO */}
              <div className="p-4 bg-zinc-50 border border-zinc-200/90 rounded-2xl space-y-3.5 transition-all">
                <div className="flex items-center justify-between border-b border-zinc-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-900">
                      Configurações do Formato: {FORMAT_OPTIONS.find((f) => f.id === format)?.label || format}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-500">
                    Ajuste os parâmetros abaixo para guiar a criação
                  </span>
                </div>

                {/* 1. SE FORMATO FOR HEADLINES */}
                {format === "HEADLINES" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Quantidade */}
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                          Quantidade de Headlines
                        </label>
                        <div className="flex gap-1.5">
                          {[5, 10, 15, 20].map((cnt) => (
                            <button
                              key={cnt}
                              type="button"
                              onClick={() => setHeadlineCount(cnt)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                                headlineCount === cnt
                                  ? "bg-zinc-950 text-white border-zinc-950 shadow-xs"
                                  : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                              }`}
                            >
                              {cnt} {cnt === 10 ? "(Padrão)" : ""}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Estilo do Título */}
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                          Tamanho & Estilo
                        </label>
                        <select
                          value={headlineType}
                          onChange={(e) => setHeadlineType(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                        >
                          <option value="Títulos Curtos e Diretos (até 8 palavras)">Curtos e Diretos (até 8 palavras)</option>
                          <option value="Títulos Completos com Contexto">Títulos Completos com Contexto (Padrão)</option>
                          <option value="Dupla: Gancho Visual + Subtítulo Explicativo">Dupla: Gancho Visual + Subtítulo</option>
                        </select>
                      </div>
                    </div>

                    {/* Ângulos / Tipos de Gancho */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                        Ângulos de Gancho Prioritários (clique para alternar)
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "Quebra de Crença",
                          "Erro/Alerta ('Pare de...')",
                          "Pergunta Provocativa",
                          "Dados & Listas",
                          "Como Fazer Descomplicado",
                          "Curiosidade / Contra-intuitivo",
                        ].map((angle) => {
                          const active = headlineStyles.includes(angle);
                          return (
                            <button
                              key={angle}
                              type="button"
                              onClick={() => {
                                if (active) {
                                  if (headlineStyles.length > 1) {
                                    setHeadlineStyles(headlineStyles.filter((s) => s !== angle));
                                  }
                                } else {
                                  setHeadlineStyles([...headlineStyles, angle]);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                                active
                                  ? "bg-emerald-600 text-white border-emerald-600 font-bold"
                                  : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                              }`}
                            >
                              {active ? "✓ " : "+ "} {angle}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Checkbox Urgência/Autoridade */}
                    <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-zinc-700 select-none">
                      <input
                        type="checkbox"
                        checked={headlineUrgency}
                        onChange={(e) => setHeadlineUrgency(e.target.checked)}
                        className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-medium">
                        Foco em autoridade executiva e seriedade corporativa (sem clichês de marketing apelativo)
                      </span>
                    </label>
                  </div>
                )}

                {/* 2. SE FORMATO FOR LEGENDAS */}
                {format === "CAPTION" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                          Tamanho da Legenda
                        </label>
                        <select
                          value={captionLength}
                          onChange={(e) => setCaptionLength(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                        >
                          <option value="Curta (~300 a 500 caracteres)">Curta (~300 a 500 carac.)</option>
                          <option value="Média (~600 a 1.200 caracteres)">Média (~600 a 1.200 carac. - Padrão)</option>
                          <option value="Longa / Storytelling (~1.300 a 2.200 caracteres)">Longa / Storytelling (~1.300 a 2.200 carac.)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                          Estrutura de Copywriting
                        </label>
                        <select
                          value={captionStructure}
                          onChange={(e) => setCaptionStructure(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                        >
                          <option value="PAS (Problema, Agitação, Solução)">PAS (Problema, Agitação, Solução)</option>
                          <option value="AIDA (Atenção, Interesse, Desejo, Ação)">AIDA (Atenção, Interesse, Desejo, Ação)</option>
                          <option value="Storytelling de Bastidores Reais">Storytelling de Bastidores Reais</option>
                          <option value="Direta ao Ponto / 3 Dicas Práticas">Direta ao Ponto / 3 Dicas Práticas</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                          Uso de Emojis
                        </label>
                        <select
                          value={captionEmojiLevel}
                          onChange={(e) => setCaptionEmojiLevel(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                        >
                          <option value="Mínimo (Executivo e sóbrio)">Mínimo (Executivo e sóbrio)</option>
                          <option value="Moderado (Marcadores e tópicos)">Moderado (Marcadores e tópicos)</option>
                          <option value="Nenhum (100% formal)">Nenhum (100% formal)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 select-none">
                        <input
                          type="checkbox"
                          checked={captionIncludeAltHook}
                          onChange={(e) => setCaptionIncludeAltHook(e.target.checked)}
                          className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-medium">Gerar gancho de abertura alternativo (Teste A/B)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 select-none">
                        <input
                          type="checkbox"
                          checked={captionIncludeHashtags}
                          onChange={(e) => setCaptionIncludeHashtags(e.target.checked)}
                          className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-medium">Incluir 4 a 6 hashtags estratégicas no rodapé</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* 3. SE FORMATO FOR REELS */}
                {format === "REELS" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                          Duração Estimada
                        </label>
                        <div className="flex gap-1.5">
                          {[
                            { id: "15 a 30s (Ultra Dinâmico / Viral)", label: "15-30s (Viral)" },
                            { id: "30 a 45s (Alta Retenção)", label: "30-45s (Padrão)" },
                            { id: "45 a 60s (Aprofundado / Aula)", label: "45-60s (Aula)" },
                          ].map((dur) => (
                            <button
                              key={dur.id}
                              type="button"
                              onClick={() => setReelsDuration(dur.id)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                                reelsDuration === dur.id
                                  ? "bg-zinc-950 text-white border-zinc-950 shadow-xs"
                                  : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                              }`}
                            >
                              {dur.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                          Estilo de Gravação
                        </label>
                        <select
                          value={reelsStyle}
                          onChange={(e) => setReelsStyle(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                        >
                          <option value="Falando para câmera (Talking Head)">Falando para câmera (Talking Head)</option>
                          <option value="Voz em Off com Cenas de Bastidores (B-roll)">Voz em Off com Bastidores (B-roll)</option>
                          <option value="Diálogo / Encenação de 2 Personagens (Empresário vs Cliente)">Diálogo / Encenação (Empresário vs Cliente)</option>
                          <option value="Tutorial Prático / Gravação de Tela">Tutorial Prático / Gravação de Tela</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 select-none">
                        <input
                          type="checkbox"
                          checked={reelsIncludeOnScreen}
                          onChange={(e) => setReelsIncludeOnScreen(e.target.checked)}
                          className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-medium">Indicações de [Texto na Tela]</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 select-none">
                        <input
                          type="checkbox"
                          checked={reelsIncludeBroll}
                          onChange={(e) => setReelsIncludeBroll(e.target.checked)}
                          className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-medium">Sugestões de cortes & B-roll</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 select-none">
                        <input
                          type="checkbox"
                          checked={reelsIncludeDeliveryNotes}
                          onChange={(e) => setReelsIncludeDeliveryNotes(e.target.checked)}
                          className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-medium">Instruções de tom & energia</span>
                      </label>
                    </div>

                    <p className="text-[11px] text-zinc-600 italic bg-white p-2.5 rounded-xl border border-zinc-200">
                      ✨ Sempre gera <strong>2 opções completas</strong>: Opção 1 (Ângulo Direto/Confronto) e Opção 2 (Ângulo Narrativo/Bastidor).
                    </p>
                  </div>
                )}

                {/* 4. SE FORMATO FOR CARROSSEL */}
                {format === "CAROUSEL" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                          Quantidade de Slides
                        </label>
                        <div className="flex gap-1.5">
                          {[
                            { count: 6, label: "6 Slides" },
                            { count: 8, label: "8 Slides (Padrão)" },
                            { count: 10, label: "10 Slides" },
                          ].map((sl) => (
                            <button
                              key={sl.count}
                              type="button"
                              onClick={() => setCarouselSlides(sl.count)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                                carouselSlides === sl.count
                                  ? "bg-zinc-950 text-white border-zinc-950 shadow-xs"
                                  : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                              }`}
                            >
                              {sl.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                          Estrutura Temática
                        </label>
                        <select
                          value={carouselType}
                          onChange={(e) => setCarouselType(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                        >
                          <option value="Passo a Passo / Guia Prático">Passo a Passo / Guia Prático</option>
                          <option value="5 Erros Fatais / Checklist">5 Erros Fatais / Checklist</option>
                          <option value="Desconstrução de Mito / Opinião Impopular">Desconstrução de Mito</option>
                          <option value="Estudo de Caso / Antes e Depois">Estudo de Caso / Antes e Depois</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                          Densidade de Texto
                        </label>
                        <select
                          value={carouselWordLimit}
                          onChange={(e) => setCarouselWordLimit(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                        >
                          <option value="Máx 25-30 palavras por slide (Design limpo)">Máx 25-30 palavras (Design limpo)</option>
                          <option value="Máx 45 palavras por slide (Mais explicativo)">Máx 45 palavras (Mais denso)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 select-none">
                        <input
                          type="checkbox"
                          checked={carouselIncludeSaveShare}
                          onChange={(e) => setCarouselIncludeSaveShare(e.target.checked)}
                          className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-medium">Slide final com CTA de alta conversão para SALVAR e COMPARTILHAR</span>
                      </label>
                    </div>

                    <p className="text-[11px] text-zinc-600 italic bg-white p-2.5 rounded-xl border border-zinc-200">
                      🎨 Sempre entrega <strong>2 estruturas slide a slide completas</strong> com capa magnética, micro-ganchos de retenção e CTA final.
                    </p>
                  </div>
                )}

                {/* 5. SE FORMATO FOR LANDING PAGE */}
                {format === "LANDING_PAGE" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                          Objetivo da Landing Page
                        </label>
                        <select
                          value={lpGoal}
                          onChange={(e) => setLpGoal(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                        >
                          <option value="Agendamento de Diagnóstico / Reunião Estratégica">Agendamento de Diagnóstico / Reunião</option>
                          <option value="Venda Direta de Serviço / Consultoria">Venda Direta de Serviço / Consultoria</option>
                          <option value="Captura de Lead / Isca Digital / Download">Captura de Lead / Isca Digital</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                          Seções Estruturais da Página
                        </label>
                        <div className="flex flex-wrap gap-3 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 select-none">
                            <input
                              type="checkbox"
                              checked={lpIncludePains}
                              onChange={(e) => setLpIncludePains(e.target.checked)}
                              className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="font-medium">Dores do ICP</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 select-none">
                            <input
                              type="checkbox"
                              checked={lpIncludeFaq}
                              onChange={(e) => setLpIncludeFaq(e.target.checked)}
                              className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="font-medium">FAQ de Objeções</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 select-none">
                            <input
                              type="checkbox"
                              checked={lpIncludeGuarantee}
                              onChange={(e) => setLpIncludeGuarantee(e.target.checked)}
                              className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="font-medium">Garantia / Alívio de Risco</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Campo da Ideia Central e Seleção de Dores/Diferenciais do Cliente */}
              <div className="space-y-3">
                {/* Sugestões Rápidas: Dores, Diferenciais e IA */}
                <div className="space-y-2.5 p-3.5 bg-gradient-to-r from-zinc-50 via-purple-50/30 to-white rounded-xl border border-zinc-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-xs font-bold text-zinc-900">
                        Ideias & Dores Cadastradas no Cliente (1-Clique para Preencher):
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSuggestIdeasWithAi}
                        disabled={loadingSuggestedIdeas || !selectedClientId}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-100/70 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition"
                      >
                        {loadingSuggestedIdeas ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                        Sugerir 5 Ideias com IA
                      </button>

                      {selectedClientId && (
                        <Link
                          href={`/clients/${selectedClientId}/identity`}
                          target="_blank"
                          className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 underline"
                        >
                          Configurar DNA & Dores &rarr;
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Chips de Dores */}
                  {clientPains.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-rose-600 block">
                        🔥 Dores do Cliente Cadastradas:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {clientPains.map((pain, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setIdea(`Como solucionar o desafio de: "${pain}" sem desperdiçar tempo e dinheiro.`)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition text-left"
                            title="Clique para usar esta dor como ideia central"
                          >
                            {pain}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chips de Diferenciais */}
                  {clientDifferentials.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-blue-600 block">
                        💎 Diferenciais da Marca:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {clientDifferentials.map((diff, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setIdea(`Por que ${diff} é a nossa maior vantagem competitiva e como isso gera resultado.`)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition text-left"
                            title="Clique para usar este diferencial como ideia central"
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chips de Ideias sugeridas com IA */}
                  {aiSuggestedIdeas.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-purple-100">
                      <span className="text-[10px] uppercase font-bold text-purple-700 block flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        Sugestões Criativas da IA para {selectedClient ? (selectedClient.trade_name || selectedClient.name) : "este Cliente"}:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {aiSuggestedIdeas.map((aiIdea, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setIdea(aiIdea)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100 hover:border-purple-300 transition text-left"
                            title="Clique para aplicar esta ideia"
                          >
                            💡 {aiIdea}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {clientPains.length === 0 && clientDifferentials.length === 0 && aiSuggestedIdeas.length === 0 && (
                    <p className="text-[11px] text-zinc-500">
                      Nenhuma dor ou diferencial salvo ainda no cadastro deste cliente. Clique em &quot;Sugerir 5 Ideias com IA&quot; acima para gerar na hora ou cadastre no DNA do Cliente.
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                      Ideia Central / Dúvida do Empresário
                    </label>
                    {chosenHeadline && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        Headline Ativa: &quot;{chosenHeadline}&quot;
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="Ex: O empresário reclama que o lead é desqualificado, mas demora 4 horas para responder no WhatsApp e perde a venda."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                  />
                </div>
              </div>

              {/* Configuração de Contexto da Marca & Status da IA */}
              <div className="pt-2 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveBrandPreset}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-800 font-semibold hover:bg-zinc-200 transition"
                  >
                    <Save className="w-3.5 h-3.5 text-zinc-500" />
                    Salvar estas configurações como padrão deste cliente
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Motor IA Otimizza Ativo (Servidor)
                  </span>

                  <button
                    type="button"
                    onClick={() => setShowKeyInput(!showKeyInput)}
                    className="text-[11px] text-zinc-400 hover:text-zinc-600 p-1"
                    title="Configurações avançadas de API"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {showKeyInput && (
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2 text-xs animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-700">Chave de API OpenRouter (Opcional - Substitui a chave do Servidor):</span>
                    <span className="text-zinc-400 text-[10px]">Salvo com segurança no seu navegador</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="sk-or-v1-..."
                      value={openRouterKey}
                      onChange={(e) => {
                        setOpenRouterKey(e.target.value);
                        localStorage.setItem("otimizza_openrouter_key", e.target.value);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyInput(false)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white font-bold"
                    >
                      OK
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ================================================================ */}
            {/* AS DUAS CAIXAS: PROMPT E RESULTADO DA IA */}
            {/* ================================================================ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* CAIXA 1: O PROMPT GERADO */}
              <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-500" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900">
                      Prompt Estruturado
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(promptText);
                      setCopiedPrompt(true);
                      setTimeout(() => setCopiedPrompt(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold hover:bg-zinc-50 transition"
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPrompt ? "Copiado!" : "Copiar Prompt"}</span>
                  </button>
                </div>

                <textarea
                  rows={14}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 text-xs font-mono text-zinc-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950 resize-y"
                />

                <p className="text-[11px] text-zinc-400">
                  Este prompt carrega as regras e diretrizes dos 20 manuais estratégicos da Otimizza.
                </p>
              </div>

              {/* CAIXA 2: RESULTADO GERADO COM IA (OPENROUTER) */}
              <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-3 lg:sticky lg:top-20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900">
                      Resultado Gerado com IA
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={aiLoading}
                      onClick={() => handleGenerateAi()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      {aiLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Gerando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Gerar com IA</span>
                        </>
                      )}
                    </button>

                    {aiOutput && (
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(aiOutput);
                          setCopiedAi(true);
                          setTimeout(() => setCopiedAi(false), 2000);
                        }}
                        className="p-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition"
                        title="Copiar texto gerado"
                      >
                        {copiedAi ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Exibição Estruturada de Headlines com Seleção & Sequência Lógica */}
                {parsedHeadlines.length > 0 ? (
                  <div className="space-y-2 border border-zinc-200 rounded-xl p-3 bg-zinc-50/50 max-h-[380px] overflow-y-auto">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-200 text-xs font-bold text-zinc-600">
                      <span>Selecione as que mais gostou ou aprove a vencedora:</span>
                      {favoriteHeadlines.length > 0 && (
                        <button
                          type="button"
                          onClick={handleGenerateSimilar}
                          disabled={aiLoading}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold hover:bg-emerald-200 transition"
                        >
                          <Sparkles className="w-3 h-3" />
                          Gerar +10 semelhantes ({favoriteHeadlines.length})
                        </button>
                      )}
                    </div>

                    {parsedHeadlines.map((hl, idx) => {
                      const isFav = favoriteHeadlines.includes(hl);
                      const isChosen = chosenHeadline === hl;

                      return (
                        <div
                          key={idx}
                          className={`flex items-start justify-between gap-3 p-2.5 rounded-xl border transition ${
                            isChosen
                              ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-bold"
                              : isFav
                              ? "bg-blue-50/60 border-blue-200 text-zinc-900"
                              : "bg-white border-zinc-200 text-zinc-800 hover:border-zinc-300"
                          }`}
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isFav}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFavoriteHeadlines([...favoriteHeadlines, hl]);
                                } else {
                                  setFavoriteHeadlines(favoriteHeadlines.filter((h) => h !== hl));
                                }
                              }}
                              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                              title="Marcar como favorita"
                            />
                            <span className="text-xs leading-relaxed">{hl}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectHeadline(hl)}
                            className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                              isChosen
                                ? "bg-emerald-600 text-white"
                                : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800"
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            {isChosen ? "Escolhida" : "Escolher"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    rows={14}
                    value={aiOutput}
                    onChange={(e) => setAiOutput(e.target.value)}
                    placeholder="Clique em 'Gerar com IA' para produzir o conteúdo completo com o tom e DNA da marca."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-sans text-zinc-900 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950 resize-y"
                  />
                )}

                {/* Botão de Salvar no Calendário */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="text-[11px] text-zinc-400">
                    {aiOutput ? `${aiOutput.length} caracteres gerados.` : "Nenhum conteúdo gerado ainda."}
                  </div>

                  {aiOutput && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveToFeedOrAds}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Salvar em Criativos & Feed ({contentMode === "ADS" ? "Ads" : "Feed 4:5"})</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveToCalendar}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Salvar no Calendário</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* ABA 2: CALENDÁRIO EDITORIAL DO CLIENTE */}
        {/* ==================================================================== */}
        {activeTab === "CALENDAR" && <ContentCalendar key={selectedClientId} clientId={selectedClientId} />}

        {activeTab === "EDITORIAL" && (
          <div className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-950">
                  Pilares e Linhas Editoriais — {selectedClient?.name || "Cliente"}
                </h2>
                <p className="text-xs text-zinc-500">Defina os temas centrais de autoridade e conteúdo recorrente.</p>
              </div>

              <button
                type="button"
                onClick={() => setEditorialModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Linha Editorial
              </button>
            </div>

            {editorialLines.length === 0 ? (
              <p className="text-xs text-zinc-400 py-8 text-center border border-dashed border-zinc-200 rounded-xl">
                Nenhuma linha editorial cadastrada. Clique em &quot;Nova Linha Editorial&quot; para estruturar a estratégia deste cliente.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {editorialLines.map((el) => (
                  <div key={el.id} className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                      {el.pillar_name}
                    </span>
                    <h3 className="text-xs font-bold text-zinc-900">{el.theme}</h3>
                    {el.objective && <p className="text-xs text-zinc-600">{el.objective}</p>}
                    <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Formatos: {el.preferred_formats?.join(", ")}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIdea(`${el.pillar_name}: ${el.theme}${el.objective ? ` - ${el.objective}` : ""}`);
                          setActiveTab("STUDIO");
                        }}
                        className="font-bold text-emerald-700 hover:underline"
                      >
                        Usar Ideia →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* MODAL 1: PERGUNTAR PRÓXIMO PASSO (SEQUÊNCIA LÓGICA DE HEADLINE) */}
        {/* ==================================================================== */}
        {nextStepModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-5 animate-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900">Headline Aprovada!</h3>
                  <p className="text-xs text-zinc-500">O que você quer criar agora a partir desta headline?</p>
                </div>
              </div>

              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-800 italic">
                &quot;{chosenHeadline}&quot;
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => proceedToNextStep("CAPTION")}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 hover:border-zinc-950 hover:bg-zinc-50 transition text-left group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <div>
                      <div className="text-xs font-bold text-zinc-900">1. Criar Legenda para Post</div>
                      <div className="text-[11px] text-zinc-500">Texto completo com abertura, desenvolvimento e CTA</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900" />
                </button>

                <button
                  type="button"
                  onClick={() => proceedToNextStep("REELS")}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 hover:border-zinc-950 hover:bg-zinc-50 transition text-left group"
                >
                  <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-purple-600" />
                    <div>
                      <div className="text-xs font-bold text-zinc-900">2. Criar Roteiro de Reels (2 Opções)</div>
                      <div className="text-[11px] text-zinc-500">Dois roteiros cronometrados com falas e textos de tela</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900" />
                </button>

                <button
                  type="button"
                  onClick={() => proceedToNextStep("CAROUSEL")}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 hover:border-zinc-950 hover:bg-zinc-50 transition text-left group"
                >
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="text-xs font-bold text-zinc-900">3. Criar Carrossel (2 Opções)</div>
                      <div className="text-[11px] text-zinc-500">Duas opções de carrossel slide a slide para Instagram</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900" />
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setNextStepModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-900"
                >
                  Apenas manter headline escolhida
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* MODAL 2: CADASTRO / EDIÇÃO DE PÚBLICO-ALVO */}
        {/* ==================================================================== */}
        {audienceModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in zoom-in-95">
              <h3 className="text-base font-extrabold text-zinc-900">
                {editingAudience ? "Editar Público-Alvo" : "Adicionar Novo Público-Alvo"}
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Nome do Público *</label>
                  <input
                    type="text"
                    placeholder="Ex: Empresário de Serviços / Dono de Loja"
                    value={newAudienceName}
                    onChange={(e) => setNewAudienceName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Descrição Breve</label>
                  <input
                    type="text"
                    placeholder="Ex: Fatura de R$ 50k a R$ 200k/mês, sem equipe interna de marketing"
                    value={newAudienceDesc}
                    onChange={(e) => setNewAudienceDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Dores Principais (uma por linha)</label>
                  <textarea
                    rows={4}
                    placeholder="Ex:&#10;Acha o lead desqualificado&#10;Demora para responder no WhatsApp&#10;Gasta com anúncio e não sabe o retorno"
                    value={newAudiencePain}
                    onChange={(e) => setNewAudiencePain(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setAudienceModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveAudience}
                  className="px-4 py-2 text-xs font-bold bg-zinc-950 text-white rounded-xl hover:bg-zinc-800"
                >
                  Salvar Público
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* MODAL 3: CADASTRO DE LINHA EDITORIAL */}
        {/* ==================================================================== */}
        {editorialModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in zoom-in-95">
              <h3 className="text-base font-extrabold text-zinc-900">Nova Linha Editorial</h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Pilar de Conteúdo *</label>
                  <input
                    type="text"
                    placeholder="Ex: Gestão & Processos, Dores do ICP, Bastidores"
                    value={newPillarName}
                    onChange={(e) => setNewPillarName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Tema / Assunto Recorrente *</label>
                  <input
                    type="text"
                    placeholder="Ex: Por que leads não fecham venda sem atendimento rápido"
                    value={newTheme}
                    onChange={(e) => setNewTheme(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Objetivo Estratégico</label>
                  <input
                    type="text"
                    placeholder="Ex: Gerar reflexão comercial e atrair contatos no WhatsApp"
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditorialModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newPillarName.trim() || !newTheme.trim()) {
                      alert("Pilar e Tema são obrigatórios.");
                      return;
                    }
                    await fetch("/api/content-studio/editorial-lines", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        clientId: selectedClientId,
                        pillarName: newPillarName,
                        theme: newTheme,
                        objective: newObjective,
                      }),
                    });
                    setEditorialModalOpen(false);
                    setNewPillarName("");
                    setNewTheme("");
                    setNewObjective("");
                    loadClientData(selectedClientId);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-zinc-950 text-white rounded-xl hover:bg-zinc-800"
                >
                  Salvar Linha
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function ContentStudioPage(){return <Suspense fallback={<p>Carregando estúdio...</p>}><ContentStudioPageContent /></Suspense>;}
