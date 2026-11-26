"use client";

import { isEditorialTemplate, isOnboardingTemplate } from "@/modules/projects/editorial-template";
import { ProjectSocialMediaPlan } from "@/components/projects/social-media-plan";

import React, { useState, useEffect, useCallback, use } from "react";

import Link from "next/link";
import {EditRecordAction} from "@/components/ui/edit-record-action";
import {ArchiveRecordAction} from "@/components/ui/archive-record-action";
import { toast } from "@/components/ui/toast-provider";
import { confirmAction } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  Plus,
  Layers,
  FileText,
  User,
  CheckSquare,
  Square,
  Trash2,
  Edit2,
  RefreshCw,
  TrendingUp,
  X,
  Sparkles,
  Pause,
  Play,
  Check,
} from "lucide-react";
import {
  ProjectRecord,
  ProjectTaskRecord,
  ProjectStageRecord,
  ProjectTimeEntryRecord,
  TaskStatus,
  ProjectPriority,
  ProjectStatus,
} from "@/modules/projects/types";
import { DocumentAttachmentSection } from "@/components/documents/document-attachment-section";
import { TaskExecutionModal } from "@/components/projects/task-execution-modal";
import {
  ActiveTimerRecord,
  TaskCardTimer,
  ProjectActiveTimerHeaderPill,
  ProjectTimesTabWidget,
  StartTimerModal,
  StopTimerModal,
} from "@/components/projects/project-timer-widget";

function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const raw = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const parts = raw.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  } catch {
    return dateStr;
  }
}

