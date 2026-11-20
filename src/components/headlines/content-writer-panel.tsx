"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Save,
  Check,
  Copy,
  ArrowRight,
  ArrowLeft,
  Video,
  Layers,
  FileText,
  Globe,
  Target,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sliders,
} from "lucide-react";

const control =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition";

const FORMAT_OPTIONS = [
  { id: "REELS", label: "Reels / Vídeo", icon: Video, desc: "2 opções de roteiro cronometrado com falas e textos de tela." },
  { id: "CAPTION", label: "Feed (Legenda 4:5)", icon: FileText, desc: "Copy completa para post de feed com abertura, desenvolvimento e CTA." },
  { id: "CAROUSEL", label: "Carrossel", icon: Layers, desc: "Estrutura completa slide a slide com limites de palavras." },
  { id: "LANDING_PAGE", label: "Site / Landing Page", icon: Globe, desc: "Seções de oferta, benefícios, dores e conversão." },
  { id: "META_ADS", label: "Anúncio Meta Ads", icon: Target, desc: "Copy de alta conversão para tráfego pago (Feed/Stories)." },
  { id: "GOOGLE_ADS", label: "Anúncio Google Ads", icon: Search, desc: "Títulos e descrições otimizados para busca e CTR." },
] as const;

type FormatType = typeof FORMAT_OPTIONS[number]["id"];

interface ContentWriterPanelProps {
  clientId: string;
  companyName: string;
  contentId: string | null;
  headline: string;
  subheadline?: string;
  angle?: string;
  initialFormat?: string;
  onAdvanceToImagePrompt: (data: { format: string; text: string; contentId: string }) => void;
  onBackToHeadlines: () => void;
}

