"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Client } from "@/modules/clients/types";
import {
  Users,
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
} from "lucide-react";
import { formatDocument } from "@/shared/cpf-cnpj";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [typeFilter, setTypeFilter] = useState<"" | "PF" | "PJ">("");

  const loadClients = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(`/api/clients?${params.toString()}`);
      const data = await res.json();
      setClients(data.clients || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error("Erro ao carregar clientes", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [statusFilter, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadClients();
  };

  return (
    <AppShell activeSection="clients">
      <div className="space-y-6">
        {/* Header com Ações */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Módulo Comercial
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
              Gestão de Clientes
            </h1>
            <p className="text-xs text-zinc-500">
              Pessoas Físicas e Jurídicas com validação de documentos, contatos e histórico preservado
            </p>
          </div>
          <Link
            href="/clients/new"
            className="px-4 py-2 rounded-full bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition shadow-xs flex items-center gap-1.5 active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Cliente
          </Link>
        </div>

        {/* Barra de Pesquisa e Filtros */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, razão social, documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-full bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-zinc-900 transition"
            />
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {/* Filtro Status */}
            <div className="flex items-center rounded-full bg-zinc-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("ACTIVE")}
                className={`px-3 py-1 rounded-full font-medium transition ${
                  statusFilter === "ACTIVE"
                    ? "bg-white text-zinc-950 shadow-2xs font-semibold"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                Ativos
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ARCHIVED")}
                className={`px-3 py-1 rounded-full font-medium transition ${
                  statusFilter === "ARCHIVED"
                    ? "bg-white text-zinc-950 shadow-2xs font-semibold"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                Arquivados
              </button>
            </div>

            {/* Filtro Tipo PF/PJ */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "" | "PF" | "PJ")}
              className="px-3 py-1.5 rounded-full bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 focus:outline-none focus:border-zinc-900 font-medium"
            >
              <option value="">Todos os tipos</option>
              <option value="PJ">Pessoa Jurídica (PJ)</option>
              <option value="PF">Pessoa Física (PF)</option>
            </select>

            <button
              onClick={loadClients}
              title="Atualizar lista"
              className="p-2 rounded-full bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Tabela de Clientes */}
        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              Total cadastrado: <strong className="text-zinc-900">{total}</strong> cliente(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-600">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
                <tr>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3">Nome / Razão Social</th>
                  <th className="py-3 px-3">Documento</th>
                  <th className="py-3 px-3">Contato</th>
                  <th className="py-3 px-3">Localização</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400">
                      Carregando clientes...
                    </td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400 space-y-2">
                      <Users className="w-8 h-8 text-zinc-300 mx-auto" />
                      <p>Nenhum cliente encontrado com os filtros selecionados.</p>
                      <Link
                        href="/clients/new"
                        className="inline-block text-xs font-semibold text-zinc-900 underline underline-offset-4"
                      >
                        Cadastrar primeiro cliente
                      </Link>
                    </td>
                  </tr>
                ) : (
                  clients.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-50/70 transition">
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                            c.type === "PJ"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {c.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-zinc-100 text-zinc-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {c.type === "PJ" ? <Building2 className="w-3.5 h-3.5 text-zinc-600" /> : <User className="w-3.5 h-3.5 text-zinc-600" />}
                          </div>
                          <div>
                            <Link
                              href={`/clients/${c.id}`}
                              className="font-semibold text-zinc-900 hover:underline"
                            >
                              {c.name}
                            </Link>
                            {c.tradeName && (
                              <div className="text-[10px] text-zinc-400">
                                Fantasia: {c.tradeName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-zinc-600">
                        {c.document ? formatDocument(c.document) : "-"}
                      </td>
                      <td className="py-3.5 px-3">
                        {c.email && <div className="text-zinc-800">{c.email}</div>}
                        {c.phone && <div className="text-[10px] text-zinc-400">{c.phone}</div>}
                        {!c.email && !c.phone && <span className="text-zinc-400">-</span>}
                      </td>
                      <td className="py-3.5 px-3">
                        {c.city ? `${c.city}${c.state ? ` - ${c.state}` : ""}` : "-"}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-semibold border ${
                            c.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-zinc-100 text-zinc-500 border-zinc-200"
                          }`}
                        >
                          {c.status === "ACTIVE" ? "ATIVO" : "ARQUIVADO"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <Link
                          href={`/clients/${c.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-medium border border-zinc-200 transition"
                        >
                          Detalhes
                          <ChevronRight className="w-3 h-3 text-zinc-400" />
                        </Link>
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
