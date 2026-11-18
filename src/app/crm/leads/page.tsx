"use client";

import {useCompany} from "@/lib/context/company-context";
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
  CheckSquare,
  Square,
  MoveRight,
  Rocket,
  Check
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

  const {selectedCompany}=useCompany();
  const [acquisitionFilter,setAcquisitionFilter]=useState(searchParams.get("acquisitionType")||"ALL");
  const [contactFilter,setContactFilter]=useState(searchParams.get("firstContactChannel")||"");
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

  // Seleção Múltipla & Ações em Massa (Bulk Actions)
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<LeadStatus | "">("");
  const [bulkSource, setBulkSource] = useState<string>("");
  const [bulkPipelineId, setBulkPipelineId] = useState<string>("");
  const [bulkStageId, setBulkStageId] = useState<string>("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Modal rápido "Adicionar ao funil" individual
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
  const bulkModalStages = pipelines.find((p) => p.id === bulkPipelineId)?.stages || [];

  // 4. Carrega os leads com os filtros aplicados e sincroniza a URL
  async function loadLeads() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ownerClientId:searchParams.get("ownerClientId")||selectedCompany.id});
      if(acquisitionFilter!=="ALL")params.set("acquisitionType",acquisitionFilter);
      if(contactFilter)params.set("firstContactChannel",contactFilter);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (sourceFilter !== "ALL") params.set("source", sourceFilter);
      if (pipelineFilter !== "ALL") params.set("pipelineId", pipelineFilter);
      if (stageFilter !== "ALL") params.set("stageId", stageFilter);

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
  }, [searchTerm, statusFilter, sourceFilter, pipelineFilter, stageFilter, acquisitionFilter, contactFilter, selectedCompany.id]);

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
NOVO: {label:"Novo", color:"bg-zinc-50 text-zinc-700 border-zinc-200"},
QUALIFICANDO: {label:"Em qualificação", color:"bg-zinc-50 text-zinc-700 border-zinc-200"},
NUTRICAO: {label:"Em nutrição", color:"bg-zinc-50 text-zinc-700 border-zinc-200"},
QUALIFICADO: {label:"Qualificado", color:"bg-zinc-50 text-zinc-700 border-zinc-200"},
OPORTUNIDADE: {label:"Convertido em oportunidade", color:"bg-zinc-50 text-zinc-700 border-zinc-200"},
DESQUALIFICADO: {label:"Desqualificado", color:"bg-zinc-50 text-zinc-700 border-zinc-200"},
    NEW: { label: "Novo Lead", color: "bg-blue-50 text-blue-700 border-blue-200" },
    CONTACTED: { label: "Contatado", color: "bg-purple-50 text-purple-700 border-purple-200" },
    QUALIFIED: { label: "Qualificado", color: "bg-amber-50 text-amber-700 border-amber-200" },
    CONVERTED: { label: "Convertido", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    UNQUALIFIED: { label: "Desqualificado", color: "bg-zinc-100 text-zinc-600 border-zinc-200" },
    ARCHIVED: { label: "Arquivado", color: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  };

  // Funil Comercial Padrão (para atalho de avanço com 1 clique)
  const defaultPipeline = pipelines.find((p) => p.isDefault) || pipelines[0];

  // Alternar seleção de todos os leads visíveis
  const handleToggleSelectAll = () => {
    if (selectedLeadIds.length === leads.length && leads.length > 0) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map((l) => l.id));
    }
  };

  // Alternar seleção de lead individual
  const handleToggleSelectLead = (id: string) => {
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(selectedLeadIds.filter((item) => item !== id));
    } else {
      setSelectedLeadIds([...selectedLeadIds, id]);
    }
  };

  // Exclusão em Massa com expurgo de documentos
  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    const confirmed = window.confirm(
      `ATENÇÃO: Deseja realmente EXCLUIR DEFINITIVAMENTE os ${selectedLeadIds.length} lead(s) selecionados?\n\n` +
      `• Todos os documentos, arquivos físicos anexados, oportunidades e dados desses leads serão apagados permanentemente para liberar espaço.\n\n` +
      `Esta ação não pode ser desfeita. Continuar?`
    );
    if (!confirmed) return;

    setBulkDeleting(true);
    try {
      const res = await fetch("/api/crm/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedLeadIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir leads em lote.");
      setFeedbackMessage(data.message || `${selectedLeadIds.length} lead(s) excluído(s) com sucesso.`);
      setSelectedLeadIds([]);
      loadLeads();
      setTimeout(() => setFeedbackMessage(null), 6000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir leads.");
    } finally {
      setBulkDeleting(false);
    }
  };

  // Edição em Massa
  const handleBulkEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLeadIds.length === 0) return;
    if (!bulkStatus && !bulkSource && !bulkPipelineId) {
      alert("Por favor, selecione ao menos um campo para alterar.");
      return;
    }

    setBulkSaving(true);
    try {
      const updates: Record<string, string> = {};
      if (bulkStatus) updates.status = bulkStatus;
      if (bulkSource) updates.source = bulkSource;
      if (bulkPipelineId) {
        updates.pipelineId = bulkPipelineId;
        if (bulkStageId) updates.stageId = bulkStageId;
      }

      const res = await fetch("/api/crm/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedLeadIds, updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar leads em lote.");
      setFeedbackMessage(data.message || `${selectedLeadIds.length} lead(s) atualizado(s) com sucesso.`);
      setShowBulkEditModal(false);
      setSelectedLeadIds([]);
      setBulkStatus("");
      setBulkSource("");
      setBulkPipelineId("");
      setBulkStageId("");
      loadLeads();
      setTimeout(() => setFeedbackMessage(null), 6000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao atualizar leads.");
    } finally {
      setBulkSaving(false);
    }
  };

  // Avançar Oportunidade do Lead com 1 Clique (Ex: da Prospecção Ativa para o Funil Comercial Padrão)
  const handleAdvanceOpportunityToCommercial = async (oppId: string, leadName: string) => {
    if (!defaultPipeline || !defaultPipeline.stages || defaultPipeline.stages.length === 0) {
      alert("Funil Comercial Padrão não possui etapas configuradas.");
      return;
    }
    const targetStage = defaultPipeline.stages[0]; // Primeira etapa do Funil Comercial Padrão ("Oportunidade Qualificada")
    try {
      const res = await fetch(`/api/crm/opportunities/${oppId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toPipelineId: defaultPipeline.id,
          toStageId: targetStage.id,
          notes: `Avançado diretamente da prospecção para o Funil Comercial Padrão (${targetStage.name}).`,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao avançar oportunidade.");
      }
      setFeedbackMessage(`Negociação de "${leadName}" transferida com sucesso para o Funil Comercial Padrão (${targetStage.name})!`);
      loadLeads();
      setTimeout(() => setFeedbackMessage(null), 6000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao transferir negociação.");
    }
  };

  // Abrir modal de adição individual ao funil
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

  // Submissão do modal "Adicionar ao funil" individual
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
        const createdId = data.id || data.opportunity?.id || "";
        setCreatedOppId(createdId);
        loadLeads();
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

  // Exclusão individual de lead
  const handleDeleteLead = async (leadId: string, leadName: string) => {
    if (
      !window.confirm(
        `Atenção: Deseja realmente EXCLUIR DEFINITIVAMENTE o lead "${leadName}"?\n\n` +
        `• Todos os documentos, arquivos anexados, oportunidades e dados deste lead serão apagados permanentemente para liberar espaço em disco.\n\n` +
        `Esta ação não pode ser desfeita. Continuar?`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/crm/leads/${leadId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao excluir lead.");
      }
      setFeedbackMessage(data.message || `Lead "${leadName}" excluído com sucesso.`);
      loadLeads();
      setTimeout(() => setFeedbackMessage(null), 6000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir lead.");
    }
  };

  const isAllSelected = leads.length > 0 && selectedLeadIds.length === leads.length;

  return (
    <AppShell activeSection="crm_leads">
      <div className="flex flex-wrap gap-3 mb-4"><label className="text-xs">Aquisição<select className="block border rounded-lg p-2" value={acquisitionFilter} onChange={e=>setAcquisitionFilter(e.target.value)}><option value="ALL">Todas</option><option value="INBOUND">Inbound</option><option value="OUTBOUND">Outbound</option><option value="NAO_INFORMADO">Não informado</option></select></label><label className="text-xs">Primeiro contato<input className="block border rounded-lg p-2" value={contactFilter} placeholder="Todos" onChange={e=>setContactFilter(e.target.value)}/></label></div>
      <div className="space-y-6 pb-24">
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
                  Prospecção, filtros avançados por funil, seleção em massa e avanço rápido para o funil comercial.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/crm/opportunities"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition shadow-2xs"
            >
              <Layers className="h-4 w-4 text-purple-600" />
              Ver Funis Comerciais (Kanban)
            </Link>

            <Link
              href="/crm/leads/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 transition shadow-2xs"
            >
              <Plus className="h-4 w-4" />
              Novo Lead
            </Link>
          </div>
        </div>

        {/* Feedback message banner */}
        {feedbackMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
            <button onClick={() => setFeedbackMessage(null)} className="text-emerald-700 font-bold hover:underline">
              Fechar
            </button>
          </div>
        )}

        {/* Barra de Filtros e Busca */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar por nome, empresa, e-mail, telefone ou documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50/50 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
              />
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "ALL")}
                className="border border-zinc-200 rounded-xl text-xs px-3 py-2 bg-zinc-50/50 text-zinc-700 font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900"
              >
                <option value="ALL">Todos os Status</option>
                <option value="NEW">Novo Lead</option>
                <option value="CONTACTED">Contatado</option>
                <option value="QUALIFIED">Qualificado</option>
                <option value="CONVERTED">Convertido</option>
                <option value="UNQUALIFIED">Desqualificado</option>
                <option value="ARCHIVED">Arquivado</option>
              </select>

              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="border border-zinc-200 rounded-xl text-xs px-3 py-2 bg-zinc-50/50 text-zinc-700 font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900"
              >
                <option value="ALL">Todas as Origens</option>
                <option value="Prospecção Ativa">Prospecção Ativa (Outbound)</option>
                <option value="Instagram">Instagram</option>
                <option value="Indicação">Indicação</option>
                <option value="Site/Inbound">Site / Inbound</option>
                <option value="Google Ads">Google Ads</option>
                <option value="Meta Ads">Meta Ads</option>
              </select>

              <select
                value={pipelineFilter}
                onChange={(e) => setPipelineFilter(e.target.value)}
                className="border border-zinc-200 rounded-xl text-xs px-3 py-2 bg-zinc-50/50 text-zinc-700 font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900"
              >
                <option value="ALL">Todos os Funis</option>
                <option value="NO_PIPELINE">Sem Oportunidade</option>
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isDefault ? "(Padrão)" : ""}
                  </option>
                ))}
              </select>

              {availableStages.length > 0 && (
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="border border-zinc-200 rounded-xl text-xs px-3 py-2 bg-zinc-50/50 text-zinc-700 font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="ALL">Todas as Etapas</option>
                  {availableStages.map((stg) => (
                    <option key={stg.id} value={stg.id}>
                      {stg.name}
                    </option>
                  ))}
                </select>
              )}

              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Limpar
                </button>
              )}

              <button
                onClick={loadLeads}
                className="p-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-600 transition"
                title="Atualizar lista"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de Leads */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-zinc-400 text-xs">Carregando leads...</div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 space-y-3">
              <Users className="w-10 h-10 text-zinc-300 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-800">Nenhum lead encontrado</h3>
              <p className="text-xs text-zinc-400">
                {hasActiveFilters
                  ? "Tente ajustar ou limpar os filtros de busca para encontrar registros."
                  : "Comece cadastrando um novo lead para prospectar e negociar."}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition"
                >
                  Limpar Filtros
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
                    {/* Checkbox de Selecionar Todos */}
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        title={isAllSelected ? "Desmarcar todos" : "Selecionar todos os leads visíveis"}
                        className="rounded border-zinc-300 text-purple-600 focus:ring-purple-500 cursor-pointer h-4 w-4"
                      />
                    </th>
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
                    const isSelected = selectedLeadIds.includes(lead.id);

                    // Verifica se tem oportunidade em funil que não seja o padrão (ex: Prospecção Ativa)
                    const canAdvanceToCommercial =
                      defaultPipeline &&
                      opps.some((o) => o.pipelineId !== defaultPipeline.id);

                    return (
                      <tr
                        key={lead.id}
                        className={`transition ${isSelected ? "bg-purple-50/60" : "hover:bg-zinc-50/60"}`}
                      >
                        {/* Checkbox Individual */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectLead(lead.id)}
                            className="rounded border-zinc-300 text-purple-600 focus:ring-purple-500 cursor-pointer h-4 w-4"
                          />
                        </td>

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
                            <div className="space-y-1.5">
                              {opps.slice(0, 2).map((opp) => {
                                const isNonDefault = defaultPipeline && opp.pipelineId !== defaultPipeline.id;
                                return (
                                  <div key={opp.id} className="space-y-1">
                                    <Link
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

                                    {/* Botão de Avanço Rápido para Funil Comercial Padrão com 1 Clique */}
                                    {isNonDefault && (
                                      <div>
                                        <button
                                          type="button"
                                          onClick={() => handleAdvanceOpportunityToCommercial(opp.id, lead.name)}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold transition shadow-2xs"
                                          title={`Avançar esta negociação para o Funil Comercial Padrão (${defaultPipeline?.name})`}
                                        >
                                          <Rocket className="w-2.5 h-2.5 text-emerald-600" />
                                          Avançar para Funil Comercial Padrão
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
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
                              title="Excluir Lead e liberar espaço em disco"
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

        {/* =========================================================================
            BARRA DE AÇÕES EM MASSA FLUTUANTE (BULK ACTION BAR)
           ========================================================================= */}
        {selectedLeadIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-950/95 backdrop-blur-md text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-zinc-700 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-bottom-5">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="bg-purple-600 text-white px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                {selectedLeadIds.length}
              </span>
              <span>lead(s) selecionado(s)</span>
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
                onClick={() => setSelectedLeadIds([])}
                className="text-xs text-zinc-400 hover:text-white transition ml-2 underline underline-offset-4"
              >
                Desmarcar todos
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL DE EDIÇÃO EM MASSA DE LEADS
           ========================================================================= */}
        {showBulkEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                    <Edit2 className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-zinc-950">
                      Editar {selectedLeadIds.length} Lead(s) em Massa
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Preencha apenas os campos que deseja atualizar em todos os leads selecionados.
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
                    onChange={(e) => setBulkStatus(e.target.value as LeadStatus | "")}
                    className="w-full text-xs font-medium border border-zinc-300 rounded-xl p-2.5 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="">-- Não alterar status --</option>
                    <option value="NEW">Novo Lead</option>
                    <option value="CONTACTED">Contatado</option>
                    <option value="QUALIFIED">Qualificado</option>
                    <option value="CONVERTED">Convertido</option>
                    <option value="UNQUALIFIED">Desqualificado</option>
                    <option value="ARCHIVED">Arquivado</option>
                  </select>
                </div>

                {/* Alterar Origem */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Alterar Origem (opcional)
                  </label>
                  <select
                    value={bulkSource}
                    onChange={(e) => setBulkSource(e.target.value)}
                    className="w-full text-xs font-medium border border-zinc-300 rounded-xl p-2.5 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="">-- Não alterar origem --</option>
                    <option value="Prospecção Ativa">Prospecção Ativa (Outbound)</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Site/Inbound">Site / Inbound</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="Meta Ads">Meta Ads</option>
                  </select>
                </div>

                {/* Vincular/Mover ao Funil Comercial & Etapa */}
                <div className="p-3 bg-purple-50/50 border border-purple-200/80 rounded-xl space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                    <Layers className="w-3.5 h-3.5 text-purple-700" />
                    <span>Vincular ou Mover todos para um Funil & Etapa</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                        Funil de Destino
                      </label>
                      <select
                        value={bulkPipelineId}
                        onChange={(e) => {
                          const pId = e.target.value;
                          setBulkPipelineId(pId);
                          const p = pipelines.find((item) => item.id === pId);
                          if (p && p.stages && p.stages.length > 0) {
                            setBulkStageId(p.stages[0].id);
                          } else {
                            setBulkStageId("");
                          }
                        }}
                        className="w-full text-xs font-medium border border-zinc-300 rounded-xl p-2 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
                      >
                        <option value="">-- Não alterar funil --</option>
                        {pipelines.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.isDefault ? "(Padrão)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                        Etapa do Funil
                      </label>
                      <select
                        disabled={!bulkPipelineId}
                        value={bulkStageId}
                        onChange={(e) => setBulkStageId(e.target.value)}
                        className="w-full text-xs font-medium border border-zinc-300 rounded-xl p-2 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-600 disabled:opacity-50"
                      >
                        {bulkModalStages.map((stg) => (
                          <option key={stg.id} value={stg.id}>
                            {stg.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
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
                    className="px-5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition disabled:opacity-50"
                  >
                    {bulkSaving ? "Atualizando..." : "Aplicar Alterações em Massa"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Individual: Adicionar ao Funil */}
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
                  <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-zinc-400 font-semibold block">Contato</span>
                      <span className="text-xs font-bold text-zinc-900">{selectedLeadForFunnel.name}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 text-zinc-700 font-mono">
                      {selectedLeadForFunnel.leadCode}
                    </span>
                  </div>

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
