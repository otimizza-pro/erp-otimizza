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
  Edit2,
  Trash2,
  AlertCircle,
  Check,
  X
} from "lucide-react";
import { formatDocument } from "@/shared/cpf-cnpj";
import { WhatsAppLink } from "@/components/ui/whatsapp";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [typeFilter, setTypeFilter] = useState<"" | "PF" | "PJ">("");

  // Ações Individuais e em Massa
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<"ACTIVE" | "ARCHIVED" | "">("");
  const [bulkType, setBulkType] = useState<"PF" | "PJ" | "">("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

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

  // Alternar seleção de todos os clientes visíveis
  const isAllSelected = clients.length > 0 && selectedClientIds.length === clients.length;
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(clients.map((c) => c.id));
    }
  };

  const handleToggleSelectClient = (id: string) => {
    if (selectedClientIds.includes(id)) {
      setSelectedClientIds(selectedClientIds.filter((item) => item !== id));
    } else {
      setSelectedClientIds([...selectedClientIds, id]);
    }
  };

  // Exclusão individual
  const handleDeleteClient = async (clientItem: Client) => {
    const confirmed = window.confirm(
      `ATENÇÃO: Deseja realmente excluir o cliente "${clientItem.name}"?\n\n` +
      `Esta ação é definitiva e irá:\n` +
      `• Apagar permanentemente o cadastro do cliente e seus contatos\n` +
      `• Excluir todos os documentos e arquivos anexados no armazenamento (liberando espaço em disco)\n` +
      `• Limpar vínculos operacionais\n\n` +
      `Tem certeza que deseja continuar?`
    );
    if (!confirmed) return;

    setDeletingId(clientItem.id);
    try {
      const res = await fetch(`/api/clients/${clientItem.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao excluir cliente.");
      }
      setFeedbackMessage(data.message || `Cliente "${clientItem.name}" excluído com sucesso.`);
      await loadClients();
      setTimeout(() => setFeedbackMessage(null), 6000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir cliente.");
    } finally {
      setDeletingId(null);
    }
  };

  // Exclusão em Massa de Clientes
  const handleBulkDelete = async () => {
    if (selectedClientIds.length === 0) return;
    const confirmed = window.confirm(
      `ATENÇÃO: Deseja realmente EXCLUIR DEFINITIVAMENTE os ${selectedClientIds.length} cliente(s) selecionados?\n\n` +
      `• Todos os documentos, arquivos anexados no disco e dados desses clientes serão expurgados permanentemente.\n` +
      `• Registros com liquidações financeiras pagas consolidadas serão arquivados com arquivos expurgados para manter a integridade fiscal de caixa.\n\n` +
      `Esta ação não pode ser desfeita. Continuar?`
    );
    if (!confirmed) return;

    setBulkDeleting(true);
    try {
      const res = await fetch("/api/clients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedClientIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir clientes em lote.");
      setFeedbackMessage(data.message || `${selectedClientIds.length} cliente(s) processados com sucesso.`);
      setSelectedClientIds([]);
      loadClients();
      setTimeout(() => setFeedbackMessage(null), 6000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir clientes.");
    } finally {
      setBulkDeleting(false);
    }
  };

  // Edição em Massa de Clientes
  const handleBulkEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClientIds.length === 0) return;
    if (!bulkStatus && !bulkType) {
      alert("Por favor, selecione ao menos um campo para alterar.");
      return;
    }

    setBulkSaving(true);
    try {
      const updates: Record<string, string> = {};
      if (bulkStatus) updates.status = bulkStatus;
      if (bulkType) updates.type = bulkType;

      const res = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedClientIds, updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar clientes em lote.");
      setFeedbackMessage(data.message || `${selectedClientIds.length} cliente(s) atualizados com sucesso.`);
      setShowBulkEditModal(false);
      setSelectedClientIds([]);
      setBulkStatus("");
      setBulkType("");
      loadClients();
      setTimeout(() => setFeedbackMessage(null), 6000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao atualizar clientes.");
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <AppShell activeSection="clients">
      <div className="space-y-6 pb-24">
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
              Pessoas Físicas e Jurídicas, validação de documentos, contatos, seleção em lote e expurgo de dados
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

        {/* Feedback Banner */}
        {feedbackMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
            <button onClick={() => setFeedbackMessage(null)} className="text-emerald-700 font-bold hover:underline">
              Fechar
            </button>
          </div>
        )}

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
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      title={isAllSelected ? "Desmarcar todos" : "Selecionar todos os clientes visíveis"}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer h-4 w-4"
                    />
                  </th>
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
                    <td colSpan={8} className="py-12 text-center text-zinc-400">
                      Carregando clientes...
                    </td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-400 space-y-2">
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
                  clients.map((c) => {
                    const isSelected = selectedClientIds.includes(c.id);

                    return (
                      <tr
                        key={c.id}
                        className={`transition ${isSelected ? "bg-zinc-100/70" : "hover:bg-zinc-50/70"}`}
                      >
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectClient(c.id)}
                            className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer h-4 w-4"
                          />
                        </td>
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
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {c.phone && (
                              <span className="text-[11px] text-zinc-500 font-mono">
                                {c.phone}
                              </span>
                            )}
                            {c.whatsapp && (
                              <WhatsAppLink number={c.whatsapp} name={c.name} showIconOnly={true} />
                            )}
                          </div>
                          {!c.email && !c.phone && !c.whatsapp && <span className="text-zinc-400">-</span>}
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
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/clients/${c.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold border border-zinc-200 transition"
                              title="Ver detalhes do cliente"
                            >
                              Detalhes
                              <ChevronRight className="w-3 h-3 text-zinc-400" />
                            </Link>
                            <Link
                              href={`/clients/${c.id}/edit`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold border border-zinc-200 transition"
                              title="Editar cadastro do cliente"
                            >
                              <Edit2 className="w-3 h-3 text-zinc-500" />
                              Editar
                            </Link>
                            <button
                              type="button"
                              disabled={deletingId === c.id}
                              onClick={() => handleDeleteClient(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition disabled:opacity-50 cursor-pointer"
                              title="Excluir cliente, documentos e liberar espaço"
                            >
                              <Trash2 className="w-3 h-3" />
                              {deletingId === c.id ? "Excluindo..." : "Excluir"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* =========================================================================
            BARRA DE AÇÕES EM MASSA FLUTUANTE (CLIENTS BULK ACTION BAR)
           ========================================================================= */}
        {selectedClientIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-950/95 backdrop-blur-md text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-zinc-700 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-bottom-5">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="bg-zinc-100 text-zinc-950 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                {selectedClientIds.length}
              </span>
              <span>cliente(s) selecionado(s)</span>
            </div>

            <div className="h-4 w-px bg-zinc-700 hidden sm:block" />

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowBulkEditModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition border border-zinc-700 shadow-sm"
              >
                <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                Editar em Massa
              </button>

              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition disabled:opacity-50 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {bulkDeleting ? "Excluindo..." : "Excluir Selecionados"}
              </button>

              <button
                type="button"
                onClick={() => setSelectedClientIds([])}
                className="text-xs text-zinc-400 hover:text-white transition ml-2 underline underline-offset-4"
              >
                Desmarcar todos
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL DE EDIÇÃO EM MASSA DE CLIENTES
           ========================================================================= */}
        {showBulkEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-zinc-100 text-zinc-900 rounded-xl">
                    <Edit2 className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-zinc-950">
                      Editar {selectedClientIds.length} Cliente(s) em Massa
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Preencha os campos que deseja alterar em lote.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBulkEditModal(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleBulkEditSubmit} className="space-y-4">
                {/* Alterar Status */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Alterar Status (opcional)
                  </label>
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value as "ACTIVE" | "ARCHIVED" | "")}
                    className="w-full text-xs font-medium border border-zinc-300 rounded-xl p-2.5 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="">-- Não alterar status --</option>
                    <option value="ACTIVE">ATIVO</option>
                    <option value="ARCHIVED">ARQUIVADO</option>
                  </select>
                </div>

                {/* Alterar Tipo */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Alterar Tipo de Pessoa (opcional)
                  </label>
                  <select
                    value={bulkType}
                    onChange={(e) => setBulkType(e.target.value as "PF" | "PJ" | "")}
                    className="w-full text-xs font-medium border border-zinc-300 rounded-xl p-2.5 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="">-- Não alterar tipo --</option>
                    <option value="PJ">Pessoa Jurídica (PJ)</option>
                    <option value="PF">Pessoa Física (PF)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setShowBulkEditModal(false)}
                    disabled={bulkSaving}
                    className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={bulkSaving}
                    className="px-5 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl shadow-xs transition disabled:opacity-50"
                  >
                    {bulkSaving ? "Atualizando..." : "Aplicar Alterações"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
