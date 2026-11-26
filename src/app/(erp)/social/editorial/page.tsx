"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCompany } from "@/lib/context/company-context";
import { contentCompanyId, INTERNAL_COMPANY_ID } from "@/modules/clients/internal-company";
import { normalizeFrequencyLevel, type FrequencyLevel } from "@/modules/clients/content-settings";
import { EditorialPlanner } from "@/components/content-studio/editorial-planner";
import { SocialWorkflowStepper } from "@/components/content-studio/social-workflow-stepper";
import { IdentityAiButton } from "@/components/clients/identity-ai-button";
import { toast } from "@/components/ui/toast-provider";
import {
  Sparkles,
  Layers,
  Plus,
  RefreshCw,
  Archive,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Lightbulb,
} from "lucide-react";

interface Pillar {
  id: string;
  name: string;
  archived_at: string | null;
}

interface ThemeLine {
  id: string;
  pillar_id?: string | null;
  pillar_name: string;
  theme: string;
  objective: string;
  preferred_formats: string[];
  frequency_per_month: FrequencyLevel | string | number;
  notes: string;
  custom_fields?: { label: string; value: string }[];
  is_active: boolean;
  archived_at: string | null;
}

const ALL_FORMAT_OPTIONS = [
  "Reels",
  "Carrossel",
  "Post estático",
  "Story",
  "Vídeo longo",
  "Artigo / Blog",
  "Depoimento",
];

export default function EditorialPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" />
          Carregando Linha Editorial...
        </div>
      }
    >
      <EditorialContent />
    </Suspense>
  );
}

function EditorialContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedCompany, availableCompanies, selectCompany } = useCompany();

  const queryClientId = searchParams.get("clientId");
  const activeClientId = queryClientId || contentCompanyId(selectedCompany);
  const activeCompany =
    availableCompanies.find((c) => c.id === activeClientId) || selectedCompany;

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [aiPlannerOpen, setAiPlannerOpen] = useState(false);

  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [lines, setLines] = useState<ThemeLine[]>([]);
  const [generalNotes, setGeneralNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Modais de Criação / Edição
  const [pillarModalOpen, setPillarModalOpen] = useState(false);
  const [editingPillar, setEditingPillar] = useState<Pillar | null>(null);
  const [pillarNameInput, setPillarNameInput] = useState("");

  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<ThemeLine | null>(null);
  const [themePillarId, setThemePillarId] = useState("");
  const [themeNameInput, setThemeNameInput] = useState("");
  const [themeObjectiveInput, setThemeObjectiveInput] = useState("");
  const [themeNotesInput, setThemeNotesInput] = useState("");
  const [themeFormats, setThemeFormats] = useState<string[]>(["Reels", "Carrossel"]);
  const [themeFrequency, setThemeFrequency] = useState<FrequencyLevel>("Média");

  const loadData = useCallback(async (clientId: string) => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const [confRes, identRes] = await Promise.all([
        fetch(`/api/content-studio/configuration?clientId=${encodeURIComponent(clientId)}`, { cache: "no-store" }),
        fetch(`/api/clients/${clientId}/identity`, { cache: "no-store" }),
      ]);

      if (confRes.ok) {
        const confData = await confRes.json();
        setPillars(confData.pillars || []);
        setLines(confData.lines || []);
      }

      if (identRes.ok) {
        const idData = await identRes.json();
        setGeneralNotes(idData.notes || "");
      }
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os pilares e temas deste cliente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(activeClientId);
  }, [activeClientId, loadData]);

  // Salvar Pilar
  const handleSavePillar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pillarNameInput.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/content-studio/configuration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PILLAR_SAVE",
          clientId: activeClientId,
          id: editingPillar?.id,
          name: pillarNameInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Erro ao salvar pilar.");
      setPillarModalOpen(false);
      setFeedback("Pilar salvo com sucesso.");
      setTimeout(() => setFeedback(null), 3000);
      await loadData(activeClientId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar pilar.");
    } finally {
      setBusy(false);
    }
  };

  // Arquivar / Restaurar Pilar
  const handleTogglePillarArchive = async (pillar: Pillar) => {
    setBusy(true);
    try {
      const res = await fetch("/api/content-studio/configuration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PILLAR_VISIBILITY",
          clientId: activeClientId,
          id: pillar.id,
          archived: !pillar.archived_at,
        }),
      });
      if (!res.ok) throw new Error("Erro ao alterar visibilidade do pilar.");
      await loadData(activeClientId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro.");
    } finally {
      setBusy(false);
    }
  };

  // Salvar Tema
  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!themeNameInput.trim() || !themePillarId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/content-studio/configuration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "THEME_SAVE",
          clientId: activeClientId,
          id: editingTheme?.id,
          pillarId: themePillarId,
          theme: themeNameInput.trim(),
          objective: themeObjectiveInput.trim(),
          preferredFormats: themeFormats,
          frequencyPerMonth: themeFrequency,
          notes: themeNotesInput.trim(),
          customFields: editingTheme?.custom_fields || [],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Erro ao salvar tema.");
      setThemeModalOpen(false);
      setFeedback("Tema editorial salvo com sucesso.");
      setTimeout(() => setFeedback(null), 3000);
      await loadData(activeClientId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar tema.");
    } finally {
      setBusy(false);
    }
  };

  // Arquivar / Restaurar Tema
  const handleToggleThemeArchive = async (theme: ThemeLine) => {
    setBusy(true);
    try {
      const isArchived = !theme.is_active || Boolean(theme.archived_at);
      const res = await fetch("/api/content-studio/configuration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "THEME_VISIBILITY",
          clientId: activeClientId,
          id: theme.id,
          archived: !isArchived,
        }),
      });
      if (!res.ok) throw new Error("Erro ao alterar visibilidade do tema.");
      await loadData(activeClientId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro.");
    } finally {
      setBusy(false);
    }
  };

  // Salvar Notas Gerais da Linha Editorial
  const handleSaveGeneralNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/clients/${activeClientId}/identity`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: generalNotes }),
      });
      if (!res.ok) throw new Error("Erro ao salvar observações editoriais.");
      setFeedback("Observações editoriais salvas.");
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro.");
    } finally {
      setSavingNotes(false);
    }
  };

  const activePillars = pillars.filter((p) => showArchived || !p.archived_at);

  // Mapear temas por pilar (inclusive os que possuem apenas pillar_name sem pillar_id para não perder nada!)
  const getThemesForPillar = (pillar: Pillar) => {
    return lines.filter((l) => {
      const matchesPillar =
        l.pillar_id === pillar.id ||
        (!l.pillar_id && l.pillar_name.trim().toLowerCase() === pillar.name.trim().toLowerCase());
      const isActive = showArchived || (l.is_active && !l.archived_at);
      return matchesPillar && isActive;
    });
  };

  // Temas órfãos que não batem com nenhum pilar cadastrado
  const orphanThemes = lines.filter((l) => {
    const hasPillar = pillars.some(
      (p) =>
        p.id === l.pillar_id ||
        p.name.trim().toLowerCase() === l.pillar_name.trim().toLowerCase()
    );
    const isActive = showArchived || (l.is_active && !l.archived_at);
    return !hasPillar && isActive;
  });

  return (
    <div className="min-h-screen bg-zinc-50/60 pb-20">
      {/* Header Sticky */}
      <header className="sticky top-0 z-30 bg-white/95 border-b border-zinc-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white flex items-center justify-center shadow-2xs">
              <Layers className="w-5 h-5 text-zinc-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-zinc-950">Linha Editorial</h1>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                  {activeCompany.name}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Tela única: gerencie pilares de conteúdo e seus temas desdobrados para {activeCompany.name}.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setAiPlannerOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-800 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
              Planejar com IA
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingPillar(null);
                setPillarNameInput("");
                setPillarModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-950 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Pilar
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        <SocialWorkflowStepper activeStep="editorial" />
        {feedback && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Bloco de Assistente de IA */}
        {aiPlannerOpen && (
          <div className="p-6 rounded-2xl bg-white border border-emerald-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
              <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Assistente de Planejamento Editorial com IA
              </h3>
              <button
                type="button"
                onClick={() => setAiPlannerOpen(false)}
                className="text-xs text-zinc-400 hover:text-zinc-700"
              >
                Fechar
              </button>
            </div>
            <EditorialPlanner
              clientId={activeClientId}
              companyName={activeCompany.name}
              lines={lines.map((l) => ({
                id: l.id,
                pillar_name: l.pillar_name,
                theme: l.theme,
                objective: l.objective || "",
                preferred_formats: l.preferred_formats || [],
                frequency_per_month: l.frequency_per_month || "Média",
                notes: l.notes || "",
              }))}
              onSaved={() => void loadData(activeClientId)}
              onUse={(idea) => router.push(`/prompt-creator?prompt=${encodeURIComponent(idea)}`)}
              onManual={() => {
                if (activePillars.length > 0) {
                  setEditingTheme(null);
                  setThemePillarId(activePillars[0].id);
                  setThemeNameInput("");
                  setThemeObjectiveInput("");
                  setThemeNotesInput("");
                  setThemeFormats(["Reels", "Carrossel"]);
                  setThemeFrequency("Média");
                  setThemeModalOpen(true);
                } else {
                  toast.warning("Cadastre ao menos um pilar antes de adicionar temas.");
                }
              }}
            />
          </div>
        )}

        {/* Barra de Filtro de Arquivados */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded text-zinc-900 focus:ring-zinc-400"
            />
            Mostrar pilares e temas arquivados
          </label>

          <span className="text-xs text-zinc-400">
            {activePillars.length} pilares · {lines.length} temas cadastrados
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-xs text-zinc-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
            <span>Carregando linha editorial de {activeCompany.name}...</span>
          </div>
        ) : activePillars.length === 0 ? (
          <div className="p-16 text-center border border-dashed border-zinc-200 rounded-2xl bg-white space-y-3">
            <Layers className="w-8 h-8 text-zinc-300 mx-auto" />
            <h3 className="font-bold text-sm text-zinc-900">Nenhum pilar editorial cadastrado</h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Pilares organizam os grandes temas de conteúdo da marca (ex: Planejamento, Antes e Depois, Soluções Rápidas).
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditingPillar(null);
                  setPillarNameInput("");
                  setPillarModalOpen(true);
                }}
                className="px-4 py-2 bg-zinc-950 text-white text-xs font-semibold rounded-xl hover:bg-zinc-800 transition"
              >
                Criar primeiro pilar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Lista de Pilares e seus Temas Agrupados */}
            {activePillars.map((pillar) => {
              const pillarThemes = getThemesForPillar(pillar);

              return (
                <article
                  key={pillar.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4"
                >
                  <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 shrink-0" />
                      <h2 className="text-base font-bold text-zinc-950">
                        {pillar.name}
                        {pillar.archived_at && (
                          <span className="ml-2 text-xs font-medium text-zinc-400">
                            (Arquivado)
                          </span>
                        )}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-semibold border border-zinc-200">
                        {pillarThemes.length} {pillarThemes.length === 1 ? "tema" : "temas"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTheme(null);
                          setThemePillarId(pillar.id);
                          setThemeNameInput("");
                          setThemeObjectiveInput("");
                          setThemeNotesInput("");
                          setThemeFormats(["Reels", "Carrossel"]);
                          setThemeFrequency("Média");
                          setThemeModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-800 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-semibold transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Tema
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingPillar(pillar);
                          setPillarNameInput(pillar.name);
                          setPillarModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
                        title="Editar nome do pilar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePillarArchive(pillar)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-700 hover:bg-amber-50 transition"
                        title={pillar.archived_at ? "Restaurar pilar" : "Arquivar pilar"}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </header>

                  {/* Temas deste Pilar */}
                  {pillarThemes.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                      <p className="text-xs text-zinc-500">
                        Nenhum tema cadastrado neste pilar ainda.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTheme(null);
                          setThemePillarId(pillar.id);
                          setThemeNameInput("");
                          setThemeObjectiveInput("");
                          setThemeNotesInput("");
                          setThemeFormats(["Reels", "Carrossel"]);
                          setThemeFrequency("Média");
                          setThemeModalOpen(true);
                        }}
                        className="mt-2 text-xs font-semibold text-zinc-800 hover:underline"
                      >
                        + Adicionar primeiro tema
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {pillarThemes.map((theme) => {
                        const freq = normalizeFrequencyLevel(theme.frequency_per_month);
                        const isArchived = !theme.is_active || Boolean(theme.archived_at);

                        return (
                          <div
                            key={theme.id}
                            className={`p-4 rounded-xl border transition shadow-2xs space-y-2.5 flex flex-col justify-between ${
                              isArchived
                                ? "bg-zinc-100/60 border-zinc-200 opacity-60"
                                : "bg-zinc-50/70 border-zinc-200 hover:border-zinc-400"
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-bold text-xs text-zinc-900 leading-snug">
                                  {theme.theme}
                                </h3>
                                <span
                                  className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    freq === "Alta"
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : freq === "Média"
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : "bg-blue-50 text-blue-700 border-blue-200"
                                  }`}
                                >
                                  {freq}
                                </span>
                              </div>

                              {theme.objective && (
                                <p className="text-xs text-zinc-600 leading-relaxed line-clamp-3">
                                  {theme.objective}
                                </p>
                              )}

                              {theme.notes && (
                                <p className="text-[11px] text-zinc-400 italic">
                                  Obs: {theme.notes}
                                </p>
                              )}
                            </div>

                            <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between text-[11px]">
                              {/* Formatos preferidos */}
                              <div className="flex flex-wrap gap-1">
                                {(theme.preferred_formats || []).slice(0, 2).map((fmt) => (
                                  <span
                                    key={fmt}
                                    className="px-1.5 py-0.5 rounded bg-white text-zinc-600 border border-zinc-200 text-[10px]"
                                  >
                                    {fmt}
                                  </span>
                                ))}
                                {(theme.preferred_formats || []).length > 2 && (
                                  <span className="text-[10px] text-zinc-400">
                                    +{(theme.preferred_formats || []).length - 2}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <Link
                                  href={`/prompt-creator?pillarId=${encodeURIComponent(pillar.id)}&themeId=${encodeURIComponent(theme.id)}`}
                                  className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-semibold transition inline-flex items-center gap-1"
                                  title="Ir para o Estúdio Criativo com este tema selecionado"
                                >
                                  Criar Post →
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTheme(theme);
                                    setThemePillarId(theme.pillar_id || pillar.id);
                                    setThemeNameInput(theme.theme);
                                    setThemeObjectiveInput(theme.objective || "");
                                    setThemeNotesInput(theme.notes || "");
                                    setThemeFormats(theme.preferred_formats || []);
                                    setThemeFrequency(freq);
                                    setThemeModalOpen(true);
                                  }}
                                  className="p-1 text-zinc-400 hover:text-zinc-700 transition"
                                  title="Editar tema"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleThemeArchive(theme)}
                                  className="p-1 text-zinc-400 hover:text-amber-700 transition"
                                  title={isArchived ? "Restaurar tema" : "Arquivar tema"}
                                >
                                  <Archive className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}

            {/* Temas Órfãos (sem correspondência com pilares existentes) */}
            {orphanThemes.length > 0 && (
              <article className="rounded-2xl border border-amber-300 bg-amber-50/50 p-6 shadow-2xs space-y-4">
                <header className="flex items-center justify-between border-b border-amber-200 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Temas Antigos Aguardando Associação de Pilar
                    </h2>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Estes temas históricos foram preservados integralmente. Edite-os para associar a um dos pilares acima.
                    </p>
                  </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {orphanThemes.map((theme) => (
                    <div
                      key={theme.id}
                      className="p-4 rounded-xl border border-amber-200 bg-white shadow-2xs space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold uppercase text-amber-700 block mb-1">
                          Pilar original: {theme.pillar_name}
                        </span>
                        <h3 className="font-bold text-xs text-zinc-900">{theme.theme}</h3>
                        {theme.objective && (
                          <p className="text-xs text-zinc-600 mt-1">{theme.objective}</p>
                        )}
                      </div>
                      <div className="pt-2 border-t border-zinc-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTheme(theme);
                            setThemePillarId(activePillars[0]?.id || "");
                            setThemeNameInput(theme.theme);
                            setThemeObjectiveInput(theme.objective || "");
                            setThemeNotesInput(theme.notes || "");
                            setThemeFormats(theme.preferred_formats || []);
                            setThemeFrequency(normalizeFrequencyLevel(theme.frequency_per_month));
                            setThemeModalOpen(true);
                          }}
                          className="px-3 py-1 bg-amber-700 text-white rounded-lg text-xs font-semibold hover:bg-amber-800 transition"
                        >
                          Associar a Pilar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {/* Observações Editoriais Gerais */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-500" />
                    Observações Editoriais Gerais & Combinados da Linha
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Regras práticas do dia a dia (cadência, captação, restrições visuais e CTA padrão) para redatores e designers.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <IdentityAiButton
                    clientId={activeClientId}
                    field="notes"
                    draft={{ notes: generalNotes }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition cursor-pointer"
                    onApply={(val) => {
                      setGeneralNotes(Array.isArray(val) ? val.join("\n") : val);
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveGeneralNotes}
                    disabled={savingNotes}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
                  >
                    {savingNotes ? "Salvando..." : "Salvar Observações"}
                  </button>
                </div>
              </div>

              <textarea
                rows={4}
                placeholder={"Ex:\n• Cadência: 3 posts/semana (Terça, Quinta e Sábado) + Stories diários\n• Captação: Gravações em bloco 1x/mês com uniforme e microfone\n• Restrições: Não expor pacientes/alunos sem termo de imagem\n• CTA padrão: Agendar avaliação via WhatsApp / link da bio"}
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                className="w-full px-3.5 py-3 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 resize-y leading-relaxed min-h-[110px]"
              />
            </section>
          </div>
        )}
      </main>

      {/* Modal Pilar */}
      {pillarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/45">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-base text-zinc-950">
                {editingPillar ? "Editar Pilar Editorial" : "Novo Pilar Editorial"}
              </h3>
              <button
                type="button"
                onClick={() => setPillarModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePillar} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  Nome do Pilar *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Planejamento de Ambientes, Soluções Rápidas..."
                  value={pillarNameInput}
                  onChange={(e) => setPillarNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 text-zinc-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setPillarModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition disabled:opacity-50"
                >
                  Salvar Pilar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tema */}
      {themeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/45">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-base text-zinc-950">
                {editingTheme ? "Editar Tema Editorial" : "Novo Tema Editorial"}
              </h3>
              <button
                type="button"
                onClick={() => setThemeModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTheme} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  Pilar de Conteúdo *
                </label>
                <select
                  required
                  value={themePillarId}
                  onChange={(e) => setThemePillarId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 text-zinc-900"
                >
                  <option value="">Selecione o pilar...</option>
                  {activePillars.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  Nome do Tema *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Como aproveitar uma cozinha pequena..."
                  value={themeNameInput}
                  onChange={(e) => setThemeNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 text-zinc-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  Objetivo Estratégico do Tema
                </label>
                <textarea
                  rows={4}
                  placeholder="Ex: Demonstrar soluções de marcenaria para otimização de espaços e gerar orçamentos..."
                  value={themeObjectiveInput}
                  onChange={(e) => setThemeObjectiveInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 text-zinc-900 resize-y min-h-[120px]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  Formatos Preferidos
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_FORMAT_OPTIONS.map((fmt) => {
                    const isSel = themeFormats.includes(fmt);
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => {
                          setThemeFormats((prev) =>
                            isSel ? prev.filter((f) => f !== fmt) : [...prev, fmt]
                          );
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          isSel
                            ? "bg-zinc-900 text-white border-zinc-400"
                            : "bg-zinc-50 text-zinc-600 border-zinc-200"
                        }`}
                      >
                        {fmt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">
                    Frequência Mensal
                  </label>
                  <select
                    value={themeFrequency}
                    onChange={(e) => setThemeFrequency(e.target.value as FrequencyLevel)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 text-zinc-900"
                  >
                    <option value="Alta">Alta (semanal / recorrente)</option>
                    <option value="Média">Média (quinzenal)</option>
                    <option value="Baixa">Baixa (mensal / pontual)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">
                    Notas / Observações
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Focar em vídeos verticais..."
                    value={themeNotesInput}
                    onChange={(e) => setThemeNotesInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 text-zinc-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setThemeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition disabled:opacity-50"
                >
                  Salvar Tema
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
