"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import {
  ArrowLeft,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Archive,
  RefreshCw,
  Edit2,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Client } from "@/modules/clients/types";
import { formatDocument } from "@/shared/cpf-cnpj";

export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadClient = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) throw new Error("Cliente não encontrado");
      const data = await res.json();
      setClient(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClient();
  }, [id]);

  const handleToggleArchive = async () => {
    if (!client) return;
    const isArchived = client.status === "ARCHIVED";
    const confirmMsg = isArchived
      ? "Deseja reativar este cliente?"
      : "Deseja arquivar este cliente? Nenhum histórico de vendas ou títulos será apagado.";

    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isArchived ? "REACTIVATE" : "ARCHIVE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadClient();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao alterar status.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell activeSection="clients">
        <div className="p-12 text-center text-xs text-zinc-400">Carregando dados do cliente...</div>
      </AppShell>
    );
  }

  if (!client) {
    return (
      <AppShell activeSection="clients">
        <div className="p-12 text-center text-xs text-zinc-500 space-y-3">
          <p>Cliente não encontrado.</p>
          <Link href="/clients" className="text-zinc-950 underline font-semibold">
            Voltar para lista de clientes
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeSection="clients">
      <div className="space-y-6 max-w-5xl">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/clients"
              className="p-2 rounded-full bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                    client.type === "PJ"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  {client.type}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    client.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-zinc-100 text-zinc-600 border-zinc-200"
                  }`}
                >
                  {client.status === "ACTIVE" ? "ATIVO" : "ARQUIVADO"}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950 mt-1">
                {client.name}
              </h1>
              {client.tradeName && (
                <p className="text-xs text-zinc-500">Fantasia: {client.tradeName}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleArchive}
              disabled={actionLoading}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition ${
                client.status === "ACTIVE"
                  ? "bg-white border-zinc-200 text-zinc-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {client.status === "ACTIVE" ? "Arquivar Cliente" : "Reativar Cliente"}
            </button>
            <Link
              href={`/clients/${client.id}/edit`}
              className="px-4 py-2 rounded-full bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition shadow-xs flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Editar Cadastro
            </Link>
          </div>
        </div>

        {/* Informações Principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card de Identificação */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Dados Cadastrais
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-zinc-400 block text-[11px]">Documento (CPF/CNPJ):</span>
                <span className="font-mono font-medium text-zinc-900">
                  {client.document ? formatDocument(client.document) : "Não informado"}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">E-mail:</span>
                <span className="text-zinc-900">{client.email || "-"}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">Telefone Comercial:</span>
                <span className="text-zinc-900">{client.phone || "-"}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">WhatsApp:</span>
                <span className="text-zinc-900">{client.whatsapp || "-"}</span>
              </div>
            </div>
          </div>

          {/* Card de Endereço */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Endereço Registrado
            </h2>
            <div className="space-y-2 text-xs text-zinc-700">
              {client.street ? (
                <>
                  <p className="font-medium text-zinc-900">
                    {client.street}, {client.number || "S/N"}
                  </p>
                  {client.complement && <p className="text-zinc-500">{client.complement}</p>}
                  <p className="text-zinc-500">
                    {client.neighborhood} • {client.city} - {client.state}
                  </p>
                  {client.postalCode && (
                    <p className="text-zinc-400 font-mono text-[11px]">CEP: {client.postalCode}</p>
                  )}
                </>
              ) : (
                <p className="text-zinc-400">Endereço não informado.</p>
              )}
            </div>
          </div>

          {/* Metadados e Auditoria */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Rastreabilidade
            </h2>
            <div className="space-y-2 text-xs text-zinc-500">
              <div>
                <span>Cadastrado em:</span>
                <span className="font-medium text-zinc-900 block">
                  {new Date(client.createdAt).toLocaleDateString("pt-BR")} às{" "}
                  {new Date(client.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div>
                <span>Última atualização:</span>
                <span className="font-medium text-zinc-900 block">
                  {new Date(client.updatedAt).toLocaleDateString("pt-BR")} às{" "}
                  {new Date(client.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {client.archivedAt && (
                <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-600">
                  Arquivado em {new Date(client.archivedAt).toLocaleDateString("pt-BR")}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contatos Vinculados */}
        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Contatos Autorizados</h2>
              <p className="text-xs text-zinc-500">
                Pessoas de contato e interlocutores comerciais/financeiros vinculados
              </p>
            </div>
          </div>

          {client.contacts && client.contacts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {client.contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-start justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900">{contact.name}</span>
                      {contact.isPrimary && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Principal
                        </span>
                      )}
                    </div>
                    {contact.role && <p className="text-zinc-500">{contact.role}</p>}
                    <div className="pt-1 space-y-0.5 text-zinc-600">
                      {contact.email && <p>E-mail: {contact.email}</p>}
                      {contact.phone && <p>Telefone: {contact.phone}</p>}
                      {contact.whatsapp && <p>WhatsApp: {contact.whatsapp}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-400">Nenhum contato específico cadastrado.</p>
          )}
        </div>

        {/* Contratações do Cliente (Fase 2) */}
        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-medium text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Fase 2
                </span>
                <h2 className="text-sm font-semibold text-zinc-900">Contratações & Recorrências</h2>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Contratos independentes, vigências ativas e histórico de serviços deste cliente
              </p>
            </div>
            <Link
              href="/contracts/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 text-white text-xs font-medium hover:bg-zinc-800 transition-colors"
            >
              + Nova Contratação
            </Link>
          </div>

          <ClientContractsSection clientId={id} />
        </div>

        {/* Observações */}
        {client.notes && (
          <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Observações Internas
            </h2>
            <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-line">
              {client.notes}
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

import { ContractRecord } from "@/modules/contracts/types";

function ClientContractsSection({ clientId }: { clientId: string }) {
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/clients/${clientId}/contracts`);
        if (res.ok) {
          const data = await res.json();
          setContracts(data.contracts || []);
        }
      } catch (err) {
        console.error("Erro ao buscar contratações do cliente:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientId]);

  if (loading) {
    return <p className="text-xs text-zinc-400">Carregando contratações...</p>;
  }

  if (contracts.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-zinc-50 border border-dashed border-zinc-200 text-center">
        <p className="text-xs text-zinc-600 font-medium">Nenhuma contratação vinculada a este cliente.</p>
        <p className="text-[11px] text-zinc-400 mt-0.5">
          Clique no botão acima para registrar a primeira contratação ou combo.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-medium">
          <tr>
            <th className="px-3 py-2">Contrato</th>
            <th className="px-3 py-2">Título / Escopo</th>
            <th className="px-3 py-2">Periodicidade</th>
            <th className="px-3 py-2">Vigência</th>
            <th className="px-3 py-2">Valor Atual</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2 text-right">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {contracts.map((c) => (
            <tr key={c.id} className="hover:bg-zinc-50/50">
              <td className="px-3 py-2.5 font-mono font-bold text-zinc-900">{c.contractNumber}</td>
              <td className="px-3 py-2.5 font-medium text-zinc-800">{c.currentVersion?.title || "-"}</td>
              <td className="px-3 py-2.5 text-zinc-600">
                {c.currentVersion?.billingPeriod} • Dia {c.currentVersion?.dueDay}
              </td>
              <td className="px-3 py-2.5 text-zinc-500">
                {c.currentVersion?.isIndefinite ? "Indeterminada" : `Até ${c.currentVersion?.endDate}`}
              </td>
              <td className="px-3 py-2.5 font-semibold text-zinc-950">
                R$ {(c.currentVersion?.totalAmount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                    c.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {c.status}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right">
                <Link
                  href={`/contracts/${c.id}`}
                  className="text-zinc-600 hover:text-zinc-950 font-medium underline"
                >
                  Ver Detalhes
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

