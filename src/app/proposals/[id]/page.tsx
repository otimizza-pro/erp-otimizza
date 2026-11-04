"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import {
  FileText,
  ArrowLeft,
  Download,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Layers,
  DollarSign,
  Building,
  UserCheck,
  TrendingUp,
  RefreshCw,
  Plus,
  ShieldCheck,
  FileCheck,
  History,
  Info,
} from "lucide-react";
import {
  ProposalRecord,
  ProposalVersionRecord,
  ProposalStatus,
  ProposalPeriodicity,
} from "@/modules/proposals/types";
import { DocumentAttachmentSection } from "@/components/documents/document-attachment-section";

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [proposal, setProposal] = useState<ProposalRecord | null>(null);
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [conversionDueDate, setConversionDueDate] = useState("10");

  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [newVersionTitle, setNewVersionTitle] = useState("");

  const loadProposal = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/proposals/${id}`);
      if (!res.ok) {
        throw new Error("Proposta comercial não encontrada.");
      }
      const data: ProposalRecord = await res.json();
      setProposal(data);
      if (selectedVersionNumber === null) {
        setSelectedVersionNumber(data.currentVersionNumber);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao carregar proposta.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposal();
  }, [id]);

  const activeVersion: ProposalVersionRecord | undefined = React.useMemo(() => {
    if (!proposal || !proposal.versions) return undefined;
    return (
      proposal.versions.find((v) => v.versionNumber === selectedVersionNumber) ||
      proposal.currentVersion ||
      proposal.versions[0]
    );
  }, [proposal, selectedVersionNumber]);

  // Action: Send proposal
  const handleSendProposal = () => {
    if (!confirm("Confirmar envio da proposta ao cliente? O status passará para 'Enviada'.")) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/proposals/${id}/send`, { method: "POST" });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Falha ao enviar proposta.");
        }
        setSuccessMessage("Proposta marcada como Enviada com sucesso.");
        await loadProposal();
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Erro ao enviar proposta.");
      }
    });
  };

  // Action: Approve proposal
  const handleApproveProposal = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/proposals/${id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approvedVersionNumber: activeVersion?.versionNumber || proposal?.currentVersionNumber,
            approvalNotes: approvalNotes.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Falha ao aprovar proposta.");
        }
        setShowApproveModal(false);
        setSuccessMessage("Proposta aprovada com sucesso! O snapshot foi congelado.");
        await loadProposal();
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Erro ao aprovar proposta.");
      }
    });
  };

  // Action: Reject proposal
  const handleRejectProposal = () => {
    if (!rejectionReason.trim()) {
      alert("Informe o motivo da rejeição.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/proposals/${id}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: rejectionReason.trim() }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Falha ao rejeitar proposta.");
        }
        setShowRejectModal(false);
        setSuccessMessage("Proposta marcada como Rejeitada.");
        await loadProposal();
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Erro ao rejeitar proposta.");
      }
    });
  };

  // Action: Cancel proposal
  const handleCancelProposal = () => {
    if (!cancellationReason.trim()) {
      alert("Informe o motivo do cancelamento.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/proposals/${id}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: cancellationReason.trim() }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Falha ao cancelar proposta.");
        }
        setShowCancelModal(false);
        setSuccessMessage("Proposta cancelada.");
        await loadProposal();
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Erro ao cancelar proposta.");
      }
    });
  };

  // Action: Create new version
  const handleCreateNewVersion = () => {
    if (!activeVersion) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/proposals/${id}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newVersionTitle.trim() || proposal?.title || "Nova Versão",
            paymentTerms: activeVersion.commercialTermsSnapshot?.paymentTerms,
            startLeadTimeDays: activeVersion.commercialTermsSnapshot?.startLeadTimeDays || 5,
            scopeDescription: activeVersion.commercialTermsSnapshot?.scopeDescription,
            clientNotes: activeVersion.commercialTermsSnapshot?.clientNotes,
            internalNotes: activeVersion.commercialTermsSnapshot?.internalNotes,
            globalDiscount: activeVersion.discountTotal || 0,
            items: (activeVersion.items || []).map((it, idx) => ({
              sourceType: it.sourceType,
              serviceId: it.serviceId || null,
              comboId: it.comboId || null,
              descriptionSnapshot: it.descriptionSnapshot,
              periodicity: it.periodicity,
              quantity: it.quantity,
              referenceUnitPrice: it.referenceUnitPrice,
              negotiatedUnitPrice: it.negotiatedUnitPrice,
              discountAmount: it.discountAmount,
              displayOrder: idx + 1,
            })),
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Falha ao criar nova versão.");
        }
        const createdVer = await res.json();
        setShowNewVersionModal(false);
        setSelectedVersionNumber(createdVer.versionNumber);
        setSuccessMessage(`Nova versão v${createdVer.versionNumber} criada com sucesso para negociação!`);
        await loadProposal();
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Erro ao criar nova versão.");
      }
    });
  };

  // Action: Convert to contract
  const handleConvertToContract = () => {
    const dueDayNum = parseInt(conversionDueDate, 10) || 10;
    const idempotencyKey = `prop_conv_${id}_v${proposal?.approvedVersionNumber}_${Date.now()}`;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/proposals/${id}/convert`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dueDay: dueDayNum,
            startDate: new Date().toISOString().slice(0, 10),
            idempotencyKey,
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Falha ao converter proposta em contrato.");
        }
        setShowConvertModal(false);
        setSuccessMessage("Proposta convertida em Contrato(s) com sucesso!");
        await loadProposal();
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Erro ao converter proposta.");
      }
    });
  };

  const formatBRL = (val?: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);
  };

  const getStatusBadge = (status: ProposalStatus) => {
    switch (status) {
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Rascunho
          </span>
        );
      case "SENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Send className="w-3.5 h-3.5 text-blue-500" />
            Enviada
          </span>
        );
      case "NEGOTIATING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Em Negociação
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Aprovada
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            Rejeitada
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
            Vencida
          </span>
        );
      case "CANCELED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
            <XCircle className="w-3.5 h-3.5 text-gray-400" />
            Cancelada
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  if (loading) {
    return (
      <AppShell activeSection="proposals">
        <div className="p-16 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-indigo-600 mb-3"></div>
          <p className="text-sm text-slate-500">Carregando detalhes da proposta comercial...</p>
        </div>
      </AppShell>
    );
  }

  if (!proposal) {
    return (
      <AppShell activeSection="proposals">
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Proposta não encontrada</h2>
          <p className="text-sm text-slate-500 mt-1">O identificador informado não existe ou foi removido.</p>
          <div className="mt-4">
            <Link
              href="/proposals"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Listagem
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const isApproved = proposal.status === "APPROVED";
  const isConverted = Boolean(proposal.contractId || (proposal.conversions && proposal.conversions.length > 0));
  const isLead = proposal.isLead || Boolean(proposal.leadId);

  return (
    <AppShell activeSection="proposals">
      <div className="space-y-6 pb-16">
        {/* Alerts */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Erro na operação</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Operação concluída</p>
              <p>{successMessage}</p>
            </div>
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link
              href="/proposals"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors mt-0.5"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-extrabold text-indigo-600 tracking-tight">
                  {proposal.proposalCode}
                </span>
                {getStatusBadge(proposal.status)}
                {isConverted && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <FileCheck className="w-3.5 h-3.5" />
                    Convertida em Contrato
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">{proposal.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                <span>Criada em: {new Date(proposal.createdAt).toLocaleDateString("pt-BR")}</span>
                <span>•</span>
                <span>Validade: {new Date(proposal.validUntil + "T12:00:00Z").toLocaleDateString("pt-BR")}</span>
                <span>•</span>
                <span>Versão Atual: v{proposal.currentVersionNumber}</span>
                {proposal.approvedVersionNumber && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-600 font-semibold">
                      Versão Aprovada: v{proposal.approvedVersionNumber}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Download PDF */}
            <a
              href={`/api/proposals/${proposal.id}/pdf${
                activeVersion ? `?versionId=${activeVersion.id}` : ""
              }`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Baixar apresentação PDF
            </a>

            {/* Cliente fechou proposta */}
            {!isConverted && proposal.status !== "CANCELED" && proposal.status !== "REJECTED" && (
              <button
                onClick={() => router.push(`/contracts/new?proposalId=${proposal.id}`)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm cursor-pointer"
                title="Abre a tela de criação de contrato já preenchida com esta proposta para revisão e salvamento"
              >
                <CheckCircle2 className="w-4 h-4" />
                Cliente fechou proposta
              </button>
            )}

            {/* Ver contrato se já convertido */}
            {isConverted && proposal.contractId && (
              <Link
                href={`/contracts/${proposal.contractId}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-sm"
              >
                <FileCheck className="w-4 h-4 text-indigo-600" />
                Ver Contrato Gerado
              </Link>
            )}

            {/* Send */}
            {proposal.status === "DRAFT" && (
              <button
                onClick={handleSendProposal}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Marcar como Enviada
              </button>
            )}

            {/* Approve manual alternativo */}
            {(proposal.status === "SENT" || proposal.status === "NEGOTIATING") && (
              <button
                onClick={() => setShowApproveModal(true)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                Apenas Registrar Aprovação
              </button>
            )}

            {/* Convert to Contract direto */}
            {isApproved && !isConverted && (
              <button
                onClick={() => setShowConvertModal(true)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <FileCheck className="w-4 h-4 text-indigo-600" />
                Conversão Rápida
              </button>
            )}

            {/* Create New Version */}
            {proposal.status !== "CANCELED" && (
              <button
                onClick={() => setShowNewVersionModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nova Versão
              </button>
            )}

            {/* Reject */}
            {(proposal.status === "SENT" || proposal.status === "NEGOTIATING") && (
              <button
                onClick={() => setShowRejectModal(true)}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Rejeitar
              </button>
            )}

            {/* Cancel */}
            {proposal.status !== "CANCELED" && !isConverted && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>

        {/* Converted Contracts Info Banner */}
        {isConverted && proposal.conversions && proposal.conversions.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-lg">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-900">
                  Esta proposta foi convertida em {proposal.conversions.length} contrato(s) ativo(s)
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {proposal.conversions.map((conv) => (
                    <span
                      key={conv.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-medium"
                    >
                      {conv.periodicity === "ONE_TIME"
                        ? "Contrato Avulso"
                        : conv.periodicity === "MONTHLY"
                        ? "Assinatura Mensal"
                        : "Contrato Anual"}
                      : {conv.contractNumber || conv.contractId.slice(0, 8)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Link
              href="/contracts"
              className="px-3.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
            >
              Ver Contratações
            </Link>
          </div>
        )}

        {/* Recipient & Opportunity Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm md:col-span-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                {isLead ? <UserCheck className="w-4 h-4 text-amber-500" /> : <Building className="w-4 h-4 text-emerald-500" />}
                Destinatário da Proposta
              </span>
              <span
                className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  isLead ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {isLead ? "Lead do CRM" : "Cliente Ativo"}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400">Nome / Razão Social</p>
                <p className="font-semibold text-slate-900 mt-0.5">{proposal.recipientName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Documento (CPF / CNPJ)</p>
                <p className="font-medium text-slate-800 mt-0.5">{proposal.recipientDocument || "Não informado"}</p>
              </div>
            </div>

            {isLead && (
              <div className="mt-3 p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Ao converter a proposta aprovada em contrato, o Lead será automaticamente cadastrado como Cliente ativo no ERP.
                </span>
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 pb-3 border-b border-slate-100">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                Vínculo com CRM
              </span>
              <div className="mt-3">
                <p className="text-xs text-slate-400">Oportunidade Comercial</p>
                {proposal.opportunityTitle ? (
                  <p className="font-semibold text-indigo-700 mt-0.5">{proposal.opportunityTitle}</p>
                ) : (
                  <p className="text-sm text-slate-500 mt-0.5">Sem oportunidade vinculada</p>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-4">
              A conversão contratual atualiza a oportunidade como &quot;Ganha&quot; sem duplicar métricas de receita.
            </p>
          </div>
        </div>

        {/* Version Switcher Tabs */}
        {proposal.versions && proposal.versions.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-slate-500 mr-2 flex items-center gap-1">
              <History className="w-4 h-4" />
              Versões:
            </span>
            {proposal.versions.map((ver) => {
              const isSelected = activeVersion?.versionNumber === ver.versionNumber;
              const isApprovedVer = ver.versionNumber === proposal.approvedVersionNumber;
              return (
                <button
                  key={ver.id}
                  onClick={() => setSelectedVersionNumber(ver.versionNumber)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span>v{ver.versionNumber}</span>
                  {isApprovedVer && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500 text-white font-bold">
                      Aprovada
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Financial Summary Cards for the Active Version */}
        {activeVersion && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Avulso / Implantação</p>
              <p className="text-2xl font-black text-amber-700 mt-1">
                {formatBRL(activeVersion.totalOneTimeEffective)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Serviços pontuais e setup</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Recorrente Mensal</p>
              <p className="text-2xl font-black text-indigo-700 mt-1">
                {formatBRL(activeVersion.totalMonthlyEffective)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Assinatura mensal contínua</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ciclo Anual</p>
              <p className="text-2xl font-black text-purple-700 mt-1">
                {formatBRL(activeVersion.totalYearlyEffective)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Serviços renovados anualmente</p>
            </div>
          </div>
        )}

        {/* Admin Confidential Margins (Internal Only) */}
        {activeVersion && (
          <div className="bg-slate-900 text-white p-5 rounded-xl shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold tracking-tight">Custos Internos & Margem da Agência</h3>
              </div>
              <span className="text-[11px] font-semibold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded border border-amber-400/30">
                Confidencial • Nunca sai no PDF
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
              <div>
                <p className="text-slate-400">Custo Fornecedores (Mensal)</p>
                <p className="text-base font-bold text-slate-200 mt-0.5">
                  {formatBRL(activeVersion.estimatedMonthlyCost)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Margem Líquida (Mensal)</p>
                <p className="text-base font-bold text-emerald-400 mt-0.5">
                  {formatBRL(activeVersion.totalMonthlyEffective - activeVersion.estimatedMonthlyCost)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Custo Setup (Avulso)</p>
                <p className="text-base font-bold text-slate-200 mt-0.5">
                  {formatBRL(activeVersion.estimatedOneTimeCost)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Margem Setup (Avulso)</p>
                <p className="text-base font-bold text-emerald-400 mt-0.5">
                  {formatBRL(activeVersion.totalOneTimeEffective - activeVersion.estimatedOneTimeCost)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Itens da Versão v{activeVersion?.versionNumber}
            </h3>
            <span className="text-xs text-slate-500">
              {activeVersion?.items?.length || 0} item(ns) incluídos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Item / Serviço</th>
                  <th className="py-3 px-4">Periodicidade</th>
                  <th className="py-3 px-4 text-center">Qtd</th>
                  <th className="py-3 px-4 text-right">Preço de Referência</th>
                  <th className="py-3 px-4 text-right">Preço Negociado</th>
                  <th className="py-3 px-4 text-right">Desconto</th>
                  <th className="py-3 px-4 text-right">Total Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {(activeVersion?.items || []).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {item.sourceType === "COMBO" ? (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-800 rounded">
                            Combo
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700 rounded">
                            Serviço
                          </span>
                        )}
                        <span className="font-semibold text-slate-900">{item.descriptionSnapshot}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                      {item.periodicity === "MONTHLY"
                        ? "Mensal"
                        : item.periodicity === "YEARLY"
                        ? "Anual"
                        : "Avulso / Implantação"}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-800 font-medium">{item.quantity}</td>
                    <td className="py-3.5 px-4 text-right text-slate-500 text-xs line-through">
                      {formatBRL(item.referenceUnitPrice)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                      {formatBRL(item.negotiatedUnitPrice)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-red-600 text-xs">
                      {item.discountAmount > 0 ? `-${formatBRL(item.discountAmount)}` : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatBRL(item.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Commercial Conditions & Notes */}
        {activeVersion && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Condições Comerciais & Pagamento
              </h4>
              <div className="space-y-2 text-sm text-slate-800">
                <p>
                  <span className="font-semibold text-slate-600">Condições: </span>
                  {activeVersion.commercialTermsSnapshot?.paymentTerms || "Conforme padrão da agência"}
                </p>
                <p>
                  <span className="font-semibold text-slate-600">Prazo de Início: </span>
                  {activeVersion.commercialTermsSnapshot?.startLeadTimeDays ?? 5} dias úteis após aceite
                </p>
              </div>

              {activeVersion.commercialTermsSnapshot?.scopeDescription && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Escopo do Projeto</p>
                  <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                    {activeVersion.commercialTermsSnapshot.scopeDescription}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Observações do Documento
              </h4>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">Visíveis no PDF do Cliente</p>
                <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                  {activeVersion.commercialTermsSnapshot?.clientNotes || "Sem observações adicionais."}
                </p>
              </div>

              {activeVersion.commercialTermsSnapshot?.internalNotes && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Notas Internas Confidenciais</p>
                  <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                    {activeVersion.commercialTermsSnapshot.internalNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Gestão Documental da Proposta */}
        <DocumentAttachmentSection
          entityType="PROPOSAL"
          entityId={proposal.id}
          entityTitle={`Proposta ${proposal.proposalCode}`}
        />

        {/* Audit Timeline */}
        {proposal.events && proposal.events.length > 0 && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <History className="w-4 h-4" />
              Linha do Tempo & Auditoria
            </h4>
            <div className="divide-y divide-slate-100">
              {proposal.events.map((ev) => (
                <div key={ev.id} className="py-2.5 flex items-start justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">{ev.eventType}</span>
                    {ev.previousState && ev.newState && (
                      <span className="text-slate-400 ml-2">
                        ({ev.previousState} &rarr; {ev.newState})
                      </span>
                    )}
                    {ev.actorName && (
                      <span className="text-slate-500 block mt-0.5">Por: {ev.actorName}</span>
                    )}
                  </div>
                  <span className="text-slate-400">
                    {new Date(ev.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL: Aprovar Proposta */}
        {showApproveModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Aprovar Proposta Comercial</h3>
                  <p className="text-xs text-slate-500">Aprovação manual da versão v{activeVersion?.versionNumber}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 text-slate-700">
                <p>
                  <span className="font-semibold">Versão:</span> v{activeVersion?.versionNumber}
                </p>
                <p>
                  <span className="font-semibold">Mensal:</span> {formatBRL(activeVersion?.totalMonthlyEffective)}
                </p>
                <p>
                  <span className="font-semibold">Avulso:</span> {formatBRL(activeVersion?.totalOneTimeEffective)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Observações da Aprovação (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Aceite confirmado pelo cliente via WhatsApp em reunião..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApproveProposal}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  Confirmar Aprovação
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Converter em Contrato */}
        {showConvertModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Converter em Contrato</h3>
                  <p className="text-xs text-slate-500">Criação transacional de contrato e assinatura no ERP</p>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs space-y-1.5 text-indigo-900">
                <p className="font-semibold">Regras da Conversão:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                  {isLead && <li>O Lead será convertido automaticamente em Cliente cadastrado.</li>}
                  <li>Itens avulsos e mensais gerarão contratos dedicados por periodicidade.</li>
                  <li>A oportunidade vinculada será marcada como WON no CRM.</li>
                  <li>Operação protegida com idempotência contra requisições simultâneas.</li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Dia de Vencimento Mensal</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={conversionDueDate}
                  onChange={(e) => setConversionDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConvertToContract}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  Efetivar Contrato(s)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Rejeitar Proposta */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Rejeitar Proposta</h3>
                  <p className="text-xs text-slate-500">Registre o motivo informado pelo cliente</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Motivo da Rejeição *</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Orçamento acima do esperado, optou por solução interna..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRejectProposal}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  Confirmar Rejeição
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Cancelar Proposta */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gray-100 text-gray-600 rounded-xl">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Cancelar Proposta</h3>
                  <p className="text-xs text-slate-500">Preserva o histórico e a auditoria</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Motivo do Cancelamento *</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Mudança de diretriz comercial..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleCancelProposal}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm disabled:opacity-50"
                >
                  Confirmar Cancelamento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Criar Nova Versão */}
        {showNewVersionModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Criar Nova Versão</h3>
                  <p className="text-xs text-slate-500">
                    Gera v{(proposal.currentVersionNumber || 0) + 1} para renegociação preservando as versões anteriores
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Título da Nova Versão</label>
                <input
                  type="text"
                  placeholder={proposal.title}
                  value={newVersionTitle}
                  onChange={(e) => setNewVersionTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewVersionModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewVersion}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  Gerar Versão v{(proposal.currentVersionNumber || 0) + 1}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
