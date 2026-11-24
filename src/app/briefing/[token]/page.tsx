"use client";

import React, { useState, useEffect, use } from "react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
  ShieldCheck,
  Target,
  Award,
  Compass,
  Plus,
  X,
  ExternalLink,
  GraduationCap,
  HeartHandshake,
  Zap,
  Crown,
  Package,
  Trash2,
  Users,
  Layers,
  MessageSquare,
  HelpCircle,
  Copy,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp";

export interface CatalogItemOnboarding {
  id?: string;
  type: "SERVICE" | "PRODUCT";
  name: string;
  description: string;
  differentials: string;
  deliverables: string;
  target_pain_points?: string;
  solution_approach?: string;
  target_audience_ids?: string[];
  demographics?: {
    ageRange?: string;
    genderProfile?: string;
    professionLifestyle?: string;
  };
}

interface BriefingSessionData {
  id: string;
  token: string;
  companyName: string;
  contactName: string;
  websiteUrl?: string;
  mapsUrl?: string;
  instagramUrl?: string;
  initialNotes?: string;
  competitorNotes?: string;
  category?: string;
  servicesOffered?: string;
  catalogItems?: CatalogItemOnboarding[];
  brandHistory?: string;
  corePromise?: string;
  nonNegotiables?: string;
  salesObjections?: string;
  cnpj?: string;
  cnaeCode?: string;
  cnaeDescription?: string;
  audiences?: Array<{ id: string; name: string; description?: string | null }>;
  extractedIdentity?: Record<string, unknown>;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  progressPercent: number;
  credentialsSaved?: boolean;
}

