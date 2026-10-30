"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Filter,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { CashflowReportItem, ProfitabilityReportItem } from "@/modules/financial/types";

export default function CashflowPage() {
  const [activeTab, setActiveTab] = useState<"cashflow" | "profitability">("cashflow");
  const [startDate, setStartDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState(`${new Date().getFullYear()}-12-31`);
  const [reportData, setReportData] = useState<{
    items: CashflowReportItem[];
    totalRealizedInflow: number;
    totalRealizedOutflow: number;
    totalProjectedInflow: number;
    totalProjectedOutflow: number;
  }>({
    items: [],
    totalRealizedInflow: 0,
    totalRealizedOutflow: 0,
    totalProjectedInflow: 0,
    totalProjectedOutflow: 0,
  });
  const [profitability, setProfitability] = useState<ProfitabilityReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "cashflow") {
        const res = await fetch(`/api/financial/cashflow?startDate=${startDate}&endDate=${endDate}`);
        if (res.ok) {
          const data = await res.json();
          setReportData(data);
        }
      } else {
        const res = await fetch("/api/financial/cashflow?type=profitability");
        if (res.ok) {
          const data = await res.json();
          setProfitability(data.profitability || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, startDate, endDate]);

  return (
    <AppShell activeSection="cashflow">
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <span className="text-xs font-mono font-medium text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Financeiro • Inteligência & Fluxo de Caixa
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mt-2">
              Fluxo de Caixa & Rentabilidade
            </h1>
            <p className="text-sm text-zinc-600 mt-1">
              Visão consolidada entre regime de caixa (realizado) e competência futura (previsto).
            </p>
          </div>

          <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setActiveTab("cashflow")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "cashflow" ? "bg-white text-zinc-950 font-bold shadow-xs" : "text-zinc-600"
              }`}
            >
              Fluxo de Caixa
            </button>
            <button
              onClick={() => setActiveTab("profitability")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "profitability" ? "bg-white text-zinc-950 font-bold shadow-xs" : "text-zinc-600"
              }`}
            >
              Rentabilidade por Serviço
            </button>
          </div>
        </div>

        {activeTab === "cashflow" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Entradas Realizadas</p>
                <p className="text-2xl font-bold text-emerald-800 mt-1">
                  R$ {reportData.totalRealizedInflow.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs">
                <p className="text-xs font-medium text-rose-600 uppercase tracking-wider">Saídas Realizadas</p>
                <p className="text-2xl font-bold text-rose-700 mt-1">
                  R$ {reportData.totalRealizedOutflow.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Saldo Líquido Realizado</p>
                <p className={`text-2xl font-bold mt-1 ${
                  reportData.totalRealizedInflow - reportData.totalRealizedOutflow >= 0 ? "text-zinc-950" : "text-rose-600"
                }`}>
                  R$ {(reportData.totalRealizedInflow - reportData.totalRealizedOutflow).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs">
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Previsão em Aberto</p>
                <p className="text-2xl font-bold text-blue-800 mt-1">
                  R$ {(reportData.totalProjectedInflow - reportData.totalProjectedOutflow).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Date Filters */}
            <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <label className="font-semibold text-zinc-700">Período de Análise:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg"
                />
                <span className="text-zinc-400">até</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg"
                />
              </div>
            </div>

            {/* Cashflow Table */}
            <div className="bg-white rounded-xl border border-zinc-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 uppercase font-medium">
                    <tr>
                      <th className="px-6 py-3">Data</th>
                      <th className="px-6 py-3 text-emerald-700">Entradas (Realizado)</th>
                      <th className="px-6 py-3 text-rose-700">Saídas (Realizado)</th>
                      <th className="px-6 py-3">Resultado Diário</th>
                      <th className="px-6 py-3 text-blue-700">Previsto em Aberto</th>
                      <th className="px-6 py-3 text-right">Saldo Acumulado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/80">
                    {reportData.items.map((row) => (
                      <tr key={row.period} className="hover:bg-zinc-50/50">
                        <td className="px-6 py-3.5 font-semibold text-zinc-900">{row.period}</td>
                        <td className="px-6 py-3.5 text-emerald-800 font-medium">
                          R$ {row.realizedInflow.toFixed(2)}
                        </td>
                        <td className="px-6 py-3.5 text-rose-700 font-medium">
                          R$ {row.realizedOutflow.toFixed(2)}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-zinc-900">
                          R$ {row.realizedNet.toFixed(2)}
                        </td>
                        <td className="px-6 py-3.5 text-blue-700 font-medium">
                          R$ {row.projectedNet.toFixed(2)}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-zinc-950">
                          R$ {row.accumulatedBalance.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "profitability" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-zinc-200/80 shadow-xs space-y-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Margem Bruta Contratada por Serviço & Combo
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Cálculo rigoroso baseado nos snapshots imutáveis de preço e custo unitário customizado de cada contratação ativa.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-medium">
                    <tr>
                      <th className="px-4 py-3">Serviço / Componente</th>
                      <th className="px-4 py-3">Categoria</th>
                      <th className="px-4 py-3 text-right">Receita Contratada Atribuída</th>
                      <th className="px-4 py-3 text-right">Custo Direto Alocado</th>
                      <th className="px-4 py-3 text-right">Margem Bruta</th>
                      <th className="px-4 py-3 text-right">Margem %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {profitability.map((p) => (
                      <tr key={p.serviceId} className="hover:bg-zinc-50/50">
                        <td className="px-4 py-3 font-semibold text-zinc-900">{p.serviceName}</td>
                        <td className="px-4 py-3 text-zinc-500">{p.categoryName}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-800">
                          R$ {p.assignedRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-zinc-600">
                          R$ {p.allocatedDirectCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-zinc-950">
                          R$ {p.grossMargin.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {p.marginPercentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
