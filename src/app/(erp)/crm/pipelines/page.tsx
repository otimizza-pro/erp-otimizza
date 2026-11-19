"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

import {
  Layers,
  Plus,
  ArrowRight,
  CheckCircle2,
  Settings,
  Archive,
  AlertCircle,
  TrendingUp,
  Edit2,
  Trash2,
  X,
  MoveUp,
  MoveDown,
  Sparkles,
} from "lucide-react";
import { PipelineRecord, PipelineStageRecord, StageType } from "@/modules/crm/types";
import { formatBRL } from "@/components/analytics/report-charts";

interface StageDraft {
  id?: string;
  name: string;
  color: string;
  winProbability: number;
  stageType: StageType;
}

const DEFAULT_STAGES_DRAFT: StageDraft[] = [
  { name: "Qualificação", color: "#3b82f6", winProbability: 20, stageType: "NORMAL" },
  { name: "Proposta", color: "#f59e0b", winProbability: 60, stageType: "NORMAL" },
  { name: "Negociação", color: "#06b6d4", winProbability: 80, stageType: "NORMAL" },
  { name: "Fechado Ganho", color: "#10b981", winProbability: 100, stageType: "WON" },
  { name: "Perdido", color: "#ef4444", winProbability: 0, stageType: "LOST" },
];

const PROSPECTION_STAGES_DRAFT: StageDraft[] = [
  { name: "1. Empresa identificada", color: "#3b82f6", winProbability: 10, stageType: "NORMAL" },
  { name: "2. Contato iniciado", color: "#f59e0b", winProbability: 20, stageType: "NORMAL" },
  { name: "3. Contato estabelecido", color: "#eab308", winProbability: 30, stageType: "NORMAL" },
  { name: "4. Interesse identificado", color: "#8b5cf6", winProbability: 50, stageType: "NORMAL" },
  { name: "5. Reunião ou diagnóstico agendado", color: "#10b981", winProbability: 70, stageType: "NORMAL" },
];

const COMMERCIAL_STAGES_DRAFT: StageDraft[] = [
  { name: "1. Oportunidade qualificada", color: "#3b82f6", winProbability: 20, stageType: "NORMAL" },
  { name: "2. Diagnóstico & Briefing", color: "#f59e0b", winProbability: 40, stageType: "NORMAL" },
  { name: "3. Proposta apresentada", color: "#ea580c", winProbability: 60, stageType: "NORMAL" },
  { name: "4. Negociação final", color: "#8b5cf6", winProbability: 80, stageType: "NORMAL" },
  { name: "5. Ganho (Contrato Fechado)", color: "#10b981", winProbability: 100, stageType: "WON" },
  { name: "6. Perdido", color: "#ef4444", winProbability: 0, stageType: "LOST" },
];

