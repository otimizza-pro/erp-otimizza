"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
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

  // Filtros Globais
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [presetPeriod, setPresetPeriod] = useState<"MONTH" | "QUARTER" | "YEAR" | "CUSTOM">("MONTH");

  // Modal de Personalização de Widgets
  const [customizingWidgets, setCustomizingWidgets] = useState(false);

  async function loadDashboardData() {
    setLoading(true);
    setErrorMsg("");
    try {
      const [resKpis, resEvol, resServ, resCli, resPref] = await Promise.all([
        fetch(`/api/analytics/overview?type=kpis&startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/analytics/overview?type=evolution&months=6`),
        fetch(`/api/analytics/overview?type=services_profitability`),
        fetch(`/api/analytics/overview?type=clients_profitability`),
        fetch(`/api/analytics/overview?type=preferences`),
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
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao carregar dados do dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, [startDate, endDate]);

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

  const formatBRL = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  const isWidgetVisible = (id: string) => preferences.visibleWidgets.includes(id);

  return (
    <AppShell activeSection="dashboard">
      <div className="space-y-6 pb-16">
        {/* Top Header & Global Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase">
                BI & Inteligência Financeira
              </span>
              <span className="text-xs text-zinc-400 font-medium">• Otimizza ERP</span>
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

            {/* Botão Personalizar Widgets */}
            <button
              onClick={() => setCustomizingWidgets(!customizingWidgets)}
              className="px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 flex items-center gap-1.5 transition"
              title="Personalizar quais cards e gráficos exibir no dashboard"
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
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Configurar Widgets Visíveis (Salvo para seu perfil)
              </span>
              <button
                onClick={() => setCustomizingWidgets(false)}
                className="text-xs text-zinc-500 hover:text-zinc-800 font-semibold"
              >
                Fechar
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { id: "kpis_summary", label: "Cards de KPIs Financeiros" },
                { id: "financial_evolution_chart", label: "Evolução Mensal (Receita x Despesa)" },
                { id: "mrr_evolution_card", label: "Indicador de MRR e Contratos" },
                { id: "default_inadimplencia_card", label: "Painel de Inadimplência" },
                { id: "revenue_composition", label: "Composição de Resultados" },
                { id: "top_services_profitability", label: "Rentabilidade por Serviço" },
                { id: "top_clients_ranking", label: "Ranking de Clientes" },
              ].map((w) => (
                <label key={w.id} className="flex items-center gap-2 cursor-pointer text-zinc-700">
                  <input
                    type="checkbox"
                    checked={preferences.visibleWidgets.includes(w.id)}
                    onChange={() => handleToggleWidget(w.id)}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{w.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* 1. CARDS DE KPIS EXECUTIVOS */}
        {isWidgetVisible("kpis_summary") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Receita Recebida */}
            <div className="bg-white border border-zinc-200/80 p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Receita Realizada (Caixa)
                </span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-zinc-950 mt-2">
                {formatBRL(kpis?.receivedRevenue.current)}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                {kpis?.receivedRevenue.delta && kpis.receivedRevenue.delta >= 0 ? (
                  <span className="inline-flex items-center text-emerald-600 font-bold">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    +{kpis.receivedRevenue.percentageChange ?? 0}%
                  </span>
                ) : (
                  <span className="inline-flex items-center text-red-600 font-bold">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    {kpis?.receivedRevenue.percentageChange ?? 0}%
                  </span>
                )}
                <span className="text-zinc-400">vs. período anterior</span>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Previsto por Vencimento:</span>
                <strong className="text-zinc-700">{formatBRL(kpis?.projectedRevenueDue)}</strong>
              </div>
            </div>

            {/* Despesas Pagas */}
            <div className="bg-white border border-zinc-200/80 p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Despesas Pagas (Saídas)
                </span>
                <span className="p-2 rounded-xl bg-red-50 text-red-600">
                  <TrendingDown className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-zinc-950 mt-2">
                {formatBRL(kpis?.paidExpenses.current)}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                <span className="text-zinc-500 font-medium">
                  Previsto a Pagar: <strong className="text-zinc-700">{formatBRL(kpis?.projectedExpenses)}</strong>
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Lançamentos liquidados sem estornos</span>
              </div>
            </div>

            {/* Resultado Operacional Realizado */}
            <div className="bg-white border border-zinc-200/80 p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Resultado Realizado
                </span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className={`text-2xl font-bold mt-2 ${(kpis?.realizedResult.current ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatBRL(kpis?.realizedResult.current)}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500">
                <span>Resultado Projetado:</span>
                <strong className={(kpis?.projectedResult ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"}>
                  {formatBRL(kpis?.projectedResult)}
                </strong>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Exclui transferências entre contas</span>
              </div>
            </div>

            {/* MRR - Receita Mensal Recorrente */}
            <div className="bg-white border border-zinc-200/80 p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  MRR Contratual Ativo
                </span>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <RefreshCw className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-purple-700 mt-2">
                {formatBRL(kpis?.mrr.currentMrr)}
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                <span>{kpis?.mrr.monthlyContractsCount} mensais</span>
                <span>•</span>
                <span>{kpis?.mrr.yearlyContractsNormalizedCount} anuais norm.</span>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Contratações ativas:</span>
                <strong className="text-zinc-800">{kpis?.activeContractsCount} contratos</strong>
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
                    <div className="text-3xl font-extrabold text-red-600">
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
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
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
                      <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[11px] font-semibold text-zinc-500 uppercase">
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
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-purple-700">
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
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
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
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
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
                        <span className="text-xs font-extrabold text-emerald-600 block">
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
    </AppShell>
  );
}
