"use client";

import React, { useState, useEffect, Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  ArrowLeft,
  Clock,
  Calendar,
  CheckSquare,
  RefreshCw,
  AlertCircle,
  Briefcase,
  Rocket,
  Search,
  ArrowRight,
  X,
  Play,
  CheckCircle2,
  ListTodo,
} from "lucide-react";
import { ProjectTemplateRecord } from "@/modules/projects/types";

interface TemplateTaskDetail {
  id: string;
  stageId: string | null;
  title: string;
  description: string | null;
  relativeDueDays: number;
  estimatedHours: number;
  orderIndex: number;
}

interface TemplateStageDetail {
  id: string;
  name: string;
  orderIndex: number;
  minDays: number;
  maxDays: number;
  tasks: TemplateTaskDetail[];
}

interface TemplateWithDetails extends ProjectTemplateRecord {
  stages: TemplateStageDetail[];
  allTasks: TemplateTaskDetail[];
}

function ProjectTemplatesContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") === "onboarding" ? "ONBOARDING" : "ALL";

  const [templates, setTemplates] = useState<ProjectTemplateRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "ONBOARDING" | "PROJECT">(initialCategory);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal de Detalhes e Cronograma
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateDetails, setTemplateDetails] = useState<TemplateWithDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [simulatedStartDate, setSimulatedStartDate] = useState(() => new Date().toISOString().substring(0, 10));

  useEffect(() => {
    fetch("/api/projects/templates")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setTemplates(json.data);
        else setError(json.error || "Erro ao carregar templates");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const openTemplateDetails = async (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    setLoadingDetails(true);
    setTemplateDetails(null);
    try {
      const res = await fetch(`/api/projects/templates/${tmplId}`);
      const json = await res.json();
      if (json.success) {
        setTemplateDetails(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const calculateDate = (baseDateStr: string, daysToAdd: number) => {
    if (!baseDateStr) return "-";
    const d = new Date(baseDateStr + "T12:00:00");
    d.setDate(d.getDate() + (daysToAdd || 0));
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const filteredTemplates = templates.filter((tmpl) => {
    const isOngoing = tmpl.code.startsWith("ONB-");
    if (categoryFilter === "ONBOARDING" && !isOngoing) return false;
    if (categoryFilter === "PROJECT" && isOngoing) return false;
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      const matchName = tmpl.name.toLowerCase().includes(s);
      const matchCode = tmpl.code.toLowerCase().includes(s);
      const matchDesc = tmpl.description ? tmpl.description.toLowerCase().includes(s) : false;
      if (!matchName && !matchCode && !matchDesc) return false;
    }
    return true;
  });

  return (
    <AppShell activeSection={categoryFilter === "ONBOARDING" ? "projects_onboarding" : "projects_templates"}>
      <div className="p-6 max-w-6xl mx-auto space-y-6 pb-20">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="p-2 border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>Operações</span>
                <span>/</span>
                <span className="text-slate-900 font-semibold">Modelos & Onboardings</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-950 mt-0.5 flex items-center gap-2">
                <Rocket className="w-6 h-6 text-indigo-600" />
                Processos, Modelos & Onboardings de Clientes
              </h1>
            </div>
          </div>

          <Link
            href="/projects/new"
            className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-2xs self-start sm:self-auto"
          >
            <Play className="w-3.5 h-3.5" /> Iniciar Projeto / Onboarding
          </Link>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setCategoryFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                categoryFilter === "ALL"
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              Todos ({templates.length})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("ONBOARDING")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                categoryFilter === "ONBOARDING"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              }`}
            >
              <Rocket className="w-3.5 h-3.5" /> Onboardings de Clientes ({templates.filter((t) => t.code.startsWith("ONB-")).length})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("PROJECT")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                categoryFilter === "PROJECT"
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              Projetos Padrão ({templates.filter((t) => !t.code.startsWith("ONB-")).length})
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-16 text-center text-slate-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
            Carregando modelos de projeto e onboardings...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((tmpl) => {
              const isOnboarding = tmpl.code.startsWith("ONB-");

              return (
                <div
                  key={tmpl.id}
                  className={`bg-white border rounded-2xl p-6 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between ${
                    isOnboarding ? "border-indigo-100 hover:border-indigo-300" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg border ${
                          isOnboarding
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        {tmpl.code}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {isOnboarding ? "Onboarding" : "Projeto"}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-1">{tmpl.name}</h3>
                    <p className="text-xs text-slate-600 mb-4 line-clamp-2">
                      {tmpl.description || "Modelo com etapas estruturadas e prazos relativos automáticos."}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{tmpl.estimatedDays} dias</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{tmpl.estimatedHours} horas</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openTemplateDetails(tmpl.id)}
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-800 text-xs font-semibold transition"
                    >
                      Ver Fases & Datas
                    </button>

                    <Link
                      href={`/projects/new?templateId=${tmpl.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition shadow-2xs"
                    >
                      Iniciar &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Interativo de Cronograma das Fases */}
        {selectedTemplateId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <Rocket className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-zinc-950">
                      {templateDetails?.name || "Cronograma do Onboarding"}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {templateDetails?.code} • {templateDetails?.estimatedDays} dias de duração estimada
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTemplateId(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingDetails ? (
                <div className="p-12 text-center text-xs text-zinc-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                  Calculando fases e etapas do processo...
                </div>
              ) : templateDetails ? (
                <div className="space-y-5">
                  {/* Simulador de Data de Início */}
                  <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <label className="text-xs font-bold text-indigo-950 block mb-0.5">
                        Definir Data de Início do Onboarding:
                      </label>
                      <p className="text-[11px] text-indigo-700">
                        Todas as fases e prazos das tarefas abaixo são recalculados automaticamente a partir desta data.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={simulatedStartDate}
                        onChange={(e) => setSimulatedStartDate(e.target.value)}
                        className="px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  {/* Fases do Onboarding com Datas Sugeridas */}
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                    {templateDetails.stages?.map((stage, sIdx) => {
                      const startDateStr = calculateDate(simulatedStartDate, stage.minDays > 0 ? stage.minDays - 1 : 0);
                      const endDateStr = calculateDate(simulatedStartDate, stage.maxDays || stage.minDays || 5);

                      return (
                        <div
                          key={stage.id}
                          className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50/50 space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/60 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {sIdx + 1}
                              </span>
                              <h4 className="font-bold text-sm text-zinc-900">
                                {stage.name}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold font-mono text-[11px]">
                                Período Sugerido: {startDateStr} até {endDateStr}
                              </span>
                            </div>
                          </div>

                          {/* Lista de Tarefas da Fase */}
                          <div className="space-y-2 pl-8">
                            {stage.tasks?.map((task, tIdx) => {
                              const taskDueDateStr = calculateDate(simulatedStartDate, task.relativeDueDays || 0);

                              return (
                                <div
                                  key={task.id}
                                  className="flex items-start justify-between gap-3 p-2.5 bg-white border border-zinc-200/80 rounded-xl text-xs hover:border-zinc-300 transition"
                                >
                                  <div className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                                    <div>
                                      <p className="font-semibold text-zinc-900">{task.title}</p>
                                      {task.description && (
                                        <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">
                                          {task.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-[10px]">
                                      Prazo: {taskDueDateStr}
                                    </span>
                                    <span className="text-[10px] text-zinc-400 block mt-0.5">
                                      +{task.relativeDueDays} dias • {task.estimatedHours}h
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Ação de Iniciar Onboarding */}
                  <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedTemplateId(null)}
                      className="px-4 py-2 text-xs text-zinc-600 hover:text-zinc-950 font-semibold"
                    >
                      Fechar
                    </button>

                    <Link
                      href={`/projects/new?templateId=${templateDetails.id}&startDate=${simulatedStartDate}`}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs"
                    >
                      <Rocket className="w-4 h-4" />
                      Iniciar Este Onboarding Agora
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function ProjectTemplatesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-zinc-400">
          Carregando modelos operacionais...
        </div>
      }
    >
      <ProjectTemplatesContent />
    </Suspense>
  );
}
