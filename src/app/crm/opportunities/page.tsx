"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import {
  TrendingUp,
  Search,
  Filter,
  Plus,
  ArrowRight,
  ExternalLink,
  Kanban,
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
} from "lucide-react";
import { OpportunityRecord, OpportunityStatus, PipelineRecord } from "@/modules/crm/types";
import { formatBRL } from "@/components/analytics/report-charts";

export default function OpportunitiesListPage() {
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPipeline, setSelectedPipeline] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus | "ALL">("ALL");

  // Fechamento modal
  const [closeModalOpp, setCloseModalOpp] = useState<OpportunityRecord | null>(null);
  const [closeTargetStatus, setCloseTargetStatus] = useState<"WON" | "LOST" | "CANCELED">("WON");
  const [lostReason, setLostReason] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [submittingClose, setSubmittingClose] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      // Carrega funis
      const pipRes = await fetch("/api/crm/pipelines");
      if (pipRes.ok) {
        const pData = await pipRes.json();
        setPipelines(pData.pipelines || []);
      }

      // Carrega oportunidades
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (selectedPipeline !== "ALL") params.set("pipelineId", selectedPipeline);
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
  }, [searchTerm, selectedPipeline, statusFilter]);

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

  async function handleReopen(opp: OpportunityRecord) {
    if (!confirm(`Deseja reabrir a oportunidade "${opp.title}" para a primeira etapa ativa do funil?`)) return;
    try {
      const res = await fetch(`/api/crm/opportunities/${opp.id}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Reaberto manualmente pela listagem de oportunidades" }),
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

  const statusBadges: Record<OpportunityStatus, { label: string; bg: string; text: string; icon: any }> = {
    OPEN: { label: "Aberta", bg: "bg-blue-50 text-blue-700 border-blue-200", text: "text-blue-700", icon: Clock },
    WON: { label: "Ganha", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", text: "text-emerald-700", icon: CheckCircle2 },
    LOST: { label: "Perdida", bg: "bg-rose-50 text-rose-700 border-rose-200", text: "text-rose-700", icon: XCircle },
    CANCELED: { label: "Cancelada", bg: "bg-slate-100 text-slate-700 border-slate-200", text: "text-slate-700", icon: Ban },
  };

  const periodLabels: Record<string, string> = {
    MONTHLY: "Mensal (MRR)",
    YEARLY: "Anual",
    ONE_TIME: "Pontual",
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                <TrendingUp className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Oportunidades Comerciais</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Gerencie todas as negociações em andamento, propostas, previsão de fechamento e taxas de conversão.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/crm/pipelines"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Kanban className="h-4 w-4 text-slate-500" />
              Ver Quadro Kanban
            </Link>
            <Link
              href="/crm/opportunities/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Nova Oportunidade
            </Link>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Negócios Abertos</span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{totalOpen}</div>
            <div className="mt-1 text-xs text-slate-500">Pipeline ativo no filtro selecionado</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor em Aberto</span>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{formatBRL(totalOpenAmount)}</div>
            <div className="mt-1 text-xs text-slate-500">Soma nominal de oportunidades abertas</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor Ponderado</span>
              <TrendingUp className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-indigo-700">{formatBRL(totalWeightedAmount)}</div>
            <div className="mt-1 text-xs text-slate-500">Ajustado pela probabilidade da etapa</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Taxa de Conversão</span>
              <CheckCircle2 className="h-4 w-4 text-teal-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {winRate.toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {totalWon} ganhas de {totalWon + totalLost} encerradas
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por título, código ou contato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              <div className="flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-medium text-slate-500">Funil:</span>
                <select
                  value={selectedPipeline}
                  onChange={(e) => setSelectedPipeline(e.target.value)}
                  className="border border-slate-300 rounded-lg text-sm px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                <span className="text-xs font-medium text-slate-500">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="border border-slate-300 rounded-lg text-sm px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
                title="Atualizar listagem"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de Oportunidades */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
              <p className="text-sm">Carregando oportunidades...</p>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <TrendingUp className="h-10 w-10 text-slate-300" />
              <p className="text-base font-semibold text-slate-700">Nenhuma oportunidade encontrada</p>
              <p className="text-sm text-slate-500 max-w-sm">
                Não há negociações cadastradas correspondentes aos filtros aplicados.
              </p>
              <Link
                href="/crm/opportunities/new"
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                Criar Oportunidade
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
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
                <tbody className="divide-y divide-slate-100">
                  {opportunities.map((opp) => {
                    const st = statusBadges[opp.status] || statusBadges.OPEN;
                    const StatusIcon = st.icon;

                    return (
                      <tr key={opp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <Link
                              href={`/crm/opportunities/${opp.id}`}
                              className="font-medium text-slate-900 hover:text-emerald-600 hover:underline flex items-center gap-1.5"
                            >
                              {opp.title}
                            </Link>
                            <span className="text-xs font-mono text-slate-400 mt-0.5">
                              {opp.opportunityCode}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {opp.contactName ? (
                            <div className="flex items-center gap-1.5 text-xs">
                              {opp.contactType === "CLIENT" ? (
                                <Building className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              ) : (
                                <User className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              )}
                              <span className="font-medium text-slate-700 truncate max-w-[150px]">
                                {opp.contactName}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                  opp.contactType === "CLIENT"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {opp.contactType === "CLIENT" ? "Cliente" : "Lead"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Sem contato</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-slate-500 font-medium">{opp.pipelineName}</span>
                            <span
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border w-fit"
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

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-slate-900">{formatBRL(opp.amount)}</span>
                            <span className="text-[11px] text-slate-400">
                              {periodLabels[opp.billingPeriod] || opp.billingPeriod}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-xs font-semibold text-slate-700">{opp.probability}%</span>
                            <div className="w-14 bg-slate-200 h-1.5 rounded-full mt-1 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(opp.probability, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {opp.expectedCloseDate ? (
                            <span className="flex items-center gap-1 text-slate-600">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              {new Date(opp.expectedCloseDate).toLocaleDateString("pt-BR")}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${st.bg}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {st.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {opp.status === "OPEN" ? (
                              <>
                                <button
                                  onClick={() => {
                                    setCloseModalOpp(opp);
                                    setCloseTargetStatus("WON");
                                    setLostReason("");
                                    setCloseNotes("");
                                  }}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                  title="Marcar como Ganha (Won)"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setCloseModalOpp(opp);
                                    setCloseTargetStatus("LOST");
                                    setLostReason("");
                                    setCloseNotes("");
                                  }}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                  title="Marcar como Perdida (Lost)"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleReopen(opp)}
                                className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                                title="Reabrir Negociação"
                              >
                                Reabrir
                              </button>
                            )}
                            <Link
                              href={`/crm/opportunities/${opp.id}`}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-md transition-colors"
                              title="Abrir Detalhes"
                            >
                              <ArrowRight className="h-4 w-4" />
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

        {/* Modal de Fechamento (Ganha / Perdida / Cancelada) */}
        {closeModalOpp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {closeTargetStatus === "WON" && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                )}
                {closeTargetStatus === "LOST" && <XCircle className="h-5 w-5 text-rose-600" />}
                {closeTargetStatus === "CANCELED" && <Ban className="h-5 w-5 text-slate-600" />}
                {closeTargetStatus === "WON"
                  ? "Concluir Oportunidade como Ganha"
                  : closeTargetStatus === "LOST"
                  ? "Registrar Perda da Oportunidade"
                  : "Cancelar Oportunidade"}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Negociação: <strong className="text-slate-700">{closeModalOpp.title}</strong> (
                {formatBRL(closeModalOpp.amount)})
              </p>

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
                      placeholder="Ex: Preço elevado, escolheu concorrente X, sem orçamento..."
                      className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notas de Encerramento (opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    placeholder="Comentários adicionais sobre a conclusão..."
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {closeTargetStatus === "WON" && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      A oportunidade será marcada como <strong>Ganha (100%)</strong>. Nenhum contrato
                      fictício é gerado automaticamente, preservando a integridade do seu módulo de Contratos.
                    </span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCloseModalOpp(null)}
                    disabled={submittingClose}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingClose}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                      closeTargetStatus === "WON"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : closeTargetStatus === "LOST"
                        ? "bg-rose-600 hover:bg-rose-700"
                        : "bg-slate-700 hover:bg-slate-800"
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
