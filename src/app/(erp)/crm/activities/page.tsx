"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import {EditRecordAction} from "@/components/ui/edit-record-action";

import {ArchiveRecordAction} from "@/components/ui/archive-record-action";
import { useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/toast-provider";
import { confirmAction } from "@/components/ui/confirm-dialog";

import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Filter,
  Search,
  Phone,
  Video,
  Mail,
  MessageSquare,
  FileText,
  ListTodo,
  Building,
  User,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  UserX,
  CalendarClock,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { ActivityRecord, ActivityStatus, ActivityType } from "@/modules/crm/types";

function CommercialActivitiesPageContent() {
  const searchParams = useSearchParams();
  const [showArchived,setShowArchived]=useState(false);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [recordFilter, setRecordFilter] = useState("ALL");
  const [targetFilter, setTargetFilter] = useState("ALL");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [loadError, setLoadError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const loadGeneration = useRef(0);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [metrics, setMetrics] = useState({
    pending: 0,
    overdue: 0,
    completed: 0,
    noShow: 0,
    rescheduled: 0,
    total: 0,
  });

  // Modal de Reagendamento / Adiamento
  const [rescheduleTarget, setRescheduleTarget] = useState<ActivityRecord | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduling, setRescheduling] = useState(false);

  // Modal de No-Show
  const [noShowTarget, setNoShowTarget] = useState<ActivityRecord | null>(null);
  const [noShowReason, setNoShowReason] = useState("");
  const [savingNoShow, setSavingNoShow] = useState(false);

  useEffect(() => {
    const s = searchParams.get("status");
    if (s) {
      setStatusFilter(s);
    }
  }, [searchParams]);

  // Modal nova atividade
  const [showModal, setShowModal] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [actType, setActType] = useState<ActivityType>("CALL");
  const [actTitle, setActTitle] = useState("");
  const [actDueDate, setActDueDate] = useState("");
  const [actDescription, setActDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Vínculo da Atividade (Lead, Cliente ou Oportunidade)
  const [targetType, setTargetType] = useState<"CLIENT" | "LEAD" | "OPPORTUNITY">("CLIENT");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [clientsList, setClientsList] = useState<Array<{ id: string; name: string; document?: string | null }>>([]);
  const [leadsList, setLeadsList] = useState<Array<{ id: string; name: string; companyName?: string | null }>>([]);
  const [oppsList, setOppsList] = useState<Array<{ id: string; title: string }>>([]);

  async function loadTargets() {
    try {
      const [cRes, lRes, oRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/crm/leads"),
        fetch("/api/crm/opportunities"),
      ]);

      if (cRes.ok) {
        const cData = await cRes.json();
        const clients = Array.isArray(cData.clients) ? cData.clients : Array.isArray(cData) ? cData : [];
        setClientsList(clients);
      }
      if (lRes.ok) {
        const lData = await lRes.json();
        const leads = lData.leads || [];
        setLeadsList(leads);
      }
      if (oRes.ok) {
        const oData = await oRes.json();
        const opps = oData.opportunities || [];
        setOppsList(opps);
      }
    } catch (err) {
      console.error("Erro ao carregar alvos de atividade:", err);
    }
  }

  function handleOpenModal(task = false) {
    setCreatingTask(task);
    setActType(task ? "OTHER" : "CALL");
    setActTitle(""); setActDescription(""); setActDueDate(""); setSelectedTargetId("");
    setShowModal(true);
    setFormError("");
    if (!task && clientsList.length === 0 && leadsList.length === 0) {
      loadTargets();
    }
  }

  async function loadActivities() { await fetchActivities(false); }

  async function fetchActivities(append: boolean) {
    const generation = ++loadGeneration.current;
    setLoading(true); setLoadError("");
    try {
      if (dueFrom && dueTo && dueFrom > dueTo) throw new Error("O prazo inicial deve ser anterior ao final.");
      const params = new URLSearchParams({ archived: String(showArchived), includeMetrics: "true", recordKind: recordFilter, targetType: targetFilter, limit: "100", offset: String(append ? activities.length : 0) });
      if (statusFilter !== "ALL" && statusFilter !== "OVERDUE") params.set("status", statusFilter);
      if (statusFilter === "OVERDUE") params.set("overdueOnly", "true");
      if (typeFilter !== "ALL") params.set("activityType", typeFilter);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (dueFrom) params.set("dueFrom", dueFrom);
      if (dueTo) params.set("dueTo", dueTo);
      const res = await fetch(`/api/crm/activities?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível carregar a agenda.");
      if (generation !== loadGeneration.current) return;
      const rows = data.activities || [];
      setMetrics(data.metrics);
      setActivities(previous => append ? [...previous, ...rows] : rows);
      setHasMore(rows.length === 100);
    } catch (error) {
      if (generation === loadGeneration.current) setLoadError(error instanceof Error ? error.message : "Não foi possível carregar a agenda.");
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadActivities, 250);
    return () => { clearTimeout(timer); loadGeneration.current++; };
  }, [statusFilter, typeFilter, showArchived, recordFilter, targetFilter, dueFrom, dueTo, searchTerm]);

  async function handleComplete(id: string) {
    try {
      const res = await fetch(`/api/crm/activities/${id}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        loadActivities();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleNoShowConfirm() {
    if (!noShowTarget) return;
    setSavingNoShow(true);
    try {
      const res = await fetch(`/api/crm/activities/${noShowTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "NO_SHOW",
          outcomeReason: noShowReason.trim() || "Cliente não compareceu à reunião/compromisso",
        }),
      });
      if (res.ok) {
        setNoShowTarget(null);
        setNoShowReason("");
        loadActivities();
      } else {
        toast.error("Erro ao registrar no-show.");
      }
    } catch {
      toast.error("Falha de conexão com o servidor.");
    } finally {
      setSavingNoShow(false);
    }
  }

  async function handleRescheduleConfirm() {
    if (!rescheduleTarget || !rescheduleDate) {
      toast.warning("Informe a nova data e horário para o reagendamento.");
      return;
    }
    setRescheduling(true);
    try {
      const res = await fetch(`/api/crm/activities/${rescheduleTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "RESCHEDULED",
          newDueDate: rescheduleDate,
          outcomeReason: rescheduleReason.trim() || "Atividade adiada / reagendada",
        }),
      });
      if (res.ok) {
        setRescheduleTarget(null);
        setRescheduleDate("");
        setRescheduleReason("");
        loadActivities();
      } else {
        toast.error("Erro ao reagendar atividade.");
      }
    } catch {
      toast.error("Falha de conexão com o servidor.");
    } finally {
      setRescheduling(false);
    }
  }

  async function handleDeleteActivity(id: string, isTask = false) {
    if (!(await confirmAction({ title: isTask ? "Excluir tarefa" : "Excluir atividade comercial", message: isTask ? "Deseja realmente excluir esta tarefa?" : "Deseja realmente excluir esta atividade comercial?", confirmLabel: "Excluir", tone: "danger" }))) return;
    try {
      const res = await fetch(`/api/crm/activities/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadActivities();
      } else {
        toast.error("Erro ao excluir atividade.");
      }
    } catch {
      toast.error("Falha de comunicação.");
    }
  }

  async function handleCreateActivity(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!actTitle.trim()) {
      setFormError("Informe o assunto da atividade.");
      return;
    }
    if (!creatingTask && !selectedTargetId) {
      const targetLabel = targetType === "CLIENT" ? "Cliente" : targetType === "LEAD" ? "Lead" : "Oportunidade";
      setFormError(`Selecione o ${targetLabel} ao qual esta atividade pertence.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordKind: creatingTask ? "TASK" : "COMMERCIAL",
          activityType: actType,
          title: actTitle.trim(),
          description: actDescription.trim() || undefined,
          dueDate: actDueDate || undefined,
          clientId: !creatingTask && targetType === "CLIENT" ? selectedTargetId : undefined,
          leadId: !creatingTask && targetType === "LEAD" ? selectedTargetId : undefined,
          opportunityId: !creatingTask && targetType === "OPPORTUNITY" ? selectedTargetId : undefined,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setActTitle("");
        setActDescription("");
        setActDueDate("");
        setSelectedTargetId("");
        setFormError("");
        setRecordFilter(creatingTask ? "TASK" : "COMMERCIAL");
        setTargetFilter("ALL"); setStatusFilter("PENDING"); setTypeFilter("ALL");
        setSearchTerm(""); setDueFrom(""); setDueTo("");
        setShowArchived(false);
        loadActivities();
      } else {
        const err = await res.json();
        setFormError(err.error || "Erro ao registrar atividade.");
      }
    } catch (e) {
      console.error(e);
      setFormError("Falha de conexão com o servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  const activityTypeConfig: Record<ActivityType, { label: string; icon: LucideIcon; color: string; bg: string }> = {
    CALL: { label: "Ligação", icon: Phone, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
    MEETING: { label: "Reunião", icon: Video, color: "text-zinc-800", bg: "bg-zinc-100 border-zinc-200" },
    WHATSAPP: { label: "WhatsApp", icon: MessageSquare, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
    EMAIL: { label: "E-mail", icon: Mail, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
    FOLLOW_UP: { label: "Follow-up", icon: FileText, color: "text-zinc-800", bg: "bg-zinc-100 border-zinc-200" },
    NOTE: { label: "Nota Interna", icon: ListTodo, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
    OTHER: { label: "Outro", icon: Clock, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
  };

  const filteredActivities = activities;
  const metricCards = [
    { status: "PENDING", label: "Pendentes", value: metrics.pending, icon: Clock, color: "text-slate-700" },
    { status: "OVERDUE", label: "Atrasadas", value: metrics.overdue, icon: AlertTriangle, color: "text-rose-600" },
    { status: "COMPLETED", label: "Concluídas", value: metrics.completed, icon: CheckCircle2, color: "text-emerald-700" },
    { status: "NO_SHOW", label: "No-Show (Faltas)", value: metrics.noShow, icon: UserX, color: "text-amber-700" },
    { status: "RESCHEDULED", label: "Reagendadas", value: metrics.rescheduled, icon: CalendarClock, color: "text-zinc-800" },
  ];

  return (
    <>
      <div className="space-y-6">
<label className="flex items-center gap-2 text-xs text-zinc-600"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/>Ver arquivados</label>
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                <CalendarIcon className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agenda Comercial & Tarefas</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Organize tarefas internas, follow-ups, reuniões e prazos comerciais.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => handleOpenModal(true)} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800"><ListTodo className="h-4 w-4" />Criar tarefa</button>
            <button
              onClick={() => handleOpenModal(false)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Nova Atividade
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5" role="group" aria-label="Filtrar por situação">
          {metricCards.map(card => { const Icon = card.icon; return (
            <button key={card.status} type="button" aria-pressed={statusFilter === card.status} onClick={() => setStatusFilter(previous => previous === card.status ? "ALL" : card.status)} className={`flex items-center justify-between rounded-xl border bg-white p-4 text-left shadow-xs transition hover:shadow-sm focus-visible:outline-2 focus-visible:outline-emerald-600 ${statusFilter === card.status ? "border-emerald-500 ring-2 ring-emerald-100" : "border-slate-200"}`}>
              <span><span className={`block text-[11px] font-semibold uppercase tracking-wider ${card.color}`}>{card.label}</span><span className={`mt-1 block text-2xl font-bold ${card.color}`}>{card.value}</span></span><Icon className={`h-7 w-7 opacity-30 ${card.color}`} />
            </button>
          ); })}
        </div>

        {/* Barra de Filtros */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 pb-3">
            <label className="text-xs font-medium text-slate-500">Exibir
              <select value={recordFilter} onChange={e => { setRecordFilter(e.target.value); if (e.target.value === "TASK") setTargetFilter("ALL"); }} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                <option value="ALL">Agenda e tarefas</option><option value="COMMERCIAL">Somente agenda comercial</option><option value="TASK">Somente tarefas avulsas</option>
              </select>
            </label>
            <label className="text-xs font-medium text-slate-500">Vínculo
              <select aria-label="Filtrar por vínculo" value={targetFilter} disabled={recordFilter === "TASK"} onChange={e => setTargetFilter(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-50">
                <option value="ALL">Todos os vínculos</option><option value="LEAD">Lead</option><option value="CLIENT">Cliente</option><option value="OPPORTUNITY">Oportunidade</option>
              </select>
            </label>
            <label className="text-xs font-medium text-slate-500">Prazo inicial<input type="date" value={dueFrom} onChange={e => setDueFrom(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700" /></label>
            <label className="text-xs font-medium text-slate-500">Prazo final<input type="date" value={dueTo} onChange={e => setDueTo(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700" /></label>
            <button type="button" onClick={() => { setRecordFilter("ALL"); setTargetFilter("ALL"); setDueFrom(""); setDueTo(""); setSearchTerm(""); setTypeFilter("ALL"); setStatusFilter("ALL"); }} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Limpar filtros</button>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por assunto, descrição ou contato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              <div className="flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-medium text-slate-500">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-slate-300 rounded-lg text-sm px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="ALL">Todas as Atividades</option>
                  <option value="PENDING">Pendentes</option>
                  <option value="OVERDUE">Apenas Atrasadas</option>
                  <option value="COMPLETED">Concluídas</option>
                  <option value="NO_SHOW">No-Show (Não compareceu)</option>
                  <option value="RESCHEDULED">Reagendadas / Adiadas</option>
                  <option value="CANCELED">Canceladas</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-slate-500">Tipo:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="border border-slate-300 rounded-lg text-sm px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Todos os Tipos</option>
                  <option value="CALL">Ligações</option>
                  <option value="MEETING">Reuniões</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">E-mails</option>
                  <option value="FOLLOW_UP">Follow-up</option>
                  <option value="NOTE">Anotações</option>
                  <option value="OTHER">Outros</option>
                </select>
              </div>

              <button
                onClick={loadActivities}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                title="Recarregar"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Atividades */}
        {loadError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{loadError}<button type="button" onClick={loadActivities} className="ml-3 font-semibold underline">Tentar novamente</button></div>}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
              <p className="text-sm">Carregando atividades...</p>
            </div>
          ) : loadError ? null : filteredActivities.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="h-10 w-10 text-slate-300" />
              <p className="text-base font-semibold text-slate-700">Tudo em dia!</p>
              <p className="text-sm text-slate-400">Nenhuma atividade encontrada para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredActivities.map((act) => {
                const conf = activityTypeConfig[act.activityType] || activityTypeConfig.OTHER;
                const isTask = act.recordKind === "TASK";
                const Icon = isTask ? ListTodo : conf.icon;
                const isOverdue = act.isOverdue && (act.status === "PENDING" || act.status === "RESCHEDULED");

                return (
                  <div
                    key={act.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/80 transition-colors ${isTask ? "border-l-4 border-l-violet-400 bg-zinc-100" : ""} ${
                      act.status === "COMPLETED" ? "opacity-60 bg-slate-50/40" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-lg border ${isTask ? "border-zinc-200 bg-zinc-100 text-zinc-800" : `${conf.bg} ${conf.color}`} shrink-0 mt-0.5`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-semibold ${
                              act.status === "COMPLETED"
                                ? "line-through text-slate-500"
                                : "text-slate-900"
                            }`}
                          >
                            {act.title}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${conf.bg} ${conf.color}`}
                          >
                            {isTask ? "Tarefa avulsa" : conf.label}
                          </span>
                          {isOverdue && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Atrasada
                            </span>
                          )}
                          {act.status === "COMPLETED" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                              Concluída
                            </span>
                          )}
                          {act.status === "NO_SHOW" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <UserX className="h-3 w-3" /> No-Show (Faltou)
                            </span>
                          )}
                          {act.status === "RESCHEDULED" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200 flex items-center gap-1">
                              <CalendarClock className="h-3 w-3" /> Reagendada ({act.rescheduleCount || 1}x)
                            </span>
                          )}
                          {act.status === "CANCELED" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              Cancelada
                            </span>
                          )}
                        </div>

                        {act.outcomeReason && (
                          <div className="text-[11px] text-amber-800 bg-amber-50/70 border border-amber-200/60 rounded-md px-2 py-1 mt-1 inline-block">
                            <span className="font-semibold">Motivo: </span>{act.outcomeReason}
                          </div>
                        )}

                        {act.description && (
                          <p className="text-xs text-slate-500 max-w-2xl">{act.description}</p>
                        )}

                        {isTask && <p className="text-[11px] font-medium text-zinc-800">Tarefa interna sem vínculo comercial</p>}
                        {/* Vínculo (Lead, Cliente, Oportunidade) */}
                        <div className="flex items-center gap-3 text-xs text-slate-500 pt-1 flex-wrap">
                          {act.leadId && <Link href={`/crm/leads/${act.leadId}`} className="text-blue-600 hover:underline">Lead</Link>}
                          {act.clientId && <Link href={`/clients/${act.clientId}`} className="text-emerald-600 hover:underline">Cliente</Link>}
                          {act.targetName && (
                            <span className="flex items-center gap-1 text-slate-700 font-medium">
                              <User className="h-3 w-3 text-slate-400" />
                              {act.targetName}
                            </span>
                          )}

                          {act.opportunityTitle && act.opportunityId && (
                            <Link
                              href={`/crm/opportunities/${act.opportunityId}`}
                              className="flex items-center gap-1 text-emerald-600 hover:underline font-medium"
                            >
                              <TrendingUp className="h-3 w-3" />
                              {act.opportunityTitle}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center shrink-0">
                      {act.dueDate && (
                        <div className="text-right text-xs">
                          <span className="text-slate-400 block text-[11px]">Prazo</span>
                          <span
                            className={`font-medium block ${
                              isOverdue ? "text-rose-600 font-bold" : "text-slate-700"
                            }`}
                          >
                            {new Date(act.dueDate).toLocaleDateString("pt-BR", {
                              timeZone: "America/Sao_Paulo",
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                          {act.dueDate.includes("T") && !act.dueDate.includes("12:00:00") && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(act.dueDate).toLocaleTimeString("pt-BR", {
                                timeZone: "America/Sao_Paulo",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(act.status === "PENDING" || act.status === "RESCHEDULED") && (
                          <>
                            <button
                              onClick={() => handleComplete(act.id)}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition flex items-center gap-1"
                              title="Marcar como realizada"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              Concluir
                            </button>

                            {!isTask && (
                            <button
                              onClick={() => setNoShowTarget(act)}
                              className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition flex items-center gap-1"
                              title="Registrar falta / No-show"
                            >
                              <UserX className="h-3.5 w-3.5 text-amber-600" />
                              No-Show
                            </button>
                            )}

                            <button
                              onClick={() => {
                                setRescheduleTarget(act);
                                setRescheduleDate(act.dueDate ? act.dueDate.slice(0, 16) : "");
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition flex items-center gap-1"
                              title="Adiar / Reagendar com novo horário"
                            >
                              <CalendarClock className="h-3.5 w-3.5 text-zinc-800" />
                              Adiar
                            </button>
                          </>
                        )}

                        <EditRecordAction url={"/api/crm/activities/"+act.id} label={isTask ? "tarefa" : "atividade"} data={{title:act.title,description:act.description,dueDate:act.dueDate}} fields={[{key:"title",label:"Título",required:true},{key:"description",label:"Descrição",type:"textarea"},{key:"dueDate",label:"Data e horário",type:"datetime-local"}]} onSaved={loadActivities}/><ArchiveRecordAction url={"/api/crm/activities/"+act.id} archived={showArchived} onChanged={loadActivities}/>
                        <button
                          onClick={() => handleDeleteActivity(act.id, isTask)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Excluir atividade"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!loadError && hasMore && !loading && <button type="button" onClick={() => fetchActivities(true)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Carregar mais itens</button>}
        {/* Modal de Criação de Atividade */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
              <h2 className="text-lg font-bold text-slate-900">{creatingTask ? "Criar tarefa" : "Nova Atividade Comercial"}</h2>
              <p className="text-xs text-slate-500 mt-1">
                {creatingTask ? "Crie uma tarefa interna, sem precisar vincular a um lead, cliente ou oportunidade." : "Agende lembretes, telefonemas, follow-ups ou reuniões vinculadas a um cliente, lead ou negociação."}
              </p>

              {formError && (
                <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateActivity} className="mt-4 space-y-3.5">
                {/* Vínculo Obrigatório */}
                {!creatingTask && <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vincular a <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTargetType("CLIENT");
                        setSelectedTargetId("");
                        setFormError("");
                      }}
                      className={`py-1 rounded text-center transition ${
                        targetType === "CLIENT"
                          ? "bg-white text-slate-950 shadow-xs font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Cliente
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetType("LEAD");
                        setSelectedTargetId("");
                        setFormError("");
                      }}
                      className={`py-1 rounded text-center transition ${
                        targetType === "LEAD"
                          ? "bg-white text-slate-950 shadow-xs font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Lead
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetType("OPPORTUNITY");
                        setSelectedTargetId("");
                        setFormError("");
                      }}
                      className={`py-1 rounded text-center transition ${
                        targetType === "OPPORTUNITY"
                          ? "bg-white text-slate-950 shadow-xs font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Oportunidade
                    </button>
                  </div>

                  {targetType === "CLIENT" && (
                    <select
                      value={selectedTargetId}
                      onChange={(e) => {
                        setSelectedTargetId(e.target.value);
                        setFormError("");
                      }}
                      className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    >
                      <option value="">Selecione o Cliente (ex: Parishi Beachwear)...</option>
                      {clientsList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.document ? `(${c.document})` : ""}
                        </option>
                      ))}
                    </select>
                  )}

                  {targetType === "LEAD" && (
                    <select
                      value={selectedTargetId}
                      onChange={(e) => {
                        setSelectedTargetId(e.target.value);
                        setFormError("");
                      }}
                      className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    >
                      <option value="">Selecione o Lead...</option>
                      {leadsList.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} {l.companyName ? `(${l.companyName})` : ""}
                        </option>
                      ))}
                    </select>
                  )}

                  {targetType === "OPPORTUNITY" && (
                    <select
                      value={selectedTargetId}
                      onChange={(e) => {
                        setSelectedTargetId(e.target.value);
                        setFormError("");
                      }}
                      className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    >
                      <option value="">Selecione a Oportunidade...</option>
                      {oppsList.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>}

                {!creatingTask && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Atividade
                  </label>
                  <select
                    value={actType}
                    onChange={(e) => setActType(e.target.value as ActivityType)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800"
                  >
                    <option value="CALL">Ligação Telefônica</option>
                    <option value="MEETING">Reunião / Apresentação</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="FOLLOW_UP">Follow-up Comercial</option>
                    <option value="NOTE">Anotação Interna</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assunto / Título <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={creatingTask ? "Ex: Organizar documentos da empresa" : "Ex: Ligar para verificar recebimento da proposta comercial"}
                    value={actTitle}
                    onChange={(e) => {
                      setActTitle(e.target.value);
                      setFormError("");
                    }}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Data e Horário Previsto
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Intervalos de 15 min</span>
                  </div>
                  <input
                    type="datetime-local"
                    step="900"
                    value={actDueDate}
                    onChange={(e) => setActDueDate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-medium">Horários:</span>
                    {["09:00", "09:30", "10:00", "11:15", "14:00", "14:30", "15:00", "16:15", "17:00"].map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => {
                          const base = actDueDate ? actDueDate.split("T")[0] : new Date().toISOString().split("T")[0];
                          setActDueDate(`${base}T${time}`);
                        }}
                        className="text-[10px] font-mono font-medium px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pauta / Detalhes adicionais
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Comentários, objetivos da ligação ou links..."
                    value={actDescription}
                    onChange={(e) => setActDescription(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setFormError("");
                    }}
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                  {submitting ? "Salvando..." : creatingTask ? "Criar tarefa" : "Salvar Atividade"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modal de Confirmação de No-Show */}
        {noShowTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <UserX className="h-5 w-5" />
                <h3 className="text-base font-bold text-slate-900">Registrar No-Show (Falta do Cliente)</h3>
              </div>
              <p className="text-xs text-slate-600 mb-4">
                Confirma que o cliente não compareceu ao compromisso &quot;<strong>{noShowTarget.title}</strong>&quot;?
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Motivo ou Observação da Ausência
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Não atendeu à ligação, esqueceu o horário, remarcou para próxima semana..."
                    value={noShowReason}
                    onChange={(e) => setNoShowReason(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setNoShowTarget(null);
                      setNoShowReason("");
                    }}
                    disabled={savingNoShow}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleNoShowConfirm}
                    disabled={savingNoShow}
                    className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {savingNoShow ? "Registrando..." : "Confirmar No-Show"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Reagendamento / Adiamento */}
        {rescheduleTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-2 text-zinc-800 mb-2">
                <CalendarClock className="h-5 w-5" />
                <h3 className="text-base font-bold text-slate-900">Adiar / Reagendar Atividade</h3>
              </div>
              <p className="text-xs text-slate-600 mb-4">
                Selecione o novo prazo e horário para &quot;<strong>{rescheduleTarget.title}</strong>&quot;.
              </p>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Nova Data e Horário
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Passos de 15 min</span>
                  </div>
                  <input
                    type="datetime-local"
                    step="900"
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-zinc-300 focus:outline-none"
                  />
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-medium">Horários:</span>
                    {["09:00", "09:30", "10:00", "11:15", "14:00", "14:30", "15:00", "16:15"].map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => {
                          const base = rescheduleDate ? rescheduleDate.split("T")[0] : new Date().toISOString().split("T")[0];
                          setRescheduleDate(`${base}T${time}`);
                        }}
                        className="text-[10px] font-mono font-medium px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Motivo do Adiamento / Reagendamento
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Cliente pediu para ligar na quinta-feira à tarde..."
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-zinc-300 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setRescheduleTarget(null);
                      setRescheduleDate("");
                      setRescheduleReason("");
                    }}
                    disabled={rescheduling}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleRescheduleConfirm}
                    disabled={rescheduling}
                    className="px-4 py-2 text-xs font-bold text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {rescheduling ? "Salvando..." : "Confirmar Reagendamento"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function CommercialActivitiesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Carregando atividades comerciais...</div>}>
      <CommercialActivitiesPageContent />
    </Suspense>
  );
}
