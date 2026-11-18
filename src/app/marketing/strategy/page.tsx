"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { useCompany } from "@/lib/context/company-context";
import {
  Compass,
  Building,
  Briefcase,
  TrendingUp,
  Layers,
  CheckCircle2,
  DollarSign,
  Target,
  ShieldCheck,
  Sparkles,
  Edit2,
  Check,
  X,
  Plus,
  Trash2,
  Download,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  UnifiedStrategyHeadline,
  UnifiedStrategySection,
  UnifiedStrategyBlock,
} from "@/app/api/strategy/unified/route";

const CLASSIFICATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  DECIDIDO: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  DECLARADO: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  HIPOTESE: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  RECOMENDACAO: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  PENDENTE: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

export default function UnifiedStrategyPage() {
  const { selectedCompany, selectOtimizza } = useCompany();

  const [headlines, setHeadlines] = useState<UnifiedStrategyHeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeHeadlineId, setActiveHeadlineId] = useState<string>("headline_diagnosis");
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [savingBlock, setSavingBlock] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modal para criar novo bloco
  const [newBlockModal, setNewBlockModal] = useState<{ open: boolean; sectionId: string | null }>({
    open: false,
    sectionId: null,
  });
  const [newBlockTitle, setNewBlockTitle] = useState("");
  const [newBlockType, setNewBlockType] = useState("TEXT");
  const [newBlockText, setNewBlockText] = useState("");
  const [creatingBlock, setCreatingBlock] = useState(false);

  const loadStrategy = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/strategy/unified?companyId=${selectedCompany.id}`);
      if (res.ok) {
        const json = await res.json();
        setHeadlines(json.headlines || []);
      }
    } catch (err) {
      console.error("Erro ao carregar estratégia:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany.id]);

  useEffect(() => {
    loadStrategy();
  }, [loadStrategy]);

  // Salvar edição de um bloco
  const handleStartEdit = (block: UnifiedStrategyBlock) => {
    setEditingBlockId(block.id);
    setEditTitle(block.title);
    setEditText(
      block.content?.text || (Array.isArray(block.content?.list) ? block.content.list.join("\n") : "")
    );
  };

  const handleSaveEdit = async (block: UnifiedStrategyBlock) => {
    setSavingBlock(true);
    try {
      const isList = block.blockType === "LIST";
      const payloadContent = isList
        ? { list: editText.split("\n").filter((l) => l.trim().length > 0) }
        : { text: editText };

      const res = await fetch("/api/strategy/blocks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: block.id,
          title: editTitle,
          content: payloadContent,
        }),
      });

      if (res.ok) {
        setFeedback("Bloco salvo com sucesso!");
        setTimeout(() => setFeedback(null), 2500);

        // Atualizar estado local
        setHeadlines((prev) =>
          prev.map((h) => ({
            ...h,
            sections: h.sections.map((s) => ({
              ...s,
              blocks: s.blocks.map((b) =>
                b.id === block.id ? { ...b, title: editTitle, content: payloadContent } : b
              ),
            })),
          }))
        );
        setEditingBlockId(null);
      } else {
        alert("Erro ao salvar alterações no bloco.");
      }
    } catch {
      alert("Falha de rede ao salvar bloco.");
    } finally {
      setSavingBlock(false);
    }
  };

  // Excluir bloco
  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta diretriz/bloco?")) return;
    try {
      const res = await fetch(`/api/strategy/blocks/${blockId}`, { method: "DELETE" });
      if (res.ok) {
        setHeadlines((prev) =>
          prev.map((h) => ({
            ...h,
            sections: h.sections.map((s) => ({
              ...s,
              blocks: s.blocks.filter((b) => b.id !== blockId),
            })),
          }))
        );
        setFeedback("Bloco removido!");
        setTimeout(() => setFeedback(null), 2000);
      }
    } catch {
      alert("Erro ao excluir bloco.");
    }
  };

  // Criar novo bloco em uma seção
  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockModal.sectionId || !newBlockTitle.trim()) return;

    setCreatingBlock(true);
    try {
      const res = await fetch("/api/strategy/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: newBlockModal.sectionId,
          title: newBlockTitle,
          blockType: newBlockType,
          content: { text: newBlockText },
          classification: "DECIDIDO",
        }),
      });

      if (res.ok) {
        setNewBlockModal({ open: false, sectionId: null });
        setNewBlockTitle("");
        setNewBlockText("");
        loadStrategy();
      } else {
        alert("Erro ao criar novo bloco.");
      }
    } catch {
      alert("Falha ao criar bloco.");
    } finally {
      setCreatingBlock(false);
    }
  };

  const getHeadlineIcon = (iconName: string) => {
    switch (iconName) {
      case "Building":
        return Building;
      case "Briefcase":
        return Briefcase;
      case "TrendingUp":
        return TrendingUp;
      case "Layers":
        return Layers;
      case "CheckCircle2":
        return CheckCircle2;
      case "DollarSign":
        return DollarSign;
      case "Target":
        return Target;
      case "ShieldCheck":
        return ShieldCheck;
      default:
        return Compass;
    }
  };

  return (
    <AppShell activeSection="MARKETING & GROWTH">
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Top Header Card */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                Marketing & Growth
              </span>
              <span className="text-xs text-zinc-400">•</span>
              <span className="text-xs font-semibold text-zinc-600 flex items-center gap-1">
                Empresa em Foco:
                <strong className="text-zinc-950 font-bold ml-1">{selectedCompany.name}</strong>
                {selectedCompany.isOtimizza && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">
                    Padrão
                  </span>
                )}
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-zinc-950 flex items-center gap-2">
              <Compass className="w-6 h-6 text-purple-600" />
              Estratégia da Empresa
            </h1>

            <p className="text-xs text-zinc-500 max-w-3xl leading-relaxed">
              Painel Estratégico Unificado com visão integrada de Diagnóstico, Negócio, Growth, Ferramentas,
              Objetivos, Orçamentos, Concorrentes e Decisões da <strong>{selectedCompany.name}</strong> em uma única tela.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedCompany.isOtimizza && (
              <Link
                href="/estrategia-otimizza"
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-zinc-300 hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-semibold transition"
                title="Abrir página pública de alinhamento com IA"
              >
                <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                Página Pública / IA
              </Link>
            )}

            <button
              type="button"
              onClick={loadStrategy}
              disabled={loading}
              className="p-2 border border-zinc-300 hover:bg-zinc-50 text-zinc-700 rounded-xl transition"
              title="Recarregar Estratégia"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-600" : ""}`} />
            </button>
          </div>
        </div>

        {feedback && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {feedback}
          </div>
        )}

        {/* Barra de Navegação Rápida entre Headlines (Sticky Pill Bar) */}
        <div className="sticky top-2 z-20 bg-white/95 backdrop-blur-md border border-zinc-200 rounded-2xl p-2 shadow-sm flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
          {headlines.map((h, idx) => {
            const Icon = getHeadlineIcon(h.iconName);
            const isActive = activeHeadlineId === h.id;

            return (
              <a
                key={h.id}
                href={`#${h.id}`}
                onClick={() => setActiveHeadlineId(h.id)}
                className={`px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? "bg-zinc-950 text-white shadow-2xs font-bold"
                    : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-purple-300" : "text-zinc-400"}`} />
                <span>{h.title.split(". ")[1] || h.title}</span>
              </a>
            );
          })}
        </div>

        {/* Conteúdo Principal com todas as divisões de Headlines em Uma Tela Só */}
        {loading ? (
          <div className="p-20 text-center bg-white rounded-2xl border border-zinc-200 text-xs text-zinc-500 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600" />
            <p className="font-semibold text-zinc-700">Carregando diretrizes estratégicas unificadas...</p>
          </div>
        ) : headlines.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-zinc-200 text-xs text-zinc-400 space-y-3">
            <Info className="w-8 h-8 text-zinc-400 mx-auto" />
            <p className="font-semibold text-zinc-700">Nenhuma diretriz estratégica encontrada para esta empresa.</p>
            <button
              onClick={selectOtimizza}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-950 text-white rounded-xl font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Carregar Padrão da Otimizza Growth
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {headlines.map((headline, hIndex) => {
              const Icon = getHeadlineIcon(headline.iconName);

              return (
                <section
                  key={headline.id}
                  id={headline.id}
                  className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden shadow-2xs scroll-mt-20"
                >
                  {/* Headline Header Banner */}
                  <div className="p-5 border-b border-zinc-100 bg-gradient-to-r from-zinc-50/90 via-white to-purple-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-purple-100/70 text-purple-700 border border-purple-200/80 shrink-0 mt-0.5">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-extrabold text-zinc-950 tracking-tight">
                            {headline.title}
                          </h2>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 uppercase">
                            {headline.category}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{headline.subtitle}</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold text-zinc-400 self-start sm:self-auto">
                      {headline.sections.length} {headline.sections.length === 1 ? "seção" : "seções"}
                    </span>
                  </div>

                  {/* Headline Body: Seções e Blocos */}
                  <div className="p-6 space-y-8">
                    {headline.sections.length === 0 ? (
                      <div className="py-6 text-center text-xs text-zinc-400">
                        Nenhum bloco cadastrado nesta headline para esta empresa.
                      </div>
                    ) : (
                      headline.sections.map((section) => (
                        <div key={section.id} className="space-y-4">
                          {/* Título da Seção */}
                          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                            <div>
                              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wide flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 inline-block" />
                                {section.title}
                              </h3>
                              {section.description && (
                                <p className="text-[11px] text-zinc-400 mt-0.5">{section.description}</p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => setNewBlockModal({ open: true, sectionId: section.id })}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-lg transition"
                            >
                              <Plus className="w-3 h-3" /> Adicionar Bloco
                            </button>
                          </div>

                          {/* Grid de Blocos da Seção */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {section.blocks.map((block) => {
                              const isEditing = editingBlockId === block.id;
                              const classColors =
                                CLASSIFICATION_COLORS[block.classification] || CLASSIFICATION_COLORS.DECLARADO;

                              return (
                                <div
                                  key={block.id}
                                  className={`rounded-xl border transition-all flex flex-col justify-between p-4 ${
                                    isEditing
                                      ? "bg-purple-50/40 border-purple-300 ring-2 ring-purple-400/20 shadow-md"
                                      : "bg-zinc-50/60 hover:bg-white border-zinc-200/80 shadow-2xs hover:shadow-xs"
                                  }`}
                                >
                                  {/* Cabeçalho do Bloco */}
                                  <div>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      {isEditing ? (
                                        <input
                                          type="text"
                                          value={editTitle}
                                          onChange={(e) => setEditTitle(e.target.value)}
                                          className="w-full text-xs font-bold text-zinc-950 bg-white border border-purple-300 rounded px-2 py-1 focus:outline-none"
                                        />
                                      ) : (
                                        <h4 className="text-xs font-bold text-zinc-900 leading-tight">
                                          {block.title}
                                        </h4>
                                      )}

                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 uppercase tracking-wider ${classColors.bg} ${classColors.text} ${classColors.border}`}
                                      >
                                        {block.classification}
                                      </span>
                                    </div>

                                    {/* Conteúdo do Bloco */}
                                    {isEditing ? (
                                      <textarea
                                        rows={4}
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        className="w-full text-xs text-zinc-800 bg-white border border-purple-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                                        placeholder="Conteúdo textual ou lista separada por linha..."
                                      />
                                    ) : (
                                      <div className="text-xs text-zinc-700 leading-relaxed pt-1">
                                        {block.content?.list && Array.isArray(block.content.list) ? (
                                          <ul className="space-y-1 pl-1">
                                            {block.content.list.map((item, i) => (
                                              <li key={i} className="flex items-start gap-1.5 text-zinc-800">
                                                <span className="text-purple-600 font-bold">•</span>
                                                <span>{item}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <p className="whitespace-pre-line text-zinc-800">
                                            {block.content?.text || "Sem conteúdo registrado."}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Rodapé e Ações do Bloco */}
                                  <div className="flex items-center justify-between border-t border-zinc-200/70 pt-2.5 mt-3 text-[10px] text-zinc-400">
                                    <span className="font-mono uppercase">{block.blockType}</span>

                                    <div className="flex items-center gap-1">
                                      {isEditing ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => setEditingBlockId(null)}
                                            disabled={savingBlock}
                                            className="p-1 hover:bg-zinc-200 text-zinc-600 rounded transition"
                                            title="Cancelar"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleSaveEdit(block)}
                                            disabled={savingBlock}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-[10px] font-bold transition shadow-xs"
                                          >
                                            {savingBlock ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                            Salvar
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => handleStartEdit(block)}
                                            className="p-1 hover:bg-zinc-200/80 text-zinc-500 hover:text-zinc-900 rounded transition"
                                            title="Editar Bloco"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteBlock(block.id)}
                                            className="p-1 hover:bg-rose-100 text-zinc-400 hover:text-rose-600 rounded transition"
                                            title="Excluir Bloco"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Modal de Criar Novo Bloco */}
        {newBlockModal.open && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
                <h3 className="font-bold text-zinc-900 text-sm">Adicionar Nova Diretriz / Bloco</h3>
                <button
                  type="button"
                  onClick={() => setNewBlockModal({ open: false, sectionId: null })}
                  className="p-1 text-zinc-400 hover:text-zinc-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateBlock} className="p-5 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Título do Bloco</label>
                  <input
                    type="text"
                    required
                    value={newBlockTitle}
                    onChange={(e) => setNewBlockTitle(e.target.value)}
                    placeholder="Ex: Novo Canal de Aquisição"
                    className="w-full border border-zinc-300 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Formato do Bloco</label>
                  <select
                    value={newBlockType}
                    onChange={(e) => setNewBlockType(e.target.value)}
                    className="w-full border border-zinc-300 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-purple-500 bg-white"
                  >
                    <option value="TEXT">Texto Explicativo</option>
                    <option value="CALLOUT">Destaque Estratégico (Callout)</option>
                    <option value="LIST">Lista de Itens</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Conteúdo da Diretriz</label>
                  <textarea
                    rows={4}
                    required
                    value={newBlockText}
                    onChange={(e) => setNewBlockText(e.target.value)}
                    placeholder="Descreva a diretriz ou decisão estratégica..."
                    className="w-full border border-zinc-300 rounded-lg p-2.5 focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setNewBlockModal({ open: false, sectionId: null })}
                    className="px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingBlock}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-1.5"
                  >
                    {creatingBlock ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Adicionar Bloco
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
