"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ArrowRight,
  RefreshCw,
  Search,
  ExternalLink,
} from "lucide-react";
import { CrmKpiSummary, OpportunityRecord, LeadRecord, ActivityRecord } from "@/modules/crm/types";
import { formatBRL, DonutChart, BarChartDual } from "@/components/analytics/report-charts";

export default function CrmDashboardPage() {
  const [kpis, setKpis] = useState<CrmKpiSummary | null>(null);
  const [recentOpps, setRecentOpps] = useState<OpportunityRecord[]>([]);
  const [recentLeads, setRecentLeads] = useState<LeadRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [kpiRes, oppsRes, leadsRes, actRes] = await Promise.all([
        fetch("/api/crm/analytics"),
        fetch("/api/crm/opportunities?limit=5"),
        fetch("/api/crm/leads?limit=5"),
        fetch("/api/crm/activities?limit=6"),
      ]);

      if (kpiRes.ok) setKpis(await kpiRes.json());
      if (oppsRes.ok) {
        const data = await oppsRes.json();
        setRecentOpps(data.opportunities || []);
      }
      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setRecentLeads(data.leads || []);
      }
      if (actRes.ok) setActivities(await actRes.json());
    } catch (e) {
      console.error("Erro ao carregar dados do CRM:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <AppShell activeSection="crm">
      <div className="space-y-6 pb-16">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-zinc-900 text-white">
                <TrendingUp className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
                  CRM & Gestão Comercial
                </h1>
                <p className="text-xs text-zinc-500">
                  Pipeline de vendas, qualificação de leads e acompanhamento de negociações.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/crm/pipelines"
              className="px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 flex items-center gap-1.5 transition shadow-2xs"
            >
              <Layers className="w-4 h-4" /> Funis & Kanban
            </Link>
            <Link
              href="/crm/leads/new"
              className="px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 flex items-center gap-1.5 transition shadow-2xs"
            >
              <Users className="w-4 h-4" /> Novo Lead
            </Link>
            <Link
              href="/crm/opportunities/new"
              className="px-3.5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl flex items-center gap-1.5 transition shadow-2xs"
            >
              <Plus className="w-4 h-4" /> Nova Oportunidade
            </Link>
          </div>
        </div>

        {/* Indicadores Principais (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white border border-zinc-200/80 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Leads Ativos</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-extrabold text-zinc-950 mt-1 font-mono">
              {kpis?.activeLeadsCount || 0}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">Em processo de prospecção</div>
          </div>

          <div className="p-5 bg-white border border-zinc-200/80 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pipeline Ponderado</span>
              <Target className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-extrabold text-purple-700 mt-1 font-mono">
              {formatBRL(kpis?.weightedPipelineAmount || 0)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Total nominal: {formatBRL(kpis?.totalPipelineAmount || 0)}
            </div>
          </div>

          <div className="p-5 bg-white border border-zinc-200/80 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">MRR Potencial</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1 font-mono">
              {formatBRL(kpis?.potentialMrr || 0)}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              Receita mensal estimada em negociação
            </div>
          </div>

          <div className="p-5 bg-white border border-zinc-200/80 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Taxa de Conversão</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-zinc-950 mt-1 font-mono">
              {kpis?.conversionRate || 0}%
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              {kpis?.wonCountPeriod || 0} ganhas • {kpis?.lostCountPeriod || 0} perdidas
            </div>
          </div>
        </div>

        {/* Gráficos Visuais de Distribuição */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico Donut de Leads por Origem */}
          <DonutChart
            title="Leads por Canal de Origem"
            subtitle="Canais mais eficientes de captação comercial"
            data={
              kpis?.leadsBySource && kpis.leadsBySource.length > 0
                ? kpis.leadsBySource.map((s, idx) => ({
                    label: s.source,
                    value: s.count,
                    color: ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#64748b"][idx % 6],
                  }))
                : [{ label: "Sem registros", value: 0, color: "#e2e8f0" }]
            }
            centerLabel="Leads"
          />

          {/* Gráfico de Distribuição por Etapas do Funil */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-zinc-950">Distribuição do Pipeline por Etapa</h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Volume financeiro e contagem de negócios em cada fase
              </p>
            </div>

            {(!kpis?.opportunitiesByStage || kpis.opportunitiesByStage.length === 0) ? (
              <div className="py-12 text-center text-xs text-zinc-400">
                Nenhuma oportunidade aberta nas etapas do funil.
              </div>
            ) : (
              <div className="space-y-3.5 my-auto">
                {kpis.opportunitiesByStage.map((st) => {
                  const maxAmount = Math.max(
                    1,
                    ...kpis.opportunitiesByStage.map((item) => item.totalAmount)
                  );
                  const widthPct = Math.min(100, Math.max(6, (st.totalAmount / maxAmount) * 100));

                  return (
                    <div key={st.stageId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: st.stageColor }}
                          />
                          <span className="font-semibold text-zinc-800">{st.stageName}</span>
                          <span className="text-[10px] text-zinc-400">
                            ({st.count} {st.count === 1 ? "negócio" : "negócios"})
                          </span>
                        </div>
                        <span className="font-bold text-zinc-900 font-mono">
                          {formatBRL(st.totalAmount)}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: st.stageColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Seção Inferior: Atividades Próximas & Oportunidades Recentes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Atividades e Follow-ups */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-600" />
                <h3 className="text-sm font-bold text-zinc-950">Atividades Comerciais</h3>
              </div>
              <Link
                href="/crm/activities"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Ver todas <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {activities.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                Nenhuma atividade pendente registrada.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className={`p-3 rounded-xl border transition ${
                      act.isOverdue
                        ? "bg-rose-50/50 border-rose-200 text-rose-950"
                        : "bg-zinc-50/50 border-zinc-200/70 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold truncate pr-2">{act.title}</span>
                      {act.isOverdue ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 shrink-0">
                          Atrasada
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                          {act.dueDate ? new Date(act.dueDate).toLocaleDateString("pt-BR") : "Sem data"}
                        </span>
                      )}
                    </div>
                    {act.targetName && (
                      <div className="text-[11px] text-zinc-500 mt-1 truncate">
                        Contato: <strong className="text-zinc-700">{act.targetName}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Oportunidades Recentes */}
          <div className="lg:col-span-2 bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-zinc-600" />
                <h3 className="text-sm font-bold text-zinc-950">Oportunidades em Destaque</h3>
              </div>
              <Link
                href="/crm/opportunities"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Ver todas <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentOpps.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                Nenhuma oportunidade cadastrada no momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 text-[11px] font-semibold text-zinc-400 uppercase">
                      <th className="py-2.5 px-3">Negócio</th>
                      <th className="py-2.5 px-3">Cliente / Lead</th>
                      <th className="py-2.5 px-3">Etapa</th>
                      <th className="py-2.5 px-3 text-right">Valor</th>
                      <th className="py-2.5 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {recentOpps.map((opp) => (
                      <tr key={opp.id} className="hover:bg-zinc-50/60 transition">
                        <td className="py-2.5 px-3 font-semibold text-zinc-900">
                          {opp.title}
                          <span className="text-[10px] text-zinc-400 block font-mono">
                            {opp.opportunityCode}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-700">{opp.contactName || "-"}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-2xs"
                            style={{ backgroundColor: opp.stageColor || "#6366f1" }}
                          >
                            {opp.stageName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-zinc-950 font-mono">
                          {formatBRL(opp.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Link
                            href={`/crm/opportunities/${opp.id}`}
                            className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 inline-block"
                            title="Ver detalhes"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