export default function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [timeEntries, setTimeEntries] = useState<ProjectTimeEntryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"TASKS" | "TIMES" | "DOCS" | "DETAILS">("TASKS");

  // Modais
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<ProjectTaskRecord | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [taskTitle, setTaskTitle] = useState<string>("");
  const [taskDesc, setTaskDesc] = useState<string>("");
  const [taskStageId, setTaskStageId] = useState<string>("");
  const [taskPriority, setTaskPriority] = useState<ProjectPriority>("MEDIUM");
  const [taskDueDate, setTaskDueDate] = useState<string>("");
  const [taskEstimatedHours, setTaskEstimatedHours] = useState<number>(2);

  const [isTimeModalOpen, setIsTimeModalOpen] = useState<boolean>(false);
  const [timeTaskId, setTimeTaskId] = useState<string>("");
  const [timeDate, setTimeDate] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [timeHours, setTimeHours] = useState<number>(1);
  const [timeDesc, setTimeDesc] = useState<string>("");
  const [timeRate, setTimeRate] = useState<number>(0);

  const [newChecklistText, setNewChecklistText] = useState<Record<string, string>>({});

  // Estados do Cronômetro / Apontamento de Horas em Tempo Real
  const [activeTimers, setActiveTimers] = useState<ActiveTimerRecord[]>([]);
  const [timerFeedback, setTimerFeedback] = useState<string | null>(null);
  const [isStartTimerModalOpen, setIsStartTimerModalOpen] = useState<boolean>(false);
  const [stoppingTimer, setStoppingTimer] = useState<ActiveTimerRecord | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; linkedPostsCount: number | null; deleting: boolean; error: string }>({
    open: false,
    linkedPostsCount: null,
    deleting: false,
    error: "",
  });

  const loadActiveTimers = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}/timers`);
      const json = await res.json();
      if (json.success && Array.isArray(json.timers)) {
        setActiveTimers(json.timers);
      }
    } catch (err) {
      console.error("Erro ao carregar timers ativos:", err);
    }
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimers((prev) =>
        prev.map((t) => (t.isRunning ? { ...t, currentSeconds: t.currentSeconds + 1 } : t))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Erro ao carregar projeto");
      setProject(json.data);
      setSelectedTaskForModal((prev) => {
        if (!prev) return null;
        const stages = Array.isArray(json.data?.stages) ? json.data.stages : [];
        for (const stg of stages) {
          const updatedTask = (stg.tasks || []).find((t: ProjectTaskRecord) => t.id === prev.id);
          if (updatedTask) return updatedTask;
        }
        return prev;
      });

      const timeRes = await fetch(`/api/projects/${id}/time-entries`);
      const timeJson = await timeRes.json();
      if (timeJson.success) setTimeEntries(timeJson.data);

      await loadActiveTimers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar projeto.");
    } finally {
      setLoading(false);
    }
  }, [id, loadActiveTimers]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleUpdateProjectStatus = async (newStatus: ProjectStatus) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || "Erro ao atualizar status do projeto.");
        return;
      }
      await loadProject();
      toast.success("Status do projeto atualizado.");
    } catch (err) {
      console.error("Erro ao atualizar status do projeto:", err);
      toast.error("Erro de conexão ao atualizar status do projeto.");
    }
  };

  const handleDeleteProject = () => {
    setDeleteDialog({ open: true, linkedPostsCount: null, deleting: false, error: "" });
  };

  const executeDeleteProject = async (mode: "DELETE" | "FORCE_DELETE" | "ARCHIVE") => {
    setDeleteDialog((prev) => ({ ...prev, deleting: true, error: "" }));
    try {
      const url =
        mode === "ARCHIVE"
          ? `/api/projects/${id}?archive=true`
          : mode === "FORCE_DELETE"
          ? `/api/projects/${id}?force=true`
          : `/api/projects/${id}`;
      const res = await fetch(url, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setDeleteDialog({ open: false, linkedPostsCount: null, deleting: false, error: "" });
        if (mode === "ARCHIVE") {
          await loadProject();
        } else {
          router.push("/projects");
        }
        return;
      }
      if (json.code === "HAS_LINKED_POSTS") {
        setDeleteDialog({
          open: true,
          linkedPostsCount: typeof json.linkedPostsCount === "number" ? json.linkedPostsCount : 1,
          deleting: false,
          error: "",
        });
        return;
      }
      setDeleteDialog((prev) => ({
        ...prev,
        deleting: false,
        error: json.error || "Erro ao excluir projeto.",
      }));
    } catch (err) {
      console.error("Erro ao excluir projeto:", err);
      setDeleteDialog((prev) => ({ ...prev, deleting: false, error: "Erro ao excluir projeto." }));
    }
  };

  // Funções do Cronômetro de Horas
  const handleStartTimer = async (taskId?: string, desc?: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/timers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "START",
          taskId: taskId || undefined,
          description: desc || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Erro ao iniciar cronômetro");
      await loadActiveTimers();
      setTimerFeedback("Cronômetro iniciado.");
      setTimeout(() => setTimerFeedback(null), 3000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar cronômetro.");
      throw err;
    }
  };

  const handlePauseTimer = async (timerId: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/timers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PAUSE", timerId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Erro ao pausar cronômetro");
      await loadActiveTimers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao pausar cronômetro.");
    }
  };

  const handleResumeTimer = async (timerId: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/timers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESUME", timerId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Erro ao retomar cronômetro");
      await loadActiveTimers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao retomar cronômetro.");
    }
  };

  const handleConfirmStopTimer = async (timer: ActiveTimerRecord, finalDescription: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/timers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "STOP",
          timerId: timer.id,
          description: finalDescription.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Erro ao finalizar cronômetro");
      setStoppingTimer(null);
      await loadActiveTimers();
      await loadProject();
      setTimerFeedback(json.message || "Apontamento registrado com sucesso.");
      setTimeout(() => setTimerFeedback(null), 4000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao finalizar cronômetro.");
      throw err;
    }
  };

  const handleDiscardTimer = async (timerId: string) => {
    const confirmed = await confirmAction({
      title: "Descartar cronômetro",
      message: "Tem certeza que deseja descartar este cronômetro? O tempo percorrido não será salvo.",
      confirmLabel: "Descartar",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/projects/${id}/timers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DISCARD", timerId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Erro ao descartar cronômetro");
      if (stoppingTimer?.id === timerId) setStoppingTimer(null);
      await loadActiveTimers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao descartar cronômetro.");
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await fetch(`/api/projects/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) loadProject();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/projects/${id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc || null,
          stageId: taskStageId || null,
          priority: taskPriority,
          dueDate: taskDueDate || null,
          estimatedHours: Number(taskEstimatedHours) || 1,
        }),
      });
      if (res.ok) {
        setIsTaskModalOpen(false);
        setTaskTitle("");
        setTaskDesc("");
        loadProject();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTimeEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/projects/${id}/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: timeTaskId || null,
          entryDate: timeDate,
          hours: Number(timeHours),
          description: timeDesc,
          hourlyRate: Number(timeRate) || 0,
        }),
      });
      if (res.ok) {
        setIsTimeModalOpen(false);
        setTimeDesc("");
        setTimeHours(1);
        loadProject();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddChecklist = async (taskId: string) => {
    const text = newChecklistText[taskId]?.trim();
    if (!text) return;

    try {
      const res = await fetch(`/api/projects/tasks/${taskId}/checklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: text }),
      });
      if (res.ok) {
        setNewChecklistText((prev) => ({ ...prev, [taskId]: "" }));
        loadProject();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleChecklist = async (checklistId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/projects/checklists/${checklistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !currentStatus }),
      });
      if (res.ok) loadProject();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!(await confirmAction({ title: "Excluir tarefa", message: "Excluir esta tarefa permanentemente?", confirmLabel: "Excluir", tone: "danger" }))) return;
    try {
      const res = await fetch(`/api/projects/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Tarefa excluída.");
        loadProject();
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || "Erro ao excluir tarefa.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir tarefa.");
    }
  };

  const formatCurrency = (val: number | undefined) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);
  };

  if (loading && !project) {
    return (
      <>
        <div className="p-12 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-800" />
          Carregando projeto...
        </div>
      </>
    );
  }

  if (error || !project) {
    return (
      <>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error || "Projeto não encontrado."}</span>
          </div>
        </div>
      </>
    );
  }

  const allTasks = project.tasks || [];
  const completedTasks = allTasks.filter((t) => t.status === "DONE").length;
  const taskProgressPct = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Breadcrumb & Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="font-mono text-zinc-800 font-bold">{project.projectNumber}</span>
                <span>•</span>
                <span>{project.clientName || "Projeto Interno"}</span>
                {project.competency && (
                  <>
                    <span>•</span>
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                      {project.competency}
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-0.5">{project.name}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {project.status === "PAUSED" ? (
              <button
                type="button"
                onClick={() => handleUpdateProjectStatus("IN_PROGRESS")}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 shadow-2xs transition-colors"
                title="Retomar execução do projeto"
              >
                <Play className="w-3.5 h-3.5 text-emerald-700" />
                Retomar Projeto
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleUpdateProjectStatus("PAUSED")}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-amber-200 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 shadow-2xs transition-colors"
                title="Pausar projeto temporariamente"
              >
                <Pause className="w-3.5 h-3.5 text-amber-700" />
                Pausar Projeto
              </button>
            )}

            <ProjectActiveTimerHeaderPill
              activeTimers={activeTimers}
              onPause={handlePauseTimer}
              onResume={handleResumeTimer}
              onOpenStop={setStoppingTimer}
              onOpenStart={() => setIsStartTimerModalOpen(true)}
            />

            <button
              onClick={() => setIsTimeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-2xs transition-colors"
              title="Apontar horas retroativas manualmente"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Lançar Manual
            </button>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-950 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Tarefa
            </button>

            <button
              type="button"
              onClick={handleDeleteProject}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-rose-200 rounded-lg text-xs font-bold text-rose-700 bg-rose-50/70 hover:bg-rose-100 hover:text-rose-800 shadow-2xs transition-colors"
              title="Excluir este projeto"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              Excluir
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2"><EditRecordAction url={"/api/projects/"+project.id} label="projeto" data={{name:project.name,description:project.description,startDate:project.startDate,dueDate:project.dueDate,estimatedHours:project.estimatedHours}} fields={[{key:"name",label:"Nome",required:true},{key:"description",label:"Descrição",type:"textarea"},{key:"startDate",label:"Início",type:"date",required:true},{key:"dueDate",label:"Prazo",type:"date",required:true},{key:"estimatedHours",label:"Horas estimadas",type:"number",required:true}]} onSaved={loadProject}/><ArchiveRecordAction url={"/api/projects/"+project.id} archived={!!project.archivedAt} onChanged={loadProject}/></div>
        {project.clientId && (isEditorialTemplate(project.templateCode, project.templateName) || (project.projectType === "RECURRING" && project.hasEditorialPlan && !isOnboardingTemplate(project.templateCode))) && <ProjectSocialMediaPlan key={project.id} projectId={project.id}
          startDate={project.startDate} archived={Boolean(project.archivedAt)} />}
        {/* Resumo do Projeto (Header Banner) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block mb-1">Status do Projeto:</span>
            <select
              value={project.status}
              onChange={(e) => handleUpdateProjectStatus(e.target.value as ProjectStatus)}
              className={`text-xs font-bold px-2.5 py-1 rounded-lg border focus:outline-none transition ${
                project.status === "IN_PROGRESS"
                  ? "bg-blue-50 text-blue-800 border-blue-200"
                  : project.status === "PAUSED"
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : project.status === "COMPLETED"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : project.status === "CANCELED"
                  ? "bg-rose-50 text-rose-800 border-rose-200"
                  : "bg-slate-50 text-slate-800 border-slate-200"
              }`}
            >
              <option value="PLANNED">Planejado</option>
              <option value="IN_PROGRESS">Em Andamento</option>
              <option value="PAUSED">Pausado</option>
              <option value="COMPLETED">Concluído</option>
              <option value="CANCELED">Cancelado</option>
            </select>
          </div>

          <div>
            <span className="text-slate-500 block">Prazo de Conclusão:</span>
            <span className="font-semibold text-slate-800 text-sm mt-0.5 block flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {formatDateBR(project.dueDate)}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Progresso das Tarefas:</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-zinc-900 h-full rounded-full transition-colors"
                  style={{ width: `${taskProgressPct}%` }}
                />
              </div>
              <span className="font-semibold text-slate-800">{taskProgressPct}%</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {completedTasks} de {allTasks.length} tarefas concluídas
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Horas & Custos Realizados:</span>
            <span className="font-semibold text-slate-900 text-sm mt-0.5 block flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              {project.actualHours || 0}h / {project.estimatedHours || 0}h
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Custo apurado: {formatCurrency(project.actualCost)}
            </span>
          </div>
        </div>

        {/* Navegação por Abas */}
        <div className="border-b border-slate-200 flex items-center gap-4 text-sm font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab("TASKS")}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "TASKS"
                ? "border-zinc-400 text-zinc-800"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            Tarefas & Entregas ({allTasks.length})
          </button>

          <button
            onClick={() => setActiveTab("TIMES")}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "TIMES"
                ? "border-zinc-400 text-zinc-800"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            <Clock className="w-4 h-4" />
            Apontamento de Horas ({timeEntries.length})
          </button>

          <button
            onClick={() => setActiveTab("DOCS")}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "DOCS"
                ? "border-zinc-400 text-zinc-800"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            <FileText className="w-4 h-4" />
            Documentos & Anexos
          </button>

          <button
            onClick={() => setActiveTab("DETAILS")}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "DETAILS"
                ? "border-zinc-400 text-zinc-800"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Detalhes & Escopo
          </button>
        </div>

        {/* Conteúdo das Abas */}

        {/* 1. ABA TAREFAS */}
        {activeTab === "TASKS" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              {(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as TaskStatus[]).map((colStatus) => {
                const colTasks = allTasks.filter((t) => t.status === colStatus);
                const colLabels = {
                  TODO: "A Fazer",
                  IN_PROGRESS: "Em Andamento",
                  IN_REVIEW: "Em Revisão",
                  DONE: "Concluído",
                  CANCELED: "Cancelado",
                };

                return (
                  <div key={colStatus} className="bg-slate-50 border border-slate-200 rounded-xl p-3 min-h-[350px]">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h4 className="text-xs font-bold uppercase text-slate-700">
                        {colLabels[colStatus]}
                      </h4>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {colTasks.map((t) => {
                        const completedChecks = t.checklists?.filter((c) => c.isCompleted).length || 0;
                        const totalChecks = t.checklists?.length || 0;

                        return (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTaskForModal(t)}
                            className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:shadow-md hover:border-zinc-400 transition-colors cursor-pointer space-y-2.5 group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] font-bold text-slate-400 group-hover:text-zinc-950 transition">
                                {t.taskNumber}
                              </span>
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={t.status}
                                  onChange={(e) =>
                                    handleUpdateTaskStatus(t.id, e.target.value as TaskStatus)
                                  }
                                  className="text-[10px] font-semibold border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50 text-slate-700"
                                >
                                  <option value="TODO">A Fazer</option>
                                  <option value="IN_PROGRESS">Em Andamento</option>
                                  <option value="IN_REVIEW">Em Revisão</option>
                                  <option value="DONE">Concluído</option>
                                </select>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTask(t.id);
                                  }}
                                  className="text-slate-400 hover:text-rose-600 p-0.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <h5 className="font-bold text-xs text-slate-900 group-hover:text-zinc-950 transition leading-snug">
                              {t.title}
                            </h5>

                            {t.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-2">
                                {t.description}
                              </p>
                            )}

                            {/* Botão de Execução / Detalhes */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTaskForModal(t);
                              }}
                              className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-zinc-100 group-hover:bg-zinc-950 text-zinc-800 group-hover:text-white text-[11px] font-semibold border border-zinc-200 group-hover:border-transparent transition-colors shadow-2xs"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Executar Tarefa / Detalhes</span>
                            </button>

                            {/* Checklists */}
                            <div className="pt-2 border-t border-slate-100 space-y-1" onClick={(e) => e.stopPropagation()}>
                              {totalChecks > 0 && (
                                <div className="text-[10px] font-medium text-slate-500 flex items-center justify-between mb-1">
                                  <span>Checklist:</span>
                                  <span>
                                    {completedChecks}/{totalChecks}
                                  </span>
                                </div>
                              )}

                              {t.checklists?.map((c) => (
                                <div
                                  key={c.id}
                                  onClick={() => handleToggleChecklist(c.id, c.isCompleted)}
                                  className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer hover:text-slate-900 py-0.5"
                                >
                                  {c.isCompleted ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  )}
                                  <span
                                    className={`text-[11px] ${
                                      c.isCompleted ? "line-through text-slate-400" : ""
                                    }`}
                                  >
                                    {c.title}
                                  </span>
                                </div>
                              ))}

                              {/* Adicionar item de checklist */}
                              <div className="flex items-center gap-1 mt-1 pt-1">
                                <input
                                  type="text"
                                  placeholder="+ item checklist..."
                                  value={newChecklistText[t.id] || ""}
                                  onChange={(e) =>
                                    setNewChecklistText((prev) => ({
                                      ...prev,
                                      [t.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleAddChecklist(t.id);
                                    }
                                  }}
                                  className="w-full text-[11px] px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-zinc-300"
                                />
                              </div>
                            </div>

                            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                              <span>Prazo: {formatDateBR(t.dueDate)}</span>
                              <span>{t.actualHours || 0}h / {t.estimatedHours || 0}h</span>
                            </div>

                            <TaskCardTimer
                              task={t}
                              activeTimers={activeTimers}
                              onStart={handleStartTimer}
                              onPause={handlePauseTimer}
                              onResume={handleResumeTimer}
                              onOpenStop={setStoppingTimer}
                            />
                          </div>
                        );
                      })}

                      {colTasks.length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                          Vazio
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. ABA APONTAMENTO DE HORAS */}
        {activeTab === "TIMES" && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden space-y-4">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Apontamentos de Tempo & Custo Referencial
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rastreabilidade de esforço operacional sem gerar lançamentos a pagar duplicados no financeiro.
                </p>
              </div>

              <button
                onClick={() => setIsTimeModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Apontamento Manual
              </button>
            </div>

            <ProjectTimesTabWidget
              activeTimers={activeTimers}
              onPause={handlePauseTimer}
              onResume={handleResumeTimer}
              onOpenStop={setStoppingTimer}
              onDiscard={handleDiscardTimer}
              onOpenStart={() => setIsStartTimerModalOpen(true)}
            />

            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 w-28">Data</th>
                  <th className="py-2.5 px-4">Tarefa</th>
                  <th className="py-2.5 px-4">Descrição da Atividade</th>
                  <th className="py-2.5 px-4 text-right w-24">Horas</th>
                  <th className="py-2.5 px-4 text-right w-28">Valor/Hora</th>
                  <th className="py-2.5 px-4 text-right w-32">Custo Calculado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timeEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      Nenhum apontamento de horas registrado ainda neste projeto.
                    </td>
                  </tr>
                ) : (
                  timeEntries.map((te) => (
                    <tr key={te.id} className="hover:bg-slate-50/50 text-xs">
                      <td className="py-2.5 px-4 font-mono text-slate-700">{formatDateBR(te.entryDate)}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">
                        {te.taskTitle || "Atividade Geral"}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{te.description}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                        {te.hours}h
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-500">
                        {formatCurrency(te.hourlyRate)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-zinc-800">
                        {formatCurrency(te.calculatedCost)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. ABA DOCUMENTOS & ARQUIVOS */}
        {activeTab === "DOCS" && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <DocumentAttachmentSection
              entityType="PROJECT"
              entityId={project.id}
              entityTitle={`Documentos do Projeto: ${project.name}`}
            />
          </div>
        )}

        {/* 4. ABA DETALHES & ESCOPO */}
        {activeTab === "DETAILS" && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Escopo e Descrição do Projeto</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {project.description || "Nenhuma descrição informada."}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-semibold text-slate-800 block mb-1">Vínculo de Negócio</span>
                <p className="text-slate-600">Cliente: {project.clientName || "Projeto Interno"}</p>
                {project.contractNumber && (
                  <p className="text-zinc-800 font-medium">Contrato / Assinatura: {project.contractNumber}</p>
                )}
                {project.templateName && (
                  <p className="text-slate-600">Modelo / Template: {project.templateName}</p>
                )}
              </div>

              <div>
                <span className="font-semibold text-slate-800 block mb-1">Datas & Auditoria</span>
                <p className="text-slate-600">Início: {formatDateBR(project.startDate)}</p>
                <p className="text-slate-600">Prazo Previsto: {formatDateBR(project.dueDate)}</p>
                <p className="text-slate-600">Criado em: {new Date(project.createdAt).toLocaleString("pt-BR")}</p>
              </div>
            </div>

            {project.notes && (
              <div className="pt-4 border-t border-slate-100">
                <span className="font-semibold text-slate-800 text-xs block mb-1">Observações Internas</span>
                <p className="text-xs text-slate-600 whitespace-pre-wrap">{project.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Modal Nova Tarefa */}
        {isTaskModalOpen && (
          <div className="fixed inset-0 bg-zinc-950/45 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-900 text-base">Nova Tarefa</h3>
                <button
                  onClick={() => setIsTaskModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Título da Tarefa *
                  </label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Ex: Criar novos anúncios no Meta Ads"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    rows={2}
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    placeholder="Instruções ou referências..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Prazo (Data)
                    </label>
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Prioridade
                    </label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as ProjectPriority)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                    >
                      <option value="LOW">Baixa</option>
                      <option value="MEDIUM">Média</option>
                      <option value="HIGH">Alta</option>
                      <option value="URGENT">Urgente</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Horas Estimadas
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={taskEstimatedHours}
                    onChange={(e) => setTaskEstimatedHours(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-zinc-950 text-white rounded-lg text-sm font-semibold hover:bg-zinc-800 transition-colors"
                  >
                    Adicionar Tarefa
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Apontamento de Horas */}
        {isTimeModalOpen && (
          <div className="fixed inset-0 bg-zinc-950/45 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-900 text-base">Apontar Horas</h3>
                <button
                  onClick={() => setIsTimeModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddTimeEntry} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tarefa Vinculada (Opcional)
                  </label>
                  <select
                    value={timeTaskId}
                    onChange={(e) => setTimeTaskId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                  >
                    <option value="">Atividade Geral do Projeto</option>
                    {allTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.taskNumber} - {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data *
                    </label>
                    <input
                      type="date"
                      required
                      value={timeDate}
                      onChange={(e) => setTimeDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Horas Gastas *
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      required
                      value={timeHours}
                      onChange={(e) => setTimeHours(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descrição da Atividade *
                  </label>
                  <input
                    type="text"
                    required
                    value={timeDesc}
                    onChange={(e) => setTimeDesc(e.target.value)}
                    placeholder="Ex: Análise das palavras-chave e ajuste de lance"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custo Horário de Referência (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={timeRate}
                    onChange={(e) => setTimeRate(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Custo referencial interno para rentabilidade, não gera título a pagar.
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTimeModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-zinc-950 text-white rounded-lg text-sm font-semibold hover:bg-zinc-800 transition-colors"
                  >
                    Gravar Apontamento
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modal Interativo de Execução de Tarefa & Automações */}
        <TaskExecutionModal
          task={selectedTaskForModal}
          project={project}
          isOpen={!!selectedTaskForModal}
          onClose={() => setSelectedTaskForModal(null)}
          onTaskUpdated={loadProject}
        />

        {/* Modais de Controle do Cronômetro de Horas */}
        <StartTimerModal
          isOpen={isStartTimerModalOpen}
          onClose={() => setIsStartTimerModalOpen(false)}
          tasks={allTasks}
          onStart={handleStartTimer}
        />

        <StopTimerModal
          timer={stoppingTimer}
          onClose={() => setStoppingTimer(null)}
          onConfirmStop={handleConfirmStopTimer}
          onDiscard={handleDiscardTimer}
        />

        {deleteDialog.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {deleteDialog.linkedPostsCount !== null
                    ? "Projeto possui posts vinculados"
                    : "Excluir projeto"}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  {deleteDialog.linkedPostsCount !== null
                    ? `Este projeto possui ${deleteDialog.linkedPostsCount} post(s) no planejamento/calendário. Escolha se deseja arquivar (mantendo o histórico de conteúdos) ou excluir tudo permanentemente.`
                    : "Deseja excluir este projeto e suas tarefas/briefings, ou apenas arquivá-lo?"}
                </p>
              </div>

              {deleteDialog.error && (
                <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {deleteDialog.error}
                </p>
              )}

              <div className="flex flex-col gap-2 pt-1">
                {deleteDialog.linkedPostsCount === null ? (
                  <button
                    type="button"
                    disabled={deleteDialog.deleting}
                    onClick={() => void executeDeleteProject("DELETE")}
                    className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {deleteDialog.deleting ? "Verificando..." : "Excluir projeto"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={deleteDialog.deleting}
                    onClick={() => void executeDeleteProject("FORCE_DELETE")}
                    className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {deleteDialog.deleting
                      ? "Excluindo tudo..."
                      : `Excluir tudo (projeto + ${deleteDialog.linkedPostsCount} post${deleteDialog.linkedPostsCount === 1 ? "" : "s"})`}
                  </button>
                )}

                <button
                  type="button"
                  disabled={deleteDialog.deleting}
                  onClick={() => void executeDeleteProject("ARCHIVE")}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Arquivar projeto (manter histórico)
                </button>

                <button
                  type="button"
                  disabled={deleteDialog.deleting}
                  onClick={() => setDeleteDialog({ open: false, linkedPostsCount: null, deleting: false, error: "" })}
                  className="w-full rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
