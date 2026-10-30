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
} from "lucide-react";
import {
  ServiceProfitabilityReportItem,
  ComboProfitabilityReportItem,
  ClientProfitabilityReportItem,
  ReceivablesDefaultReportItem,
} from "@/modules/analytics/types";

export default function ReportsHubPage() {
  const [activeTab, setActiveTab] = useState<
    "receivables_default" | "service_profitability" | "client_profitability" | "combo_profitability"
  >("receivables_default");

  const [receivablesData, setReceivablesData] = useState<ReceivablesDefaultReportItem[]>([]);
  const [servicesData, setServicesData] = useState<ServiceProfitabilityReportItem[]>([]);
  const [clientsData, setClientsData] = useState<ClientProfitabilityReportItem[]>([]);
  const [combosData, setCombosData] = useState<ComboProfitabilityReportItem[]>([]);
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
      } else if (activeTab === "service_profitability") {
        const res = await fetch("/api/analytics/overview?type=services_profitability");
        if (res.ok) setServicesData(await res.json());
      } else if (activeTab === "client_profitability") {
        const res = await fetch("/api/analytics/overview?type=clients_profitability");
        if (res.ok) setClientsData(await res.json());
      } else if (activeTab === "combo_profitability") {
        const res = await fetch("/api/analytics/overview?type=combos_profitability");
        if (res.ok) setCombosData(await res.json());
      }
    } catch (e) {
      console.error("Erro ao carregar dados do relatório:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [activeTab, onlyOverdue]);

  const formatBRL = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

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
              Demonstrativos detalhados de faturamento, inadimplência e rentabilidade por cliente e serviço.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/api/analytics/export?report=${activeTab}&format=xlsx${onlyOverdue ? "&onlyOverdue=true" : ""}`}
              className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-4 h-4" /> Exportar Excel (.xlsx)
            </a>
            <a
              href={`/api/analytics/export?report=${activeTab}&format=csv${onlyOverdue ? "&onlyOverdue=true" : ""}`}
              className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 flex items-center gap-1.5 transition"
            >
              <FileText className="w-4 h-4" /> Exportar CSV
            </a>
          </div>
        </div>

        {/* Tabs de Seleção de Relatórios */}
        <div className="flex items-center gap-2 border-b border-zinc-200 overflow-x-auto">
          {[
            { id: "receivables_default", label: "Contas a Receber e Inadimplência" },
            { id: "service_profitability", label: "Rentabilidade por Serviço" },
            { id: "client_profitability", label: "Receitas por Cliente" },
            { id: "combo_profitability", label: "Rentabilidade por Combo" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "receivables_default" | "service_profitability" | "client_profitability" | "combo_profitability")}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filtros da Tabela */}
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

          {activeTab === "receivables_default" && (
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
                    <th className="py-3 px-4 text-right">Margem Bruta</th>
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
          ) : (
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
          )}
        </div>
      </div>
    </AppShell>
  );
}
