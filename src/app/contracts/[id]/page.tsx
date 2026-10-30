"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import {
  ArrowLeft,
  Calendar,
  Layers,
  History,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  XCircle,
  Info,
  DollarSign,
  FileText,
} from "lucide-react";
import {
  ContractRecord,
  ContractVersionRecord,
  RecurrenceProjection,
  ContractItemInput,
} from "@/modules/contracts/types";

export default function ContractDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params?.id as string;

  const [contract, setContract] = useState<ContractRecord | null>(null);
  const [projections, setProjections] = useState<RecurrenceProjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"details" | "history" | "projections">("details");

  // Modal Cancelamento
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // Modal Nova Versão de Vigência
  const [newVersionModalOpen, setNewVersionModalOpen] = useState(false);
  const [newVerEffectiveDate, setNewVerEffectiveDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [newVerTitle, setNewVerTitle] = useState("");
  const [newVerItems, setNewVerItems] = useState<ContractItemInput[]>([]);
  const [savingVersion, setSavingVersion] = useState(false);
  const [versionError, setVersionError] = useState("");

  const loadContract = async () => {
    if (!contractId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}?projections=true`);
      if (res.ok) {
        const data = await res.json();
        setContract(data.contract);
        setProjections(data.projections || []);
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes do contrato:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContract();
  }, [contractId]);

  const handleOpenNewVersionModal = () => {
    if (!contract || !contract.currentVersion) return;
    setNewVerTitle(`Revisão v${(contract.currentVersion.versionNumber || 1) + 1}`);
    setNewVerEffectiveDate(new Date().toISOString().slice(0, 10));

    // Pré-carregar itens atuais para ajuste
    const currentItems: ContractItemInput[] = (contract.currentVersion.items || []).map((it) => ({
      serviceId: it.serviceId,
      serviceName: it.serviceName,
      comboId: it.comboId,
      comboName: it.comboName,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      unitCost: it.unitCost,
    }));
    setNewVerItems(currentItems);
    setNewVersionModalOpen(true);
  };

  const handleSaveNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    setVersionError("");

    if (!newVerEffectiveDate) {
      setVersionError("A data de vigência inicial da nova versão é obrigatória.");
      return;
    }
    if (newVerItems.length === 0) {
      setVersionError("A nova versão deve possuir pelo menos um serviço.");
      return;
    }

    setSavingVersion(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newVerTitle.trim() || undefined,
          billingPeriod: contract?.currentVersion?.billingPeriod || "MONTHLY",
          dueDay: contract?.currentVersion?.dueDay || 10,
          startDate: contract?.currentVersion?.startDate,
          endDate: contract?.currentVersion?.endDate,
          isIndefinite: contract?.currentVersion?.isIndefinite,
          effectiveDate: newVerEffectiveDate,
          items: newVerItems,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar nova versão.");
      }

      setNewVersionModalOpen(false);
      loadContract();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado.";
      setVersionError(msg);
    } finally {
      setSavingVersion(false);
    }
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelError("");

    if (!cancelReason.trim()) {
      setCancelError("Informe o motivo do cancelamento.");
      return;
    }

    setCanceling(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          reason: cancelReason.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao cancelar contratação.");
      }

      setCancelModalOpen(false);
      loadContract();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao cancelar contrato.";
      setCancelError(msg);
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <AppShell activeSection="contracts">
        <div className="p-12 text-center text-zinc-500 text-sm">
          Carregando detalhes da contratação...
        </div>
      </AppShell>
    );
  }

  if (!contract) {
    return (
      <AppShell activeSection="contracts">
        <div className="p-12 text-center">
          <p className="text-zinc-800 font-semibold">Contratação não encontrada</p>
          <Link
            href="/contracts"
            className="mt-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para listagem
          </Link>
        </div>
      </AppShell>
    );
  }

  const currentVer = contract.currentVersion;

  return (
    <AppShell activeSection="contracts">
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/contracts"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Contratações
          </Link>

          <div className="flex items-center gap-3">
            {contract.status === "ACTIVE" && (
              <>
                <button
                  onClick={handleOpenNewVersionModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors shadow-xs"
                >
                  <History className="w-3.5 h-3.5" />
                  Nova Versão / Reajuste
                </button>
                <button
                  onClick={() => {
                    setCancelReason("");
                    setCancelError("");
                    setCancelModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-medium border border-rose-200 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancelar Contratação
                </button>
              </>
            )}
          </div>
        </div>

        {/* Contract Header Banner */}
        <div className="bg-white p-6 rounded-xl border border-zinc-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold bg-zinc-100 text-zinc-800 px-2.5 py-1 rounded border border-zinc-200">
                {contract.contractNumber}
              </span>
              {contract.status === "ACTIVE" && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Contrato Ativo
                </span>
              )}
              {contract.status === "CANCELED" && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Cancelado em {contract.canceledAt?.slice(0, 10)}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 mt-2">
              {currentVer?.title || "Contratação"}
            </h1>
            <p className="text-sm text-zinc-600 mt-1">
              Cliente:{" "}
              <Link
                href={`/clients/${contract.clientId}`}
                className="font-medium text-zinc-900 underline hover:text-zinc-950"
              >
                {contract.clientName}
              </Link>
              {contract.clientDocument && ` • Doc: ${contract.clientDocument}`}
            </p>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-zinc-100 pt-4 md:pt-0 md:pl-6">
            <div>
              <span className="text-xs text-zinc-500 uppercase tracking-wider block">
                Valor Recorrente
              </span>
              <span className="text-2xl font-bold text-zinc-950">
                R${" "}
                {(currentVer?.totalAmount || 0).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </span>
              <span className="text-[11px] text-zinc-500 block mt-0.5">
                {currentVer?.billingPeriod === "MONTHLY"
                  ? "Mensal • Vence todo dia " + currentVer?.dueDay
                  : currentVer?.billingPeriod === "YEARLY"
                  ? "Anual"
                  : "Avulso / Pontual"}
              </span>
            </div>
          </div>
        </div>

        {/* Cancellation Notice if Canceled */}
        {contract.status === "CANCELED" && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-800 text-xs space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Contratação Encerrada por Cancelamento
            </div>
            <p>
              <strong>Motivo registrado:</strong> {contract.cancellationReason}
            </p>
            <p className="text-rose-600">
              Novas competências e previsões futuras estão bloqueadas a partir da data de cancelamento. Todas as versões e obrigações passadas permanecem auditadas e preservadas.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-zinc-200 flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab("details")}
            className={`pb-3 transition-colors ${
              activeTab === "details"
                ? "text-zinc-950 border-b-2 border-zinc-950 font-semibold"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Serviços & Composição Vigente (v{currentVer?.versionNumber})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 transition-colors flex items-center gap-1.5 ${
              activeTab === "history"
                ? "text-zinc-950 border-b-2 border-zinc-950 font-semibold"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <History className="w-4 h-4" />
            Histórico de Versões ({contract.versions?.length || 1})
          </button>
          <button
            onClick={() => setActiveTab("projections")}
            className={`pb-3 transition-colors flex items-center gap-1.5 ${
              activeTab === "projections"
                ? "text-zinc-950 border-b-2 border-zinc-950 font-semibold"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Previsão das Próximas Competências
          </button>
        </div>

        {/* TAB 1: Detalhes & Componentes Atuais */}
        {activeTab === "details" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-zinc-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h2 className="text-base font-semibold text-zinc-900">
                  Componentes Contratados (Snapshot Imutável)
                </h2>
                <span className="text-xs text-zinc-500">
                  Versão em vigor desde: <strong>{currentVer?.effectiveDate}</strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-medium">
                    <tr>
                      <th className="px-4 py-2.5">Componente / Serviço</th>
                      <th className="px-4 py-2.5">Origem Comercial</th>
                      <th className="px-4 py-2.5 w-24">Qtd</th>
                      <th className="px-4 py-2.5 w-32">Preço Unit. Acordado</th>
                      <th className="px-4 py-2.5 w-32">Custo Unit. Específico</th>
                      <th className="px-4 py-2.5 w-32 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {currentVer?.items?.map((it) => (
                      <tr key={it.id} className="hover:bg-zinc-50/50">
                        <td className="px-4 py-3 font-medium text-zinc-900">
                          {it.serviceName}
                        </td>
                        <td className="px-4 py-3 text-zinc-500">
                          {it.comboName ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-medium border border-emerald-100">
                              Combo: {it.comboName}
                            </span>
                          ) : (
                            <span className="text-zinc-500">Serviço Avulso</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-700">{it.quantity}</td>
                        <td className="px-4 py-3 font-semibold text-zinc-900">
                          R$ {it.unitPrice.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-zinc-500">
                          R$ {it.unitCost.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-zinc-950">
                          R$ {it.totalPrice.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  Total correspondente à soma estrita dos componentes
                </span>
                <span className="text-base font-bold text-zinc-950">
                  R$ {(currentVer?.totalAmount || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Informações de Vigência */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl border border-zinc-200/80 shadow-xs space-y-2">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Condições de Vigência
                </h3>
                <div className="text-xs space-y-1 text-zinc-700">
                  <p>
                    <strong>Data de Início Original:</strong> {currentVer?.startDate}
                  </p>
                  <p>
                    <strong>Tipo de Vigência:</strong>{" "}
                    {currentVer?.isIndefinite ? "Indeterminada" : `Até ${currentVer?.endDate}`}
                  </p>
                  <p>
                    <strong>Dia Base de Cobrança:</strong> Dia {currentVer?.dueDay} de cada competência
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-zinc-200/80 shadow-xs space-y-2">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Observações e Diretrizes
                </h3>
                <p className="text-xs text-zinc-600">
                  {currentVer?.notes || currentVer?.description || "Sem notas adicionais registradas para esta vigência."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Histórico de Versões */}
        {activeTab === "history" && (
          <div className="bg-white p-6 rounded-xl border border-zinc-200/80 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Linha do Tempo de Versões e Aditivos
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Todas as alterações geram uma nova versão com data de vigência explícita, preservando o histórico para auditoria sem alterar competências passadas.
              </p>
            </div>

            <div className="space-y-4">
              {contract.versions?.map((v) => (
                <div
                  key={v.id}
                  className={`p-4 rounded-xl border transition-all ${
                    v.versionNumber === currentVer?.versionNumber
                      ? "border-emerald-300 bg-emerald-50/20"
                      : "border-zinc-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-900 text-white">
                        v{v.versionNumber}
                      </span>
                      <span className="font-semibold text-sm text-zinc-900">{v.title}</span>
                      {v.versionNumber === currentVer?.versionNumber && (
                        <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          Versão Vigente
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">
                      Vigência a partir de: <strong>{v.effectiveDate}</strong>
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-zinc-600">
                    <div>
                      <span>Valor Contratado: </span>
                      <strong className="text-zinc-900">
                        R$ {v.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div>
                      <span>Periodicidade: </span>
                      <strong>{v.billingPeriod}</strong> (Venc. Dia {v.dueDay})
                    </div>
                    <div>
                      <span>Itens Contratados: </span>
                      <strong>{v.items?.length || 0} componentes</strong>
                    </div>
                  </div>

                  {/* Lista de Itens da Versão */}
                  <div className="mt-3 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500 space-y-1">
                    {v.items?.map((it) => (
                      <div key={it.id} className="flex items-center justify-between">
                        <span>
                          • {it.serviceName}{" "}
                          {it.comboName && `(Combo ${it.comboName})`} x {it.quantity}
                        </span>
                        <span className="font-semibold text-zinc-800">
                          R$ {it.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Projeção de Recorrências (Preparação para Fase 3) */}
        {activeTab === "projections" && (
          <div className="bg-white p-6 rounded-xl border border-zinc-200/80 shadow-xs space-y-4">
            <div className="border-b border-zinc-100 pb-3">
              <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Regras de Recorrência • Preparação para Fase 3
              </span>
              <h2 className="text-base font-semibold text-zinc-900 mt-2">
                Previsão de Competências Futuras
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Demonstração das competências, datas de vencimento ajustadas e chaves canônicas de idempotência que alimentarão o motor financeiro na Fase 3.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-medium">
                  <tr>
                    <th className="px-4 py-2.5">Competência</th>
                    <th className="px-4 py-2.5">Vencimento Efetivo</th>
                    <th className="px-4 py-2.5">Chave Canônica de Idempotência</th>
                    <th className="px-4 py-2.5">Versão Base</th>
                    <th className="px-4 py-2.5 text-right">Valor Previsto</th>
                    <th className="px-4 py-2.5 text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {projections.map((p) => (
                    <tr
                      key={p.idempotencyKey}
                      className={p.isPastOrCanceled ? "opacity-50 bg-zinc-50/50" : "hover:bg-zinc-50/50"}
                    >
                      <td className="px-4 py-3 font-semibold text-zinc-900">{p.competency}</td>
                      <td className="px-4 py-3 text-zinc-700">{p.effectiveDueDate}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-zinc-500">
                        {p.idempotencyKey}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-mono text-[10px]">
                          v{p.versionNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-zinc-950">
                        R$ {p.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.isPastOrCanceled ? (
                          <span className="text-[10px] text-rose-600 font-medium">
                            Bloqueada / Cancelada
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-medium">
                            Aguardando Fase 3
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Cancelamento de Contrato */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-950">Cancelar Contratação</h3>
                <p className="text-xs text-zinc-500">Ação irreversível de encerramento</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600">
              Ao cancelar, o contrato terá seu status alterado para <strong>CANCELADA</strong>. Cobranças futuras serão interrompidas e o histórico de versões será integralmente preservado para auditoria.
            </p>

            {cancelError && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs">{cancelError}</div>
            )}

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Motivo do Cancelamento *
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Solicitação do cliente para redução de custos, rescisão amigável..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={canceling}
                  className="px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {canceling ? "Cancelando..." : "Confirmar Cancelamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nova Versão de Vigência */}
      {newVersionModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-zinc-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-950">Criar Nova Versão de Vigência</h3>
                <p className="text-xs text-zinc-500">
                  Reajuste de preços ou alteração de componentes com data de vigência explícita
                </p>
              </div>
            </div>

            {versionError && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs">{versionError}</div>
            )}

            <form onSubmit={handleSaveNewVersion} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Título / Identificação da Versão *
                  </label>
                  <input
                    type="text"
                    value={newVerTitle}
                    onChange={(e) => setNewVerTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Data de Início da Nova Vigência *
                  </label>
                  <input
                    type="date"
                    value={newVerEffectiveDate}
                    onChange={(e) => setNewVerEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    required
                  />
                  <span className="text-[10px] text-zinc-400">
                    Competências a partir desta data adotarão os novos valores.
                  </span>
                </div>
              </div>

              {/* Ajuste de Preços dos Itens */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-700">
                  Preços e Custos dos Componentes para Esta Versão
                </label>
                <div className="border border-zinc-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                      <tr>
                        <th className="p-2.5">Serviço</th>
                        <th className="p-2.5 w-24">Qtd</th>
                        <th className="p-2.5 w-32">Preço (R$)</th>
                        <th className="p-2.5 w-32">Custo (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {newVerItems.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-medium text-zinc-900">{it.serviceName}</td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              min={1}
                              value={it.quantity}
                              onChange={(e) => {
                                const copy = [...newVerItems];
                                copy[idx].quantity = Number(e.target.value);
                                setNewVerItems(copy);
                              }}
                              className="w-16 px-2 py-1 bg-zinc-50 border rounded text-xs"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              step={0.01}
                              min={0}
                              value={it.unitPrice}
                              onChange={(e) => {
                                const copy = [...newVerItems];
                                copy[idx].unitPrice = Number(e.target.value);
                                setNewVerItems(copy);
                              }}
                              className="w-28 px-2 py-1 bg-zinc-50 border rounded text-xs font-semibold"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              step={0.01}
                              min={0}
                              value={it.unitCost}
                              onChange={(e) => {
                                const copy = [...newVerItems];
                                copy[idx].unitCost = Number(e.target.value);
                                setNewVerItems(copy);
                              }}
                              className="w-28 px-2 py-1 bg-zinc-50 border rounded text-xs text-zinc-600"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 flex justify-between items-center text-xs">
                <span className="text-zinc-500">Novo Total Contratado:</span>
                <span className="font-bold text-zinc-950 text-sm">
                  R${" "}
                  {newVerItems
                    .reduce((acc, it) => acc + (it.quantity || 1) * (it.unitPrice || 0), 0)
                    .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setNewVersionModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingVersion}
                  className="px-4 py-2 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  {savingVersion ? "Salvando Nova Versão..." : "Gravar Nova Versão"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
