"use client";

import React, { useEffect, useState } from "react";
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

  const [receivablesData, setReceivablesData] = useState<ReceivablesDefaultReportItem[]>([]);
  const [payablesData, setPayablesData] = useState<PayablesReportItem[]>([]);
  const [servicesData, setServicesData] = useState<ServiceProfitabilityReportItem[]>([]);
  const [clientsData, setClientsData] = useState<ClientProfitabilityReportItem[]>([]);
  const [combosData, setCombosData] = useState<ComboProfitabilityReportItem[]>([]);
  const [cashflowData, setCashflowData] = useState<CashflowComparisonReportItem[]>([]);
  const [mrrData, setMrrData] = useState<MrrEvolutionReportItem[]>([]);
  const [suppliersData, setSuppliersData] = useState<SupplierExpenseSummary[]>([]);
  const [profitabilityData, setProfitabilityData] = useState<{ items: ManagerialProfitabilityItem[]; totals: Record<string, number> }>({ items: [], totals: {} });
  const [profitabilityMonth, setProfitabilityMonth] = useState("2026-11");
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === "receivables_default") {
        const res = await fetch(`/api/analytics/overview?type=receivables_default&onlyOverdue=${onlyOverdue}`);
        if (res.ok) setReceivablesData(await res.json());
      } else if (activeTab === "payables") {
        const res = await fetch(`/api/analytics/overview?type=payables&onlyOverdue=${onlyOverdue}`);
        if (res.ok) setPayablesData(await res.json());
      } else if (activeTab === "service_profitability") {
        const res = await fetch("/api/analytics/overview?type=services_profitability");
        if (res.ok) setServicesData(await res.json());
      } else if (activeTab === "client_profitability") {
        const res = await fetch("/api/analytics/overview?type=clients_profitability");
        if (res.ok) setClientsData(await res.json());
      } else if (activeTab === "combo_profitability") {
        const res = await fetch("/api/analytics/overview?type=combos_profitability");
        if (res.ok) setCombosData(await res.json());
      } else if (activeTab === "cashflow_comparison") {
        const res = await fetch("/api/analytics/overview?type=cashflow_comparison&months=12");
        if (res.ok) setCashflowData(await res.json());
      } else if (activeTab === "mrr_evolution") {
        const res = await fetch("/api/analytics/overview?type=mrr_evolution&months=12");
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
  }, [activeTab, onlyOverdue, profitabilityMonth]);

  const formatBRL = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  // Cálculo de totalizadores dinâmicos
  const receivablesTotals = receivablesData
    .filter((r) => !searchTerm || r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || r.receivableNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    .reduce((acc, curr) => ({
      orig: acc.orig + curr.originalAmount,
      paid: acc.paid + curr.paidAmount,
      bal: acc.bal + curr.balanceAmount,
    }), { orig: 0, paid: 0, bal: 0 });

  const payablesTotals = payablesData
    .filter((p) => !searchTerm || p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) || p.payableNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    .reduce((acc, curr) => ({
      orig: acc.orig + curr.originalAmount,
      paid: acc.paid + curr.paidAmount,
      bal: acc.bal + curr.balanceAmount,
    }), { orig: 0, paid: 0, bal: 0 });

  return (
    <AppShell activeSection="dashboard">
      <div className="space-y-6 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
              Central de Relatórios Executivos
            </h1>
            <p className="text-xs text-zinc-500">
              Demonstrativos auditados de faturamento, rentabilidade, inadimplência e fluxo de caixa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/analytics/export?report=${activeTab}&format=xlsx${onlyOverdue ? "&onlyOverdue=true" : ""}`}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel (.xlsx)
            </a>
            <a
              href={`/api/analytics/export?report=${activeTab}&format=csv${onlyOverdue ? "&onlyOverdue=true" : ""}`}
              className="px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 flex items-center gap-1.5 transition"
            >
              <FileText className="w-4 h-4" /> CSV
            </a>
            <a
              href={`/api/analytics/export?report=${activeTab}&format=pdf${onlyOverdue ? "&onlyOverdue=true" : ""}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" /> Imprimir / PDF
            </a>
          </div>
        </div>

        {/* Tabs de Seleção de Relatórios */}
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
              onClick={() =>
                setActiveTab(
                  tab.id as
                    | "receivables_default"
                    | "payables"
                    | "service_profitability"
                    | "combo_profitability"
                    | "client_profitability"
                    | "cashflow_comparison"
                    | "mrr_evolution"
                )
              }
              className={`pb-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar no relatório..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          {(activeTab === "receivables_default" || activeTab === "payables") && (
            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer self-start sm:self-center">
              <input
                type="checkbox"
                checked={onlyOverdue}
                onChange={(e) => setOnlyOverdue(e.target.checked)}
                className="rounded border-zinc-300 text-red-600 focus:ring-red-500"
              />
              <span>Exibir somente títulos inadimplentes (vencidos com saldo)</span>
            </label>
          )}
        </div>

        {/* Totalizadores de Destaque */}
        {activeTab === "receivables_default" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-zinc-200 rounded-xl">
              <div className="text-[11px] font-semibold text-zinc-500 uppercase">Total Original Faturado</div>
              <div className="text-lg font-extrabold text-zinc-900 mt-0.5">{formatBRL(receivablesTotals.orig)}</div>
            </div>
            <div className="p-4 bg-white border border-zinc-200 rounded-xl">
              <div className="text-[11px] font-semibold text-zinc-500 uppercase">Total Efetivamente Recebido</div>
              <div className="text-lg font-extrabold text-emerald-600 mt-0.5">{formatBRL(receivablesTotals.paid)}</div>
            </div>
            <div className="p-4 bg-white border border-zinc-200 rounded-xl">
              <div className="text-[11px] font-semibold text-zinc-500 uppercase">Saldo em Aberto / Pendente</div>
              <div className={`text-lg font-extrabold mt-0.5 ${receivablesTotals.bal > 0 ? "text-red-600" : "text-zinc-900"}`}>
                {formatBRL(receivablesTotals.bal)}
              </div>
            </div>
          </div>
        )}

        {activeTab === "payables" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-zinc-200 rounded-xl">
              <div className="text-[11px] font-semibold text-zinc-500 uppercase">Total Original Despesas</div>
              <div className="text-lg font-extrabold text-zinc-900 mt-0.5">{formatBRL(payablesTotals.orig)}</div>
            </div>
            <div className="p-4 bg-white border border-zinc-200 rounded-xl">
              <div className="text-[11px] font-semibold text-zinc-500 uppercase">Total Pago</div>
              <div className="text-lg font-extrabold text-emerald-600 mt-0.5">{formatBRL(payablesTotals.paid)}</div>
            </div>
            <div className="p-4 bg-white border border-zinc-200 rounded-xl">
              <div className="text-[11px] font-semibold text-zinc-500 uppercase">Saldo a Pagar</div>
              <div className={`text-lg font-extrabold mt-0.5 ${payablesTotals.bal > 0 ? "text-amber-600" : "text-zinc-900"}`}>
                {formatBRL(payablesTotals.bal)}
              </div>
            </div>
          </div>
        )}

        {/* Tabelas de Dados */}
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
                  {receivablesData
                    .filter((r) => !searchTerm || r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || r.receivableNumber.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((r) => (
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
                          <span className="font-medium text-zinc-700">{new Date(r.dueDate + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                          {r.daysOverdue > 0 && r.balanceAmount > 0 && (
                            <span className="text-[10px] text-red-600 font-bold block">{r.daysOverdue} dias de atraso</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-zinc-900">{formatBRL(r.originalAmount)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600">{formatBRL(r.paidAmount)}</td>
                        <td className={`py-3 px-4 text-right font-bold ${r.balanceAmount > 0 ? "text-red-600" : "text-zinc-400"}`}>
                          {formatBRL(r.balanceAmount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700"
                              : r.status === "OVERDUE"
                              ? "bg-red-50 text-red-700"
                              : "bg-blue-50 text-blue-700"
                          }`}>
                            {r.status}
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
                  {payablesData
                    .filter((p) => !searchTerm || p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) || p.payableNumber.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50/60 transition">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-900">{p.payableNumber}</td>
                        <td className="py-3 px-4 font-medium text-zinc-800">{p.supplierName}</td>
                        <td className="py-3 px-4 text-zinc-600">{p.categoryName}</td>
                        <td className="py-3 px-4 text-zinc-600">{p.competency}</td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-zinc-700">{new Date(p.dueDate + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                          {p.daysOverdue > 0 && p.balanceAmount > 0 && (
                            <span className="text-[10px] text-red-600 font-bold block">{p.daysOverdue} dias de atraso</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-zinc-900">{formatBRL(p.originalAmount)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600">{formatBRL(p.paidAmount)}</td>
                        <td className={`py-3 px-4 text-right font-bold ${p.balanceAmount > 0 ? "text-amber-600" : "text-zinc-400"}`}>
                          {formatBRL(p.balanceAmount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700"
                              : p.status === "OVERDUE"
                              ? "bg-red-50 text-red-700"
                              : "bg-blue-50 text-blue-700"
                          }`}>
                            {p.status}
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
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">{formatBRL(s.contractedRevenue)}</td>
                        <td className="py-3 px-4 text-right text-zinc-600">{formatBRL(s.estimatedCost)}</td>
                        <td className="py-3 px-4 text-right font-medium text-red-600">{formatBRL(s.realizedExpenseAllocated)}</td>
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
                        <td className="py-3 px-4 text-right font-medium text-zinc-900">{formatBRL(c.totalContractedAmount)}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">{formatBRL(c.totalReceivedAmount)}</td>
                        <td className="py-3 px-4 text-right font-medium text-zinc-700">{formatBRL(c.openBalanceAmount)}</td>
                        <td className={`py-3 px-4 text-right font-bold ${c.overdueAmount > 0 ? "text-red-600" : "text-zinc-400"}`}>
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
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">{formatBRL(cb.contractedRevenue)}</td>
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
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600">{formatBRL(cf.realizedInflow)}</td>
                      <td className="py-3 px-4 text-right text-zinc-700">{formatBRL(cf.projectedOutflow)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-red-600">{formatBRL(cf.realizedOutflow)}</td>
                      <td className="py-3 px-4 text-right text-zinc-700">{formatBRL(cf.projectedNet)}</td>
                      <td className="py-3 px-4 text-right font-bold text-blue-700">{formatBRL(cf.realizedNet)}</td>
                      <td className={`py-3 px-4 text-right font-extrabold ${cf.netVariance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
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
                      <td className="py-3 px-4 text-right text-red-600 font-bold">-{m.churnedContractsCount}</td>
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
                        {s.supplierName} <span className="font-mono text-[10px] text-zinc-400 font-normal">({s.supplierCode})</span>
                      </td>
                      <td className="py-3 px-4 text-zinc-600">{s.category}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-zinc-950">{formatBRL(s.totalOriginalPayables)}</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">{formatBRL(s.totalPaid)}</td>
                      <td className="py-3 px-4 text-right font-mono text-amber-700 font-semibold">{formatBRL(s.totalOpenPayables)}</td>
                      <td className="py-3 px-4 text-right font-mono text-blue-700 font-bold">{formatBRL(s.totalAllocatedToContracts)}</td>
                      <td className="py-3 px-4 text-center font-mono">{s.activeContractsCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-zinc-700">Competência de Apuração:</span>
                  <input
                    type="month"
                    value={profitabilityMonth}
                    onChange={(e) => setProfitabilityMonth(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white font-mono text-xs text-zinc-900"
                  />
                </div>
                <div className="text-[11px] text-zinc-500">
                  Regime de Competência: Receita reconhecida no período vs Custos apropriados
                </div>
              </div>

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
                        <td className="py-3 px-4 text-right font-mono text-zinc-600">{formatBRL(item.contractedRevenue)}</td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-600">{formatBRL(item.invoicedRevenue)}</td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-600">{formatBRL(item.receivedRevenue)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-zinc-950">{formatBRL(item.recognizedRevenue)}</td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-500">{formatBRL(item.estimatedDirectCost)}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-red-700">{formatBRL(item.accruedRealCost)}</td>
                        <td className="py-3 px-4 text-right font-mono text-amber-700">
                          {item.unclassifiedLegacyCost > 0 ? (
                            <span title="Custo legado sem periodicidade classificada">{formatBRL(item.unclassifiedLegacyCost)}*</span>
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
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
