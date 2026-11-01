"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import {
  Search,
  Plus,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  Building,
  UserCheck,
} from "lucide-react";
import { ProposalRecord, ProposalStatus, ProposalMetrics } from "@/modules/proposals/types";

function ProposalsListPageContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "ALL";

  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [metrics, setMetrics] = useState<ProposalMetrics | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const s = searchParams.get("status");
    if (s) {
      setStatusFilter(s);
    }
  }, [searchParams]);

  const loadProposals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const [resList, resMetrics] = await Promise.all([
        fetch(`/api/proposals?${params.toString()}`),
        fetch("/api/proposals/metrics"),
      ]);

      if (resList.ok) {
        const data = await resList.json();
        setProposals(data.proposals || []);
        setTotal(data.total || 0);
      }

      if (resMetrics.ok) {
        const metricsData = await resMetrics.json();
        setMetrics(metricsData);
      }
    } catch (err) {
      console.error("Erro ao carregar propostas comerciais:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      loadProposals();
    });
  };

  const getStatusBadge = (status: ProposalStatus) => {
    switch (status) {
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3 h-3 text-slate-500" />
            Rascunho
          </span>
        );
      case "SENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <ArrowRight className="w-3 h-3 text-blue-500" />
            Enviada
          </span>
        );
      case "NEGOTIATING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-500" />
            Em Negociação
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Aprovada
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3 text-red-500" />
            Rejeitada
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
            <AlertCircle className="w-3 h-3 text-orange-500" />
            Vencida
          </span>
        );
      case "CANCELED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
            <XCircle className="w-3 h-3 text-gray-400" />
            Cancelada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const formatBRL = (val?: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);
  };

  return (
    <AppShell activeSection="proposals">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Propostas Comerciais</h1>
            <p className="text-sm text-slate-500 mt-1">
              Elabore, versione e negocie propostas comerciais integradas ao CRM e converta em contratos.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/proposals/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <Plus className="w-4 h-4" />
              Nova Proposta
            </Link>
          </div>
        </div>

        {/* Top Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Propostas</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalProposals}</p>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <span>{metrics.totalSent} enviadas</span>
                <span>•</span>
                <span>{metrics.totalDraft} em rascunho</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Taxa de Aprovação</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{metrics.approvalRate.toFixed(1)}%</p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <span>{metrics.totalApproved} propostas aprovadas</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Aprovado Mensal</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{formatBRL(metrics.totalApprovedMonthly)}</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <span>Receita recorrente contratável</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Aprovado Avulso</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{formatBRL(metrics.totalApprovedOneTime)}</p>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <span>Implantações e serviços avulsos</span>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, título ou destinatário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900"
            />
          </form>

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {[
              { id: "ALL", label: "Todas" },
              { id: "DRAFT", label: "Rascunho" },
              { id: "SENT", label: "Enviadas" },
              { id: "NEGOTIATING", label: "Em Negociação" },
              { id: "APPROVED", label: "Aprovadas" },
              { id: "REJECTED", label: "Rejeitadas" },
              { id: "EXPIRED", label: "Vencidas" },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setStatusFilter(pill.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  statusFilter === pill.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table of Proposals */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-indigo-600 mb-3"></div>
              <p className="text-sm text-slate-500">Carregando propostas comerciais...</p>
            </div>
          ) : proposals.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">Nenhuma proposta encontrada</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Não há propostas cadastradas com os filtros atuais. Clique em &quot;Nova Proposta&quot; para iniciar uma negociação comercial.
              </p>
              <div className="mt-5">
                <Link
                  href="/proposals/new"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Criar Primeira Proposta
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Código / Título</th>
                    <th className="py-3 px-4">Destinatário</th>
                    <th className="py-3 px-4">Versão</th>
                    <th className="py-3 px-4">Valores Negociados</th>
                    <th className="py-3 px-4">Validade</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {proposals.map((prop) => {
                    const cv = prop.currentVersion;
                    const isLead = prop.isLead || Boolean(prop.leadId);
                    return (
                      <tr key={prop.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="py-3.5 px-4">
                          <Link href={`/proposals/${prop.id}`} className="block">
                            <span className="font-semibold text-indigo-600 group-hover:text-indigo-800 flex items-center gap-1.5">
                              {prop.proposalCode}
                            </span>
                            <span className="font-medium text-slate-900 block truncate max-w-xs mt-0.5">
                              {prop.title}
                            </span>
                          </Link>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            {isLead ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800">
                                Lead
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800">
                                Cliente
                              </span>
                            )}
                            <span className="font-medium text-slate-800 truncate max-w-xs">
                              {prop.recipientName || "Não identificado"}
                            </span>
                          </div>
                          {prop.recipientDocument && (
                            <span className="text-xs text-slate-500 block mt-0.5">{prop.recipientDocument}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            v{prop.currentVersionNumber}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          <div className="space-y-0.5">
                            {cv && cv.totalMonthlyEffective > 0 && (
                              <div className="flex items-center gap-1 text-xs text-slate-800">
                                <span className="font-medium">{formatBRL(cv.totalMonthlyEffective)}</span>
                                <span className="text-slate-400">/mês</span>
                              </div>
                            )}
                            {cv && cv.totalOneTimeEffective > 0 && (
                              <div className="flex items-center gap-1 text-xs text-amber-700">
                                <span className="font-medium">{formatBRL(cv.totalOneTimeEffective)}</span>
                                <span className="text-amber-500">(avulso)</span>
                              </div>
                            )}
                            {cv && cv.totalYearlyEffective > 0 && (
                              <div className="flex items-center gap-1 text-xs text-purple-700">
                                <span className="font-medium">{formatBRL(cv.totalYearlyEffective)}</span>
                                <span className="text-purple-400">/ano</span>
                              </div>
                            )}
                            {(!cv || (cv.totalMonthlyEffective === 0 && cv.totalOneTimeEffective === 0 && cv.totalYearlyEffective === 0)) && (
                              <span className="text-xs text-slate-400">Sem itens</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs">
                          {prop.validUntil ? new Date(prop.validUntil + "T12:00:00Z").toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(prop.status)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={`/api/proposals/${prop.id}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                              title="Baixar PDF Oficial"
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <Link
                              href={`/proposals/${prop.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                              Ver Detalhes
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer count */}
          {!loading && proposals.length > 0 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Mostrando {proposals.length} de {total} propostas comerciais</span>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function ProposalsListPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Carregando propostas...</div>}>
      <ProposalsListPageContent />
    </Suspense>
  );
}
