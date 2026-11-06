"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useSearchParams } from "next/navigation";
import {
  Compass,
  Building,
  Briefcase,
  TrendingUp,
  Layers,
  CheckCircle2,
  DollarSign,
  Calendar,
  Users,
  ShieldCheck,
  FileText,
  Plus,
  Trash2,
  Edit2,
  Save,
  Download,
  AlertCircle,
  Eye,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import {
  StrategyDocumentRecord,
  StrategyGoalRecord,
  GoalComparisonResult,
  StrategyBlockRecord,
  StrategySectionRecord,
} from "@/modules/strategy/types";

function StrategyContent() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "overview";

  const [documents, setDocuments] = useState<StrategyDocumentRecord[]>([]);
  const [goals, setGoals] = useState<StrategyGoalRecord[]>([]);
  const [selectedDocCode, setSelectedDocCode] = useState<string>("DIAG-01");
  const [selectedDoc, setSelectedDoc] = useState<StrategyDocumentRecord | null>(null);
  const [goalEvaluation, setGoalEvaluation] = useState<GoalComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingBlockId, setSavingBlockId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modal para criar novo bloco
  const [newBlockModal, setNewBlockModal] = useState<{ open: boolean; sectionId: string | null }>({
    open: false,
    sectionId: null,
  });
  const [newBlockTitle, setNewBlockTitle] = useState("");
  const [newBlockType, setNewBlockType] = useState<string>("TEXT");
  const [newBlockText, setNewBlockText] = useState("");

  // Modal de exportação de PDF
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [customPdfTitle, setCustomPdfTitle] = useState("");

  // 1. Carregar lista de documentos e metas
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [docsRes, goalsRes] = await Promise.all([
        fetch("/api/strategy/documents"),
        fetch("/api/strategy/goals"),
      ]);
      const docsData = await docsRes.json();
      const goalsData = await goalsRes.json();

      setDocuments(docsData || []);
      setGoals(goalsData || []);

      // Se houver metas, avaliar a primeira (investimento em anúncios R$ 300)
      if (goalsData && goalsData.length > 0) {
        const evalRes = await fetch(`/api/strategy/goals/${goalsData[0].id}/evaluate`);
        if (evalRes.ok) {
          const evalData = await evalRes.json();
          setGoalEvaluation(evalData);
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar dados estratégicos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // 2. Carregar documento selecionado
  const loadDocumentDetails = async (code: string) => {
    try {
      const res = await fetch(`/api/strategy/documents/${code}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDoc(data);
        // Pré-selecionar todos os blocos para PDF
        const allBlockIds: string[] = [];
        data.sections?.forEach((s: StrategySectionRecord) => {
          s.blocks.forEach((b) => allBlockIds.push(b.id));
        });
        setSelectedBlockIds(allBlockIds);
        setCustomPdfTitle(data.title);
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes do documento:", err);
    }
  };

  useEffect(() => {
    if (selectedDocCode) {
      loadDocumentDetails(selectedDocCode);
    }
  }, [selectedDocCode]);

  // Atualizar bloco com debounce/salvamento imediato
  const handleUpdateBlock = async (blockId: string, updates: Partial<StrategyBlockRecord>) => {
    setSavingBlockId(blockId);
    try {
      const res = await fetch("/api/strategy/blocks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: blockId, ...updates }),
      });
      if (res.ok) {
        setFeedback("Salvo com sucesso!");
        setTimeout(() => setFeedback(null), 2000);
      }
    } catch {
      setFeedback("Erro ao salvar.");
    } finally {
      setSavingBlockId(null);
    }
  };

  // Excluir bloco
  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta caixa/bloco?")) return;
    try {
      const res = await fetch(`/api/strategy/blocks/${blockId}`, { method: "DELETE" });
      if (res.ok && selectedDoc) {
        loadDocumentDetails(selectedDoc.code);
      }
    } catch {
      alert("Erro ao excluir bloco.");
    }
  };

  // Criar novo bloco
  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockModal.sectionId || !newBlockTitle.trim()) return;

    try {
      const res = await fetch("/api/strategy/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: newBlockModal.sectionId,
          title: newBlockTitle.trim(),
          blockType: newBlockType,
          content: { text: newBlockText.trim() },
          classification: "DECLARADO",
        }),
      });
      if (res.ok && selectedDoc) {
        setNewBlockModal({ open: false, sectionId: null });
        setNewBlockTitle("");
        setNewBlockText("");
        loadDocumentDetails(selectedDoc.code);
      }
    } catch {
      alert("Erro ao adicionar bloco.");
    }
  };

  // Exportar PDF
  const handleExportPdf = async () => {
    if (!selectedDoc) return;
    try {
      const res = await fetch("/api/strategy/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: selectedDoc.code,
          customTitle: customPdfTitle,
          selectedBlockIds: selectedBlockIds,
          includeCover: true,
        }),
      });
      if (!res.ok) throw new Error("Falha ao gerar PDF.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedDoc.code}_planejamento_otimizza.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setPdfModalOpen(false);
    } catch {
      alert("Erro ao gerar PDF.");
    }
  };

  // Filtragem dos documentos por categoria
  const diagnosticoDocs = documents.filter((d) => d.category === "DIAGNOSTICO");
  const marketingDocs = documents.filter((d) => d.category === "MARKETING");

  return (
    <AppShell activeSection="strategy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* CABEÇALHO PRINCIPAL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Data & Growth
              </span>
              <span className="text-xs text-slate-400">Método Analisar &gt; Planejar &gt; Executar &gt; Otimizzar</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <Compass className="w-6 h-6 text-emerald-600" />
              Gestão Estratégica Empresarial e Marketing
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Planejamento central da Otimizza, 14 tópicos de diagnóstico, 24 tópicos de marketing e conciliação com números reais do ERP.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {feedback && (
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                {feedback}
              </span>
            )}
            <button
              onClick={() => setPdfModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar PDF Personalizado
            </button>
          </div>
        </div>

        {/* COMPARAÇÃO PLANEJADO VS REALIZADO NO ERP (CASO DE ACEITE OBRIGATÓRIO) */}
        {goalEvaluation && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-md border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-bold tracking-wide uppercase text-slate-200">
                  Conciliação Financeira com o ERP (Regime de Caixa)
                </h2>
              </div>
              <span className="text-xs text-slate-400">Meta: {goalEvaluation.name}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
                <span className="text-[11px] text-slate-400 block mb-1">Planejado</span>
                <span className="text-xl font-bold text-white">
                  R$ {goalEvaluation.plannedAmount?.toFixed(2) || "0.00"}
                </span>
              </div>
              <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
                <span className="text-[11px] text-slate-400 block mb-1">Realizado Pago no ERP</span>
                <span className="text-xl font-bold text-emerald-400">
                  R$ {goalEvaluation.actualAmount.toFixed(2)}
                </span>
              </div>
              <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
                <span className="text-[11px] text-slate-400 block mb-1">Taxa de Execução</span>
                <span className="text-xl font-bold text-amber-300">
                  {goalEvaluation.executionPercent !== null ? `${goalEvaluation.executionPercent}%` : "—"}
                </span>
              </div>
              <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
                <span className="text-[11px] text-slate-400 block mb-1">Saldo Não Executado</span>
                <span className="text-xl font-bold text-slate-300">
                  R$ {goalEvaluation.unexecutedBalance?.toFixed(2) || "0.00"}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-white/5 p-3 rounded-lg border border-white/10">
              💡 <strong>Diagnóstico Automático:</strong> {goalEvaluation.explanation}
            </p>
          </div>
        )}

        {/* CORPO DO MÓDULO COM SELEÇÃO DE TÓPICOS E EDITOR DE CAIXAS */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* COLUNA LATERAL: SELETOR DE DOCUMENTOS */}
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-emerald-600" />
                Diagnóstico do Negócio (14 Tópicos)
              </h3>
              <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                {diagnosticoDocs.map((doc) => (
                  <button
                    key={doc.code}
                    onClick={() => setSelectedDocCode(doc.code)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                      selectedDocCode === doc.code
                        ? "bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">{doc.title}</span>
                    <span className="text-[10px] text-slate-400 ml-2">{doc.status}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Planejamento de Marketing (24 Tópicos)
              </h3>
              <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                {marketingDocs.map((doc) => (
                  <button
                    key={doc.code}
                    onClick={() => setSelectedDocCode(doc.code)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                      selectedDocCode === doc.code
                        ? "bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">{doc.title}</span>
                    <span className="text-[10px] text-slate-400 ml-2">{doc.code}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ÁREA CENTRAL: DOCUMENTO ATIVO E SUAS CAIXAS EDITÁVEIS */}
          <div className="lg:col-span-3 space-y-6">
            {selectedDoc ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
                      {selectedDoc.code} · Versão {selectedDoc.currentVersion}.0
                    </span>
                    <h2 className="text-xl font-bold text-slate-900">{selectedDoc.title}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedDoc.description}</p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 w-fit">
                    Status: {selectedDoc.status}
                  </span>
                </div>

                {/* RENDERIZADOR DE SEÇÕES E BLOCOS */}
                {selectedDoc.sections?.map((section) => (
                  <div key={section.id} className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-600" />
                        {section.title}
                      </h3>
                      <button
                        onClick={() => setNewBlockModal({ open: true, sectionId: section.id })}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Caixa
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {section.blocks.map((block) => (
                        <div
                          key={block.id}
                          className={`p-4 rounded-xl border transition-all ${
                            block.classification === "PENDENTE"
                              ? "bg-amber-50/40 border-amber-200"
                              : "bg-slate-50/50 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-800 truncate pr-2">
                              {block.title}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  block.classification === "DECIDIDO"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : block.classification === "PENDENTE"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {block.classification}
                              </span>
                              <button
                                onClick={() => handleDeleteBlock(block.id)}
                                className="text-slate-400 hover:text-rose-600 p-1"
                                title="Excluir caixa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* CAMPO EDITÁVEL CONFORME O TIPO */}
                          {block.blockType === "TABLE" ? (
                            <div className="text-xs overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                                    {(block.content as any)?.columns?.map((c: string, idx: number) => (
                                      <th key={idx} className="pb-1 pr-2">
                                        {c}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(block.content as any)?.rows?.map((row: string[], rIdx: number) => (
                                    <tr key={rIdx} className="border-b border-slate-100">
                                      {row.map((cell, cIdx) => (
                                        <td key={cIdx} className="py-1.5 pr-2 text-slate-700 text-[11px]">
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : block.blockType === "LIST" ? (
                            <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4">
                              {(block.content as any)?.items?.map((item: string, idx: number) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          ) : block.blockType === "CHECKLIST" ? (
                            <div className="text-xs text-slate-700 space-y-1.5">
                              {(block.content as any)?.items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <input type="checkbox" checked={item.done} readOnly className="rounded text-emerald-600" />
                                  <span className={item.done ? "line-through text-slate-400" : ""}>{item.task}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div>
                              <textarea
                                defaultValue={String((block.content as any)?.text || "")}
                                onBlur={(e) =>
                                  handleUpdateBlock(block.id, {
                                    content: { ...(block.content as any), text: e.target.value },
                                  })
                                }
                                rows={3}
                                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 leading-relaxed"
                              />
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-[10px] text-slate-400">Clique fora para salvar</span>
                                {savingBlockId === block.id && (
                                  <span className="text-[10px] text-emerald-600 font-semibold">Salvando...</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
                Selecione um tópico na lista ao lado para visualizar e editar os campos.
              </div>
            )}
          </div>
        </div>

        {/* MODAL: ADICIONAR NOVO BLOCO */}
        {newBlockModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
              <h3 className="text-base font-bold text-slate-900 mb-4">Adicionar Nova Caixa Estratégica</h3>
              <form onSubmit={handleCreateBlock} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Título do Campo *</label>
                  <input
                    type="text"
                    required
                    value={newBlockTitle}
                    onChange={(e) => setNewBlockTitle(e.target.value)}
                    placeholder="Ex: Premissas do Canal de Mídia"
                    className="w-full text-xs p-2.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo da Caixa</label>
                  <select
                    value={newBlockType}
                    onChange={(e) => setNewBlockType(e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-lg bg-white"
                  >
                    <option value="TEXT">Texto Formatado</option>
                    <option value="CALLOUT">Caixa de Destaque / Alerta</option>
                    <option value="NUMBER">Número</option>
                    <option value="CURRENCY">Valor Monetário (BRL)</option>
                    <option value="PERCENT">Percentual (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Conteúdo Inicial</label>
                  <textarea
                    rows={3}
                    value={newBlockText}
                    onChange={(e) => setNewBlockText(e.target.value)}
                    placeholder="Escreva as diretrizes ou valores deste campo..."
                    className="w-full text-xs p-2.5 border rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setNewBlockModal({ open: false, sectionId: null })}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                  >
                    Adicionar Campo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EXPORTAR PDF PERSONALIZADO */}
        {pdfModalOpen && selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
              <h3 className="text-base font-bold text-slate-900 mb-2">Exportar Documento em PDF</h3>
              <p className="text-xs text-slate-500 mb-4">
                Selecione exatamente os campos e seções que deseja incluir no documento oficial.
              </p>

              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Título no PDF</label>
                  <input
                    type="text"
                    value={customPdfTitle}
                    onChange={(e) => setCustomPdfTitle(e.target.value)}
                    className="w-full text-xs p-2 border rounded-lg"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 border p-3 rounded-lg bg-slate-50">
                  <span className="text-xs font-semibold text-slate-700 block mb-1">Caixas Incluídas:</span>
                  {selectedDoc.sections?.map((s) =>
                    s.blocks.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedBlockIds.includes(b.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBlockIds([...selectedBlockIds, b.id]);
                            } else {
                              setSelectedBlockIds(selectedBlockIds.filter((id) => id !== b.id));
                            }
                          }}
                          className="rounded text-emerald-600"
                        />
                        <span>{b.title}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPdfModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Gerar e Baixar PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function StrategyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Carregando Gestão Estratégica...</div>}>
      <StrategyContent />
    </Suspense>
  );
}

