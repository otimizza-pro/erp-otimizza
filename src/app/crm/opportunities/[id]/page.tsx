"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import {
  TrendingUp,
  ArrowLeft,
  Calendar,
  Building,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  DollarSign,
  Layers,
  History,
  Phone,
  Mail,
  Plus,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import {
  OpportunityRecord,
  OpportunityHistoryRecord,
  ActivityRecord,
  PipelineRecord,
  PipelineStageRecord,
  OpportunityStatus,
} from "@/modules/crm/types";
import { formatBRL } from "@/components/analytics/report-charts";

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [opp, setOpp] = useState<OpportunityRecord | null>(null);
  const [pipeline, setPipeline] = useState<PipelineRecord | null>(null);
  const [history, setHistory] = useState<OpportunityHistoryRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeTargetStatus, setCloseTargetStatus] = useState<"WON" | "LOST" | "CANCELED">("WON");
  const [lostReason, setLostReason] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [submittingClose, setSubmittingClose] = useState(false);

  // Nova Atividade
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [actType, setActType] = useState<ActivityRecord["activityType"]>("CALL");
  const [actTitle, setActTitle] = useState("");
  const [actDueDate, setActDueDate] = useState("");
  const [actDescription, setActDescription] = useState("");
  const [submittingAct, setSubmittingAct] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [oppRes, histRes, actRes] = await Promise.all([
        fetch(`/api/crm/opportunities/${id}`),
        fetch(`/api/crm/opportunities/${id}/history`),
        fetch(`/api/crm/activities?opportunityId=${id}`),
      ]);

      if (oppRes.ok) {
        const oppData = await oppRes.json();
        setOpp(oppData.opportunity);

        // Carrega pipeline associado para exibir stepper
        if (oppData.opportunity.pipelineId) {
          const pipRes = await fetch(`/api/crm/pipelines/${oppData.opportunity.pipelineId}`);
          if (pipRes.ok) {
            const pipData = await pipRes.json();
            setPipeline(pipData.pipeline);
          }
        }
      }

      if (histRes.ok) {
        const hData = await histRes.json();
        setHistory(hData.history || []);
      }

      if (actRes.ok) {
        const aData = await actRes.json();
        setActivities(aData.activities || []);
      }
    } catch (e) {
      console.error("Erro ao carregar detalhes:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  // Mover etapa via stepper
  async function handleMoveStage(toStageId: string) {
    if (!opp || opp.status !== "OPEN") return;
    try {
      const res = await fetch(`/api/crm/opportunities/${opp.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toStageId,
          notes: "Movido através do painel de detalhes",
        }),
      });

      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao mover oportunidade");
      }
    } catch (e) {
      console.error(e);
      alert("Falha ao mover etapa.");
    }
  }

  // Encerrar oportunidade (Ganha / Perdida / Cancelada)
  async function handleCloseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!opp) return;

    if (closeTargetStatus === "LOST" && !lostReason.trim()) {
      alert("Por favor informe o motivo da perda.");
      return;
    }

    setSubmittingClose(true);
    try {
      const res = await fetch(`/api/crm/opportunities/${opp.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: closeTargetStatus,
          lostReason: closeTargetStatus === "LOST" ? lostReason : undefined,
          notes: closeNotes || undefined,
        }),
      });

      if (res.ok) {
        setShowCloseModal(false);
        setLostReason("");
        setCloseNotes("");
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao encerrar oportunidade");
      }
    } catch (err) {
      console.error(err);
      alert("Falha ao comunicar com o servidor.");
    } finally {
      setSubmittingClose(false);
    }
  }

  // Reabrir oportunidade
  async function handleReopen() {
    if (!opp) return;
    if (!confirm("Deseja reabrir esta oportunidade para a primeira etapa do funil?")) return;

    try {
      const res = await fetch(`/api/crm/opportunities/${opp.id}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Reaberto pelo painel de detalhes" }),
      });

      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao reabrir oportunidade");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao reabrir");
    }
  }

  // Criar Atividade
  async function handleCreateActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!opp || !actTitle.trim()) return;

    setSubmittingAct(true);
    try {
      const res = await fetch("/api/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: actType,
          title: actTitle.trim(),
          description: actDescription.trim() || undefined,
          dueDate: actDueDate || undefined,
          opportunityId: opp.id,
          leadId: opp.leadId || undefined,
          clientId: opp.clientId || undefined,
        }),
      });

      if (res.ok) {
        setShowActivityModal(false);
        setActTitle("");
        setActDescription("");
        setActDueDate("");
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao criar atividade");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao criar atividade");
    } finally {
      setSubmittingAct(false);
    }
  }

  // Concluir Atividade
  async function handleCompleteActivity(activityId: string) {
    try {
      const res = await fetch(`/api/crm/activities/${activityId}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-500">
          <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
          <p className="text-sm">Carregando detalhes da oportunidade...</p>
        </div>
      </AppShell>
    );
  }

  if (!opp) {
    return (
      <AppShell>
        <div className="p-12 text-center text-slate-500">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-2" />
          <p className="text-lg font-semibold text-slate-800">Oportunidade não encontrada</p>
          <Link
            href="/crm/opportunities"
            className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para lista de oportunidades
          </Link>
        </div>
      </AppShell>
    );
  }

  const statusBadges: Record<OpportunityStatus, { label: string; bg: string; text: string; icon: any }> = {
    OPEN: { label: "Em Aberto", bg: "bg-blue-50 text-blue-700 border-blue-200", text: "text-blue-700", icon: Clock },
    WON: { label: "Ganha", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", text: "text-emerald-700", icon: CheckCircle2 },
    LOST: { label: "Perdida", bg: "bg-rose-50 text-rose-700 border-rose-200", text: "text-rose-700", icon: XCircle },
    CANCELED: { label: "Cancelada", bg: "bg-slate-100 text-slate-700 border-slate-200", text: "text-slate-700", icon: Ban },
  };

  const periodLabels: Record<string, string> = {
    MONTHLY: "Mensal (MRR)",
    YEARLY: "Anual",
    ONE_TIME: "Pontual",
  };

  const st = statusBadges[opp.status] || statusBadges.OPEN;
  const StatusIcon = st.icon;

  const currentStages = pipeline?.stages || [];

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/crm/opportunities" className="hover:text-emerald-600">
                Oportunidades
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="font-mono text-slate-600">{opp.opportunityCode}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{opp.title}</h1>
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${st.bg}`}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {st.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {pipeline && (
              <Link
                href={`/crm/pipelines/${pipeline.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm"
              >
                <Layers className="h-3.5 w-3.5 text-slate-500" />
                Abrir Funil {pipeline.name}
              </Link>
            )}

            {opp.status === "OPEN" ? (
              <>
                <button
                  onClick={() => {
                    setCloseTargetStatus("WON");
                    setShowCloseModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Marcar como Ganha
                </button>
                <button
                  onClick={() => {
                    setCloseTargetStatus("LOST");
                    setShowCloseModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-sm transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Marcar como Perdida
                </button>
              </>
            ) : (
              <button
                onClick={handleReopen}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reabrir Oportunidade
              </button>
            )}

            <button
              onClick={() => setShowActivityModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-emerald-600" />
              Nova Atividade
            </button>
          </div>
        </div>

        {/* Stepper de Etapas do Funil */}
        {currentStages.length > 0 && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Etapas do Funil: {pipeline?.name}
              </span>
              <span className="text-xs text-slate-400">
                {opp.status === "OPEN"
                  ? "Clique em uma etapa para avançar a negociação"
                  : "Negociação encerrada"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
              {currentStages.map((stage, idx) => {
                const isCurrent = stage.id === opp.stageId;
                const isAvailable = opp.status === "OPEN";

                return (
                  <button
                    key={stage.id}
                    disabled={!isAvailable || isCurrent}
                    onClick={() => handleMoveStage(stage.id)}
                    className={`relative p-2.5 rounded-lg border text-left transition-all ${
                      isCurrent
                        ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/50"
                        : isAvailable
                        ? "border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
                        : "border-slate-100 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-mono text-slate-400 font-bold">#{idx + 1}</span>
                      <span className="font-semibold text-slate-600">{stage.winProbability}%</span>
                    </div>
                    <div className="font-medium text-xs text-slate-800 truncate">{stage.name}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Grid Principal: Detalhes & Contato */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1 & 2: Dados Financeiros, Escopo e Histórico */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card Valores Financeiros */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                Condições Comerciais & Previsão
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-500 block">Valor Nominal</span>
                  <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                    {formatBRL(opp.amount)}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {periodLabels[opp.billingPeriod] || opp.billingPeriod}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100">
                  <span className="text-xs text-emerald-700 block">MRR Mensal Normalizado</span>
                  <span className="text-xl font-bold text-emerald-800 mt-0.5 block">
                    {formatBRL(opp.normalizedMonthlyValue)}
                  </span>
                  <span className="text-[11px] text-emerald-600/80">Recorrência mensal</span>
                </div>

                <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100">
                  <span className="text-xs text-indigo-700 block">Valor Ponderado</span>
                  <span className="text-xl font-bold text-indigo-800 mt-0.5 block">
                    {formatBRL((opp.amount * opp.probability) / 100)}
                  </span>
                  <span className="text-[11px] text-indigo-600/80">
                    Probabilidade: {opp.probability}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
                <div>
                  <span className="font-semibold text-slate-500 block mb-0.5">Previsão de Fechamento:</span>
                  <span>
                    {opp.expectedCloseDate
                      ? new Date(opp.expectedCloseDate).toLocaleDateString("pt-BR")
                      : "Não informada"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block mb-0.5">Canal de Origem:</span>
                  <span>{opp.source || "Não informado"}</span>
                </div>
              </div>

              {opp.notes && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">
                    Anotações & Escopo Proposto:
                  </span>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {opp.notes}
                  </p>
                </div>
              )}

              {opp.lostReason && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                  <strong>Motivo do cancelamento / perda:</strong> {opp.lostReason}
                </div>
              )}
            </div>

            {/* Linha do Tempo & Histórico de Transições */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <History className="h-4 w-4 text-emerald-600" />
                Histórico de Transições & Auditoria
              </h2>

              <div className="mt-4 space-y-3">
                {history.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhum evento registrado ainda.</p>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {history.map((h) => (
                      <div key={h.id} className="relative text-xs">
                        <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-slate-200" />
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-800">
                            {h.toStatus
                              ? `Status alterado para ${h.toStatus}`
                              : `Movido para ${h.toStageName || "nova etapa"}`}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(h.createdAt).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        {h.notes && (
                          <p className="text-slate-600 text-[11px] mt-0.5 bg-slate-50 p-2 rounded border border-slate-100">
                            {h.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Coluna 3: Contato Vinculado & Atividades */}
          <div className="space-y-6">
            {/* Card Contato */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Contato Vinculado</span>
                {opp.contactType === "CLIENT" ? (
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                    CLIENTE
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                    LEAD
                  </span>
                )}
              </h3>

              {opp.contactName ? (
                <div className="space-y-2">
                  <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                    {opp.contactType === "CLIENT" ? (
                      <Building className="h-4 w-4 text-blue-500" />
                    ) : (
                      <User className="h-4 w-4 text-amber-500" />
                    )}
                    {opp.contactName}
                  </div>

                  <div className="pt-2">
                    {opp.leadId && (
                      <Link
                        href={`/crm/leads/${opp.leadId}`}
                        className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                      >
                        Ver cadastro completo do Lead
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                    {opp.clientId && (
                      <Link
                        href={`/clients`}
                        className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                      >
                        Ver no módulo de Clientes
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Nenhum contato vinculado à negociação.</p>
              )}
            </div>

            {/* Atividades e Follow-ups */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tarefas & Follow-ups
                </h3>
                <button
                  onClick={() => setShowActivityModal(true)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600 text-xs inline-flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </button>
              </div>

              <div className="space-y-2.5">
                {activities.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhuma atividade agendada.</p>
                ) : (
                  activities.map((act) => (
                    <div
                      key={act.id}
                      className={`p-3 rounded-lg border text-xs transition-colors ${
                        act.status === "COMPLETED"
                          ? "bg-slate-50/70 border-slate-200 text-slate-400 line-through"
                          : act.isOverdue
                          ? "bg-rose-50/50 border-rose-200"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800 no-underline">{act.title}</span>
                        {act.status === "PENDING" && (
                          <button
                            onClick={() => handleCompleteActivity(act.id)}
                            className="text-emerald-600 hover:text-emerald-700 font-medium text-[11px]"
                          >
                            Concluir
                          </button>
                        )}
                      </div>
                      {act.dueDate && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(act.dueDate).toLocaleDateString("pt-BR")}</span>
                          {act.isOverdue && act.status === "PENDING" && (
                            <span className="text-rose-600 font-bold ml-1">Atrasada</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Encerramento (Ganha / Perdida / Cancelada) */}
        {showCloseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {closeTargetStatus === "WON" && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                {closeTargetStatus === "LOST" && <XCircle className="h-5 w-5 text-rose-600" />}
                {closeTargetStatus === "CANCELED" && <Ban className="h-5 w-5 text-slate-600" />}
                {closeTargetStatus === "WON"
                  ? "Concluir como Oportunidade Ganha"
                  : closeTargetStatus === "LOST"
                  ? "Registrar Perda da Oportunidade"
                  : "Cancelar Oportunidade"}
              </h2>

              <form onSubmit={handleCloseSubmit} className="mt-4 space-y-4">
                {closeTargetStatus === "LOST" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Motivo da Perda <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={lostReason}
                      onChange={(e) => setLostReason(e.target.value)}
                      placeholder="Ex: Preço, concorrente, prazo, cliente adiou..."
                      className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notas de Fechamento (opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    placeholder="Comentários sobre a conclusão da negociação..."
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCloseModal(false)}
                    disabled={submittingClose}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingClose}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
                      closeTargetStatus === "WON"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : closeTargetStatus === "LOST"
                        ? "bg-rose-600 hover:bg-rose-700"
                        : "bg-slate-700 hover:bg-slate-800"
                    }`}
                  >
                    {submittingClose ? "Salvando..." : "Confirmar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Nova Atividade */}
        {showActivityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
              <h2 className="text-lg font-bold text-slate-900">Agendar Atividade / Follow-up</h2>

              <form onSubmit={handleCreateActivity} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Atividade
                  </label>
                  <select
                    value={actType}
                    onChange={(e) => setActType(e.target.value as any)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="CALL">Ligação Telefônica</option>
                    <option value="MEETING">Reunião / Apresentação</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="FOLLOW_UP">Follow-up Comercial</option>
                    <option value="NOTE">Anotação Interna</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Título / Assunto <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={actTitle}
                    onChange={(e) => setActTitle(e.target.value)}
                    placeholder="Ex: Alinhar escopo final da proposta"
                    className="w-full text-sm border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data Limite (Prazo)
                  </label>
                  <input
                    type="date"
                    value={actDueDate}
                    onChange={(e) => setActDueDate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descrição / Pauta
                  </label>
                  <textarea
                    rows={2}
                    value={actDescription}
                    onChange={(e) => setActDescription(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowActivityModal(false)}
                    disabled={submittingAct}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAct}
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                  >
                    {submittingAct ? "Salvando..." : "Criar Atividade"}
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
