"use client";

import { useRef, useState, useEffect } from "react";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Check,
  CheckSquare,
  Square,
  Plus,
  Wand2,
  ChevronDown,
  ChevronUp,
  FileText,
  X,
} from "lucide-react";
import type { IdentityAiField } from "@/modules/clients/identity-ai";
import { toast } from "@/components/ui/toast-provider";

export function IdentityAiButton({
  clientId,
  field,
  draft,
  onApply,
  currentValue,
  className,
  label = "Gerar com IA",
}: {
  clientId: string;
  field: IdentityAiField;
  draft: Record<string, unknown>;
  onApply: (value: string | string[], mode?: "replace" | "append" | "improve") => void;
  currentValue?: string | string[];
  className?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [optionsList, setOptionsList] = useState<string[]>([]);
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());
  const [model, setModel] = useState("");
  const [open, setOpen] = useState(false);
  const [modalStep, setModalStep] = useState<"choose" | "result">("choose");
  const [intendedAction, setIntendedAction] = useState<"append" | "improve" | "replace">("append");
  const [activeAiMode, setActiveAiMode] = useState<"generate" | "improve">("generate");
  const [showOriginal, setShowOriginal] = useState(false);
  const generation = useRef(0);

  // Resolver conteúdo atual do campo para saber se há texto/itens prévios
  const resolvedCurrentText =
    typeof currentValue === "string"
      ? currentValue
      : typeof (draft as Record<string, unknown>)?.[field] === "string"
      ? String((draft as Record<string, unknown>)[field])
      : "";

  const resolvedCurrentList =
    Array.isArray(currentValue)
      ? currentValue
      : Array.isArray((draft as Record<string, unknown>)?.[field])
      ? ((draft as Record<string, unknown>)[field] as string[])
      : [];

  const hasExistingText = Boolean(resolvedCurrentText.trim());
  const hasExistingList = resolvedCurrentList.length > 0;
  const isListField = Array.isArray(currentValue) || Array.isArray((draft as Record<string, unknown>)?.[field]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  async function generate(append = false, mode: "generate" | "improve" = "generate") {
    const requestId = ++generation.current;
    if (!open) setOpen(true);
    setBusy(true);
    setError("");
    setActiveAiMode(mode);

    if (!append) {
      setSuggestion(null);
      setOptionsList([]);
      setSelectedSet(new Set());
    }

    try {
      const payload = {
        field,
        draft,
        mode,
        currentText: resolvedCurrentText || (resolvedCurrentList.length > 0 ? resolvedCurrentList.join("\n") : undefined),
      };

      const response = await fetch("/api/clients/" + clientId + "/identity/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (requestId !== generation.current) return;
      if (!response.ok || !data.success || data.source !== "OPENROUTER") {
        throw new Error(data.error || "A IA não confirmou a geração.");
      }

      if (Array.isArray(data.value)) {
        const rawExisting = (draft as Record<string, unknown>)?.[field];
        const existingLower = new Set(
          Array.isArray(rawExisting)
            ? rawExisting.map((s) => String(s).trim().toLowerCase())
            : typeof rawExisting === "string" && rawExisting.trim()
            ? [rawExisting.trim().toLowerCase()]
            : []
        );

        const newItems: string[] = data.value
          .map((s: unknown) => String(s).trim())
          .filter((item: string) => Boolean(item) && (mode === "improve" || !existingLower.has(item.toLowerCase())));

        setOptionsList((prev) => {
          const combined = append ? Array.from(new Set([...prev, ...newItems])) : newItems;
          setSelectedSet((prevSelected) => {
            if (append) {
              const merged = new Set(prevSelected);
              newItems.forEach((item) => merged.add(item));
              return merged;
            }
            return new Set(combined);
          });
          return combined;
        });
        setSuggestion(null);
      } else {
        setSuggestion(String(data.value));
        setOptionsList([]);
      }
      setModel(data.model || "");
    } catch (err) {
      if (requestId === generation.current) {
        setError(err instanceof Error ? err.message : "Erro ao gerar sugestão");
      }
    } finally {
      if (requestId === generation.current) setBusy(false);
    }
  }

  const defaultBtnClass =
    "mb-2 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50 cursor-pointer";

  const isListMode = optionsList.length > 0 || isListField;

  function openChoiceModal() {
    generation.current++;
    setBusy(false);
    setError("");
    setSuggestion(null);
    setOptionsList([]);
    setSelectedSet(new Set());
    setModalStep("choose");
    setOpen(true);
  }

  function startWithChoice(choice: "append" | "improve" | "replace") {
    setIntendedAction(choice);
    setModalStep("result");
    void generate(false, choice === "improve" ? "improve" : "generate");
  }

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={openChoiceModal}
        className={className ?? defaultBtnClass}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Sugestões da IA"
            className="max-h-[92vh] w-full max-w-2xl flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do modal */}
            <div className="flex items-start justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  {modalStep === "choose"
                    ? "Como você quer usar a IA neste campo?"
                    : "Sugestão com IA para este campo"}
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 leading-relaxed">
                  {modalStep === "choose"
                    ? "Escolha se deseja acrescentar novos itens abaixo, melhorar o que já está escrito ou apagar tudo e reescrever do zero."
                    : "Revise a sugestão abaixo antes de aplicar no formulário."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {model && (
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200 shrink-0">
                    {model}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {modalStep === "choose" ? (
              <div className="py-5 space-y-3">
                <button
                  type="button"
                  onClick={() => startWithChoice("append")}
                  className="w-full text-left p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition flex items-start gap-3 cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-950">Adicionar mais coisas ao campo</div>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      Mantém o que já está preenchido e acrescenta novas linhas ou itens abaixo, sem repetir.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!hasExistingText && !hasExistingList}
                  onClick={() => startWithChoice("improve")}
                  className="w-full text-left p-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 transition flex items-start gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="p-2 rounded-lg bg-zinc-900 text-white shrink-0">
                    <Wand2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-950">Melhorar o que está escrito no campo</div>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {hasExistingText || hasExistingList
                        ? "Usa o texto/itens atuais como base para a IA lapidar, organizar e deixar mais persuasivo."
                        : "Preencha algo no campo antes para poder usar esta opção."}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => startWithChoice("replace")}
                  className="w-full text-left p-4 rounded-xl border border-zinc-200 bg-white hover:bg-rose-50/40 hover:border-rose-200 transition flex items-start gap-3 cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-zinc-200 text-zinc-800 shrink-0">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-950">Apagar tudo do campo e reescrever</div>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      Ignora o conteúdo atual e gera uma nova sugestão completa do zero para substituir o campo.
                    </p>
                  </div>
                </button>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
            {/* Alternador de Modo de IA: Sugerir Novas Ideias vs Melhorar Texto Existente */}
            {hasExistingText && (
              <div className="pt-3 pb-1 flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-xl bg-zinc-100 p-1 border border-zinc-200">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => generate(false, "generate")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeAiMode === "generate"
                        ? "bg-white text-zinc-900 shadow-2xs"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                    Gerar novas opções (sem repetir)
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => generate(false, "improve")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeAiMode === "improve"
                        ? "bg-white text-emerald-900 shadow-2xs"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    <Wand2 className="w-3.5 h-3.5 text-emerald-700" />
                    Melhorar meu texto existente
                  </button>
                </div>

                {activeAiMode === "improve" && (
                  <button
                    type="button"
                    onClick={() => setShowOriginal(!showOriginal)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                  >
                    <FileText className="w-3 h-3" />
                    {showOriginal ? "Ocultar original" : "Ver texto original"}
                    {showOriginal ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
              </div>
            )}

            {/* Painel comparativo de texto original quando acionado */}
            {showOriginal && hasExistingText && activeAiMode === "improve" && (
              <div className="my-2 p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Seu texto original digitado:
                </span>
                <p className="whitespace-pre-wrap leading-relaxed text-zinc-600 italic">
                  {resolvedCurrentText}
                </p>
              </div>
            )}

            {/* Status e Erro */}
            {busy && (
              <div className="my-4 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                <span>
                  {activeAiMode === "improve"
                    ? "A IA está lapidando e aprimorando o seu texto existente..."
                    : "Gerando opções inéditas com base no contexto e posicionamento da marca..."}
                </span>
              </div>
            )}

            {error && (
              <p role="alert" className="my-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {error}
              </p>
            )}

            {/* Conteúdo: Lista Interativa ou Texto Único */}
            <div className="my-3 flex-1 overflow-y-auto pr-1">
              {optionsList.length > 0 ? (
                <div className="space-y-3">
                  {/* Barra de controle da lista */}
                  <div className="flex items-center justify-between text-xs px-1 text-zinc-600">
                    <span className="font-semibold text-zinc-900">
                      {selectedSet.size} de {optionsList.length} opções selecionadas
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSet(new Set(optionsList))}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-700 hover:text-zinc-950 hover:underline cursor-pointer"
                      >
                        <CheckSquare className="w-3 h-3" />
                        Selecionar todas
                      </button>
                      <span className="text-zinc-300">•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSet(new Set())}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-700 hover:text-zinc-950 hover:underline cursor-pointer"
                      >
                        <Square className="w-3 h-3" />
                        Desmarcar todas
                      </button>
                    </div>
                  </div>

                  {/* Cards de cada opção */}
                  <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                    {optionsList.map((item, idx) => {
                      const isSelected = selectedSet.has(item);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setSelectedSet((prev) => {
                              const next = new Set(prev);
                              if (next.has(item)) next.delete(item);
                              else next.add(item);
                              return next;
                            });
                          }}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-start gap-3 select-none ${
                            isSelected
                              ? "bg-zinc-950 text-white border-zinc-950 shadow-2xs"
                              : "bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100"
                          }`}
                        >
                          <div
                            className={`mt-0.5 w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition ${
                              isSelected
                                ? "bg-white text-zinc-950 border-white"
                                : "border-zinc-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="flex-1 leading-relaxed">{item}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : suggestion !== null ? (
                <div className="space-y-2">
                  {activeAiMode === "improve" && (
                    <div className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-medium flex items-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Versão refinada e lapidada a partir da sua redação original:</span>
                    </div>
                  )}
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs leading-relaxed whitespace-pre-wrap text-zinc-800 font-mono">
                    {suggestion}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Rodapé de Ações: Adicionar Abaixo vs Substituir */}
            <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setModalStep("choose")}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 border border-zinc-200 transition cursor-pointer disabled:opacity-50"
                >
                  ← Trocar opção
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => generate(true, activeAiMode)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 transition cursor-pointer disabled:opacity-50"
                  title="Gera mais alternativas da IA para este campo"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {optionsList.length > 0 ? "Gerar mais opções" : "Gerar outra versão"}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    generation.current++;
                    setBusy(false);
                    setOpen(false);
                  }}
                  className="rounded-xl border border-zinc-200 px-3.5 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                >
                  Fechar
                </button>

                {/* Opções de Aplicação para Lista */}
                {optionsList.length > 0 ? (
                  <>
                    {hasExistingList && (
                      <button
                        type="button"
                        disabled={selectedSet.size === 0}
                        onClick={() => {
                          const selected = Array.from(selectedSet);
                          const merged = Array.from(new Set([...resolvedCurrentList, ...selected]));
                          onApply(merged, "append");
                          setOpen(false);
                          toast.success("Sugestão adicionada à lista!", "As novas opções foram mescladas com sucesso.");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-2xs transition disabled:opacity-40 cursor-pointer"
                        title="Acrescenta os itens selecionados mantendo os que já estão no formulário"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar à lista (+{selectedSet.size})
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={selectedSet.size === 0}
                      onClick={() => {
                        onApply(Array.from(selectedSet), "replace");
                        setOpen(false);
                        toast.success("Lista atualizada com sucesso!", "As opções selecionadas substituíram o conteúdo anterior.");
                      }}
                      className={`rounded-xl px-4 py-2 text-xs font-semibold transition disabled:opacity-40 cursor-pointer ${
                        hasExistingList
                          ? "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                          : "bg-zinc-950 text-white hover:bg-zinc-800"
                      }`}
                      title={hasExistingList ? "Substitui a lista inteira pelas opções selecionadas" : "Usar selecionadas"}
                    >
                      {hasExistingList ? "Substituir lista" : `Usar selecionadas (${selectedSet.size})`}
                    </button>
                  </>
                ) : suggestion !== null ? (
                  /* Opções de Aplicação para Texto Único */
                  <>
                    {hasExistingText && (
                      <button
                        type="button"
                        onClick={() => {
                          const merged = resolvedCurrentText.trim()
                            ? `${resolvedCurrentText.trim()}\n\n${suggestion}`
                            : suggestion;
                          onApply(merged, "append");
                          setOpen(false);
                          toast.success("Texto adicionado abaixo!", "A sugestão da IA foi inserida em uma nova linha.");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-2xs transition cursor-pointer"
                        title="Mantém o texto atual e acrescenta a sugestão da IA em uma nova linha abaixo"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar abaixo (linha extra)
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onApply(suggestion, "replace");
                        setOpen(false);
                        toast.success("Texto substituído com sucesso!", "O campo foi atualizado com a sugestão da IA.");
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
                        hasExistingText
                          ? "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                          : "bg-zinc-950 text-white hover:bg-zinc-800"
                      }`}
                      title={hasExistingText ? "Ignora o que tem lá e substitui pelo novo texto da IA" : "Usar sugestão"}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {hasExistingText ? "Substituir texto atual" : "Usar sugestão"}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
