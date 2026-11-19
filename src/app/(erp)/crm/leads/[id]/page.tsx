"use client";

import { LeadSourceInput } from "@/components/crm/lead-source-input";
import {ServiceInterestInput} from "@/components/crm/service-interest-input";
import { CommercialDnaPanel } from "@/components/crm/commercial-dna";
import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import {
  Users,
  ArrowLeft,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Clock,
  Target,
  ExternalLink,
  Archive,
  ArrowRight,
  ShieldCheck,
  FileText,
  Edit2,
  Trash2,
  Save,
  X,
  Sparkles,
  Briefcase,
  TrendingUp,
} from "lucide-react";
import { LeadRecord, OpportunityRecord, ActivityRecord, LeadStatus, ActivityType } from "@/modules/crm/types";
import { formatBRL } from "@/components/analytics/report-charts";
import { formatDocument } from "@/shared/cpf-cnpj";
import { formatProposalStatus, formatOpportunityStatus } from "@/shared/status-labels";
import { WhatsAppIcon, WhatsAppLink } from "@/components/ui/whatsapp";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [lead, setLead] = useState<LeadRecord | null>(null);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [proposals, setProposals] = useState<Array<{
    id: string;
    proposalCode: string;
    title: string;
    status: string;
    totalOneTimeEffective?: number;
    totalMonthlyEffective?: number;
    totalYearlyEffective?: number;
    totalAmount?: number;
    validUntil: string;
    createdAt: string;
  }>>([]);
  const [onboardingSession, setOnboardingSession] = useState<any>(null);
  const [showBriefingTranscriptModal, setShowBriefingTranscriptModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Modal de Conversão
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertMode, setConvertMode] = useState<"NEW_CLIENT" | "LINK_EXISTING">("NEW_CLIENT");
  const [existingClients, setExistingClients] = useState<{ id: string; name: string; document?: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState("");
  const [convertForm, setConvertForm] = useState({
    name: "",
    tradeName: "",
    document: "",
    email: "",
    phone: "",
    whatsapp: "",
    primaryContact: "",
    city: "",
    state: "",
  });

  const openConvertModal = () => {
    if (lead) {
      setConvertForm({
        name: lead.name || "",
        tradeName: lead.tradeName || "",
        document: lead.document ? formatDocument(lead.document) : "",
        email: lead.email || "",
        phone: lead.phone || "",
        whatsapp: lead.whatsapp || "",
        primaryContact: lead.primaryContact || "",
        city: lead.city || "",
        state: lead.state || "",
      });
    }
    setConvertError("");
    setShowConvertModal(true);
  };

  // Modal de Edição de Lead
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({
    personType: "PJ" as "PF" | "PJ",
    name: "",
    tradeName: "",
    document: "",
    email: "",
    phone: "",
    whatsapp: "",
    primaryContact: "",
    segment: "",
    city: "",
    state: "",
    source: "OUTROS",
    notes: "",
    acquisitionType: "INBOUND" as "INBOUND" | "OUTBOUND" | "NAO_INFORMADO",
    leadSource: "Google Ads",
    firstContactChannel: "WhatsApp",
    serviceOfInterest: "",
    urgencyTimeline: "",
    estimatedBudget: "",
    needSummary: "",
  });

  // Modais de Ciclo de Qualificação e Nutrição
  const [showNurtureModal, setShowNurtureModal] = useState(false);
  const [nurtureReason, setNurtureReason] = useState("Pretende contratar futuramente");
  const [nurtureNextDate, setNurtureNextDate] = useState("");
  const [nurtureNotes, setNurtureNotes] = useState("");
  const [savingNurture, setSavingNurture] = useState(false);

  const [showDisqualifyModal, setShowDisqualifyModal] = useState(false);
  const [disqualifyReason, setDisqualifyReason] = useState("Fora do perfil / Sem orçamento");
  const [disqualifyNotes, setDisqualifyNotes] = useState("");
  const [savingDisqualify, setSavingDisqualify] = useState(false);

  // Modal de Criação de Oportunidade com Verificação de Duplicidade
  const [showCreateOppModal, setShowCreateOppModal] = useState(false);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [selectedPipeId, setSelectedPipeId] = useState("");
  const [selectedStageId, setSelectedStageId] = useState("");
  const [newOppTitle, setNewOppTitle] = useState("");
  const [newOppAmount, setNewOppAmount] = useState("");
  const [creatingOpp, setCreatingOpp] = useState(false);

  // Exclusão / Arquivamento
  const [actionLoading, setActionLoading] = useState(false);

  // Modal de Nova Atividade
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [newActivity, setNewActivity] = useState({
    activityType: "FOLLOW_UP" as "CALL" | "WHATSAPP" | "EMAIL" | "MEETING" | "FOLLOW_UP" | "NOTE" | "OTHER",
    title: "",
    description: "",
    dueDate: "",
  });
  const [savingActivity, setSavingActivity] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [leadRes, oppsRes, actRes, propRes] = await Promise.all([
        fetch(`/api/crm/leads/${id}`),
        fetch(`/api/crm/opportunities?leadId=${id}`),
        fetch(`/api/crm/activities?leadId=${id}`),
        fetch(`/api/proposals?leadId=${id}`),
      ]);

      if (!leadRes.ok) throw new Error("Lead não encontrado.");
      const leadData = await leadRes.json();
      setLead(leadData);
      setEditForm({
        personType: leadData.personType || "PJ",
        name: leadData.name || "",
        tradeName: leadData.tradeName || "",
        document: leadData.document ? formatDocument(leadData.document) : "",
        email: leadData.email || "",
        phone: leadData.phone || "",
        whatsapp: leadData.whatsapp || "",
        primaryContact: leadData.primaryContact || "",
        segment: leadData.segment || "",
        city: leadData.city || "",
        state: leadData.state || "",
        source: leadData.source || "OUTROS",
        notes: leadData.notes || "",
        acquisitionType: leadData.acquisitionType || "",
        leadSource: leadData.leadSource || "",
        firstContactChannel: leadData.firstContactChannel || "",
        serviceOfInterest: leadData.serviceOfInterest || "",
        urgencyTimeline: leadData.urgencyTimeline || "",
        estimatedBudget: leadData.estimatedBudget || 0,
        needSummary: leadData.needSummary || "",
      });

      if (oppsRes.ok) {
        const data = await oppsRes.json();
        setOpportunities(data.opportunities || []);
      }
      if (actRes.ok) setActivities(await actRes.json());
      if (propRes.ok) {
        const pData = await propRes.json();
        setProposals(pData.proposals || []);
      }
      fetch(`/api/crm/leads/${id}/briefing`)
        .then((r) => r.json())
        .then((b) => {
          if (b.success && b.session) setOnboardingSession(b.session);
        })
        .catch(() => {});
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao carregar lead.");
    } finally {
      setLoading(false);
    }
  }

  const searchParams = useSearchParams();

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (searchParams && (searchParams.get("convert") === "true" || searchParams.get("autoConvert") === "true")) {
      if (lead && lead.status !== "CONVERTED" && !lead.convertedClientId) {
        openConvertModal();
      }
    }
  }, [searchParams, lead]);

  // Carrega clientes para vínculo se necessário
  useEffect(() => {
    if (showConvertModal && convertMode === "LINK_EXISTING") {
      fetch("/api/clients?limit=100")
        .then((res) => res.json())
        .then((data) => setExistingClients(data.clients || []))
        .catch(console.error);
    }
  }, [showConvertModal, convertMode]);

  const handleStatusChange = async (newStatus: LeadStatus) => {
    try {
      const res = await fetch(`/api/crm/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        loadData();
      } else {
        const error = await res.json();
        alert(error.error || "Não foi possível alterar o status do lead.");
      }
    } catch (e) {
      console.error(e);
      alert("Não foi possível conectar para alterar o status do lead.");
    }
  };

  const handleDeleteOpportunity = async (oppId: string, oppTitle: string) => {
    if (!confirm(`Deseja realmente excluir a oportunidade "${oppTitle}"?`)) return;
    try {
      const res = await fetch(`/api/crm/opportunities/${oppId}`, { method: "DELETE" });
      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao excluir oportunidade.");
      }
    } catch {
      alert("Falha de comunicação.");
    }
  };

  const handleDeleteProposal = async (propId: string, propCode: string) => {
    if (!confirm(`Deseja realmente excluir a proposta ${propCode}?`)) return;
    try {
      const res = await fetch(`/api/proposals/${propId}`, { method: "DELETE" });
      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao excluir proposta.");
      }
    } catch {
      alert("Falha de comunicação.");
    }
  };

  const handleOpenEditModal = () => {
    if (!lead) return;
    setEditForm({
      personType: lead.personType || "PJ",
      name: lead.name || "",
      tradeName: lead.tradeName || "",
      document: lead.document ? formatDocument(lead.document) : "",
      email: lead.email || "",
      phone: lead.phone || "",
      whatsapp: lead.whatsapp || "",
      primaryContact: lead.primaryContact || "",
      segment: lead.segment || "",
      city: lead.city || "",
      state: lead.state || "",
      source: lead.source || "OUTROS",
      notes: lead.notes || "",
      acquisitionType: lead.acquisitionType || "INBOUND",
      leadSource: lead.leadSource || lead.source || "Google Ads",
      firstContactChannel: lead.firstContactChannel || "WhatsApp",
      serviceOfInterest: lead.serviceOfInterest || "",
      urgencyTimeline: lead.urgencyTimeline || "",
      estimatedBudget: lead.estimatedBudget ? String(lead.estimatedBudget) : "",
      needSummary: lead.needSummary || "",
    });
    setEditError("");
    setShowEditModal(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "document") {
      setEditForm((prev) => ({ ...prev, [name]: formatDocument(value) }));
    } else {
      setEditForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    setEditError("");

    try {
      const numericBudget = editForm.estimatedBudget
        ? parseFloat(editForm.estimatedBudget.replace(/\./g, "").replace(",", "."))
        : 0;
      const res = await fetch(`/api/crm/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          source: editForm.leadSource || editForm.source,
          estimatedBudget: isNaN(numericBudget) ? 0 : numericBudget,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar alterações no lead.");
      }

      setShowEditModal(false);
      await loadData();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Erro ao salvar lead.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleQualifyLead = async () => {
    if (!confirm("Deseja marcar este lead como QUALIFICADO para o processo comercial?")) return;
    try {
      const res = await fetch(`/api/crm/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "QUALIFICADO" }),
      });
      if (res.ok) {
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao qualificar lead.");
      }
    } catch {
      alert("Falha de comunicação.");
    }
  };

  const handleConfirmNurture = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNurture(true);
    try {
      const res = await fetch(`/api/crm/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "NUTRICAO",
          nurtureReason,
          nurtureNextActionDate: nurtureNextDate || null,
          notes: nurtureNotes
            ? `${lead?.notes ? lead.notes + "\n" : ""}[Nutrição em ${new Date().toLocaleDateString("pt-BR")}] Motivo: ${nurtureReason}. ${nurtureNotes}`
            : lead?.notes,
        }),
      });
      if (res.ok) {
        setShowNurtureModal(false);
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao enviar lead para nutrição.");
      }
    } catch {
      alert("Falha de comunicação.");
    } finally {
      setSavingNurture(false);
    }
  };

  const handleConfirmDisqualify = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDisqualify(true);
    try {
      const res = await fetch(`/api/crm/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "DESQUALIFICADO",
          disqualificationReason: disqualifyReason,
          notes: disqualifyNotes
            ? `${lead?.notes ? lead.notes + "\n" : ""}[Desqualificado em ${new Date().toLocaleDateString("pt-BR")}] Motivo: ${disqualifyReason}. ${disqualifyNotes}`
            : lead?.notes,
        }),
      });
      if (res.ok) {
        setShowDisqualifyModal(false);
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao desqualificar lead.");
      }
    } catch {
      alert("Falha de comunicação.");
    } finally {
      setSavingDisqualify(false);
    }
  };

  const openCreateOppModal = async () => {
    try {
      const res = await fetch("/api/crm/pipelines");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.pipelines || []);
        setPipelines(list);
        const def = list.find((p: any) => p.isDefault) || list[0];
        if (def) {
          setSelectedPipeId(def.id);
          if (def.stages && def.stages.length > 0) {
            setSelectedStageId(def.stages[0].id);
          }
        }
      }
    } catch (e) {
      console.error("Erro ao carregar funis:", e);
    }
    setNewOppTitle(lead?.name ? `Negociação - ${lead.name}` : "Nova Negociação");
    setNewOppAmount(lead?.estimatedBudget ? String(lead.estimatedBudget) : "");
    setShowCreateOppModal(true);
  };

  const handleCreateOppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPipeId) {
      alert("Selecione um funil comercial.");
      return;
    }
    setCreatingOpp(true);
    try {
      const numericAmount = parseFloat(newOppAmount.replace(/\./g, "").replace(",", ".")) || 0;
      const res = await fetch("/api/crm/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newOppTitle.trim() || `Negociação - ${lead?.name}`,
          leadId: id,
          pipelineId: selectedPipeId,
          stageId: selectedStageId || undefined,
          amount: numericAmount,
          billingPeriod: "MONTHLY",
          probability: 20,
          source: lead?.leadSource || lead?.source || undefined,
        }),
      });
      if (res.ok) {
        setShowCreateOppModal(false);
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao criar oportunidade.");
      }
    } catch {
      alert("Falha de comunicação.");
    } finally {
      setCreatingOpp(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!lead) return;
    const confirmDelete = window.confirm(
      `Atenção: Tem certeza que deseja EXCLUIR DEFINITIVAMENTE o lead "${lead.name}"?\n\n` +
      `• Todos os documentos, arquivos anexados, oportunidades e dados deste lead serão apagados permanentemente para liberar espaço.\n\n` +
      `Esta ação não pode ser desfeita. Continuar?`
    );
    if (!confirmDelete) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/crm/leads/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao excluir lead.");
      }
      if (data.message) {
        alert(data.message);
      }
      router.push("/crm/leads");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir lead.");
      setActionLoading(false);
    }
  };

  const handleConvert = async () => {
    setConverting(true);
    setConvertError("");

    try {
      const payload: Record<string, unknown> = {
        mode: convertMode,
        existingClientId: convertMode === "LINK_EXISTING" ? selectedClientId : undefined,
      };

      if (convertMode === "NEW_CLIENT") {
        payload.clientDataOverride = {
          name: convertForm.name.trim() || undefined,
          tradeName: convertForm.tradeName.trim() || undefined,
          document: convertForm.document.trim() || undefined,
          email: convertForm.email.trim() || undefined,
          phone: convertForm.phone.trim() || undefined,
          whatsapp: convertForm.whatsapp.trim() || undefined,
          primaryContact: convertForm.primaryContact.trim() || undefined,
          city: convertForm.city.trim() || undefined,
          state: convertForm.state.trim() || undefined,
        };
      }

      const res = await fetch(`/api/crm/leads/${id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao converter lead.");

      setShowConvertModal(false);
      router.push(`/clients/${data.clientId}`);
    } catch (err: unknown) {
      setConvertError(err instanceof Error ? err.message : "Erro na conversão.");
      setConverting(false);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingActivity(true);
    try {
      const res = await fetch("/api/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newActivity,
          leadId: id,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao registrar atividade.");
      }
      setShowActivityModal(false);
      setNewActivity({ activityType: "FOLLOW_UP", title: "", description: "", dueDate: "" });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro.");
    } finally {
      setSavingActivity(false);
    }
  };

  const handleCompleteActivity = async (actId: string) => {
    try {
      await fetch(`/api/crm/activities/${actId}/complete`, { method: "POST" });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <>
        <div className="py-20 text-center text-xs text-zinc-400">Carregando detalhes do lead...</div>
      </>
    );
  }

  if (errorMsg || !lead) {
    return (
      <>
        <div className="max-w-xl mx-auto py-12 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-zinc-800">Lead não encontrado</h2>
          <p className="text-sm text-zinc-500">{errorMsg || "O registro solicitado não existe."}</p>
          <Link
            href="/crm/leads"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para listagem
          </Link>
        </div>
      </>
    );
  }

  const isConverted = lead.status === "CONVERTED" || Boolean(lead.convertedClientId);
  const hasWonOpp = opportunities.some((o) => o.status === "WON");
  const hasApprovedProp = proposals.some((p) => p.status === "APPROVED");

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6 pb-16">
        {/* Header Breadcrumb & Actions */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs">
          <div className="grid min-w-0 grid-cols-1 items-start gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
            <div className="flex min-w-0 items-start gap-3">
              <Link
                href="/crm/leads"
                className="shrink-0 p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition shadow-xs"
                aria-label="Voltar para leads"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="min-w-0 flex-1 space-y-2">
                <h1 className="break-words text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">{lead.name}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-zinc-400">{lead.leadCode}</span>
                  {lead.personType === "PJ" ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      PJ
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      PF
                    </span>
                  )}
                </div>
                <p className="break-words text-xs text-zinc-500">
                  {lead.tradeName ? `${lead.tradeName} • ` : ""}Origem: {lead.source}
                </p>
              </div>
            </div>

            <div role="group" aria-label="Ações do cadastro e comerciais" className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">Ações</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 [&>button]:justify-center [&>a]:justify-center [&_svg]:shrink-0">
                <button
                  type="button"
                  onClick={openCreateOppModal}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-zinc-950 hover:bg-zinc-800 rounded-xl flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                  title="Abre negociação formal no Funil Comercial (Kanban)"
                >
                  <Plus className="w-4 h-4" /> Criar Oportunidade
                </button>

                <Link
                  href={`/proposals/new?leadId=${lead.id}`}
                  className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 flex items-center gap-1.5 transition shadow-2xs"
                >
                  <FileText className="w-4 h-4" /> Criar Proposta
                </Link>
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                >
                  <Edit2 className="w-4 h-4 text-zinc-500" /> Editar Lead
                </button>

                <button
                  type="button"
                  onClick={handleDeleteLead}
                  disabled={actionLoading}
                  className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 flex items-center gap-1.5 transition shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Excluir ou arquivar este lead"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" /> Excluir
                </button>

              </div>
              {lead.whatsapp && (
                <div className="mt-2 flex justify-end"><WhatsAppLink number={lead.whatsapp} name={lead.name} label="WhatsApp" /></div>
              )}
            </div>
          </div>

          <div role="group" aria-label="Ações de status do lead" className="flex flex-wrap items-center gap-2 border-t border-zinc-100 bg-zinc-50/60 p-4 sm:px-5 [&>button]:max-w-full [&>a]:max-w-full [&_svg]:shrink-0">
            {isConverted ? (
              <Link
                href={`/clients/${lead.convertedClientId}`}
                className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 flex items-center gap-1.5 transition shadow-2xs"
              >
                <CheckCircle2 className="w-4 h-4" /> Cliente Vinculado (Abrir Cadastro)
              </Link>
            ) : (
              <button
                type="button"
                onClick={openConvertModal}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Converter em Cliente
              </button>
            )}

            {/* Ações Estratégicas do Ciclo de Leads */}
            {!isConverted && lead.status !== "STAND_BY" && (
              <button type="button" onClick={() => handleStatusChange("STAND_BY")} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
                <Clock className="h-4 w-4" /> Colocar em Stand-by
              </button>
            )}
            {!isConverted && lead.status !== "QUALIFIED" && lead.status !== "QUALIFICADO" && lead.status !== "OPORTUNIDADE" && lead.status !== "DESQUALIFICADO" && (
              <button
                type="button"
                onClick={handleQualifyLead}
                className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                title="Aprova este lead na qualificação para avanço comercial"
              >
                <CheckCircle2 className="w-4 h-4" /> Qualificar Lead
              </button>
            )}

            {!isConverted && lead.status !== "NUTRICAO" && lead.status !== "DESQUALIFICADO" && (
              <button
                type="button"
                onClick={() => setShowNurtureModal(true)}
                className="px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                title="Lead com interesse mas que precisa de acompanhamento futuro"
              >
                <Clock className="w-4 h-4 text-amber-600" /> Enviar para Nutrição
              </button>
            )}

            {!isConverted && lead.status !== "DESQUALIFICADO" && lead.status !== "UNQUALIFIED" && (
              <button
                type="button"
                onClick={() => setShowDisqualifyModal(true)}
                className="px-3 py-2 text-xs font-semibold text-zinc-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 rounded-xl flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                title="Descartar este lead por perfil incompatível ou desinteresse"
              >
                <X className="w-4 h-4 text-zinc-400 hover:text-rose-600" /> Desqualificar
              </button>
            )}

          </div>
        </div>

        {/* Banner de Lead em Nutrição */}
        {lead.status === "NUTRICAO" && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-950">Lead em Nutrição Estratégica</h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  <strong>Motivo:</strong> {lead.nurtureReason || "Acompanhamento futuro de compra"}.
                  {lead.nurtureNextActionDate && (
                    <span className="ml-2">
                      <strong>Próximo Contato:</strong> {new Date(lead.nurtureNextActionDate + "T12:00:00").toLocaleDateString("pt-BR")}.
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleQualifyLead}
                className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition"
              >
                Reativar para Qualificação
              </button>
              <button
                type="button"
                onClick={openCreateOppModal}
                className="px-3 py-1.5 text-xs font-bold bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl transition"
              >
                Avançar p/ Oportunidade
              </button>
            </div>
          </div>
        )}

        {/* Banner de Lead Desqualificado */}
        {(lead.status === "DESQUALIFICADO" || lead.status === "UNQUALIFIED") && (
          <div className="bg-zinc-100 border border-zinc-300 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-900">Lead Desqualificado</h4>
                <p className="text-xs text-zinc-600 mt-0.5">
                  <strong>Motivo do Descarte:</strong> {lead.disqualificationReason || "Critérios comerciais não atendidos"}.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleStatusChange("QUALIFICANDO")}
              className="px-3 py-1.5 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl transition"
            >
              Reabrir Lead (Em Qualificação)
            </button>
          </div>
        )}

        <CommercialDnaPanel leadId={id} />
        {/* Status Bar */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500">Status do Lead:</span>
            <select
              value={
                lead.status === "NEW" ? "NOVO" :
                lead.status === "CONTACTED" ? "QUALIFICANDO" :
                lead.status === "QUALIFIED" ? "QUALIFICADO" :
                lead.status === "UNQUALIFIED" ? "DESQUALIFICADO" :
                lead.status
              }
              disabled={isConverted}
              onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
              className="px-3 py-1.5 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-60"
            >
              <option value="NOVO">1. Novo (Triagem)</option>
              <option value="QUALIFICANDO">2. Em Qualificação</option>
              <option value="NUTRICAO">3. Em Nutrição</option>
              <option value="STAND_BY">Stand-by (Aguardando avanço)</option>
              <option value="QUALIFICADO">4. Qualificado</option>
              <option value="OPORTUNIDADE">5. Oportunidade Comercial</option>
              <option value="DESQUALIFICADO">Desqualificado</option>
              {isConverted && <option value="CONVERTED">Convertido em Cliente</option>}
              <option value="ARCHIVED">Arquivado</option>
            </select>
          </div>

          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <span>Criado em: {new Date(lead.createdAt).toLocaleDateString("pt-BR")}</span>
            {lead.convertedAt && (
              <span className="text-emerald-600 font-semibold">
                Convertido em: {new Date(lead.convertedAt).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        </div>

        {/* Trilha Visual de Evolução: Lead -> Oportunidade -> Proposta -> Cliente -> Contrato */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                Esteira de Evolução & Aquisição
              </span>
              <h3 className="text-sm font-bold text-zinc-950 mt-1">
                Jornada do Cliente: Do Primeiro Contato à Assinatura
              </h3>
            </div>
            <div>
              {isConverted ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Lead Transformado em Cliente Oficial
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-800 font-semibold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Etapa de Qualificação & Negociação
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* 1. Lead */}
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">1. Prospecção</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xs font-bold text-zinc-900 truncate">Lead Cadastrado</div>
              <p className="text-[11px] text-zinc-500">Origem: {lead.source || "Direta"}</p>
            </div>

            {/* 2. Funil Comercial */}
            <div className={`p-3.5 rounded-xl border space-y-1 ${
              hasWonOpp
                ? "border-emerald-200 bg-emerald-50/40"
                : opportunities.length > 0
                ? "border-indigo-200 bg-indigo-50/30"
                : "border-zinc-200 bg-zinc-50/50"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">2. Negociação</span>
                {hasWonOpp ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : opportunities.length > 0 ? (
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-zinc-300" />
                )}
              </div>
              <div className="text-xs font-bold text-zinc-900">
                {hasWonOpp
                  ? "Negociação Ganha!"
                  : opportunities.length > 0
                  ? `${opportunities.length} Oportunidade(s)`
                  : "Sem Negociação"}
              </div>
              {opportunities.length > 0 ? (
                <p className="text-[11px] text-zinc-500 truncate">
                  {opportunities[0].stageName || "Em andamento"}
                </p>
              ) : (
                <Link
                  href={`/crm/opportunities/new?leadId=${lead.id}`}
                  className="inline-block text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  + Abrir no Funil
                </Link>
              )}
            </div>

            {/* 3. Proposta Comercial */}
            <div className={`p-3.5 rounded-xl border space-y-1 ${
              hasApprovedProp
                ? "border-emerald-200 bg-emerald-50/40"
                : proposals.length > 0
                ? "border-indigo-200 bg-indigo-50/30"
                : "border-zinc-200 bg-zinc-50/50"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">3. Proposta</span>
                {hasApprovedProp ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : proposals.length > 0 ? (
                  <FileText className="w-4 h-4 text-indigo-600" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-zinc-300" />
                )}
              </div>
              <div className="text-xs font-bold text-zinc-900">
                {hasApprovedProp
                  ? "Proposta Aprovada"
                  : proposals.length > 0
                  ? `${proposals.length} Proposta(s)`
                  : "Sem Proposta"}
              </div>
              {proposals.length > 0 ? (
                <Link
                  href={`/proposals/${proposals[0].id}`}
                  className="inline-block text-[11px] font-bold text-indigo-600 hover:underline truncate"
                >
                  Ver {proposals[0].proposalCode || "Proposta"}
                </Link>
              ) : (
                <Link
                  href={`/proposals/new?leadId=${lead.id}`}
                  className="inline-block text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  + Criar Proposta
                </Link>
              )}
            </div>

            {/* 4. Cliente Oficial */}
            <div className={`p-3.5 rounded-xl border space-y-1 ${
              isConverted
                ? "border-emerald-200 bg-emerald-50/40"
                : "border-amber-200 bg-amber-50/30"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">4. Cliente Oficial</span>
                {isConverted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <div className="text-xs font-bold text-zinc-900">
                {isConverted ? "Cliente Registrado" : "Pendente"}
              </div>
              {isConverted ? (
                <Link
                  href={`/clients/${lead.convertedClientId}`}
                  className="inline-block text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  Abrir Ficha &rarr;
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={openConvertModal}
                  className="text-[11px] font-bold text-amber-800 hover:underline cursor-pointer"
                >
                  Converter Agora &rarr;
                </button>
              )}
            </div>

            {/* 5. Contrato & Operação */}
            <div className={`p-3.5 rounded-xl border space-y-1 ${
              isConverted ? "border-zinc-200 bg-white" : "border-zinc-200 bg-zinc-50/50 opacity-60"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">5. Contrato</span>
                <Briefcase className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="text-xs font-bold text-zinc-900">Assinatura & Projeto</div>
              {isConverted ? (
                <Link
                  href={`/contracts/new?clientId=${lead.convertedClientId}`}
                  className="inline-block text-[11px] font-bold text-zinc-900 hover:underline"
                >
                  + Nova Assinatura
                </Link>
              ) : (
                <p className="text-[11px] text-zinc-400">Ativa após virar cliente</p>
              )}
            </div>
          </div>
        </div>

        {/* Detalhes do Lead & Contato */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
                Ficha Cadastral do Lead
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="text-xs font-semibold text-zinc-600 hover:text-zinc-950 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                Editar Dados
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-400 block mb-0.5">Documento (CPF / CNPJ)</span>
                <span className="font-mono font-bold text-zinc-900">{lead.document || "Não informado"}</span>
              </div>
              <div>
                <span className="text-zinc-400 block mb-0.5">Contato Principal</span>
                <span className="font-semibold text-zinc-800">{lead.primaryContact || "-"}</span>
              </div>
              <div>
                <span className="text-zinc-400 block mb-0.5">E-mail</span>
                <span className="font-medium text-zinc-800">{lead.email || "-"}</span>
              </div>
              <div>
                <span className="text-zinc-400 block mb-0.5 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-zinc-400" />
                  Telefone
                </span>
                {lead.phone ? (
                  <a
                    href={`tel:${lead.phone.replace(/\D/g, "")}`}
                    className="font-mono text-zinc-800 hover:text-indigo-600 font-medium"
                  >
                    {lead.phone}
                  </a>
                ) : (
                  <span className="text-zinc-400">-</span>
                )}
              </div>
              <div>
                <span className="text-zinc-400 block mb-0.5 flex items-center gap-1 text-emerald-700 font-semibold">
                  <WhatsAppIcon className="w-3 h-3 text-emerald-600" />
                  WhatsApp
                </span>
                {lead.whatsapp ? (
                  <WhatsAppLink number={lead.whatsapp} name={lead.name} />
                ) : (
                  <span className="text-zinc-400">-</span>
                )}
              </div>
              <div>
                <span className="text-zinc-400 block mb-0.5">Segmento de Mercado</span>
                <span className="font-medium text-zinc-800">{lead.segment || "-"}</span>
              </div>
              <div>
                <span className="text-zinc-400 block mb-0.5">Cidade / UF</span>
                <span className="font-medium text-zinc-800">
                  {lead.city && lead.state ? `${lead.city} - ${lead.state}` : "-"}
                </span>
              </div>
            </div>

            {/* Origem & Estratégia de Aquisição */}
            <div className="pt-4 border-t border-zinc-100">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Origem & Estratégia de Aquisição
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-50/70 p-3.5 rounded-xl border border-zinc-100 text-xs">
                <div>
                  <span className="text-zinc-400 block text-[11px] mb-1">Tipo de Aquisição</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      lead.acquisitionType === "OUTBOUND"
                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                        : "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}
                  >
                    {lead.acquisitionType === "OUTBOUND" ? "OUTBOUND (Ativa)" : "INBOUND (Receptiva)"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px] mb-1">Origem do Lead</span>
                  <span className="font-bold text-zinc-900">{lead.leadSource || lead.source || "Não informada"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px] mb-1">Canal de Primeiro Contato</span>
                  <span className="font-semibold text-zinc-800">{lead.firstContactChannel || "WhatsApp"}</span>
                </div>
              </div>
            </div>

            {/* Diagnóstico & Perfil de Contratação */}
            {(lead.serviceOfInterest || lead.urgencyTimeline || lead.estimatedBudget || lead.needSummary) && (
              <div className="pt-4 border-t border-zinc-100">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                  Diagnóstico & Qualificação Comercial
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-indigo-50/30 p-3.5 rounded-xl border border-indigo-100 text-xs mb-3">
                  <div>
                    <span className="text-zinc-400 block text-[11px] mb-1">Serviço de Interesse</span>
                    <span className="font-bold text-indigo-950">{lead.serviceOfInterest || "Não especificado"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[11px] mb-1">Momento / Urgência</span>
                    <span className="font-semibold text-zinc-800">{lead.urgencyTimeline || "Não informado"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[11px] mb-1">Orçamento Estimado</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {lead.estimatedBudget ? formatBRL(lead.estimatedBudget) : "A combinar"}
                    </span>
                  </div>
                </div>
                {lead.needSummary && (
                  <div className="whitespace-pre-wrap break-words text-xs text-zinc-700 bg-white p-2.5 rounded-lg border border-zinc-200">
                    <strong className="text-zinc-900">Necessidade do Lead:</strong> {lead.needSummary}
                  </div>
                )}
              </div>
            )}

            {lead.notes && (
              <div className="pt-3 border-t border-zinc-100">
                <span className="text-zinc-400 text-xs block mb-1">Observações Internas</span>
                <p className="text-xs text-zinc-700 bg-zinc-50 p-3 rounded-xl border border-zinc-100 whitespace-pre-wrap">
                  {lead.notes}
                </p>
              </div>
            )}
          </div>

          {/* Card Resumo do Pipeline */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-950 border-b border-zinc-100 pb-2">
                Resumo Comercial do Lead
              </h3>
              <div className="space-y-4 my-4">
                <div>
                  <div className="text-[11px] text-zinc-400 font-semibold uppercase">Oportunidades em Aberto</div>
                  <div className="text-xl font-extrabold text-purple-700 font-mono mt-0.5">
                    {formatBRL(lead.openOpportunitiesAmount || 0)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-zinc-400 font-semibold uppercase">Total de Negócios</div>
                    <div className="text-lg font-bold text-zinc-900 mt-0.5">
                      {opportunities.length} {opportunities.length === 1 ? "oportunidade" : "oportunidades"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-400 font-semibold uppercase">Propostas</div>
                    <div className="text-lg font-bold text-zinc-900 mt-0.5">
                      {proposals.length} {proposals.length === 1 ? "proposta" : "propostas"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Link
                href={`/crm/opportunities/new?leadId=${lead.id}`}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition text-center shadow-xs flex items-center justify-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar ao Funil (Oportunidade)
              </Link>
              <Link
                href={`/proposals/new?leadId=${lead.id}`}
                className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold transition text-center flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-purple-600" /> Nova Proposta Comercial
              </Link>
            </div>
          </div>
        </div>

        {/* Onboarding & Briefing de Redes Sociais */}
        {onboardingSession && (
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                    Onboarding — Social Media
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        onboardingSession.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-amber-100 text-amber-800 border-amber-300"
                      }`}
                    >
                      {onboardingSession.status === "COMPLETED"
                        ? "Briefing Concluído"
                        : `Em Andamento (${onboardingSession.progress_percent || 0}%)`}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Processo de entrada e inteligência de conteúdo via IA da Otimizza
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBriefingTranscriptModal(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-800 rounded-xl transition shadow-2xs flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Revisar Histórico do Onboarding
                </button>

                {onboardingSession.project_id && (
                  <Link
                    href={`/projects/${onboardingSession.project_id}`}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-2xs flex items-center gap-1.5"
                  >
                    Ver Projeto &rarr;
                  </Link>
                )}
              </div>
            </div>

            {/* Resumo das Diretrizes Extraídas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-white/80 border border-emerald-500/20 rounded-xl p-3">
                <span className="font-bold text-zinc-700 block mb-1">Público-Alvo Validado</span>
                <p className="text-zinc-600 line-clamp-3">
                  {onboardingSession.extracted_identity?.targetAudience || "Não informado no briefing"}
                </p>
              </div>

              <div className="bg-white/80 border border-emerald-500/20 rounded-xl p-3">
                <span className="font-bold text-zinc-700 block mb-1">Diferenciais Principais</span>
                <p className="text-zinc-600 line-clamp-3">
                  {onboardingSession.extracted_identity?.differentials || "Não informado no briefing"}
                </p>
              </div>

              <div className="bg-white/80 border border-emerald-500/20 rounded-xl p-3">
                <span className="font-bold text-zinc-700 block mb-1">Tom de Voz</span>
                <p className="text-zinc-600 line-clamp-3">
                  {Array.isArray(onboardingSession.extracted_identity?.toneOfVoice)
                    ? onboardingSession.extracted_identity.toneOfVoice.join(", ")
                    : onboardingSession.extracted_identity?.toneOfVoice || "Direto e didático"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Oportunidades do Lead */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-zinc-950">Oportunidades Comerciais Vinculadas</h3>
            </div>
            <Link
              href={`/crm/opportunities/new?leadId=${lead.id}`}
              className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </Link>
          </div>

          {opportunities.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              Nenhuma oportunidade criada para este lead.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 text-[11px] font-semibold text-zinc-400 uppercase">
                    <th className="py-2.5 px-3">Título</th>
                    <th className="py-2.5 px-3">Funil / Etapa</th>
                    <th className="py-2.5 px-3 text-right">Valor</th>
                    <th className="py-2.5 px-3 text-right">Probabilidade</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {opportunities.map((opp) => (
                    <tr key={opp.id} className="hover:bg-zinc-50/60 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-zinc-900">{opp.title}</div>
                        <span className="text-[10px] text-zinc-400 font-mono">{opp.opportunityCode}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-zinc-700">{opp.stageName}</span>
                        <span className="text-[10px] text-zinc-400 block">{opp.pipelineName}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-zinc-950 font-mono">
                        {formatBRL(opp.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-purple-700">
                        {opp.probability}%
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            opp.status === "WON"
                              ? "bg-emerald-50 text-emerald-700"
                              : opp.status === "LOST" || opp.status === "CANCELED"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {formatOpportunityStatus(opp.status)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/crm/opportunities/${opp.id}`}
                            className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 inline-block"
                            title="Ver detalhes"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteOpportunity(opp.id, opp.title)}
                            className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 inline-block transition"
                            title="Excluir Oportunidade"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Propostas Comerciais do Lead */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-zinc-950">Propostas Comerciais Vinculadas</h3>
            </div>
            <Link
              href={`/proposals/new?leadId=${lead.id}`}
              className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Nova Proposta
            </Link>
          </div>

          {proposals.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              Nenhuma proposta emitida para este lead até o momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 text-[11px] font-semibold text-zinc-400 uppercase">
                    <th className="py-2.5 px-3">Código / Proposta</th>
                    <th className="py-2.5 px-3">Valor Estimado</th>
                    <th className="py-2.5 px-3">Validade</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {proposals.map((prop) => (
                    <tr key={prop.id} className="hover:bg-zinc-50/60 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-zinc-900">{prop.title}</div>
                        <span className="text-[10px] text-zinc-400 font-mono">{prop.proposalCode}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-zinc-900">
                        {formatBRL(prop.totalMonthlyEffective || prop.totalOneTimeEffective || prop.totalYearlyEffective || prop.totalAmount || 0)}
                        {prop.totalMonthlyEffective ? <span className="text-[10px] text-zinc-500 font-normal"> /mês</span> : prop.totalYearlyEffective ? <span className="text-[10px] text-zinc-500 font-normal"> /ano</span> : null}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-600 font-mono text-[11px]">
                        {prop.validUntil ? new Date(prop.validUntil).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            prop.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : prop.status === "SENT"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : prop.status === "NEGOTIATING"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : prop.status === "REJECTED" || prop.status === "CANCELED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200"
                          }`}
                        >
                          {formatProposalStatus(prop.status)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/proposals/${prop.id}`}
                            className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 inline-block"
                            title="Abrir proposta"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteProposal(prop.id, prop.proposalCode)}
                            className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 inline-block transition"
                            title="Excluir Proposta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Atividades e Histórico */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-zinc-950">Atividades Comerciais & Follow-ups</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowActivityModal(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Nova Atividade
            </button>
          </div>

          {activities.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              Nenhuma atividade registrada para este lead.
            </div>
          ) : (
            <div className="space-y-2.5">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className={`p-3.5 rounded-xl border transition flex items-center justify-between ${
                    act.status === "COMPLETED"
                      ? "bg-zinc-50 border-zinc-200 opacity-70"
                      : act.isOverdue
                      ? "bg-rose-50/50 border-rose-200"
                      : "bg-white border-zinc-200"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
                        {act.activityType}
                      </span>
                      <span className="font-bold text-xs text-zinc-900">{act.title}</span>
                      {act.isOverdue && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                          Atrasada
                        </span>
                      )}
                    </div>
                    {act.description && <p className="text-xs text-zinc-600">{act.description}</p>}
                    <div className="text-[11px] text-zinc-400 flex items-center gap-3">
                      <span>
                        Vencimento: {act.dueDate ? new Date(act.dueDate).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Sem data"}
                        {act.dueDate && act.dueDate.includes("T") && !act.dueDate.includes("12:00:00") ? (
                          <span className="ml-1 text-[10px] text-zinc-500 font-mono">
                            às {new Date(act.dueDate).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        ) : null}
                      </span>
                      {act.completedAt && (
                        <span className="text-emerald-600 font-semibold">
                          Concluída em: {new Date(act.completedAt).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>

                  {act.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => handleCompleteActivity(act.id)}
                      className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Concluir
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Conversão em Cliente */}
        {showConvertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-zinc-950">Converter Lead em Cliente</h3>
              </div>

              {convertError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {convertError}
                </div>
              )}

              <p className="text-xs text-zinc-600">
                A conversão transfere formalmente o lead para a base oficial de clientes, preservando todo o histórico comercial e oportunidades.
              </p>

              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-700 block">Modo de Conversão</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-50">
                    <input
                      type="radio"
                      name="convertMode"
                      value="NEW_CLIENT"
                      checked={convertMode === "NEW_CLIENT"}
                      onChange={() => setConvertMode("NEW_CLIENT")}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-bold text-zinc-900">Criar Novo Cliente</div>
                      <div className="text-[11px] text-zinc-500">
                        Cria um novo registro em Clientes com os dados atuais do lead.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-50">
                    <input
                      type="radio"
                      name="convertMode"
                      value="LINK_EXISTING"
                      checked={convertMode === "LINK_EXISTING"}
                      onChange={() => setConvertMode("LINK_EXISTING")}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-bold text-zinc-900">Vincular a Cliente Existente</div>
                      <div className="text-[11px] text-zinc-500">
                        Conecta as oportunidades e histórico a um cliente já cadastrado.
                      </div>
                    </div>
                  </label>
                </div>

                {convertMode === "NEW_CLIENT" && (
                  <div className="pt-2 space-y-3 max-h-[340px] overflow-y-auto pr-1">
                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2">
                        <span className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">
                          Dados Cadastrais do Cliente
                        </span>
                        <span className="text-[10px] text-zinc-500">Revise ou complete antes de salvar</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                            Razão Social / Nome Completo *
                          </label>
                          <input
                            type="text"
                            value={convertForm.name}
                            onChange={(e) => setConvertForm((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            placeholder="Nome do cliente"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                            Nome Fantasia
                          </label>
                          <input
                            type="text"
                            value={convertForm.tradeName}
                            onChange={(e) => setConvertForm((prev) => ({ ...prev, tradeName: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            placeholder="Nome fantasia"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                            CPF ou CNPJ
                          </label>
                          <input
                            type="text"
                            value={convertForm.document}
                            onChange={(e) => setConvertForm((prev) => ({ ...prev, document: formatDocument(e.target.value) }))}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            placeholder="00.000.000/0000-00"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                            Contato Autorizado (Pessoa)
                          </label>
                          <input
                            type="text"
                            value={convertForm.primaryContact}
                            onChange={(e) => setConvertForm((prev) => ({ ...prev, primaryContact: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            placeholder="Ex: Fabrício"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-700 block mb-1 flex items-center gap-1 text-emerald-700">
                            <WhatsAppIcon className="w-3 h-3 text-emerald-600" /> WhatsApp Corporativo
                          </label>
                          <input
                            type="text"
                            value={convertForm.whatsapp}
                            onChange={(e) => setConvertForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            placeholder="(00) 90000-0000"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                            Telefone Fixo / Outro
                          </label>
                          <input
                            type="text"
                            value={convertForm.phone}
                            onChange={(e) => setConvertForm((prev) => ({ ...prev, phone: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            placeholder="(00) 0000-0000"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                            E-mail Comercial
                          </label>
                          <input
                            type="email"
                            value={convertForm.email}
                            onChange={(e) => setConvertForm((prev) => ({ ...prev, email: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            placeholder="contato@empresa.com"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                            Cidade
                          </label>
                          <input
                            type="text"
                            value={convertForm.city}
                            onChange={(e) => setConvertForm((prev) => ({ ...prev, city: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                            Estado (UF)
                          </label>
                          <input
                            type="text"
                            maxLength={2}
                            value={convertForm.state}
                            onChange={(e) => setConvertForm((prev) => ({ ...prev, state: e.target.value.toUpperCase() }))}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 uppercase"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {convertMode === "LINK_EXISTING" && (
                  <div className="pt-2">
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      Selecione o Cliente Existente:
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    >
                      <option value="">Selecione um cliente...</option>
                      {existingClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.document ? `(${c.document})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={converting || (convertMode === "LINK_EXISTING" && !selectedClientId)}
                  onClick={handleConvert}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {converting ? "Convertendo..." : "Confirmar Conversão"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Edição de Lead */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-950">Editar Informações do Lead</h3>
                    <p className="text-xs text-zinc-500 font-mono">{lead.leadCode} • Atualização cadastral</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {editError && (
                <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="space-y-4">
                {/* Tipo de Pessoa */}
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition ${
                      editForm.personType === "PJ"
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="personType"
                      value="PJ"
                      checked={editForm.personType === "PJ"}
                      onChange={handleEditChange}
                      className="sr-only"
                    />
                    <Building className="w-4 h-4" /> Pessoa Jurídica (PJ)
                  </label>
                  <label
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition ${
                      editForm.personType === "PF"
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="personType"
                      value="PF"
                      checked={editForm.personType === "PF"}
                      onChange={handleEditChange}
                      className="sr-only"
                    />
                    <User className="w-4 h-4" /> Pessoa Física (PF)
                  </label>
                </div>

                {/* Nome & Razão Social */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      {editForm.personType === "PJ" ? "Razão Social *" : "Nome Completo *"}
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={editForm.name}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      {editForm.personType === "PJ" ? "Nome Fantasia" : "Apelido / Tratamento"}
                    </label>
                    <input
                      type="text"
                      name="tradeName"
                      value={editForm.tradeName}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                </div>

                {/* Documento & Contato Principal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      {editForm.personType === "PJ" ? "CNPJ" : "CPF"}
                    </label>
                    <input
                      type="text"
                      name="document"
                      placeholder={editForm.personType === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
                      value={editForm.document}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      Pessoa de Contato Principal
                    </label>
                    <input
                      type="text"
                      name="primaryContact"
                      value={editForm.primaryContact}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                </div>

                {/* Contatos Digitais */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">E-mail</label>
                    <input
                      type="email"
                      name="email"
                      value={editForm.email}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-zinc-400" />
                      Telefone
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleEditChange}
                      placeholder="(11) 3211-0000"
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1 flex items-center gap-1 text-emerald-700">
                      <WhatsAppIcon className="w-3 h-3 text-emerald-600" />
                      WhatsApp
                    </label>
                    <input
                      type="text"
                      name="whatsapp"
                      value={editForm.whatsapp}
                      onChange={handleEditChange}
                      placeholder="(11) 98765-4321"
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                </div>

                {/* Segmento & Origem */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Tipo de Aquisição</label>
                    <select
                      name="acquisitionType"
                      value={editForm.acquisitionType}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    >
                      <option value="NAO_INFORMADO">Não informado</option><option value="INBOUND">INBOUND (Captação Receptiva)</option>
                      <option value="OUTBOUND">OUTBOUND (Prospecção Ativa)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Origem do Lead</label>
                    <LeadSourceInput value={editForm.leadSource} onChange={value => setEditForm(prev => ({...prev, leadSource:value}))} />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Canal 1º Contato</label>
                    <select
                      name="firstContactChannel"
                      value={editForm.firstContactChannel}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Telefone">Telefone</option>
                      <option value="Formulário do Site">Formulário Site</option>
                      <option value="Instagram Direct">Instagram Direct</option>
                      <option value="Facebook Messenger">Messenger</option>
                      <option value="E-mail">E-mail</option>
                      <option value="Presencial">Presencial</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>

                {/* Qualificação & Diagnóstico */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Serviço de Interesse</label>
                    <input
                      type="text"
                      name="serviceOfInterest"
                      placeholder="Ex: Social Media, Google Ads"
                      value={editForm.serviceOfInterest}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Urgência / Momento</label>
                    <input
                      type="text"
                      name="urgencyTimeline"
                      placeholder="Ex: Imediato, 15 dias"
                      value={editForm.urgencyTimeline}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Orçamento Estimado (R$)</label>
                    <input
                      type="text"
                      name="estimatedBudget"
                      placeholder="Ex: 2.000,00"
                      value={editForm.estimatedBudget}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Resumo da Necessidade do Lead</label>
                  <textarea
                    rows={5}
                    name="needSummary"
                    placeholder="Ex: Precisa de mais pacientes no consultório..."
                    value={editForm.needSummary}
                    onChange={handleEditChange}
                    className="w-full min-h-32 resize-y px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                {/* Segmento & Localização */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Segmento de Mercado</label>
                    <input
                      type="text"
                      name="segment"
                      placeholder="Ex: E-commerce, Saúde, Advocacia"
                      value={editForm.segment}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Cidade</label>
                    <input
                      type="text"
                      name="city"
                      value={editForm.city}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">UF</label>
                    <input
                      type="text"
                      name="state"
                      maxLength={2}
                      value={editForm.state}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Observações Internas</label>
                  <textarea
                    rows={3}
                    name="notes"
                    value={editForm.notes}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                {/* Ações do Modal */}
                <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    disabled={actionLoading || savingEdit}
                    onClick={handleDeleteLead}
                    className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir / Arquivar Lead
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      disabled={savingEdit}
                      className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 rounded-xl transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="px-5 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingEdit ? "Salvando..." : "Salvar Alterações"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Nova Atividade */}
        {showActivityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <form onSubmit={handleCreateActivity} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-zinc-950 border-b border-zinc-100 pb-2">
                Agendar Atividade Comercial
              </h3>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Tipo de Atividade</label>
                <select
                  value={newActivity.activityType}
                  onChange={(e) => setNewActivity((prev) => ({ ...prev, activityType: e.target.value as ActivityType }))}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
                >
                  <option value="FOLLOW_UP">Follow-up</option>
                  <option value="CALL">Ligação Telefônica</option>
                  <option value="WHATSAPP">Mensagem WhatsApp</option>
                  <option value="MEETING">Reunião / Apresentação</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="NOTE">Nota Interna</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Título da Atividade *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ligar para verificar recebimento da proposta"
                  value={newActivity.title}
                  onChange={(e) => setNewActivity((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-700">Data e Horário Previsto</label>
                  <span className="text-[10px] text-zinc-400 font-mono">Passos de 15 min</span>
                </div>
                <input
                  type="datetime-local"
                  step="900"
                  value={newActivity.dueDate}
                  onChange={(e) => setNewActivity((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
                />
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-zinc-400">Horários:</span>
                  {["09:00", "09:15", "09:30", "10:00", "10:30", "11:15", "14:00", "14:15", "15:00", "16:30"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        const base = newActivity.dueDate ? newActivity.dueDate.split("T")[0] : new Date().toISOString().split("T")[0];
                        setNewActivity((prev) => ({ ...prev, dueDate: `${base}T${t}` }));
                      }}
                      className="text-[10px] font-mono font-medium px-1.5 py-0.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded transition"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Descrição</label>
                <textarea
                  rows={2}
                  placeholder="Detalhes ou pontos a abordar..."
                  value={newActivity.description}
                  onChange={(e) => setNewActivity((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-950 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingActivity}
                  className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl disabled:opacity-50"
                >
                  {savingActivity ? "Salvando..." : "Salvar Atividade"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Enviar para Nutrição */}
        {showNurtureModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <form onSubmit={handleConfirmNurture} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">Enviar Lead para Nutrição</h3>
                    <p className="text-[11px] text-zinc-500">Mantenha o lead em acompanhamento estratégico</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNurtureModal(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Motivo da Nutrição *</label>
                <select
                  value={nurtureReason}
                  onChange={(e) => setNurtureReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="Pretende contratar futuramente">Pretende contratar futuramente</option>
                  <option value="Está pesquisando fornecedores">Está pesquisando fornecedores</option>
                  <option value="Ainda não decidiu investir">Ainda não decidiu investir no momento</option>
                  <option value="Precisa receber conteúdos ou informações adicionais">Precisa de mais conteúdos / cases</option>
                  <option value="Solicitou contato em data específica">Solicitou contato em data futura</option>
                  <option value="Outro">Outro motivo</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Data Prevista para Próximo Contato</label>
                <input
                  type="date"
                  value={nurtureNextDate}
                  onChange={(e) => setNurtureNextDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Observações da Nutrição</label>
                <textarea
                  rows={2}
                  value={nurtureNotes}
                  onChange={(e) => setNurtureNotes(e.target.value)}
                  placeholder="Ex: Vai reformar o espaço da clínica em janeiro e pediu retorno no início do ano..."
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowNurtureModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNurture}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs disabled:opacity-50"
                >
                  {savingNurture ? "Salvando..." : "Confirmar Nutrição"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Desqualificar Lead */}
        {showDisqualifyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <form onSubmit={handleConfirmDisqualify} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                    <X className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">Desqualificar Lead</h3>
                    <p className="text-[11px] text-zinc-500">Registre o motivo pelo qual este contato foi descartado</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDisqualifyModal(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Motivo do Descarte *</label>
                <select
                  value={disqualifyReason}
                  onChange={(e) => setDisqualifyReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="Fora do perfil / Porte incompatível">Fora do perfil da Otimizza</option>
                  <option value="Sem interesse / Desistiu">Sem interesse / Desistiu dos serviços</option>
                  <option value="Contato inválido / Não atende">Contato inválido / Não responde</option>
                  <option value="Necessidade incompatível">Necessidade incompatível com nossos serviços</option>
                  <option value="Sem orçamento suficiente">Sem orçamento suficiente</option>
                  <option value="Duplicidade cadastral">Duplicidade cadastral</option>
                  <option value="Outro">Outro motivo</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Observações do Descarte</label>
                <textarea
                  rows={2}
                  value={disqualifyNotes}
                  onChange={(e) => setDisqualifyNotes(e.target.value)}
                  placeholder="Detalhes adicionais sobre o descarte..."
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowDisqualifyModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingDisqualify}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs disabled:opacity-50"
                >
                  {savingDisqualify ? "Salvando..." : "Confirmar Desqualificação"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Criar Oportunidade Comercial (com checagem de duplicidade) */}
        {showCreateOppModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <form onSubmit={handleCreateOppSubmit} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">Criar Oportunidade Comercial</h3>
                    <p className="text-[11px] text-zinc-500">Inicie uma negociação formal no Funil de Vendas (Kanban)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateOppModal(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Alerta de Oportunidades Existentes */}
              {opportunities.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Este lead já possui {opportunities.length} negociação(ões) vinculada(s):
                  </div>
                  <ul className="text-amber-800 list-disc list-inside space-y-0.5 pt-1">
                    {opportunities.map((op) => (
                      <li key={op.id} className="truncate">
                        <strong>{op.title}</strong> — {op.stageName || "Em andamento"} ({formatBRL(op.amount)})
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-amber-700 pt-1">
                    Você pode criar uma nova negociação adicional ou cancelar para continuar as existentes.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Funil Comercial *</label>
                  <select
                    value={selectedPipeId}
                    onChange={(e) => {
                      const pId = e.target.value;
                      setSelectedPipeId(pId);
                      const pipe = pipelines.find((p) => p.id === pId);
                      if (pipe && pipe.stages && pipe.stages.length > 0) {
                        setSelectedStageId(pipe.stages[0].id);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    {pipelines.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.isDefault ? "(Padrão)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Etapa Inicial *</label>
                  <select
                    value={selectedStageId}
                    onChange={(e) => setSelectedStageId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    {(pipelines.find((p) => p.id === selectedPipeId)?.stages || []).map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Título da Negociação *</label>
                <input
                  type="text"
                  required
                  value={newOppTitle}
                  onChange={(e) => setNewOppTitle(e.target.value)}
                  placeholder={`Negociação - ${lead.name}`}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Valor Estimado Mensal (R$)</label>
                <input
                  type="text"
                  value={newOppAmount}
                  onChange={(e) => setNewOppAmount(e.target.value)}
                  placeholder="Ex: 2.500,00"
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowCreateOppModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingOpp}
                  className="px-4 py-2 text-xs font-bold text-white bg-zinc-950 hover:bg-zinc-800 rounded-xl shadow-xs disabled:opacity-50"
                >
                  {creatingOpp ? "Criando..." : "Criar Oportunidade"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal de Revisão do Histórico de Onboarding */}
        {showBriefingTranscriptModal && onboardingSession && (
          <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full border border-zinc-200 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-950 text-sm">
                      Histórico do Onboarding com IA (Sofia)
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Empresa: {onboardingSession.company_name} • Contato: {onboardingSession.contact_name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBriefingTranscriptModal(false)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-zinc-50/30">
                {Array.isArray(onboardingSession.conversation_history) &&
                  onboardingSession.conversation_history.map((msg: any, idx: number) => {
                    const isAssistant = msg.sender === "assistant";
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col ${isAssistant ? "items-start" : "items-end"}`}
                      >
                        <span className="text-[10px] text-zinc-400 mb-0.5 px-1 font-semibold">
                          {isAssistant ? "Sofia (Otimizza)" : onboardingSession.contact_name}
                        </span>
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                            isAssistant
                              ? "bg-white border border-zinc-200 text-zinc-800 rounded-tl-xs shadow-2xs"
                              : "bg-emerald-600 text-white rounded-tr-xs"
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="p-3 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  Progresso registrado: <strong>{onboardingSession.progress_percent || 0}%</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setShowBriefingTranscriptModal(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
