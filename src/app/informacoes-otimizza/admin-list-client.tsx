"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KnowledgePage, KnowledgePageTreeNode, KnowledgeInfoType } from "@/modules/knowledge/types";
import {
  Compass,
  Plus,
  BookOpen,
  FileText,
  ExternalLink,
  ShieldAlert,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Eye,
  Globe,
  Archive,
  RotateCcw,
  Copy,
  ChevronRight,
  ChevronDown,
  Layers,
  Calendar,
  Tag,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  FileCode,
  Sparkles
} from "lucide-react";

interface Props {
  initialPages: KnowledgePage[];
  initialTree: KnowledgePageTreeNode[];
}

export function AdminKnowledgeListClient({ initialPages, initialTree }: Props) {
  const router = useRouter();
  const [pages, setPages] = useState<KnowledgePage[]>(initialPages);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Modal de Criação Rápida
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [newInfoType, setNewInfoType] = useState<KnowledgeInfoType>("DIRECTIVE");
  const [newSummary, setNewSummary] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Ações em andamento
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const reloadData = async () => {
    try {
      const res = await fetch("/api/knowledge?status=ALL");
      if (res.ok) {
        const data = await res.json();
        setPages(data.pages || []);
      }
    } catch (err) {
      console.error("Erro ao recarregar páginas:", err);
    }
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setCreating(true);
      setCreateError(null);

      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          slug: newSlug.trim() || undefined,
          parent_id: newParentId || null,
          info_type: newInfoType,
          summary: newSummary.trim() || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar página.");
      }

      setCreateModalOpen(false);
      setNewTitle("");
      setNewSlug("");
      setNewParentId(null);
      setNewSummary("");
      await reloadData();
      router.push(`/informacoes-otimizza/${data.page.id}`);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setCreating(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/knowledge/${id}/publish`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao publicar.");
        return;
      }
      await reloadData();
    } catch (err) {
      alert("Erro ao comunicar com o servidor.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnpublish = async (id: string) => {
    if (!confirm("Tem certeza que deseja retirar esta página da leitura externa? Seus descendentes também deixarão de ser públicos.")) {
      return;
    }
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/knowledge/${id}/unpublish`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao retirar publicação.");
        return;
      }
      await reloadData();
    } catch (err) {
      alert("Erro ao comunicar com o servidor.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Deseja arquivar esta página? Ela sairá do ar e não aparecerá nas listagens ativas.")) {
      return;
    }
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao arquivar.");
        return;
      }
      await reloadData();
    } catch (err) {
      alert("Erro ao comunicar com o servidor.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/knowledge/${id}/restore`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao restaurar página.");
        return;
      }
      await reloadData();
    } catch (err) {
      alert("Erro ao comunicar com o servidor.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/knowledge/${id}/duplicate`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao duplicar página.");
        return;
      }
      await reloadData();
    } catch (err) {
      alert("Erro ao comunicar com o servidor.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredPages = useMemo(() => {
    return pages.filter(p => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && p.info_type !== typeFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(term);
        const matchSlug = p.slug.toLowerCase().includes(term);
        const matchSummary = p.summary ? p.summary.toLowerCase().includes(term) : false;
        if (!matchTitle && !matchSlug && !matchSummary) return false;
      }
      return true;
    });
  }, [pages, statusFilter, typeFilter, searchTerm]);

  const infoTypeBadges: Record<KnowledgeInfoType, { label: string; bg: string; text: string; border: string }> = {
    DIRECTIVE: {
      label: "Diretriz Aprovada",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200"
    },
    HYPOTHESIS: {
      label: "Hipótese em Avaliação",
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200"
    },
    HISTORICAL: {
      label: "Registro Histórico",
      bg: "bg-slate-100",
      text: "text-slate-700",
      border: "border-slate-200"
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Ações Globais */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Compass className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Informações da Otimizza
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Manual vivo da estratégia e identidade da empresa, organizado em páginas e subpáginas para IAs e equipe.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botões para as rotas externas exigidas na Seção 1 */}
          <Link
            href="/estrategia-otimizza"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors"
            title="Abrir área de leitura externa pública"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>Área Externa</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>

          <Link
            href="/estrategia-otimizza/completo"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 shadow-2xs transition-colors"
            title="Leitura consolidada contínua para IA externa"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>Leitura Completa</span>
            <ExternalLink className="w-3 h-3 text-indigo-400" />
          </Link>

          <Link
            href="/estrategia-otimizza/contexto.md"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-2xs transition-colors"
            title="Arquivo Markdown texto puro para IA"
          >
            <FileCode className="w-3.5 h-3.5 text-slate-300" />
            <span>contexto.md</span>
          </Link>

          <button
            onClick={() => {
              setNewParentId(null);
              setCreateModalOpen(true);
            }}
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Página</span>
          </button>
        </div>
      </div>

      {/* Alerta de Confidencialidade Obrigatório (Seção 8 da Solicitação) */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-2xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 leading-relaxed">
          <strong className="font-semibold block mb-0.5 text-amber-900">Aviso sobre Publicação Externa:</strong>
          Qualquer pessoa com o link poderá acessar o conteúdo publicado. Não publique senhas, dados de clientes ou informações confidenciais.
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, resumo ou slug..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Todos os status</option>
            <option value="PUBLISHED">Publicados</option>
            <option value="DRAFT">Rascunhos</option>
            <option value="ARCHIVED">Arquivados</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Todos os tipos de informação</option>
            <option value="DIRECTIVE">Diretrizes Aprovadas</option>
            <option value="HYPOTHESIS">Hipóteses em Avaliação</option>
            <option value="HISTORICAL">Registros Históricos</option>
          </select>
        </div>
      </div>

      {/* Lista / Árvore de Páginas */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Página e Hierarquia</span>
          <span className="hidden sm:inline">Status & Ações</span>
        </div>

        {filteredPages.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Nenhuma página corresponde aos filtros selecionados.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredPages.map((page) => {
              const badge = infoTypeBadges[page.info_type] || infoTypeBadges.DIRECTIVE;
              const isPublished = page.status === "PUBLISHED";
              const isArchived = page.status === "ARCHIVED";
              const isLoading = actionLoadingId === page.id;

              return (
                <div
                  key={page.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors ${
                    isArchived ? "opacity-60 bg-slate-50/40" : ""
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-100 text-slate-600 mt-0.5 shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Link
                          href={`/informacoes-otimizza/${page.id}`}
                          className="font-bold text-sm text-slate-900 hover:text-indigo-600 transition-colors truncate"
                        >
                          {page.title}
                        </Link>

                        <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>

                        {isPublished ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            Publicado
                          </span>
                        ) : isArchived ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-200 text-slate-700">
                            <Archive className="w-3 h-3" />
                            Arquivado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3" />
                            Rascunho
                          </span>
                        )}

                        {page.has_unpublished_changes && isPublished && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200">
                            Alterações pendentes
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        <span className="font-mono text-slate-500">/estrategia-otimizza/{page.slug}</span>
                        {page.parent_title && (
                          <span>• Subpágina de: <strong className="text-slate-600">{page.parent_title}</strong></span>
                        )}
                        <span>• v{page.version_count}</span>
                        {page.last_reviewed_at && (
                          <span>• Revisado em {new Date(page.last_reviewed_at).toLocaleDateString("pt-BR")}</span>
                        )}
                      </div>

                      {page.summary && (
                        <p className="text-xs text-slate-500 line-clamp-1 mt-1">
                          {page.summary}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ações da Linha */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <Link
                      href={`/informacoes-otimizza/${page.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                      title="Editar conteúdo e metadados"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </Link>

                    {isPublished && (
                      <Link
                        href={`/estrategia-otimizza/${page.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                        title="Ver página publicada externa"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Ver Externa</span>
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        setNewParentId(page.id);
                        setCreateModalOpen(true);
                      }}
                      type="button"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                      title="Adicionar subpágina a esta seção"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Subpágina</span>
                    </button>

                    <button
                      onClick={() => handleDuplicate(page.id)}
                      disabled={isLoading}
                      type="button"
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Duplicar como rascunho"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Ações de Publicar / Despublicar */}
                    {!isArchived && (
                      <>
                        {isPublished ? (
                          <button
                            onClick={() => handleUnpublish(page.id)}
                            disabled={isLoading}
                            type="button"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer"
                            title="Retirar da leitura externa"
                          >
                            <span>Retirar Publicação</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePublish(page.id)}
                            disabled={isLoading}
                            type="button"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                            title="Publicar rascunho na leitura externa"
                          >
                            <span>Publicar</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* Arquivar / Restaurar */}
                    {isArchived ? (
                      <button
                        onClick={() => handleRestore(page.id)}
                        disabled={isLoading}
                        type="button"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                        title="Restaurar página como rascunho"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restaurar</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleArchive(page.id)}
                        disabled={isLoading}
                        type="button"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Arquivar página"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Criação de Página / Subpágina */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Plus className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  {newParentId ? "Criar Nova Subpágina" : "Criar Nova Página"}
                </h2>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título da Página *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Diferenciais Competitivos"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Endereço URL (Slug opcional)
                </label>
                <input
                  type="text"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="Ex: diferenciais-competitivos (gerado automaticamente se vazio)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Informação *
                  </label>
                  <select
                    value={newInfoType}
                    onChange={(e) => setNewInfoType(e.target.value as KnowledgeInfoType)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-900"
                  >
                    <option value="DIRECTIVE">Diretriz Aprovada</option>
                    <option value="HYPOTHESIS">Hipótese em Avaliação</option>
                    <option value="HISTORICAL">Registro Histórico</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Página Pai (Hierarquia)
                  </label>
                  <select
                    value={newParentId || ""}
                    onChange={(e) => setNewParentId(e.target.value || null)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-900"
                  >
                    <option value="">Nenhuma (Página Raiz)</option>
                    {pages.filter(p => p.status !== "ARCHIVED").map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resumo Executivo (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Breve resumo da finalidade desta página para a IA e a equipe..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {creating ? "Criando..." : "Criar e Abrir Editor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
