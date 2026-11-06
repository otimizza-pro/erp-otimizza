"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  FileText,
  Upload,
  Download,
  Search,
  Filter,
  Plus,
  History,
  Tag,
  Calendar,
  Layers,
  AlertCircle,
  CheckCircle2,
  X,
  FileCheck,
  ShieldCheck,
  Trash2,
  ExternalLink,
  Info,
  PenTool,
} from "lucide-react";
import {
  DocumentRecord,
  DocumentCategoryRecord,
  DocumentVersionRecord,
  DocumentLinkRecord,
  DocumentEventRecord,
} from "@/modules/documents/types";

function DocumentsMainContent() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [categories, setCategories] = useState<DocumentCategoryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  // Modais
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [versionModalDoc, setVersionModalDoc] = useState<DocumentRecord | null>(null);
  const [detailModalDoc, setDetailModalDoc] = useState<DocumentRecord | null>(null);

  // Formulário Novo Documento
  const [creationMode, setCreationMode] = useState<"UPLOAD" | "WRITE">("UPLOAD");
  const [textContent, setTextContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("OTHER");
  const [newTags, setNewTags] = useState("");
  const [newIssueDate, setNewIssueDate] = useState("");
  const [newExpirationDate, setNewExpirationDate] = useState("");

  // Formulário Nova Versão
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionReason, setVersionReason] = useState("");

  // Estados de feedback
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/documents/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch {
      // Ignora erro
    }
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (selectedCategory !== "ALL") params.set("categoryId", selectedCategory);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/documents?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao carregar documentos.");
      const data = await res.json();
      setDocuments(data.documents || []);
      setTotal(data.total || 0);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro na busca de documentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [search, selectedCategory, statusFilter]);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creationMode === "UPLOAD" && !selectedFile) {
      setErrorMsg("Selecione um arquivo para upload.");
      return;
    }
    if (creationMode === "WRITE" && !newTitle.trim()) {
      setErrorMsg("Informe o título do documento.");
      return;
    }
    if (creationMode === "WRITE" && !textContent.trim()) {
      setErrorMsg("Escreva o conteúdo do documento.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        let res: Response;

        if (creationMode === "WRITE") {
          res = await fetch("/api/documents", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: newTitle.trim(),
              description: newDescription.trim(),
              categoryId: newCategory,
              tags: newTags.trim() ? newTags.split(",").map((t) => t.trim()).filter(Boolean) : [],
              issueDate: newIssueDate || undefined,
              expirationDate: newExpirationDate || undefined,
              textContent: textContent.trim(),
            }),
          });
        } else {
          const formData = new FormData();
          if (selectedFile) {
            formData.append("file", selectedFile);
            formData.append("title", newTitle.trim() || selectedFile.name);
          }
          formData.append("description", newDescription.trim());
          formData.append("categoryId", newCategory);
          if (newTags.trim()) formData.append("tags", newTags.trim());
          if (newIssueDate) formData.append("issueDate", newIssueDate);
          if (newExpirationDate) formData.append("expirationDate", newExpirationDate);

          res = await fetch("/api/documents", {
            method: "POST",
            body: formData,
          });
        }

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Erro ao salvar documento.");
        }

        setSuccessMsg(
          creationMode === "WRITE"
            ? "Documento escrito e salvo com sucesso no repositório!"
            : "Documento cadastrado e armazenado com sucesso!"
        );
        setUploadModalOpen(false);
        setSelectedFile(null);
        setTextContent("");
        setCreationMode("UPLOAD");
        setNewTitle("");
        setNewDescription("");
        setNewTags("");
        setNewIssueDate("");
        setNewExpirationDate("");
        loadDocuments();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar documento.");
      }
    });
  };

  const handleAddVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionModalDoc || !versionFile) {
      setErrorMsg("Selecione o arquivo da nova versão.");
      return;
    }
    if (!versionReason.trim()) {
      setErrorMsg("A justificativa da nova versão é obrigatória.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", versionFile);
        formData.append("reasonForChange", versionReason.trim());

        const res = await fetch(`/api/documents/${versionModalDoc.id}/versions`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Erro ao adicionar nova versão.");
        }

        setSuccessMsg(`Nova versão adicionada ao documento ${versionModalDoc.documentCode}!`);
        setVersionModalDoc(null);
        setVersionFile(null);
        setVersionReason("");
        loadDocuments();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Erro ao atualizar versão.");
      }
    });
  };

  const handleArchive = async (doc: DocumentRecord) => {
    if (!window.confirm(`Deseja realmente arquivar o documento ${doc.documentCode}? O histórico de versões permanecerá preservado.`)) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/documents/${doc.id}?reason=Arquivado pelo usuário`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Erro ao arquivar documento.");
        setSuccessMsg(`Documento ${doc.documentCode} arquivado com sucesso.`);
        loadDocuments();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Erro ao arquivar.");
      }
    });
  };

  const openDetails = async (doc: DocumentRecord) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}`);
      if (res.ok) {
        const fullDoc = await res.json();
        setDetailModalDoc(fullDoc);
      } else {
        setDetailModalDoc(doc);
      }
    } catch {
      setDetailModalDoc(doc);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <FileText className="w-7 h-7 text-indigo-600" />
              Gestão Documental
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Repositório centralizado e auditado de arquivos, contratos, comprovantes e propostas.
            </p>
          </div>

          <button
            onClick={() => {
              setSelectedFile(null);
              setNewTitle("");
              setNewDescription("");
              setErrorMsg(null);
              setUploadModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Novo Documento
          </button>
        </div>

        {/* Alertas */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)}>
              <X className="w-4 h-4 text-rose-500" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)}>
              <X className="w-4 h-4 text-emerald-500" />
            </button>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, título ou descrição..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ACTIVE">Ativos</option>
              <option value="ARCHIVED">Arquivados</option>
              <option value="ALL">Todos os Status</option>
            </select>
          </div>
        </div>

        {/* Tabela de Documentos */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Carregando documentos...</div>
          ) : documents.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-700">Nenhum documento encontrado</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Utilize o botão &quot;Novo Documento&quot; para enviar contratos, comprovantes ou relatórios ao repositório.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Título / Arquivo</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Versão</th>
                    <th className="py-3 px-4">Data Emissão</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700">
                        {doc.documentCode}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">{doc.title}</div>
                        {doc.description && (
                          <div className="text-xs text-slate-500 truncate max-w-xs">{doc.description}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {doc.categoryName || doc.categoryId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700">
                          v{doc.currentVersionNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {doc.issueDate ? new Date(doc.issueDate + "T12:00:00Z").toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            doc.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {doc.status === "ACTIVE" ? "Ativo" : "Arquivado"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`/api/documents/${doc.id}/download`}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            title="Download do documento"
                            download
                          >
                            <Download className="w-4 h-4" />
                          </a>

                          <button
                            onClick={() => {
                              setVersionModalDoc(doc);
                              setVersionFile(null);
                              setVersionReason("");
                            }}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            title="Adicionar nova versão"
                          >
                            <Plus className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => openDetails(doc)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            title="Ver histórico e vínculos"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {doc.status === "ACTIVE" && (
                            <button
                              onClick={() => handleArchive(doc)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Arquivar documento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Novo Documento */}
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  {creationMode === "UPLOAD" ? (
                    <Upload className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <PenTool className="w-5 h-5 text-indigo-600" />
                  )}
                  {creationMode === "UPLOAD" ? "Upload de Novo Documento" : "Escrever Novo Documento"}
                </h3>
                <button
                  onClick={() => setUploadModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Seletor de Modo: Upload vs Escrever */}
              <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                <button
                  type="button"
                  onClick={() => setCreationMode("UPLOAD")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-md transition-colors ${
                    creationMode === "UPLOAD"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload de Arquivo
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode("WRITE")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-md transition-colors ${
                    creationMode === "WRITE"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  Escrever Documento
                </button>
              </div>

              <form onSubmit={handleCreateDocument} className="space-y-4">
                {creationMode === "UPLOAD" ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Arquivo do Documento *
                    </label>
                    <input
                      type="file"
                      required
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setSelectedFile(f);
                        if (f && !newTitle) {
                          setNewTitle(f.name.replace(/\.[^/.]+$/, ""));
                        }
                      }}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-lg p-1.5"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Formatos suportados: PDF, DOCX, XLSX, PNG, JPG, ZIP (máx. 25MB).
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Conteúdo do Documento *
                      </label>
                      <span className="text-[10px] text-slate-400">Suporta formatação Markdown</span>
                    </div>
                    <textarea
                      rows={8}
                      required
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="# Título do Documento&#10;&#10;Escreva o documento aqui com cláusulas, observações, requisitos, estratégias ou notas..."
                      className="w-full font-mono text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Título *</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Contrato de Prestação de Serviços"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Categoria *
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data de Emissão
                    </label>
                    <input
                      type="date"
                      value={newIssueDate}
                      onChange={(e) => setNewIssueDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="Ex: marketing, contrato, 2026, cliente-alfa"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descrição / Observações
                  </label>
                  <textarea
                    rows={2}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Breve resumo sobre o conteúdo deste documento..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || (creationMode === "UPLOAD" ? !selectedFile : (!textContent.trim() || !newTitle.trim()))}
                    className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isPending ? "Gravando Documento..." : "Salvar no Repositório"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Adicionar Versão */}
        {versionModalDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900">
                  Nova Versão ({versionModalDoc.documentCode})
                </h3>
                <button
                  onClick={() => setVersionModalDoc(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-4">
                Você está adicionando a <strong>versão {versionModalDoc.currentVersionNumber + 1}</strong> para o documento &quot;{versionModalDoc.title}&quot;. As versões anteriores permanecerão intactas.
              </p>

              <form onSubmit={handleAddVersion} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Novo Arquivo *
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-lg p-1.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Motivo / Justificativa da Alteração *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={versionReason}
                    onChange={(e) => setVersionReason(e.target.value)}
                    placeholder="Ex: Assinatura adicionada pelo cliente; Correção de cláusula de vigência."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setVersionModalDoc(null)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !versionFile}
                    className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isPending ? "Processando..." : "Registrar Nova Versão"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Histórico e Detalhes */}
        {detailModalDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="font-mono text-xs font-semibold text-indigo-600">
                    {detailModalDoc.documentCode}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{detailModalDoc.title}</h3>
                </div>
                <button
                  onClick={() => setDetailModalDoc(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Histórico de Versões */}
              <div className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Versões Imutáveis Registradas
                </h4>

                <div className="space-y-2">
                  {detailModalDoc.versions?.map((v) => (
                    <div
                      key={v.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-700 rounded">
                            v{v.versionNumber}
                          </span>
                          <span className="text-xs font-semibold text-slate-800">
                            {v.originalFilename}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            ({(v.fileSizeBytes / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        {v.reasonForChange && (
                          <p className="text-xs text-slate-600 mt-1">
                            Motivo: {v.reasonForChange}
                          </p>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          SHA-256: {v.sha256Hash}
                        </div>
                      </div>

                      <a
                        href={`/api/documents/${detailModalDoc.id}/download?version=${v.versionNumber}`}
                        download
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 bg-white border border-indigo-200 rounded hover:bg-indigo-50 transition-colors shadow-xs"
                      >
                        <Download className="w-3 h-3" />
                        Baixar
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vínculos */}
              <div className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                  Entidades de Negócio Vinculadas
                </h4>

                {detailModalDoc.links && detailModalDoc.links.length > 0 ? (
                  <div className="space-y-1.5">
                    {detailModalDoc.links.map((lnk) => (
                      <div
                        key={lnk.id}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">{lnk.entityType}</span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {lnk.entityId}
                          </span>
                        </div>
                        <span className="text-slate-500 text-[11px]">{lnk.linkType}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Nenhum vínculo externo registrado.</p>
                )}
              </div>

              {/* Timeline de Auditoria */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-600" />
                  Trilha de Auditoria do Documento
                </h4>

                <div className="space-y-2 border-l-2 border-slate-200 pl-3">
                  {detailModalDoc.events?.map((ev) => (
                    <div key={ev.id} className="text-xs">
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        <span>{ev.eventType}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {new Date(ev.createdAt).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px]">Por: {ev.actorName || "Sistema"}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4 mt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDetailModalDoc(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="p-8 text-center text-slate-500">
            Carregando repositório de documentos...
          </div>
        </AppShell>
      }
    >
      <DocumentsMainContent />
    </Suspense>
  );
}
