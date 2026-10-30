"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  ShieldCheck,
  Plus,
  ArrowRightLeft,
  Building2,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Trash2,
  Power,
} from "lucide-react";
import { FinancialAccountRecord, AccountType } from "@/modules/financial/types";
import { CurrencyInput } from "@/components/ui/currency-input";
import { formatMoney } from "@/shared/money";

export default function FinancialAccountsPage() {
  const [accounts, setAccounts] = useState<FinancialAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Nova Conta
  const [newAccModalOpen, setNewAccModalOpen] = useState(false);
  const [accName, setAccName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accType, setAccType] = useState<"CHECKING" | "SAVINGS" | "CASH" | "INVESTMENT">("CHECKING");
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [savingAcc, setSavingAcc] = useState(false);
  const [accError, setAccError] = useState("");

  // Modal Editar Conta
  const [editAccModalOpen, setEditAccModalOpen] = useState(false);
  const [editingAccId, setEditingAccId] = useState("");
  const [editAccName, setEditAccName] = useState("");
  const [editBankName, setEditBankName] = useState("");
  const [editAccType, setEditAccType] = useState<"CHECKING" | "SAVINGS" | "CASH" | "INVESTMENT">("CHECKING");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [savingEditAcc, setSavingEditAcc] = useState(false);
  const [editAccError, setEditAccError] = useState("");

  // Filtro de Status
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE");

  // Modal Transferência
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [fromAccId, setFromAccId] = useState("");
  const [toAccId, setToAccId] = useState("");
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [transferDesc, setTransferDesc] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState("");

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/financial/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        if (data.accounts?.length >= 2) {
          setFromAccId(data.accounts[0].id);
          setToAccId(data.accounts[1].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccError("");
    if (!accName.trim()) {
      setAccError("Nome da conta é obrigatório.");
      return;
    }

    setSavingAcc(true);
    try {
      const res = await fetch("/api/financial/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accName.trim(),
          bankName: bankName.trim() || undefined,
          accountType: accType,
          initialBalance,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao criar conta.");
      }

      setNewAccModalOpen(false);
      setAccName("");
      setBankName("");
      setInitialBalance(0);
      loadAccounts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado.";
      setAccError(msg);
    } finally {
      setSavingAcc(false);
    }
  };

  const handleOpenEditModal = (acc: FinancialAccountRecord) => {
    setEditingAccId(acc.id);
    setEditAccName(acc.name);
    setEditBankName(acc.bankName || "");
    setEditAccType(acc.accountType);
    setEditStatus(acc.status === "ACTIVE" ? "ACTIVE" : "INACTIVE");
    setEditAccError("");
    setEditAccModalOpen(true);
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditAccError("");
    if (!editAccName.trim()) {
      setEditAccError("O nome da conta é obrigatório.");
      return;
    }

    setSavingEditAcc(true);
    try {
      const res = await fetch(`/api/financial/accounts/${editingAccId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editAccName.trim(),
          bankName: editBankName.trim() || null,
          accountType: editAccType,
          status: editStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao atualizar conta.");
      }

      setEditAccModalOpen(false);
      loadAccounts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado.";
      setEditAccError(msg);
    } finally {
      setSavingEditAcc(false);
    }
  };

  const handleDeleteAccount = async (acc: FinancialAccountRecord) => {
    const confirmMsg = `Deseja realmente excluir ou desativar a conta "${acc.name}"?\n\n• Se ela não possuir movimentações, será apagada definitivamente.\n• Se possuir histórico contábil, será desativada para não receber novos lançamentos.`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/financial/accounts/${acc.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao excluir conta.");
      }
      alert(data.message || "Operação realizada com sucesso.");
      loadAccounts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir conta.");
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError("");
    if (fromAccId === toAccId) {
      setTransferError("Conta de origem e destino devem ser diferentes.");
      return;
    }
    if (transferAmount <= 0) {
      setTransferError("Valor da transferência deve ser maior que zero.");
      return;
    }

    setTransferring(true);
    try {
      const res = await fetch("/api/financial/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transfer",
          fromAccountId: fromAccId,
          toAccountId: toAccId,
          amount: transferAmount,
          date: transferDate,
          description: transferDesc.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro na transferência.");
      }

      setTransferModalOpen(false);
      setTransferAmount(0);
      setTransferDesc("");
      loadAccounts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro na transferência.";
      setTransferError(msg);
    } finally {
      setTransferring(false);
    }
  };

  return (
    <AppShell activeSection="accounts">
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <span className="text-xs font-mono font-medium text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Financeiro • Gestão de Contas & Caixas
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mt-2">
              Contas Bancárias & Tesouraria
            </h1>
            <p className="text-sm text-zinc-600 mt-1">
              Contas correntes, caixas físicos e transferências internas auditadas sem reconhecimento de receita/despesa fictícia.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTransferModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-zinc-800 border border-zinc-200 text-xs font-medium hover:bg-zinc-50 shadow-xs"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Transferência Interna
            </button>
            <button
              onClick={() => setNewAccModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-950 text-white text-xs font-medium hover:bg-zinc-800 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nova Conta Financeira
            </button>
          </div>
        </div>

        {/* Total Saldo Consolidado */}
        <div className="bg-white p-6 rounded-xl border border-zinc-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Disponibilidade Financeira Total Consolidada
            </p>
            <p className="text-3xl font-extrabold text-zinc-950 mt-1">
              R${" "}
              {accounts
                .reduce((acc, a) => acc + a.currentBalance, 0)
                .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-100">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Filtros de Contas */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-600">Filtrar:</span>
            <div className="flex items-center rounded-lg bg-zinc-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("ACTIVE")}
                className={`px-3 py-1 rounded-md font-medium transition ${
                  statusFilter === "ACTIVE"
                    ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Ativas ({accounts.filter((a) => a.status === "ACTIVE").length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("INACTIVE")}
                className={`px-3 py-1 rounded-md font-medium transition ${
                  statusFilter === "INACTIVE"
                    ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Inativas ({accounts.filter((a) => a.status === "INACTIVE").length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1 rounded-md font-medium transition ${
                  statusFilter === "ALL"
                    ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Todas ({accounts.length})
              </button>
            </div>
          </div>
        </div>

        {/* Grid de Contas */}
        {accounts.filter((a) => statusFilter === "ALL" || a.status === statusFilter).length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-zinc-200 text-xs text-zinc-500">
            Nenhuma conta financeira encontrada para o filtro selecionado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts
              .filter((a) => statusFilter === "ALL" || a.status === statusFilter)
              .map((acc) => (
                <div
                  key={acc.id}
                  className={`p-5 rounded-xl border shadow-xs flex flex-col justify-between space-y-4 transition ${
                    acc.status === "INACTIVE" ? "bg-zinc-50 border-zinc-200 opacity-75" : "bg-white border-zinc-200/80"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 font-semibold uppercase">
                        {acc.accountType}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          acc.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-zinc-200 text-zinc-600 border-zinc-300"
                        }`}
                      >
                        {acc.status === "ACTIVE" ? "ATIVA" : "INATIVA"}
                      </span>
                    </div>
                    <h3 className="font-bold text-zinc-900 mt-2 text-base">{acc.name}</h3>
                    {acc.bankName && <p className="text-xs text-zinc-500">{acc.bankName}</p>}
                  </div>

                  <div className="border-t border-zinc-100 pt-3 flex items-end justify-between">
                    <div>
                      <span className="text-xs text-zinc-500 block">Saldo Atual Disponível</span>
                      <span className="text-xl font-bold text-zinc-950 font-mono">
                        {formatMoney(acc.currentBalance)}
                      </span>
                      <span className="text-[11px] text-zinc-400 block mt-0.5">
                        Saldo Inicial: {formatMoney(acc.initialBalance)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(acc)}
                        title="Editar Conta"
                        className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAccount(acc)}
                        title="Excluir ou Desativar Conta"
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Modal Nova Conta */}
      {newAccModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200 space-y-4">
            <h3 className="font-bold text-zinc-950 text-base">Nova Conta Financeira</h3>
            {accError && <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs">{accError}</div>}
            <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Nome de Identificação *</label>
                <input
                  type="text"
                  placeholder="Ex: Santander Principal, Caixa Operacional..."
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Banco / Instituição</label>
                <input
                  type="text"
                  placeholder="Ex: Santander, Itaú, Banco do Brasil..."
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Tipo de Conta *</label>
                  <select
                    value={accType}
                    onChange={(e) => setAccType(e.target.value as AccountType)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg"
                  >
                    <option value="CHECKING">Conta Corrente</option>
                    <option value="SAVINGS">Poupança</option>
                    <option value="CASH">Caixa Físico</option>
                    <option value="INVESTMENT">Aplicação</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Saldo Inicial</label>
                  <CurrencyInput
                    value={initialBalance}
                    onChangeValue={(val) => setInitialBalance(val)}
                    placeholder="0,00"
                    className="w-full py-2 bg-zinc-50 border border-zinc-200 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setNewAccModalOpen(false)}
                  className="px-4 py-2 font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAcc}
                  className="px-4 py-2 font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  {savingAcc ? "Salvando..." : "Salvar Conta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Conta */}
      {editAccModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200 space-y-4">
            <h3 className="font-bold text-zinc-950 text-base">Editar Conta Financeira</h3>
            {accError && <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs">{accError}</div>}
            <form onSubmit={handleUpdateAccount} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Nome de Identificação *</label>
                <input
                  type="text"
                  value={editAccName}
                  onChange={(e) => setEditAccName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Banco / Instituição</label>
                <input
                  type="text"
                  value={editBankName}
                  onChange={(e) => setEditBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Tipo de Conta *</label>
                  <select
                    value={editAccType}
                    onChange={(e) => setEditAccType(e.target.value as AccountType)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900"
                  >
                    <option value="CHECKING">Conta Corrente</option>
                    <option value="SAVINGS">Poupança</option>
                    <option value="CASH">Caixa Físico</option>
                    <option value="INVESTMENT">Aplicação</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900"
                  >
                    <option value="ACTIVE">Ativa</option>
                    <option value="INACTIVE">Inativa</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditAccModalOpen(false)}
                  className="px-4 py-2 font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEditAcc}
                  className="px-4 py-2 font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  {savingEditAcc ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Transferência */}
      {transferModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200 space-y-4">
            <h3 className="font-bold text-zinc-950 text-base">Transferência entre Contas</h3>
            {transferError && <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs">{transferError}</div>}
            <form onSubmit={handleTransfer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Conta Origem *</label>
                  <select
                    value={fromAccId}
                    onChange={(e) => setFromAccId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatMoney(a.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Conta Destino *</label>
                  <select
                    value={toAccId}
                    onChange={(e) => setToAccId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Valor da Transferência *</label>
                  <CurrencyInput
                    value={transferAmount}
                    onChangeValue={(val) => setTransferAmount(val)}
                    placeholder="0,00"
                    className="w-full py-2 bg-zinc-50 border border-zinc-200 rounded-lg font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Data Efetiva *</label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Motivo / Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Suprimento de caixa para despesas miúdas"
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={transferring}
                  className="px-4 py-2 font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  {transferring ? "Transferindo..." : "Efetuar Transferência"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
