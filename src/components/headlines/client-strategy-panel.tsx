"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Building2,
  Target,
  MessageSquare,
  BookOpen,
  Plus,
  Trash2,
  Save,
  Check,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Globe,
  CheckCircle2,
  Layers,
  Sparkles,
  Sliders,
  Video,
  TrendingUp,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp";
import { InstagramIcon as Instagram } from "@/components/ui/instagram";
import { ClientAudiencesManager } from "@/components/clients/client-audiences-manager";
import { IdentityAiButton } from "@/components/clients/identity-ai-button";
import { CommercialDnaPanel } from "@/components/crm/commercial-dna";
import {
  COMMUNICATION_OPTIONS,
  CommunicationProfile,
  CommunicationProfileSchema,
  emptyCommunicationProfile,
} from "@/modules/clients/communication-profile";

export const ARCHETYPES = [
  { id: "SABIO", name: "O Sábio / Especialista", desc: "Autoridade, precisão técnica, dados, didática e clareza profunda." },
  { id: "AMIGO", name: "O Amigo / Parceiro", desc: "Proximidade, empatia, diálogo acessível e suporte constante." },
  { id: "CRIADOR", name: "O Criador / Visionário", desc: "Inovação, originalidade, design arrojado e soluções fora da caixa." },
  { id: "HEROI", name: "O Herói / Conquistador", desc: "Superação de desafios, alta performance, foco em resultados e vitórias." },
  { id: "MAGO", name: "O Mago / Transformador", desc: "Transformação rápida, visão estratégica, saltos de crescimento e impacto." },
  { id: "GOVERNANTE", name: "O Governante / Líder", desc: "Liderança de mercado, segurança, governança, estabilidade e solidez." },
];

export function normalizeArchetypeId(val: string | null | undefined): string {
  if (!val) return "";
  const clean = val.trim().toLowerCase();
  const found = ARCHETYPES.find(
    (a) =>
      a.id.toLowerCase() === clean ||
      a.name.toLowerCase() === clean ||
      clean.includes(a.id.toLowerCase()) ||
      a.name.toLowerCase().includes(clean)
  );
  return found ? found.id : "";
}

export function getArchetypeName(val: string | null | undefined): string {
  if (!val) return "";
  const id = normalizeArchetypeId(val);
  const found = ARCHETYPES.find((a) => a.id === id);
  return found ? found.name : val;
}

const PRESET_TONES = [
  "Direto e didático",
  "Técnico e fundamentado",
  "Orientado a dados com clareza",
  "Especialista & Didático",
  "Institucional e sóbrio",
  "Focado em decisões e crescimento",
  "Empático e consultivo",
  "Calmo e acolhedor",
  "Próximo e conversacional",
  "Acessível e descomplicado",
  "Sem juridiquês ou jargões vazios",
  "Inspirador e motivacional",
  "Enérgico e persuasivo",
  "Provocativo e instigante",
  "Urgente e focado em ação",
  "Questionador e transformador",
  "Direto ao ponto (Sem enrolação)",
  "Confiante e assertivo",
  "Sofisticado e exclusivo",
  "Elegante e minimalista",
  "Moderno e inovador",
  "Narrativo e storytelling",
  "Leve e bem-humorado",
  "Prático e focado na rotina",
];

const control =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition";

interface Pillar {
  id: string;
  name: string;
}

interface EditorialLine {
  id: string;
  pillar_id: string | null;
  pillar_name: string;
  theme: string;
  objective: string | null;
  preferred_formats: string[];
}

interface ClientStrategyPanelProps {
  clientId: string;
  companyName: string;
  pillars: Pillar[];
  editorialLines: EditorialLine[];
  onAdvanceToBrainstorm: () => void;
  onStrategySaved?: () => void;
}

