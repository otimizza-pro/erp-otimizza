"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  Building2,
  Clock,
  CheckCircle,
  AlertCircle,
  Receipt,
  RotateCcw,
  FileText,
  Tag,
} from "lucide-react";
import { PayableRecord, FinancialAccountRecord } from "@/modules/financial/types";

export default function PayableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [payable, setPayable] = useState<PayableRecord | null>(null);
  const [accounts, setAccounts] = useState<FinancialAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Modal de Baixa / Pagamento
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleAccountId, setSettleAccountId] = useState("");
  const [settleAmount, setSettleAmount] = useState<number | string>("");
  const [settleDate, setSettleDate] = useState(new Date().toISOString().slice(0, 10));
  const [settleNotes, setSettleNotes] = useState("");
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);

  // Modal de Estorno
  const [reversalSettlementId, setReversalSettlementId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [isSubmittingReversal, setIsSubmittingReversal] = useState(false);

  async function loadData() {
    try {
      const [resPay, resAcc] = await Promise.all([
        fetch(`/api/financial/payables/${id}`),
        fetch("/api/financial/accounts"),
      ]);

      if (!resPay.ok) {
        throw new Error("Não foi possível carregar a conta a pagar.");
      }
      const dataPay = await resPay.json();
      setPayable(dataPay);

      if (resAcc.ok) {
        const dataAcc = await resAcc.json();
        setAccounts(dataAcc);
        if (dataAcc.length > 0) setSettleAccountId(dataAcc[0].id);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  const handleOpenSettle = () => {
    if (!payable) return;
    setSettleAmount(payable.balanceAmount.toFixed(2));
    setSettleDate(new Date().toISOString().slice(0, 10));
    setSettleNotes("");
    setIsSettleModalOpen(true);
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payable) return;
    const amt = Number(settleAmount);
    if (!amt || amt <= 0 || amt > payable.balanceAmount) {
      alert("Valor de pagamento inválido ou maior que o saldo devido.");
      return;
    }

    setIsSubmittingSettle(true);
    try {
      const res = await fetch(`/api/financial/payables/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "settle",
          financialAccountId: settleAccountId,
          amount: amt,
          settlementDate: settleDate,
          notes: settleNotes,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Erro ao processar pagamento.");
      }

      setIsSettleModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao efetuar pagamento.");
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  const handleReverse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalSettlementId) return;

    setIsSubmittingReversal(true);
    try {
      const res = await fetch(`/api/financial/settlements/${reversalSettlementId}/reversal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reversalReason.trim(),
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Erro ao efetuar estorno de pagamento.");
      }

      setReversalSettlementId(null);
      setReversalReason("");
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro no estorno.");
    } finally {
      setIsSubmittingReversal(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" /> Pago Integralmente
          </span>
        );
      case "PARTIALLY_PAID":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Parcialmente Pago
          </span>
        );
      case "OVERDUE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-3.5 h-3.5" /> Em Atraso
          </span>
        );
      case "CANCELED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5" /> Pendente
          </span>
        );
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="py-20 text-center text-slate-500 text-sm">
          Carregando informações da conta a pagar...
        </div>
      </AppShell>
    );
  }

  if (errorMsg || !payable) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto py-12 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">Erro ao Abrir Despesa</h2>
          <p className="text-sm text-slate-600">{errorMsg || "Título não encontrado."}</p>
          <Link
            href="/financial/payables"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para listagem
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Header Breadcrumbs & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/financial/payables"
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 transition text-slate-600"
              title="Voltar para Contas a Pagar"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-semibold">
                  {payable.payableNumber}
                </span>
                {getStatusBadge(payable.status)}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                {payable.description}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {payable.balanceAmount > 0 && payable.status !== "CANCELED" && (
              <button
                onClick={handleOpenSettle}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm transition"
              >
                <CheckCircle className="w-4 h-4" />
                Registrar Pagamento / Baixa
              </button>
            )}
          </div>
        </div>

        {/* 3 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Valor Nominal
            </span>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(payable.originalAmount)}
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              Competência: <strong className="text-slate-600">{payable.competency}</strong>
            </span>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Total Pago
            </span>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(payable.paidAmount)}
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              {(payable.settlements?.filter(s => s.settlementType === "PAYMENT" && !s.isReversed).length || 0)} pagamento(s) confirmado(s)
            </span>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Saldo Devedor Restante
            </span>
            <div className={`text-2xl font-bold ${payable.balanceAmount > 0 ? "text-red-600" : "text-slate-400"}`}>
              {formatCurrency(payable.balanceAmount)}
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              Vencimento: <strong className="text-slate-600">{new Date(payable.dueDate + "T12:00:00").toLocaleDateString("pt-BR")}</strong>
            </span>
          </div>
        </div>

        {/* Detalhes Gerais */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Informações Cadastrais da Despesa
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">
                Fornecedor / Beneficiário
              </span>
              <div className="font-semibold text-slate-900 text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                {payable.supplierName}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">
                Alocação de Custo / Rentabilidade
              </span>
              {payable.serviceName ? (
                <div className="text-slate-800 font-medium">
                  Serviço Vinculado: <span className="font-semibold text-emerald-700">{payable.serviceName}</span>
                </div>
              ) : (
                <div className="text-slate-500 italic">
                  Custo Geral Operacional (Sem vinculação direta a serviço)
                </div>
              )}
              {payable.idempotencyKey && (
                <span className="text-[11px] font-mono text-slate-400 mt-1 block">
                  Chave Idempotência: {payable.idempotencyKey}
                </span>
              )}
            </div>

            {payable.notes && (
              <div className="md:col-span-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">
                  Observações e Histórico Auditado
                </span>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs leading-relaxed">
                  {payable.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Histórico de Pagamentos e Movimentações Financeiras */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Histórico Transacional de Pagamentos e Baixas
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Rastreabilidade contábil completa. Nenhuma baixa física é deletada.
              </p>
            </div>
          </div>

          {(!payable.settlements || payable.settlements.length === 0) ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              Nenhum pagamento registrado até o momento para este título.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase">
                    <th className="py-2.5 px-3">Tipo / Data</th>
                    <th className="py-2.5 px-3">Conta Financeira</th>
                    <th className="py-2.5 px-3 text-right">Valor</th>
                    <th className="py-2.5 px-3">Observações / Auditoria</th>
                    <th className="py-2.5 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {payable.settlements.map((st) => (
                    <tr
                      key={st.id}
                      className={st.settlementType === "REVERSAL" ? "bg-red-50/30" : st.isReversed ? "bg-slate-50 text-slate-400 opacity-70" : "hover:bg-slate-50/50"}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-medium">
                          {st.settlementType === "REVERSAL" ? (
                            <span className="text-xs px-2 py-0.5 rounded font-semibold bg-red-100 text-red-700">
                              ESTORNO
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-700">
                              PAGAMENTO
                            </span>
                          )}
                          <span className="text-xs text-slate-500">
                            {new Date(st.settlementDate + "T12:00:00").toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        {st.isReversed && (
                          <span className="text-[10px] text-red-500 font-semibold mt-0.5 block">
                            (Estornado em data posterior)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">
                        {st.financialAccountName}
                      </td>
                      <td className={`py-3 px-3 text-right font-bold ${st.settlementType === "REVERSAL" ? "text-emerald-700" : "text-red-600"}`}>
                        {st.settlementType === "REVERSAL" ? `+${formatCurrency(st.amount)}` : `-${formatCurrency(st.amount)}`}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600 max-w-xs truncate">
                        {st.notes || "-"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {st.settlementType === "PAYMENT" && !st.isReversed && (
                          <button
                            onClick={() => {
                              setReversalSettlementId(st.id);
                              setReversalReason("");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition"
                            title="Estornar este pagamento e reabrir o saldo devedor"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Estornar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE PAGAMENTO / BAIXA */}
      {isSettleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Confirmar Pagamento</h3>
                <p className="text-xs text-slate-500">Título {payable.payableNumber}</p>
              </div>
              <button
                onClick={() => setIsSettleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSettle} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Conta Financeira de Saída
                </label>
                <select
                  value={settleAccountId}
                  onChange={(e) => setSettleAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.bankName || "Caixa"}) - Saldo: {formatCurrency(acc.currentBalance)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data Efetiva
                  </label>
                  <input
                    type="date"
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor Pago (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={payable.balanceAmount}
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    className="w-full px-3 py-2 font-bold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-red-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações do Pagamento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Transferência TED, comprovante anexado"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800">
                O saldo devido será abatido atomicamente e o extrato da conta será debitado em transação única.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettleModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSettle}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {isSubmittingSettle ? "Processando..." : "Confirmar Pagamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ESTORNO */}
      {reversalSettlementId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-red-600">Estornar Pagamento</h3>
                <p className="text-xs text-slate-500">Ação auditada com reabertura de saldo</p>
              </div>
              <button
                onClick={() => setReversalSettlementId(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReverse} className="space-y-4 text-sm">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 leading-relaxed">
                Aviso: O estorno não apaga o registro original. Ele credita de volta o valor na conta financeira e restabelece a obrigação em aberto.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo do Estorno <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Justifique detalhadamente a necessidade do estorno..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReversalSettlementId(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReversal}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {isSubmittingReversal ? "Estornando..." : "Confirmar Estorno"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
