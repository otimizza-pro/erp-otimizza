"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { AppShell } from "@/components/layout/app-shell";
import Link from "next/link";
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
} from "lucide-react";
import {
  ProjectRecord,
  ProjectTaskRecord,
  ProjectStageRecord,
  ProjectTimeEntryRecord,
  TaskStatus,
  ProjectPriority,
} from "@/modules/projects/types";
import { DocumentAttachmentSection } from "@/components/documents/document-attachment-section";

export default function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [timeEntries, setTimeEntries] = useState<ProjectTimeEntryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"TASKS" | "TIMES" | "DOCS" | "DETAILS">("TASKS");

  // Modais
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

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Erro ao carregar projeto");
      setProject(json.data);

      const timeRes = await fetch(`/api/projects/${id}/time-entries`);
      const timeJson = await timeRes.json();
      if (timeJson.success) setTimeEntries(timeJson.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar projeto.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

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
    if (!confirm("Excluir esta tarefa permanentemente?")) return;
    try {
      const res = await fetch(`/api/projects/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) loadProject();
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (val: number | undefined) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);
  };

  if (loading && !project) {
    return (
      <AppShell>
        <div className="p-12 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          Carregando projeto...
        </div>
      </AppShell>
    );
  }

  if (error || !project) {
    return (
      <AppShell>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error || "Projeto não encontrado."}</span>
          </div>
        </div>
      </AppShell>
    );
  }

  const allTasks = project.tasks || [];
  const completedTasks = allTasks.filter((t) => t.status === "DONE").length;
  const taskProgressPct = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;

  return (
    <AppShell>
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
                <span className="font-mono text-indigo-600 font-bold">{project.projectNumber}</span>
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTimeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-colors"
            >
              <Clock className="w-4 h-4 text-indigo-600" />
              Apontar Horas
            </button>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </button>
          </div>
        </div>

        {/* Resumo do Projeto (Header Banner) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Status:</span>
            <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
              {project.status === "PLANNED" && "Planejado"}
              {project.status === "IN_PROGRESS" && "Em Andamento"}
              {project.status === "PAUSED" && "Pausado"}
              {project.status === "COMPLETED" && "Concluído"}
              {project.status === "CANCELED" && "Cancelado"}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Prazo de Conclusão:</span>
            <span className="font-semibold text-slate-800 text-sm mt-0.5 block flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {project.dueDate}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Progresso das Tarefas:</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all"
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
                ? "border-indigo-600 text-indigo-600"
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
                ? "border-indigo-600 text-indigo-600"
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
                ? "border-indigo-600 text-indigo-600"
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
                ? "border-indigo-600 text-indigo-600"
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
                            className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm hover:shadow transition-shadow space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] font-bold text-slate-400">
                                {t.taskNumber}
                              </span>
                              <div className="flex items-center gap-1">
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
                                  onClick={() => handleDeleteTask(t.id)}
                                  className="text-slate-400 hover:text-rose-600 p-0.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <h5 className="font-semibold text-xs text-slate-900 leading-snug">
                              {t.title}
                            </h5>

                            {t.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-2">
                                {t.description}
                              </p>
                            )}

                            {/* Checklists */}
                            <div className="pt-2 border-t border-slate-100 space-y-1">
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
                                  className="w-full text-[11px] px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                            </div>

                            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                              <span>Prazo: {t.dueDate || "-"}</span>
                              <span>{t.actualHours || 0}h / {t.estimatedHours || 0}h</span>
                            </div>
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Apontamento
              </button>
            </div>

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
                      <td className="py-2.5 px-4 font-mono text-slate-700">{te.entryDate}</td>
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
                      <td className="py-2.5 px-4 text-right font-bold text-indigo-700">
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
                  <p className="text-indigo-600 font-medium">Contrato / Assinatura: {project.contractNumber}</p>
                )}
                {project.templateName && (
                  <p className="text-slate-600">Modelo / Template: {project.templateName}</p>
                )}
              </div>

              <div>
                <span className="font-semibold text-slate-800 block mb-1">Datas & Auditoria</span>
                <p className="text-slate-600">Início: {project.startDate}</p>
                <p className="text-slate-600">Prazo Previsto: {project.dueDate}</p>
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Prioridade
                    </label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as ProjectPriority)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    Gravar Apontamento
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