export function ClientStrategyPanel({
  clientId,
  companyName,
  pillars,
  editorialLines,
  onAdvanceToBrainstorm,
  onStrategySaved,
}: ClientStrategyPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Campos de Estratégia e DNA
  const [brandContext, setBrandContext] = useState("");
  const [marketNiche, setMarketNiche] = useState("");
  const [valueProposition, setValueProposition] = useState("");
  const [archetype, setArchetype] = useState("");
  const [secondaryArchetype, setSecondaryArchetype] = useState("");
  const [brandHistory, setBrandHistory] = useState("");
  const [corePromise, setCorePromise] = useState("");
  const [salesObjections, setSalesObjections] = useState("");
  const [selectedTones, setSelectedTones] = useState<string[]>([]);
  const [newCustomTone, setNewCustomTone] = useState("");

  const [targetAudiences, setTargetAudiences] = useState<string[]>([]);
  const [newAudience, setNewAudience] = useState("");

  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [newPain, setNewPain] = useState("");

  const [differentials, setDifferentials] = useState<string[]>([]);
  const [newDifferential, setNewDifferential] = useState("");

  const [forbiddenWords, setForbiddenWords] = useState<string[]>([]);
  const [newForbidden, setNewForbidden] = useState("");

  const [mandatoryTerms, setMandatoryTerms] = useState<string[]>([]);
  const [newMandatory, setNewMandatory] = useState("");

  const [defaultCtas, setDefaultCtas] = useState<string[]>([]);
  const [newCta, setNewCta] = useState("");

  const [instagramHandle, setInstagramHandle] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [whatsappCta, setWhatsappCta] = useState("");
  const [notes, setNotes] = useState("");

  const [formatGuidelines, setFormatGuidelines] = useState<{
    reelsStandard: string;
    headlinesStandard: string;
    carouselStandard: string;
  }>({
    reelsStandard: "",
    headlinesStandard: "",
    carouselStandard: "",
  });

  const [communicationProfile, setCommunicationProfile] = useState<CommunicationProfile>(emptyCommunicationProfile);
  const [generatingAiField, setGeneratingAiField] = useState<string | null>(null);

  // Sub-aba ativa dentro da Estratégia
  const [subTab, setSubTab] = useState<"dna" | "audiences" | "voice" | "formatStandards" | "channels" | "editorial">("dna");

  const stateRef = useRef({
    brandContext,
    marketNiche,
    valueProposition,
    archetype,
    secondaryArchetype,
    brandHistory,
    corePromise,
    salesObjections,
    selectedTones,
    targetAudiences,
    painPoints,
    differentials,
    forbiddenWords,
    mandatoryTerms,
    defaultCtas,
    instagramHandle,
    websiteUrl,
    whatsappCta,
    notes,
    formatGuidelines,
    communicationProfile,
  });

  useEffect(() => {
    stateRef.current = {
      brandContext,
      marketNiche,
      valueProposition,
      archetype,
      secondaryArchetype,
      brandHistory,
      corePromise,
      salesObjections,
      selectedTones,
      targetAudiences,
      painPoints,
      differentials,
      forbiddenWords,
      mandatoryTerms,
      defaultCtas,
      instagramHandle,
      websiteUrl,
      whatsappCta,
      notes,
      formatGuidelines,
      communicationProfile,
    };
  });

  // Carregar dados de identidade/estratégia do cliente
  const loadStrategyData = async () => {
    if (!clientId) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/identity`);
      if (!res.ok) throw new Error("Erro ao carregar estratégia do cliente.");
      const data = await res.json();

      setBrandContext(data.brandContext || "");
      setMarketNiche(data.marketNiche || "");
      setValueProposition(data.valueProposition || "");
      setArchetype(normalizeArchetypeId(data.archetype));
      setSecondaryArchetype(normalizeArchetypeId(data.secondaryArchetype));
      setBrandHistory(data.brandHistory || "");
      setCorePromise(data.corePromise || "");
      setSalesObjections(data.salesObjections || "");
      setSelectedTones(Array.isArray(data.toneOfVoice) ? data.toneOfVoice : []);
      setTargetAudiences(Array.isArray(data.targetAudiences) ? data.targetAudiences : []);
      setPainPoints(Array.isArray(data.painPoints) ? data.painPoints : []);
      setDifferentials(Array.isArray(data.differentials) ? data.differentials : []);
      setForbiddenWords(Array.isArray(data.forbiddenWords) ? data.forbiddenWords : []);
      setMandatoryTerms(Array.isArray(data.mandatoryTerms) ? data.mandatoryTerms : []);
      setDefaultCtas(Array.isArray(data.defaultCtas) ? data.defaultCtas : []);
      setInstagramHandle(data.instagramHandle || "");
      setWebsiteUrl(data.websiteUrl || "");
      setWhatsappCta(data.whatsappCta || "");
      setNotes(data.notes || "");
      if (data.formatGuidelines) {
        setFormatGuidelines({
          reelsStandard: data.formatGuidelines.reelsStandard || "",
          headlinesStandard: data.formatGuidelines.headlinesStandard || "",
          carouselStandard: data.formatGuidelines.carouselStandard || "",
        });
      }

      const parsedProfile = CommunicationProfileSchema.safeParse(data.communicationProfile);
      setCommunicationProfile(parsedProfile.success ? parsedProfile.data : emptyCommunicationProfile);
    } catch (e: unknown) {
      const err = e as Error;
      setFeedback({ type: "error", text: err.message || "Falha ao carregar dados de estratégia." });
    } finally {
      setLoading(false);
    }
  };

  // Gerar / Sugerir campo com IA
  const handleGenerateAiField = async (field: string) => {
    setGeneratingAiField(field);
    setFeedback(null);
    try {
      const draft = {
        brandContext,
        marketNiche,
        valueProposition,
        archetype,
        toneOfVoice: selectedTones,
        targetAudiences,
        painPoints,
        differentials,
        forbiddenWords,
        mandatoryTerms,
        defaultCtas,
        notes,
      };

      const res = await fetch(`/api/clients/${clientId}/identity/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, draft }),
      });

      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || "Falha ao gerar sugestão com IA.");

      if (field === "valueProposition" && typeof d.value === "string") {
        setValueProposition(d.value);
      } else if (field === "marketNiche" && typeof d.value === "string") {
        setMarketNiche(d.value);
      } else if (field === "brandContext" && typeof d.value === "string") {
        setBrandContext(d.value);
      } else if (field === "archetype" && typeof d.value === "string") {
        setArchetype(d.value);
      } else if (field === "differentials" && Array.isArray(d.value)) {
        setDifferentials((prev) => Array.from(new Set([...prev, ...d.value])));
      } else if (field === "painPoints" && Array.isArray(d.value)) {
        setPainPoints((prev) => Array.from(new Set([...prev, ...d.value])));
      } else if (field === "targetAudiences" && Array.isArray(d.value)) {
        setTargetAudiences((prev) => Array.from(new Set([...prev, ...d.value])));
      } else if (field === "defaultCtas" && Array.isArray(d.value)) {
        setDefaultCtas((prev) => Array.from(new Set([...prev, ...d.value])));
      } else if (field === "forbiddenWords" && Array.isArray(d.value)) {
        setForbiddenWords((prev) => Array.from(new Set([...prev, ...d.value])));
      }

      setFeedback({ type: "success", text: `Sugestão de IA gerada com sucesso para ${field}!` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (e: unknown) {
      const err = e as Error;
      setFeedback({ type: "error", text: err.message || "Erro na IA." });
    } finally {
      setGeneratingAiField(null);
    }
  };

  useEffect(() => {
    loadStrategyData();
  }, [clientId]);

  // Salvar estratégia
  const handleSave = async (silent = false) => {
    if (!clientId) return;
    if (silent) {
      setAutoSaveState("saving");
    } else {
      setSaving(true);
      setFeedback(null);
    }
    try {
      const cur = stateRef.current;
      const body = {
        brandContext: cur.brandContext,
        marketNiche: cur.marketNiche,
        valueProposition: cur.valueProposition,
        archetype: normalizeArchetypeId(cur.archetype),
        secondaryArchetype: normalizeArchetypeId(cur.secondaryArchetype),
        brandHistory: cur.brandHistory,
        corePromise: cur.corePromise,
        salesObjections: cur.salesObjections,
        toneOfVoice: cur.selectedTones,
        targetAudiences: cur.targetAudiences,
        painPoints: cur.painPoints,
        differentials: cur.differentials,
        forbiddenWords: cur.forbiddenWords,
        mandatoryTerms: cur.mandatoryTerms,
        defaultCtas: cur.defaultCtas,
        instagramHandle: cur.instagramHandle,
        websiteUrl: cur.websiteUrl,
        whatsappCta: cur.whatsappCta,
        notes: cur.notes,
        formatGuidelines: cur.formatGuidelines,
        communicationProfile: cur.communicationProfile,
      };

      const res = await fetch(`/api/clients/${clientId}/identity`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao salvar alterações de estratégia.");
      }

      setDirty(false);
      const timeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      setLastSavedTime(timeStr);
      if (silent) {
        setAutoSaveState("saved");
        setTimeout(() => setAutoSaveState((curr) => (curr === "saved" ? "idle" : curr)), 3000);
      } else {
        setFeedback({ type: "success", text: "Estratégia e DNA salvos com sucesso!" });
        setTimeout(() => setFeedback(null), 4000);
      }
      onStrategySaved?.();
    } catch (e: unknown) {
      const err = e as Error;
      if (silent) {
        setAutoSaveState("idle");
      } else {
        setFeedback({ type: "error", text: err.message || "Erro ao salvar estratégia." });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBlur = () => {
    if (dirty && !saving) {
      void handleSave(true);
    }
  };

  const scheduleAutoSave = () => {
    setDirty(true);
    setTimeout(() => {
      void handleSave(true);
    }, 200);
  };

  const handleAdvance = async () => {
    if (dirty || saving) {
      await handleSave(true);
    }
    onAdvanceToBrainstorm();
  };

  // Helpers para adicionar itens em arrays com auto-save
  const addItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, val: string, clear: () => void) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    setter((prev) => {
      if (prev.includes(trimmed)) return prev;
      const updated = [...prev, trimmed];
      scheduleAutoSave();
      return updated;
    });
    clear();
  };

  const removeItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    setter((prev) => {
      const updated = prev.filter((item) => item !== val);
      scheduleAutoSave();
      return updated;
    });
  };

  const toggleTone = (tone: string) => {
    setSelectedTones((prev) => {
      const updated = prev.includes(tone) ? prev.filter((t) => t !== tone) : [...prev, tone];
      scheduleAutoSave();
      return updated;
    });
  };

  const toggleProfileField = (
    field: "speakerTypes" | "audienceTypes" | "contentVoices",
    value: string
  ) => {
    setCommunicationProfile((prev) => {
      const current = prev[field] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      scheduleAutoSave();
      return { ...prev, [field]: updated };
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm font-semibold text-zinc-700">Carregando Estratégia Completa & DNA do cliente...</p>
        <p className="text-xs text-zinc-400 mt-1">Buscando identidade, público-alvo, diretrizes e canais de conversão.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIOR DE AÇÕES DA ESTRATÉGIA */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
              <Building2 size={13} />
              DNA & Estratégia de Conteúdo
            </span>
            <span className="text-xs text-zinc-400">·</span>
            <span className="text-xs font-semibold text-zinc-600">{companyName}</span>
          </div>
          <h2 className="mt-1 text-xl font-semibold text-zinc-950">Estratégia Completa do Cliente</h2>
          <p className="text-xs text-zinc-500">
            Todas as diretrizes estratégicas que orientam o Brainstorm, as Headlines e os roteiros da IA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {autoSaveState === "saving" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-100 text-[11px] text-zinc-600 font-medium">
              <RefreshCw className="h-3 w-3 animate-spin text-emerald-600" />
              Salvando alterações...
            </span>
          )}
          {autoSaveState === "saved" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-[11px] text-emerald-700 font-medium border border-emerald-200/60">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              {lastSavedTime ? `Salvo às ${lastSavedTime}` : "Salvo"}
            </span>
          )}
          {autoSaveState === "idle" && lastSavedTime && !feedback && (
            <span className="text-[11px] text-zinc-400">
              Salvo às {lastSavedTime}
            </span>
          )}

          {feedback && (
            <div
              className={
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold " +
                (feedback.type === "success"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border border-rose-200 bg-rose-50 text-rose-800")
              }
            >
              {feedback.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
              {feedback.text}
            </div>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(false)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save size={16} />}
            {saving ? "Salvando..." : "Salvar Estratégia"}
          </button>

          <button
            type="button"
            onClick={handleAdvance}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white shadow-xs hover:bg-zinc-800 transition cursor-pointer"
          >
            Avançar para Brainstorm & Ideias
            <ArrowRight size={16} />
          </button>

          <Link
            href="/strategy"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition"
            title="Abrir editor avançado de identidade e manuais"
          >
            <ExternalLink size={14} />
            Editor Completo
          </Link>
        </div>
      </div>

      {/* SUB-MENU EM ABAS DA ESTRATÉGIA */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-3">
        <button
          type="button"
          onClick={() => setSubTab("dna")}
          className={
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition cursor-pointer " +
            (subTab === "dna"
              ? "bg-zinc-900 text-white shadow-2xs"
              : "bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 border border-zinc-200")
          }
        >
          <Building2 size={16} />
          1. Posicionamento & DNA da Marca
        </button>
        <button
          type="button"
          onClick={() => setSubTab("audiences")}
          className={
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition cursor-pointer " +
            (subTab === "audiences"
              ? "bg-zinc-900 text-white shadow-2xs"
              : "bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 border border-zinc-200")
          }
        >
          <Target size={16} />
          2. Públicos-Alvo & Dores
          {targetAudiences.length > 0 && (
            <span className="ml-1 rounded-full bg-zinc-700 px-2 py-0.2 text-[11px] text-zinc-200">
              {targetAudiences.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSubTab("voice")}
          className={
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition cursor-pointer " +
            (subTab === "voice"
              ? "bg-zinc-900 text-white shadow-2xs"
              : "bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 border border-zinc-200")
          }
        >
          <MessageSquare size={16} />
          3. Tom de Voz & CTAs
        </button>
        <button
          type="button"
          onClick={() => setSubTab("formatStandards")}
          className={
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition cursor-pointer " +
            (subTab === "formatStandards"
              ? "bg-zinc-900 text-white shadow-2xs"
              : "bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 border border-zinc-200")
          }
        >
          <Sliders size={16} />
          4. Padrões de Formatos (Reels, Headlines)
        </button>
        <button
          type="button"
          onClick={() => setSubTab("channels")}
          className={
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition cursor-pointer " +
            (subTab === "channels"
              ? "bg-zinc-900 text-white shadow-2xs"
              : "bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 border border-zinc-200")
          }
        >
          <Globe size={16} />
          5. Canais & Conversão
        </button>
        <button
          type="button"
          onClick={() => setSubTab("editorial")}
          className={
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition cursor-pointer " +
            (subTab === "editorial"
              ? "bg-zinc-900 text-white shadow-2xs"
              : "bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 border border-zinc-200")
          }
        >
          <Layers size={16} />
          6. Pilares & Linhas Cadastradas
          {pillars.length > 0 && (
            <span className="ml-1 rounded-full bg-zinc-700 px-2 py-0.2 text-[11px] text-zinc-200">
              {pillars.length}
            </span>
          )}
        </button>
      </div>

      {/* CONTEÚDO DA SUB-ABA 1: POSICIONAMENTO & DNA */}
      {subTab === "dna" && (
        <div className="space-y-6">
          {/* DNA Comercial (Porta-voz, Cliente Ideal, Objetivo Comercial, Escopo) */}
          <CommercialDnaPanel
            clientId={clientId}
            showBusinessDescription={false}
            audiences={targetAudiences}
            onSaved={() => {
              void loadStrategyData();
            }}
          />

          <div className="grid gap-6 md:grid-cols-2">
            {/* Proposta de Valor e Nicho */}
            <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs">
              <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                <Building2 size={18} className="text-emerald-600" />
                Posicionamento Central
              </h3>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700">Nicho de Mercado / Especialidade</label>
                  <button
                    type="button"
                    disabled={generatingAiField === "marketNiche"}
                    onClick={() => handleGenerateAiField("marketNiche")}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  >
                    <Sparkles size={12} className={generatingAiField === "marketNiche" ? "animate-spin" : ""} />
                    {generatingAiField === "marketNiche" ? "Gerando..." : "Sugerir com IA"}
                  </button>
                </div>
                <input
                  className={control}
                  placeholder="Ex: Clínicas Odontológicas Premium, Consultoria Tributária B2B..."
                  value={marketNiche}
                  onChange={(e) => {
                    setMarketNiche(e.target.value);
                    setDirty(true);
                  }}
                  onBlur={handleBlur}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700">Proposta de Valor Única</label>
                  <button
                    type="button"
                    disabled={generatingAiField === "valueProposition"}
                    onClick={() => handleGenerateAiField("valueProposition")}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  >
                    <Sparkles size={12} className={generatingAiField === "valueProposition" ? "animate-spin" : ""} />
                    {generatingAiField === "valueProposition" ? "Gerando..." : "Sugerir com IA"}
                  </button>
                </div>
                <textarea
                  className={`${control} min-h-[140px]`}
                  placeholder="O que a sua empresa entrega que ninguém mais entrega? Qual é a promessa transformadora?"
                  value={valueProposition}
                  onChange={(e) => {
                    setValueProposition(e.target.value);
                    setDirty(true);
                  }}
                  onBlur={handleBlur}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700">Contexto da Empresa / História da Marca</label>
                  <button
                    type="button"
                    disabled={generatingAiField === "brandContext"}
                    onClick={() => handleGenerateAiField("brandContext")}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  >
                    <Sparkles size={12} className={generatingAiField === "brandContext" ? "animate-spin" : ""} />
                    {generatingAiField === "brandContext" ? "Gerando..." : "Sugerir com IA"}
                  </button>
                </div>
                <textarea
                  className={`${control} min-h-[160px]`}
                  placeholder="Resumo executivo do negócio, histórico dos fundadores, reputação e momento atual da empresa..."
                  value={brandContext}
                  onChange={(e) => {
                    setBrandContext(e.target.value);
                    setDirty(true);
                  }}
                  onBlur={handleBlur}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">Promessa Central de Valor</label>
                <input
                  className={control}
                  placeholder="Ex: Treinos seguros e orientados sem dores..."
                  value={corePromise}
                  onChange={(e) => {
                    setCorePromise(e.target.value);
                    setDirty(true);
                  }}
                  onBlur={handleBlur}
                />
              </div>
            </div>

            {/* Arquétipos e Diferenciais */}
            <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs">
              <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                <Sparkles size={18} className="text-zinc-800" />
                Arquétipos & Diferenciais
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-700">Arquétipo Principal</label>
                  <select
                    className={control}
                    value={normalizeArchetypeId(archetype)}
                    onChange={(e) => {
                      setArchetype(e.target.value);
                      setDirty(true);
                      scheduleAutoSave();
                    }}
                  >
                    <option value="">Selecione o Arquétipo</option>
                    {ARCHETYPES.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {archetype && (
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {ARCHETYPES.find((a) => a.id === normalizeArchetypeId(archetype))?.desc}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700">Arquétipo Secundário (opcional)</label>
                  <select
                    className={control}
                    value={normalizeArchetypeId(secondaryArchetype)}
                    onChange={(e) => {
                      setSecondaryArchetype(e.target.value);
                      setDirty(true);
                      scheduleAutoSave();
                    }}
                  >
                    <option value="">Nenhum / Opcional</option>
                    {ARCHETYPES.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {secondaryArchetype && (
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {ARCHETYPES.find((a) => a.id === normalizeArchetypeId(secondaryArchetype))?.desc}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-700">Objeções Comerciais Críticas</label>
                  <IdentityAiButton
                    clientId={clientId}
                    field="salesObjections"
                    draft={{ salesObjections, marketNiche, valueProposition }}
                    currentValue={salesObjections}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50/80 hover:bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition cursor-pointer"
                    onApply={(val) => {
                      setSalesObjections(Array.isArray(val) ? val.join("\n") : val);
                      setDirty(true);
                    }}
                  />
                </div>
                <textarea
                  className={`${control} min-h-[160px]`}
                  placeholder="Ex: Não tenho tempo; Acho que musculação piora minha dor..."
                  value={salesObjections}
                  onChange={(e) => {
                    setSalesObjections(e.target.value);
                    setDirty(true);
                  }}
                  onBlur={handleBlur}
                />
              </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700">Diferenciais Competitivos da Marca</label>
              <div className="mt-1 flex gap-2">
                <input
                  className={control}
                  placeholder="Ex: Atendimento 24h, Metodologia própria patenteada, Sem taxa oculta..."
                  value={newDifferential}
                  onChange={(e) => setNewDifferential(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addItem(setDifferentials, newDifferential, () => setNewDifferential(""));
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => addItem(setDifferentials, newDifferential, () => setNewDifferential(""))}
                  className="mt-1 inline-flex items-center gap-1 rounded-xl bg-zinc-900 px-3 text-xs font-bold text-white hover:bg-zinc-800 transition"
                >
                  <Plus size={14} />
                  Adicionar
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {differentials.map((diff) => (
                  <span
                    key={diff}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
                  >
                    <Check size={12} />
                    {diff}
                    <button
                      type="button"
                      onClick={() => removeItem(setDifferentials, diff)}
                      className="ml-1 text-emerald-600 hover:text-emerald-900"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
                {differentials.length === 0 && (
                  <p className="text-xs text-zinc-400 italic">Nenhum diferencial cadastrado ainda.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 2: PÚBLICOS & DORES */}
      {subTab === "audiences" && (
        <div className="space-y-6">
          {/* Gerenciador Completo de Públicos Estruturados em 4 Pilares */}
          <ClientAudiencesManager
            clientId={clientId}
            clientName={companyName}
            onAudiencesChange={(auds) => {
              setTargetAudiences(auds.map((a) => a.name));
            }}
          />

          {/* Dores e Objeções Globais do Negócio (Transversais) */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-600" />
                Dores e Objeções Globais do Negócio
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Frustrações transversais a todos os públicos que o conteúdo geral e a autoridade da marca ajudam a sanar.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                className={control}
                placeholder="Ex: Falta de tempo para cuidar da saúde, frustração com academias convencionais..."
                value={newPain}
                onChange={(e) => setNewPain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem(setPainPoints, newPain, () => setNewPain(""));
                  }
                }}
              />
              <button
                type="button"
                onClick={() => addItem(setPainPoints, newPain, () => setNewPain(""))}
                className="inline-flex items-center gap-1 rounded-xl bg-zinc-900 px-3 text-xs font-bold text-white hover:bg-zinc-800 transition"
              >
                <Plus size={14} />
                Adicionar
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {painPoints.map((pain) => (
                <span
                  key={pain}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200/60 bg-amber-50/50 text-xs font-medium text-amber-900"
                >
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  {pain}
                  <button
                    type="button"
                    onClick={() => removeItem(setPainPoints, pain)}
                    className="ml-1 text-zinc-400 hover:text-rose-600 transition"
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
              {painPoints.length === 0 && (
                <p className="text-xs text-zinc-400 italic">Nenhuma dor global cadastrada ainda.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 3: TOM DE VOZ, CTAS & DIRETRIZES */}
      {subTab === "voice" && (
        <div className="space-y-6">
          {/* Tom de Voz */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
              <MessageSquare size={18} className="text-emerald-600" />
              Tom de Voz da Marca
            </h3>
            <p className="text-xs text-zinc-500">
              Selecione as nuances que definem o tom e estilo da comunicação da marca.
            </p>

            <div className="flex flex-wrap gap-2">
              {PRESET_TONES.map((tone) => {
                const active = selectedTones.includes(tone);
                return (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => toggleTone(tone)}
                    className={
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition cursor-pointer " +
                      (active
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs font-bold"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50")
                    }
                  >
                    {active && <Check size={12} />}
                    {tone}
                  </button>
                );
              })}

              {/* Tons personalizados do DNA do cliente */}
              {selectedTones
                .filter((t) => !PRESET_TONES.includes(t))
                .map((customTone) => (
                  <span
                    key={customTone}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-950 shadow-2xs"
                  >
                    <Check size={12} className="text-emerald-700" />
                    {customTone}
                    <button
                      type="button"
                      onClick={() => removeItem(setSelectedTones, customTone)}
                      className="ml-0.5 text-emerald-700 hover:text-emerald-950 cursor-pointer"
                      title="Remover tom"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
            </div>

            <div className="flex gap-2 max-w-md pt-2">
              <input
                className={control}
                placeholder="Adicionar tom personalizado..."
                value={newCustomTone}
                onChange={(e) => setNewCustomTone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem(setSelectedTones, newCustomTone, () => setNewCustomTone(""));
                  }
                }}
              />
              <button
                type="button"
                onClick={() => addItem(setSelectedTones, newCustomTone, () => setNewCustomTone(""))}
                className="mt-1 inline-flex items-center gap-1 rounded-xl bg-zinc-900 px-3 text-xs font-bold text-white hover:bg-zinc-800 transition"
              >
                <Plus size={14} />
                Adicionar
              </button>
            </div>
          </div>

          {/* Perfil de Comunicação (Quem comunica / Vozes) */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3">
              <h4 className="text-sm font-bold text-zinc-950">Quem Comunica (Porta-Voz)</h4>
              <div className="space-y-2">
                {COMMUNICATION_OPTIONS.speakerTypes.map((speaker) => {
                  const active = communicationProfile.speakerTypes?.includes(speaker);
                  return (
                    <button
                      key={speaker}
                      type="button"
                      onClick={() => toggleProfileField("speakerTypes", speaker)}
                      className={
                        "flex w-full items-center justify-between rounded-xl border p-2.5 text-xs font-medium text-left transition " +
                        (active
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold"
                          : "border-zinc-200 bg-zinc-50/50 text-zinc-700 hover:bg-zinc-100")
                      }
                    >
                      {speaker}
                      {active && <Check size={14} className="text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3">
              <h4 className="text-sm font-bold text-zinc-950">Com Quem Fala (Destinatário)</h4>
              <div className="space-y-2">
                {COMMUNICATION_OPTIONS.audienceTypes.map((aud) => {
                  const active = communicationProfile.audienceTypes?.includes(aud);
                  return (
                    <button
                      key={aud}
                      type="button"
                      onClick={() => toggleProfileField("audienceTypes", aud)}
                      className={
                        "flex w-full items-center justify-between rounded-xl border p-2.5 text-xs font-medium text-left transition " +
                        (active
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold"
                          : "border-zinc-200 bg-zinc-50/50 text-zinc-700 hover:bg-zinc-100")
                      }
                    >
                      {aud}
                      {active && <Check size={14} className="text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3">
              <h4 className="text-sm font-bold text-zinc-950">Como Aparece (Voz do Conteúdo)</h4>
              <div className="space-y-2">
                {COMMUNICATION_OPTIONS.contentVoices.map((voice) => {
                  const active = communicationProfile.contentVoices?.includes(voice);
                  return (
                    <button
                      key={voice}
                      type="button"
                      onClick={() => toggleProfileField("contentVoices", voice)}
                      className={
                        "flex w-full items-center justify-between rounded-xl border p-2.5 text-xs font-medium text-left transition " +
                        (active
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold"
                          : "border-zinc-200 bg-zinc-50/50 text-zinc-700 hover:bg-zinc-100")
                      }
                    >
                      {voice}
                      {active && <Check size={14} className="text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CTAs, Termos Obrigatórios e Palavras Proibidas */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* CTAs Padrão */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3">
              <h4 className="text-sm font-bold text-zinc-950 flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Chamadas para Ação (CTAs)
              </h4>
              <div className="flex gap-1.5">
                <input
                  className={control}
                  placeholder="Ex: Clique no link da bio..."
                  value={newCta}
                  onChange={(e) => setNewCta(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addItem(setDefaultCtas, newCta, () => setNewCta(""));
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => addItem(setDefaultCtas, newCta, () => setNewCta(""))}
                  className="mt-1 inline-flex items-center rounded-xl bg-zinc-900 px-2.5 text-xs font-bold text-white hover:bg-zinc-800"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="space-y-1.5">
                {defaultCtas.map((cta) => (
                  <span
                    key={cta}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-800"
                  >
                    {cta}
                    <button
                      type="button"
                      onClick={() => removeItem(setDefaultCtas, cta)}
                      className="text-zinc-400 hover:text-rose-600"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Termos Obrigatórios */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3">
              <h4 className="text-sm font-bold text-zinc-950 flex items-center gap-1.5">
                <Sparkles size={16} className="text-zinc-800" />
                Termos Obrigatórios
              </h4>
              <div className="flex gap-1.5">
                <input
                  className={control}
                  placeholder="Ex: Método X, Registro no CRM..."
                  value={newMandatory}
                  onChange={(e) => setNewMandatory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addItem(setMandatoryTerms, newMandatory, () => setNewMandatory(""));
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => addItem(setMandatoryTerms, newMandatory, () => setNewMandatory(""))}
                  className="mt-1 inline-flex items-center rounded-xl bg-zinc-900 px-2.5 text-xs font-bold text-white hover:bg-zinc-800"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="space-y-1.5">
                {mandatoryTerms.map((term) => (
                  <span
                    key={term}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-100 p-2 text-xs text-zinc-800"
                  >
                    {term}
                    <button
                      type="button"
                      onClick={() => removeItem(setMandatoryTerms, term)}
                      className="text-zinc-500 hover:text-rose-600"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Palavras Proibidas / Blacklist de Termos */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3">
              <h4 className="text-sm font-bold text-zinc-950 flex items-center gap-1.5 text-rose-700">
                <ShieldAlert size={16} className="text-rose-600" />
                Palavras Proibidas (Blacklist)
              </h4>
              <div className="flex gap-1.5">
                <input
                  className={control}
                  placeholder="Ex: Barato, Garantido, Grátis..."
                  value={newForbidden}
                  onChange={(e) => setNewForbidden(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addItem(setForbiddenWords, newForbidden, () => setNewForbidden(""));
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => addItem(setForbiddenWords, newForbidden, () => setNewForbidden(""))}
                  className="mt-1 inline-flex items-center rounded-xl bg-rose-600 px-2.5 text-xs font-bold text-white hover:bg-rose-700"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="space-y-1.5">
                {forbiddenWords.map((word) => (
                  <span
                    key={word}
                    className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800"
                  >
                    {word}
                    <button
                      type="button"
                      onClick={() => removeItem(setForbiddenWords, word)}
                      className="text-rose-400 hover:text-rose-700"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 4: PADRÕES DE FORMATOS */}
      {subTab === "formatStandards" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                <Sliders size={18} className="text-emerald-600" />
                Padrões Editoriais & Regras por Formato do Cliente
              </h3>
              <p className="text-xs text-zinc-500">
                Defina as diretrizes fixas para cada formato. A IA aplicará estas regras rigorosamente nas próximas etapas de geração de headlines e roteiros.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Padrão para Reels */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
                <h4 className="text-sm font-bold text-zinc-950 flex items-center gap-1.5">
                  <Video size={16} className="text-zinc-800" />
                  Padrão para Reels & Vídeos
                </h4>
                <p className="text-[11px] text-zinc-500">
                  Duração ideal, tipo de gancho inicial, ritmo de falas e estilo de CTA.
                </p>
                <textarea
                  className={`${control} min-h-[140px] text-xs`}
                  placeholder="Ex: Vídeos de até 45s, gancho direto nos primeiros 3s sem vinheta, falas divididas com textos na tela dinâmicos, CTA para comentar palavra-chave..."
                  value={formatGuidelines.reelsStandard}
                  onChange={(e) => {
                    setFormatGuidelines((prev) => ({ ...prev, reelsStandard: e.target.value }));
                    setDirty(true);
                  }}
                  onBlur={handleBlur}
                />
              </div>

              {/* Padrão para Headlines */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
                <h4 className="text-sm font-bold text-zinc-950 flex items-center gap-1.5">
                  <TrendingUp size={16} className="text-emerald-600" />
                  Padrão para Headlines
                </h4>
                <p className="text-[11px] text-zinc-500">
                  Fórmulas preferidas, limite de palavras, tom e estruturação de subtítulo.
                </p>
                <textarea
                  className={`${control} min-h-[140px] text-xs`}
                  placeholder="Ex: Títulos diretos de até 8 palavras, priorizar quebra de objeção ou erro comum, sem sensacionalismo vazio, sempre acompanhar subtítulo explicativo com dados..."
                  value={formatGuidelines.headlinesStandard}
                  onChange={(e) => {
                    setFormatGuidelines((prev) => ({ ...prev, headlinesStandard: e.target.value }));
                    setDirty(true);
                  }}
                  onBlur={handleBlur}
                />
              </div>

              {/* Padrão para Carrossel */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
                <h4 className="text-sm font-bold text-zinc-950 flex items-center gap-1.5">
                  <Layers size={16} className="text-amber-600" />
                  Padrão para Carrosséis
                </h4>
                <p className="text-[11px] text-zinc-500">
                  Número médio de slides, densidade de texto por slide e estrutura visual.
                </p>
                <textarea
                  className={`${control} min-h-[140px] text-xs`}
                  placeholder="Ex: Entre 5 e 7 slides, capa com headline grande e contraste alto, máximo de 35 palavras por slide, slide final com resumo acionável e chamada para salvar..."
                  value={formatGuidelines.carouselStandard}
                  onChange={(e) => {
                    setFormatGuidelines((prev) => ({ ...prev, carouselStandard: e.target.value }));
                    setDirty(true);
                  }}
                  onBlur={handleBlur}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 5: CANAIS & CONVERSÃO */}
      {subTab === "channels" && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
              <Globe size={18} className="text-emerald-600" />
              Canais Digitais de Conversão
            </h3>

            <div>
              <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                <Instagram size={14} className="text-pink-600" />
                Instagram (@perfil)
              </label>
              <input
                className={control}
                placeholder="@otimizzagrowth"
                value={instagramHandle}
                onChange={(e) => {
                  setInstagramHandle(e.target.value);
                  setDirty(true);
                }}
                onBlur={handleBlur}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                <Globe size={14} className="text-blue-600" />
                Site Oficial / Landing Page
              </label>
              <input
                className={control}
                placeholder="https://otimizza.com.br"
                value={websiteUrl}
                onChange={(e) => {
                  setWebsiteUrl(e.target.value);
                  setDirty(true);
                }}
                onBlur={handleBlur}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-600" />
                WhatsApp para CTA / Agendamentos
              </label>
              <input
                className={control}
                placeholder="Ex: +55 (11) 99999-9999 ou link de atendimento"
                value={whatsappCta}
                onChange={(e) => {
                  setWhatsappCta(e.target.value);
                  setDirty(true);
                }}
                onBlur={handleBlur}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
              <BookOpen size={18} className="text-zinc-600" />
              Orientações Adicionais & Notas de Copy
            </h3>
            <p className="text-xs text-zinc-500">
              Instruções livres sobre preferências de conteúdo, estilo de narrativa e observações estratégicas.
            </p>

            <textarea
              className={`${control} min-h-[160px]`}
              placeholder="Ex: O cliente prefere conteúdos técnicos sem exageros emocionais. Sempre reforçar a autoridade médica e citar o CRM nos finais de posts..."
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setDirty(true);
              }}
              onBlur={handleBlur}
            />
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 5: PILARES & LINHAS EDITORIAIS */}
      {subTab === "editorial" && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                <Layers size={18} className="text-emerald-600" />
                Pilares Estratégicos & Linhas Editoriais
              </h3>
              <p className="text-xs text-zinc-500">
                Pilares cadastrados para o cliente que categorizam e organizam as ideias no Brainstorm e no Calendário.
              </p>
            </div>
            <Link
              href="/prompt-creator?tab=EDITORIAL"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition"
            >
              <BookOpen size={14} />
              Gerenciar Pilares & Linhas
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map((pillar) => {
              const lines = editorialLines.filter((l) => l.pillar_id === pillar.id);
              return (
                <div
                  key={pillar.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-zinc-900">{pillar.name}</h4>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                      {lines.length} {lines.length === 1 ? "tema" : "temas"}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {lines.map((line) => (
                      <div
                        key={line.id}
                        className="rounded-lg border border-zinc-200/80 bg-white p-2.5 text-xs"
                      >
                        <div className="font-semibold text-zinc-900">{line.theme}</div>
                        {line.objective && (
                          <div className="text-[11px] text-zinc-500 mt-0.5">{line.objective}</div>
                        )}
                        {line.preferred_formats && line.preferred_formats.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {line.preferred_formats.map((fmt) => (
                              <span
                                key={fmt}
                                className="rounded bg-zinc-100 px-1.5 py-0.2 text-[10px] text-zinc-600"
                              >
                                {fmt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {lines.length === 0 && (
                      <p className="text-xs text-zinc-400 italic">Nenhum tema cadastrado para este pilar.</p>
                    )}
                  </div>
                </div>
              );
            })}
            {pillars.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-zinc-300 p-8 text-center">
                <p className="text-xs text-zinc-500">Nenhum pilar editorial cadastrado para esta empresa ainda.</p>
                <Link
                  href="/prompt-creator?tab=EDITORIAL"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:underline"
                >
                  Criar primeiro pilar editorial →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RODAPÉ INFORMATIVO E BOTÃO DE AVANÇO */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-950">Estratégia integrada com o Brainstorm e IA</h4>
            <p className="text-xs text-zinc-600">
              Todas as informações salvas aqui são injetadas diretamente nos prompts de Brainstorm, Headlines e roteiros criativos.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAdvance}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
        >
          Ir para o Passo 2: Brainstorm & Ideias
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
