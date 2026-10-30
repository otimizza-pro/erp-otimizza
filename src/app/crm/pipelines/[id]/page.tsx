"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import {
  Layers,
  Plus,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Target,
  ExternalLink,
  MoveRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Building,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { PipelineRecord, OpportunityRecord, PipelineStageRecord } from "@/modules/crm/types";
import { formatBRL } from "@/components/analytics/report-charts";

export default function PipelineKanbanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [pipeline, setPipeline] = useState<PipelineRecord | null>(null);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de Fechar Oportunidade (LOST)
  const [closingOpp, setClosingOpp] = useState<OpportunityRecord | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [closingAction, setClosingAction] = useState<"WON" | "LOST">("WON");
  const [submittingClose, setSubmittingClose] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [pipeRes, oppsRes] = await Promise.all([
        fetch(`/api/crm/pipelines/${id}`),
        fetch(`/api/crm/opportunities?pipelineId=${id}&limit=200`),
      ]);

      if (!pipeRes.ok) throw new Error("Funil não encontrado.");
      setPipeline(await pipeRes.json());

      if (oppsRes.ok) {
        const data = await oppsRes.json();
        setOpportunities(data.opportunities || []);
      }
    } catch (e) {
      console.error("Erro ao carregar pipeline:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  const handleMoveStage = async (opportunityId: string, toStageId: string) => {
    try {
      const res = await fetch(`/api/crm/opportunities/${opportunityId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStageId }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error("Erro ao mover oportunidade:", e);
    }
  };

  const handleCloseOpportunity = async () => {
    if (!closingOpp) return;
    if (closingAction === "LOST" && !lostReason.trim()) {
      alert("Por favor, informe o motivo da perda.");
      return;
    }

    setSubmittingClose(true);
    try {
      const res = await fetch(`/api/crm/opportunities/${closingOpp.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: closingAction,
          lostReason: closingAction === "LOST" ? lostReason : undefined,
        }),
      });

      if (res.ok) {
        setClosingOpp(null);
        setLostReason("");
        loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingClose(false);
    }
  };

  return (
    <AppShell activeSection="crm_pipelines">
      <div className="space-y-6 pb-16">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/crm/pipelines"
              className="p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-zinc-950">
                  {pipeline?.name || "Quadro Kanban"}
                </h1>
                {pipeline?.isDefault && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Padrão
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500">
                {pipeline?.description || "Gestão visual e movimentação ágil de oportunidades."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/crm/opportunities/new?pipelineId=${id}`}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl flex items-center gap-1.5 transition shadow-2xs"
            >
              <Plus className="w-4 h-4" /> Nova Oportunidade
            </Link>
          </div>
        </div>

        {/* Quadro Kanban */}
        {loading ? (
          <div className="py-20 text-center text-xs text-zinc-400">
            Carregando colunas do funil...
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-6 items-start min-h-[500px]">
            {pipeline?.stages?.map((stage) => {
              const stageOpps = opportunities.filter((o) => o.stageId === stage.id);
              const totalStageAmount = stageOpps.reduce((acc, curr) => acc + curr.amount, 0);

              return (
                <div
                  key={stage.id}
                  className="w-80 shrink-0 bg-zinc-100/70 border border-zinc-200/80 rounded-2xl p-3 flex flex-col space-y-3"
                >
                  {/* Cabeçalho da Etapa */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="font-bold text-xs text-zinc-900">{stage.name}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-zinc-200/80 text-[10px] font-bold text-zinc-600">
                      {stageOpps.length}
                    </span>
                  </div>

                  <div className="px-1 text-[11px] font-mono font-bold text-zinc-500">
                    Total: {formatBRL(totalStageAmount)}
                  </div>

                  {/* Cards de Oportunidades */}
                  <div className="space-y-2.5 min-h-[150px]">
                    {stageOpps.map((opp) => (
                      <div
                        key={opp.id}
                        className="bg-white border border-zinc-200/90 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition space-y-2.5 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/crm/opportunities/${opp.id}`}
                            className="font-bold text-xs text-zinc-900 hover:text-blue-600 transition line-clamp-2"
                          >
                            {opp.title}
                          </Link>
                          <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                            {opp.opportunityCode}
                          </span>
                        </div>

                        <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 truncate">
                          {opp.contactType === "CLIENT" ? (
                            <Building className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                          <span className="truncate">{opp.contactName || "Sem contato"}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100">
                          <span className="font-extrabold text-zinc-950 font-mono">
                            {formatBRL(opp.amount)}
                          </span>
                          <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                            {opp.probability}% prob.
                          </span>
                        </div>

                        {/* Controles de Movimentação e Ações Rápidas */}
                        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-1 text-[11px]">
                          {/* Seletor Rápido de Etapa */}
                          <select
                            value={opp.stageId}
                            onChange={(e) => handleMoveStage(opp.id, e.target.value)}
                            className="w-full text-[10px] py-1 px-1.5 rounded-lg border border-zinc-200 bg-zinc-50 font-medium text-zinc-700 focus:outline-none"
                          >
                            {pipeline.stages?.map((st) => (
                              <option key={st.id} value={st.id}>
                                Mover: {st.name}
                              </option>
                            ))}
                          </select>

                          {/* Botão de Ganho Rápido */}
                          {opp.status === "OPEN" && (
                            <button
                              type="button"
                              onClick={() => {
                                setClosingOpp(opp);
                                setClosingAction("WON");
                              }}
                              className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition shrink-0"
                              title="Marcar como GANHO"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Botão de Perda */}
                          {opp.status === "OPEN" && (
                            <button
                              type="button"
                              onClick={() => {
                                setClosingOpp(opp);
                                setClosingAction("LOST");
                              }}
                              className="p-1 rounded-md text-rose-600 hover:bg-rose-50 transition shrink-0"
                              title="Marcar como PERDIDO"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {stageOpps.length === 0 && (
                      <div className="py-8 text-center text-[11px] text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
                        Nenhum negócio nesta etapa
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de Fechamento (WON ou LOST) */}
        {closingOpp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
                {closingAction === "WON" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                <h3 className="text-base font-bold text-zinc-950">
                  {closingAction === "WON" ? "Marcar Oportunidade como Ganha" : "Registrar Oportunidade Perdida"}
                </h3>
              </div>

              <p className="text-xs text-zinc-600">
                Oportunidade: <strong className="text-zinc-900">{closingOpp.title}</strong> (
                {formatBRL(closingOpp.amount)})
              </p>

              {closingAction === "LOST" && (
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">
                    Motivo da Perda (Obrigatório) *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Ex: Preço acima do orçamento, optou por concorrente X, adiou projeto para o próximo trimestre..."
                    value={lostReason}
                    onChange={(e) => setLostReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              )}

              {closingAction === "WON" && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
                  Parabéns pelo fechamento! A oportunidade será finalizada com 100% de sucesso.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setClosingOpp(null)}
                  className="px-3.5 py-1.5 text-xs text-zinc-600 hover:text-zinc-950 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={submittingClose || (closingAction === "LOST" && !lostReason.trim())}
                  onClick={handleCloseOpportunity}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition shadow-xs disabled:opacity-50 ${
                    closingAction === "WON"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {submittingClose ? "Salvando..." : closingAction === "WON" ? "Confirmar Ganho" : "Confirmar Perda"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
