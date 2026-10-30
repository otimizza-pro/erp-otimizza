"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
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
} from "lucide-react";
import { ActivityRecord, ActivityStatus, ActivityType } from "@/modules/crm/types";

export default function CommercialActivitiesPage() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal nova atividade
  const [showModal, setShowModal] = useState(false);
  const [actType, setActType] = useState<ActivityType>("CALL");
  const [actTitle, setActTitle] = useState("");
  const [actDueDate, setActDueDate] = useState("");
  const [actDescription, setActDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadActivities() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter === "PENDING" || statusFilter === "COMPLETED" || statusFilter === "CANCELED") {
        params.set("status", statusFilter);
      }
      if (typeFilter !== "ALL") {
        params.set("activityType", typeFilter);
      }

      const res = await fetch(`/api/crm/activities?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (e) {
      console.error("Erro ao carregar atividades:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivities();
  }, [statusFilter, typeFilter]);

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

  async function handleCreateActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!actTitle.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: actType,
          title: actTitle.trim(),
          description: actDescription.trim() || undefined,
          dueDate: actDueDate || undefined,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setActTitle("");
        setActDescription("");
        setActDueDate("");
        loadActivities();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao criar atividade");
      }
    } catch (e) {
      console.error(e);
      alert("Falha de conexão.");
    } finally {
      setSubmitting(false);
    }
  }

  const activityTypeConfig: Record<ActivityType, { label: string; icon: any; color: string; bg: string }> = {
    CALL: { label: "Ligação", icon: Phone, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
    MEETING: { label: "Reunião", icon: Video, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
    WHATSAPP: { label: "WhatsApp", icon: MessageSquare, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
    EMAIL: { label: "E-mail", icon: Mail, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
    FOLLOW_UP: { label: "Follow-up", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
    NOTE: { label: "Nota Interna", icon: ListTodo, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
    OTHER: { label: "Outro", icon: Clock, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
  };

  // Filtragem em memória por search e por atrasadas
  const filteredActivities = activities.filter((act) => {
    if (statusFilter === "OVERDUE") {
      if (!act.isOverdue || act.status !== "PENDING") return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTitle = act.title.toLowerCase().includes(term);
      const matchDesc = act.description?.toLowerCase().includes(term);
      const matchTarget = act.targetName?.toLowerCase().includes(term);
      if (!matchTitle && !matchDesc && !matchTarget) return false;
    }
    return true;
  });

  // Métricas rápidas
  const totalPending = activities.filter((a) => a.status === "PENDING").length;
  const totalOverdue = activities.filter((a) => a.status === "PENDING" && a.isOverdue).length;
  const totalCompleted = activities.filter((a) => a.status === "COMPLETED").length;

  return (
    <AppShell>
      <div className="space-y-6">
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
              Acompanhe follow-ups de leads, reuniões, envio de propostas e prazos de negociações.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Nova Atividade
            </button>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pendentes
              </span>
              <div className="mt-1 text-2xl font-bold text-slate-900">{totalPending}</div>
            </div>
            <Clock className="h-8 w-8 text-blue-500/20" />
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                Atrasadas (Follow-up Urgente)
              </span>
              <div className="mt-1 text-2xl font-bold text-rose-600">{totalOverdue}</div>
            </div>
            <AlertTriangle className="h-8 w-8 text-rose-500/20" />
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                Concluídas
              </span>
              <div className="mt-1 text-2xl font-bold text-emerald-700">{totalCompleted}</div>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-500/20" />
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
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
                  className="border border-slate-300 rounded-lg text-sm px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Todas</option>
                  <option value="PENDING">Pendentes</option>
                  <option value="OVERDUE">Apenas Atrasadas</option>
                  <option value="COMPLETED">Concluídas</option>
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
              <p className="text-sm">Carregando atividades...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="h-10 w-10 text-slate-300" />
              <p className="text-base font-semibold text-slate-700">Tudo em dia!</p>
              <p className="text-sm text-slate-400">Nenhuma atividade encontrada para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredActivities.map((act) => {
                const conf = activityTypeConfig[act.activityType] || activityTypeConfig.OTHER;
                const Icon = conf.icon;
                const isOverdue = act.isOverdue && act.status === "PENDING";

                return (
                  <div
                    key={act.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/80 transition-colors ${
                      act.status === "COMPLETED" ? "opacity-60 bg-slate-50/40" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-lg border ${conf.bg} ${conf.color} shrink-0 mt-0.5`}>
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
                            {conf.label}
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
                        </div>

                        {act.description && (
                          <p className="text-xs text-slate-500 max-w-2xl">{act.description}</p>
                        )}

                        {/* Vínculo (Lead, Cliente, Oportunidade) */}
                        <div className="flex items-center gap-3 text-xs text-slate-500 pt-1 flex-wrap">
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
                            className={`font-medium ${
                              isOverdue ? "text-rose-600 font-bold" : "text-slate-700"
                            }`}
                          >
                            {new Date(act.dueDate).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      )}

                      {act.status === "PENDING" && (
                        <button
                          onClick={() => handleComplete(act.id)}
                          className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Concluir
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal de Criação de Atividade */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
              <h2 className="text-lg font-bold text-slate-900">Nova Atividade Comercial</h2>
              <p className="text-xs text-slate-500 mt-1">
                Agende lembretes, telefonemas, follow-ups ou envio de propostas.
              </p>

              <form onSubmit={handleCreateActivity} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Atividade
                  </label>
                  <select
                    value={actType}
                    onChange={(e) => setActType(e.target.value as any)}
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assunto / Título <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ligar para verificar recebimento da proposta comercial"
                    value={actTitle}
                    onChange={(e) => setActTitle(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data Limite (Prazo)
                  </label>
                  <input
                    type="date"
                    value={actDueDate}
                    onChange={(e) => setActDueDate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
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
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                  >
                    {submitting ? "Salvando..." : "Salvar Atividade"}
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
