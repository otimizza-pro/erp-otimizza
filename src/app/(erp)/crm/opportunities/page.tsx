"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {EditRecordAction} from "@/components/ui/edit-record-action";

import {ArchiveRecordAction} from "@/components/ui/archive-record-action";

import {
  TrendingUp,
  Search,
  Filter,
  Plus,
  ArrowRight,
  ExternalLink,
  Kanban as KanbanIcon,
  List as ListIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Building,
  User,
  RefreshCw,
  Calendar,
  DollarSign,
  AlertCircle,
  Layers,
  ChevronRight,
  MoveRight,
  Sparkles,
  Rocket,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";
import { OpportunityRecord, OpportunityStatus, PipelineRecord, PipelineStageRecord } from "@/modules/crm/types";
import { formatBRL } from "@/components/analytics/report-charts";

const statusBadges: Record<
  OpportunityStatus,
  { label: string; bg: string; icon: LucideIcon }
> = {
  OPEN: { label: "Aberta", bg: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
  WON: { label: "Ganha", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  LOST: { label: "Perdida", bg: "bg-rose-50 text-rose-700 border-rose-200", icon: XCircle },
  CANCELED: { label: "Cancelada", bg: "bg-zinc-100 text-zinc-600 border-zinc-200", icon: Ban },
};

const periodLabels: Record<string, string> = {
  MONTHLY: "Mensal",
  ONE_TIME: "Pontual",
  ANNUAL: "Anual",
};

export default function OpportunitiesListPage() {
  const [showArchived,setShowArchived]=useState(false);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"KANBAN" | "LIST">("KANBAN");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus | "ALL">("ALL");

  // Fechamento modal (Ganha / Perdida)
  const [closeModalOpp, setCloseModalOpp] = useState<OpportunityRecord | null>(null);
  const [closeTargetStatus, setCloseTargetStatus] = useState<"WON" | "LOST" | "CANCELED">("WON");
  const [lostReason, setLostReason] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [submittingClose, setSubmittingClose] = useState(false);

  // Transferência entre Funis & Etapas Modal
  const [transferModalOpp, setTransferModalOpp] = useState<OpportunityRecord | null>(null);
  const [transferPipelineId, setTransferPipelineId] = useState<string>("");
  const [transferStageId, setTransferStageId] = useState<string>("");
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [transferFeedback, setTransferFeedback] = useState<string | null>(null);

  // Drag and Drop State
  const [draggedOppId, setDraggedOppId] = useState<string | null>(null);
  const [movingStageOppId, setMovingStageOppId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setMoveError(null);
    try {
      // Carrega funis
      const pipRes = await fetch("/api/crm/pipelines");
      let loadedPipelines: PipelineRecord[] = [];
      if (pipRes.ok) {
        const pData = await pipRes.json();
        loadedPipelines = Array.isArray(pData) ? pData : (pData?.pipelines || []);
        setPipelines(loadedPipelines);
      }

      // Carrega oportunidades
      const params = new URLSearchParams();
      params.set("archived",String(showArchived));
      if (searchTerm) params.set("search", searchTerm);
      if (selectedPipelineId !== "ALL") params.set("pipelineId", selectedPipelineId);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const oppRes = await fetch(`/api/crm/opportunities?${params.toString()}`);
      if (oppRes.ok) {
        const oData = await oppRes.json();
        setOpportunities(oData.opportunities || []);
      }
    } catch (e) {
      console.error("Erro ao carregar oportunidades:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const delay = setTimeout(() => {
      loadData();
    }, 200);
    return () => clearTimeout(delay);
  }, [searchTerm, selectedPipelineId, statusFilter,showArchived]);

  // Funil Comercial Padrão (final)
  const defaultPipeline = pipelines.find((p) => p.isDefault) || pipelines[0];

  // Funil ativo para a visão Kanban
  const activeKanbanPipeline =
    selectedPipelineId !== "ALL"
      ? pipelines.find((p) => p.id === selectedPipelineId) || pipelines[0]
      : defaultPipeline;

  const kanbanStages: PipelineStageRecord[] = activeKanbanPipeline?.stages || [];

  // Mover oportunidade de etapa no mesmo funil
  async function handleMoveStage(oppId: string, toStageId: string) {
    const opp = opportunities.find((o) => o.id === oppId);
    if (!opp || opp.stageId === toStageId) return;

    const previousStageId = opp.stageId;
    const targetStage = kanbanStages.find((s) => s.id === toStageId);

    // Otimista: atualiza localmente
    setOpportunities((prev) =>
      prev.map((o) =>
        o.id === oppId
          ? {
              ...o,
              stageId: toStageId,
              stageName: targetStage?.name || o.stageName,
              stageColor: targetStage?.color || o.stageColor,
            }
          : o
      )
    );

    try {
      const res = await fetch(`/api/crm/opportunities/${oppId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStageId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Falha ao mover etapa.");
      }
    } catch (err: unknown) {
      setOpportunities((prev) =>
        prev.map((o) => (o.id === oppId ? { ...o, stageId: previousStageId } : o))
      );
      setMoveError(err instanceof Error ? err.message : "Erro ao mover oportunidade.");
    }
  }

  // Avanço com 1 Clique para o Funil Comercial Padrão (Ex: saindo da Prospecção Ativa)
  async function handleQuickAdvanceToCommercial(opp: OpportunityRecord) {
    if (!defaultPipeline || !defaultPipeline.stages || defaultPipeline.stages.length === 0) {
      alert("Funil Comercial Padrão não possui etapas configuradas.");
      return;
    }
    const targetStage = defaultPipeline.stages[0]; // Primeira etapa: "Oportunidade qualificada"
    try {
      const res = await fetch(`/api/crm/opportunities/${opp.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toPipelineId: defaultPipeline.id,
          toStageId: targetStage.id,
          notes: `Avançado com 1 clique para o Funil Comercial Padrão (${targetStage.name}).`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao transferir oportunidade.");
      }

      setTransferFeedback(`Negociação "${opp.title}" transferida com 1 clique para "${defaultPipeline.name}" (${targetStage.name})!`);
      loadData();
      setTimeout(() => setTransferFeedback(null), 6000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao transferir oportunidade.");
    }
  }

  // Abrir Modal de Transferência de Funil
  function handleOpenTransferModal(opp: OpportunityRecord) {
    setTransferModalOpp(opp);
    // Sugere outro funil diferente do atual se houver
    const otherPipe = pipelines.find((p) => p.id !== opp.pipelineId) || defaultPipeline;
    if (otherPipe) {
      setTransferPipelineId(otherPipe.id);
      if (otherPipe.stages && otherPipe.stages.length > 0) {
        setTransferStageId(otherPipe.stages[0].id);
      } else {
        setTransferStageId("");
      }
    }
  }

  // Submissão do Modal de Transferência
  async function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transferModalOpp || !transferPipelineId || !transferStageId) return;

    setSubmittingTransfer(true);
    try {
      const targetPipe = pipelines.find((p) => p.id === transferPipelineId);
      const targetStage = targetPipe?.stages?.find((s) => s.id === transferStageId);

      const res = await fetch(`/api/crm/opportunities/${transferModalOpp.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toPipelineId: transferPipelineId,
          toStageId: transferStageId,
          notes: `Transferido para o funil "${targetPipe?.name}" na etapa "${targetStage?.name}".`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao transferir oportunidade de funil.");
      }

      setTransferFeedback(
        `Negociação "${transferModalOpp.title}" movida para "${targetPipe?.name}" (${targetStage?.name}) com sucesso!`
      );
      setTransferModalOpp(null);
      loadData();
      setTimeout(() => setTransferFeedback(null), 6000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao transferir oportunidade.");
    } finally {
      setSubmittingTransfer(false);
    }
  }

  // Encerrar oportunidade (Ganha / Perdida)
  async function handleCloseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!closeModalOpp) return;
    if (closeTargetStatus === "LOST" && !lostReason.trim()) {
      alert("Informe o motivo da perda.");
      return;
    }

    setSubmittingClose(true);
    try {
      const res = await fetch(`/api/crm/opportunities/${closeModalOpp.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: closeTargetStatus,
          lostReason: closeTargetStatus === "LOST" ? lostReason.trim() : undefined,
          closeNotes: closeNotes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao encerrar oportunidade.");
      }

      setCloseModalOpp(null);
      setLostReason("");
      setCloseNotes("");
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao encerrar oportunidade.");
    } finally {
      setSubmittingClose(false);
    }
  }

  // Reabrir oportunidade
  async function handleReopen(opp: OpportunityRecord) {
    if (!confirm(`Deseja reabrir a oportunidade "${opp.title}"?`)) return;
    try {
      const res = await fetch(`/api/crm/opportunities/${opp.id}/reopen`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao reabrir oportunidade.");
      }
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao reabrir.");
    }
  }

  // Métricas
  const totalOpen = opportunities.filter((o) => o.status === "OPEN").length;
  const totalOpenAmount = opportunities
    .filter((o) => o.status === "OPEN")
    .reduce((sum, o) => sum + Number(o.amount || 0), 0);
  const totalWeightedAmount = opportunities
    .filter((o) => o.status === "OPEN")
    .reduce((sum, o) => sum + (Number(o.amount || 0) * (o.probability || 0)) / 100, 0);
  const totalWon = opportunities.filter((o) => o.status === "WON").length;
  const totalLost = opportunities.filter((o) => o.status === "LOST").length;
  const winRate = totalWon + totalLost > 0 ? (totalWon / (totalWon + totalLost)) * 100 : 0;

  const transferPipeSelected = pipelines.find((p) => p.id === transferPipelineId);
  const transferStagesAvailable = transferPipeSelected?.stages || [];

  return (
    <>
      <div className="space-y-6 pb-20">
<label className="flex items-center gap-2 text-xs text-zinc-600"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/>Ver arquivados</label>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-600 text-white">
                <TrendingUp className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
                  Oportunidades
                </h1>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Gestão operacional de oportunidades, transição rápida entre funis e avanço para fechamento.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Alternador Kanban / Lista */}
            <div className="flex items-center rounded-xl bg-zinc-100 p-1 border border-zinc-200">
              <button
                type="button"
                onClick={() => setViewMode("KANBAN")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  viewMode === "KANBAN"
                    ? "bg-white text-zinc-950 shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                <KanbanIcon className="w-3.5 h-3.5" /> Kanban
              </button>
              <button
                type="button"
                onClick={() => setViewMode("LIST")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  viewMode === "LIST"
                    ? "bg-white text-zinc-950 shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                <ListIcon className="w-3.5 h-3.5" /> Lista
              </button>
            </div>

            {/* Configurar Funis */}
            <Link
              href="/crm/pipelines"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition shadow-2xs"
              title="Configurar funis e ordenar etapas comerciais"
            >
              <Layers className="h-4 w-4 text-purple-600" />
              Configurar Funis & Etapas
            </Link>

            {/* Nova Oportunidade */}
            <Link
              href="/crm/opportunities/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 transition shadow-2xs"
            >
              <Plus className="h-4 w-4" />
              Nova Oportunidade
            </Link>
          </div>
        </div>

        {/* Feedback Banner */}
        {transferFeedback && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{transferFeedback}</span>
            </div>
            <button onClick={() => setTransferFeedback(null)} className="text-emerald-700 font-bold hover:underline">
              Fechar
            </button>
          </div>
        )}

        {moveError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{moveError}</span>
            </div>
            <button onClick={() => setMoveError(null)} className="text-rose-600 font-bold hover:underline">
              Fechar
            </button>
          </div>
        )}

        {/* Métricas rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Negócios Abertos</span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-950 font-mono">{totalOpen}</div>
            <div className="mt-0.5 text-xs text-zinc-400">Em andamento no filtro</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Pipeline em Aberto</span>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-950 font-mono">{formatBRL(totalOpenAmount)}</div>
            <div className="mt-0.5 text-xs text-zinc-400">Soma total das oportunidades</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Valor Ponderado</span>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-purple-700 font-mono">{formatBRL(totalWeightedAmount)}</div>
            <div className="mt-0.5 text-xs text-zinc-400">Multiplicado pelas probabilidades</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Taxa de Conversão</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-950 font-mono">{winRate.toFixed(1)}%</div>
            <div className="mt-0.5 text-xs text-zinc-400">
              {totalWon} ganhas de {totalWon + totalLost} encerradas
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar oportunidade por título, código ou contato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50/50 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
              />
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-600">Funil:</span>
                <select
                  value={selectedPipelineId}
                  onChange={(e) => setSelectedPipelineId(e.target.value)}
                  className="border border-zinc-200 rounded-xl text-xs px-3 py-2 bg-zinc-50/50 text-zinc-700 font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="ALL">Todos os Funis</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isDefault ? "(Padrão)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-600">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as OpportunityStatus | "ALL")}
                  className="border border-zinc-200 rounded-xl text-xs px-3 py-2 bg-zinc-50/50 text-zinc-700 font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="ALL">Todos os Status</option>
                  <option value="OPEN">Abertas</option>
                  <option value="WON">Ganhas</option>
                  <option value="LOST">Perdidas</option>
                  <option value="CANCELED">Canceladas</option>
                </select>
              </div>

              <button
                onClick={loadData}
                className="p-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-600 transition"
                title="Atualizar dados"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            VISÃO KANBAN DO FUNIL
           ========================================================================= */}
        {viewMode === "KANBAN" && (
          <div className="space-y-4">
            {activeKanbanPipeline ? (
              <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
                <span className="font-semibold text-zinc-800">
                  Visualizando Funil:{" "}
                  <strong className="text-purple-700">{activeKanbanPipeline.name}</strong>
                  {activeKanbanPipeline.isDefault && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold">
                      Funil Comercial Padrão (Final)
                    </span>
                  )}
                </span>
                <span>
                  {opportunities.length} negócio(s) correspondente(s) aos filtros
                </span>
              </div>
            ) : null}

            {kanbanStages.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-zinc-200 shadow-xs space-y-3">
                <Layers className="w-10 h-10 text-zinc-300 mx-auto" />
                <h3 className="text-sm font-bold text-zinc-800">Nenhuma etapa configurada para este funil</h3>
                <p className="text-xs text-zinc-400">
                  Acesse o configurador de funis para adicionar e ordenar as etapas deste pipeline comercial.
                </p>
                <Link
                  href="/crm/pipelines"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition shadow-xs"
                >
                  <Layers className="w-4 h-4" /> Configurar Etapas do Funil
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto pb-4">
                <div className="flex items-start gap-4 min-w-[900px]">
                  {kanbanStages.map((stage) => {
                    const stageOpps = opportunities.filter((o) => o.stageId === stage.id);
                    const stageTotalAmount = stageOpps.reduce((sum, o) => sum + Number(o.amount || 0), 0);

                    return (
                      <div
                        key={stage.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDrop={() => {
                          if (draggedOppId) {
                            handleMoveStage(draggedOppId, stage.id);
                            setDraggedOppId(null);
                          }
                        }}
                        className="w-80 shrink-0 bg-zinc-50/80 rounded-2xl border border-zinc-200/80 flex flex-col max-h-[780px] transition"
                      >
                        {/* Header da Coluna */}
                        <div className="p-3.5 border-b border-zinc-200/80 bg-white rounded-t-2xl">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: stage.color || "#6366f1" }}
                              />
                              <h3 className="text-xs font-bold text-zinc-900">{stage.name}</h3>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600 font-mono">
                              {stageOpps.length}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-400 font-mono">
                            <span>Prob: {stage.winProbability}%</span>
                            <span className="font-bold text-zinc-700">{formatBRL(stageTotalAmount)}</span>
                          </div>
                        </div>

                        {/* Lista de Cards da Etapa */}
                        <div className="p-2 space-y-2.5 overflow-y-auto flex-1">
                          {stageOpps.length === 0 ? (
                            <div className="py-8 text-center text-[11px] text-zinc-400 italic">
                              Sem oportunidades
                            </div>
                          ) : (
                            stageOpps.map((opp) => {
                              const isClient = opp.contactType === "CLIENT";
                              const isNonDefaultPipeline = defaultPipeline && opp.pipelineId !== defaultPipeline.id;

                              return (
                                <div
                                  key={opp.id}
                                  draggable
                                  onDragStart={() => setDraggedOppId(opp.id)}
                                  onDragEnd={() => setDraggedOppId(null)}
                                  className={`bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs hover:shadow-xs transition cursor-grab active:cursor-grabbing space-y-2.5 ${
                                    draggedOppId === opp.id ? "opacity-50 ring-2 ring-purple-500" : ""
                                  }`}
                                >
                                  {/* Título, Código e Tag de Funil */}
                                  <div>
                                    {selectedPipelineId === "ALL" && (
                                      <div className="mb-1">
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                          <Layers className="w-2.5 h-2.5" />
                                          {pipelines.find((p) => p.id === opp.pipelineId)?.name || "Funil Comercial"}
                                        </span>
                                      </div>
                                    )}
                                    <Link
                                      href={`/crm/opportunities/${opp.id}`}
                                      className="font-bold text-xs text-zinc-900 hover:text-purple-700 line-clamp-2"
                                    >
                                      {opp.title}
                                    </Link>
                                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                      {opp.opportunityCode}
                                    </div>
                                  </div>

                                  {/* Contato (Lead ou Cliente) */}
                                  {opp.contactName ? (
                                    <div className="flex items-center gap-1.5 text-[11px]">
                                      {isClient ? (
                                        <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                      ) : (
                                        <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      )}
                                      <Link
                                        href={isClient ? `/clients/${opp.clientId}` : `/crm/leads/${opp.leadId}`}
                                        className="font-semibold text-zinc-700 hover:underline truncate"
                                      >
                                        {opp.contactName}
                                      </Link>
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                          isClient ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-800"
                                        }`}
                                      >
                                        {isClient ? "Cliente" : "Lead"}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-zinc-400 italic">Sem contato</span>
                                  )}

                                  {/* Valor e Período */}
                                  <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100">
                                    <span className="font-mono font-bold text-zinc-950">
                                      {formatBRL(opp.amount)}
                                    </span>
                                    <span className="text-[10px] font-semibold text-zinc-400">
                                      {periodLabels[opp.billingPeriod] || opp.billingPeriod}
                                    </span>
                                  </div>

                                  {/* BOTÃO 1-CLIQUE: Avançar para Funil Comercial Padrão */}
                                  {isNonDefaultPipeline && (
                                    <button
                                      type="button"
                                      onClick={() => handleQuickAdvanceToCommercial(opp)}
                                      className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold transition shadow-2xs"
                                      title="Avançar diretamente esta oportunidade para a primeira etapa do Funil Comercial Padrão com 1 clique"
                                    >
                                      <Rocket className="w-3 h-3 text-emerald-600" />
                                      Avançar p/ Funil Comercial
                                    </button>
                                  )}

                                  {/* Controles de Ação: Mover Etapa e Transferir de Funil */}
                                  <div className="flex items-center justify-between pt-1 text-[11px] border-t border-zinc-100">
                                    <select
                                      value={opp.stageId}
                                      onChange={(e) => handleMoveStage(opp.id, e.target.value)}
                                      className="text-[10px] font-semibold bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-900 max-w-[150px] truncate"
                                      title="Mover para outra etapa deste funil"
                                    >
                                      {kanbanStages.map((s) => (
                                        <option key={s.id} value={s.id}>
                                          {s.name}
                                        </option>
                                      ))}
                                    </select>

                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenTransferModal(opp)}
                                        className="p-1 rounded-lg text-zinc-500 hover:text-purple-700 hover:bg-purple-50 transition"
                                        title="Transferir para outro Funil"
                                      >
                                        <MoveRight className="w-3.5 h-3.5" />
                                      </button>

                                      <Link
                                        href={`/crm/opportunities/${opp.id}`}
                                        className="p-1 text-zinc-400 hover:text-zinc-900"
                                        title="Ver detalhes da oportunidade"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </Link><EditRecordAction url={"/api/crm/opportunities/"+opp.id} label="oportunidade" data={{title:opp.title,amount:opp.amount,expectedCloseDate:opp.expectedCloseDate}} fields={[{key:"title",label:"Título",required:true},{key:"amount",label:"Valor negociado (R$)",type:"number",required:true},{key:"expectedCloseDate",label:"Previsão de fechamento",type:"date"}]} onSaved={loadData}/><ArchiveRecordAction url={"/api/crm/opportunities/"+opp.id} archived={showArchived} onChanged={loadData}/>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            VISÃO LISTA / TABELA
           ========================================================================= */}
        {viewMode === "LIST" && (
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-zinc-400 text-xs">
                Carregando oportunidades...
              </div>
            ) : opportunities.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 space-y-3">
                <TrendingUp className="h-10 w-10 text-zinc-300 mx-auto" />
                <p className="text-sm font-semibold text-zinc-700">Nenhuma oportunidade encontrada</p>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Não há negociações cadastradas correspondentes aos critérios aplicados.
                </p>
                <Link
                  href="/crm/opportunities/new"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-zinc-900 rounded-xl hover:bg-zinc-800"
                >
                  <Plus className="h-4 w-4" /> Criar Oportunidade
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50/75 border-b border-zinc-200 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Oportunidade / Código</th>
                      <th className="py-3 px-4">Lead / Cliente</th>
                      <th className="py-3 px-4">Funil & Etapa</th>
                      <th className="py-3 px-4 text-right">Valor & Período</th>
                      <th className="py-3 px-4 text-center">Probab.</th>
                      <th className="py-3 px-4">Previsão</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {opportunities.map((opp) => {
                      const st = statusBadges[opp.status] || statusBadges.OPEN;
                      const StatusIcon = st.icon;
                      const isNonDefaultPipeline = defaultPipeline && opp.pipelineId !== defaultPipeline.id;

                      return (
                        <tr key={opp.id} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              {selectedPipelineId === "ALL" && (
                                <div className="mb-0.5">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    <Layers className="w-2.5 h-2.5" />
                                    {pipelines.find((p) => p.id === opp.pipelineId)?.name || "Funil Comercial"}
                                  </span>
                                </div>
                              )}
                              <Link
                                href={`/crm/opportunities/${opp.id}`}
                                className="font-bold text-zinc-900 hover:text-purple-700 hover:underline"
                              >
                                {opp.title}
                              </Link>
                              <span className="text-[10px] font-mono text-zinc-400 mt-0.5">
                                {opp.opportunityCode}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {opp.contactName ? (
                              <div className="flex items-center gap-1.5 text-xs">
                                {opp.contactType === "CLIENT" ? (
                                  <Building className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                ) : (
                                  <User className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                )}
                                <span className="font-semibold text-zinc-700 truncate max-w-[150px]">
                                  {opp.contactName}
                                </span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                    opp.contactType === "CLIENT"
                                      ? "bg-blue-50 text-blue-700"
                                      : "bg-amber-50 text-amber-800"
                                  }`}
                                >
                                  {opp.contactType === "CLIENT" ? "Cliente" : "Lead"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-zinc-400 italic">Sem contato</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] text-zinc-500 font-medium">{opp.pipelineName}</span>
                              <span
                                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border w-fit"
                                style={{
                                  borderColor: opp.stageColor || "#cbd5e1",
                                  backgroundColor: (opp.stageColor || "#cbd5e1") + "15",
                                  color: opp.stageColor || "#334155",
                                }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: opp.stageColor || "#64748b" }}
                                />
                                {opp.stageName}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-zinc-950 font-mono">{formatBRL(opp.amount)}</span>
                              <span className="text-[10px] text-zinc-400">
                                {periodLabels[opp.billingPeriod] || opp.billingPeriod}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="text-xs font-bold text-zinc-700 font-mono">{opp.probability}%</span>
                          </td>

                          <td className="py-3 px-4 text-zinc-600">
                            {opp.expectedCloseDate ? (
                              <span className="flex items-center gap-1 text-[11px]">
                                <Calendar className="h-3 w-3 text-zinc-400" />
                                {new Date(opp.expectedCloseDate).toLocaleDateString("pt-BR", {
                                  timeZone: "America/Sao_Paulo",
                                })}
                              </span>
                            ) : (
                              <span className="text-zinc-400 italic">-</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${st.bg}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {st.label}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* 1-Clique para avançar ao Funil Comercial */}
                              {isNonDefaultPipeline && opp.status === "OPEN" && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickAdvanceToCommercial(opp)}
                                  className="px-2 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-300 transition flex items-center gap-1"
                                  title="Avançar para Funil Comercial Padrão com 1 clique"
                                >
                                  <Rocket className="w-3 h-3 text-emerald-600" />
                                  Avançar
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenTransferModal(opp)}
                                className="px-2 py-1 text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition"
                                title="Mover de Funil"
                              >
                                Mover Funil
                              </button>

                              {opp.status === "OPEN" ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setCloseModalOpp(opp);
                                      setCloseTargetStatus("WON");
                                    }}
                                    className="px-2 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
                                  >
                                    Ganho
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCloseModalOpp(opp);
                                      setCloseTargetStatus("LOST");
                                    }}
                                    className="px-2 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition"
                                  >
                                    Perdido
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleReopen(opp)}
                                  className="px-2 py-1 text-[10px] font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition"
                                >
                                  Reabrir
                                </button>
                              )}
                              <Link
                                href={`/crm/opportunities/${opp.id}`}
                                className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                                title="Ver detalhes"
                              >
                                <ArrowRight className="w-4 h-4" />
                              </Link><EditRecordAction url={"/api/crm/opportunities/"+opp.id} label="oportunidade" data={{title:opp.title,amount:opp.amount,expectedCloseDate:opp.expectedCloseDate}} fields={[{key:"title",label:"Título",required:true},{key:"amount",label:"Valor negociado (R$)",type:"number",required:true},{key:"expectedCloseDate",label:"Previsão de fechamento",type:"date"}]} onSaved={loadData}/><ArchiveRecordAction url={"/api/crm/opportunities/"+opp.id} archived={showArchived} onChanged={loadData}/>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            MODAL DE TRANSFERÊNCIA DE FUNIL & ETAPA
           ========================================================================= */}
        {transferModalOpp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                    <MoveRight className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-zinc-950">Transferir de Funil</h2>
                    <p className="text-xs text-zinc-500">
                      Mova esta negociação para outro funil e defina a etapa de destino.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTransferModalOpp(null)}
                  className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 text-xs space-y-1">
                <span className="text-[10px] text-zinc-400 font-semibold uppercase">Oportunidade</span>
                <p className="font-bold text-zinc-900">{transferModalOpp.title}</p>
                <p className="text-[11px] text-zinc-500">
                  Funil atual: <strong>{transferModalOpp.pipelineName}</strong> • Etapa atual: <strong>{transferModalOpp.stageName}</strong>
                </p>
              </div>

              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Funil de Destino *
                  </label>
                  <select
                    required
                    value={transferPipelineId}
                    onChange={(e) => {
                      const pId = e.target.value;
                      setTransferPipelineId(pId);
                      const p = pipelines.find((item) => item.id === pId);
                      if (p && p.stages && p.stages.length > 0) {
                        setTransferStageId(p.stages[0].id);
                      } else {
                        setTransferStageId("");
                      }
                    }}
                    className="w-full text-xs font-medium border border-zinc-300 rounded-xl p-2.5 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    {pipelines.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.isDefault ? "(Funil Comercial Padrão)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Etapa de Destino *
                  </label>
                  <select
                    required
                    value={transferStageId}
                    onChange={(e) => setTransferStageId(e.target.value)}
                    className="w-full text-xs font-medium border border-zinc-300 rounded-xl p-2.5 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    {transferStagesAvailable.map((stg) => (
                      <option key={stg.id} value={stg.id}>
                        {stg.name} (Probabilidade: {stg.winProbability}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setTransferModalOpp(null)}
                    disabled={submittingTransfer}
                    className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingTransfer}
                    className="px-5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition disabled:opacity-50"
                  >
                    {submittingTransfer ? "Transferindo..." : "Transferir Oportunidade"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Fechamento (Ganho / Perdido) */}
        {closeModalOpp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 space-y-4">
              <h2 className="text-base font-bold text-zinc-950">
                {closeTargetStatus === "WON" ? "Marcar Oportunidade como Ganha" : "Marcar como Perdida"}
              </h2>
              <p className="text-xs text-zinc-500">
                {closeTargetStatus === "WON"
                  ? `Registrar o fechamento comercial com sucesso de "${closeModalOpp.title}".`
                  : `Informe o motivo pelo qual a negociação "${closeModalOpp.title}" foi encerrada.`}
              </p>

              <form onSubmit={handleCloseSubmit} className="space-y-3.5">
                {closeTargetStatus === "LOST" && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Motivo da Perda <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Ex: Preço acima do orçamento, optou por concorrente..."
                      value={lostReason}
                      onChange={(e) => setLostReason(e.target.value)}
                      className="w-full text-xs border border-zinc-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Anotações Internas (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Comentários sobre a negociação..."
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    className="w-full text-xs border border-zinc-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setCloseModalOpp(null)}
                    disabled={submittingClose}
                    className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingClose}
                    className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition ${
                      closeTargetStatus === "WON"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-rose-600 hover:bg-rose-700"
                    }`}
                  >
                    {submittingClose ? "Salvando..." : "Confirmar Encerramento"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
