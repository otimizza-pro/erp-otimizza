"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  TrendingUp,
  Download,
  Filter,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Info,
} from "lucide-react";
import { DREPeriodStatement, AccountingMethod, CostCenterRecord } from "@/modules/financial/dre/types";

export default function DREPage() {
  const [accountingMethod, setAccountingMethod] = useState<AccountingMethod>("ACCRUAL");
  const [competency, setCompetency] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [costCenterId, setCostCenterId] = useState<string>("");
  const [costCenters, setCostCenters] = useState<CostCenterRecord[]>([]);

  const [statement, setStatement] = useState<DREPeriodStatement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de expansão de linhas na tabela
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    grossRevenue: true,
    directCosts: true,
    operationalExpenses: true,
    unclassified: false,
  });

  const loadCostCenters = useCallback(async () => {
    try {
      const res = await fetch("/api/financial/cost-centers");
      const json = await res.json();
      if (json.success) {
        setCostCenters(json.data);
      }
    } catch (err) {
      console.error("Erro ao carregar centros de custo:", err);
    }
  }, []);

  const loadDRE = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        method: accountingMethod,
        competency,
      });
      if (costCenterId) params.append("costCenterId", costCenterId);

      const res = await fetch(`/api/financial/dre?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Erro ao carregar DRE");
      }
      setStatement(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido ao carregar DRE.");
    } finally {
      setLoading(false);
    }
  }, [accountingMethod, competency, costCenterId]);

  useEffect(() => {
    loadCostCenters();
  }, [loadCostCenters]);

  useEffect(() => {
    loadDRE();
  }, [loadDRE]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams({
      method: accountingMethod,
      competency,
    });
    if (costCenterId) params.append("costCenterId", costCenterId);
    window.open(`/api/financial/dre/export?${params.toString()}`, "_blank");
  };

  const formatCurrency = (val: number | undefined) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);
  };

  const formatPct = (val: number | undefined) => {
    return `${(val || 0).toFixed(1)}%`;
  };

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
              <span>Financeiro</span>
              <span>/</span>
              <span className="text-slate-900 font-semibold">DRE Gerencial</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-indigo-600" />
              Demonstração do Resultado do Exercício
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Análise operacional e financeira integrada com conciliação rigorosa e visão gerencial.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-colors"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Exportar CSV
            </button>
            <button
              onClick={loadDRE}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Barra de Filtros e Seletor de Regime */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Seletor de Regime */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setAccountingMethod("ACCRUAL")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                accountingMethod === "ACCRUAL"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Regime de Competência
            </button>
            <button
              onClick={() => setAccountingMethod("CASH")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                accountingMethod === "CASH"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Regime de Caixa
            </button>
          </div>

          {/* Filtros de Competência e Centro de Custo */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Competência:</span>
              <input
                type="month"
                value={competency}
                onChange={(e) => setCompetency(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={costCenterId}
                onChange={(e) => setCostCenterId(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos os Centros de Custo</option>
                {costCenters.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.code} - {cc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Cards de Métricas Principais (KPIs) */}
        {statement && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500 block">
                {accountingMethod === "ACCRUAL" ? "Receita Reconhecida" : "Receita Recebida"}
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {formatCurrency(statement.netRevenue)}
              </div>
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                <ArrowUpRight className="w-3 h-3" />
                Receita Líquida Base
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500 block">Custos Diretos</span>
              <div className="text-xl font-bold text-rose-600 mt-1">
                {formatCurrency(statement.directCosts)}
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">
                {formatPct((statement.directCosts / (statement.netRevenue || 1)) * 100)} da receita
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500 block">Margem de Contribuição</span>
              <div className="text-xl font-bold text-indigo-600 mt-1">
                {formatCurrency(statement.contributionMargin)}
              </div>
              <span className="text-[11px] text-indigo-600 font-medium block mt-1">
                Margem: {formatPct(statement.contributionMarginPercentage)}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500 block">Despesas Operacionais</span>
              <div className="text-xl font-bold text-amber-600 mt-1">
                {formatCurrency(statement.operationalExpenses)}
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">
                {formatPct((statement.operationalExpenses / (statement.netRevenue || 1)) * 100)} da receita
              </span>
            </div>

            <div
              className={`border rounded-xl p-4 shadow-sm ${
                statement.operationalResult >= 0
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-rose-50 border-rose-200"
              }`}
            >
              <span className="text-xs font-medium text-slate-600 block">Resultado Operacional</span>
              <div
                className={`text-xl font-bold mt-1 ${
                  statement.operationalResult >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {formatCurrency(statement.operationalResult)}
              </div>
              <span
                className={`text-[11px] font-medium flex items-center gap-1 mt-1 ${
                  statement.operationalResult >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {statement.operationalResult >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                Margem: {formatPct(statement.operationalResultPercentage)}
              </span>
            </div>
          </div>
        )}

        {/* Alerta de Lançamentos Não Classificados */}
        {statement && statement.unclassified.count > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-900">
                    Atenção: {statement.unclassified.count} lançamento(s) pendente(s) de classificação gerencial
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Total de <strong>{formatCurrency(statement.unclassified.total)}</strong> em títulos deste período ainda não foram vinculados a um plano de contas gerencial ou centro de custo.
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleSection("unclassified")}
                className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline shrink-0 ml-4"
              >
                {expandedSections.unclassified ? "Ocultar detalhes" : "Ver pendências"}
              </button>
            </div>

            {expandedSections.unclassified && (
              <div className="mt-3 pt-3 border-t border-amber-200/60 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-amber-800 font-semibold border-b border-amber-200">
                      <th className="pb-1.5">Data</th>
                      <th className="pb-1.5">Descrição</th>
                      <th className="pb-1.5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-200/40">
                    {statement.unclassified.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-1 text-slate-700">{it.date}</td>
                        <td className="py-1 text-slate-800 font-medium">{it.description}</td>
                        <td className="py-1 text-right text-amber-900 font-semibold">
                          {formatCurrency(it.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Banner de Conciliação e Integridade Gerencial */}
        {statement && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-800 mb-2">
              <Info className="w-4 h-4 text-indigo-600" />
              <span>Painel de Conciliação e Integridade de Indicadores</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-slate-500 block">Receita Contratada:</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(statement.reconciliationKpis.contractedRevenue)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Receita Faturada (Emitida):</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(statement.reconciliationKpis.invoicedRevenue)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Receita no Caixa Realizada:</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(statement.reconciliationKpis.receivedCash)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Custos Diretos Apropriados:</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(statement.reconciliationKpis.appropriatedCost)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tabela Estruturada da DRE */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Demonstrativo Hierárquico ({accountingMethod === "ACCRUAL" ? "Competência" : "Caixa"}) - {competency}
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Valores em Reais (BRL)
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              Processando e conciliando lançamentos da DRE...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 text-sm">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
              {error}
            </div>
          ) : statement ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-20">Código</th>
                    <th className="py-3 px-4">Estrutura de Contas</th>
                    <th className="py-3 px-4 text-right w-44">Valor (R$)</th>
                    <th className="py-3 px-4 text-right w-28">% Margem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* 1. Receita Bruta */}
                  <tr
                    onClick={() => toggleSection("grossRevenue")}
                    className="hover:bg-slate-50/80 cursor-pointer font-semibold text-slate-900"
                  >
                    <td className="py-2.5 px-4 text-indigo-600 font-mono text-xs">1</td>
                    <td className="py-2.5 px-4 flex items-center gap-2">
                      {expandedSections.grossRevenue ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                      Receita Bruta Reconhecida
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-700">
                      {formatCurrency(statement.grossRevenue)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-400">-</td>
                  </tr>

                  {expandedSections.grossRevenue &&
                    statement.grossRevenueItems.map((item) => (
                      <tr key={item.id} className="bg-slate-50/40 text-xs text-slate-600">
                        <td className="py-2 px-4 pl-8 font-mono text-slate-400">{item.code}</td>
                        <td className="py-2 px-4 pl-10">{item.name}</td>
                        <td className="py-2 px-4 text-right font-medium text-slate-800">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="py-2 px-4 text-right text-slate-400">-</td>
                      </tr>
                    ))}

                  {/* 2. Deduções e Impostos */}
                  <tr className="hover:bg-slate-50 text-slate-700 text-xs">
                    <td className="py-2.5 px-4 text-slate-400 font-mono">2</td>
                    <td className="py-2.5 px-4 pl-6 text-slate-700 font-medium">
                      (-) Impostos e Deduções sobre Receita
                    </td>
                    <td className="py-2.5 px-4 text-right text-rose-600 font-medium">
                      -{formatCurrency(statement.deductions)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-400">-</td>
                  </tr>

                  {/* 3. RECEITA LÍQUIDA */}
                  <tr className="bg-indigo-50/60 font-bold text-slate-900 border-y border-indigo-100">
                    <td className="py-3 px-4 text-indigo-600 font-mono text-xs">3</td>
                    <td className="py-3 px-4 text-indigo-950 font-bold uppercase tracking-wide">
                      (=) Receita Líquida Operacional
                    </td>
                    <td className="py-3 px-4 text-right text-indigo-950 text-base">
                      {formatCurrency(statement.netRevenue)}
                    </td>
                    <td className="py-3 px-4 text-right text-indigo-700 font-bold">100,0%</td>
                  </tr>

                  {/* 4. Custos Diretos */}
                  <tr
                    onClick={() => toggleSection("directCosts")}
                    className="hover:bg-slate-50/80 cursor-pointer font-semibold text-slate-900"
                  >
                    <td className="py-2.5 px-4 text-indigo-600 font-mono text-xs">4</td>
                    <td className="py-2.5 px-4 flex items-center gap-2">
                      {expandedSections.directCosts ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                      (-) Custos Diretos dos Serviços
                    </td>
                    <td className="py-2.5 px-4 text-right text-rose-600">
                      -{formatCurrency(statement.directCosts)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-500 font-medium">
                      {formatPct((statement.directCosts / (statement.netRevenue || 1)) * 100)}
                    </td>
                  </tr>

                  {expandedSections.directCosts &&
                    statement.directCostItems.map((item) => (
                      <tr key={item.id} className="bg-slate-50/40 text-xs text-slate-600">
                        <td className="py-2 px-4 pl-8 font-mono text-slate-400">{item.code}</td>
                        <td className="py-2 px-4 pl-10">{item.name}</td>
                        <td className="py-2 px-4 text-right font-medium text-rose-700">
                          -{formatCurrency(item.amount)}
                        </td>
                        <td className="py-2 px-4 text-right text-slate-400">
                          {formatPct(item.percentageOfRevenue)}
                        </td>
                      </tr>
                    ))}

                  {/* 5. MARGEM DE CONTRIBUIÇÃO */}
                  <tr className="bg-slate-100/80 font-bold text-slate-900 border-y border-slate-200">
                    <td className="py-3 px-4 text-indigo-600 font-mono text-xs">5</td>
                    <td className="py-3 px-4 text-slate-900 uppercase tracking-wide">
                      (=) Margem de Contribuição
                    </td>
                    <td className="py-3 px-4 text-right text-slate-900 text-base">
                      {formatCurrency(statement.contributionMargin)}
                    </td>
                    <td className="py-3 px-4 text-right text-indigo-600 font-bold">
                      {formatPct(statement.contributionMarginPercentage)}
                    </td>
                  </tr>

                  {/* 6. Despesas Operacionais */}
                  <tr
                    onClick={() => toggleSection("operationalExpenses")}
                    className="hover:bg-slate-50/80 cursor-pointer font-semibold text-slate-900"
                  >
                    <td className="py-2.5 px-4 text-indigo-600 font-mono text-xs">6</td>
                    <td className="py-2.5 px-4 flex items-center gap-2">
                      {expandedSections.operationalExpenses ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                      (-) Despesas Operacionais
                    </td>
                    <td className="py-2.5 px-4 text-right text-amber-700">
                      -{formatCurrency(statement.operationalExpenses)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-500 font-medium">
                      {formatPct((statement.operationalExpenses / (statement.netRevenue || 1)) * 100)}
                    </td>
                  </tr>

                  {expandedSections.operationalExpenses && (
                    <>
                      <tr className="bg-slate-50/40 text-xs text-slate-600">
                        <td className="py-2 px-4 pl-8 font-mono text-slate-400">4.01</td>
                        <td className="py-2 px-4 pl-10 font-medium">Despesas Comerciais e Marketing</td>
                        <td className="py-2 px-4 text-right text-slate-800">
                          -{formatCurrency(statement.operationalExpenseItems.commercial)}
                        </td>
                        <td className="py-2 px-4 text-right text-slate-400">
                          {formatPct(
                            (statement.operationalExpenseItems.commercial / (statement.netRevenue || 1)) * 100
                          )}
                        </td>
                      </tr>
                      <tr className="bg-slate-50/40 text-xs text-slate-600">
                        <td className="py-2 px-4 pl-8 font-mono text-slate-400">4.02</td>
                        <td className="py-2 px-4 pl-10 font-medium">Despesas Administrativas e Estrutura</td>
                        <td className="py-2 px-4 text-right text-slate-800">
                          -{formatCurrency(statement.operationalExpenseItems.administrative)}
                        </td>
                        <td className="py-2 px-4 text-right text-slate-400">
                          {formatPct(
                            (statement.operationalExpenseItems.administrative / (statement.netRevenue || 1)) * 100
                          )}
                        </td>
                      </tr>
                      <tr className="bg-slate-50/40 text-xs text-slate-600">
                        <td className="py-2 px-4 pl-8 font-mono text-slate-400">4.03</td>
                        <td className="py-2 px-4 pl-10 font-medium">Despesas de Tecnologia e Ferramentas</td>
                        <td className="py-2 px-4 text-right text-slate-800">
                          -{formatCurrency(statement.operationalExpenseItems.technology)}
                        </td>
                        <td className="py-2 px-4 text-right text-slate-400">
                          {formatPct(
                            (statement.operationalExpenseItems.technology / (statement.netRevenue || 1)) * 100
                          )}
                        </td>
                      </tr>
                    </>
                  )}

                  {/* 7. RESULTADO OPERACIONAL GERENCIAL */}
                  <tr
                    className={`font-bold border-y ${
                      statement.operationalResult >= 0
                        ? "bg-emerald-50 text-emerald-950 border-emerald-200"
                        : "bg-rose-50 text-rose-950 border-rose-200"
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-xs text-indigo-600">7</td>
                    <td className="py-3 px-4 uppercase tracking-wide">
                      (=) Resultado Operacional Gerencial
                    </td>
                    <td className="py-3 px-4 text-right text-base">
                      {formatCurrency(statement.operationalResult)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      {formatPct(statement.operationalResultPercentage)}
                    </td>
                  </tr>

                  {/* 8. Não Operacionais */}
                  {statement.nonOperationalResult !== 0 && (
                    <tr className="hover:bg-slate-50 text-slate-700 text-xs">
                      <td className="py-2 px-4 text-slate-400 font-mono">8</td>
                      <td className="py-2 px-4 pl-6 text-slate-700 font-medium">
                        (+/-) Receitas e Despesas Não Operacionais
                      </td>
                      <td className="py-2 px-4 text-right text-slate-700 font-medium">
                        {formatCurrency(statement.nonOperationalResult)}
                      </td>
                      <td className="py-2 px-4 text-right text-slate-400">-</td>
                    </tr>
                  )}

                  {/* 9. RESULTADO LÍQUIDO */}
                  <tr className="bg-slate-900 text-white font-bold">
                    <td className="py-3 px-4 font-mono text-xs text-indigo-400">9</td>
                    <td className="py-3 px-4 uppercase tracking-wide">
                      (=) Resultado Líquido Gerencial Final
                    </td>
                    <td className="py-3 px-4 text-right text-base text-emerald-400">
                      {formatCurrency(statement.netManagerialResult)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-200">
                      {formatPct(statement.netManagerialResultPercentage)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
