"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCompany } from "@/lib/context/company-context";
import { contentCompanyId, INTERNAL_COMPANY_ID } from "@/modules/clients/internal-company";
import { IdentityAiButton } from "@/components/clients/identity-ai-button";
import type { IdentityAiField } from "@/modules/clients/identity-ai";
import { CommunicationProfileFields } from "@/components/clients/communication-profile";
import { CommunicationProfileSchema, emptyCommunicationProfile, type CommunicationProfile } from "@/modules/clients/communication-profile";
import { ClientAudiencesManager, type ClientAudienceItem } from "@/components/clients/client-audiences-manager";
import { ARCHETYPES, normalizeArchetypeId, getArchetypeName } from "@/components/headlines/client-strategy-panel";
import { type ClientCatalogItem } from "@/modules/clients/catalog-service";
import {
  Compass,
  Target,
  MessageSquare,
  Sparkles,
  Package,
  Users,
  Globe,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Archive,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  X,
  Check,
} from "lucide-react";
import { InstagramIcon as Instagram } from "@/components/ui/instagram";
import { WhatsAppIcon } from "@/components/ui/whatsapp";

const PRESET_TONES = [
  "Direto e didático",
  "Sem juridiquês ou jargões vazios",
  "Focado em decisões e crescimento",
  "Orientado a dados com clareza",
  "Enérgico e persuasivo",
  "Empático e consultivo",
  "Sofisticado e exclusivo",
  "Provocativo e instigante",
  "Calmo e acolhedor",
  "Técnico e fundamentado",
];

const TARGET_AUDIENCE_OPTIONS = [
  "Consumidor final / B2C",
  "Empresários / Donos de PME",
  "Executivos e C-Level / B2B",
  "Profissionais Liberais / Autônomos",
  "Jovens e Estudantes",
  "Famílias e Pais/Mães",
  "Público 50+ / Terceira Idade",
  "Público Alto Padrão / Luxo",
  "Compradores Corporativos / Procurement",
  "Investidores / Parceiros",
  "Atletas e Praticantes de Esportes",
  "Comunidade Técnica / Especialistas",
];

type StrategyTab =
  | "POSITIONING"
  | "TONE_OF_VOICE"
  | "BRAND_DNA"
  | "CATALOG"
  | "AUDIENCES"
  | "CHANNELS";

export default function StrategyPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" />
          Carregando Estratégia...
        </div>
      }
    >
      <StrategyContent />
    </Suspense>
  );
}

function StrategyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedCompany, availableCompanies, selectCompany } = useCompany();

  // Se houver clientId na URL, sincroniza o cliente
  const queryClientId = searchParams.get("clientId");
  const activeClientId = queryClientId || contentCompanyId(selectedCompany);
  const activeCompany =
    availableCompanies.find((c) => c.id === activeClientId) || selectedCompany;

  const [activeTab, setActiveTab] = useState<StrategyTab>(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "tom") return "TONE_OF_VOICE";
    if (tabParam === "dna") return "BRAND_DNA";
    if (tabParam === "produtos") return "CATALOG";
    if (tabParam === "publicos") return "AUDIENCES";
    if (tabParam === "canais") return "CHANNELS";
    return "POSITIONING";
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [version, setVersion] = useState<number>(1);

  // Form Fields
  const [marketNiche, setMarketNiche] = useState("");
  const [valueProposition, setValueProposition] = useState("");
  const [corePromise, setCorePromise] = useState("");
  const [differentials, setDifferentials] = useState<string[]>([]);
  const [newDifferential, setNewDifferential] = useState("");

  const [selectedTones, setSelectedTones] = useState<string[]>([]);
  const [newCustomTone, setNewCustomTone] = useState("");
  const [mandatoryTerms, setMandatoryTerms] = useState<string[]>([]);
  const [newMandatory, setNewMandatory] = useState("");
  const [forbiddenWords, setForbiddenWords] = useState<string[]>([]);
  const [newForbidden, setNewForbidden] = useState("");

  const [brandHistory, setBrandHistory] = useState("");
  const [brandContext, setBrandContext] = useState("");
  const [archetype, setArchetype] = useState("");
  const [secondaryArchetype, setSecondaryArchetype] = useState("");
  const [communicationProfile, setCommunicationProfile] = useState<CommunicationProfile>(emptyCommunicationProfile);

  // Catalog
  const [catalogItems, setCatalogItems] = useState<ClientCatalogItem[]>([]);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState<ClientCatalogItem | null>(null);
  const [catalogName, setCatalogName] = useState("");
  const [catalogType, setCatalogType] = useState<"SERVICE" | "PRODUCT">("SERVICE");
  const [catalogDescription, setCatalogDescription] = useState("");
  const [catalogDiffs, setCatalogDiffs] = useState("");
  const [catalogPains, setCatalogPains] = useState("");
  const [catalogSolution, setCatalogSolution] = useState("");
  const [catalogAudienceIds, setCatalogAudienceIds] = useState<string[]>([]);

  // Audiences
  const [targetAudiences, setTargetAudiences] = useState<string[]>([]);
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [newPain, setNewPain] = useState("");
  const [salesObjections, setSalesObjections] = useState("");

  // Channels
  const [instagramHandle, setInstagramHandle] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [whatsappCta, setWhatsappCta] = useState("");
  const [defaultCtas, setDefaultCtas] = useState<string[]>([]);
  const [newCta, setNewCta] = useState("");
  const [suggestedInstagram, setSuggestedInstagram] = useState("");
  const [suggestedWebsite, setSuggestedWebsite] = useState("");
  const [notes, setNotes] = useState("");

  // Ref para auto-save
  const dirtyFieldsRef = useRef<Set<string>>(new Set());
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentClientIdRef = useRef(activeClientId);

  useEffect(() => {
    currentClientIdRef.current = activeClientId;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, [activeClientId]);

  const loadStrategyData = useCallback(async (clientId: string) => {
    if (!clientId) return;
    setLoading(true);
    setConflict(null);
    dirtyFieldsRef.current.clear();
    setDirty(false);

    try {
      const [identRes, catRes] = await Promise.all([
        fetch(`/api/clients/${clientId}/identity`, { cache: "no-store" }),
        fetch(`/api/clients/${clientId}/catalog`, { cache: "no-store" }),
      ]);

      if (currentClientIdRef.current !== clientId) return;

      if (identRes.ok) {
        const idData = await identRes.json();
        if (currentClientIdRef.current !== clientId) return;
        setVersion(idData.version || 1);
        setMarketNiche(idData.marketNiche || "");
        setValueProposition(idData.valueProposition || "");
        setCorePromise(idData.corePromise || "");
        setDifferentials(Array.isArray(idData.differentials) ? idData.differentials : []);

        setSelectedTones(Array.isArray(idData.toneOfVoice) ? idData.toneOfVoice : []);
        setMandatoryTerms(Array.isArray(idData.mandatoryTerms) ? idData.mandatoryTerms : []);
        setForbiddenWords(Array.isArray(idData.forbiddenWords) ? idData.forbiddenWords : []);

        setBrandHistory(idData.brandHistory || "");
        setBrandContext(idData.brandContext || "");
        setArchetype(idData.archetype || "");
        setSecondaryArchetype(idData.secondaryArchetype || "");
        setCommunicationProfile(
          CommunicationProfileSchema.parse(idData.communicationProfile || {})
        );

        setTargetAudiences(Array.isArray(idData.targetAudiences) ? idData.targetAudiences : []);
        setPainPoints(Array.isArray(idData.painPoints) ? idData.painPoints : []);
        setSalesObjections(idData.salesObjections || "");

        setInstagramHandle(idData.instagramHandle || "");
        setWebsiteUrl(idData.websiteUrl || "");
        setSuggestedInstagram(idData.suggestedInstagram || "");
        setSuggestedWebsite(idData.suggestedWebsite || "");
        setWhatsappCta(idData.whatsappCta || "");
        setDefaultCtas(Array.isArray(idData.defaultCtas) ? idData.defaultCtas : []);
        setNotes(idData.notes || "");
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        if (currentClientIdRef.current !== clientId) return;
        setCatalogItems(catData.items || []);
      }
    } catch (err) {
      if (currentClientIdRef.current === clientId) {
        console.error("Erro ao carregar estratégia:", err);
        setFeedback("Não foi possível carregar os dados de estratégia deste cliente.");
      }
    } finally {
      if (currentClientIdRef.current === clientId) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadStrategyData(activeClientId);
  }, [activeClientId, loadStrategyData]);

  // Função para salvar campos alterados
  const persistChanges = useCallback(
    async (manual = false) => {
      if (saving || (!dirty && !manual)) return;
      setSaving(true);
      setConflict(null);

      const payload: Record<string, unknown> = {
        version,
      };

      // Montar payload contendo apenas os campos da tela
      payload.marketNiche = marketNiche;
      payload.valueProposition = valueProposition;
      payload.corePromise = corePromise;
      payload.differentials = differentials;

      payload.toneOfVoice = selectedTones;
      payload.mandatoryTerms = mandatoryTerms;
      payload.forbiddenWords = forbiddenWords;

      payload.brandHistory = brandHistory;
      payload.brandContext = brandContext;
      payload.archetype = archetype;
      payload.secondaryArchetype = secondaryArchetype;
      payload.communicationProfile = communicationProfile;

      payload.targetAudiences = targetAudiences;
      payload.painPoints = painPoints;
      payload.salesObjections = salesObjections;

      payload.instagramHandle = instagramHandle;
      payload.websiteUrl = websiteUrl;
      payload.whatsappCta = whatsappCta;
      payload.defaultCtas = defaultCtas;
      payload.notes = notes;

      try {
        const res = await fetch(`/api/clients/${activeClientId}/identity`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.status === 409) {
          const errData = await res.json();
          setConflict(
            errData.message ||
              "Conflito detectado: este registro foi alterado em outra sessão. Recarregue para atualizar."
          );
          setSaving(false);
          return;
        }

        if (!res.ok) {
          throw new Error("Falha ao salvar estratégia.");
        }

        const data = await res.json();
        if (data.data?.version) {
          setVersion(data.data.version);
        }
        setDirty(false);
        dirtyFieldsRef.current.clear();
        const now = new Date();
        const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        setLastSavedTime(timeStr);
        setFeedback(`Alterações salvas com sucesso às ${timeStr}.`);
        setTimeout(() => setFeedback(null), 4000);
      } catch (err) {
        console.error("Erro ao salvar:", err);
        setFeedback("Erro ao salvar dados de estratégia.");
      } finally {
        setSaving(false);
      }
    },
    [
      activeClientId,
      archetype,
      brandContext,
      brandHistory,
      communicationProfile,
      corePromise,
      defaultCtas,
      differentials,
      dirty,
      forbiddenWords,
      instagramHandle,
      mandatoryTerms,
      marketNiche,
      notes,
      painPoints,
      salesObjections,
      saving,
      secondaryArchetype,
      selectedTones,
      targetAudiences,
      valueProposition,
      version,
      websiteUrl,
      whatsappCta,
    ]
  );

  const markDirty = (fieldName?: string) => {
    setDirty(true);
    if (fieldName) dirtyFieldsRef.current.add(fieldName);

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      void persistChanges(false);
    }, 1200);
  };

  const handleBlur = () => {
    if (dirty) {
      void persistChanges(false);
    }
  };

  // Funções de manipulação do catálogo
  const handleOpenNewCatalogItem = () => {
    setEditingCatalogItem(null);
    setCatalogName("");
    setCatalogType("SERVICE");
    setCatalogDescription("");
    setCatalogDiffs("");
    setCatalogPains("");
    setCatalogSolution("");
    setCatalogAudienceIds([]);
    setCatalogModalOpen(true);
  };

  const handleOpenEditCatalogItem = (item: ClientCatalogItem) => {
    setEditingCatalogItem(item);
    setCatalogName(item.name);
    setCatalogType(item.type);
    setCatalogDescription(item.description || "");
    setCatalogDiffs(item.differentials || "");
    setCatalogPains(item.target_pain_points || "");
    setCatalogSolution(item.solution_approach || "");
    setCatalogAudienceIds(item.target_audience_ids || []);
    setCatalogModalOpen(true);
  };

  const handleSaveCatalogModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogName.trim()) return;

    try {
      const payload = {
        id: editingCatalogItem?.id,
        type: catalogType,
        name: catalogName.trim(),
        description: catalogDescription.trim(),
        differentials: catalogDiffs.trim(),
        target_pain_points: catalogPains.trim(),
        solution_approach: catalogSolution.trim(),
        target_audience_ids: catalogAudienceIds,
      };

      const res = await fetch(`/api/clients/${activeClientId}/catalog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar item no catálogo.");
      setCatalogModalOpen(false);
      // Recarregar catálogo
      const reload = await fetch(`/api/clients/${activeClientId}/catalog`);
      if (reload.ok) {
        const d = await reload.json();
        setCatalogItems(d.items || []);
      }
    } catch (err) {
      console.error(err);
      alert("Não foi possível salvar o produto/serviço.");
    }
  };

  const handleDeleteCatalogItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Deseja realmente remover "${itemName}" do catálogo?`)) return;
    try {
      const res = await fetch(`/api/clients/${activeClientId}/catalog?itemId=${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir.");
      setCatalogItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      console.error(err);
      alert("Falha ao remover item.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/60 pb-20">
      {/* Header Sticky */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white flex items-center justify-center shadow-2xs">
              <Compass className="w-5 h-5 text-zinc-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-zinc-950">Estratégia da Marca</h1>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                  {activeCompany.name}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Central de posicionamento, DNA, catálogo e personas para orientar a IA e a criação.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Links rápidos para Linha Editorial, Padrões e Brainstorm */}
            <Link
              href="/social/editorial"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition"
              title="Ir para Linha Editorial do cliente"
            >
              Linha Editorial
            </Link>
            <Link
              href="/social/format-guidelines"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition"
              title="Padrões de Formatos (Reels, Carrossel, Headlines)"
            >
              Padrões de Formatos
            </Link>
            <Link
              href="/prompt-creator/headlines"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-zinc-950 rounded-xl hover:bg-zinc-800 transition shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Brainstorm
            </Link>

            {/* Botão de Salvar Manual */}
            <button
              type="button"
              onClick={() => persistChanges(true)}
              disabled={saving}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                dirty
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              }`}
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Salvando...
                </>
              ) : dirty ? (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Salvar
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Salvo
                </>
              )}
            </button>
          </div>
        </div>

        {/* Barra de Abas das 6 seções */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto no-scrollbar">
          <nav className="flex items-center gap-1 sm:gap-2 py-1.5 border-t border-zinc-100 text-xs font-semibold">
            {[
              { id: "POSITIONING" as StrategyTab, label: "1. Posicionamento", icon: Target },
              { id: "TONE_OF_VOICE" as StrategyTab, label: "2. Tom de Voz", icon: MessageSquare },
              { id: "BRAND_DNA" as StrategyTab, label: "3. DNA da Marca", icon: Sparkles },
              { id: "CATALOG" as StrategyTab, label: "4. Produtos e Serviços", icon: Package },
              { id: "AUDIENCES" as StrategyTab, label: "5. Público-Alvo", icon: Users },
              { id: "CHANNELS" as StrategyTab, label: "6. Canais e Conversão", icon: Globe },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-zinc-900 text-white shadow-2xs font-bold"
                      : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/70 font-medium"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-zinc-200" : "text-zinc-400"}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        {conflict && (
          <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{conflict}</span>
            </div>
            <button
              onClick={() => loadStrategyData(activeClientId)}
              className="px-3 py-1 bg-amber-700 text-white rounded-lg text-xs font-semibold hover:bg-amber-800 transition"
            >
              Recarregar dados
            </button>
          </div>
        )}

        {feedback && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {loading ? (
          <div className="p-16 text-center text-xs text-zinc-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
            <span>Carregando dados estratégicos de {activeCompany.name}...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ========================================================================= */}
            {/* ABA 1: POSICIONAMENTO                                                     */}
            {/* ========================================================================= */}
            {activeTab === "POSITIONING" && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <div>
                      <h2 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                        <Target className="w-4 h-4 text-indigo-600" />
                        Posicionamento de Mercado & Proposta de Valor
                      </h2>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Define como a marca é percebida no mercado e a promessa central entregue aos clientes.
                      </p>
                    </div>
                    {lastSavedTime && (
                      <span className="text-[11px] text-zinc-400">Salvo às {lastSavedTime}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-zinc-700">
                          Nicho de Mercado & Especialidade
                        </label>
                        <IdentityAiButton clientId={activeClientId} field="marketNiche" draft={{ marketNiche }} onApply={(val) => { setMarketNiche(Array.isArray(val) ? val.join("\n") : val); markDirty("marketNiche"); }} />
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Ex: Clínicas Odontológicas de Alto Padrão, Assessoria Contábil para PMEs..."
                        value={marketNiche}
                        onChange={(e) => { setMarketNiche(e.target.value); markDirty("marketNiche"); }}
                        onBlur={handleBlur}
                        className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-y leading-relaxed text-zinc-900"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-zinc-700">
                          Proposta de Valor / Promessa Central
                        </label>
                        <IdentityAiButton clientId={activeClientId} field="valueProposition" draft={{ valueProposition }} onApply={(val) => { setValueProposition(Array.isArray(val) ? val.join("\n") : val); markDirty("valueProposition"); }} />
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Ex: Dobrar a captação de clientes particulares em 90 dias com método validado..."
                        value={valueProposition}
                        onChange={(e) => { setValueProposition(e.target.value); markDirty("valueProposition"); }}
                        onBlur={handleBlur}
                        className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-y leading-relaxed text-zinc-900"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-zinc-700">
                        Promessa Central Detalhada (Core Promise)
                      </label>
                      <IdentityAiButton clientId={activeClientId} field="valueProposition" draft={{ valueProposition: corePromise }} onApply={(val) => { setCorePromise(Array.isArray(val) ? val.join("\n") : val); markDirty("corePromise"); }} />
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Qual é o resultado inegociável que você garante aos seus clientes?"
                      value={corePromise}
                      onChange={(e) => { setCorePromise(e.target.value); markDirty("corePromise"); }}
                      onBlur={handleBlur}
                      className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-y leading-relaxed text-zinc-900"
                    />
                  </div>
                </div>

                {/* Diferenciais Comprovados */}
                <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-950">Diferenciais Comprovados da Marca</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        O que torna o cliente único e inimitável perante a concorrência.
                      </p>
                    </div>
                    <IdentityAiButton clientId={activeClientId} field="differentials" draft={{ differentials }} onApply={(val) => {
                      const items = (Array.isArray(val) ? val : val.split("\n")).map((s: string) => s.trim()).filter(Boolean);
                      setDifferentials(prev => Array.from(new Set([...prev, ...items])));
                      markDirty("differentials");
                    }} />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {differentials.map((diff, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-indigo-900 text-xs font-medium"
                      >
                        <span>{diff}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setDifferentials(prev => prev.filter((_, i) => i !== idx));
                            markDirty("differentials");
                          }}
                          className="p-0.5 hover:bg-indigo-200 rounded-full transition cursor-pointer"
                        >
                          <X className="w-3 h-3 text-indigo-700" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 max-w-xl">
                    <input
                      type="text"
                      placeholder="Adicionar diferencial comprovado..."
                      value={newDifferential}
                      onChange={(e) => setNewDifferential(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newDifferential.trim()) {
                          e.preventDefault();
                          setDifferentials(prev => [...prev, newDifferential.trim()]);
                          setNewDifferential("");
                          markDirty("differentials");
                        }
                      }}
                      className="flex-1 px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newDifferential.trim()) {
                          setDifferentials(prev => [...prev, newDifferential.trim()]);
                          setNewDifferential("");
                          markDirty("differentials");
                        }
                      }}
                      className="px-3.5 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition"
                    >
                      <Plus className="w-3.5 h-3.5 inline mr-1" />
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* ABA 2: TOM DE VOZ                                                         */}
            {/* ========================================================================= */}
            {activeTab === "TONE_OF_VOICE" && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <div>
                      <h2 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-purple-600" />
                        Tom de Voz & Diretrizes de Linguagem
                      </h2>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Configura a cadência verbal, vocabulário obrigatório e filtros de exclusão para toda a comunicação.
                      </p>
                    </div>
                  </div>

                  {/* Tons Predefinidos */}
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-2">
                      Tons Predefinidos (Clique para ativar/desativar)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_TONES.map((tone) => {
                        const isSelected = selectedTones.includes(tone);
                        return (
                          <button
                            key={tone}
                            type="button"
                            onClick={() => {
                              setSelectedTones(prev =>
                                isSelected ? prev.filter(t => t !== tone) : [...prev, tone]
                              );
                              markDirty("toneOfVoice");
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                              isSelected
                                ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                                : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                            {tone}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tons Personalizados */}
                  <div className="pt-2 border-t border-zinc-100">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-zinc-700">
                        Tons Personalizados Salvos
                      </label>
                      <IdentityAiButton
                        clientId={activeClientId}
                        field="toneOfVoice"
                        draft={{ toneOfVoice: selectedTones }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50/70 hover:bg-purple-100/80 px-2.5 py-1 text-[11px] font-semibold text-purple-700 transition cursor-pointer"
                        onApply={(val) => {
                          const items = Array.isArray(val) ? val : [val];
                          setSelectedTones((prev) => Array.from(new Set([...prev, ...items])));
                          markDirty("toneOfVoice");
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedTones
                        .filter((t) => !PRESET_TONES.includes(t))
                        .map((customTone, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-medium"
                          >
                            <span>{customTone}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTones(prev => prev.filter(t => t !== customTone));
                                markDirty("toneOfVoice");
                              }}
                              className="p-0.5 hover:bg-purple-200 rounded-full transition cursor-pointer"
                            >
                              <X className="w-3 h-3 text-purple-700" />
                            </button>
                          </span>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 max-w-xl">
                      <input
                        type="text"
                        placeholder="Novo tom de voz personalizado..."
                        value={newCustomTone}
                        onChange={(e) => setNewCustomTone(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newCustomTone.trim()) {
                            e.preventDefault();
                            if (!selectedTones.includes(newCustomTone.trim())) {
                              setSelectedTones(prev => [...prev, newCustomTone.trim()]);
                            }
                            setNewCustomTone("");
                            markDirty("toneOfVoice");
                          }
                        }}
                        className="flex-1 px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 text-zinc-900"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newCustomTone.trim()) {
                            if (!selectedTones.includes(newCustomTone.trim())) {
                              setSelectedTones(prev => [...prev, newCustomTone.trim()]);
                            }
                            setNewCustomTone("");
                            markDirty("toneOfVoice");
                          }
                        }}
                        className="px-3.5 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition"
                      >
                        <Plus className="w-3.5 h-3.5 inline mr-1" />
                        Adicionar
                      </button>
                    </div>
                  </div>

                  {/* Termos Obrigatórios e Proibidos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-100">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Termos Obrigatórios (Vocabulário da Marca)
                        </label>
                        <IdentityAiButton
                          clientId={activeClientId}
                          field="mandatoryTerms"
                          draft={{ mandatoryTerms }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition cursor-pointer"
                          onApply={(val) => {
                            const items = Array.isArray(val) ? val : [val];
                            setMandatoryTerms((prev) => Array.from(new Set([...prev, ...items])));
                            markDirty("mandatoryTerms");
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {mandatoryTerms.map((term, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium"
                          >
                            <span>{term}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setMandatoryTerms(prev => prev.filter((_, i) => i !== idx));
                                markDirty("mandatoryTerms");
                              }}
                              className="p-0.5 hover:bg-emerald-200 rounded-full"
                            >
                              <X className="w-3 h-3 text-emerald-700" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="+ termo obrigatório..."
                          value={newMandatory}
                          onChange={(e) => setNewMandatory(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newMandatory.trim()) {
                              e.preventDefault();
                              setMandatoryTerms(prev => [...prev, newMandatory.trim()]);
                              setNewMandatory("");
                              markDirty("mandatoryTerms");
                            }
                          }}
                          className="flex-1 px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newMandatory.trim()) {
                              setMandatoryTerms(prev => [...prev, newMandatory.trim()]);
                              setNewMandatory("");
                              markDirty("mandatoryTerms");
                            }
                          }}
                          className="px-3 py-1.5 bg-zinc-800 text-white rounded-lg text-xs font-semibold"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          Palavras Proibidas (Filtros de Exclusão)
                        </label>
                        <IdentityAiButton
                          clientId={activeClientId}
                          field="forbiddenWords"
                          draft={{ forbiddenWords }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50/70 hover:bg-rose-100/80 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition cursor-pointer"
                          onApply={(val) => {
                            const items = Array.isArray(val) ? val : [val];
                            setForbiddenWords((prev) => Array.from(new Set([...prev, ...items])));
                            markDirty("forbiddenWords");
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {forbiddenWords.map((word, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium"
                          >
                            <span>{word}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setForbiddenWords(prev => prev.filter((_, i) => i !== idx));
                                markDirty("forbiddenWords");
                              }}
                              className="p-0.5 hover:bg-rose-200 rounded-full"
                            >
                              <X className="w-3 h-3 text-rose-700" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="+ palavra proibida..."
                          value={newForbidden}
                          onChange={(e) => setNewForbidden(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newForbidden.trim()) {
                              e.preventDefault();
                              setForbiddenWords(prev => [...prev, newForbidden.trim()]);
                              setNewForbidden("");
                              markDirty("forbiddenWords");
                            }
                          }}
                          className="flex-1 px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newForbidden.trim()) {
                              setForbiddenWords(prev => [...prev, newForbidden.trim()]);
                              setNewForbidden("");
                              markDirty("forbiddenWords");
                            }
                          }}
                          className="px-3 py-1.5 bg-zinc-800 text-white rounded-lg text-xs font-semibold"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* ABA 3: DNA DA MARCA                                                       */}
            {/* ========================================================================= */}
            {activeTab === "BRAND_DNA" && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <div>
                      <h2 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        História, Arquétipos & Perfil de Comunicação
                      </h2>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Identidade profunda, narrativa fundacional e quem fala em nome da marca.
                      </p>
                    </div>
                  </div>

                  {/* Arquétipos Principal e Secundário */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-zinc-800">
                          Arquétipo de Marca Principal
                        </label>
                        <IdentityAiButton
                          clientId={activeClientId}
                          field="archetype"
                          draft={{ brandContext, marketNiche, valueProposition }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 px-2 py-0.5 text-[11px] font-semibold text-amber-700 transition cursor-pointer"
                          onApply={(val) => {
                            const item = Array.isArray(val) ? val[0] : val;
                            if (item) {
                              setArchetype(item);
                              markDirty("archetype");
                            }
                          }}
                        />
                      </div>
                      <select
                        value={normalizeArchetypeId(archetype)}
                        onChange={(e) => {
                          setArchetype(e.target.value);
                          markDirty("archetype");
                        }}
                        className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-zinc-900"
                      >
                        <option value="">Selecione o arquétipo principal...</option>
                        {ARCHETYPES.map((arc) => (
                          <option key={arc.id} value={arc.id}>
                            {arc.name} - {arc.desc}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-800 block mb-1">
                        Arquétipo Secundário (Complementar)
                      </label>
                      <select
                        value={normalizeArchetypeId(secondaryArchetype)}
                        onChange={(e) => {
                          setSecondaryArchetype(e.target.value);
                          markDirty("secondaryArchetype");
                        }}
                        className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-zinc-900"
                      >
                        <option value="">Selecione o arquétipo complementar...</option>
                        {ARCHETYPES.map((arc) => (
                          <option key={arc.id} value={arc.id}>
                            {arc.name} - {arc.desc}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* História e Contexto */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-zinc-100">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-zinc-700">
                          História e Trajetória da Empresa
                        </label>
                        <IdentityAiButton clientId={activeClientId} field="brandContext" draft={{ brandContext: brandHistory }} onApply={(val) => { setBrandHistory(Array.isArray(val) ? val.join("\n") : val); markDirty("brandHistory"); }} />
                      </div>
                      <textarea
                        rows={5}
                        placeholder="Como a empresa começou, fundadores, marcos históricos e evolução..."
                        value={brandHistory}
                        onChange={(e) => { setBrandHistory(e.target.value); markDirty("brandHistory"); }}
                        onBlur={handleBlur}
                        className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-y leading-relaxed text-zinc-900"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-zinc-700">
                          Contexto e DNA da Marca (Para os geradores de IA)
                        </label>
                        <IdentityAiButton clientId={activeClientId} field="brandContext" draft={{ brandContext }} onApply={(val) => { setBrandContext(Array.isArray(val) ? val.join("\n") : val); markDirty("brandContext"); }} />
                      </div>
                      <textarea
                        rows={5}
                        placeholder="Cultura, valores centrais, modelo de atendimento e diretrizes não-negociáveis..."
                        value={brandContext}
                        onChange={(e) => { setBrandContext(e.target.value); markDirty("brandContext"); }}
                        onBlur={handleBlur}
                        className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-y leading-relaxed text-zinc-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Perfil de Comunicação (Quem comunica e como aparece) */}
                <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4">
                  <CommunicationProfileFields
                    value={communicationProfile}
                    onChange={(val) => {
                      setCommunicationProfile(val);
                      markDirty("communicationProfile");
                    }}
                    onBlur={handleBlur}
                    detailsAction={
                      <div className="flex justify-end pt-1">
                        <IdentityAiButton
                          clientId={activeClientId}
                          field="communicationDetails"
                          draft={{ communicationProfile }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50/80 hover:bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition cursor-pointer"
                          onApply={(val) => {
                            const text = Array.isArray(val) ? val.join("\n") : val;
                            setCommunicationProfile((prev) => ({ ...prev, details: text }));
                            markDirty("communicationProfile");
                          }}
                        />
                      </div>
                    }
                  />
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* ABA 4: PRODUTOS E SERVIÇOS DO CLIENTE                                    */}
            {/* ========================================================================= */}
            {activeTab === "CATALOG" && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 pb-4">
                    <div>
                      <h2 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                        <Package className="w-4 h-4 text-emerald-600" />
                        Catálogo de Produtos e Serviços ({activeCompany.name})
                      </h2>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Cadastre o que <strong>este cliente vende ao seu próprio público</strong> (ex: ovos de codorna, móveis planejados).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenNewCatalogItem}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-950 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Novo Produto / Serviço
                    </button>
                  </div>

                  {catalogItems.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50 space-y-3">
                      <Package className="w-8 h-8 text-zinc-300 mx-auto" />
                      <p className="text-xs font-medium text-zinc-600">
                        Nenhum produto ou serviço cadastrado ainda no catálogo permanente deste cliente.
                      </p>
                      <p className="text-[11px] text-zinc-400 max-w-md mx-auto">
                        Ao cadastrar ofertas, o Brainstorm Inteligente permite selecionar a oferta principal ou combo e direcionar os ângulos estratégicos de copywriting.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenNewCatalogItem}
                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition"
                      >
                        Cadastrar primeiro item
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {catalogItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-indigo-300 transition shadow-2xs space-y-3 flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span
                                  className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                                    item.type === "PRODUCT"
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : "bg-blue-50 text-blue-800 border-blue-200"
                                  }`}
                                >
                                  {item.type === "PRODUCT" ? "Produto" : "Serviço"}
                                </span>
                                <h3 className="font-bold text-sm text-zinc-900 mt-1">
                                  {item.name}
                                </h3>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditCatalogItem(item)}
                                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
                                  title="Editar oferta"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCatalogItem(item.id, item.name)}
                                  className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                  title="Remover oferta"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {item.description && (
                              <p className="text-xs text-zinc-600 leading-relaxed line-clamp-3">
                                {item.description}
                              </p>
                            )}

                            {item.differentials && (
                              <div className="text-[11px] text-zinc-500 bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                                <span className="font-semibold text-zinc-700">Diferencial: </span>
                                {item.differentials}
                              </div>
                            )}
                          </div>

                          {/* Públicos Vinculados */}
                          <div className="pt-2 border-t border-zinc-100">
                            <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                              Públicos Vinculados:
                            </span>
                            {item.linked_audiences && item.linked_audiences.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.linked_audiences.map((aud) => (
                                  <span
                                    key={aud.id}
                                    className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-semibold"
                                  >
                                    {aud.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-zinc-400 italic">
                                Todos os públicos ou institucional
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* ABA 5: PÚBLICO-ALVO                                                       */}
            {/* ========================================================================= */}
            {activeTab === "AUDIENCES" && (
              <div className="space-y-6">
                {/* Categorias canônicas de 'Com quem a marca fala' */}
                <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        Com Quem a Marca Fala (Categorias Gerais)
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Categorias amplas de audiência que recebem as comunicações institucionais da marca.
                      </p>
                    </div>
                    <IdentityAiButton
                      clientId={activeClientId}
                      field="targetAudiences"
                      draft={{ targetAudiences }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50/70 hover:bg-purple-100/80 px-3 py-1.5 text-[11px] font-semibold text-purple-700 transition cursor-pointer"
                      onApply={(val) => {
                        const items = Array.isArray(val) ? val : [val];
                        setTargetAudiences((prev) => Array.from(new Set([...prev, ...items])));
                        markDirty("targetAudiences");
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {TARGET_AUDIENCE_OPTIONS.map((audOption) => {
                      const isSelected = targetAudiences.includes(audOption);
                      return (
                        <button
                          key={audOption}
                          type="button"
                          onClick={() => {
                            setTargetAudiences(prev =>
                              isSelected ? prev.filter(a => a !== audOption) : [...prev, audOption]
                            );
                            markDirty("targetAudiences");
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                            isSelected
                              ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                              : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                          {audOption}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cadastro Detalhado de Personas / Públicos com vínculo a Catálogo */}
                <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4">
                  <div className="border-b border-zinc-100 pb-3">
                    <h3 className="text-sm font-bold text-zinc-950">
                      Personas & Públicos Específicos do Cliente
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Personas completas com demografia, dores, desejos, objeções, comportamento digital e vínculo com ofertas do catálogo.
                    </p>
                  </div>

                  <ClientAudiencesManager
                    clientId={activeClientId}
                    clientName={activeCompany.name}
                  />
                </div>

                {/* Dores e Objeções comuns a vários públicos */}
                <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4">
                  <div className="border-b border-zinc-100 pb-3">
                    <h3 className="text-sm font-bold text-zinc-950">
                      Dores e Objeções Comuns a Vários Públicos (Globais)
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Dificuldades e barreiras de compra que aparecem repetidamente na rotina de vendas.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-800 block">
                          Dores Globais do Mercado
                        </label>
                        <IdentityAiButton
                          clientId={activeClientId}
                          field="painPoints"
                          draft={{ painPoints }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50/80 hover:bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition cursor-pointer"
                          onApply={(val) => {
                            const items = Array.isArray(val) ? val : [val];
                            setPainPoints((prev) => Array.from(new Set([...prev, ...items])));
                            markDirty("painPoints");
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {painPoints.map((pain, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-medium"
                          >
                            <span>{pain}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setPainPoints(prev => prev.filter((_, i) => i !== idx));
                                markDirty("painPoints");
                              }}
                              className="p-0.5 hover:bg-zinc-200 rounded-full cursor-pointer"
                            >
                              <X className="w-3 h-3 text-zinc-500" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="+ dor ou problema frequente..."
                          value={newPain}
                          onChange={(e) => setNewPain(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newPain.trim()) {
                              e.preventDefault();
                              setPainPoints(prev => [...prev, newPain.trim()]);
                              setNewPain("");
                              markDirty("painPoints");
                            }
                          }}
                          className="flex-1 px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newPain.trim()) {
                              setPainPoints(prev => [...prev, newPain.trim()]);
                              setNewPain("");
                              markDirty("painPoints");
                            }
                          }}
                          className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-semibold"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-800 block">
                          Objeções de Venda Mais Frequentes
                        </label>
                        <IdentityAiButton
                          clientId={activeClientId}
                          field="salesObjections"
                          draft={{ salesObjections }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50/80 hover:bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition cursor-pointer"
                          onApply={(val) => {
                            setSalesObjections(Array.isArray(val) ? val.join("\n") : val);
                            markDirty("salesObjections");
                          }}
                        />
                      </div>
                      <textarea
                        rows={4}
                        placeholder="Ex: 'Achei caro', 'Não tenho tempo agora', 'Já tentei outra empresa e não funcionou'..."
                        value={salesObjections}
                        onChange={(e) => {
                          setSalesObjections(e.target.value);
                          markDirty("salesObjections");
                        }}
                        onBlur={handleBlur}
                        className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-y leading-relaxed text-zinc-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* ABA 6: CANAIS E CONVERSÃO                                                 */}
            {/* ========================================================================= */}
            {activeTab === "CHANNELS" && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-5">
                  <div className="border-b border-zinc-100 pb-3">
                    <h2 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-600" />
                      Canais Oficiais, Links de Conversão & CTAs
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Links de destino e chamadas para ação utilizadas nos conteúdos de redes sociais e anúncios.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Instagram */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-700 block mb-1 flex items-center gap-1.5">
                        <Instagram className="w-3.5 h-3.5 text-pink-600" />
                        Instagram da Marca
                      </label>
                      <input
                        type="text"
                        placeholder="@usuario ou link do perfil"
                        value={instagramHandle}
                        onChange={(e) => {
                          setInstagramHandle(e.target.value);
                          markDirty("instagramHandle");
                        }}
                        onBlur={handleBlur}
                        className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-zinc-900"
                      />
                      {suggestedInstagram && !instagramHandle && (
                        <button
                          type="button"
                          onClick={() => {
                            setInstagramHandle(suggestedInstagram);
                            markDirty("instagramHandle");
                          }}
                          className="mt-1 text-[11px] text-indigo-600 hover:underline block"
                        >
                          Importar do briefing: {suggestedInstagram}
                        </button>
                      )}
                    </div>

                    {/* Site */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-700 block mb-1 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-blue-600" />
                        Site ou Landing Page
                      </label>
                      <input
                        type="text"
                        placeholder="https://exemplo.com.br"
                        value={websiteUrl}
                        onChange={(e) => {
                          setWebsiteUrl(e.target.value);
                          markDirty("websiteUrl");
                        }}
                        onBlur={handleBlur}
                        className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-zinc-900"
                      />
                      {suggestedWebsite && !websiteUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setWebsiteUrl(suggestedWebsite);
                            markDirty("websiteUrl");
                          }}
                          className="mt-1 text-[11px] text-indigo-600 hover:underline block"
                        >
                          Importar do briefing: {suggestedWebsite}
                        </button>
                      )}
                    </div>

                    {/* WhatsApp */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                          <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                          WhatsApp de Atendimento
                        </label>
                        <IdentityAiButton
                          clientId={activeClientId}
                          field="defaultCtas"
                          draft={{ defaultCtas }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 transition cursor-pointer"
                          onApply={(val) => {
                            const item = Array.isArray(val) ? val[0] : val;
                            if (item) setWhatsappCta(item);
                            markDirty("whatsappCta");
                          }}
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Ex: (11) 99999-9999 ou link wa.me"
                        value={whatsappCta}
                        onChange={(e) => {
                          setWhatsappCta(e.target.value);
                          markDirty("whatsappCta");
                        }}
                        onBlur={handleBlur}
                        className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-zinc-900"
                      />
                    </div>
                  </div>

                  {/* Chamadas para Ação Sugeridas */}
                  <div className="pt-4 border-t border-zinc-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-800 block">
                        Chamadas para Ação Sugeridas (CTAs Padrão)
                      </label>
                      <IdentityAiButton
                        clientId={activeClientId}
                        field="defaultCtas"
                        draft={{ defaultCtas }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 px-2.5 py-1 text-[11px] font-semibold text-blue-700 transition cursor-pointer"
                        onApply={(val) => {
                          const items = Array.isArray(val) ? val : [val];
                          setDefaultCtas((prev) => Array.from(new Set([...prev, ...items])));
                          markDirty("defaultCtas");
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {defaultCtas.map((cta, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium"
                        >
                          <span>{cta}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setDefaultCtas(prev => prev.filter((_, i) => i !== idx));
                              markDirty("defaultCtas");
                            }}
                            className="p-0.5 hover:bg-blue-200 rounded-full"
                          >
                            <X className="w-3 h-3 text-blue-700" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 max-w-xl">
                      <input
                        type="text"
                        placeholder="Ex: 'Toque no link da bio para agendar sua consulta'..."
                        value={newCta}
                        onChange={(e) => setNewCta(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newCta.trim()) {
                            e.preventDefault();
                            setDefaultCtas(prev => [...prev, newCta.trim()]);
                            setNewCta("");
                            markDirty("defaultCtas");
                          }
                        }}
                        className="flex-1 px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-zinc-900"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newCta.trim()) {
                            setDefaultCtas(prev => [...prev, newCta.trim()]);
                            setNewCta("");
                            markDirty("defaultCtas");
                          }
                        }}
                        className="px-3.5 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>

                  {/* Notas e Contexto Estratégico da Equipe */}
                  <div className="pt-4 border-t border-zinc-100">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-zinc-800 block">
                        Observações e Notas Estratégicas Internas da Equipe
                      </label>
                      <IdentityAiButton
                        clientId={activeClientId}
                        field="notes"
                        draft={{ notes }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50/80 hover:bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition cursor-pointer"
                        onApply={(val) => {
                          setNotes(Array.isArray(val) ? val.join("\n") : val);
                          markDirty("notes");
                        }}
                      />
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Orientações de atendimento, particularidades do cliente ou combinados operacionais..."
                      value={notes}
                      onChange={(e) => {
                        setNotes(e.target.value);
                        markDirty("notes");
                      }}
                      onBlur={handleBlur}
                      className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-y leading-relaxed text-zinc-900"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal de Criação / Edição de Produto ou Serviço */}
      {catalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-base text-zinc-950">
                {editingCatalogItem ? "Editar Oferta do Catálogo" : "Nova Oferta do Catálogo"}
              </h3>
              <button
                type="button"
                onClick={() => setCatalogModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCatalogModal} className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-xs font-semibold text-zinc-700">Tipo da Oferta:</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCatalogType("SERVICE")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                      catalogType === "SERVICE"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-zinc-50 text-zinc-600 border-zinc-200"
                    }`}
                  >
                    Serviço
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogType("PRODUCT")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                      catalogType === "PRODUCT"
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-zinc-50 text-zinc-600 border-zinc-200"
                    }`}
                  >
                    Produto
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  Nome da Oferta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ovos de Codorna em Conserva, Móveis Planejados de Cozinha..."
                  value={catalogName}
                  onChange={(e) => setCatalogName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-zinc-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-700">
                    Descrição Completa
                  </label>
                  <IdentityAiButton
                    clientId={activeClientId}
                    field="valueProposition"
                    draft={{ valueProposition: catalogDescription, marketNiche: catalogName }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50/80 hover:bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 transition cursor-pointer"
                    onApply={(val) => {
                      setCatalogDescription(Array.isArray(val) ? val.join("\n") : val);
                    }}
                  />
                </div>
                <textarea
                  rows={3}
                  placeholder="Explique o que é, como funciona e o que está incluído..."
                  value={catalogDescription}
                  onChange={(e) => setCatalogDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-zinc-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-700">
                    Diferencial Específico Desta Oferta
                  </label>
                  <IdentityAiButton
                    clientId={activeClientId}
                    field="differentials"
                    draft={{ differentials: catalogDiffs ? [catalogDiffs] : [] }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50/80 hover:bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 transition cursor-pointer"
                    onApply={(val) => {
                      const item = Array.isArray(val) ? val[0] : val;
                      if (item) setCatalogDiffs(item);
                    }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Ex: Sem conservantes artificiais, acabamento em laca com 5 anos de garantia..."
                  value={catalogDiffs}
                  onChange={(e) => setCatalogDiffs(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-zinc-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">
                    Dor do Cliente que Resolve
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Cozinha desorganizada e sem espaço..."
                    value={catalogPains}
                    onChange={(e) => setCatalogPains(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-zinc-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">
                    Modo de Solução / Abordagem
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Gavetões com amortecedor e divisão inteligente..."
                    value={catalogSolution}
                    onChange={(e) => setCatalogSolution(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-zinc-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setCatalogModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
                >
                  Salvar Oferta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
