"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FolderKanban,
  PlayCircle,
  CheckCircle2,
  Clock3,
  Search,
  AlertTriangle,
  Kanban,
  List,
  BarChart3,
  CalendarDays,
  Building,
  Calendar,
  GripVertical,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Layers,
  ArrowUpDown,
  Check,
  PauseCircle,
  XCircle,
  FileText,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";
import type { ProjectRecord, ProjectStatus } from "@/modules/projects/types";

const STATUS_CONFIG: Record<
  ProjectStatus,
  {
    label: string;
    dotColor: string;
    badgeBg: string;
    badgeText: string;
    borderCol: string;
    columnBg: string;
  }
> = {
  PLANNED: {
    label: "Planejado",
    dotColor: "bg-sky-500",
    badgeBg: "bg-sky-50",
    badgeText: "text-sky-700 border-sky-200",
    borderCol: "border-sky-200",
    columnBg: "bg-sky-50/20",
  },
  IN_PROGRESS: {
    label: "Em Andamento",
    dotColor: "bg-emerald-500",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700 border-emerald-200",
    borderCol: "border-emerald-200",
    columnBg: "bg-emerald-50/20",
  },
  PAUSED: {
    label: "Pausado",
    dotColor: "bg-amber-500",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700 border-amber-200",
    borderCol: "border-amber-200",
    columnBg: "bg-amber-50/20",
  },
  COMPLETED: {
    label: "Concluído",
    dotColor: "bg-teal-600",
    badgeBg: "bg-teal-50",
    badgeText: "text-teal-800 border-teal-200",
    borderCol: "border-teal-200",
    columnBg: "bg-teal-50/20",
  },
  CANCELED: {
    label: "Cancelado",
    dotColor: "bg-zinc-400",
    badgeBg: "bg-zinc-100",
    badgeText: "text-zinc-600 border-zinc-200",
    borderCol: "border-zinc-200",
    columnBg: "bg-zinc-50/40",
  },
};

const KANBAN_COLUMNS: ProjectStatus[] = ["PLANNED", "IN_PROGRESS", "PAUSED", "COMPLETED", "CANCELED"];

const PRIORITY_CONFIG: Record<string, { label: string; badge: string }> = {
  URGENT: { label: "Urgente", badge: "bg-rose-50 text-rose-700 border-rose-200 font-bold" },
  HIGH: { label: "Alta", badge: "bg-amber-50 text-amber-700 border-amber-200 font-semibold" },
  MEDIUM: { label: "Média", badge: "bg-blue-50 text-blue-700 border-blue-200 font-medium" },
  LOW: { label: "Baixa", badge: "bg-zinc-50 text-zinc-600 border-zinc-200 font-normal" },
};

const TYPE_CONFIG: Record<string, string> = {
  STANDALONE: "Avulso",
  RECURRING: "Recorrente",
  INTERNAL: "Interno",
};

const day = (s: string) => (s ? s.slice(0, 10) : "");
const stamp = (s: string) => (s ? Date.parse(day(s) + "T12:00:00Z") : 0);

