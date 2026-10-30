"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import {
  Search,
  Plus,
  RefreshCw,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
  DollarSign,
  AlertCircle,
  Clock,
} from "lucide-react";
import { ContractRecord, ContractStatus } from "@/modules/contracts/types";

export default function ContractsListPage() {
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  const loadContracts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/contracts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setContracts(data.contracts || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Erro ao carregar contratações:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      loadContracts();
    });
  };

  const getStatusBadge = (status: ContractStatus) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Ativa
          </span>
        );
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Rascunho
          </span>
        );
      case "CANCELED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Cancelada
          </span>
        );
      case "ENDED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            Encerrada
          </span>
        );
      default:
        return null;
    }
  };

  const getPeriodLabel = (period?: string) => {
    switch (period) {
      case "MONTHLY":
        return "Mensal";
      case "YEARLY":
        return "Anual";
      case "ONE_TIME":
        return "Avulsa";
      default:
        return "Recorrente";
    }
  };

  return (
    <AppShell activeSection="contracts">
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Fase 2 • Vigências & Recorrência
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mt-2">
              Contratações & Serviços
            </h1>
            <p className="text-sm text-zinc-600 mt-1">
              Gestão de contratos independentes por cliente, versões de vigência, combos customizados e histórico de preços.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/contracts/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950 text-white text-sm font-medium hover:bg-zinc-800 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nova Contratação
            </Link>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Total de Contratações
              </p>
              <p className="text-2xl font-bold text-zinc-900 mt-1">{total}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Contratos Ativos
              </p>
              <p className="text-2xl font-bold text-emerald-800 mt-1">
                {contracts.filter((c) => c.status === "ACTIVE").length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-800 border border-emerald-100">
              <RefreshCw className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Receita Contratada Ativa
              </p>
              <p className="text-2xl font-bold text-zinc-900 mt-1">
                R${" "}
                {contracts
                  .filter((c) => c.status === "ACTIVE")
                  .reduce((acc, c) => acc + (c.currentVersion?.totalAmount || 0), 0)
                  .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por número do contrato, cliente ou título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
            />
          </form>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg text-xs font-medium self-start md:self-auto overflow-x-auto">
            {[
              { id: "ALL", label: "Todas" },
              { id: "ACTIVE", label: "Ativas" },
              { id: "DRAFT", label: "Rascunhos" },
              { id: "CANCELED", label: "Canceladas" },
              { id: "ENDED", label: "Encerradas" },
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

        {/* Contracts Table */}
        <div className="bg-white rounded-xl border border-zinc-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              Carregando contratações...
            </div>
          ) : contracts.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
              <p className="text-zinc-800 font-medium">Nenhuma contratação encontrada</p>
              <p className="text-zinc-500 text-xs mt-1">
                Cadastre a primeira contratação para este cliente ou ajuste os filtros.
              </p>
              <Link
                href="/contracts/new"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800"
              >
                <Plus className="w-3.5 h-3.5" />
                Criar Contratação
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50/80 border-b border-zinc-200 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Contrato / Número</th>
                    <th className="px-6 py-3">Cliente</th>
                    <th className="px-6 py-3">Periodicidade & Venc.</th>
                    <th className="px-6 py-3">Versão & Vigência</th>
                    <th className="px-6 py-3">Valor Contratado</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/80">
                  {contracts.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-zinc-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <Link href={`/contracts/${c.id}`} className="block">
                          <span className="font-mono text-xs font-bold text-zinc-950 block">
                            {c.contractNumber}
                          </span>
                          <span className="text-xs text-zinc-600 font-medium line-clamp-1 mt-0.5">
                            {c.currentVersion?.title || "Sem título"}
                          </span>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/clients/${c.clientId}`} className="block hover:underline">
                          <p className="font-medium text-zinc-900">{c.clientName}</p>
                          {c.clientTradeName && (
                            <p className="text-xs text-zinc-500">{c.clientTradeName}</p>
                          )}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded">
                          {getPeriodLabel(c.currentVersion?.billingPeriod)}
                        </span>
                        <span className="text-xs text-zinc-500 block mt-1">
                          Vence dia {c.currentVersion?.dueDay}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-zinc-600">
                          <span className="font-semibold text-zinc-900">
                            v{c.currentVersion?.versionNumber || 1}
                          </span>{" "}
                          • Desde {c.currentVersion?.startDate}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {c.currentVersion?.isIndefinite
                            ? "Vigência Indeterminada"
                            : `Até ${c.currentVersion?.endDate || "-"}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-zinc-950">
                        R${" "}
                        {(c.currentVersion?.totalAmount || 0).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(c.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/contracts/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-950 px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
                        >
                          Detalhes
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
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
