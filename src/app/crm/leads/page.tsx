"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  X,
  Layers,
  Calendar,
  AlertTriangle,
  Sparkles,
  Trash2,
  Edit2,
} from "lucide-react";
import { LeadRecord, LeadStatus, PipelineRecord, PipelineStageRecord } from "@/modules/crm/types";
import { formatBRL } from "@/components/analytics/report-charts";
import { WhatsAppLink } from "@/components/ui/whatsapp";

function LeadsListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Estados dos filtros extraídos da URL
  const initialSearch = searchParams.get("search") || "";
  const initialStatus = (searchParams.get("status") as LeadStatus | "ALL") || "ALL";
  const initialSource = searchParams.get("source") || "ALL";
  const initialPipeline = searchParams.get("pipelineId") || "ALL";
  const initialStage = searchParams.get("stageId") || "ALL";

  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "ALL">(initialStatus);
  const [sourceFilter, setSourceFilter] = useState<string>(initialSource);
  const [pipelineFilter, setPipelineFilter] = useState<string>(initialPipeline);
  const [stageFilter, setStageFilter] = useState<string>(initialStage);

  // Pipelines e etapas para o seletor dependente
  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [availableStages, setAvailableStages] = useState<PipelineStageRecord[]>([]);

  // Modal rápido "Adicionar ao funil"
  const [selectedLeadForFunnel, setSelectedLeadForFunnel] = useState<LeadRecord | null>(null);
  const [oppModalTitle, setOppModalTitle] = useState("");
  const [oppModalPipelineId, setOppModalPipelineId] = useState("");
  const [oppModalStageId, setOppModalStageId] = useState("");
  const [oppModalAmount, setOppModalAmount] = useState("");
  const [oppModalSaving, setOppModalSaving] = useState(false);
  const [oppModalError, setOppModalError] = useState("");
  const [createdOppId, setCreatedOppId] = useState<string | null>(null);

  // 1. Carrega lista de funis para o filtro e modal
  useEffect(() => {
    fetch("/api/crm/pipelines")
      .then((res) => res.json())
      .then((data) => {
        const list: PipelineRecord[] = Array.isArray(data) ? data : (data?.pipelines || []);
        setPipelines(list);
      })
      .catch((err) => console.error("Erro ao carregar funis:", err));
  }, []);

  // 2. Atualiza etapas disponíveis conforme o funil selecionado no filtro
  useEffect(() => {
    if (pipelineFilter && pipelineFilter !== "ALL" && pipelineFilter !== "NO_PIPELINE") {
      const found = pipelines.find((p) => p.id === pipelineFilter);
      if (found && found.stages) {
        setAvailableStages(found.stages);
        // Se a etapa atual não pertencer ao novo funil, limpa
        if (stageFilter !== "ALL" && !found.stages.some((s) => s.id === stageFilter)) {
          setStageFilter("ALL");
        }
      } else {
        setAvailableStages([]);
        setStageFilter("ALL");
      }
    } else {
      setAvailableStages([]);
      if (stageFilter !== "ALL") {
        setStageFilter("ALL");
      }
    }
  }, [pipelineFilter, pipelines]);

  // 3. Atualiza etapas no modal "Adicionar ao funil"
  const modalStages = pipelines.find((p) => p.id === oppModalPipelineId)?.stages || [];

  // 4. Carrega os leads com os filtros aplicados e sincroniza a URL
  async function loadLeads() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (sourceFilter !== "ALL") params.set("source", sourceFilter);
      if (pipelineFilter !== "ALL") params.set("pipelineId", pipelineFilter);
      if (stageFilter !== "ALL") params.set("stageId", stageFilter);

      // Atualiza a URL sem recarregar a página
      const newQuery = params.toString();
      const currentQuery = searchParams.toString();
      if (newQuery !== currentQuery) {
        router.replace(`/crm/leads${newQuery ? `?${newQuery}` : ""}`, { scroll: false });
      }

      const res = await fetch(`/api/crm/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setTotalLeads(data.total || 0);
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
    }, 250);
    return () => clearTimeout(delay);
  }, [searchTerm, statusFilter, sourceFilter, pipelineFilter, stageFilter]);

  function handleClearFilters() {
    setSearchTerm("");
    setStatusFilter("ALL");
    setSourceFilter("ALL");
    setPipelineFilter("ALL");
    setStageFilter("ALL");
    router.replace("/crm/leads", { scroll: false });
  }

  const hasActiveFilters =
    Boolean(searchTerm) ||
    statusFilter !== "ALL" ||
    sourceFilter !== "ALL" ||
    pipelineFilter !== "ALL" ||
    stageFilter !== "ALL";

  const statusBadges: Record<LeadStatus, { label: string; color: string }> = {
    NEW: { label: "Novo Lead", color: "bg-blue-50 text-blue-700 border-blue-200" },
    CONTACTED: { label: "Contatado", color: "bg-purple-50 text-purple-700 border-purple-200" },
    QUALIFIED: { label: "Qualificado", color: "bg-amber-50 text-amber-700 border-amber-200" },
    CONVERTED: { label: "Convertido", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    UNQUALIFIED: { label: "Desqualificado", color: "bg-zinc-100 text-zinc-600 border-zinc-200" },
    ARCHIVED: { label: "Arquivado", color: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  };

  // Abrir modal de adição ao funil
  function handleOpenAddToFunnel(lead: LeadRecord) {
    setSelectedLeadForFunnel(lead);
    setOppModalTitle(`Negociação - ${lead.name}`);
    setOppModalAmount("");
    setOppModalError("");
    setCreatedOppId(null);

    const defaultPipe = pipelines.find((p) => p.isDefault) || pipelines[0];
    if (defaultPipe) {
      setOppModalPipelineId(defaultPipe.id);
      if (defaultPipe.stages && defaultPipe.stages.length > 0) {
        setOppModalStageId(defaultPipe.stages[0].id);
      }
    }
  }

  // Submissão do modal "Adicionar ao funil"
  async function handleCreateOpportunityFromModal(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLeadForFunnel || !oppModalPipelineId) return;

    setOppModalSaving(true);
    setOppModalError("");

    try {
      const numericAmount = parseFloat(oppModalAmount.replace(/\./g, "").replace(",", ".")) || 0;
      const res = await fetch("/api/crm/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: oppModalTitle.trim(),
          leadId: selectedLeadForFunnel.id,
          pipelineId: oppModalPipelineId,
          stageId: oppModalStageId || undefined,
          amount: numericAmount,
          billingPeriod: "MONTHLY",
          probability: 20,
          source: selectedLeadForFunnel.source || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedOppId(data.opportunity.id);
        loadLeads(); // Atualiza contadores e tags do lead
      } else {
        const err = await res.json();
        setOppModalError(err.error || "Erro ao adicionar lead ao funil.");
      }
    } catch {
      setOppModalError("Erro de comunicação com o servidor.");
    } finally {
      setOppModalSaving(false);
    }
  }

  const handleDeleteLead = async (leadId: string, leadName: string) => {
    if (
      !window.confirm(
        `Deseja realmente excluir/arquivar o lead "${leadName}"?\n\nAs oportunidades vinculadas permanecerão registradas no histórico.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/crm/leads/${leadId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao excluir lead.");
      }
      loadLeads();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir lead.");
    }
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
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
                    Base de Leads & Contatos
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-xs font-bold">
                    {totalLeads}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Prospecção, filtros avançados por funil e movimentação para oportunidades comerciais.
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

        {/* Filtros e Busca Completa */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Campo de Busca */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por nome, empresa, e-mail, telefone ou documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
              />
            </div>

            {/* Seletores de Filtros */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro de Status */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="px-3 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium text-zinc-700"
              >
                <option value="ALL">Todos os Status</option>
                <option value="NEW">Novo Lead</option>
                <option value="CONTACTED">Contatado</option>
                <option value="QUALIFIED">Qualificado</option>
                <option value="CONVERTED">Convertido em Cliente</option>
                <option value="UNQUALIFIED">Desqualificado</option>
              </select>

              {/* Filtro de Origem */}
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

              {/* Filtro de Funil de Vendas */}
              <select
                value={pipelineFilter}
                onChange={(e) => setPipelineFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium text-zinc-700"
              >
                <option value="ALL">Todos os Funis</option>
                <option value="NO_PIPELINE">Sem funil (Sem oportunidade)</option>
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    Funil: {p.name}
                  </option>
                ))}
              </select>

              {/* Filtro de Etapa do Funil (dependente do funil) */}
              {availableStages.length > 0 && (
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-purple-50/60 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 font-semibold text-purple-900"
                >
                  <option value="ALL">Todas as Etapas</option>
                  {availableStages.map((stg) => (
                    <option key={stg.id} value={stg.id}>
                      Etapa: {stg.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Limpar Filtros */}
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="px-2.5 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition flex items-center gap-1"
                  title="Limpar todos os filtros"
                >
                  <X className="w-3.5 h-3.5" /> Limpar
                </button>
              )}
            </div>
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
              <div className="text-sm font-semibold text-zinc-700">
                {hasActiveFilters ? "Nenhum lead corresponde aos filtros selecionados" : "Nenhum lead encontrado"}
              </div>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                {hasActiveFilters
                  ? "Tente limpar os filtros ou alterar os critérios de busca."
                  : "Cadastre um novo lead para iniciar a qualificação comercial e movimentação no funil."}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition"
                >
                  <X className="w-3.5 h-3.5" /> Limpar Filtros
                </button>
              ) : (
                <Link
                  href="/crm/leads/new"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Cadastrar Primeiro Lead
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/75 text-[11px] font-semibold text-zinc-500 uppercase">
                    <th className="py-3 px-4">Lead / Contato</th>
                    <th className="py-3 px-4">Origem</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Funil e Oportunidades</th>
                    <th className="py-3 px-4">Próxima Atividade</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {leads.map((lead) => {
                    const badge = statusBadges[lead.status] || statusBadges.NEW;
                    const opps = lead.opportunities || [];
                    const hasOpps = opps.length > 0;
                    const nextAct = lead.nextActivity;

                    return (
                      <tr key={lead.id} className="hover:bg-zinc-50/60 transition">
                        {/* Lead / Contato */}
                        <td className="py-3 px-4">
                          <div className="flex items-start gap-2.5">
                            {lead.personType === "PJ" ? (
                              <Building className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            ) : (
                              <User className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <Link
                                href={`/crm/leads/${lead.id}`}
                                className="font-bold text-zinc-950 hover:underline"
                              >
                                {lead.name}
                              </Link>
                              <div className="text-[10px] text-zinc-400 font-mono">
                                {lead.leadCode} {lead.tradeName ? `• ${lead.tradeName}` : ""}
                              </div>
                              {(lead.phone || lead.whatsapp || lead.email) && (
                                <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                                  {lead.phone && (
                                    <span className="flex items-center gap-0.5">
                                      <Phone className="w-3 h-3 text-zinc-400" />
                                      {lead.phone}
                                    </span>
                                  )}
                                  {lead.whatsapp && (
                                    <WhatsAppLink number={lead.whatsapp} name={lead.name} showIconOnly={true} />
                                  )}
                                  {lead.email && (
                                    <span className="flex items-center gap-0.5">
                                      <Mail className="w-3 h-3 text-zinc-400" />
                                      {lead.email}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Origem */}
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 font-medium text-[11px]">
                            {lead.source}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>

                        {/* Funil e Oportunidades Vinculadas */}
                        <td className="py-3 px-4">
                          {hasOpps ? (
                            <div className="space-y-1">
                              {opps.slice(0, 2).map((opp) => (
                                <Link
                                  key={opp.id}
                                  href={`/crm/opportunities/${opp.id}`}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200/80 text-[11px] font-semibold transition"
                                >
                                  <span>{opp.pipelineName || "Funil"}</span>
                                  <ArrowRight className="w-2.5 h-2.5 text-purple-400" />
                                  <span className="text-purple-700">{opp.stageName || "Etapa"}</span>
                                  <span className="font-mono text-[10px] text-purple-600 font-bold ml-1">
                                    {formatBRL(opp.amount)}
                                  </span>
                                </Link>
                              ))}
                              {opps.length > 2 && (
                                <div className="text-[10px] text-zinc-500 font-medium">
                                  +{opps.length - 2} outra(s) negociação(ões)
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-zinc-400 italic">Sem oportunidade</span>
                          )}
                        </td>

                        {/* Próxima Atividade */}
                        <td className="py-3 px-4">
                          {nextAct ? (
                            <div className="text-[11px]">
                              <div className="font-semibold text-zinc-800 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-zinc-400" />
                                <span className="truncate max-w-[150px]">{nextAct.title}</span>
                              </div>
                              {nextAct.dueDate && (
                                <div className="text-[10px] text-zinc-500 font-mono">
                                  {new Date(nextAct.dueDate).toLocaleDateString("pt-BR", {
                                    timeZone: "America/Sao_Paulo",
                                  })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-zinc-400">-</span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenAddToFunnel(lead)}
                              className="px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded-lg border border-purple-200 transition flex items-center gap-1"
                              title="Adicionar este lead a um funil de vendas"
                            >
                              <Layers className="w-3 h-3 text-purple-600" />
                              Adicionar ao funil
                            </button>

                            <Link
                              href={`/crm/leads/${lead.id}`}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 transition"
                              title="Ver e Editar Lead"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              onClick={() => handleDeleteLead(lead.id, lead.name)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Excluir / Arquivar Lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Adicionar ao Funil */}
        {selectedLeadForFunnel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                    <Layers className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-zinc-950">Adicionar Lead ao Funil</h2>
                    <p className="text-xs text-zinc-500">
                      Cria uma negociação (oportunidade) no funil sem alterar o cadastro do contato.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLeadForFunnel(null)}
                  className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {oppModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{oppModalError}</span>
                </div>
              )}

              {createdOppId ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">Oportunidade Criada com Sucesso!</h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      O lead agora possui uma oportunidade ativa vinculada no funil de vendas.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setSelectedLeadForFunnel(null)}
                      className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-xl"
                    >
                      Fechar
                    </button>
                    <Link
                      href={`/crm/opportunities/${createdOppId}`}
                      className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl flex items-center gap-1.5 shadow-xs"
                    >
                      Abrir no funil <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateOpportunityFromModal} className="space-y-4">
                  {/* Lead Selecionado */}
                  <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-zinc-400 font-semibold block">Contato</span>
                      <span className="text-xs font-bold text-zinc-900">{selectedLeadForFunnel.name}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 text-zinc-700 font-mono">
                      {selectedLeadForFunnel.leadCode}
                    </span>
                  </div>

                  {/* Alerta se o Lead já tiver oportunidades abertas */}
                  {selectedLeadForFunnel.opportunities && selectedLeadForFunnel.opportunities.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Este lead já possui {selectedLeadForFunnel.opportunities.length} oportunidade(s) ativa(s):</span>
                      </div>
                      <div className="pl-5 space-y-0.5 text-[11px] text-amber-800">
                        {selectedLeadForFunnel.opportunities.map((o) => (
                          <div key={o.id}>
                            • {o.title} ({o.pipelineName || "Funil"} - {o.stageName || "Etapa"})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nome da Negociação */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Título da Negociação *
                    </label>
                    <input
                      type="text"
                      required
                      value={oppModalTitle}
                      onChange={(e) => setOppModalTitle(e.target.value)}
                      className="w-full text-xs border border-zinc-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>

                  {/* Funil e Etapa */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Funil *
                      </label>
                      <select
                        required
                        value={oppModalPipelineId}
                        onChange={(e) => {
                          const pipeId = e.target.value;
                          setOppModalPipelineId(pipeId);
                          const pipe = pipelines.find((p) => p.id === pipeId);
                          if (pipe && pipe.stages && pipe.stages.length > 0) {
                            setOppModalStageId(pipe.stages[0].id);
                          } else {
                            setOppModalStageId("");
                          }
                        }}
                        className="w-full text-xs font-medium border border-zinc-300 rounded-xl p-2.5 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      >
                        {pipelines.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Etapa Inicial *
                      </label>
                      <select
                        required
                        value={oppModalStageId}
                        onChange={(e) => setOppModalStageId(e.target.value)}
                        className="w-full text-xs font-medium border border-zinc-300 rounded-xl p-2.5 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      >
                        {modalStages.map((stg) => (
                          <option key={stg.id} value={stg.id}>
                            {stg.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Valor Estimado Opcional */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Valor Estimado Opcional (R$)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 5.000,00"
                      value={oppModalAmount}
                      onChange={(e) => setOppModalAmount(e.target.value)}
                      className="w-full text-xs border border-zinc-300 rounded-xl p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setSelectedLeadForFunnel(null)}
                      disabled={oppModalSaving}
                      className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={oppModalSaving}
                      className="px-5 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl shadow-xs transition disabled:opacity-50"
                    >
                      {oppModalSaving ? "Adicionando..." : "Confirmar e Vincular"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function LeadsListPage() {
  return (
    <Suspense
      fallback={
        <AppShell activeSection="crm_leads">
          <div className="p-16 text-center text-xs text-zinc-400">
            Carregando tela de leads...
          </div>
        </AppShell>
      }
    >
      <LeadsListContent />
    </Suspense>
  );
}
