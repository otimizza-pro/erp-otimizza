"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import {
  Search,
  Plus,
  DollarSign,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  X,
} from "lucide-react";
import { ReceivableRecord, FinancialStatus } from "@/modules/financial/types";
import { CurrencyInput } from "@/components/ui/currency-input";
import { formatMoney } from "@/shared/money";

function ReceivablesListPageContent() {
  const searchParams = useSearchParams();
  const [receivables, setReceivables] = useState<ReceivableRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [dateType, setDateType] = useState<"dueDate" | "createdAt">("dueDate");
  const [periodPreset, setPeriodPreset] = useState<string>("ALL");
  const [processingRecurrence, setProcessingRecurrence] = useState(false);
  const [recurrenceMessage, setRecurrenceMessage] = useState("");

  useEffect(() => {
    const statusParam = searchParams.get("status");
    const overdueParam = searchParams.get("overdue");
    if (statusParam) {
      setStatusFilter(statusParam);
    }
    if (overdueParam === "true") {
      setStatusFilter("PENDING");
      setDateType("dueDate");
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      setEndDate(yesterday);
      setPeriodPreset("OVERDUE");
    }
  }, [searchParams]);

  // Modal Baixa Rápida
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<ReceivableRecord | null>(null);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleDate, setSettleDate] = useState(new Date().toISOString().slice(0, 10));
  const [settleNotes, setSettleNotes] = useState("");
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState("");

  const loadReceivables = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (dateType) params.set("dateType", dateType);

      const res = await fetch(`/api/financial/receivables?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReceivables(data.receivables || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Erro ao listar contas a receber:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const res = await fetch("/api/financial/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        if (data.accounts?.length > 0) {
          setSelectedAccountId(data.accounts[0].id);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar contas financeiras:", err);
    }
  };

  useEffect(() => {
    loadReceivables();
    loadAccounts();
  }, [statusFilter, startDate, endDate, dateType]);

  const handleApplyPreset = (preset: string) => {
    setPeriodPreset(preset);
    const now = new Date();
    const formatYMD = (d: Date) => d.toISOString().slice(0, 10);

    if (preset === "ALL") {
      setStartDate("");
      setEndDate("");
      return;
    }

    if (preset === "TODAY") {
      const today = formatYMD(now);
      setStartDate(today);
      setEndDate(today);
      return;
    }

    if (preset === "THIS_WEEK") {
      const d = new Date(now);
      const day = d.getDay();
      const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diffToMonday));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setStartDate(formatYMD(monday));
      setEndDate(formatYMD(sunday));
      return;
    }

    if (preset === "THIS_MONTH") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(formatYMD(start));
      setEndDate(formatYMD(end));
      return;
    }

    if (preset === "NEXT_MONTH") {
      const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      setStartDate(formatYMD(start));
      setEndDate(formatYMD(end));
      return;
    }

    if (preset === "OVERDUE") {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      setStartDate("");
      setEndDate(formatYMD(yesterday));
      setStatusFilter("OVERDUE");
      return;
    }
  };

  const handleClearAllFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setStartDate("");
    setEndDate("");
    setPeriodPreset("ALL");
    setDateType("dueDate");
  };

  const handleProcessRecurrence = async () => {
    setProcessingRecurrence(true);
    setRecurrenceMessage("");
    try {
      const res = await fetch("/api/financial/recurrence/process", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setRecurrenceMessage(
          `Motor processado para ${data.competency}: ${data.receivables?.createdCount} nova(s) cobrança(s) gerada(s).`
        );
        loadReceivables();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingRecurrence(false);
    }
  };

  const handleOpenSettle = (r: ReceivableRecord) => {
    setSelectedReceivable(r);
    setSettleAmount(r.balanceAmount);
    setSettleDate(new Date().toISOString().slice(0, 10));
    setSettleNotes("");
    setSettleError("");
    setSettleModalOpen(true);
  };

  const handleConfirmSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivable) return;
    setSettleError("");

    if (settleAmount <= 0) {
      setSettleError("Valor da baixa deve ser maior que zero.");
      return;
    }
    if (settleAmount > selectedReceivable.balanceAmount) {
      setSettleError(`Valor não pode exceder o saldo de R$ ${selectedReceivable.balanceAmount.toFixed(2)}.`);
      return;
    }
    if (!selectedAccountId) {
      setSettleError("Selecione a conta bancária.");
      return;
    }

    setSettling(true);
    try {
      const res = await fetch(`/api/financial/receivables/${selectedReceivable.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "settle",
          financialAccountId: selectedAccountId,
          amount: settleAmount,
          settlementDate: settleDate,
          notes: settleNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao registrar recebimento.");
      }

      setSettleModalOpen(false);
      loadReceivables();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro na baixa.";
      setSettleError(msg);
    } finally {
      setSettling(false);
    }
  };

  const getStatusBadge = (status: FinancialStatus) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Liquidado
          </span>
        );
      case "PARTIALLY_PAID":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            Parcial
          </span>
        );
      case "OVERDUE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Atrasado
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            A Vencer
          </span>
        );
      case "CANCELED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
            Cancelado
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <AppShell activeSection="receivables">
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Financeiro • Contas a Receber
              </span>
              <span className="text-xs text-zinc-400">•</span>
              <Link
                href="/contracts"
                className="text-xs font-medium text-emerald-700 hover:text-emerald-900 hover:underline inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Ver Assinaturas & Recorrência
              </Link>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mt-2">
              Gestão de Recebimentos
            </h1>
            <p className="text-sm text-zinc-600 mt-1">
              Controle de mensalidades de assinaturas, cobranças avulsas, liquidações manuais parciais e estornos auditados.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/contracts"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-zinc-800 border border-zinc-200 text-xs font-medium hover:bg-zinc-50 transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
              Assinaturas
            </Link>
            <button
              onClick={handleProcessRecurrence}
              disabled={processingRecurrence}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-zinc-800 border border-zinc-200 text-xs font-medium hover:bg-zinc-50 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${processingRecurrence ? "animate-spin" : ""}`} />
              {processingRecurrence ? "Processando..." : "Rodar Motor de Recorrência"}
            </button>
            <Link
              href="/financial/receivables/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-950 text-white text-xs font-medium hover:bg-zinc-800 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nova Cobrança Avulsa
            </Link>
          </div>
        </div>

        {recurrenceMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{recurrenceMessage}</span>
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Total a Receber em Aberto
              </p>
              <p className="text-2xl font-bold text-zinc-950 mt-1">
                R${" "}
                {receivables
                  .filter((r) => r.status !== "PAID" && r.status !== "CANCELED")
                  .reduce((acc, r) => acc + r.balanceAmount, 0)
                  .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-rose-600 uppercase tracking-wider">
                Total Vencido / Atrasado
              </p>
              <p className="text-2xl font-bold text-rose-700 mt-1">
                R${" "}
                {receivables
                  .filter((r) => r.status === "OVERDUE")
                  .reduce((acc, r) => acc + r.balanceAmount, 0)
                  .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">
                Total Liquidado
              </p>
              <p className="text-2xl font-bold text-emerald-800 mt-1">
                R${" "}
                {receivables
                  .reduce((acc, r) => acc + r.paidAmount, 0)
                  .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-800 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filters & Date Bar */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs space-y-3">
          {/* Top Line: Search + Status Tabs */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por número, cliente, descrição ou número da assinatura..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadReceivables();
                }}
                className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>

            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg text-xs font-medium self-start md:self-auto overflow-x-auto">
              {[
                { id: "ALL", label: "Todas" },
                { id: "PENDING", label: "A Vencer" },
                { id: "OVERDUE", label: "Atrasadas" },
                { id: "PARTIALLY_PAID", label: "Parciais" },
                { id: "PAID", label: "Liquidadas" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                    statusFilter === tab.id
                      ? "bg-white text-zinc-900 shadow-xs font-semibold"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Line: Date Filters */}
          <div className="pt-3 border-t border-zinc-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
            {/* Quick Period Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-zinc-500 font-medium flex items-center gap-1 mr-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Período:
              </span>
              {[
                { id: "ALL", label: "Qualquer Data" },
                { id: "TODAY", label: "Hoje" },
                { id: "THIS_WEEK", label: "Esta Semana" },
                { id: "THIS_MONTH", label: "Este Mês" },
                { id: "NEXT_MONTH", label: "Próximo Mês" },
                { id: "OVERDUE", label: "Vencidos" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleApplyPreset(p.id)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    periodPreset === p.id
                      ? "bg-zinc-900 text-white font-medium"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1">
                <span className="text-zinc-500 text-[11px]">De:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPeriodPreset("CUSTOM");
                  }}
                  className="bg-transparent text-xs text-zinc-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1">
                <span className="text-zinc-500 text-[11px]">Até:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPeriodPreset("CUSTOM");
                  }}
                  className="bg-transparent text-xs text-zinc-800 focus:outline-none"
                />
              </div>

              <select
                value={dateType}
                onChange={(e) => setDateType(e.target.value as "dueDate" | "createdAt")}
                className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-xs text-zinc-700 focus:outline-none font-medium"
                title="Filtrar por qual campo de data"
              >
                <option value="dueDate">Data de Vencimento</option>
                <option value="createdAt">Data de Criação</option>
              </select>

              {(startDate || endDate || search || statusFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1 font-medium"
                  title="Limpar todos os filtros"
                >
                  <X className="w-3 h-3" />
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Receivables Table */}
        <div className="bg-white rounded-xl border border-zinc-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-zinc-500 text-sm">Carregando recebimentos...</div>
          ) : receivables.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
              <p className="text-zinc-800 font-medium">Nenhum título a receber encontrado</p>
              <p className="text-zinc-500 text-xs mt-1">
                Ajuste os filtros de data e status ou gere cobranças pelo motor de recorrência das assinaturas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50/80 border-b border-zinc-200 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Número / Origem</th>
                    <th className="px-6 py-3">Cliente</th>
                    <th className="px-6 py-3">Competência & Vencimento</th>
                    <th className="px-6 py-3">Valor Original</th>
                    <th className="px-6 py-3">Saldo em Aberto</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/80 text-xs">
                  {receivables.map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-zinc-950">
                            {r.receivableNumber}
                          </span>
                          {r.contractNumber && (
                            <Link
                              href={r.contractId ? `/contracts/${r.contractId}` : "/contracts"}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors"
                              title="Ver Assinatura Vinculada"
                            >
                              <RefreshCw className="w-2.5 h-2.5 text-emerald-600" />
                              Assinatura {r.contractNumber}
                            </Link>
                          )}
                        </div>
                        <span className="text-zinc-600 text-[11px] block mt-0.5 line-clamp-1">
                          {r.description}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/clients/${r.clientId}`} className="font-medium text-zinc-900 hover:underline">
                          {r.clientName}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-zinc-800 block">Venc. {r.dueDate}</span>
                        <span className="text-[11px] text-zinc-500">Comp. {r.competency}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-zinc-700">
                        R$ {r.originalAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-950">
                        R$ {r.balanceAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(r.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {r.status !== "PAID" && r.status !== "CANCELED" && (
                            <button
                              onClick={() => handleOpenSettle(r)}
                              className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold border border-emerald-200 transition-colors"
                            >
                              Baixar
                            </button>
                          )}
                          <Link
                            href={`/financial/receivables/${r.id}`}
                            className="p-1 text-zinc-400 hover:text-zinc-900"
                            title="Ver Detalhes"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Baixa Rápida */}
      {settleModalOpen && selectedReceivable && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200 space-y-4">
            <div>
              <h3 className="font-bold text-zinc-950 text-base">Liquidação Manual de Recebimento</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {selectedReceivable.receivableNumber} • {selectedReceivable.clientName}
              </p>
            </div>

            {settleError && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs">{settleError}</div>
            )}

            <form onSubmit={handleConfirmSettle} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Conta Bancária / Caixa *</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none"
                  required
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Valor do Recebimento *</label>
                  <CurrencyInput
                    value={settleAmount}
                    onChangeValue={(val) => setSettleAmount(val)}
                    placeholder="0,00"
                    className="w-full py-2 bg-zinc-50 border border-zinc-200 rounded-lg font-bold"
                    required
                  />
                  <span className="text-[10px] text-zinc-400">Saldo: {formatMoney(selectedReceivable.balanceAmount)}</span>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Data Efetiva *</label>
                  <input
                    type="date"
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Observações da Baixa</label>
                <input
                  type="text"
                  placeholder="Ex: Recebido via PIX / Comprovante 9283"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleModalOpen(false)}
                  className="px-4 py-2 font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={settling}
                  className="px-4 py-2 font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  {settling ? "Confirmando..." : "Confirmar Recebimento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function ReceivablesListPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500">Carregando cobranças...</div>}>
      <ReceivablesListPageContent />
    </Suspense>
  );
}