export function ProjectViews({ clientId }: { clientId?: string }) {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [view, setView] = useState<"Kanban" | "Lista" | "Gantt" | "Calendário">("Kanban");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtros
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [client, setClient] = useState("");
  const [priority, setPriority] = useState("");
  const [contract, setContract] = useState("");
  const [type, setType] = useState("");
  const [critical, setCritical] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  // Estado do Kanban Drag & Drop
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<ProjectStatus | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const currentTime = useMemo(() => Date.now(), []);

  // Leitura inicial de parâmetros da URL
  useEffect(() => {
    if (clientId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("status")) setStatus(params.get("status") || "");
    if (params.get("clientId")) setClient(params.get("clientId") || "");
    if (params.get("contractId")) setContract(params.get("contractId") || "");
    if (params.get("filter") === "critical") setCritical(true);
    if (params.get("view") === "Lista") setView("Lista");
    if (params.get("view") === "Gantt") setView("Gantt");
    if (params.get("view") === "Calendário") setView("Calendário");
  }, [clientId]);

  // Carregamento de Projetos
  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects${clientId ? `?clientId=${clientId}` : ""}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar projetos.");
      }
      setProjects(data.data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro desconhecido ao carregar projetos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [clientId]);

  // Filtro de Projetos
  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        !search ||
        `${p.name} ${p.clientName || ""} ${p.projectNumber || ""}`
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus = !status || p.status === status;
      const matchesClient = !client || p.clientId === client;
      const matchesPriority = !priority || p.priority === priority;
      const matchesContract = !contract || p.contractId === contract;
      const matchesType = !type || p.projectType === type;

      const isCritical =
        !["COMPLETED", "CANCELED"].includes(p.status) &&
        stamp(p.dueDate) <= currentTime + 7 * 86400000;

      const matchesCritical = !critical || isCritical;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesClient &&
        matchesPriority &&
        matchesContract &&
        matchesType &&
        matchesCritical
      );
    });
  }, [projects, search, status, client, priority, contract, type, critical, currentTime]);

  // Indicador de Prazo
  const getDeadlineBadge = (dueDateStr: string, prjStatus: string) => {
    if (["COMPLETED", "CANCELED"].includes(prjStatus)) return null;
    const dueMs = stamp(dueDateStr);
    const diffDays = Math.ceil((dueMs - currentTime) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3 h-3 text-rose-600" /> Atrasado há {Math.abs(diffDays)}d
        </span>
      );
    }
    if (diffDays <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" /> Vence em {diffDays === 0 ? "hoje" : `${diffDays}d`}
        </span>
      );
    }
    return null;
  };

  // Mover Status no Kanban (Drag & Drop ou Dropdown)
  const handleMoveProjectStatus = async (projectId: string, newStatus: ProjectStatus) => {
    const target = projects.find((p) => p.id === projectId);
    if (!target || target.status === newStatus) return;

    const previousStatus = target.status;

    // Atualização otimista imediata na UI
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p))
    );
    setUpdatingId(projectId);

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Não foi possível atualizar o status.");
      }

      setNotification({
        message: `Projeto "${target.name}" movido para ${STATUS_CONFIG[newStatus]?.label || newStatus}`,
        type: "success",
      });
      setTimeout(() => setNotification(null), 3500);
    } catch (err: unknown) {
      // Rollback se falhar
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status: previousStatus } : p))
      );
      const msg = err instanceof Error ? err.message : "Erro ao atualizar status.";
      setNotification({ message: msg, type: "error" });
    } finally {
      setUpdatingId(null);
      setDraggedProjectId(null);
      setDragOverStatus(null);
    }
  };

  // Eventos de Drag & Drop HTML5
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedProjectId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, colStatus: ProjectStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStatus !== colStatus) {
      setDragOverStatus(colStatus);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, colStatus: ProjectStatus) => {
    e.preventDefault();
    setDragOverStatus(null);
    const id = e.dataTransfer.getData("text/plain") || draggedProjectId;
    if (id) {
      await handleMoveProjectStatus(id, colStatus);
    }
  };

  // Cálculos para Gantt
  const first = Math.min(...filtered.map((p) => stamp(p.startDate)));
  const last = Math.max(...filtered.map((p) => stamp(p.dueDate)));
  const span = Math.max(86400000, last - first);

  return (
    <section className="space-y-6">
      {/* Notificação Flutuante / Toast */}
      {notification && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between border animate-in fade-in slide-in-from-top duration-200 ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold underline opacity-70 hover:opacity-100 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* 4 Cards de Métricas / KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="p-4 bg-white border border-zinc-200/90 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Total de Projetos
            </span>
            <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
              <FolderKanban className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-zinc-950 font-mono">
            {filtered.length}
          </div>
          <p className="text-[11px] text-zinc-400">
            {projects.length > filtered.length
              ? `${filtered.length} de ${projects.length} filtrados`
              : "Cadastrados na base"}
          </p>
        </div>

        {/* Em Andamento */}
        <div className="p-4 bg-white border border-zinc-200/90 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Em Produção
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <PlayCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 font-mono">
            {filtered.filter((p) => p.status === "IN_PROGRESS").length}
          </div>
          <p className="text-[11px] text-zinc-400">Demandas ativas no momento</p>
        </div>

        {/* Concluídos */}
        <div className="p-4 bg-white border border-zinc-200/90 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
              Entregues
            </span>
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-teal-800 font-mono">
            {filtered.filter((p) => p.status === "COMPLETED").length}
          </div>
          <p className="text-[11px] text-zinc-400">Projetos finalizados com sucesso</p>
        </div>

        {/* Horas Registradas */}
        <div className="p-4 bg-white border border-zinc-200/90 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
              Horas Produzidas
            </span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-700">
              <Clock3 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-purple-800 font-mono">
            {filtered.reduce((sum, p) => sum + Number(p.actualHours || 0), 0).toFixed(1)}h
          </div>
          <p className="text-[11px] text-zinc-400">
            Estimadas: {filtered.reduce((sum, p) => sum + Number(p.estimatedHours || 0), 0)}h
          </p>
        </div>
      </div>

      {/* Barra de Filtros & Seletor de Modo de Visualização */}
      <div className="p-4 bg-white border border-zinc-200/90 rounded-2xl shadow-xs space-y-3">
        {/* Linha Superior: Busca e Dropdowns */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Busca por texto */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
            <input
              type="text"
              aria-label="Buscar projetos"
              placeholder="Buscar por nome do projeto, cliente ou código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-2.5 text-xs text-zinc-400 hover:text-zinc-600"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Filtros em Grid responsivo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Tipo */}
            <select
              aria-label="Tipo do projeto"
              className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-950"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">Todos os tipos</option>
              <option value="STANDALONE">Avulso</option>
              <option value="RECURRING">Recorrente</option>
              <option value="INTERNAL">Interno</option>
            </select>

            {/* Status */}
            <select
              aria-label="Status"
              className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-950"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_CONFIG).map(([v, cfg]) => (
                <option key={v} value={v}>
                  {cfg.label}
                </option>
              ))}
            </select>

            {/* Cliente */}
            {!clientId && (
              <select
                aria-label="Cliente"
                className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                value={client}
                onChange={(e) => setClient(e.target.value)}
              >
                <option value="">Todos os clientes</option>
                {[
                  ...new Map(
                    projects.filter((p) => p.clientId).map((p) => [p.clientId, p.clientName])
                  ).entries(),
                ].map(([id, name]) => (
                  <option key={id} value={id!}>
                    {name}
                  </option>
                ))}
              </select>
            )}

            {/* Prioridade */}
            <select
              aria-label="Prioridade"
              className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-950"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="">Todas as prioridades</option>
              {Object.entries(PRIORITY_CONFIG).map(([v, cfg]) => (
                <option key={v} value={v}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Linha Inferior: Filtros Rápidos & Abas de Visualização */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-zinc-100">
          {/* Chip Alerta Crítico */}
          <button
            type="button"
            onClick={() => setCritical(!critical)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              critical
                ? "bg-rose-50 border-rose-300 text-rose-800 font-bold shadow-2xs"
                : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${critical ? "text-rose-600" : "text-zinc-400"}`} />
            Atrasados ou entrega em até 7 dias
          </button>

          {/* Alternador de Visualização (Kanban, Lista, Gantt, Calendário) */}
          <div className="bg-zinc-100 p-1 rounded-xl flex items-center gap-1 border border-zinc-200/80">
            {[
              { id: "Kanban", label: "Kanban", icon: Kanban },
              { id: "Lista", label: "Lista", icon: List },
              { id: "Gantt", label: "Gantt", icon: BarChart3 },
              { id: "Calendário", label: "Calendário", icon: CalendarDays },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = view === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setView(tab.id as typeof view)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-white text-zinc-950 shadow-2xs"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-600" : "text-zinc-400"}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Estados de Carregamento & Erro */}
      {error && (
        <div className="p-4 bg-rose-50 text-rose-900 border border-rose-200 rounded-2xl text-xs font-medium">
          {error}
        </div>
      )}

      {loading && (
        <div className="py-20 text-center text-xs text-zinc-400">
          Carregando projetos e cronogramas...
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="py-16 text-center border border-dashed border-zinc-200 bg-white rounded-2xl space-y-2">
          <FolderKanban className="w-8 h-8 text-zinc-300 mx-auto" />
          <p className="text-xs font-semibold text-zinc-600">Nenhum projeto encontrado para estes filtros.</p>
          <p className="text-[11px] text-zinc-400">Tente ajustar o status, tipo ou termo de busca.</p>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. KANBAN TOTALMENTE INTERATIVO & FUNCIONAL */}
      {/* ==================================================================== */}
      {!loading && !error && view === "Kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-6 items-start min-h-[580px]">
          {KANBAN_COLUMNS.map((colStatus) => {
            const colCfg = STATUS_CONFIG[colStatus];
            const colProjects = filtered.filter((p) => p.status === colStatus);
            const totalHours = colProjects.reduce((acc, p) => acc + Number(p.actualHours || 0), 0);
            const isTarget = dragOverStatus === colStatus;

            return (
              <div
                key={colStatus}
                onDragOver={(e) => handleDragOver(e, colStatus)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, colStatus)}
                className={`w-80 shrink-0 rounded-2xl border transition-all duration-200 flex flex-col p-3 space-y-3 ${
                  isTarget
                    ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20"
                    : `border-zinc-200/80 bg-zinc-100/60`
                }`}
              >
                {/* Cabeçalho da Coluna Kanban */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${colCfg.dotColor}`} />
                    <span className="font-extrabold text-xs text-zinc-900 tracking-tight">
                      {colCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-white border border-zinc-200/90 text-[10px] font-bold text-zinc-700 font-mono shadow-2xs">
                      {colProjects.length}
                    </span>
                  </div>
                </div>

                <div className="px-1 text-[11px] font-mono font-medium text-zinc-400 flex items-center justify-between">
                  <span>Horas: {totalHours.toFixed(1)}h</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider">
                    {colProjects.length === 1 ? "1 projeto" : `${colProjects.length} projetos`}
                  </span>
                </div>

                {/* Área de Cards da Coluna */}
                <div className="space-y-2.5 min-h-[220px]">
                  {colProjects.length === 0 ? (
                    <div
                      className={`h-28 rounded-xl border border-dashed flex items-center justify-center text-[11px] transition ${
                        isTarget
                          ? "border-emerald-400 bg-emerald-100/30 text-emerald-800 font-bold"
                          : "border-zinc-200/90 text-zinc-400"
                      }`}
                    >
                      {isTarget ? "Solte aqui para mover" : "Nenhum projeto aqui"}
                    </div>
                  ) : (
                    colProjects.map((p) => {
                      const deadlineBadge = getDeadlineBadge(p.dueDate, p.status);
                      const priorityCfg = PRIORITY_CONFIG[p.priority] || PRIORITY_CONFIG.MEDIUM;
                      const isUpdating = updatingId === p.id;
                      const hasHours = Number(p.estimatedHours || 0) > 0;
                      const percentHours = hasHours
                        ? Math.min(100, Math.round((Number(p.actualHours || 0) / Number(p.estimatedHours)) * 100))
                        : 0;

                      return (
                        <div
                          key={p.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, p.id)}
                          className={`bg-white border border-zinc-200/90 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition space-y-2.5 cursor-grab active:cursor-grabbing group relative ${
                            isUpdating ? "opacity-50 pointer-events-none" : ""
                          }`}
                        >
                          {/* Linha 1: Código, Prioridade & Grip */}
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono font-bold text-zinc-400">
                                {p.projectNumber || "PRJ"}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200/80">
                                {TYPE_CONFIG[p.projectType] || p.projectType}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] border ${priorityCfg.badge}`}>
                                {priorityCfg.label}
                              </span>
                              <GripVertical className="w-3.5 h-3.5 text-zinc-300 opacity-60 group-hover:opacity-100 transition" />
                            </div>
                          </div>

                          {/* Linha 2: Título do Projeto */}
                          <div>
                            <Link
                              href={`/projects/${p.id}`}
                              className="font-bold text-xs text-zinc-950 hover:text-emerald-700 transition line-clamp-2"
                            >
                              {p.name}
                            </Link>
                          </div>

                          {/* Linha 3: Cliente & Contrato */}
                          <div className="space-y-1 text-[11px] text-zinc-500">
                            {p.clientName && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Building className="w-3 h-3 text-zinc-400 shrink-0" />
                                <span className="font-semibold text-zinc-700 truncate">{p.clientName}</span>
                              </div>
                            )}

                            {p.contractNumber && (
                              <div className="flex items-center gap-1.5 truncate text-[10px] text-zinc-400">
                                <FileText className="w-3 h-3 text-zinc-300 shrink-0" />
                                <span>Contrato {p.contractNumber}</span>
                              </div>
                            )}
                          </div>

                          {/* Linha 4: Datas & Alerta */}
                          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-zinc-500 pt-1 border-t border-zinc-100">
                            <div className="flex items-center gap-1 text-zinc-500 font-mono">
                              <Calendar className="w-3 h-3 text-zinc-400" />
                              <span>{day(p.startDate)} → {day(p.dueDate)}</span>
                            </div>
                            {deadlineBadge}
                          </div>

                          {/* Linha 5: Progresso de Horas */}
                          {hasHours && (
                            <div className="space-y-1 pt-1">
                              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                                <span>Horas: {Number(p.actualHours || 0).toFixed(1)}h / {p.estimatedHours}h</span>
                                <span className="font-bold">{percentHours}%</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    percentHours > 100
                                      ? "bg-rose-500"
                                      : percentHours > 75
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${percentHours}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Linha 6: Ação Rápida de Mover (Para Mobile/Clique) */}
                          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                            <select
                              aria-label="Mover projeto para"
                              value={p.status}
                              onChange={(e) => handleMoveProjectStatus(p.id, e.target.value as ProjectStatus)}
                              className="text-[10px] font-semibold text-zinc-600 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/90 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-950 cursor-pointer"
                            >
                              {KANBAN_COLUMNS.map((st) => (
                                <option key={st} value={st}>
                                  Mover: {STATUS_CONFIG[st].label}
                                </option>
                              ))}
                            </select>

                            <Link
                              href={`/projects/${p.id}`}
                              className="text-[11px] font-bold text-zinc-700 hover:text-emerald-700 flex items-center gap-0.5 transition"
                            >
                              Ver <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. VISUALIZAÇÃO EM LISTA (TABELA MODERNA) */}
      {/* ==================================================================== */}
      {!loading && !error && view === "Lista" && (
        <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="py-3.5 px-4">Código / Projeto</th>
                  <th className="py-3.5 px-4">Cliente & Contrato</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Prioridade</th>
                  <th className="py-3.5 px-4">Cronograma</th>
                  <th className="py-3.5 px-4">Horas</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((p) => {
                  const statusCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.PLANNED;
                  const priorityCfg = PRIORITY_CONFIG[p.priority] || PRIORITY_CONFIG.MEDIUM;
                  const deadlineBadge = getDeadlineBadge(p.dueDate, p.status);

                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/80 transition">
                      <td className="py-3.5 px-4">
                        <span className="block text-[10px] font-mono font-bold text-zinc-400">
                          {p.projectNumber || "PRJ"}
                        </span>
                        <Link
                          href={`/projects/${p.id}`}
                          className="font-bold text-zinc-950 hover:text-emerald-700 transition"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-600">
                        <div className="font-semibold text-zinc-800">{p.clientName || "—"}</div>
                        {p.contractNumber && (
                          <span className="text-[10px] text-zinc-400">Contrato: {p.contractNumber}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-700">
                          {TYPE_CONFIG[p.projectType] || p.projectType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          aria-label={`Status do projeto ${p.name}`}
                          value={p.status}
                          onChange={(e) => handleMoveProjectStatus(p.id, e.target.value as ProjectStatus)}
                          className={`text-xs font-bold rounded-lg border px-2 py-1 cursor-pointer focus:outline-none ${statusCfg.badgeBg} ${statusCfg.badgeText}`}
                        >
                          {KANBAN_COLUMNS.map((st) => (
                            <option key={st} value={st}>
                              {STATUS_CONFIG[st].label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${priorityCfg.badge}`}>
                          {priorityCfg.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-[11px] font-mono text-zinc-600">
                          {day(p.startDate)} a {day(p.dueDate)}
                        </div>
                        {deadlineBadge && <div className="mt-1">{deadlineBadge}</div>}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-700">
                        {Number(p.actualHours || 0).toFixed(1)}h / {p.estimatedHours || 0}h
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/projects/${p.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold transition text-[11px]"
                        >
                          Detalhes <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. VISUALIZAÇÃO GANTT */}
      {/* ==================================================================== */}
      {!loading && !error && view === "Gantt" && filtered.length > 0 && (
        <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-xs p-6 overflow-x-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-500 border-b border-zinc-100 pb-2">
            <span className="font-bold uppercase tracking-wider text-zinc-700">Linha do Tempo dos Projetos</span>
            <span className="font-mono">
              {new Date(first).toLocaleDateString("pt-BR")} — {new Date(last).toLocaleDateString("pt-BR")}
            </span>
          </div>

          <div className="min-w-[700px] space-y-3.5">
            {filtered.map((p) => {
              const leftPercent = Math.min(98, Math.max(0, ((stamp(p.startDate) - first) / span) * 100));
              const widthPercent = Math.max(3, ((stamp(p.dueDate) - stamp(p.startDate)) / span) * 100);

              return (
                <div className="grid grid-cols-[240px_1fr] gap-4 items-center" key={p.id}>
                  <div className="truncate">
                    <Link
                      href={`/projects/${p.id}`}
                      className="text-xs font-bold text-zinc-900 hover:text-emerald-700 transition truncate block"
                    >
                      {p.name}
                    </Link>
                    <span className="text-[11px] text-zinc-400 truncate block">
                      {p.clientName || "Sem cliente"} · {STATUS_CONFIG[p.status]?.label}
                    </span>
                  </div>

                  <div className="bg-zinc-100 h-8 rounded-xl relative overflow-hidden">
                    <Link
                      title={`${p.name}: ${day(p.startDate)} a ${day(p.dueDate)}`}
                      href={`/projects/${p.id}`}
                      className="absolute h-8 bg-zinc-950 hover:bg-emerald-700 transition rounded-lg text-white text-[11px] font-mono flex items-center px-2.5 shadow-xs"
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                      }}
                    >
                      <span className="truncate">{day(p.dueDate)}</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. VISUALIZAÇÃO EM CALENDÁRIO */}
      {/* ==================================================================== */}
      {!loading && !error && view === "Calendário" && (
        <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Mês de Referência:
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950"
              />
            </div>
            <p className="text-xs text-zinc-400">Projetos alocados na data prevista de entrega.</p>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div
                key={d}
                className="py-2 text-center text-xs font-extrabold text-zinc-500 uppercase tracking-wider bg-zinc-50 rounded-xl"
              >
                {d}
              </div>
            ))}

            {Array.from({ length: new Date(`${month}-01T12:00:00`).getDay() }, (_, i) => (
              <div key={`blank${i}`} className="min-h-24 p-1 rounded-xl bg-zinc-50/30" />
            ))}

            {Array.from(
              { length: new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate() },
              (_, i) => {
                const date = `${month}-${String(i + 1).padStart(2, "0")}`;
                const dayProjects = filtered.filter((p) => day(p.dueDate) === date);

                return (
                  <div
                    key={date}
                    className="border border-zinc-200/80 rounded-xl min-h-28 p-2 bg-white flex flex-col justify-between hover:border-zinc-400 transition"
                  >
                    <span className="text-xs font-bold text-zinc-500 font-mono">{i + 1}</span>

                    <div className="space-y-1 mt-1 overflow-y-auto max-h-20">
                      {dayProjects.map((p) => (
                        <Link
                          key={p.id}
                          href={`/projects/${p.id}`}
                          className="block text-[11px] font-medium bg-zinc-950 text-white hover:bg-emerald-700 transition p-1.5 rounded-lg truncate shadow-2xs"
                        >
                          {p.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}
    </section>
  );
}