export function ContentWriterPanel({
  clientId,
  companyName,
  contentId,
  headline,
  subheadline,
  angle,
  initialFormat,
  onAdvanceToImagePrompt,
  onBackToHeadlines,
}: ContentWriterPanelProps) {
  // Mapeia formato inicial para um dos formatos disponíveis
  const getInitialFormatType = (): FormatType => {
    if (!initialFormat) return "REELS";
    const f = initialFormat.toUpperCase();
    if (f.includes("REEL") || f.includes("VIDEO") || f.includes("VÍDEO")) return "REELS";
    if (f.includes("CARRO")) return "CAROUSEL";
    if (f.includes("SITE") || f.includes("LANDING") || f.includes("LP")) return "LANDING_PAGE";
    if (f.includes("META") || f.includes("FACEBOOK") || f.includes("INSTA")) return "META_ADS";
    if (f.includes("GOOGLE") || f.includes("BUSCA")) return "GOOGLE_ADS";
    return "CAPTION";
  };

  const [activeFormat, setActiveFormat] = useState<FormatType>(getInitialFormatType());
  const [contentTexts, setContentTexts] = useState<Record<FormatType, string>>({
    REELS: "",
    CAPTION: "",
    CAROUSEL: "",
    LANDING_PAGE: "",
    META_ADS: "",
    GOOGLE_ADS: "",
  });

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Carrega conteúdo já salvo da peça se houver
  useEffect(() => {
    if (!contentId) return;
    const loadSaved = async () => {
      try {
        const res = await fetch(`/api/content-studio/posts/${contentId}`);
        if (!res.ok) return;
        const d = await res.json();
        if (d.data) {
          setContentTexts({
            REELS: d.data.selected_reels || "",
            CAPTION: d.data.selected_caption || "",
            CAROUSEL: d.data.selected_carousel || "",
            LANDING_PAGE: d.data.copy_site_lp || "",
            META_ADS: d.data.copy_meta_ads || "",
            GOOGLE_ADS: d.data.copy_google_ads || "",
          });
        }
      } catch {}
    };
    loadSaved();
  }, [contentId]);

  // Gerar texto com IA
  const handleGenerate = async () => {
    setGenerating(true);
    setFeedback(null);
    try {
      // Mapeia para os formatos suportados pelo gerador de IA
      let apiFormat: "REELS" | "CAPTION" | "CAROUSEL" | "LANDING_PAGE" = "CAPTION";
      if (activeFormat === "REELS") apiFormat = "REELS";
      else if (activeFormat === "CAROUSEL") apiFormat = "CAROUSEL";
      else if (activeFormat === "LANDING_PAGE") apiFormat = "LANDING_PAGE";

      const promptExtra =
        activeFormat === "META_ADS"
          ? "Crie uma copy completa de anúncio para Meta Ads (Feed e Stories) com gancho de quebra de padrão, corpo de persuasão e CTA clara."
          : activeFormat === "GOOGLE_ADS"
          ? "Crie 5 títulos magnéticos (máx 30 caracteres cada) e 3 descrições persuasivas (máx 90 caracteres cada) para campanha de Google Ads Search."
          : `Escreva o conteúdo completo no formato ${activeFormat}.`;

      const res = await fetch("/api/ai/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          contentId: contentId || undefined,
          format: apiFormat,
          selectedHeadline: headline,
          centralIdea: subheadline || headline,
          prompt: promptExtra,
        }),
      });

      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || "Erro ao gerar texto com IA.");

      // Extrai o texto retornado
      let generatedText = "";
      if (activeFormat === "REELS") {
        if (Array.isArray(d.reelsOptions) && d.reelsOptions.length) {
          generatedText = d.reelsOptions
            .map((r: any, i: number) => `=== OPÇÃO ${i + 1}: ${r.title || "Roteiro"} ===\n\n${r.hook ? `GANCHO:\n${r.hook}\n\n` : ""}${r.script || r.text || JSON.stringify(r, null, 2)}`)
            .join("\n\n------------------------\n\n");
        } else {
          generatedText = d.text || d.result || "";
        }
      } else if (activeFormat === "CAROUSEL") {
        if (Array.isArray(d.carouselOptions) && d.carouselOptions.length) {
          generatedText = d.carouselOptions
            .map((c: any, i: number) => `=== CARROSSEL OPÇÃO ${i + 1} ===\n\n` + (Array.isArray(c.slides) ? c.slides.map((s: any, idx: number) => `[SLIDE ${idx + 1}] ${s.title || ""}\n${s.body || s.text || ""}`).join("\n\n") : JSON.stringify(c, null, 2)))
            .join("\n\n------------------------\n\n");
        } else {
          generatedText = d.text || d.result || "";
        }
      } else {
        generatedText = d.text || d.caption || d.result || "";
      }

      setContentTexts((prev) => ({
        ...prev,
        [activeFormat]: generatedText,
      }));

      setFeedback({ type: "success", text: "Texto gerado com sucesso pela IA!" });
    } catch (e: any) {
      setFeedback({ type: "error", text: e.message || "Erro na geração." });
    } finally {
      setGenerating(false);
    }
  };

  // Salvar texto
  const handleSave = async () => {
    if (!contentId) {
      setFeedback({ type: "error", text: "Nenhuma peça associada encontrada." });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const payload: Record<string, any> = {
        selectedHeadline: headline,
      };

      if (activeFormat === "REELS") payload.selectedReels = contentTexts.REELS;
      else if (activeFormat === "CAROUSEL") payload.selectedCarousel = contentTexts.CAROUSEL;
      else if (activeFormat === "CAPTION") payload.selectedCaption = contentTexts.CAPTION;
      else if (activeFormat === "LANDING_PAGE") payload.copySiteLp = contentTexts.LANDING_PAGE;
      else if (activeFormat === "META_ADS") payload.copyMetaAds = contentTexts.META_ADS;
      else if (activeFormat === "GOOGLE_ADS") payload.copyGoogleAds = contentTexts.GOOGLE_ADS;

      const res = await fetch(`/api/content-studio/posts/${contentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar texto no sistema.");

      setFeedback({ type: "success", text: "Texto salvo com sucesso na peça!" });
      setTimeout(() => setFeedback(null), 3000);
    } catch (e: any) {
      setFeedback({ type: "error", text: e.message || "Falha ao salvar texto." });
    } finally {
      setSaving(false);
    }
  };

  const currentText = contentTexts[activeFormat];

  const handleCopy = () => {
    if (!currentText) return;
    navigator.clipboard.writeText(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIOR DE CONTEXTO & HEADLINE */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToHeadlines}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-950 transition cursor-pointer"
            >
              <ArrowLeft size={14} />
              Voltar ao Passo 3: Headlines
            </button>
            <span className="text-zinc-300">·</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-0.5 text-xs font-bold text-indigo-800">
              Passo 4: Redação Completa do Conteúdo
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {feedback && (
              <span
                className={
                  "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold " +
                  (feedback.type === "success"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border border-rose-200 bg-rose-50 text-rose-800")
                }
              >
                {feedback.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
                {feedback.text}
              </span>
            )}

            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-zinc-800 transition cursor-pointer"
            >
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save size={14} />}
              Salvar Texto
            </button>

            <button
              type="button"
              onClick={() =>
                onAdvanceToImagePrompt({
                  format: activeFormat,
                  text: currentText,
                  contentId: contentId || "",
                })
              }
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
            >
              Conteúdo Pronto ➔ Avançar para Etapa 05: Prompt de Arte
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* CARTÃO DA HEADLINE SELECIONADA */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            Headline Aprovada na Etapa 03:
          </span>
          <h2 className="mt-1 text-lg font-extrabold text-zinc-950">{headline || "Sem headline definida"}</h2>
          {subheadline && (
            <p className="mt-0.5 text-xs font-medium text-emerald-950">{subheadline}</p>
          )}
          {angle && (
            <span className="mt-2 inline-block rounded-md bg-white/80 border border-emerald-300 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
              Ângulo: {angle}
            </span>
          )}
        </div>
      </div>

      {/* SELETOR DE FORMATOS */}
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {FORMAT_OPTIONS.map((fmt) => {
          const Icon = fmt.icon;
          const active = activeFormat === fmt.id;
          return (
            <button
              key={fmt.id}
              type="button"
              onClick={() => setActiveFormat(fmt.id)}
              className={
                "flex flex-col items-start p-3.5 rounded-xl border text-left transition cursor-pointer " +
                (active
                  ? "border-emerald-600 bg-emerald-50/70 shadow-2xs text-emerald-950 font-bold"
                  : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700")
              }
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className={active ? "text-emerald-700" : "text-zinc-500"} />
                <span className="text-xs">{fmt.label}</span>
              </div>
              <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">{fmt.desc}</p>
            </button>
          );
        })}
      </div>

      {/* ÁREA DO EDITOR DE TEXTO / ROTEIRO */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-950">
              Redação: {FORMAT_OPTIONS.find((f) => f.id === activeFormat)?.label}
            </h3>
            <p className="text-xs text-zinc-500">
              Escreva diretamente ou use a IA para gerar a primeira versão estruturada a partir da sua headline e da estratégia do cliente.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={generating}
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
            >
              <Sparkles size={14} className={generating ? "animate-spin" : ""} />
              {generating ? "Redigindo com IA..." : "Gerar com IA"}
            </button>

            {currentText && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copied ? "Copiado!" : "Copiar"}
              </button>
            )}
          </div>
        </div>

        <div>
          <textarea
            className={`${control} min-h-[380px] font-mono text-xs leading-relaxed`}
            placeholder={`Escreva ou gere aqui o conteúdo completo para ${activeFormat}...`}
            value={currentText}
            onChange={(e) =>
              setContentTexts((prev) => ({
                ...prev,
                [activeFormat]: e.target.value,
              }))
            }
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-zinc-100 text-xs text-zinc-500">
          <span>{currentText ? `${currentText.split(/\s+/).filter(Boolean).length} palavras` : "0 palavras"}</span>
          <button
            type="button"
            onClick={() =>
              onAdvanceToImagePrompt({
                format: activeFormat,
                text: currentText,
                contentId: contentId || "",
              })
            }
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            Avançar para Etapa 05: Prompt de Imagem & Arte
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
