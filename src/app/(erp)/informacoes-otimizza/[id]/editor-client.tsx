"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KnowledgePage, KnowledgeInfoType, KnowledgePageVersion } from "@/modules/knowledge/types";
import { TiptapEditor } from "./tiptap-editor";
import {
  ArrowLeft,
  Save,
  Globe,
  Eye,
  History,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Tag as TagIcon,
  Calendar,
  Settings,
  Layers,
  FileText,
  X,
  Copy,
  Check,
  Compass
} from "lucide-react";

interface Props {
  initialPage: KnowledgePage;
  allPages: KnowledgePage[];
}

export function KnowledgeEditorClient({ initialPage, allPages }: Props) {
  const router = useRouter();
  const [page, setPage] = useState<KnowledgePage>(initialPage);

  // Estados dos campos do formulário
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [parentId, setParentId] = useState<string | null>(page.parent_id);
  const [infoType, setInfoType] = useState<KnowledgeInfoType>(page.info_type);
  const [summary, setSummary] = useState(page.summary || "");
  const [tagsInput, setTagsInput] = useState(page.tags?.join(", ") || "");
  const [lastReviewedAt, setLastReviewedAt] = useState(
    page.last_reviewed_at ? page.last_reviewed_at.split("T")[0] : ""
  );
  const [nextReviewAt, setNextReviewAt] = useState(
    page.next_review_at ? page.next_review_at.split("T")[0] : ""
  );

  // Conteúdo do editor
  const [currentHtml, setCurrentHtml] = useState(page.draft_content_html || "<p></p>");
  const [currentJson, setCurrentJson] = useState(page.draft_content_json || {});

  // Flags de controle
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Painéis auxiliares
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [showMetadataPanel, setShowMetadataPanel] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Histórico de versões
  const [versions, setVersions] = useState<KnowledgePageVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Detecção de alterações
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const loadVersions = async () => {
    try {
      setLoadingVersions(true);
      const res = await fetch(`/api/knowledge/${page.id}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
      }
    } catch (err) {
      console.error("Erro ao carregar versões:", err);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleEditorChange = (html: string, json: Record<string, unknown>) => {
    setCurrentHtml(html);
    setCurrentJson(json);
    setIsDirty(true);
  };

  const parseTags = () => {
    return tagsInput
      .split(",")
      .map(t => t.trim())
      .filter(t => t.length > 0);
  };

  // Salvar rascunho
  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await fetch(`/api/knowledge/${page.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          parent_id: parentId || null,
          info_type: infoType,
          summary: summary.trim() || null,
          tags: parseTags(),
          last_reviewed_at: lastReviewedAt ? new Date(lastReviewedAt).toISOString() : null,
          next_review_at: nextReviewAt ? new Date(nextReviewAt).toISOString() : null,
          draft_content_html: currentHtml,
          draft_content_json: currentJson,
          expected_updated_at: page.updated_at
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar rascunho.");
      }

      setPage(data.page);
      setIsDirty(false);
      setSuccessMessage("Rascunho salvo com sucesso.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Erro desconhecido ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  // Publicar alterações
  const handlePublish = async () => {
    if (!confirm("Confirmar a publicação desta página na área externa pública? O conteúdo ficará acessível sem login.")) {
      return;
    }

    try {
      setPublishing(true);
      setErrorMessage(null);

      // Primeiro salva as alterações pendentes se houver
      if (isDirty) {
        await handleSaveDraft();
      }

      const res = await fetch(`/api/knowledge/${page.id}/publish`, {
        method: "POST"
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao publicar página.");
      }

      setPage(data.page);
      setIsDirty(false);
      setSuccessMessage("Página publicada com sucesso na área externa!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao publicar.");
    } finally {
      setPublishing(false);
    }
  };

  // Retirar publicação
  const handleUnpublish = async () => {
    if (!confirm("Atenção: Ao retirar a publicação, esta página e todas as suas subpáginas deixarão de ser públicas. Deseja continuar?")) {
      return;
    }

    try {
      setPublishing(true);
      setErrorMessage(null);

      const res = await fetch(`/api/knowledge/${page.id}/unpublish`, {
        method: "POST"
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao retirar publicação.");
      }

      setPage(data.page);
      setSuccessMessage("Publicação retirada. A página agora é apenas um rascunho interno.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao despublicar.");
    } finally {
      setPublishing(false);
    }
  };

  // Restaurar versão anterior
  const handleRestoreVersion = async (versionNum: number) => {
    if (!confirm(`Restaurar a versão v${versionNum} como rascunho atual? Suas alterações não salvas serão substituídas.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/knowledge/${page.id}/versions/${versionNum}/restore`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao restaurar versão.");
      }

      setPage(data.page);
      setTitle(data.page.title);
      setSlug(data.page.slug);
      setSummary(data.page.summary || "");
      setInfoType(data.page.info_type);
      setTagsInput(data.page.tags?.join(", ") || "");
      setCurrentHtml(data.page.draft_content_html);
      setCurrentJson(data.page.draft_content_json);
      setIsDirty(false);
      setShowHistoryDrawer(false);
      setSuccessMessage(`Versão v${versionNum} restaurada como rascunho!`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao restaurar versão.");
    }
  };

  const isPublished = page.status === "PUBLISHED";
  const eligibleParents = allPages.filter(p => p.id !== page.id && p.status !== "ARCHIVED");

  return (
    <div className="space-y-6">
      {/* Barra de Navegação Superior do Editor */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/informacoes-otimizza"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Voltar à lista de páginas"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setIsDirty(true);
                }}
                className="text-base sm:text-lg font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 py-0.5 rounded transition-colors"
                placeholder="Título da página..."
              />

              {isPublished ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-md bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  Publicado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-md bg-amber-100 text-amber-800">
                  <Clock className="w-3 h-3" />
                  Rascunho
                </span>
              )}

              {(isDirty || (page.has_unpublished_changes && isPublished)) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {isDirty ? "Alterações não salvas" : "Alterações não publicadas"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>/estrategia-otimizza/{slug}</span>
              <span>• v{page.version_count}</span>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Alternador Editor / Preview */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("editor")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === "editor" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === "preview" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pré-visualização
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowMetadataPanel(!showMetadataPanel)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              showMetadataPanel ? "bg-slate-200 border-slate-300 text-slate-900" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
            title="Configurações e Metadados para IA"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Metadados</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowHistoryDrawer(true);
              loadVersions();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            title="Histórico de versões e restauração"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Histórico</span>
          </button>

          {isPublished && (
            <Link
              href={`/estrategia-otimizza/${page.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
              title="Abrir página externa pública"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>Ver no Ar</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>
          )}

          {/* Salvar Rascunho */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-slate-600" />
            <span>{saving ? "Salvando..." : "Salvar Rascunho"}</span>
          </button>

          {/* Publicar ou Despublicar */}
          {isPublished ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                title="Atualizar conteúdo público com as alterações do rascunho"
              >
                <span>{publishing ? "Atualizando..." : "Atualizar Publicação"}</span>
              </button>
              <button
                type="button"
                onClick={handleUnpublish}
                disabled={publishing}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                title="Retirar do ar"
              >
                Despublicar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{publishing ? "Publicando..." : "Publicar Página"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mensagens de Feedback */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Painel de Metadados e Contexto para IA (Expansível) */}
      {showMetadataPanel && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Metadados para Contexto da IA Externa</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowMetadataPanel(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Endereço URL (Slug público) *
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Ao alterar o slug, redirecionamentos automáticos são criados para manter os links antigos.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Informação (Contexto Editorial) *
              </label>
              <select
                value={infoType}
                onChange={(e) => {
                  setInfoType(e.target.value as KnowledgeInfoType);
                  setIsDirty(true);
                }}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="DIRECTIVE">Diretriz Aprovada (Oficial)</option>
                <option value="HYPOTHESIS">Hipótese em Avaliação (Em Teste)</option>
                <option value="HISTORICAL">Registro Histórico (Decisão Anterior)</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Permite à IA distinguir regras oficiais vigentes de ideias em teste e decisões passadas.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Página Pai (Hierarquia sem ciclos)
              </label>
              <select
                value={parentId || ""}
                onChange={(e) => {
                  setParentId(e.target.value || null);
                  setIsDirty(true);
                }}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Nenhuma (Página Raiz)</option>
                {eligibleParents.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Resumo Executivo (Contextualização Rápida)
              </label>
              <textarea
                rows={2}
                value={summary}
                onChange={(e) => {
                  setSummary(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Breve resumo desta página para a IA e a equipe..."
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tags (Separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => {
                    setTagsInput(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="marca, posicionamento, regras"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Última Revisão
                  </label>
                  <input
                    type="date"
                    value={lastReviewedAt}
                    onChange={(e) => {
                      setLastReviewedAt(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Próxima Revisão
                  </label>
                  <input
                    type="date"
                    value={nextReviewAt}
                    onChange={(e) => {
                      setNextReviewAt(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Área Principal: Editor ou Pré-visualização */}
      {activeTab === "editor" ? (
        <TiptapEditor
          pageId={page.id}
          initialContent={currentHtml}
          onChange={handleEditorChange}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <span className="text-xs text-indigo-600 font-semibold uppercase tracking-wider block mb-1">
                Pré-visualização Autenticada
              </span>
              <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
            </div>
            <span className="text-xs text-slate-400 italic">
              Visualização exata de como a página será renderizada ao publicar
            </span>
          </div>

          {summary && (
            <p className="text-sm text-slate-600 italic bg-slate-50 p-4 rounded-lg border-l-4 border-indigo-500">
              {summary}
            </p>
          )}

          <div
            className="prose prose-slate max-w-none text-slate-800 leading-relaxed
                       prose-headings:text-slate-900 prose-headings:font-bold
                       prose-a:text-indigo-600
                       prose-table:border-collapse prose-table:w-full prose-table:border prose-table:border-slate-200
                       prose-th:bg-slate-100 prose-th:p-2.5 prose-th:text-left prose-th:border prose-th:border-slate-200
                       prose-td:p-2.5 prose-td:border prose-td:border-slate-200"
            dangerouslySetInnerHTML={{ __html: currentHtml }}
          />
        </div>
      )}

      {/* Gaveta Lateral de Histórico de Versões */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-2xs">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 p-6 flex flex-col space-y-4 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Histórico de Versões</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Cada salvamento ou publicação gera um snapshot imutável. Você pode restaurar qualquer versão anterior como rascunho atual.
            </p>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loadingVersions ? (
                <div className="p-8 text-center text-xs text-slate-400">Carregando versões...</div>
              ) : versions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Nenhuma versão anterior registrada.</div>
              ) : (
                versions.map((ver) => (
                  <div key={ver.id} className="py-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">v{ver.version_number}</span>
                        {ver.is_published_snapshot && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Publicação Oficial
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(ver.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 italic">
                      {ver.change_summary || "Alteração de conteúdo"}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        {ver.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRestoreVersion(ver.version_number)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restaurar</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
