"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import {
  Users,
  Search,
  Filter,
  Plus,
  ArrowRight,
  ExternalLink,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Clock,
  Archive,
  RefreshCw,
} from "lucide-react";
import { LeadRecord, LeadStatus } from "@/modules/crm/types";
import { formatBRL } from "@/components/analytics/report-charts";

export default function LeadsListPage() {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "ALL">("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");

  async function loadLeads() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (sourceFilter !== "ALL") params.set("source", sourceFilter);

      const res = await fetch(`/api/crm/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (e) {
      console.error("Erro ao carregar leads:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const delay = setTimeout(() => {
      loadLeads();
    }, 200);
    return () => clearTimeout(delay);
  }, [searchTerm, statusFilter, sourceFilter]);

  const statusBadges: Record<LeadStatus, { label: string; color: string }> = {
    NEW: { label: "Novo Lead", color: "bg-blue-50 text-blue-700 border-blue-200" },
    CONTACTED: { label: "Contatado", color: "bg-purple-50 text-purple-700 border-purple-200" },
    QUALIFIED: { label: "Qualificado", color: "bg-amber-50 text-amber-700 border-amber-200" },
    CONVERTED: { label: "Convertido", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    UNQUALIFIED: { label: "Desqualificado", color: "bg-zinc-100 text-zinc-600 border-zinc-200" },
    ARCHIVED: { label: "Arquivado", color: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  };

  return (
    <AppShell activeSection="crm_leads">
      <div className="space-y-6 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-zinc-900 text-white">
                <Users className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
                  Base de Leads & Contatos
                </h1>
                <p className="text-xs text-zinc-500">
                  Prospecção, qualificação e histórico comercial antes da conversão em cliente.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/crm/leads/new"
              className="px-3.5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl flex items-center gap-1.5 transition shadow-2xs"
            >
              <Plus className="w-4 h-4" /> Novo Lead
            </Link>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail, telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-3 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium text-zinc-700"
            >
              <option value="ALL">Todos os Status</option>
              <option value="NEW">Novos</option>
              <option value="CONTACTED">Contatados</option>
              <option value="QUALIFIED">Qualificados</option>
              <option value="CONVERTED">Convertidos</option>
              <option value="UNQUALIFIED">Desqualificados</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium text-zinc-700"
            >
              <option value="ALL">Todas as Origens</option>
              <option value="Indicação">Indicação</option>
              <option value="Google Ads">Google Ads</option>
              <option value="Instagram">Instagram</option>
              <option value="Prospecção Ativa">Prospecção Ativa</option>
              <option value="OUTROS">Outros</option>
            </select>
          </div>
        </div>

        {/* Tabela de Leads */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-xs text-zinc-400">
              Carregando base de leads...
            </div>
          ) : leads.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Users className="w-10 h-10 text-zinc-300 mx-auto" />
              <div className="text-sm font-semibold text-zinc-700">Nenhum lead encontrado</div>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Cadastre um novo lead para iniciar a qualificação comercial e movimentação no funil.
              </p>
              <Link
                href="/crm/leads/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition"
              >
                <Plus className="w-3.5 h-3.5" /> Cadastrar Primeiro Lead
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/75 text-[11px] font-semibold text-zinc-500 uppercase">
                    <th className="py-3 px-4">Lead / Contato</th>
                    <th className="py-3 px-4">Documento</th>
                    <th className="py-3 px-4">Origem</th>
                    <th className="py-3 px-4">Localização</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Oportunidades</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {leads.map((lead) => {
                    const badge = statusBadges[lead.status] || statusBadges.NEW;
                    return (
                      <tr key={lead.id} className="hover:bg-zinc-50/60 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {lead.personType === "PJ" ? (
                              <Building className="w-4 h-4 text-blue-600 shrink-0" />
                            ) : (
                              <User className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                            <div>
                              <div className="font-bold text-zinc-900">{lead.name}</div>
                              <div className="text-[10px] text-zinc-400 font-mono">
                                {lead.leadCode} {lead.tradeName ? `• ${lead.tradeName}` : ""}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-zinc-600 font-mono">
                          {lead.document || "-"}
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 font-medium text-[11px]">
                            {lead.source}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-zinc-600">
                          {lead.city && lead.state ? `${lead.city}/${lead.state}` : lead.city || "-"}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-mono">
                          <span className="font-bold text-zinc-900">
                            {lead.opportunitiesCount || 0}
                          </span>
                          {lead.openOpportunitiesAmount ? (
                            <span className="text-[10px] text-purple-700 font-semibold block">
                              {formatBRL(lead.openOpportunitiesAmount)}
                            </span>
                          ) : null}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <Link
                            href={`/crm/leads/${lead.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg transition"
                          >
                            Ver Lead <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
