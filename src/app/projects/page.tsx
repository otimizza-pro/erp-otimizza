"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import Link from "next/link";
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Kanban,
  List,
  Calendar,
  Layers,
  RefreshCw,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { ProjectRecord, ProjectStatus, ProjectType } from "@/modules/projects/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<"LIST" | "KANBAN">("LIST");

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (typeFilter) params.append("projectType", typeFilter);
      if (searchTerm) params.append("search", searchTerm);

      const res = await fetch(`/api/projects?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Erro ao carregar projetos");
      setProjects(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar projetos.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, searchTerm]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Estatísticas
  const totalProjects = projects.length;
  const inProgressProjects = projects.filter((p) => p.status === "IN_PROGRESS").length;
  const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;
  const totalActualHours = projects.reduce((acc, p) => acc + (p.actualHours || 0), 0);

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case "PLANNED":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Planejado</span>;
      case "IN_PROGRESS":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Em Andamento</span>;
      case "PAUSED":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Pausado</span>;
      case "COMPLETED":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Concluído</span>;
      case "CANCELED":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Cancelado</span>;
    }
  };

  const getTypeBadge = (type: ProjectType) => {
    switch (type) {
      case "RECURRING":
        return <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">Recorrente</span>;
      case "STANDALONE":
        return <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Avulso</span>;
      case "INTERNAL":
        return <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Interno</span>;
    }
  };

  const kanbanColumns: Array<{ status: ProjectStatus; label: string; bg: string }> = [
    { status: "PLANNED", label: "Planejados", bg: "bg-slate-50 border-slate-200" },
    { status: "IN_PROGRESS", label: "Em Andamento", bg: "bg-indigo-50/50 border-indigo-200" },
    { status: "PAUSED", label: "Pausados", bg: "bg-amber-50/50 border-amber-200" },
    { status: "COMPLETED", label: "Concluídos", bg: "bg-emerald-50/50 border-emerald-200" },
  ];

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
              <span>Operações</span>
              <span>/</span>
              <span className="text-slate-900 font-semibold">Projetos</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
              <Briefcase className="w-7 h-7 text-indigo-600" />
              Gestão de Projetos e Entregas
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Acompanhamento de projetos avulsos, recorrentes por contrato, tarefas e apontamentos.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/projects/templates"
              className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-colors"
            >
              <Layers className="w-4 h-4 text-slate-500" />
              Modelos / Templates
            </Link>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Projeto
            </Link>
          </div>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block">Total de Projetos</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{totalProjects}</div>
            <span className="text-[11px] text-slate-500 block mt-1">Cadastrados no ERP</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block">Em Andamento</span>
            <div className="text-2xl font-bold text-indigo-600 mt-1">{inProgressProjects}</div>
            <span className="text-[11px] text-indigo-600 font-medium block mt-1">Em execução ativa</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block">Concluídos</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{completedProjects}</div>
            <span className="text-[11px] text-emerald-600 font-medium block mt-1">Entregas finalizadas</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block">Horas Realizadas</span>
            <div className="text-2xl font-bold text-amber-600 mt-1">{totalActualHours.toFixed(1)}h</div>
            <span className="text-[11px] text-slate-500 block mt-1">Apontadas no período</span>
          </div>
        </div>

        {/* Barra de Filtros e Alternador de Visão */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou código..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos os Status</option>
              <option value="PLANNED">Planejado</option>
              <option value="IN_PROGRESS">Em Andamento</option>
              <option value="PAUSED">Pausado</option>
              <option value="COMPLETED">Concluído</option>
              <option value="CANCELED">Cancelado</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos os Tipos</option>
              <option value="RECURRING">Recorrente</option>
              <option value="STANDALONE">Avulso</option>
              <option value="INTERNAL">Interno</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode("LIST")}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                  viewMode === "LIST"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <List className="w-3.5 h-3.5" /> Lista
              </button>
              <button
                onClick={() => setViewMode("KANBAN")}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                  viewMode === "KANBAN"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Kanban className="w-3.5 h-3.5" /> Kanban
              </button>
            </div>

            <button
              onClick={loadProjects}
              disabled={loading}
              className="p-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Mensagens de Erro */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Visualização em Lista */}
        {viewMode === "LIST" && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-28">Código</th>
                  <th className="py-3 px-4">Projeto</th>
                  <th className="py-3 px-4">Cliente / Origem</th>
                  <th className="py-3 px-4 w-28">Tipo</th>
                  <th className="py-3 px-4 w-28">Prazo</th>
                  <th className="py-3 px-4 w-24">Horas</th>
                  <th className="py-3 px-4 w-32">Status</th>
                  <th className="py-3 px-4 text-right w-20">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && projects.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                      Carregando projetos...
                    </td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      Nenhum projeto encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  projects.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700 text-xs">
                        {p.projectNumber}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/projects/${p.id}`}
                          className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors block"
                        >
                          {p.name}
                        </Link>
                        {p.competency && (
                          <span className="text-[11px] text-slate-500 block">
                            Competência: {p.competency}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700">
                        {p.clientName ? (
                          <span className="font-medium text-slate-900">{p.clientName}</span>
                        ) : (
                          <span className="text-slate-400">Projeto Interno</span>
                        )}
                        {p.contractNumber && (
                          <span className="block text-[11px] text-indigo-600">
                            Contrato {p.contractNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">{getTypeBadge(p.projectType)}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {p.dueDate}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-700">
                        {p.actualHours || 0}h / {p.estimatedHours || 0}h
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(p.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/projects/${p.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          Ver <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Visualização em Kanban de Projetos */}
        {viewMode === "KANBAN" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {kanbanColumns.map((col) => {
              const colProjects = projects.filter((p) => p.status === col.status);
              return (
                <div key={col.status} className={`border rounded-xl p-3 ${col.bg} min-h-[400px]`}>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {col.label}
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
                      {colProjects.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {colProjects.map((p) => (
                      <div
                        key={p.id}
                        className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-mono text-[11px] font-bold text-indigo-600">
                            {p.projectNumber}
                          </span>
                          {getTypeBadge(p.projectType)}
                        </div>

                        <Link
                          href={`/projects/${p.id}`}
                          className="font-semibold text-sm text-slate-900 hover:text-indigo-600 block line-clamp-2"
                        >
                          {p.name}
                        </Link>

                        <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
                          <span>{p.clientName || "Interno"}</span>
                          <span>Prazo: {p.dueDate}</span>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {p.actualHours || 0}h / {p.estimatedHours || 0}h
                          </span>
                          <Link
                            href={`/projects/${p.id}`}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            Abrir &rarr;
                          </Link>
                        </div>
                      </div>
                    ))}

                    {colProjects.length === 0 && (
                      <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                        Nenhum projeto neste status
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
