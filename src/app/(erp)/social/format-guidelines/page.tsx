"use client";

import React, { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCompany } from "@/lib/context/company-context";
import { contentCompanyId, INTERNAL_COMPANY_ID } from "@/modules/clients/internal-company";
import { IdentityAiButton } from "@/components/clients/identity-ai-button";
import {
  FileText,
  Video,
  Layers,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
  Compass,
} from "lucide-react";

export default function FormatGuidelinesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" />
          Carregando Padrões de Formatos...
        </div>
      }
    >
      <FormatGuidelinesContent />
    </Suspense>
  );
}

function FormatGuidelinesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedCompany, availableCompanies, selectCompany } = useCompany();

  const queryClientId = searchParams.get("clientId");
  const activeClientId = queryClientId || contentCompanyId(selectedCompany);
  const activeCompany =
    availableCompanies.find((c) => c.id === activeClientId) || selectedCompany;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Campos de format_guidelines
  const [reelsStandard, setReelsStandard] = useState("");
  const [carouselStandard, setCarouselStandard] = useState("");
  const [headlinesStandard, setHeadlinesStandard] = useState("");
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadGuidelines = useCallback(async (clientId: string) => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    setDirty(false);
    try {
      const res = await fetch(`/api/clients/${clientId}/identity`, { cache: "no-store" });
      if (!res.ok) throw new Error("Erro ao carregar padrões do cliente.");
      const data = await res.json();
      const fg = data.formatGuidelines || {};
      setReelsStandard(fg.reelsStandard || "");
      setCarouselStandard(fg.carouselStandard || "");
      setHeadlinesStandard(fg.headlinesStandard || "");
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os padrões de formato deste cliente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGuidelines(activeClientId);
  }, [activeClientId, loadGuidelines]);

  const handleSave = useCallback(
    async (manual = false) => {
      if (saving || (!dirty && !manual)) return;
      setSaving(true);
      setError(null);

      try {
        const payload = {
          formatGuidelines: {
            reelsStandard: reelsStandard.trim(),
            carouselStandard: carouselStandard.trim(),
            headlinesStandard: headlinesStandard.trim(),
          },
        };

        const res = await fetch(`/api/clients/${activeClientId}/identity`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Falha ao salvar padrões de formato.");
        setDirty(false);
        const timeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        setLastSaved(timeStr);
        setFeedback(`Padrões salvos com sucesso às ${timeStr}.`);
        setTimeout(() => setFeedback(null), 3500);
      } catch (err) {
        console.error(err);
        setError("Erro ao persistir padrões de formato.");
      } finally {
        setSaving(false);
      }
    },
    [activeClientId, carouselStandard, dirty, headlinesStandard, reelsStandard, saving]
  );

  const markDirty = () => {
    setDirty(true);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      void handleSave(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-zinc-50/60 pb-20">
      {/* Header Sticky */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white flex items-center justify-center shadow-2xs">
              <FileText className="w-5 h-5 text-zinc-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-zinc-950">Padrões de Formatos</h1>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                  {activeCompany.name}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Diretrizes de execução para Reels, Carrosséis e Headlines de {activeCompany.name}.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`/social/editorial?clientId=${activeClientId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition"
            >
              Linha Editorial
            </Link>

            <Link
              href={`/strategy?clientId=${activeClientId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition"
            >
              <Compass className="w-3.5 h-3.5" />
              Estratégia Completa
            </Link>

            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                dirty
                  ? "bg-rose-600 text-white hover:bg-rose-700 shadow-xs"
                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              }`}
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Salvando...
                </>
              ) : dirty ? (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Salvar
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Salvo
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {feedback && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Card Explicativo: Linha Editorial vs Padrões de Formatos */}
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-800 flex items-start gap-3">
          <Info className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-zinc-900">
              Relação entre Linha Editorial e Padrões de Formatos
            </p>
            <p className="text-zinc-600 leading-relaxed">
              A <strong>Linha Editorial</strong> define <em>o que</em> falar (assuntos, pilares e objetivos). Já os <strong>Padrões de Formatos</strong> definem <em>como executar</em> cada formato para a marca (ganchos de Reels, número de lâminas de Carrossel e estilo de Headlines). Os geradores de IA consultam essas regras automaticamente em cada peça.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-xs text-zinc-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
            <span>Carregando diretrizes de {activeCompany.name}...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Padrão de Reels */}
            <article className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center shrink-0">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-950">Padrão de Reels</h2>
                      <p className="text-[11px] text-zinc-500">Vídeos curtos e verticais</p>
                    </div>
                  </div>
                  <IdentityAiButton
                    clientId={activeClientId}
                    field="reelsStandard"
                    draft={{ reelsStandard }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 transition cursor-pointer shrink-0 shadow-2xs"
                    onApply={(val) => {
                      const text = Array.isArray(val) ? val.join("\n") : val;
                      setReelsStandard(text);
                      markDirty();
                    }}
                  />
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed">
                  Defina a estrutura padrão de roteiro: primeiros 3 segundos de hook, duração média (ex: 30 a 60s), estilo de corte dinâmico, legenda e call to action final.
                </p>

                <textarea
                  rows={10}
                  placeholder="Ex:
- Gancho nos primeiros 2s com quebra de padrão ou frase polêmica.
- Duração ideal: 30 a 45 segundos.
- Cortes a cada 3 a 5 segundos com B-roll ou demonstração de produto.
- CTA falado e escrito na tela convidando a comentar uma palavra-chave."
                  value={reelsStandard}
                  onChange={(e) => {
                    setReelsStandard(e.target.value);
                    markDirty();
                  }}
                  onBlur={() => handleSave(false)}
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950 resize-y leading-relaxed text-zinc-900 font-mono text-[11px]"
                />
              </div>

              <div className="pt-2 border-t border-zinc-100 text-[11px] text-zinc-400">
                Usado pelo gerador de roteiros de Reels
              </div>
            </article>

            {/* 2. Padrão de Carrossel */}
            <article className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-950">Padrão de Carrossel</h2>
                      <p className="text-[11px] text-zinc-500">Posts sequenciais em lâminas</p>
                    </div>
                  </div>
                  <IdentityAiButton
                    clientId={activeClientId}
                    field="carouselStandard"
                    draft={{ carouselStandard }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 transition cursor-pointer shrink-0 shadow-2xs"
                    onApply={(val) => {
                      const text = Array.isArray(val) ? val.join("\n") : val;
                      setCarouselStandard(text);
                      markDirty();
                    }}
                  />
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed">
                  Defina o número padrão de lâminas (ex: 5 a 7), estrutura da capa (curiosidade ou lista), densidade de texto por slide e formato do último slide de conversão.
                </p>

                <textarea
                  rows={10}
                  placeholder="Ex:
- Lâmina 1 (Capa): Título em fonte grande com no máximo 8 palavras.
- Lâminas 2 a 5: 1 ideia central por lâmina, com bullet points curtos.
- Lâmina 6: Resumo prático em 3 passos.
- Lâmina 7 (Fechamento): CTA claro para salvar o post ou chamar no direct."
                  value={carouselStandard}
                  onChange={(e) => {
                    setCarouselStandard(e.target.value);
                    markDirty();
                  }}
                  onBlur={() => handleSave(false)}
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950 resize-y leading-relaxed text-zinc-900 font-mono text-[11px]"
                />
              </div>

              <div className="pt-2 border-t border-zinc-100 text-[11px] text-zinc-400">
                Usado pelo gerador de carrosséis no Estúdio
              </div>
            </article>

            {/* 3. Padrão de Headlines */}
            <article className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-950">Padrão de Headlines</h2>
                      <p className="text-[11px] text-zinc-500">Títulos e ganchos de abertura</p>
                    </div>
                  </div>
                  <IdentityAiButton
                    clientId={activeClientId}
                    field="headlinesStandard"
                    draft={{ headlinesStandard }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 transition cursor-pointer shrink-0 shadow-2xs"
                    onApply={(val) => {
                      const text = Array.isArray(val) ? val.join("\n") : val;
                      setHeadlinesStandard(text);
                      markDirty();
                    }}
                  />
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed">
                  Defina o estilo preferido de títulos: perguntas provocativas, listas, declarações diretas, gatilhos de autoridade ou curiosidade sem sensacionalismo.
                </p>

                <textarea
                  rows={10}
                  placeholder="Ex:
- Preferir formato 'Como resolver X sem sofrer com Y'.
- Evitar clickbaits vazios; prometer apenas o que o conteúdo entrega.
- Usar números específicos quando houver dados concretos.
- Manter títulos abaixo de 60 caracteres para leitura rápida no feed."
                  value={headlinesStandard}
                  onChange={(e) => {
                    setHeadlinesStandard(e.target.value);
                    markDirty();
                  }}
                  onBlur={() => handleSave(false)}
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950 resize-y leading-relaxed text-zinc-900 font-mono text-[11px]"
                />
              </div>

              <div className="pt-2 border-t border-zinc-100 text-[11px] text-zinc-400">
                Usado pelo Laboratório de Headlines e Brainstorm
              </div>
            </article>
          </div>
        )}
      </main>
    </div>
  );
}
