"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Calendar,
  Layers,
  AlertCircle,
  Clock,
  Eye,
  Plus,
} from "lucide-react";
import { DocumentRecord, DocumentEntityType } from "@/modules/documents/types";

interface DocumentAttachmentSectionProps {
  entityType: DocumentEntityType;
  entityId: string;
  entityTitle?: string;
  readOnly?: boolean;
}

export function DocumentAttachmentSection({
  entityType,
  entityId,
  entityTitle,
  readOnly = false,
}: DocumentAttachmentSectionProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [categoryId, setCategoryId] = useState("OTHER");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/documents?entityType=${entityType}&entityId=${entityId}`);
      if (!res.ok) throw new Error("Erro ao buscar documentos da entidade");
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch {
      // Falha silenciosa ou lista vazia
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entityId) {
      loadDocuments();
    }
  }, [entityId, entityType]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg("Selecione um arquivo para envio.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("title", docTitle.trim() || selectedFile.name);
        formData.append("categoryId", categoryId);
        formData.append(
          "links",
          JSON.stringify([
            {
              entityType,
              entityId,
              linkType: "ATTACHMENT",
            },
          ])
        );

        const res = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Erro ao realizar upload do arquivo.");
        }

        setSuccessMsg("Documento anexado com sucesso!");
        setSelectedFile(null);
        setDocTitle("");
        setUploadModalOpen(false);
        loadDocuments();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Erro no envio do documento.");
      }
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Documentos & Anexos
          </h3>
          <p className="text-xs text-slate-500">
            Repositório de arquivos seguros vinculados a este registro.
          </p>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              setDocTitle("");
              setErrorMsg(null);
              setUploadModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            Anexar Arquivo
          </button>
        )}
      </div>

      {successMsg && (
        <div className="mb-4 p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-200">
          {successMsg}
        </div>
      )}

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400">Carregando documentos...</div>
      ) : documents.length === 0 ? (
        <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-lg">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Nenhum documento anexado ainda.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-slate-600">
                      {doc.documentCode}
                    </span>
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {doc.title}
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">
                      v{doc.currentVersionNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                    <span>{doc.categoryName || doc.categoryId}</span>
                    <span>•</span>
                    <span>{new Date(doc.createdAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`/api/documents/${doc.id}/download`}
                  className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  title="Download do documento"
                  download
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Anexo Rápido */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h4 className="text-base font-semibold text-slate-900 mb-1">Anexar Novo Arquivo</h4>
            <p className="text-xs text-slate-500 mb-4">
              Vincular documento a {entityTitle || "este registro"}.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Arquivo *</label>
                <input
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setSelectedFile(f);
                    if (f && !docTitle) {
                      setDocTitle(f.name.replace(/\.[^/.]+$/, ""));
                    }
                  }}
                  required
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-lg p-1.5"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Título do Documento
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Ex: Contrato Assinado, Comprovante de Pagamento"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Categoria</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="PROPOSAL">Proposta Comercial</option>
                  <option value="CONTRACT">Contrato / Assinatura</option>
                  <option value="REGISTRATION">Documento Cadastral</option>
                  <option value="RECEIPT">Comprovante Financeiro</option>
                  <option value="INVOICE">Nota Fiscal / Fatura</option>
                  <option value="REPORT">Relatório / Parecer</option>
                  <option value="BRIEFING">Briefing</option>
                  <option value="PROJECT_ASSET">Material de Projeto</option>
                  <option value="OTHER">Outros</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !selectedFile}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isPending ? "Enviando..." : "Salvar Anexo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