export default function PublicBriefingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [session, setSession] = useState<BriefingSessionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Controle de etapa do carrossel:
  // 0: Boas-vindas
  // 1: O que você vende (Serviços e Produtos em Blocos)
  // 2: Públicos & Dores Direcionados por Serviço
  // 3: Diferenciais da Marca
  // 4: Estilo de Comunicação & Headlines (Linguagem para Leigos)
  // 5: Inspirações & Referências
  // 6: Conexão do Instagram
  // 7: Conclusão
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // 1. Estado de Serviços e Produtos (Catálogo)
  const [catalogItems, setCatalogItems] = useState<CatalogItemOnboarding[]>([]);
  const [isAddingCatalogItem, setIsAddingCatalogItem] = useState<boolean>(false);
  const [draftCatalogItem, setDraftCatalogItem] = useState<CatalogItemOnboarding>({
    type: "SERVICE",
    name: "",
    description: "",
    differentials: "",
    deliverables: "",
    target_pain_points: "",
    solution_approach: "",
    demographics: {
      ageRange: "Adultos (25 a 45 anos)",
      genderProfile: "Homens e Mulheres",
      professionLifestyle: "Profissionais liberais e rotina ativa",
    },
  });

  // 2. Estado de Públicos & Dores Direcionados por Serviço
  const [activeServiceIndex, setActiveServiceIndex] = useState<number>(0);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [availableAudiences, setAvailableAudiences] = useState<string[]>([]);
  const [customAudienceInput, setCustomAudienceInput] = useState<string>("");

  // 3. Diferenciais
  const [selectedDifferentials, setSelectedDifferentials] = useState<string[]>([]);
  const [availableDifferentials, setAvailableDifferentials] = useState<string[]>([]);
  const [customDifferentialInput, setCustomDifferentialInput] = useState<string>("");

  // 4. Tom de Voz & Headlines
  const [selectedTones, setSelectedTones] = useState<string[]>([]);
  const [toneBalance, setToneBalance] = useState<number>(50);
  const [selectedHeadlineAngles, setSelectedHeadlineAngles] = useState<string[]>([]);

  // 5. Concorrentes / Referências
  const [competitorsText, setCompetitorsText] = useState<string>("");
  const [noCompetitorReferences, setNoCompetitorReferences] = useState<boolean>(false);

  // 6. Instagram
  const [igUsername, setIgUsername] = useState<string>("");
  const [igPassword, setIgPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [skipCredentials, setSkipCredentials] = useState<boolean>(false);

  // IA Suggestions State
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string[]>>({});

  // Submissão final
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Carregamento inicial da sessão
  useEffect(() => {
    async function loadSession() {
      setLoading(true);
      try {
        const res = await fetch(`/api/briefing/${token}`);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Sessão não encontrada.");

        const data: BriefingSessionData = json.data;
        setSession(data);

        // Se já está completo, vai direto para tela de sucesso
        if (data.status === "COMPLETED") {
          setCurrentStep(7);
        }

        const ext = data.extractedIdentity || {};

        // 1. Hidratação do Catálogo de Produtos e Serviços
        let initialCatalog: CatalogItemOnboarding[] = [];
        if (Array.isArray(data.catalogItems) && data.catalogItems.length > 0) {
          initialCatalog = data.catalogItems;
        } else if (Array.isArray(ext.catalogItems) && ext.catalogItems.length > 0) {
          initialCatalog = ext.catalogItems as CatalogItemOnboarding[];
        } else if (data.servicesOffered && data.servicesOffered.trim()) {
          const parts = data.servicesOffered
            .split(/[,;\n]/)
            .map((s) => s.trim())
            .filter(Boolean);
          if (parts.length > 0) {
            initialCatalog = parts.map((name) => ({
              type: "SERVICE",
              name,
              description: `Atendimento e acompanhamento especializado em ${name}`,
              differentials: "Atendimento dedicado e metodologia personalizada",
              deliverables: "Sessões individuais e suporte direto",
              target_pain_points: "Busca de solução eficaz, segura e sem enrolação",
              solution_approach: "Acompanhamento próximo com foco em resultados reais",
              demographics: {
                ageRange: "Adultos (25 a 45 anos)",
                genderProfile: "Homens e Mulheres",
                professionLifestyle: "Profissionais liberais e rotina ativa",
              },
            }));
          }
        }
        setCatalogItems(initialCatalog);

        // 2. Hidratação de Públicos
        const initialAudList: string[] = [];
        if (data.audiences && Array.isArray(data.audiences)) {
          data.audiences.forEach((a) => {
            if (a.name && !initialAudList.includes(a.name)) initialAudList.push(a.name);
          });
        }
        if (Array.isArray(ext.targetAudiences)) {
          ext.targetAudiences.forEach((a: string) => {
            if (a && !initialAudList.includes(a)) initialAudList.push(a);
          });
        }
        if (typeof ext.targetAudience === "string" && ext.targetAudience.trim()) {
          const lines = ext.targetAudience.split("\n").map((l) => l.split(":")[0].trim()).filter(Boolean);
          lines.forEach((l) => {
            if (!initialAudList.includes(l)) initialAudList.push(l);
          });
        }

        const defaultAudSuggestions = [
          "Clientes que valorizam confiança e qualidade acima do preço",
          "Pessoas com necessidades imediatas ou urgentes",
          "Moradores locais e famílias da região",
          "Profissionais com rotina intensa buscando agilidade",
        ];
        defaultAudSuggestions.forEach((s) => {
          if (!initialAudList.includes(s)) initialAudList.push(s);
        });

        setAvailableAudiences(initialAudList);

        if (Array.isArray(ext.targetAudiences) && ext.targetAudiences.length > 0) {
          setSelectedAudiences(ext.targetAudiences);
        } else if (data.audiences && data.audiences.length > 0) {
          setSelectedAudiences(data.audiences.map((a) => a.name));
        }

        // 3. Hidratação de Diferenciais
        const defaultDiffs = [
          "Atendimento 100% individualizado e com hora marcada",
          "Metodologia personalizada para a necessidade do cliente",
          "Acompanhamento próximo e evolução contínua",
          "Equipe altamente qualificada e atendimento humanizado",
          "Ambiente acolhedor, seguro e com pontualidade rigorosa",
        ];
        const loadedDiffs: string[] = [...defaultDiffs];

        if (Array.isArray(ext.differentials)) {
          ext.differentials.forEach((d) => {
            if (typeof d === "string" && d.trim() && !loadedDiffs.includes(d.trim())) {
              loadedDiffs.unshift(d.trim());
            }
          });
          setSelectedDifferentials(ext.differentials.filter((d): d is string => typeof d === "string"));
        } else if (typeof ext.differentials === "string" && ext.differentials.trim()) {
          const splitted = ext.differentials.split(/\n|;/).map((s) => s.trim()).filter(Boolean);
          splitted.forEach((s) => {
            if (!loadedDiffs.includes(s)) loadedDiffs.unshift(s);
          });
          setSelectedDifferentials(splitted);
        }
        setAvailableDifferentials(loadedDiffs);

        // 4. Tom de Voz & Estilo
        if (Array.isArray(ext.toneOfVoice) && ext.toneOfVoice.length > 0) {
          setSelectedTones(ext.toneOfVoice);
        } else if (typeof ext.toneOfVoice === "string" && ext.toneOfVoice.trim()) {
          setSelectedTones([ext.toneOfVoice]);
        }

        if (typeof ext.toneBalance === "number") {
          setToneBalance(ext.toneBalance);
        }

        if (Array.isArray(ext.headlineAngles)) {
          setSelectedHeadlineAngles(ext.headlineAngles as string[]);
        }

        // 5. Concorrentes / Referências
        if (typeof ext.competitors === "string") {
          setCompetitorsText(ext.competitors);
        }

        // 6. Instagram
        if (data.instagramUrl) {
          const match = data.instagramUrl.match(/instagram\.com\/([^/?#]+)/i);
          if (match && match[1]) {
            setIgUsername(match[1]);
          }
        }
        if (data.credentialsSaved) {
          setSkipCredentials(true);
        }

        if (typeof ext.currentStep === "number" && ext.currentStep >= 0 && ext.currentStep <= 6) {
          setCurrentStep(ext.currentStep);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao carregar o briefing.");
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [token]);

  // Persistência imediata no backend
  const persistStepData = async (stepIndex: number, extraPayload: Record<string, unknown> = {}) => {
    setIsSaving(true);
    try {
      const payloadIdentity = {
        catalogItems,
        targetAudiences: selectedAudiences,
        targetAudience: selectedAudiences.join("\n"),
        differentials: selectedDifferentials,
        toneOfVoice: selectedTones,
        toneBalance,
        headlineAngles: selectedHeadlineAngles,
        competitors: noCompetitorReferences ? "Prefere referências sugeridas pela Otimizza" : competitorsText,
        currentStep: stepIndex,
        ...extraPayload,
      };

      const res = await fetch(`/api/briefing/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_STEP",
          step: stepIndex,
          extractedIdentity: payloadIdentity,
        }),
      });

      if (res.ok) {
        setLastSavedTime(
          new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        );
      }
    } catch (err) {
      console.warn("Aviso ao salvar etapa no briefing:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Navegação
  const handleNext = async () => {
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
    await persistStepData(nextStep);
  };

  const handlePrev = async () => {
    if (currentStep <= 0) return;
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
    await persistStepData(prevStep);
  };

  // IA Sugestões
  const handleAiSuggest = async (field: "targetAudience" | "differentials" | "toneOfVoice" | "competitors") => {
    if (aiLoading) return;
    setAiLoading(true);

    try {
      const res = await fetch(`/api/briefing/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "AI_SUGGEST",
          aiStepField: field,
        }),
      });

      const json = await res.json();
      if (json.success && Array.isArray(json.data?.suggestions)) {
        const list: string[] = json.data.suggestions;
        setAiSuggestions((prev) => ({ ...prev, [field]: list }));

        if (field === "targetAudience") {
          setAvailableAudiences((prev) => {
            const next = [...prev];
            list.forEach((item) => {
              if (!next.includes(item)) next.push(item);
            });
            return next;
          });
        } else if (field === "differentials") {
          setAvailableDifferentials((prev) => {
            const next = [...prev];
            list.forEach((item) => {
              if (!next.includes(item)) next.push(item);
            });
            return next;
          });
        }
      }
    } catch (err) {
      console.error("Erro ao solicitar sugestões com IA:", err);
    } finally {
      setAiLoading(false);
    }
  };

  // Ações de Catálogo
  const handleAddCatalogItem = () => {
    if (!draftCatalogItem.name.trim()) {
      alert("Por favor, informe o nome do serviço ou produto.");
      return;
    }
    const newItem: CatalogItemOnboarding = {
      ...draftCatalogItem,
      name: draftCatalogItem.name.trim(),
    };
    setCatalogItems((prev) => [...prev, newItem]);
    setDraftCatalogItem({
      type: "SERVICE",
      name: "",
      description: "",
      differentials: "",
      deliverables: "",
      target_pain_points: "",
      solution_approach: "",
      demographics: {
        ageRange: "Adultos (25 a 45 anos)",
        genderProfile: "Homens e Mulheres",
        professionLifestyle: "Profissionais liberais e rotina ativa",
      },
    });
    setIsAddingCatalogItem(false);
  };

  const handleRemoveCatalogItem = (index: number) => {
    setCatalogItems((prev) => prev.filter((_, i) => i !== index));
    if (activeServiceIndex >= catalogItems.length - 1 && activeServiceIndex > 0) {
      setActiveServiceIndex(activeServiceIndex - 1);
    }
  };

  // Atualizar dados de público de um item de catálogo
  const updateActiveServiceAudience = (field: string, value: unknown) => {
    setCatalogItems((prev) => {
      const copy = [...prev];
      if (!copy[activeServiceIndex]) return prev;
      if (field === "target_pain_points" || field === "solution_approach") {
        copy[activeServiceIndex] = {
          ...copy[activeServiceIndex],
          [field]: value as string,
        };
      } else {
        copy[activeServiceIndex] = {
          ...copy[activeServiceIndex],
          demographics: {
            ...copy[activeServiceIndex].demographics,
            [field]: value as string,
          },
        };
      }
      return copy;
    });
  };

  // Copiar dados do primeiro serviço para o ativo
  const copyFirstServiceAudience = () => {
    if (catalogItems.length < 2 || activeServiceIndex === 0) return;
    const source = catalogItems[0];
    setCatalogItems((prev) => {
      const copy = [...prev];
      copy[activeServiceIndex] = {
        ...copy[activeServiceIndex],
        target_pain_points: source.target_pain_points || "",
        solution_approach: source.solution_approach || "",
        demographics: { ...(source.demographics || {}) },
      };
      return copy;
    });
  };

  // Toggle de tags de público
  const toggleAudience = (aud: string) => {
    setSelectedAudiences((prev) =>
      prev.includes(aud) ? prev.filter((a) => a !== aud) : [...prev, aud]
    );
  };

  const handleAddCustomAudience = () => {
    const val = customAudienceInput.trim();
    if (!val) return;
    if (!availableAudiences.includes(val)) {
      setAvailableAudiences((prev) => [val, ...prev]);
    }
    if (!selectedAudiences.includes(val)) {
      setSelectedAudiences((prev) => [...prev, val]);
    }
    setCustomAudienceInput("");
  };

  // Toggle de diferencial
  const toggleDifferential = (diff: string) => {
    setSelectedDifferentials((prev) =>
      prev.includes(diff) ? prev.filter((d) => d !== diff) : [...prev, diff]
    );
  };

  const handleAddCustomDifferential = () => {
    const val = customDifferentialInput.trim();
    if (!val) return;
    if (!availableDifferentials.includes(val)) {
      setAvailableDifferentials((prev) => [val, ...prev]);
    }
    if (!selectedDifferentials.includes(val)) {
      setSelectedDifferentials((prev) => [...prev, val]);
    }
    setCustomDifferentialInput("");
  };

  // Toggle tom de voz e headlines
  const toggleTone = (tone: string) => {
    setSelectedTones((prev) =>
      prev.includes(tone) ? prev.filter((t) => t !== tone) : [...prev, tone]
    );
  };

  const toggleHeadlineAngle = (angleId: string) => {
    setSelectedHeadlineAngles((prev) =>
      prev.includes(angleId) ? prev.filter((a) => a !== angleId) : [...prev, angleId]
    );
  };

  // Submissão Final
  const handleFinalize = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const payloadIdentity = {
        catalogItems,
        targetAudiences: selectedAudiences,
        targetAudience: selectedAudiences.join("\n"),
        differentials: selectedDifferentials,
        toneOfVoice: selectedTones,
        toneBalance,
        headlineAngles: selectedHeadlineAngles,
        competitors: noCompetitorReferences ? "Prefere sugestões da Otimizza" : competitorsText,
        currentStep: 7,
      };

      const credentialsPayload =
        !skipCredentials && igUsername && igPassword
          ? { username: igUsername.trim(), password: igPassword.trim() }
          : null;

      const res = await fetch(`/api/briefing/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "FINALIZE",
          extractedIdentity: payloadIdentity,
          credentials: credentialsPayload,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Não foi possível finalizar o briefing.");
      }

      setCurrentStep(7);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao finalizar o briefing.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Carregando seu onboarding estratégico...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <X className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Briefing Indisponível</h2>
          <p className="text-slate-600 mb-6 text-sm">{error || "Não foi possível carregar o link informado."}</p>
          <a
            href="https://wa.me/5581999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition"
          >
            <WhatsAppIcon className="w-5 h-5 fill-current" />
            Falar com a Otimizza no WhatsApp
          </a>
        </div>
      </div>
    );
  }

  const TOTAL_ACTIVE_STEPS = 6;

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900 pb-28">
      {/* HEADER SUPERIOR */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold text-base shadow-sm">
              O
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">Otimizza</span>
                <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  Onboarding Estratégico
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[200px] sm:max-w-xs">
                {session.companyName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/60">
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lastSavedTime ? `Salvo às ${lastSavedTime}` : "Salvo no sistema"}</span>
                </>
              )}
            </div>

            {currentStep > 0 && currentStep < 7 && (
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                Etapa {currentStep} de {TOTAL_ACTIVE_STEPS}
              </span>
            )}
          </div>
        </div>

        {/* Barra de Progresso Visual */}
        {currentStep > 0 && currentStep < 7 && (
          <div className="w-full bg-slate-100 h-1.5">
            <div
              className="bg-emerald-600 h-1.5 transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / TOTAL_ACTIVE_STEPS) * 100}%` }}
            />
          </div>
        )}
      </header>

      {/* ÁREA PRINCIPAL DO CARROSSEL */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-10 flex-1">
        {/* SLIDE 0: BOAS-VINDAS / APRESENTAÇÃO */}
        {currentStep === 0 && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200/80 space-y-8 animate-in fade-in duration-300">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5" />
                Alinhamento de Marca, Catálogo & Conteúdo
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Olá, {session.contactName}! 👋
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Seja muito bem-vindo ao onboarding estratégico da <strong className="text-slate-900">{session.companyName}</strong> na Otimizza.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                  ⏱️
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">Rápido e Prático</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Apenas 6 etapas objetivas para alinharmos seus serviços, diferenciais e o público ideal.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
                  💾
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">Salvamento Automático</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ao avançar, tudo é salvo no sistema. Se precisar voltar ou pausar, nenhum dado se perde.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg">
                  ✨
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">Zero Jargões</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Linguagem simples, clara e descomplicada pensada para quem cuida do dia a dia da empresa.
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 text-sm space-y-1">
              <p className="font-semibold">Fique super tranquilo:</p>
              <p className="text-xs sm:text-sm text-emerald-900/80">
                Não é um questionário rígido! Queremos entender o dia a dia real do seu negócio para produzir conteúdos e anúncios que atraiam os clientes certos.
              </p>
            </div>
          </div>
        )}

        {/* SLIDE 1: O QUE VOCÊ OFERECE (SERVIÇOS & PRODUTOS ESTRUTURADOS) */}
        {currentStep === 1 && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200/80 space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
                <Package className="w-4 h-4" />
                Etapa 1 • O que você oferece
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Quais são os serviços ou produtos da {session.companyName}?
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Cadastre ou confirme o que você vende. Cada item fica em um bloco próprio para podermos criar conteúdos específicos para cada um!
              </p>
            </div>

            {/* Lista de Blocos de Serviços */}
            <div className="space-y-3 pt-2">
              {catalogItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {catalogItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-4.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition space-y-2 text-left relative group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 mb-1">
                            {item.type === "PRODUCT" ? "Produto" : "Serviço"}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base">{item.name}</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCatalogItem(idx)}
                          className="text-slate-400 hover:text-rose-600 transition p-1"
                          title="Remover este item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {item.description && (
                        <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                      )}

                      {item.differentials && (
                        <div className="text-xs text-slate-700">
                          <strong className="text-slate-900">Diferencial:</strong> {item.differentials}
                        </div>
                      )}

                      {item.deliverables && (
                        <div className="text-xs text-slate-700">
                          <strong className="text-slate-900">Incluso:</strong> {item.deliverables}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 border border-dashed border-slate-300 rounded-2xl text-center space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Nenhum serviço ou produto adicionado ainda.</p>
                  <p className="text-xs text-slate-500">
                    Clique no botão abaixo para adicionar os serviços ou produtos que sua empresa comercializa.
                  </p>
                </div>
              )}

              {/* Botão para Inserir Novo Item ou Formulário de Cadastro */}
              {!isAddingCatalogItem ? (
                <button
                  type="button"
                  onClick={() => setIsAddingCatalogItem(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition"
                >
                  <Plus className="w-4 h-4" />
                  Inserir Novo Serviço ou Produto
                </button>
              ) : (
                <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                    <span className="text-sm font-bold text-slate-900">Novo Serviço / Produto</span>
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                      <button
                        type="button"
                        onClick={() => setDraftCatalogItem((prev) => ({ ...prev, type: "SERVICE" }))}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                          draftCatalogItem.type === "SERVICE" ? "bg-emerald-600 text-white" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Serviço
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftCatalogItem((prev) => ({ ...prev, type: "PRODUCT" }))}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                          draftCatalogItem.type === "PRODUCT" ? "bg-emerald-600 text-white" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Produto
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Nome do {draftCatalogItem.type === "SERVICE" ? "Serviço" : "Produto"} *
                      </label>
                      <input
                        type="text"
                        value={draftCatalogItem.name}
                        onChange={(e) => setDraftCatalogItem((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Performance, Correção Postural, Fisioterapia..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Qual o seu diferencial exclusivo neste item?
                      </label>
                      <input
                        type="text"
                        value={draftCatalogItem.differentials}
                        onChange={(e) => setDraftCatalogItem((prev) => ({ ...prev, differentials: e.target.value }))}
                        placeholder="Ex: Avaliação biomecânica computadorizada, atendimento 100% individual..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Descrição Breve (O que é e para quem serve)
                      </label>
                      <textarea
                        rows={2}
                        value={draftCatalogItem.description}
                        onChange={(e) => setDraftCatalogItem((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Explique de forma simples o objetivo deste serviço/produto..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">
                        O que está incluso na entrega? (Entregáveis)
                      </label>
                      <input
                        type="text"
                        value={draftCatalogItem.deliverables}
                        onChange={(e) => setDraftCatalogItem((prev) => ({ ...prev, deliverables: e.target.value }))}
                        placeholder="Ex: Sessões individuais com hora marcada, suporte via WhatsApp..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingCatalogItem(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCatalogItem}
                      className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition"
                    >
                      Adicionar Item
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SLIDE 2: QUEM VOCÊ ATENDE & DORES POR SERVIÇO */}
        {currentStep === 2 && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200/80 space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
                <Target className="w-4 h-4" />
                Etapa 2 • Públicos & Dores dos Clientes
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Quem procura a {session.companyName} e qual problema você resolve?
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Entender a dor real do cliente nos permite criar títulos e anúncios que geram identificação imediata.
              </p>
            </div>

            {/* SE HOUVER SERVIÇOS CADASTRADOS: ABAS DIRECIONADAS POR SERVIÇO */}
            {catalogItems.length > 0 ? (
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 overflow-x-auto gap-2">
                  <div className="flex gap-2">
                    {catalogItems.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveServiceIndex(idx)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                          activeServiceIndex === idx
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {item.name || `Item ${idx + 1}`}
                      </button>
                    ))}
                  </div>

                  {activeServiceIndex > 0 && (
                    <button
                      type="button"
                      onClick={copyFirstServiceAudience}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition shrink-0"
                      title="Copia os dados de dor e público do primeiro serviço"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Mesmo público de {catalogItems[0]?.name || "Item 1"}
                    </button>
                  )}
                </div>

                {catalogItems[activeServiceIndex] && (
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <Target className="w-4 h-4 text-emerald-600" />
                      <span>Alinhamento de Público para: <u>{catalogItems[activeServiceIndex].name}</u></span>
                    </div>

                    <div className="space-y-3 text-xs">
                      {/* Faixa Etária Principal */}
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">
                          Faixa de Idade Predominante:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "Jovens (18 a 29 anos)",
                            "Adultos (30 a 49 anos)",
                            "Maduros (50+ anos)",
                            "Todas as faixas etárias",
                          ].map((age) => {
                            const isSelected =
                              catalogItems[activeServiceIndex].demographics?.ageRange === age;
                            return (
                              <button
                                key={age}
                                type="button"
                                onClick={() => updateActiveServiceAudience("ageRange", age)}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                                  isSelected
                                    ? "bg-emerald-600 border-emerald-600 text-white font-semibold"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                {age}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Dor do Cliente */}
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Qual a principal dor ou queixa do cliente antes de buscar esse serviço?
                        </label>
                        <input
                          type="text"
                          value={catalogItems[activeServiceIndex].target_pain_points || ""}
                          onChange={(e) => updateActiveServiceAudience("target_pain_points", e.target.value)}
                          placeholder="Ex: Dores crônicas nas costas que impedem de brincar com os filhos ou trabalhar..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Como Resolve */}
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Como esse serviço resolve essa dor? (A transformação que você entrega)
                        </label>
                        <input
                          type="text"
                          value={catalogItems[activeServiceIndex].solution_approach || ""}
                          onChange={(e) => updateActiveServiceAudience("solution_approach", e.target.value)}
                          placeholder="Ex: Alívio seguro da dor já nas primeiras semanas sem depender de remédios..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* SELEÇÃO GERAL DE PÚBLICOS E TAGS */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Perfis gerais que você atende ({selectedAudiences.length} marcados)
                </span>
                <button
                  type="button"
                  onClick={() => handleAiSuggest("targetAudience")}
                  disabled={aiLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${aiLoading ? "animate-spin" : ""}`} />
                  {aiLoading ? "Consultando IA..." : "Sugerir públicos com IA"}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {availableAudiences.map((aud) => {
                  const isSelected = selectedAudiences.includes(aud);
                  return (
                    <button
                      key={aud}
                      type="button"
                      onClick={() => toggleAudience(aud)}
                      className={`text-left text-xs sm:text-sm px-4 py-2.5 rounded-xl border transition-all duration-150 flex items-center gap-2 ${
                        isSelected
                          ? "bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold shadow-xs ring-1 ring-emerald-500"
                          : "bg-slate-50 border-slate-200/90 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span>{aud}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Atende outro perfil específico?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customAudienceInput}
                    onChange={(e) => setCustomAudienceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomAudience();
                      }
                    }}
                    placeholder="Ex: Praticantes de corrida amadora com lesões de joelho..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAudience}
                    disabled={!customAudienceInput.trim()}
                    className="px-4 py-2.5 bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-slate-900 transition disabled:opacity-40 inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 3: DIFERENCIAIS DA MARCA */}
        {currentStep === 3 && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200/80 space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
                <Award className="w-4 h-4" />
                Etapa 3 • Seus Diferenciais
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                O que torna a {session.companyName} única?
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Selecione os pontos que os seus clientes mais elogiam ou que destacam a qualidade do seu atendimento.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Diferenciais mais fortes ({selectedDifferentials.length} selecionados)
              </span>
              <button
                type="button"
                onClick={() => handleAiSuggest("differentials")}
                disabled={aiLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${aiLoading ? "animate-spin" : ""}`} />
                {aiLoading ? "Consultando IA..." : "Sugerir diferenciais com IA"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableDifferentials.map((diff) => {
                const isSelected = selectedDifferentials.includes(diff);
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => toggleDifferential(diff)}
                    className={`text-left p-4 rounded-2xl border transition-all duration-150 flex items-start gap-3 ${
                      isSelected
                        ? "bg-emerald-50/80 border-emerald-500 text-emerald-950 font-semibold ring-1 ring-emerald-500"
                        : "bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border mt-0.5 ${
                        isSelected
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className="text-xs sm:text-sm leading-snug">{diff}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Quer adicionar outro diferencial exclusivo?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customDifferentialInput}
                  onChange={(e) => setCustomDifferentialInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomDifferential();
                    }
                  }}
                  placeholder="Ex: Metodologia com acompanhamento 100% individual..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddCustomDifferential}
                  disabled={!customDifferentialInput.trim()}
                  className="px-4 py-2.5 bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-slate-900 transition disabled:opacity-40 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 4: ESTILO, TOM & HEADLINES (LINGUAGEM PARA LEIGOS) */}
        {currentStep === 4 && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200/80 space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
                <Compass className="w-4 h-4" />
                Etapa 4 • Estilo, Linguagem & Chamadas
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Como sua marca deve chamar a atenção nas redes sociais?
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Selecione as formas que mais combinam com o jeito que você prefere abordar seus clientes.
              </p>
            </div>

            {/* Formatos de Headlines & Copywriting em Linguagem Simples */}
            <div className="space-y-3 pt-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tipos de conteúdos que você quer priorizar:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: "DIDATICO_DUVIDAS",
                    title: "💡 Tirando Dúvidas Frequentes",
                    desc: "Responder com clareza o que todo cliente sempre pergunta antes de contratar.",
                  },
                  {
                    id: "RESULTADOS_TRANSFORMACAO",
                    title: "🏆 Resultados & Transformação",
                    desc: "Mostrar como a vida do cliente melhora na prática após o seu atendimento.",
                  },
                  {
                    id: "ALERTAS_CUIDADOS",
                    title: "⚠️ Alertas & Cuidados Importantes",
                    desc: "Alertar sobre hábitos errados, riscos e cuidados que a pessoa deve ter.",
                  },
                  {
                    id: "BASTIDORES_HUMANO",
                    title: "🤝 Bastidores & Cuidado Humano",
                    desc: "Apresentar a dedicação da equipe, a rotina de trabalho e o carinho no atendimento.",
                  },
                  {
                    id: "OFERTA_DIRETA",
                    title: "🎯 Chamadas Diretas para Ação",
                    desc: "Postagens diretas convidando a agendar ou falar no WhatsApp sem rodeios.",
                  },
                  {
                    id: "HISTORIAS_SUPERACAO",
                    title: "⭐ Histórias de Superação",
                    desc: "Contar trajetórias e vitórias de pessoas que alcançaram seus objetivos.",
                  },
                ].map((item) => {
                  const isSelected = selectedHeadlineAngles.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleHeadlineAngle(item.id)}
                      className={`cursor-pointer p-4 rounded-2xl border transition-all duration-150 flex items-start gap-3 ${
                        isSelected
                          ? "bg-emerald-50/80 border-emerald-500 text-emerald-950 font-semibold ring-1 ring-emerald-500"
                          : "bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border mt-0.5 ${
                          isSelected
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{item.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tom de Voz */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tom de Voz da Marca:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  {
                    id: "Especialista & Didático",
                    title: "Especialista & Didático",
                    desc: "Autoridade técnica sem complicação. Ensina e esclarece dúvidas de forma simples e segura.",
                    icon: GraduationCap,
                  },
                  {
                    id: "Acolhedor & Humano",
                    title: "Acolhedor & Humano",
                    desc: "Empatia, calor humano e escuta atenta. Faz o seguidor se sentir compreendido e seguro.",
                    icon: HeartHandshake,
                  },
                  {
                    id: "Motivador & Enérgico",
                    title: "Motivador & Enérgico",
                    desc: "Dinâmico, inspirador e focado em superação, disciplina e celebração das conquistas.",
                    icon: Zap,
                  },
                  {
                    id: "Elegante & Exclusivo",
                    title: "Elegante & Exclusivo",
                    desc: "Refinado, sereno e premium. Focado na qualidade impecável e no bem-estar exclusivo.",
                    icon: Crown,
                  },
                ].map((card) => {
                  const IconComponent = card.icon;
                  const isSelected = selectedTones.includes(card.id);
                  return (
                    <div
                      key={card.id}
                      onClick={() => toggleTone(card.id)}
                      className={`cursor-pointer p-4.5 rounded-2xl border transition-all duration-200 space-y-2 ${
                        isSelected
                          ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                          : "bg-slate-50/60 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                            isSelected
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{card.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{card.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Slider de Equilíbrio de Linguagem */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Equilíbrio da Linguagem:</span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {toneBalance < 40 ? "Mais Técnico & Formal" : toneBalance > 60 ? "Mais Próximo & Descontraído" : "Equilíbrio Ideal"}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={toneBalance}
                onChange={(e) => setToneBalance(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Mais Técnico e Formal</span>
                <span>Equilibrado</span>
                <span>Mais Descontraído e Próximo</span>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 5: INSPIRAÇÕES E REFERÊNCIAS */}
        {currentStep === 5 && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200/80 space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
                <Compass className="w-4 h-4" />
                Etapa 5 • Inspirações e Referências
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Quais perfis você admira nas redes sociais?
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Conte-nos perfis do Instagram, marcas ou referências que tenham uma comunicação, estética ou vídeos que você gosta.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Perfis do Instagram ou links de referência:
                </label>
                <button
                  type="button"
                  onClick={() => handleAiSuggest("competitors")}
                  disabled={aiLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${aiLoading ? "animate-spin" : ""}`} />
                  {aiLoading ? "Consultando IA..." : "Sugerir referências do nicho"}
                </button>
              </div>

              {aiSuggestions["competitors"] && aiSuggestions["competitors"].length > 0 && (
                <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2">
                  <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Ideias pro seu nicho (clique para preencher):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {aiSuggestions["competitors"].map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCompetitorsText((prev) => (prev ? `${prev}\n• ${sug}` : `• ${sug}`));
                          setNoCompetitorReferences(false);
                        }}
                        className="text-left text-xs bg-white text-purple-900 px-3 py-1.5 rounded-lg border border-purple-200 hover:bg-purple-100/50 transition"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <textarea
                rows={4}
                disabled={noCompetitorReferences}
                value={competitorsText}
                onChange={(e) => setCompetitorsText(e.target.value)}
                placeholder="@perfil.exemplo, @clinica.referencia, canais no youtube ou links de referência..."
                className={`w-full p-4 rounded-2xl border text-base sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition ${
                  noCompetitorReferences
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                    : "bg-white text-slate-800 border-slate-200 focus:border-emerald-500"
                }`}
              />

              <div
                onClick={() => setNoCompetitorReferences(!noCompetitorReferences)}
                className={`cursor-pointer p-4 rounded-2xl border flex items-center gap-3 transition ${
                  noCompetitorReferences
                    ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                    noCompetitorReferences
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {noCompetitorReferences && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="text-xs sm:text-sm">
                  <span className="font-semibold">Não tenho referências em mente</span> — Quero que a equipe de estratégia da Otimizza recomende as melhores referências para a minha marca.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 6: CONEXÃO COM O INSTAGRAM */}
        {currentStep === 6 && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200/80 space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
                <Lock className="w-4 h-4" />
                Etapa 6 • Conexão do Perfil
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Conexão com seu Instagram
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Para que nossa equipe possa agendar suas postagens, analisar métricas e configurar sua bio com agilidade.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                Cofre Seguro Otimizza (AES-256)
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Suas senhas são criptografadas com segurança de padrão bancário. Somente os analistas autorizados da sua conta têm acesso.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Usuário do Instagram (@perfil):
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400 font-semibold text-sm">@</span>
                  <input
                    type="text"
                    disabled={skipCredentials}
                    value={igUsername.replace("@", "")}
                    onChange={(e) => setIgUsername(e.target.value)}
                    placeholder="nomedasuamarca"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-base sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Senha do Instagram:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    disabled={skipCredentials}
                    value={igPassword}
                    onChange={(e) => setIgPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-slate-200 text-base sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <button
                    type="button"
                    disabled={skipCredentials}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div
                onClick={() => setSkipCredentials(!skipCredentials)}
                className={`cursor-pointer p-4 rounded-2xl border flex items-center gap-3 transition ${
                  skipCredentials
                    ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                    skipCredentials
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {skipCredentials && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="text-xs sm:text-sm">
                  <span className="font-semibold">Prefiro enviar a senha depois pelo WhatsApp</span> — Caso prefira combinar o envio direto com o nosso analista de atendimento.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 7: CONCLUSÃO COM SUCESSO! */}
        {currentStep === 7 && (
          <div className="bg-white rounded-3xl p-6 sm:p-12 shadow-sm border border-slate-200/80 text-center space-y-8 animate-in zoom-in-95 duration-400">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div className="space-y-3 max-w-lg mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                Briefing Entregue com Sucesso! 🎉
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Muito obrigado, {session.contactName}!
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Todas as orientações estratégicas da <strong className="text-slate-900">{session.companyName}</strong> foram salvas e entregues com sucesso para a equipe da Otimizza.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-2xl mx-auto pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">📦 Catálogo</span>
                <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                  {catalogItems.length > 0
                    ? `${catalogItems.length} serviços/produtos cadastrados`
                    : "Serviços registrados"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">⭐ Diferenciais</span>
                <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                  {selectedDifferentials.length > 0 ? selectedDifferentials.join(", ") : "Cadastrados"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">🎙️ Estilo & Tom</span>
                <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                  {selectedTones.length > 0 ? selectedTones.join(", ") : "Equilibrado e Consultivo"}
                </p>
              </div>
            </div>

            <div className="pt-4 max-w-md mx-auto space-y-3">
              <p className="text-xs text-slate-500">
                Nosso time já iniciará a estruturação das linhas editoriais e roteiros de conteúdo para a sua marca.
              </p>
              <a
                href="https://wa.me/5581999999999?text=Ol%C3%A1!%20Acabei%20de%20entregar%20o%20briefing%20estrat%C3%A9gico%20na%20Otimizza."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition"
              >
                <WhatsAppIcon className="w-5 h-5 fill-current" />
                Falar com a equipe no WhatsApp
              </a>
            </div>
          </div>
        )}
      </main>

      {/* BARRA INFERIOR DE NAVEGAÇÃO FIXA */}
      {currentStep < 7 && (
        <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 sm:py-4 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={handlePrev}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
            ) : (
              <div />
            )}

            {currentStep === 0 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base shadow-sm transition"
              >
                Iniciar Briefing
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : currentStep < 6 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition"
              >
                Avançar
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalize}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Entregando...
                  </>
                ) : (
                  <>
                    🎉 Entregar Briefing
                  </>
                )}
              </button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
