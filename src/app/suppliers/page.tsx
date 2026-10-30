"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { SupplierRecord } from "@/modules/suppliers/types";
import {
  Truck,
  Search,
  Filter,
  Plus,
  Building2,
  User,
  Phone,
  Mail,
  ChevronRight,
  Archive,
  RefreshCw,
  ExternalLink,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { formatDocument } from "@/shared/cpf-cnpj";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "ARCHIVED" | "ALL">("ACTIVE");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);

      const res = await fetch(`/api/suppliers?${params.toString()}`);
      const data = await res.json();
      setSuppliers(data.suppliers || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error("Erro ao carregar fornecedores", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [statusFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadSuppliers();
  };

  const handleToggleArchive = async (id: string, currentStatus: string) => {
    const action = currentStatus === "ACTIVE" ? "archive" : "reactivate";
    const confirmMsg =
      action === "archive"
        ? "Deseja realmente arquivar este fornecedor? Ele não poderá ser vinculado a novos custos, mas o histórico permanece preservado."
        : "Deseja reativar este fornecedor?";

    if (!confirm(confirmMsg)) return;

    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro na operação.");
        return;
      }
      await loadSuppliers();
    } catch (e) {
      alert("Erro de comunicação ao alterar status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <AppShell activeSection="suppliers">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Gestão de Suprimentos & Custos
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-950 flex items-center gap-2.5">
              <Truck className="w-7 h-7 text-zinc-700" />
              Fornecedores & Prestadores
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 max-w-2xl mt-1">
              Cadastro unificado de fornecedores PF e PJ, vinculado aos serviços do catálogo, contratações e controle de contas a pagar.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/suppliers/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition shadow-xs active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Fornecedor</span>
            </Link>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por razão social, fantasia, código ou CPF/CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-20 py-2 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-xs text-zinc-900 placeholder-zinc-400 transition"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-zinc-200 text-zinc-700 hover:bg-zinc-300 text-[11px] font-medium transition"
            >
              Filtrar
            </button>
          </form>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end overflow-x-auto pb-1 md:pb-0">
            {/* Status Filter */}
            <div className="flex items-center rounded-xl bg-zinc-100 p-1 border border-zinc-200/70 text-xs font-medium">
              <button
                onClick={() => setStatusFilter("ACTIVE")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === "ACTIVE"
                    ? "bg-white text-zinc-950 font-semibold shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Ativos
              </button>
              <button
                onClick={() => setStatusFilter("ARCHIVED")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === "ARCHIVED"
                    ? "bg-white text-zinc-950 font-semibold shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Arquivados
              </button>
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === "ALL"
                    ? "bg-white text-zinc-950 font-semibold shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Todos
              </button>
            </div>

            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("ACTIVE");
                setCategoryFilter("");
              }}
              title="Recarregar"
              className="p-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tabela de Fornecedores */}
        <div className="rounded-2xl bg-white border border-zinc-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Exibindo <strong className="text-zinc-900">{suppliers.length}</strong> de{" "}
              <strong className="text-zinc-900">{total}</strong> fornecedores
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-600">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-400 bg-zinc-50/50 border-b border-zinc-100">
                <tr>
                  <th className="py-3 px-4">Código / Fornecedor</th>
                  <th className="py-3 px-4">Tipo & Categoria</th>
                  <th className="py-3 px-4">Contatos</th>
                  <th className="py-3 px-4">Localização</th>
                  <th className="py-3 px-4">Despesas Alocadas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400">
                      Carregando fornecedores...
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="max-w-xs mx-auto space-y-2">
                        <Truck className="w-8 h-8 text-zinc-300 mx-auto" />
                        <p className="text-zinc-700 font-semibold text-sm">Nenhum fornecedor encontrado</p>
                        <p className="text-zinc-400 text-xs">
                          {search
                            ? "Nenhum resultado para os termos pesquisados."
                            : "Comece cadastrando o primeiro fornecedor ou parceiro da sua empresa."}
                        </p>
                        {!search && (
                          <Link
                            href="/suppliers/new"
                            className="inline-block mt-3 px-4 py-2 rounded-full bg-zinc-900 text-white text-xs font-semibold"
                          >
                            Cadastrar Fornecedor
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center font-bold text-xs shrink-0 border border-zinc-200/60">
                            {s.personType === "PJ" ? (
                              <Building2 className="w-4 h-4 text-blue-600" />
                            ) : (
                              <User className="w-4 h-4 text-emerald-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-950 flex items-center gap-2">
                              <Link href={`/suppliers/${s.id}`} className="hover:underline">
                                {s.name}
                              </Link>
                              <span className="font-mono text-[10px] text-zinc-500 font-normal">
                                {s.supplierCode}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                              {s.tradeName && <span>{s.tradeName} •</span>}
                              <span>{s.document ? formatDocument(s.document) : "Sem documento"}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              s.personType === "PJ"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {s.personType === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"}
                          </span>
                          <div className="text-[11px] text-zinc-500">
                            {s.category || "Geral"}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 text-[11px]">
                          {s.phone && (
                            <div className="flex items-center gap-1.5 text-zinc-600">
                              <Phone className="w-3 h-3 text-zinc-400" />
                              <span>{s.phone}</span>
                            </div>
                          )}
                          {s.email && (
                            <div className="flex items-center gap-1.5 text-zinc-500 truncate max-w-[180px]">
                              <Mail className="w-3 h-3 text-zinc-400" />
                              <span className="truncate">{s.email}</span>
                            </div>
                          )}
                          {!s.phone && !s.email && (
                            <span className="text-zinc-400 italic">Não informado</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-zinc-600">
                        {s.city ? (
                          <div>
                            <span className="font-medium text-zinc-800">{s.city}</span>
                            {s.state && <span className="text-zinc-400">/{s.state}</span>}
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">Não informado</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-mono font-semibold text-zinc-900">
                            R${" "}
                            {Number(s.totalAllocatedExpenses || 0).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                          {s.openPayablesCount && s.openPayablesCount > 0 ? (
                            <div className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {s.openPayablesCount} título(s) em aberto
                            </div>
                          ) : (
                            <div className="text-[10px] text-zinc-400">Em dia</div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                            s.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-zinc-100 text-zinc-600 border-zinc-200"
                          }`}
                        >
                          {s.status === "ACTIVE" ? "Ativo" : "Arquivado"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/suppliers/${s.id}`}
                            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition shadow-2xs"
                            title="Ver detalhes"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleToggleArchive(s.id, s.status)}
                            disabled={actionLoadingId === s.id}
                            className={`p-1.5 rounded-lg border transition shadow-2xs ${
                              s.status === "ACTIVE"
                                ? "border-zinc-200 text-zinc-400 hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50"
                                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={s.status === "ACTIVE" ? "Arquivar" : "Reativar"}
                          >
                            {actionLoadingId === s.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : s.status === "ACTIVE" ? (
                              <Archive className="w-3.5 h-3.5" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
