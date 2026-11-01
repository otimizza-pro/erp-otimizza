"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
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
  type LucideIcon,
} from "lucide-react";
import { OpportunityRecord, OpportunityStatus, PipelineRecord, PipelineStageRecord } from "@/modules/crm/types";
import { formatBRL } from "@/components/analytics/report-charts";

export default function OpportunitiesListPage() {
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"KANBAN" | "LIST">("KANBAN");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus | "ALL">("ALL");

  // Fechamento modal
  const [closeModalOpp, setCloseModalOpp] = useState<OpportunityRecord | null>(null);
  const [closeTargetStatus, setCloseTargetStatus] = useState<"WON" | "LOST" | "CANCELED">("WON");
  const [lostReason, setLostReason] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [submittingClose, setSubmittingClose] = useState(false);

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
  }, [searchTerm, selectedPipelineId, statusFilter]);

  // Funil ativo para a visão Kanban
  const activeKanbanPipeline =
    selectedPipelineId !== "ALL"
      ? pipelines.find((p) => p.id === selectedPipelineId) || pipelines[0]
      : pipelines.find((p) => p.isDefault) || pipelines[0];

  const kanbanStages: PipelineStageRecord[] = activeKanbanPipeline?.stages || [];

  // Mover oportunidade de etapa
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
      // Reverte otimista
      setOpportunities((prev) =>
        prev.map((o) => (o.id === oppId ? { ...o, stageId: previousStageId } : o))
      );
      setMoveError(err instanceof Error ? err.message : "Erro ao mover oportunidade.");
    }
  }

  // Encerrar oportunidade
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
          lostReason: closeTargetStatus === "LOST" ? lostReason : undefined,
          notes: closeNotes || undefined,
        }),
      });

      if (res.ok) {
        setCloseModalOpp(null);
        setLostReason("");
        setCloseNotes("");
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao encerrar oportunidade");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor");
    } finally {
      setSubmittingClose(false);
    }
  }

  // Reabrir oportunidade
  async function handleReopen(opp: OpportunityRecord) {
    if (!confirm(`Deseja reabrir a oportunidade "${opp.title}" para a primeira etapa ativa do funil?`)) return;
    try {
      const res = await fetch(`/api/crm/opportunities/${opp.id}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Reaberto manualmente pelo funil de vendas" }),
      });
      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao reabrir oportunidade");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao reabrir oportunidade");
    }
  }

  // Métricas agregadas da listagem atual
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

  const statusBadges: Record<OpportunityStatus, { label: string; bg: string; text: string; icon: LucideIcon }> = {
    OPEN: { label: "Aberta", bg: "bg-blue-50 text-blue-700 border-blue-200", text: "text-blue-700", icon: Clock },
    WON: { label: "Ganha", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", text: "text-emerald-700", icon: CheckCircle2 },
    LOST: { label: "Perdida", bg: "bg-rose-50 text-rose-700 border-rose-200", text: "text-rose-700", icon: XCircle },
    CANCELED: { label: "Cancelada", bg: "bg-slate-100 text-slate-700 border-slate-200", text: "text-slate-700", icon: Ban },
  };

  const periodLabels: Record<string, string> = {
    MONTHLY: "MRR",
    YEARLY: "Anual",
    ONE_TIME: "Pontual",
  };

  return (
    <AppShell activeSection="crm_opportunities">
      <div className="space-y-6 pb-16">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-zinc-900 text-white rounded-xl shadow-xs">
                <TrendingUp className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">Funil de Vendas & Oportunidades</h1>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Visualização Kanban e Lista das negociações, previsão de receita e evolução entre etapas.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Alternância Kanban / Lista */}
            <div className="bg-zinc-100 p-1 rounded-xl flex items-center gap-1 border border-zinc-200/60">
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
              Configurar funis
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
                        className="w-80 shrink-0 bg-zinc-50/80 rounded-2xl border border-zinc-200/80 flex flex-col max-h-[750px] transition"
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
                                  {/* Título e Código */}
                                  <div>
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

                                  {/* Controles de Ação & Mover Etapa por Teclado/Celular */}
                                  <div className="flex items-center justify-between pt-1 text-[11px]">
                                    <select
                                      value={opp.stageId}
                                      onChange={(e) => handleMoveStage(opp.id, e.target.value)}
                                      className="text-[10px] font-semibold bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                                      title="Mover para outra etapa do funil (sem arrastar)"
                                    >
                                      {kanbanStages.map((s) => (
                                        <option key={s.id} value={s.id}>
                                          Mover: {s.name}
                                        </option>
                                      ))}
                                    </select>

                                    <Link
                                      href={`/crm/opportunities/${opp.id}`}
                                      className="p-1 text-zinc-400 hover:text-zinc-900"
                                      title="Ver detalhes da oportunidade"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
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

                      return (
                        <tr key={opp.id} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
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
                              </Link>
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
    </AppShell>
  );
}
