"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Filter,
  DollarSign,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Users,
  PieChart as PieIcon,
  Search,
  Printer,
  Calendar,
  BarChart3,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Table,
  LayoutGrid,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  ServiceProfitabilityReportItem,
  ComboProfitabilityReportItem,
  ClientProfitabilityReportItem,
  ReceivablesDefaultReportItem,
  PayablesReportItem,
  CashflowComparisonReportItem,
  MrrEvolutionReportItem,
} from "@/modules/analytics/types";
import {
  SupplierExpenseSummary,
  ManagerialProfitabilityItem,
} from "@/modules/suppliers/types";
import {
  DonutChart,
  BarChartDual,
  AreaTrendChart,
  HorizontalRankingBars,
  AgingBucketsChart,
  formatBRL,
} from "@/components/analytics/report-charts";

export default function ReportsHubPage() {
  const [activeTab, setActiveTab] = useState<
    | "receivables_default"
    | "payables"
    | "service_profitability"
    | "combo_profitability"
    | "client_profitability"
    | "cashflow_comparison"
    | "mrr_evolution"
    | "suppliers_expenses"
    | "managerial_profitability"
  >("receivables_default");

  // Modo de visualização: Gráficos + Tabela, Apenas Gráficos, ou Apenas Tabela
  const [viewMode, setViewMode] = useState<"both" | "charts" | "tables">("both");

  // Dados dos relatórios
  const [receivablesData, setReceivablesData] = useState<ReceivablesDefaultReportItem[]>([]);
  const [payablesData, setPayablesData] = useState<PayablesReportItem[]>([]);
  const [servicesData, setServicesData] = useState<ServiceProfitabilityReportItem[]>([]);
  const [clientsData, setClientsData] = useState<ClientProfitabilityReportItem[]>([]);
  const [combosData, setCombosData] = useState<ComboProfitabilityReportItem[]>([]);
  const [cashflowData, setCashflowData] = useState<CashflowComparisonReportItem[]>([]);
  const [mrrData, setMrrData] = useState<MrrEvolutionReportItem[]>([]);
  const [suppliersData, setSuppliersData] = useState<SupplierExpenseSummary[]>([]);
  const [profitabilityData, setProfitabilityData] = useState<{
    items: ManagerialProfitabilityItem[];
    totals: Record<string, number>;
  }>({ items: [], totals: {} });
  const [profitabilityMonth, setProfitabilityMonth] = useState("2026-11");
  const [loading, setLoading] = useState(true);

  // Filtros de Liberdade Total
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "PAID" | "OPEN" | "OVERDUE">("all");
  const [datePreset, setDatePreset] = useState<
    "all" | "last_30_days" | "last_3_months" | "last_6_months" | "this_year" | "custom"
  >("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthsCount, setMonthsCount] = useState<number>(12);
  const [sortBy, setSortBy] = useState<"highest" | "lowest" | "date" | "name">("highest");

  // Tratar alteração do preset de período
  const handleDatePresetChange = (preset: typeof datePreset) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (preset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "last_30_days") {
      const d = new Date(today);
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === "last_3_months") {
      const d = new Date(today);
      d.setMonth(d.getMonth() - 3);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === "last_6_months") {
      const d = new Date(today);
      d.setMonth(d.getMonth() - 6);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === "this_year") {
      setStartDate(`${today.getFullYear()}-01-01`);
      setEndDate(todayStr);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setOnlyOverdue(false);
    setStatusFilter("all");
    setDatePreset("all");
    setStartDate("");
    setEndDate("");
    setSortBy("highest");
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    onlyOverdue ||
    statusFilter !== "all" ||
    datePreset !== "all" ||
    Boolean(startDate) ||
    Boolean(endDate);

  // Carregar dados da API
  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (onlyOverdue) params.set("onlyOverdue", "true");

      if (activeTab === "receivables_default") {
        params.set("type", "receivables_default");
        const res = await fetch(`/api/analytics/overview?${params.toString()}`);
        if (res.ok) setReceivablesData(await res.json());
      } else if (activeTab === "payables") {
        params.set("type", "payables");
        const res = await fetch(`/api/analytics/overview?${params.toString()}`);
        if (res.ok) setPayablesData(await res.json());
      } else if (activeTab === "service_profitability") {
        params.set("type", "services_profitability");
        const res = await fetch(`/api/analytics/overview?${params.toString()}`);
        if (res.ok) setServicesData(await res.json());
      } else if (activeTab === "client_profitability") {
        params.set("type", "clients_profitability");
        const res = await fetch("/api/analytics/overview?type=clients_profitability");
        if (res.ok) setClientsData(await res.json());
      } else if (activeTab === "combo_profitability") {
        params.set("type", "combos_profitability");
        const res = await fetch("/api/analytics/overview?type=combos_profitability");
        if (res.ok) setCombosData(await res.json());
      } else if (activeTab === "cashflow_comparison") {
        params.set("type", "cashflow_comparison");
        params.set("months", monthsCount.toString());
        const res = await fetch(`/api/analytics/overview?${params.toString()}`);
        if (res.ok) setCashflowData(await res.json());
      } else if (activeTab === "mrr_evolution") {
        params.set("type", "mrr_evolution");
        params.set("months", monthsCount.toString());
        const res = await fetch(`/api/analytics/overview?${params.toString()}`);
        if (res.ok) setMrrData(await res.json());
      } else if (activeTab === "suppliers_expenses") {
        const res = await fetch("/api/analytics/suppliers?type=expenses");
        if (res.ok) setSuppliersData(await res.json());
      } else if (activeTab === "managerial_profitability") {
        const res = await fetch(`/api/analytics/profitability?competency=${profitabilityMonth}`);
        if (res.ok) setProfitabilityData(await res.json());
      }
    } catch (e) {
      console.error("Erro ao carregar dados do relatório:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [activeTab, onlyOverdue, startDate, endDate, monthsCount, profitabilityMonth]);

  // Totalizadores Dinâmicos
  const filteredReceivables = useMemo(() => {
    return receivablesData
      .filter((r) => {
        const matchesSearch =
          !searchTerm ||
          r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.receivableNumber.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "PAID" && r.status === "PAID") ||
          (statusFilter === "OPEN" && r.balanceAmount > 0 && r.daysOverdue === 0) ||
          (statusFilter === "OVERDUE" && (r.status === "OVERDUE" || (r.balanceAmount > 0 && r.daysOverdue > 0)));
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "highest") return b.originalAmount - a.originalAmount;
        if (sortBy === "lowest") return a.originalAmount - b.originalAmount;
        if (sortBy === "date") return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        return a.clientName.localeCompare(b.clientName);
      });
  }, [receivablesData, searchTerm, statusFilter, sortBy]);

  const filteredPayables = useMemo(() => {
    return payablesData
      .filter((p) => {
        const matchesSearch =
          !searchTerm ||
          p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.payableNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.categoryName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "PAID" && p.status === "PAID") ||
          (statusFilter === "OPEN" && p.balanceAmount > 0 && p.daysOverdue === 0) ||
          (statusFilter === "OVERDUE" && (p.status === "OVERDUE" || (p.balanceAmount > 0 && p.daysOverdue > 0)));
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "highest") return b.originalAmount - a.originalAmount;
        if (sortBy === "lowest") return a.originalAmount - b.originalAmount;
        if (sortBy === "date") return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        return a.supplierName.localeCompare(b.supplierName);
      });
  }, [payablesData, searchTerm, statusFilter, sortBy]);

  const receivablesTotals = useMemo(() => {
    return filteredReceivables.reduce(
      (acc, curr) => ({
        orig: acc.orig + curr.originalAmount,
        paid: acc.paid + curr.paidAmount,
        bal: acc.bal + curr.balanceAmount,
      }),
      { orig: 0, paid: 0, bal: 0 }
    );
  }, [filteredReceivables]);

  const payablesTotals = useMemo(() => {
    return filteredPayables.reduce(
      (acc, curr) => ({
        orig: acc.orig + curr.originalAmount,
        paid: acc.paid + curr.paidAmount,
        bal: acc.bal + curr.balanceAmount,
      }),
      { orig: 0, paid: 0, bal: 0 }
    );
  }, [filteredPayables]);

  // Aging Buckets para Contas a Receber
  const receivablesAging = useMemo(() => {
    let current = 0;
    let upTo30 = 0;
    let upTo60 = 0;
    let over60 = 0;
    let countCurrent = 0;
    let count30 = 0;
    let count60 = 0;
    let countOver60 = 0;

    filteredReceivables.forEach((r) => {
      if (r.balanceAmount <= 0) return;
      if (r.daysOverdue <= 0) {
        current += r.balanceAmount;
        countCurrent++;
      } else if (r.daysOverdue <= 30) {
        upTo30 += r.balanceAmount;
        count30++;
      } else if (r.daysOverdue <= 60) {
        upTo60 += r.balanceAmount;
        count60++;
      } else {
        over60 += r.balanceAmount;
        countOver60++;
      }
    });

    return [
      { label: "Em Dia / A Vencer", count: countCurrent, amount: current, color: "#10b981", statusBadge: "Normal" },
      { label: "Atraso 1 a 30 dias", count: count30, amount: upTo30, color: "#eab308", statusBadge: "Atenção" },
      { label: "Atraso 31 a 60 dias", count: count60, amount: upTo60, color: "#f97316", statusBadge: "Crítico" },
      { label: "Atraso > 60 dias", count: countOver60, amount: over60, color: "#ef4444", statusBadge: "Alto Risco" },
    ];
  }, [filteredReceivables]);

  // Aging Buckets para Contas a Pagar
  const payablesAging = useMemo(() => {
    let current = 0;
    let upTo30 = 0;
    let upTo60 = 0;
    let over60 = 0;
    let countCurrent = 0;
    let count30 = 0;
    let count60 = 0;
    let countOver60 = 0;

    filteredPayables.forEach((p) => {
      if (p.balanceAmount <= 0) return;
      if (p.daysOverdue <= 0) {
        current += p.balanceAmount;
        countCurrent++;
      } else if (p.daysOverdue <= 30) {
        upTo30 += p.balanceAmount;
        count30++;
      } else if (p.daysOverdue <= 60) {
        upTo60 += p.balanceAmount;
        count60++;
      } else {
        over60 += p.balanceAmount;
        countOver60++;
      }
    });

    return [
      { label: "A Vencer", count: countCurrent, amount: current, color: "#3b82f6", statusBadge: "Programado" },
      { label: "Vencido 1 a 30 dias", count: count30, amount: upTo30, color: "#f59e0b", statusBadge: "Aviso" },
      { label: "Vencido 31 a 60 dias", count: count60, amount: upTo60, color: "#f97316", statusBadge: "Pendente" },
      { label: "Vencido > 60 dias", count: countOver60, amount: over60, color: "#dc2626", statusBadge: "Urgente" },
    ];
  }, [filteredPayables]);

  const exportUrl = `/api/analytics/export?report=${activeTab}&format=xlsx${
    onlyOverdue ? "&onlyOverdue=true" : ""
  }${startDate ? `&startDate=${startDate}` : ""}${endDate ? `&endDate=${endDate}` : ""}`;

  return (
    <AppShell activeSection="reports">
      <div className="space-y-6 pb-16">
        {/* Cabeçalho Principal */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-zinc-900 text-white">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
                  Central de Relatórios & BI Interativo
                </h1>
                <p className="text-xs text-zinc-500">
                  Análises gráficas, indicadores executivos e filtros dinâmicos de alta precisão.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Seletor de Modo de Visualização */}
            <div className="flex items-center p-1 bg-zinc-100 rounded-xl border border-zinc-200/80 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("both")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                  viewMode === "both"
                    ? "bg-white text-zinc-950 shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
                title="Visualizar Gráficos e Tabela integrada"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Completo</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("charts")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                  viewMode === "charts"
                    ? "bg-white text-zinc-950 shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
                title="Visualizar apenas Gráficos e KPIs"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Gráficos</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("tables")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                  viewMode === "tables"
                    ? "bg-white text-zinc-950 shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
                title="Visualizar apenas Tabela analítica"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tabelas</span>
              </button>
            </div>

            {/* Exportações */}
            <div className="flex items-center gap-2">
              <a
                href={exportUrl}
                className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 flex items-center gap-1.5 transition shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </a>
              <a
                href={`/api/analytics/export?report=${activeTab}&format=csv`}
                className="px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 flex items-center gap-1.5 transition shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5" /> CSV
              </a>
              <a
                href={`/api/analytics/export?report=${activeTab}&format=pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 flex items-center gap-1.5 transition shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" /> PDF
              </a>
            </div>
          </div>
        </div>

        {/* Abas de Navegação dos Relatórios */}
        <div className="flex items-center gap-2 border-b border-zinc-200 overflow-x-auto pb-1">
          {[
            { id: "receivables_default", label: "Contas a Receber e Inadimplência" },
            { id: "payables", label: "Contas a Pagar" },
            { id: "suppliers_expenses", label: "Gastos por Fornecedor" },
            { id: "managerial_profitability", label: "Rentabilidade por Competência" },
            { id: "service_profitability", label: "Rentabilidade por Serviço" },
            { id: "combo_profitability", label: "Rentabilidade por Combo" },
            { id: "client_profitability", label: "Receitas por Cliente" },
            { id: "cashflow_comparison", label: "Fluxo Previsto vs Realizado" },
            { id: "mrr_evolution", label: "MRR e Evolução de Contratos" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as typeof activeTab);
              }}
              className={`pb-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Painel Avançado de Filtros e Busca */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Pílulas de Filtro de Período Rápido */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-zinc-500 mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Período:
              </span>
              {[
                { id: "all", label: "Todos" },
                { id: "last_30_days", label: "Últimos 30 Dias" },
                { id: "last_3_months", label: "3 Meses" },
                { id: "last_6_months", label: "6 Meses" },
                { id: "this_year", label: "Este Ano" },
                { id: "custom", label: "Personalizado" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleDatePresetChange(p.id as typeof datePreset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    datePreset === p.id
                      ? "bg-zinc-900 text-white shadow-2xs"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Horizonte de Meses (para Fluxo de Caixa e MRR) */}
            {(activeTab === "cashflow_comparison" || activeTab === "mrr_evolution") && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-500">Horizonte:</span>
                {[3, 6, 12, 24].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonthsCount(m)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      monthsCount === m
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {m}M
                  </button>
                ))}
              </div>
            )}

            {/* Mês de Competência Gerencial */}
            {activeTab === "managerial_profitability" && (
              <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-200">
                <span className="text-xs font-semibold text-zinc-600">Competência:</span>
                <input
                  type="month"
                  value={profitabilityMonth}
                  onChange={(e) => setProfitabilityMonth(e.target.value)}
                  className="px-2.5 py-1 text-xs font-mono font-bold bg-white border border-zinc-300 rounded-lg text-zinc-900"
                />
              </div>
            )}
          </div>

          {/* Segunda Linha de Filtros: Datas Customizadas, Busca, Status e Ordenação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-zinc-100">
            {/* Campo de Busca Livre */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por nome, número, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtro de Status (para Contas a Pagar e Receber) */}
            {(activeTab === "receivables_default" || activeTab === "payables") ? (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="w-full px-3 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white font-medium text-zinc-700"
              >
                <option value="all">Status: Todos</option>
                <option value="PAID">Somente Pagos / Baixados</option>
                <option value="OPEN">Somente Pendentes (A Vencer)</option>
                <option value="OVERDUE">Somente Vencidos (Inadimplência)</option>
              </select>
            ) : (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="w-full px-3 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white font-medium text-zinc-700"
              >
                <option value="highest">Ordenar: Maior Valor</option>
                <option value="lowest">Ordenar: Menor Valor</option>
                <option value="name">Ordenar: Nome (A-Z)</option>
              </select>
            )}

            {/* Data Inicial */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-400 shrink-0">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white text-zinc-700 font-mono"
              />
            </div>

            {/* Data Final e Limpeza */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-400 shrink-0">Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white text-zinc-700 font-mono"
              />
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition whitespace-nowrap shrink-0"
                  title="Restaurar todos os filtros"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            SEÇÃO DE GRÁFICOS VISUAIS E INDICADORES (CONFORME ABA ATIVA)
            ========================================================================= */}
        {viewMode !== "tables" && (
          <div className="space-y-6">
            {/* 1. ABA: CONTAS A RECEBER E INADIMPLÊNCIA */}
            {activeTab === "receivables_default" && (
              <div className="space-y-6">
                {/* Indicadores Cards de Resumo */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 bg-white border border-zinc-200/80 rounded-2xl shadow-xs">
                    <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      Faturamento Total Emitido
                    </div>
                    <div className="text-xl font-extrabold text-zinc-950 mt-1 font-mono">
                      {formatBRL(receivablesTotals.orig)}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      {filteredReceivables.length} títulos localizados
                    </div>
                  </div>

                  <div className="p-5 bg-white border border-zinc-200/80 rounded-2xl shadow-xs">
                    <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                      Recebimentos Efetivados
                    </div>
                    <div className="text-xl font-extrabold text-emerald-700 mt-1 font-mono">
                      {formatBRL(receivablesTotals.paid)}
                    </div>
                    <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                      {receivablesTotals.orig > 0
                        ? `${((receivablesTotals.paid / receivablesTotals.orig) * 100).toFixed(1)}% do faturado`
                        : "0%"}
                    </div>
                  </div>

                  <div className="p-5 bg-white border border-zinc-200/80 rounded-2xl shadow-xs">
                    <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                      Inadimplência / Saldo Aberto
                    </div>
                    <div className="text-xl font-extrabold text-rose-700 mt-1 font-mono">
                      {formatBRL(receivablesTotals.bal)}
                    </div>
                    <div className="text-[11px] text-rose-600 font-semibold mt-0.5">
                      {receivablesTotals.orig > 0
                        ? `${((receivablesTotals.bal / receivablesTotals.orig) * 100).toFixed(1)}% em cobrança`
                        : "0%"}
                    </div>
                  </div>
                </div>

                {/* Gráficos Visuais */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico Donut de Status */}
                  <DonutChart
                    title="Distribuição do Contas a Receber"
                    subtitle="Proporção entre valores já recebidos, a vencer e em atraso"
                    data={[
                      {
                        label: "Recebido em Caixa",
                        value: receivablesTotals.paid,
                        color: "#10b981",
                        sublabel: "Liquidado",
                      },
                      {
                        label: "A Vencer (No Prazo)",
                        value: Math.max(0, receivablesAging[0]?.amount || 0),
                        color: "#3b82f6",
                        sublabel: "Dentro do vencimento",
                      },
                      {
                        label: "Inadimplente (Vencido)",
                        value: Math.max(
                          0,
                          (receivablesAging[1]?.amount || 0) +
                            (receivablesAging[2]?.amount || 0) +
                            (receivablesAging[3]?.amount || 0)
                        ),
                        color: "#ef4444",
                        sublabel: "Atrasado com saldo",
                      },
                    ]}
                  />

                  {/* Ranking dos Maiores Saldos Devedores por Cliente */}
                  <HorizontalRankingBars
                    title="Top Clientes por Saldo Aberto"
                    subtitle="Principais títulos com valores pendentes de liquidação"
                    items={Object.entries(
                      filteredReceivables.reduce((acc, curr) => {
                        if (curr.balanceAmount > 0) {
                          acc[curr.clientName] = (acc[curr.clientName] || 0) + curr.balanceAmount;
                        }
                        return acc;
                      }, {} as Record<string, number>)
                    )
                      .map(([name, val], idx) => ({
                        id: `client-${idx}`,
                        title: name,
                        value: val,
                        badge: "Pendente",
                      }))
                      .sort((a, b) => b.value - a.value)}
                    emptyMessage="Nenhum cliente com saldo devedor em aberto."
                  />
                </div>

                {/* Gráfico de Faixas de Vencimento / Aging */}
                <AgingBucketsChart
                  title="Termômetro de Inadimplência por Faixa de Atraso"
                  subtitle="Segregação da carteira a receber por tempo decorrido do vencimento"
                  brackets={receivablesAging}
                />
              </div>
            )}

            {/* 2. ABA: CONTAS A PAGAR */}
            {activeTab === "payables" && (
              <div className="space-y-6">
                {/* Indicadores Cards de Resumo */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 bg-white border border-zinc-200/80 rounded-2xl shadow-xs">
                    <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      Total de Obrigações Lançadas
                    </div>
                    <div className="text-xl font-extrabold text-zinc-950 mt-1 font-mono">
                      {formatBRL(payablesTotals.orig)}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      {filteredPayables.length} despesas contabilizadas
                    </div>
                  </div>

                  <div className="p-5 bg-white border border-zinc-200/80 rounded-2xl shadow-xs">
                    <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                      Despesas Pagas
                    </div>
                    <div className="text-xl font-extrabold text-emerald-700 mt-1 font-mono">
                      {formatBRL(payablesTotals.paid)}
                    </div>
                    <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                      {payablesTotals.orig > 0
                        ? `${((payablesTotals.paid / payablesTotals.orig) * 100).toFixed(1)}% liquidado`
                        : "0%"}
                    </div>
                  </div>

                  <div className="p-5 bg-white border border-zinc-200/80 rounded-2xl shadow-xs">
                    <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                      Saldo a Pagar
                    </div>
                    <div className="text-xl font-extrabold text-amber-700 mt-1 font-mono">
                      {formatBRL(payablesTotals.bal)}
                    </div>
                    <div className="text-[11px] text-amber-600 font-semibold mt-0.5">
                      {payablesTotals.orig > 0
                        ? `${((payablesTotals.bal / payablesTotals.orig) * 100).toFixed(1)}% a desembolsar`
                        : "0%"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico Donut de Status de Despesas */}
                  <DonutChart
                    title="Composição das Despesas Operacionais"
                    subtitle="Proporção entre desembolsos quitados e compromissos futuros"
                    data={[
                      {
                        label: "Total Pago",
                        value: payablesTotals.paid,
                        color: "#10b981",
                        sublabel: "Liquidado",
                      },
                      {
                        label: "A Pagar (Dentro do Prazo)",
                        value: Math.max(0, payablesAging[0]?.amount || 0),
                        color: "#3b82f6",
                        sublabel: "Programado",
                      },
                      {
                        label: "Vencido sem Pagamento",
                        value: Math.max(
                          0,
                          (payablesAging[1]?.amount || 0) +
                            (payablesAging[2]?.amount || 0) +
                            (payablesAging[3]?.amount || 0)
                        ),
                        color: "#f43f5e",
                        sublabel: "Em atraso",
                      },
                    ]}
                  />

                  {/* Ranking por Categoria de Custo */}
                  <HorizontalRankingBars
                    title="Despesas por Categoria"
                    subtitle="Principais centros de custo da agência"
                    items={Object.entries(
                      filteredPayables.reduce((acc, curr) => {
                        const cat = curr.categoryName || "Geral";
                        acc[cat] = (acc[cat] || 0) + curr.originalAmount;
                        return acc;
                      }, {} as Record<string, number>)
                    )
                      .map(([name, val], idx) => ({
                        id: `cat-${idx}`,
                        title: name,
                        value: val,
                        badge: `${((val / Math.max(1, payablesTotals.orig)) * 100).toFixed(1)}%`,
                      }))
                      .sort((a, b) => b.value - a.value)}
                  />
                </div>

                {/* Aging de Contas a Pagar */}
                <AgingBucketsChart
                  title="Cronograma de Vencimento de Despesas"
                  subtitle="Segregação de contas por data de vencimento e urgência"
                  brackets={payablesAging}
                />
              </div>
            )}

            {/* 3. ABA: GASTOS POR FORNECEDOR */}
            {activeTab === "suppliers_expenses" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Donut de Participação por Fornecedor */}
                  <DonutChart
                    title="Participação dos Fornecedores nos Custos"
                    subtitle="Fatia percentual de cada parceiro homologado nas despesas da agência"
                    data={suppliersData.slice(0, 6).map((s, idx) => ({
                      label: s.supplierName,
                      value: s.totalOriginalPayables,
                      color: ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#64748b"][idx % 6],
                      sublabel: s.category,
                    }))}
                  />

                  {/* Ranking de Gastos por Fornecedor */}
                  <HorizontalRankingBars
                    title="Top Fornecedores por Volume Financeiro"
                    subtitle="Parceiros com maior volume de contratações e pagamentos"
                    items={suppliersData.map((s) => ({
                      id: s.supplierId,
                      title: s.supplierName,
                      subtitle: `${s.category} • ${s.activeContractsCount} contratos`,
                      value: s.totalOriginalPayables,
                      badge: `Alocado: ${formatBRL(s.totalAllocatedToContracts)}`,
                    }))}
                  />
                </div>
              </div>
            )}

            {/* 4. ABA: RENTABILIDADE POR COMPETÊNCIA */}
            {activeTab === "managerial_profitability" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 bg-white border border-zinc-200/80 rounded-2xl shadow-xs">
                    <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      Receita Reconhecida no Período
                    </div>
                    <div className="text-xl font-extrabold text-zinc-950 mt-1 font-mono">
                      {formatBRL(profitabilityData.totals?.recognizedRevenue || 0)}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">Competência: {profitabilityMonth}</div>
                  </div>

                  <div className="p-5 bg-white border border-zinc-200/80 rounded-2xl shadow-xs">
                    <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                      Custos de Parceiros & Fornecedores
                    </div>
                    <div className="text-xl font-extrabold text-rose-700 mt-1 font-mono">
                      {formatBRL(profitabilityData.totals?.accruedRealCost || 0)}
                    </div>
                    <div className="text-[11px] text-rose-600 font-semibold mt-0.5">Apropriados a contratos</div>
                  </div>

                  <div className="p-5 bg-white border border-zinc-200/80 rounded-2xl shadow-xs">
                    <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                      Margem Bruta Realizada
                    </div>
                    <div className="text-xl font-extrabold text-emerald-700 mt-1 font-mono">
                      {formatBRL(profitabilityData.totals?.realizedGrossMargin || 0)}
                    </div>
                    <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                      Margem: {profitabilityData.totals?.realizedMarginPct || 0}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico de Barras Comparativo: Receita vs Custos */}
                  <BarChartDual
                    title="Receita Reconhecida vs Custo Apropriado por Serviço"
                    subtitle="Comparativo direto entre o faturamento e o custo operacional de entrega"
                    data={profitabilityData.items.slice(0, 7).map((item) => ({
                      label: item.serviceName,
                      valA: item.recognizedRevenue,
                      valB: item.accruedRealCost,
                      subinfo: `Margem: ${item.realizedMarginPct}%`,
                    }))}
                    labelA="Receita"
                    labelB="Custos"
                    colorA="#10b981"
                    colorB="#f43f5e"
                  />

                  {/* Ranking de Margem Realizada */}
                  <HorizontalRankingBars
                    title="Serviços Mais Lucrativos na Competência"
                    subtitle="Ordenados por margem bruta absoluta obtida"
                    items={profitabilityData.items.map((item, idx) => ({
                      id: `${item.serviceId}-${idx}`,
                      title: item.serviceName,
                      subtitle: item.clientName,
                      value: item.realizedGrossMargin,
                      badge: `${item.realizedMarginPct}% Margem`,
                    }))}
                  />
                </div>
              </div>
            )}

            {/* 5. ABA: RENTABILIDADE POR SERVIÇO */}
            {activeTab === "service_profitability" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico Donut de Faturamento por Categoria de Serviço */}
                  <DonutChart
                    title="Faturamento por Categoria de Serviço"
                    subtitle="Divisão percentual das receitas entre os tipos de soluções comercializadas"
                    data={Object.entries(
                      servicesData.reduce((acc, curr) => {
                        const cat = curr.categoryName || "Geral";
                        acc[cat] = (acc[cat] || 0) + curr.contractedRevenue;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([name, val], idx) => ({
                      label: name,
                      value: val,
                      color: ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4"][idx % 5],
                    }))}
                  />

                  {/* Ranking de Serviços por Faturamento Contratado */}
                  <HorizontalRankingBars
                    title="Top Serviços por Faturamento Contratado"
                    subtitle="Serviços com maior volume em carteira e margem estimada"
                    items={servicesData.map((s) => ({
                      id: s.serviceId,
                      title: s.serviceName,
                      subtitle: `${s.categoryName} • ${s.activeContractsCount} contratos`,
                      value: s.contractedRevenue,
                      badge: `${s.estimatedGrossMarginPercent}% Margem`,
                    }))}
                  />
                </div>
              </div>
            )}

            {/* 6. ABA: RENTABILIDADE POR COMBO */}
            {activeTab === "combo_profitability" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico Donut de Participação dos Combos */}
                  <DonutChart
                    title="Participação dos Pacotes Comerciais"
                    subtitle="Distribuição da receita recorrente entre os combos ativos"
                    data={combosData.map((cb, idx) => ({
                      label: cb.comboName,
                      value: cb.contractedRevenue,
                      color: ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#14b8a6"][idx % 5],
                      sublabel: `${cb.activeContractsCount} contratações`,
                    }))}
                  />

                  {/* Comparativo de Receita vs Custo por Combo */}
                  <BarChartDual
                    title="Receita Contratada vs Custo Direto por Combo"
                    subtitle="Margem de contribuição gerada por cada combo"
                    data={combosData.map((cb) => ({
                      label: cb.comboName,
                      valA: cb.contractedRevenue,
                      valB: cb.estimatedCost,
                      subinfo: `Margem: ${cb.estimatedGrossMarginPercent}%`,
                    }))}
                    labelA="Receita"
                    labelB="Custo Estimado"
                    colorA="#6366f1"
                    colorB="#f97316"
                  />
                </div>
              </div>
            )}

            {/* 7. ABA: RECEITAS POR CLIENTE */}
            {activeTab === "client_profitability" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Concentração de Carteira (Top 5 vs Demais) */}
                  <DonutChart
                    title="Concentração de Receitas na Carteira"
                    subtitle="Avaliação de risco de dependência entre principais clientes"
                    data={[
                      ...clientsData.slice(0, 5).map((c, idx) => ({
                        label: c.clientName,
                        value: c.totalReceivedAmount,
                        color: ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4"][idx % 5],
                      })),
                      {
                        label: "Demais Clientes da Carteira",
                        value: clientsData.slice(5).reduce((acc, curr) => acc + curr.totalReceivedAmount, 0),
                        color: "#94a3b8",
                      },
                    ]}
                  />

                  {/* Ranking dos Clientes Mais Valiosos */}
                  <HorizontalRankingBars
                    title="Top Clientes por Receita Recebida"
                    subtitle="Clientes com maior volume liquidado acumulado"
                    items={clientsData.map((c) => ({
                      id: c.clientId,
                      title: c.clientName,
                      subtitle: `${c.activeContractsCount} contratos ativos`,
                      value: c.totalReceivedAmount,
                      badge: c.overdueAmount > 0 ? `Vencido: ${formatBRL(c.overdueAmount)}` : "Em dia",
                    }))}
                  />
                </div>
              </div>
            )}

            {/* 8. ABA: FLUXO PREVISTO VS REALIZADO */}
            {activeTab === "cashflow_comparison" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Receitas: Previsto vs Realizado */}
                  <BarChartDual
                    title="Entradas de Caixa: Previsto vs Efetivamente Realizado"
                    subtitle="Comparativo de faturamento esperado vs liquidação na conta"
                    data={cashflowData.map((cf) => ({
                      label: cf.period,
                      valA: cf.projectedInflow,
                      valB: cf.realizedInflow,
                      subinfo: `Variação: ${formatBRL(cf.inflowVariance)}`,
                    }))}
                    labelA="Previsto"
                    labelB="Realizado"
                    colorA="#93c5fd" // Light blue
                    colorB="#10b981" // Emerald
                  />

                  {/* Despesas: Previsto vs Realizado */}
                  <BarChartDual
                    title="Saídas de Caixa: Previsto vs Desembolsado"
                    subtitle="Comparativo entre contas projetadas e desembolsos executados"
                    data={cashflowData.map((cf) => ({
                      label: cf.period,
                      valA: cf.projectedOutflow,
                      valB: cf.realizedOutflow,
                      subinfo: `Variação: ${formatBRL(cf.outflowVariance)}`,
                    }))}
                    labelA="Previsto"
                    labelB="Desembolsado"
                    colorA="#fca5a5" // Light red
                    colorB="#ef4444" // Deep red
                  />
                </div>

                {/* Tendência do Resultado Líquido de Caixa */}
                <AreaTrendChart
                  title="Evolução do Resultado Operacional Líquido Realizado"
                  subtitle="Sobra líquida mensal de caixa da agência (Receitas Realizadas - Despesas Pagas)"
                  data={cashflowData.map((cf) => ({
                    label: cf.period,
                    value: cf.realizedNet,
                    badge: cf.netVariance >= 0 ? "Superávit" : "Déficit",
                  }))}
                  lineColor="#3b82f6"
                />
              </div>
            )}

            {/* 9. ABA: MRR E EVOLUÇÃO DE CONTRATOS */}
            {activeTab === "mrr_evolution" && (
              <div className="space-y-6">
                {/* Gráfico de Linha / Área com Tendência do MRR */}
                <AreaTrendChart
                  title="Curva de Crescimento da Receita Mensal Recorrente (MRR)"
                  subtitle="Evolução contínua do faturamento recorrente garantido em contrato"
                  data={mrrData.map((m) => ({
                    label: m.period,
                    value: m.mrr,
                    badge: `${m.activeContractsCount} contratos`,
                  }))}
                  lineColor="#10b981"
                />

                {/* Novos Contratos vs Churn (Cancelamentos) */}
                <BarChartDual
                  title="Dinâmica de Carteira: Novos Contratos vs Cancelamentos (Churn)"
                  subtitle="Equilíbrio entre aquisições e cancelamentos mês a mês"
                  data={mrrData.map((m) => ({
                    label: m.period,
                    valA: m.newContractsCount,
                    valB: m.churnedContractsCount,
                    subinfo: `Ativos: ${m.activeContractsCount}`,
                  }))}
                  labelA="Novos Contratos (+)"
                  labelB="Cancelamentos (-)"
                  colorA="#10b981"
                  colorB="#f43f5e"
                />
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            SEÇÃO DE TABELAS ANALÍTICAS DETALHADAS
            ========================================================================= */}
        {viewMode !== "charts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Table className="w-4 h-4 text-zinc-500" />
                Demonstrativo Detalhado em Tabela
              </h3>
              <div className="text-xs text-zinc-500 font-medium">
                {activeTab === "receivables_default" && `${filteredReceivables.length} títulos listados`}
                {activeTab === "payables" && `${filteredPayables.length} títulos listados`}
                {activeTab === "service_profitability" && `${servicesData.length} serviços auditados`}
                {activeTab === "client_profitability" && `${clientsData.length} clientes na carteira`}
                {activeTab === "combo_profitability" && `${combosData.length} pacotes catalogados`}
                {activeTab === "cashflow_comparison" && `${cashflowData.length} competências apuradas`}
                {activeTab === "mrr_evolution" && `${mrrData.length} meses de evolução`}
                {activeTab === "suppliers_expenses" && `${suppliersData.length} fornecedores`}
                {activeTab === "managerial_profitability" && `${profitabilityData.items?.length || 0} apropriações`}
              </div>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs overflow-hidden">
              {loading ? (
                <div className="py-16 text-center text-zinc-400 text-xs">
                  Carregando dados do relatório...
                </div>
              ) : activeTab === "receivables_default" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50/75 text-[11px] font-semibold text-zinc-500 uppercase">
                        <th className="py-3 px-4">Número / Contrato</th>
                        <th className="py-3 px-4">Cliente</th>
                        <th className="py-3 px-4">Competência</th>
                        <th className="py-3 px-4">Vencimento</th>
                        <th className="py-3 px-4 text-right">Valor Original</th>
                        <th className="py-3 px-4 text-right">Recebido</th>
                        <th className="py-3 px-4 text-right">Saldo Aberto</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredReceivables.map((r) => (
                        <tr key={r.id} className="hover:bg-zinc-50/60 transition">
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-zinc-900">{r.receivableNumber}</span>
                            {r.contractNumber && (
                              <span className="text-[10px] text-zinc-400 block">{r.contractNumber}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-zinc-800">{r.clientName}</td>
                          <td className="py-3 px-4 text-zinc-600">{r.competency}</td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-zinc-700">
                              {new Date(r.dueDate + "T12:00:00").toLocaleDateString("pt-BR")}
                            </span>
                            {r.daysOverdue > 0 && r.balanceAmount > 0 && (
                              <span className="text-[10px] text-rose-600 font-bold block">
                                {r.daysOverdue} dias de atraso
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-zinc-900">
                            {formatBRL(r.originalAmount)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                            {formatBRL(r.paidAmount)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-bold ${
                              r.balanceAmount > 0 ? "text-rose-600" : "text-zinc-400"
                            }`}
                          >
                            {formatBRL(r.balanceAmount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.status === "PAID"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : r.status === "OVERDUE" || (r.balanceAmount > 0 && r.daysOverdue > 0)
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {r.status === "PAID"
                                ? "LIQUIDADO"
                                : r.daysOverdue > 0 && r.balanceAmount > 0
                                ? "VENCIDO"
                                : "A VENCER"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === "payables" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50/75 text-[11px] font-semibold text-zinc-500 uppercase">
                        <th className="py-3 px-4">Número</th>
                        <th className="py-3 px-4">Fornecedor</th>
                        <th className="py-3 px-4">Categoria</th>
                        <th className="py-3 px-4">Competência</th>
                        <th className="py-3 px-4">Vencimento</th>
                        <th className="py-3 px-4 text-right">Valor Original</th>
                        <th className="py-3 px-4 text-right">Pago</th>
                        <th className="py-3 px-4 text-right">Saldo Aberto</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredPayables.map((p) => (
                        <tr key={p.id} className="hover:bg-zinc-50/60 transition">
                          <td className="py-3 px-4 font-mono font-bold text-zinc-900">{p.payableNumber}</td>
                          <td className="py-3 px-4 font-medium text-zinc-800">{p.supplierName}</td>
                          <td className="py-3 px-4 text-zinc-600">{p.categoryName}</td>
                          <td className="py-3 px-4 text-zinc-600">{p.competency}</td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-zinc-700">
                              {new Date(p.dueDate + "T12:00:00").toLocaleDateString("pt-BR")}
                            </span>
                            {p.daysOverdue > 0 && p.balanceAmount > 0 && (
                              <span className="text-[10px] text-rose-600 font-bold block">
                                {p.daysOverdue} dias de atraso
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-zinc-900">
                            {formatBRL(p.originalAmount)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                            {formatBRL(p.paidAmount)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-bold ${
                              p.balanceAmount > 0 ? "text-amber-600" : "text-zinc-400"
                            }`}
                          >
                            {formatBRL(p.balanceAmount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.status === "PAID"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : p.status === "OVERDUE" || (p.balanceAmount > 0 && p.daysOverdue > 0)
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {p.status === "PAID"
                                ? "PAGO"
                                : p.daysOverdue > 0 && p.balanceAmount > 0
                                ? "VENCIDO"
                                : "A PAGAR"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === "service_profitability" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50/75 text-[11px] font-semibold text-zinc-500 uppercase">
                        <th className="py-3 px-4">Serviço</th>
                        <th className="py-3 px-4">Categoria</th>
                        <th className="py-3 px-4 text-right">Receita Contratada</th>
                        <th className="py-3 px-4 text-right">Custo Estimado</th>
                        <th className="py-3 px-4 text-right">Despesa Direta Realizada</th>
                        <th className="py-3 px-4 text-right">Margem Bruta Estimada</th>
                        <th className="py-3 px-4 text-right">Contratos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {servicesData
                        .filter((s) => !searchTerm || s.serviceName.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((s) => (
                          <tr key={s.serviceId} className="hover:bg-zinc-50/60 transition">
                            <td className="py-3 px-4 font-bold text-zinc-900">{s.serviceName}</td>
                            <td className="py-3 px-4 text-zinc-600">{s.categoryName}</td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-600">
                              {formatBRL(s.contractedRevenue)}
                            </td>
                            <td className="py-3 px-4 text-right text-zinc-600">{formatBRL(s.estimatedCost)}</td>
                            <td className="py-3 px-4 text-right font-medium text-rose-600">
                              {formatBRL(s.realizedExpenseAllocated)}
                            </td>
                            <td className="py-3 px-4 text-right font-extrabold text-blue-700">
                              {formatBRL(s.estimatedGrossMargin)} ({s.estimatedGrossMarginPercent}%)
                            </td>
                            <td className="py-3 px-4 text-right text-zinc-700">{s.activeContractsCount}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === "client_profitability" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50/75 text-[11px] font-semibold text-zinc-500 uppercase">
                        <th className="py-3 px-4">Cliente</th>
                        <th className="py-3 px-4">Documento</th>
                        <th className="py-3 px-4 text-right">Total Contratado</th>
                        <th className="py-3 px-4 text-right">Recebido (Caixa)</th>
                        <th className="py-3 px-4 text-right">Saldo Aberto</th>
                        <th className="py-3 px-4 text-right">Saldo Vencido</th>
                        <th className="py-3 px-4 text-right">Contratos Ativos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {clientsData
                        .filter((c) => !searchTerm || c.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((c) => (
                          <tr key={c.clientId} className="hover:bg-zinc-50/60 transition">
                            <td className="py-3 px-4 font-bold text-zinc-900">{c.clientName}</td>
                            <td className="py-3 px-4 text-zinc-500 font-mono">{c.clientDocument || "-"}</td>
                            <td className="py-3 px-4 text-right font-medium text-zinc-900">
                              {formatBRL(c.totalContractedAmount)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-600">
                              {formatBRL(c.totalReceivedAmount)}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-zinc-700">
                              {formatBRL(c.openBalanceAmount)}
                            </td>
                            <td
                              className={`py-3 px-4 text-right font-bold ${
                                c.overdueAmount > 0 ? "text-rose-600" : "text-zinc-400"
                              }`}
                            >
                              {formatBRL(c.overdueAmount)}
                            </td>
                            <td className="py-3 px-4 text-right text-zinc-700">{c.activeContractsCount}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === "combo_profitability" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50/75 text-[11px] font-semibold text-zinc-500 uppercase">
                        <th className="py-3 px-4">Combo</th>
                        <th className="py-3 px-4 text-right">Receita Contratada</th>
                        <th className="py-3 px-4 text-right">Custo Estimado</th>
                        <th className="py-3 px-4 text-right">Margem Bruta Estimada</th>
                        <th className="py-3 px-4 text-right">Contratos Ativos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {combosData
                        .filter((cb) => !searchTerm || cb.comboName.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((cb) => (
                          <tr key={cb.comboId} className="hover:bg-zinc-50/60 transition">
                            <td className="py-3 px-4 font-bold text-zinc-900">{cb.comboName}</td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-600">
                              {formatBRL(cb.contractedRevenue)}
                            </td>
                            <td className="py-3 px-4 text-right text-zinc-600">{formatBRL(cb.estimatedCost)}</td>
                            <td className="py-3 px-4 text-right font-extrabold text-blue-700">
                              {formatBRL(cb.estimatedGrossMargin)} ({cb.estimatedGrossMarginPercent}%)
                            </td>
                            <td className="py-3 px-4 text-right text-zinc-700">{cb.activeContractsCount}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === "cashflow_comparison" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50/75 text-[11px] font-semibold text-zinc-500 uppercase">
                        <th className="py-3 px-4">Mês Competência</th>
                        <th className="py-3 px-4 text-right">Receita Prevista</th>
                        <th className="py-3 px-4 text-right">Receita Realizada</th>
                        <th className="py-3 px-4 text-right">Despesa Prevista</th>
                        <th className="py-3 px-4 text-right">Despesa Realizada</th>
                        <th className="py-3 px-4 text-right">Resultado Previsto</th>
                        <th className="py-3 px-4 text-right">Resultado Realizado</th>
                        <th className="py-3 px-4 text-right">Variação Líquida</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {cashflowData.map((cf) => (
                        <tr key={cf.period} className="hover:bg-zinc-50/60 transition">
                          <td className="py-3 px-4 font-bold text-zinc-900">{cf.period}</td>
                          <td className="py-3 px-4 text-right text-zinc-700">{formatBRL(cf.projectedInflow)}</td>
                          <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                            {formatBRL(cf.realizedInflow)}
                          </td>
                          <td className="py-3 px-4 text-right text-zinc-700">{formatBRL(cf.projectedOutflow)}</td>
                          <td className="py-3 px-4 text-right font-semibold text-rose-600">
                            {formatBRL(cf.realizedOutflow)}
                          </td>
                          <td className="py-3 px-4 text-right text-zinc-700">{formatBRL(cf.projectedNet)}</td>
                          <td className="py-3 px-4 text-right font-bold text-blue-700">{formatBRL(cf.realizedNet)}</td>
                          <td
                            className={`py-3 px-4 text-right font-extrabold ${
                              cf.netVariance >= 0 ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {formatBRL(cf.netVariance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === "mrr_evolution" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50/75 text-[11px] font-semibold text-zinc-500 uppercase">
                        <th className="py-3 px-4">Mês</th>
                        <th className="py-3 px-4 text-right">MRR Consolidado</th>
                        <th className="py-3 px-4 text-right">Contratos Ativos</th>
                        <th className="py-3 px-4 text-right">Novos Contratos</th>
                        <th className="py-3 px-4 text-right">Cancelamentos (Churn)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {mrrData.map((m) => (
                        <tr key={m.period} className="hover:bg-zinc-50/60 transition">
                          <td className="py-3 px-4 font-bold text-zinc-900">{m.period}</td>
                          <td className="py-3 px-4 text-right font-extrabold text-emerald-600">{formatBRL(m.mrr)}</td>
                          <td className="py-3 px-4 text-right font-semibold text-zinc-800">{m.activeContractsCount}</td>
                          <td className="py-3 px-4 text-right text-emerald-600 font-bold">+{m.newContractsCount}</td>
                          <td className="py-3 px-4 text-right text-rose-600 font-bold">-{m.churnedContractsCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === "suppliers_expenses" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50/75 text-[11px] font-semibold text-zinc-500 uppercase">
                        <th className="py-3 px-4">Código / Fornecedor</th>
                        <th className="py-3 px-4">Categoria</th>
                        <th className="py-3 px-4 text-right">Total Despesas</th>
                        <th className="py-3 px-4 text-right">Total Pago</th>
                        <th className="py-3 px-4 text-right">Saldo Aberto</th>
                        <th className="py-3 px-4 text-right">Alocado a Contratos</th>
                        <th className="py-3 px-4 text-center">Contratos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {suppliersData.map((s) => (
                        <tr key={s.supplierId} className="hover:bg-zinc-50/60 transition">
                          <td className="py-3 px-4 font-semibold text-zinc-900">
                            {s.supplierName}{" "}
                            <span className="font-mono text-[10px] text-zinc-400 font-normal">({s.supplierCode})</span>
                          </td>
                          <td className="py-3 px-4 text-zinc-600">{s.category}</td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-zinc-950">
                            {formatBRL(s.totalOriginalPayables)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-700">{formatBRL(s.totalPaid)}</td>
                          <td className="py-3 px-4 text-right font-mono text-amber-700 font-semibold">
                            {formatBRL(s.totalOpenPayables)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-blue-700 font-bold">
                            {formatBRL(s.totalAllocatedToContracts)}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">{s.activeContractsCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50/75 text-[11px] font-semibold text-zinc-500 uppercase">
                        <th className="py-3 px-4">Serviço / Cliente</th>
                        <th className="py-3 px-4 text-right">Rec. Contratada</th>
                        <th className="py-3 px-4 text-right">Rec. Faturada</th>
                        <th className="py-3 px-4 text-right">Rec. Recebida</th>
                        <th className="py-3 px-4 text-right">Rec. Reconhecida</th>
                        <th className="py-3 px-4 text-right">Custo Estimado</th>
                        <th className="py-3 px-4 text-right">Custo Apropriado</th>
                        <th className="py-3 px-4 text-right">Custo Legado</th>
                        <th className="py-3 px-4 text-right">Margem Realizada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {profitabilityData.items?.map((item: ManagerialProfitabilityItem, idx: number) => (
                        <tr key={`${item.serviceId}-${idx}`} className="hover:bg-zinc-50/60 transition">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-zinc-900">{item.serviceName}</div>
                            <div className="text-[10px] text-zinc-400">{item.clientName}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-zinc-600">
                            {formatBRL(item.contractedRevenue)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-zinc-600">
                            {formatBRL(item.invoicedRevenue)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-zinc-600">
                            {formatBRL(item.receivedRevenue)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-zinc-950">
                            {formatBRL(item.recognizedRevenue)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-zinc-500">
                            {formatBRL(item.estimatedDirectCost)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-rose-700">
                            {formatBRL(item.accruedRealCost)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-amber-700">
                            {item.unclassifiedLegacyCost > 0 ? (
                              <span title="Custo legado sem periodicidade classificada">
                                {formatBRL(item.unclassifiedLegacyCost)}*
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700">
                            {formatBRL(item.realizedGrossMargin)} ({item.realizedMarginPct}%)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