const STAGE_COLORS = ["#3b82f6", "#f59e0b", "#06b6d4", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#6366f1", "#14b8a6", "#64748b"];

export default function PipelinesManagementPage() {
  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de Criação
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPipeline, setNewPipeline] = useState({
    name: "",
    description: "",
    isDefault: false,
    stages: [...DEFAULT_STAGES_DRAFT],
  });
  const [creating, setCreating] = useState(false);

  // Modal de Edição de Funil & Etapas
  const [editingPipeline, setEditingPipeline] = useState<PipelineRecord | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    description: string;
    isDefault: boolean;
    stages: StageDraft[];
  }>({ name: "", description: "", isDefault: false, stages: [] });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function loadPipelines() {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/pipelines?includeArchived=true");
      if (res.ok) {
        setPipelines(await res.json());
        window.dispatchEvent(new Event("crm-pipelines-changed"));
      }
    } catch (e) {
      console.error("Erro ao carregar funis:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPipelines();
  }, []);

  const handleOpenCreate = () => {
    setNewPipeline({
      name: "",
      description: "",
      isDefault: false,
      stages: [
        { name: "Qualificação", color: "#3b82f6", winProbability: 20, stageType: "NORMAL" },
        { name: "Proposta", color: "#f59e0b", winProbability: 60, stageType: "NORMAL" },
        { name: "Negociação", color: "#06b6d4", winProbability: 80, stageType: "NORMAL" },
        { name: "Fechado Ganho", color: "#10b981", winProbability: 100, stageType: "WON" },
        { name: "Perdido", color: "#ef4444", winProbability: 0, stageType: "LOST" },
      ],
    });
    setShowCreateModal(true);
  };

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPipeline.name.trim()) return;
    if (newPipeline.stages.length === 0) {
      alert("Adicione pelo menos 1 etapa ao funil.");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        name: newPipeline.name.trim(),
        description: newPipeline.description.trim() || null,
        isDefault: newPipeline.isDefault,
        stages: newPipeline.stages.map((st, idx) => ({
          name: st.name.trim() || `Etapa ${idx + 1}`,
          color: st.color,
          displayOrder: idx + 1,
          winProbability: Number(st.winProbability) || 0,
          stageType: st.stageType,
        })),
      };

      const res = await fetch("/api/crm/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowCreateModal(false);
        loadPipelines();
      } else {
        const d = await res.json();
        alert(d.error || "Falha ao criar funil.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao criar funil de vendas.");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (pipe: PipelineRecord) => {
    setEditingPipeline(pipe);
    setEditForm({
      name: pipe.name,
      description: pipe.description || "",
      isDefault: pipe.isDefault,
      stages: (pipe.stages || []).map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        winProbability: s.winProbability,
        stageType: s.stageType,
      })),
    });
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPipeline) return;
    setSavingEdit(true);
    setEditError(null);

    try {
      // 1. Atualiza dados do funil
      const pipeRes = await fetch(`/api/crm/pipelines/${editingPipeline.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          isDefault: editForm.isDefault,
        }),
      });
      if (!pipeRes.ok) {
        const d = await pipeRes.json();
        throw new Error(d.error || "Erro ao atualizar dados do funil.");
      }

      // 2. Sincroniza etapas existentes e novas
      const currentStages = editingPipeline.stages || [];
      const currentIds = new Set(currentStages.map((s) => s.id));
      const keptIds = new Set(editForm.stages.map((s) => s.id).filter(Boolean));

      // 2a. Arquivar/deletar etapas removidas
      for (const oldStage of currentStages) {
        if (!keptIds.has(oldStage.id)) {
          await fetch(`/api/crm/stages/${oldStage.id}`, { method: "DELETE" });
        }
      }

      // 2b. Atualizar existentes ou criar novas etapas
      for (let i = 0; i < editForm.stages.length; i++) {
        const draft = editForm.stages[i];
        if (draft.id && currentIds.has(draft.id)) {
          // Atualiza etapa
          await fetch(`/api/crm/stages/${draft.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: draft.name.trim(),
              color: draft.color,
              displayOrder: i + 1,
              winProbability: Number(draft.winProbability) || 0,
              stageType: draft.stageType,
            }),
          });
        } else {
          // Cria nova etapa
          await fetch("/api/crm/stages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pipelineId: editingPipeline.id,
              name: draft.name.trim(),
              color: draft.color,
              displayOrder: i + 1,
              winProbability: Number(draft.winProbability) || 0,
              stageType: draft.stageType,
            }),
          });
        }
      }

      setEditingPipeline(null);
      await loadPipelines();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Erro ao salvar alterações.");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <>
      <div className="space-y-6 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-zinc-900 text-white">
                <Layers className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
                  Funis de Vendas & Processos Comerciais
                </h1>
                <p className="text-xs text-zinc-500">
                  Configure múltiplos funis com etapas, probabilidades, cores e quadros Kanban 100% customizáveis.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Criar Novo Funil
            </button>
          </div>
        </div>

        {/* Lista de Funis */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-16 text-center text-xs text-zinc-400">
              Carregando funis de venda...
            </div>
          ) : (
            pipelines.map((pipe) => (
              <div
                key={pipe.id}
                className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-zinc-950">{pipe.name}</h3>
                    {pipe.isDefault && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        Funil Padrão
                      </span>
                    )}
                  </div>
                  {pipe.description && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{pipe.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-zinc-100">
                    <div>
                      <span className="text-[10px] text-zinc-400 font-semibold uppercase">Negócios Abertos</span>
                      <div className="text-sm font-bold text-zinc-900 mt-0.5">
                        {pipe.openOpportunitiesCount || 0}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-semibold uppercase">Valor do Pipeline</span>
                      <div className="text-sm font-extrabold text-purple-700 font-mono mt-0.5">
                        {formatBRL(pipe.totalPipelineAmount || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Etapas do Funil */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-zinc-400 font-semibold uppercase">
                        Etapas ({pipe.stages?.length || 0})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {pipe.stages?.map((st) => (
                        <span
                          key={st.id}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-white shadow-2xs"
                          style={{ backgroundColor: st.color }}
                        >
                          {st.name} ({st.winProbability}%)
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(pipe)}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5" /> Editar Etapas
                  </button>

                  <Link
                    href={`/crm/pipelines/${pipe.id}`}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    Abrir Kanban <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal de Criar Funil com Etapas Personalizadas */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
            <form
              onSubmit={handleCreatePipeline}
              className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-5 my-8"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-zinc-950">Novo Funil de Vendas & Etapas</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Nome do Funil *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Aquisição Outbound, Consultoria..."
                    value={newPipeline.name}
                    onChange={(e) => setNewPipeline((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Descrição</label>
                  <input
                    type="text"
                    placeholder="Objetivo e escopo deste funil..."
                    value={newPipeline.description}
                    onChange={(e) => setNewPipeline((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPipeline.isDefault}
                  onChange={(e) => setNewPipeline((prev) => ({ ...prev, isDefault: e.target.checked }))}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <span>Definir como Funil Padrão do CRM</span>
              </label>

              {/* Construtor Dinâmico de Etapas */}
              <div className="space-y-3 pt-2 border-t border-zinc-100">
                <div className="flex items-center gap-2 flex-wrap pb-1">
                  <span className="text-[11px] font-semibold text-zinc-500">Modelos sugeridos:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setNewPipeline((prev) => ({
                        ...prev,
                        name: prev.name || "Prospecção Ativa",
                        description: prev.description || "Prospecção ativa de empresas para os serviços da Otimizza",
                        stages: PROSPECTION_STAGES_DRAFT.map((s) => ({ ...s })),
                      }))
                    }
                    className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-[10px] font-bold transition"
                  >
                    Usar Modelo: Prospecção Ativa (5 etapas)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setNewPipeline((prev) => ({
                        ...prev,
                        name: prev.name || "Funil Comercial Padrão",
                        description: prev.description || "Funil padrão de negociação comercial até o fechamento de contrato",
                        stages: COMMERCIAL_STAGES_DRAFT.map((s) => ({ ...s })),
                      }))
                    }
                    className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[10px] font-bold transition"
                  >
                    Usar Modelo: Funil Comercial Padrão (6 etapas)
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">Etapas do Funil</h4>
                    <p className="text-[11px] text-zinc-500">
                      Personalize os nomes, cores e probabilidades de conversão de cada fase do processo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setNewPipeline((prev) => ({
                        ...prev,
                        stages: [
                          ...prev.stages,
                          {
                            name: `Nova Etapa ${prev.stages.length + 1}`,
                            color: STAGE_COLORS[prev.stages.length % STAGE_COLORS.length],
                            winProbability: 50,
                            stageType: "NORMAL",
                          },
                        ],
                      }))
                    }
                    className="px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Etapa
                  </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {newPipeline.stages.map((st, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs"
                    >
                      <span className="font-mono text-[10px] text-zinc-400 font-bold w-5 text-center">
                        #{idx + 1}
                      </span>

                      {/* Nome da Etapa */}
                      <input
                        type="text"
                        value={st.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewPipeline((prev) => {
                            const copy = [...prev.stages];
                            copy[idx].name = val;
                            return { ...prev, stages: copy };
                          });
                        }}
                        placeholder="Nome da etapa"
                        className="flex-1 px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-zinc-900"
                      />

                      {/* Probabilidade */}
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={st.winProbability}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setNewPipeline((prev) => {
                              const copy = [...prev.stages];
                              copy[idx].winProbability = val;
                              return { ...prev, stages: copy };
                            });
                          }}
                          className="w-14 px-2 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-right font-mono"
                        />
                        <span className="text-[10px] text-zinc-400 font-bold">%</span>
                      </div>

                      {/* Tipo de Etapa */}
                      <select
                        value={st.stageType}
                        onChange={(e) => {
                          const val = e.target.value as StageType;
                          setNewPipeline((prev) => {
                            const copy = [...prev.stages];
                            copy[idx].stageType = val;
                            if (val === "WON") copy[idx].winProbability = 100;
                            if (val === "LOST") copy[idx].winProbability = 0;
                            return { ...prev, stages: copy };
                          });
                        }}
                        className="px-2 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-semibold"
                      >
                        <option value="NORMAL">Normal</option>
                        <option value="WON">Ganho (100%)</option>
                        <option value="LOST">Perdido (0%)</option>
                      </select>

                      {/* Cor */}
                      <input
                        type="color"
                        value={st.color}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewPipeline((prev) => {
                            const copy = [...prev.stages];
                            copy[idx].color = val;
                            return { ...prev, stages: copy };
                          });
                        }}
                        title="Cor da coluna"
                        className="w-7 h-7 p-0 border border-zinc-200 rounded-lg cursor-pointer bg-transparent shrink-0"
                      />

                      {/* Remover etapa */}
                      <button
                        type="button"
                        disabled={newPipeline.stages.length <= 1}
                        onClick={() => {
                          setNewPipeline((prev) => ({
                            ...prev,
                            stages: prev.stages.filter((_, i) => i !== idx),
                          }));
                        }}
                        className="p-1 text-zinc-400 hover:text-rose-600 disabled:opacity-20 cursor-pointer"
                        title="Remover etapa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 text-xs text-zinc-600 hover:text-zinc-950 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl disabled:opacity-50"
                >
                  {creating ? "Criando..." : "Criar Funil com Etapas"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal de Edição de Funil & Etapas */}
        {editingPipeline && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
            <form
              onSubmit={handleSaveEdit}
              className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-5 my-8"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-900">
                    <Edit2 className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-zinc-950">Editar Funil & Etapas</h3>
                    <p className="text-[11px] text-zinc-500">{editingPipeline.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPipeline(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Nome do Funil *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Descrição</label>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isDefault}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <span>Definir como Funil Padrão do CRM</span>
              </label>

              {/* Gerenciamento das Etapas */}
              <div className="space-y-3 pt-2 border-t border-zinc-100">
                <div className="flex items-center gap-2 flex-wrap pb-1">
                  <span className="text-[11px] font-semibold text-zinc-500">Substituir etapas por modelo sugerido:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditForm((prev) => ({
                        ...prev,
                        stages: PROSPECTION_STAGES_DRAFT.map((s) => ({ ...s })),
                      }))
                    }
                    className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-[10px] font-bold transition"
                  >
                    Carregar: Prospecção Ativa (5 etapas)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditForm((prev) => ({
                        ...prev,
                        stages: COMMERCIAL_STAGES_DRAFT.map((s) => ({ ...s })),
                      }))
                    }
                    className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[10px] font-bold transition"
                  >
                    Carregar: Funil Comercial Padrão (6 etapas)
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">Etapas do Funil</h4>
                    <p className="text-[11px] text-zinc-500">
                      Renomeie, mude cores, probabilidades ou adicione novas etapas ao processo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditForm((prev) => ({
                        ...prev,
                        stages: [
                          ...prev.stages,
                          {
                            name: `Nova Etapa ${prev.stages.length + 1}`,
                            color: STAGE_COLORS[prev.stages.length % STAGE_COLORS.length],
                            winProbability: 50,
                            stageType: "NORMAL",
                          },
                        ],
                      }))
                    }
                    className="px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Etapa
                  </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {editForm.stages.map((st, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs"
                    >
                      <span className="font-mono text-[10px] text-zinc-400 font-bold w-5 text-center">
                        #{idx + 1}
                      </span>

                      {/* Nome da Etapa */}
                      <input
                        type="text"
                        value={st.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditForm((prev) => {
                            const copy = [...prev.stages];
                            copy[idx].name = val;
                            return { ...prev, stages: copy };
                          });
                        }}
                        placeholder="Nome da etapa"
                        className="flex-1 px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-zinc-900"
                      />

                      {/* Probabilidade */}
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={st.winProbability}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEditForm((prev) => {
                              const copy = [...prev.stages];
                              copy[idx].winProbability = val;
                              return { ...prev, stages: copy };
                            });
                          }}
                          className="w-14 px-2 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-right font-mono"
                        />
                        <span className="text-[10px] text-zinc-400 font-bold">%</span>
                      </div>

                      {/* Tipo */}
                      <select
                        value={st.stageType}
                        onChange={(e) => {
                          const val = e.target.value as StageType;
                          setEditForm((prev) => {
                            const copy = [...prev.stages];
                            copy[idx].stageType = val;
                            if (val === "WON") copy[idx].winProbability = 100;
                            if (val === "LOST") copy[idx].winProbability = 0;
                            return { ...prev, stages: copy };
                          });
                        }}
                        className="px-2 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-semibold"
                      >
                        <option value="NORMAL">Normal</option>
                        <option value="WON">Ganho (100%)</option>
                        <option value="LOST">Perdido (0%)</option>
                      </select>

                      {/* Cor */}
                      <input
                        type="color"
                        value={st.color}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditForm((prev) => {
                            const copy = [...prev.stages];
                            copy[idx].color = val;
                            return { ...prev, stages: copy };
                          });
                        }}
                        title="Cor da coluna"
                        className="w-7 h-7 p-0 border border-zinc-200 rounded-lg cursor-pointer bg-transparent shrink-0"
                      />

                      {/* Reordenar */}
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            setEditForm((prev) => {
                              const copy = [...prev.stages];
                              const temp = copy[idx - 1];
                              copy[idx - 1] = copy[idx];
                              copy[idx] = temp;
                              return { ...prev, stages: copy };
                            });
                          }}
                          className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-20"
                          title="Mover para cima"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === editForm.stages.length - 1}
                          onClick={() => {
                            setEditForm((prev) => {
                              const copy = [...prev.stages];
                              const temp = copy[idx + 1];
                              copy[idx + 1] = copy[idx];
                              copy[idx] = temp;
                              return { ...prev, stages: copy };
                            });
                          }}
                          className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-20"
                          title="Mover para baixo"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Remover etapa */}
                      <button
                        type="button"
                        disabled={editForm.stages.length <= 1}
                        onClick={() => {
                          setEditForm((prev) => ({
                            ...prev,
                            stages: prev.stages.filter((_, i) => i !== idx),
                          }));
                        }}
                        className="p-1 text-zinc-400 hover:text-rose-600 disabled:opacity-20 cursor-pointer"
                        title="Remover etapa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditingPipeline(null)}
                  className="px-3.5 py-2 text-xs text-zinc-600 hover:text-zinc-950 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl disabled:opacity-50"
                >
                  {savingEdit ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
