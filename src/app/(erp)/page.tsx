"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";

import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  CheckCircle2,
  Users,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Filter,
} from "lucide-react";
import {
  ExecutiveKpiSummary,
  MonthlyEvolutionItem,
  ServiceProfitabilityReportItem,
  ClientProfitabilityReportItem,
  DashboardLayoutPreferences,
} from "@/modules/analytics/types";

export default function ExecutiveDashboardPage() {
  const [kpis, setKpis] = useState<ExecutiveKpiSummary | null>(null);
  const [evolution, setEvolution] = useState<MonthlyEvolutionItem[]>([]);
  const [topServices, setTopServices] = useState<ServiceProfitabilityReportItem[]>([]);
  const [topClients, setTopClients] = useState<ClientProfitabilityReportItem[]>([]);
  const [preferences, setPreferences] = useState<DashboardLayoutPreferences>({
    visibleWidgets: [
      "kpis_summary",
      "financial_evolution_chart",
      "mrr_evolution_card",
      "default_inadimplencia_card",
      "revenue_composition",
      "top_services_profitability",
      "top_clients_ranking",
    ],
    widgetOrder: [
      "kpis_summary",
      "financial_evolution_chart",
      "mrr_evolution_card",
      "default_inadimplencia_card",
      "revenue_composition",
      "top_services_profitability",
      "top_clients_ranking",
    ],
    collapsedWidgets: [],
  });

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  // Filtros Globais e Comparações Históricas
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [presetPeriod, setPresetPeriod] = useState<"MONTH" | "QUARTER" | "YEAR" | "CUSTOM">("MONTH");
  const [comparisonType, setComparisonType] = useState<"PREVIOUS_PERIOD" | "SAME_PERIOD_LAST_YEAR">("PREVIOUS_PERIOD");

  const [customizingWidgets, setCustomizingWidgets] = useState(false);
  const [actionData, setActionData] = useState<{
    actionItems: {
      activities: Array<{ id: string; title: string; scheduled_at: string; lead_name?: string; client_name?: string }>;
      proposals: Array<{ id: string; proposal_code: string; title: string; client_name: string; valid_until?: string }>;
      overdueReceivables: Array<{ id: string; receivable_number: string; description: string; client_name: string; balance_amount: number; due_date: string }>;
      upcomingPayables: Array<{ id: string; payable_number: string; description: string; supplier_name: string; balance_amount: number; due_date: string; is_overdue: boolean }>;
      expiringContracts: Array<{ id: string; contract_number: string; client_name: string; end_date: string; days_remaining: number }>;
      overdueProjects: Array<{ id: string; project_code: string; name: string; due_date: string; is_overdue: boolean }>;
      overdueTasks?: Array<{ id: string; project_id: string; title: string; project_name: string; due_date: string; is_overdue: boolean }>;
      contentDue?: Array<{ id: string; title: string; scheduled_date: string; company_name: string; is_overdue: boolean }>;
      completedBriefings?: Array<{ id: string; project_id: string; company_name: string; completed_at: string }>;
    };
    counts: {
      activities: number;
      proposals: number;
      overdueReceivables: number;
      upcomingPayables: number;
      expiringContracts: number;
      overdueProjects: number;
      overdueTasks?: number;
      contentDue?: number;
      completedBriefings?: number;
    };
  } | null>(null);

  async function loadDashboardData() {
    setLoading(true);
    setErrorMsg("");
    try {
      const [resKpis, resEvol, resServ, resCli, resPref, resActions] = await Promise.all([
        fetch(`/api/analytics/overview?type=kpis&startDate=${startDate}&endDate=${endDate}&comparisonType=${comparisonType}`),
        fetch(`/api/analytics/overview?type=evolution&months=6`),
        fetch(`/api/analytics/overview?type=services_profitability`),
        fetch(`/api/analytics/overview?type=clients_profitability`),
        fetch(`/api/analytics/overview?type=preferences`),
        fetch(`/api/dashboard/action-items`),
      ]);

      if (resKpis.ok) setKpis(await resKpis.json());
      if (resEvol.ok) setEvolution(await resEvol.json());
      if (resServ.ok) setTopServices(await resServ.json());
      if (resCli.ok) setTopClients(await resCli.json());
      if (resPref.ok) {
        const prefData = await resPref.json();
        if (prefData && prefData.visibleWidgets) {
          setPreferences(prefData);
        }
      }
      if (resActions.ok) {
        setActionData(await resActions.json());
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao carregar dados do dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, [startDate, endDate, comparisonType]);

  const handleApplyPreset = (preset: "MONTH" | "QUARTER" | "YEAR") => {
    setPresetPeriod(preset);
    const now = new Date();
    if (preset === "MONTH") {
      setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === "QUARTER") {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      setStartDate(new Date(now.getFullYear(), currentQuarter * 3, 1).toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === "YEAR") {
      setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    }
  };

  const handleToggleWidget = async (widgetId: string) => {
    const isVisible = preferences.visibleWidgets.includes(widgetId);
    const newVisible = isVisible
      ? preferences.visibleWidgets.filter((w) => w !== widgetId)
      : [...preferences.visibleWidgets, widgetId];

    const updated = { ...preferences, visibleWidgets: newVisible };
    setPreferences(updated);

    try {
      await fetch("/api/analytics/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_preferences", preferences: updated }),
      });
    } catch (e) {
      console.error("Falha ao salvar preferência no banco:", e);
    }
  };

  const handleToggleWidgetSize = async (widgetId: string) => {
    const currentSizes = preferences.widgetSizes || {};
    const currentSize = currentSizes[widgetId] || "half";
    const newSize: "full" | "half" = currentSize === "half" ? "full" : "half";
    const updated: DashboardLayoutPreferences = {
      ...preferences,
      widgetSizes: {
        ...currentSizes,
        [widgetId]: newSize,
      },
    };
    setPreferences(updated);

    try {
      await fetch("/api/analytics/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_preferences", preferences: updated }),
      });
    } catch (e) {
      console.error("Falha ao salvar tamanho no banco:", e);
    }
  };

  const formatBRL = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  const isWidgetVisible = (id: string) => preferences.visibleWidgets.includes(id);

  return (
    <>
      <div className="space-y-6 pb-16">
        {/* Top Header & Global Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                BI & Inteligência Financeira
              </span>
              <span className="text-xs text-zinc-400 font-medium">Otimizza ERP</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
              Dashboard Executivo e Indicadores de Gestão
            </h1>
            <p className="text-xs text-zinc-500">
              Análise em tempo real de liquidez, rentabilidade por serviço, contratos recorrentes (MRR) e inadimplência.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Presets de Período */}
            <div className="inline-flex bg-zinc-100 p-1 rounded-xl border border-zinc-200/80 text-xs font-semibold">
              <button
                onClick={() => handleApplyPreset("MONTH")}
                className={`px-3 py-1.5 rounded-lg transition ${presetPeriod === "MONTH" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-600 hover:text-zinc-900"}`}
              >
                Mês Atual
              </button>
              <button
                onClick={() => handleApplyPreset("QUARTER")}
                className={`px-3 py-1.5 rounded-lg transition ${presetPeriod === "QUARTER" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-600 hover:text-zinc-900"}`}
              >
                Trimestre
              </button>
              <button
                onClick={() => handleApplyPreset("YEAR")}
                className={`px-3 py-1.5 rounded-lg transition ${presetPeriod === "YEAR" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-600 hover:text-zinc-900"}`}
              >
                Ano
              </button>
            </div>

            {/* Intervalo de Datas */}
            <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200/80 px-2.5 py-1.5 rounded-xl text-xs">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPresetPeriod("CUSTOM");
                }}
                className="bg-transparent font-medium text-zinc-800 focus:outline-none"
              />
              <span className="text-zinc-400">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPresetPeriod("CUSTOM");
                }}
                className="bg-transparent font-medium text-zinc-800 focus:outline-none"
              />
            </div>

            {/* Comparação Histórica */}
            <div className="inline-flex bg-zinc-100 p-1 rounded-xl border border-zinc-200/80 text-xs font-semibold">
              <button
                onClick={() => setComparisonType("PREVIOUS_PERIOD")}
                className={`px-2.5 py-1.5 rounded-lg transition ${comparisonType === "PREVIOUS_PERIOD" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-600 hover:text-zinc-900"}`}
                title="Comparar com o período imediatamente anterior de mesma duração"
              >
                vs. Período Anterior
              </button>
              <button
                onClick={() => setComparisonType("SAME_PERIOD_LAST_YEAR")}
                className={`px-2.5 py-1.5 rounded-lg transition ${comparisonType === "SAME_PERIOD_LAST_YEAR" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-600 hover:text-zinc-900"}`}
                title="Comparar com as mesmas datas do ano anterior"
              >
                vs. Ano Anterior
              </button>
            </div>

            {/* Botão Personalizar Widgets */}
            <button
              onClick={() => setCustomizingWidgets(!customizingWidgets)}
              className="px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 flex items-center gap-1.5 transition"
              title="Personalizar quais cards e gráficos exibir e redimensionar no dashboard"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Personalizar Layout
            </button>

            {/* Exportar Dados do Dashboard */}
            <a
              href="/api/analytics/export?report=evolution&format=xlsx"
              className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 flex items-center gap-1.5 transition"
              title="Exportar dados consolidados em Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Exportar XLSX
            </a>
          </div>
        </div>

        {/* Modal/Gaveta de Configuração de Widgets */}
        {customizingWidgets && (
          <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <span className="text-xs font-semibold text-zinc-800">
                Configurar Widgets Visíveis (Salvo para seu perfil)
              </span>
              <button
                onClick={() => setCustomizingWidgets(false)}
                className="text-xs text-zinc-500 hover:text-zinc-800 font-semibold"
              >
                Fechar
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {[
                { id: "kpis_summary", label: "Cards de KPIs Financeiros" },
                { id: "financial_evolution_chart", label: "Evolução Mensal (Receita x Despesa)" },
                { id: "mrr_evolution_card", label: "Indicador de MRR e Contratos" },
                { id: "default_inadimplencia_card", label: "Painel de Inadimplência" },
                { id: "revenue_composition", label: "Composição de Resultados" },
                { id: "top_services_profitability", label: "Rentabilidade por Serviço" },
                { id: "top_clients_ranking", label: "Ranking de Clientes" },
              ].map((w) => {
                const isFull = preferences.widgetSizes?.[w.id] === "full";
                return (
                  <div key={w.id} className="flex items-center justify-between p-2.5 bg-zinc-50 border border-zinc-200/60 rounded-xl">
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-700">
                      <input
                        type="checkbox"
                        checked={preferences.visibleWidgets.includes(w.id)}
                        onChange={() => handleToggleWidget(w.id)}
                        className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-medium">{w.label}</span>
                    </label>
                    <button
                      onClick={() => handleToggleWidgetSize(w.id)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border transition ${
                        isFull
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                      }`}
                      title="Alternar entre largura normal e largura inteira (100%)"
                    >
                      {isFull ? "Largura Total (100%)" : "Padrão (50%)"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BLOCO DE PENDÊNCIAS & CENTRAL DE AÇÃO */}
        {actionData && (
          <div className="bg-white border border-zinc-200 p-5 sm:p-6 rounded-xl shadow-hourline space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-zinc-500" />
                <h2 className="text-sm font-semibold text-zinc-950">
                  Pendências operacionais & ações prioritárias
                </h2>
              </div>
              <span className="text-[11px] text-zinc-400">
                Itens com prazos ou acompanhamento imediato
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* 1. Atividades Comerciais */}
              <Link
                href="/crm/activities?status=PENDING&filter=critical"
                className="p-3.5 rounded-lg bg-zinc-50/70 hover:bg-zinc-100/80 border border-zinc-200 transition space-y-1.5 group block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-600">
                    Atividades comerciais
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                      actionData.counts.activities > 0
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-zinc-100 text-zinc-600 border-zinc-200"
                    }`}
                  >
                    {actionData.counts.activities} pendentes
                  </span>
                </div>
                <div className="text-xs text-zinc-900 font-medium group-hover:text-zinc-950 transition flex items-center justify-between">
                  <span>Reuniões e tarefas no prazo</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700" />
                </div>
              </Link>

              {/* 2. Propostas Aguardando Retorno */}
              <Link
                href="/proposals?status=SENT"
                className="p-3.5 rounded-lg bg-zinc-50/70 hover:bg-zinc-100/80 border border-zinc-200 transition space-y-1.5 group block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-600">
                    Propostas enviadas
                  </span>
                  <span
                    className="px-2 py-0.5 rounded text-[11px] font-medium border bg-zinc-100 text-zinc-700 border-zinc-200"
                  >
                    {actionData.counts.proposals} aguardando
                  </span>
                </div>
                <div className="text-xs text-zinc-900 font-medium group-hover:text-zinc-950 transition flex items-center justify-between">
                  <span>Aguardando retorno do cliente</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700" />
                </div>
              </Link>

              {/* 3. Contas a Receber Vencidas */}
              <Link
                href="/financial/receivables?status=PENDING&overdue=true"
                className="p-3.5 rounded-lg bg-zinc-50/70 hover:bg-zinc-100/80 border border-zinc-200 transition space-y-1.5 group block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-600">
                    Cobranças vencidas
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                      actionData.counts.overdueReceivables > 0
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {actionData.counts.overdueReceivables > 0
                      ? `${actionData.counts.overdueReceivables} em atraso`
                      : "Em dia"}
                  </span>
                </div>
                <div className="text-xs text-zinc-900 font-medium group-hover:text-zinc-950 transition flex items-center justify-between">
                  <span>Inadimplência a cobrar</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700" />
                </div>
              </Link>

              {/* 4. Contas a Pagar no Vencimento */}
              <Link
                href="/financial/payables?status=PENDING&filter=critical"
                className="p-3.5 rounded-lg bg-zinc-50/70 hover:bg-zinc-100/80 border border-zinc-200 transition space-y-1.5 group block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-600">
                    Contas a pagar (7 dias)
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                      actionData.counts.upcomingPayables > 0
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-zinc-100 text-zinc-600 border-zinc-200"
                    }`}
                  >
                    {actionData.counts.upcomingPayables} a vencer
                  </span>
                </div>
                <div className="text-xs text-zinc-900 font-medium group-hover:text-zinc-950 transition flex items-center justify-between">
                  <span>Despesas próximas do vencimento</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700" />
                </div>
              </Link>

              {/* 5. Contratos Próximos do Término */}
              <Link
                href="/contracts?filter=expiring"
                className="p-3.5 rounded-lg bg-zinc-50/70 hover:bg-zinc-100/80 border border-zinc-200 transition space-y-1.5 group block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-600">
                    Renovações de contrato
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                      actionData.counts.expiringContracts > 0
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-zinc-100 text-zinc-600 border-zinc-200"
                    }`}
                  >
                    {actionData.counts.expiringContracts} a vencer
                  </span>
                </div>
                <div className="text-xs text-zinc-900 font-medium group-hover:text-zinc-950 transition flex items-center justify-between">
                  <span>Vigências expirando em 30 dias</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700" />
                </div>
              </Link>

              {/* 6. Projetos com Prazo Próximo ou Atrasados */}
              <Link
                href="/projects?filter=critical"
                className="p-3.5 rounded-lg bg-zinc-50/70 hover:bg-zinc-100/80 border border-zinc-200 transition space-y-1.5 group block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-600">
                    Prazos de projetos
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                      actionData.counts.overdueProjects > 0
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-zinc-100 text-zinc-600 border-zinc-200"
                    }`}
                  >
                    {actionData.counts.overdueProjects} críticos
                  </span>
                </div>
                <div className="text-xs text-zinc-900 font-medium group-hover:text-zinc-950 transition flex items-center justify-between">
                  <span>Entregas de fases com atraso</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700" />
                </div>
              </Link>

              {/* 7. Tarefas de Projetos */}
              <Link
                href="/projects?filter=critical"
                className="p-3.5 rounded-lg bg-zinc-50/70 hover:bg-zinc-100/80 border border-zinc-200 transition space-y-1.5 group block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-600">
                    Tarefas de projetos
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                      (actionData.counts.overdueTasks || 0) > 0
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-zinc-100 text-zinc-600 border-zinc-200"
                    }`}
                  >
                    {actionData.counts.overdueTasks || 0} pendentes
                  </span>
                </div>
                <div className="text-xs text-zinc-900 font-medium group-hover:text-zinc-950 transition flex items-center justify-between">
                  <span>Prazos nos próximos 7 dias</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700" />
                </div>
              </Link>

              {/* 8. Conteúdos Previstos */}
              <Link
                href="/prompt-creator/headlines"
                className="p-3.5 rounded-lg bg-zinc-50/70 hover:bg-zinc-100/80 border border-zinc-200 transition space-y-1.5 group block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-600">
                    Calendário editorial
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                      (actionData.counts.contentDue || 0) > 0
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-zinc-100 text-zinc-600 border-zinc-200"
                    }`}
                  >
                    {actionData.counts.contentDue || 0} previstos
                  </span>
                </div>
                <div className="text-xs text-zinc-900 font-medium group-hover:text-zinc-950 transition flex items-center justify-between">
                  <span>Pautas para hoje ou em atraso</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700" />
                </div>
              </Link>

              {/* 9. Briefings Respondidos */}
              <Link
                href="/projects"
                className="p-3.5 rounded-lg bg-zinc-50/70 hover:bg-zinc-100/80 border border-zinc-200 transition space-y-1.5 group block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-600">
                    Briefings concluídos
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                      (actionData.counts.completedBriefings || 0) > 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-zinc-100 text-zinc-600 border-zinc-200"
                    }`}
                  >
                    {actionData.counts.completedBriefings || 0} recentes
                  </span>
                </div>
                <div className="text-xs text-zinc-900 font-medium group-hover:text-zinc-950 transition flex items-center justify-between">
                  <span>Prontos para revisar e sincronizar</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700" />
                </div>
              </Link>
            </div>

            {(() => {
              const priorityFeed = [
                ...(actionData.actionItems.overdueReceivables || []).slice(0, 2).map((r) => ({
                  key: `rec-${r.id}`,
                  href: `/financial/receivables/${r.id}`,
                  tag: "Cobrança vencida",
                  tone: "border-rose-200 bg-rose-50 text-rose-700",
                  title: `${r.receivable_number} · ${r.client_name}`,
                  meta: `${formatBRL(Number(r.balance_amount))} · Venc. ${r.due_date.slice(0, 10).split("-").reverse().join("/")}`,
                })),
                ...(actionData.actionItems.upcomingPayables || []).slice(0, 2).map((p) => ({
                  key: `pay-${p.id}`,
                  href: `/financial/payables/${p.id}`,
                  tag: p.is_overdue ? "Despesa vencida" : "Conta a pagar",
                  tone: p.is_overdue ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-800",
                  title: `${p.payable_number} · ${p.supplier_name}`,
                  meta: `${formatBRL(Number(p.balance_amount))} · Venc. ${p.due_date.slice(0, 10).split("-").reverse().join("/")}`,
                })),
                ...(actionData.actionItems.overdueTasks || []).slice(0, 2).map((t) => ({
                  key: `task-${t.id}`,
                  href: `/projects/${t.project_id}`,
                  tag: t.is_overdue ? "Tarefa atrasada" : "Tarefa próxima",
                  tone: t.is_overdue ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-800",
                  title: `${t.title} · ${t.project_name}`,
                  meta: `Prazo ${t.due_date.slice(0, 10).split("-").reverse().join("/")}`,
                })),
                ...(actionData.actionItems.completedBriefings || []).slice(0, 2).map((b) => ({
                  key: `brief-${b.id}`,
                  href: `/projects/${b.project_id}`,
                  tag: "Briefing respondido",
                  tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
                  title: `Briefing de ${b.company_name}`,
                  meta: "Sincronizar na estratégia do cliente",
                })),
              ].slice(0, 6);

              if (priorityFeed.length === 0) return null;

              return (
                <div className="pt-2 border-t border-zinc-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-700">Fila rápida de atenção</span>
                    <span className="text-[11px] text-zinc-400">Clique para abrir diretamente o registro</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {priorityFeed.map((item) => (
                      <Link
                        key={item.key}
                        href={item.href}
                        className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs hover:bg-zinc-50 transition"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium shrink-0 ${item.tone}`}>
                              {item.tag}
                            </span>
                            <span className="font-medium text-zinc-900 truncate">{item.title}</span>
                          </div>
                          <span className="text-[11px] text-zinc-500 block mt-0.5 truncate">{item.meta}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 1. CARDS DE KPIS EXECUTIVOS */}
        {isWidgetVisible("kpis_summary") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Receita Recebida */}
            <div className="bg-white border border-zinc-200 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">
                  Receita realizada (Caixa)
                </span>
                <DollarSign className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
              </div>
              <div className="text-2xl font-semibold text-zinc-950 font-mono tabular-nums tracking-tight mt-1.5">
                {formatBRL(kpis?.receivedRevenue.current)}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                {kpis?.receivedRevenue.delta && kpis.receivedRevenue.delta >= 0 ? (
                  <span className="inline-flex items-center text-emerald-600 font-medium font-mono tabular-nums">
                    <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                    +{kpis.receivedRevenue.percentageChange ?? 0}%
                  </span>
                ) : (
                  <span className="inline-flex items-center text-red-600 font-medium font-mono tabular-nums">
                    <ArrowDownRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                    {kpis?.receivedRevenue.percentageChange ?? 0}%
                  </span>
                )}
                <span className="text-zinc-400">vs. período anterior</span>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Previsto por vencimento:</span>
                <span className="text-zinc-700 font-mono tabular-nums font-medium">{formatBRL(kpis?.projectedRevenueDue)}</span>
              </div>
            </div>

            {/* Despesas Pagas */}
            <div className="bg-white border border-zinc-200 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">
                  Despesas pagas (Saídas)
                </span>
                <TrendingDown className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
              </div>
              <div className="text-2xl font-semibold text-zinc-950 font-mono tabular-nums tracking-tight mt-1.5">
                {formatBRL(kpis?.paidExpenses.current)}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                <span className="text-zinc-500 font-normal">
                  Previsto a pagar: <span className="text-zinc-700 font-mono tabular-nums font-medium">{formatBRL(kpis?.projectedExpenses)}</span>
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Lançamentos liquidados</span>
              </div>
            </div>

            {/* Resultado Operacional Realizado */}
            <div className="bg-white border border-zinc-200 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">
                  Resultado realizado
                </span>
                <TrendingUp className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
              </div>
              <div className={`text-2xl font-semibold mt-1.5 font-mono tabular-nums tracking-tight ${(kpis?.realizedResult.current ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {formatBRL(kpis?.realizedResult.current)}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500">
                <span>Projetado:</span>
                <span className={`font-mono tabular-nums font-medium ${(kpis?.projectedResult ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {formatBRL(kpis?.projectedResult)}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Operação líquida</span>
              </div>
            </div>

            {/* MRR - Receita Mensal Recorrente */}
            <div className="bg-white border border-zinc-200 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">
                  MRR contratual ativo
                </span>
                <RefreshCw className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
              </div>
              <div className="text-2xl font-semibold text-zinc-950 font-mono tabular-nums tracking-tight mt-1.5">
                {formatBRL(kpis?.mrr.currentMrr)}
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                <span>{kpis?.mrr.monthlyContractsCount} mensais</span>
                <span>•</span>
                <span>{kpis?.mrr.yearlyContractsNormalizedCount} anuais norm.</span>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Contratações ativas:</span>
                <span className="text-zinc-800 font-mono tabular-nums font-medium">{kpis?.activeContractsCount} contratos</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. INADIMPLÊNCIA & GRÁFICOS DE EVOLUÇÃO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card de Inadimplência */}
          {isWidgetVisible("default_inadimplencia_card") && (
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-red-50 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-bold text-zinc-900">Painel de Inadimplência</h3>
                  </div>
                  <Link
                    href="/financial/receivables?status=OVERDUE"
                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                  >
                    Ver Títulos →
                  </Link>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-zinc-500 block mb-0.5">Saldo em Aberto Vencido</span>
                    <div className="text-3xl font-semibold text-red-600">
                      {formatBRL(kpis?.defaultRate.openOverdueBalance)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl">
                      <span className="text-[11px] text-red-800 font-semibold block">Valor Nominal Total</span>
                      <strong className="text-sm text-red-950 font-bold">
                        {formatBRL(kpis?.defaultRate.overdueAmount)}
                      </strong>
                    </div>
                    <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl">
                      <span className="text-[11px] text-zinc-600 font-semibold block">Títulos Vencidos</span>
                      <strong className="text-sm text-zinc-900 font-bold">
                        {kpis?.defaultRate.overdueTitlesCount} título(s)
                      </strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-500 leading-relaxed pt-2 border-t border-zinc-100">
                    O status atrasado considera exatamente o saldo restante em aberto após a data de vencimento, computando liquidações parciais sem perda de histórico.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-medium">
                <span className="text-zinc-500">Clientes Ativos na Base:</span>
                <strong className="text-zinc-900">{kpis?.activeClientsCount} clientes</strong>
              </div>
            </div>
          )}

          {/* Gráfico / Tabela de Evolução Mensal */}
          {isWidgetVisible("financial_evolution_chart") && (
            <div className="lg:col-span-2 bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                    <BarChart3 className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Evolução Financeira (Últimos 6 Meses)</h3>
                    <p className="text-[11px] text-zinc-400">Comparativo entre Recebido, Pago e MRR</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span className="text-zinc-600">Receita</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                    <span className="text-zinc-600">Despesa</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-700 inline-block" />
                    <span className="text-zinc-600">MRR</span>
                  </div>
                </div>
              </div>

              {evolution.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs">
                  Nenhum histórico disponível para o período selecionado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[11px] font-medium text-zinc-500">
                        <th className="py-2.5 px-3">Mês</th>
                        <th className="py-2.5 px-3 text-right">Receita Recebida</th>
                        <th className="py-2.5 px-3 text-right">Despesas Pagas</th>
                        <th className="py-2.5 px-3 text-right">Resultado</th>
                        <th className="py-2.5 px-3 text-right">MRR Base</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {evolution.map((item) => (
                        <tr key={item.month} className="hover:bg-zinc-50/50 transition">
                          <td className="py-2.5 px-3 font-semibold text-zinc-800">{item.month}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                            {formatBRL(item.receivedRevenue)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-red-600">
                            {formatBRL(item.paidExpenses)}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-bold ${item.realizedResult >= 0 ? "text-blue-600" : "text-amber-600"}`}>
                            {formatBRL(item.realizedResult)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-zinc-900">
                            {formatBRL(item.mrr)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. RANKING DE SERVIÇOS & CLIENTES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Serviços por Margem e Faturamento */}
          {isWidgetVisible("top_services_profitability") && (
            <div className={`bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4 ${preferences.widgetSizes?.["top_services_profitability"] === "full" ? "lg:col-span-2" : ""}`}>
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <PieIcon className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Rentabilidade Estimada por Serviço</h3>
                    <p className="text-[11px] text-zinc-400">Receita Contratada menos Custo Unitário Alocado</p>
                  </div>
                </div>
                <a
                  href="/api/analytics/export?report=service_profitability&format=xlsx"
                  className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar
                </a>
              </div>

              {topServices.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-xs">
                  Nenhum serviço contratado no momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {topServices.slice(0, 5).map((s) => (
                    <div key={s.serviceId} className="p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-zinc-900">{s.serviceName}</span>
                        <span className="font-mono text-xs font-bold text-emerald-700">
                          {formatBRL(s.contractedRevenue)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <span>Margem Bruta: <strong className="text-zinc-700">{formatBRL(s.estimatedGrossMargin)}</strong> ({s.estimatedGrossMarginPercent}%)</span>
                        <span>{s.activeContractsCount} contrato(s)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Top Clientes */}
          {isWidgetVisible("top_clients_ranking") && (
            <div className={`bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4 ${preferences.widgetSizes?.["top_clients_ranking"] === "full" ? "lg:col-span-2" : ""}`}>
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                    <Users className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Ranking de Clientes por Recebimento</h3>
                    <p className="text-[11px] text-zinc-400">Total liquidado em caixa e saldo em aberto</p>
                  </div>
                </div>
                <a
                  href="/api/analytics/export?report=client_profitability&format=xlsx"
                  className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar
                </a>
              </div>

              {topClients.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-xs">
                  Nenhum cliente com movimentação registrada.
                </div>
              ) : (
                <div className="space-y-3">
                  {topClients.slice(0, 5).map((c) => (
                    <div key={c.clientId} className="p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-zinc-900 block">{c.clientName}</span>
                        <span className="text-[11px] text-zinc-500">
                          {c.activeContractsCount} contratação(ões) • Em aberto: {formatBRL(c.openBalanceAmount)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-emerald-600 block">
                          {formatBRL(c.totalReceivedAmount)}
                        </span>
                        {c.overdueAmount > 0 && (
                          <span className="text-[10px] text-red-600 font-bold block">
                            Vencido: {formatBRL(c.overdueAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
