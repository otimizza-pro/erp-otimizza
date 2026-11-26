"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Archive,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  History,
  ListTodo,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type {
  ProductionTaskMetrics,
  ProductionTaskRecord,
  ProductionTaskStatus,
  ProductionTaskType,
} from "@/modules/production-tasks/types";
import {
  PRODUCTION_TASK_STATUS_LABELS,
  PRODUCTION_TASK_TYPE_LABELS,
} from "@/modules/production-tasks/helpers";
import { toast } from "@/components/ui/toast-provider";
import { confirmAction } from "@/components/ui/confirm-dialog";

const TASK_TYPES: ProductionTaskType[] = [
  "FILMING",
  "REPORT_DELIVERY",
  "CONTENT_REVIEW",
  "CLIENT_MEETING",
  "SHOOTING_PREP",
  "DELIVERY",
  "OTHER",
];

function formatDateBr(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

export default function ProductionTasksPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");

  const [items, setItems] = useState<ProductionTaskRecord[]>([]);
  const [metrics, setMetrics] = useState<ProductionTaskMetrics>({
    pending: 0,
    overdue: 0,
    today: 0,
    rescheduled: 0,
    completed: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // Create / Edit modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductionTaskRecord | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<ProductionTaskType>("FILMING");
  const [formDueDate, setFormDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formSaving, setFormSaving] = useState(false);

  // Reschedule modal state
  const [rescheduleItem, setRescheduleItem] = useState<ProductionTaskRecord | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleSaving, setRescheduleSaving] = useState(false);

  const highlightScrolledRef = useRef<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ACTIVE" && statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }
      if (typeFilter !== "ALL") {
        params.set("taskType", typeFilter);
      }
      if (search.trim()) {
        params.set("search", search.trim());
      }
      if (showArchived) {
        params.set("archived", "true");
      }
      if (highlightId) {
        params.set("highlightId", highlightId);
      }

      const res = await fetch(`/api/production-tasks?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Falha ao carregar tarefas de produção.");
      }
      setItems(json.items || []);
      if (json.metrics) setMetrics(json.metrics);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar tarefas.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search, showArchived, highlightId]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!highlightId || loading || highlightScrolledRef.current === highlightId) return;
    const el = document.getElementById(`production-task-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      highlightScrolledRef.current = highlightId;
    }
  }, [highlightId, loading, items]);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const displayedItems = useMemo(() => {
    if (statusFilter === "ACTIVE") {
      return items.filter((i) => i.status === "PENDING" || i.status === "RESCHEDULED");
    }
    if (statusFilter === "OVERDUE") {
      return items.filter(
        (i) =>
          (i.status === "PENDING" || i.status === "RESCHEDULED") &&
          Boolean(i.dueDate && i.dueDate < todayIso)
      );
    }
    if (statusFilter === "TODAY") {
      return items.filter(
        (i) =>
          (i.status === "PENDING" || i.status === "RESCHEDULED") &&
          i.dueDate === todayIso
      );
    }
    return items;
  }, [items, statusFilter, todayIso]);

  function openCreateModal() {
    setEditingItem(null);
    setFormTitle("");
    setFormDescription("");
    setFormType("FILMING");
    setFormDueDate(todayIso);
    setFormOpen(true);
  }

  function openEditModal(item: ProductionTaskRecord) {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormDescription(item.description || "");
    setFormType(item.taskType);
    setFormDueDate(item.dueDate || todayIso);
    setFormOpen(true);
  }

  async function handleSaveForm(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Informe o título da tarefa.");
      return;
    }
    setFormSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        taskType: formType,
        dueDate: formDueDate,
      };
      const url = editingItem
        ? `/api/production-tasks/${editingItem.id}`
        : "/api/production-tasks";
      const method = editingItem ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Erro ao salvar tarefa.");
      }
      toast.success(editingItem ? "Tarefa atualizada." : "Tarefa de produção criada.");
      setFormOpen(false);
      await fetchTasks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar tarefa.");
    } finally {
      setFormSaving(false);
    }
  }

  async function handleComplete(item: ProductionTaskRecord) {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/production-tasks/${item.id}/complete`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Erro ao concluir tarefa.");
      }
      toast.success(
        item.checklistItemId
          ? "Tarefa concluída e checklist do projeto atualizado!"
          : "Tarefa concluída!"
      );
      await fetchTasks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao concluir tarefa.");
    } finally {
      setBusyId(null);
    }
  }

  function openRescheduleModal(item: ProductionTaskRecord) {
    setRescheduleItem(item);
    setRescheduleDate(item.dueDate || todayIso);
    setRescheduleReason("");
  }

  async function handleReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!rescheduleItem) return;
    if (!rescheduleReason.trim() || rescheduleReason.trim().length < 3) {
      toast.error("Informe o motivo do reagendamento (mínimo 3 caracteres).");
      return;
    }
    setRescheduleSaving(true);
    try {
      const res = await fetch(`/api/production-tasks/${rescheduleItem.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newDueDate: rescheduleDate,
          reason: rescheduleReason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Erro ao reagendar tarefa.");
      }
      toast.success("Tarefa reagendada com sucesso.");
      setRescheduleItem(null);
      await fetchTasks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reagendar.");
    } finally {
      setRescheduleSaving(false);
    }
  }

  async function handleArchiveToggle(item: ProductionTaskRecord) {
    const nextArchived = !item.archivedAt;
    const confirmed = await confirmAction({
      title: nextArchived ? "Arquivar tarefa?" : "Restaurar tarefa?",
      message: nextArchived
        ? `Deseja arquivar "${item.title}"?`
        : `Deseja restaurar "${item.title}" para a lista ativa?`,
      confirmLabel: nextArchived ? "Arquivar" : "Restaurar",
    });
    if (!confirmed) return;

    setBusyId(item.id);
    try {
      const res = await fetch(`/api/production-tasks/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: nextArchived }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Erro ao atualizar arquivo.");
      }
      toast.success(nextArchived ? "Tarefa arquivada." : "Tarefa restaurada.");
      await fetchTasks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao arquivar.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: ProductionTaskRecord) {
    const confirmed = await confirmAction({
      title: "Excluir tarefa de produção?",
      message: `Esta ação removerá permanentemente "${item.title}".`,
      confirmLabel: "Excluir",
    });
    if (!confirmed) return;

    setBusyId(item.id);
    try {
      const res = await fetch(`/api/production-tasks/${item.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Erro ao excluir tarefa.");
      }
      toast.success("Tarefa excluída.");
      await fetchTasks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <ListTodo className="w-6 h-6 text-emerald-600" />
            Tarefas de Produção
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Agenda operacional de gravações, edições, reuniões e checklists vinculados aos projetos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchTasks()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Tarefa de Produção
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter("PENDING")}
          className={`text-left p-4 rounded-2xl border transition ${
            statusFilter === "PENDING"
              ? "border-zinc-900 bg-zinc-50"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <span className="text-xs font-medium text-slate-500">Pendentes</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.pending}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("OVERDUE")}
          className={`text-left p-4 rounded-2xl border transition ${
            statusFilter === "OVERDUE"
              ? "border-rose-500 bg-rose-50/60"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <span className="text-xs font-medium text-rose-600">Atrasadas</span>
          <p className="text-2xl font-bold text-rose-600 mt-1">{metrics.overdue}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("TODAY")}
          className={`text-left p-4 rounded-2xl border transition ${
            statusFilter === "TODAY"
              ? "border-amber-500 bg-amber-50/60"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <span className="text-xs font-medium text-amber-700">Hoje</span>
          <p className="text-2xl font-bold text-amber-700 mt-1">{metrics.today}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("RESCHEDULED")}
          className={`text-left p-4 rounded-2xl border transition ${
            statusFilter === "RESCHEDULED"
              ? "border-indigo-500 bg-indigo-50/60"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <span className="text-xs font-medium text-indigo-600">Reagendadas</span>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{metrics.rescheduled}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("COMPLETED")}
          className={`text-left p-4 rounded-2xl border transition ${
            statusFilter === "COMPLETED"
              ? "border-emerald-500 bg-emerald-50/60"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <span className="text-xs font-medium text-emerald-700">Concluídas</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{metrics.completed}</p>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, cliente ou projeto..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-zinc-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700"
          >
            <option value="ACTIVE">Ativas (Pendentes + Reagendadas)</option>
            <option value="ALL">Todas</option>
            <option value="PENDING">Pendentes</option>
            <option value="RESCHEDULED">Reagendadas</option>
            <option value="OVERDUE">Atrasadas</option>
            <option value="TODAY">Para Hoje</option>
            <option value="COMPLETED">Concluídas</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700"
          >
            <option value="ALL">Todos os tipos</option>
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {PRODUCTION_TASK_TYPE_LABELS[t]}
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none px-2">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-slate-300"
            />
            Arquivadas
          </label>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">
            Carregando tarefas de produção...
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2">
            <ListTodo className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-medium text-slate-700">
              Nenhuma tarefa de produção encontrada.
            </p>
            <p className="text-xs text-slate-400">
              Crie uma nova tarefa acima ou vincule um item de checklist dentro de um projeto.
            </p>
          </div>
        ) : (
          displayedItems.map((item) => {
            const isHighlighted = highlightId === item.id;
            const isOverdue =
              (item.status === "PENDING" || item.status === "RESCHEDULED") &&
              Boolean(item.dueDate && item.dueDate < todayIso);
            const isToday =
              (item.status === "PENDING" || item.status === "RESCHEDULED") &&
              item.dueDate === todayIso;
            const isBusy = busyId === item.id;

            return (
              <div
                key={item.id}
                id={`production-task-${item.id}`}
                className={`bg-white border rounded-2xl p-4 transition ${
                  isHighlighted
                    ? "border-emerald-500 ring-2 ring-emerald-200 shadow-md"
                    : isOverdue
                    ? "border-rose-200 bg-rose-50/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {PRODUCTION_TASK_TYPE_LABELS[item.taskType]}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          item.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.status === "RESCHEDULED"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {PRODUCTION_TASK_STATUS_LABELS[item.status as ProductionTaskStatus]}
                      </span>

                      {isOverdue && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-100 text-rose-700">
                          Atrasada
                        </span>
                      )}
                      {isToday && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-800">
                          Hoje
                        </span>
                      )}
                      {item.checklistItemId && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Vinculada a Checklist
                        </span>
                      )}
                    </div>

                    <h3
                      className={`text-sm font-semibold text-slate-900 ${
                        item.status === "COMPLETED" ? "line-through text-slate-400" : ""
                      }`}
                    >
                      {item.title}
                    </h3>

                    {item.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDateBr(item.dueDate)}
                      </span>

                      {item.clientName && (
                        <span className="font-medium text-slate-700">
                          Cliente: {item.clientName}
                        </span>
                      )}

                      {item.projectName && item.projectId && (
                        <Link
                          href={`/projects/${item.projectId}`}
                          className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-medium"
                        >
                          Projeto: {item.projectName}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}

                      {item.rescheduleHistory.length > 0 && (
                        <span
                          className="inline-flex items-center gap-1 text-indigo-600"
                          title={item.rescheduleHistory
                            .map(
                              (h) =>
                                `${formatDateBr(h.from)} → ${formatDateBr(h.to)}: ${h.reason}`
                            )
                            .join("\n")}
                        >
                          <History className="w-3.5 h-3.5" />
                          {item.rescheduleHistory.length} reagendamento(s)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {item.status !== "COMPLETED" && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleComplete(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Concluir
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => openRescheduleModal(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 disabled:opacity-50"
                        >
                          <CalendarClock className="w-3.5 h-3.5" />
                          Reagendar
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => openEditModal(item)}
                      title="Editar"
                      className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleArchiveToggle(item)}
                      title={item.archivedAt ? "Restaurar" : "Arquivar"}
                      className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleDelete(item)}
                      title="Excluir"
                      className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                {editingItem ? "Editar Tarefa de Produção" : "Nova Tarefa de Produção"}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveForm} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Gravação de Reels com Dra. Ramiele"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as ProductionTaskType)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                  >
                    {TASK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {PRODUCTION_TASK_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição / Observações
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Detalhes operacionais, local, equipamentos..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50"
                >
                  {formSaving ? "Salvando..." : editingItem ? "Salvar" : "Criar Tarefa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleItem && (
        <div className="fixed inset-0 z-50 bg-zinc-950/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-indigo-600" />
                Reagendar Tarefa
              </h2>
              <button
                type="button"
                onClick={() => setRescheduleItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleReschedule} className="p-5 space-y-4">
              <p className="text-xs text-slate-600">
                Tarefa: <strong className="text-slate-900">{rescheduleItem.title}</strong>
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nova Data *
                </label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo do Reagendamento *
                </label>
                <textarea
                  rows={3}
                  required
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Ex: Cliente solicitou mudança de horário para sexta-feira."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={rescheduleSaving}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {rescheduleSaving ? "Reagendando..." : "Confirmar Reagendamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
