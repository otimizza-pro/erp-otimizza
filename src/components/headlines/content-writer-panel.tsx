"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Globe,
  Layers,
  Megaphone,
  RefreshCw,
  Save,
  Search,
  Sliders,
  Sparkles,
  Target,
  Video,
} from "lucide-react";
import {
  buildTechnicalFormatPromptLines,
  CAPTION_EMOJI_OPTIONS,
  CAPTION_LENGTH_OPTIONS,
  CAPTION_STRUCTURE_OPTIONS,
  CAROUSEL_DENSITY_OPTIONS,
  CAROUSEL_SLIDE_COUNTS,
  CAROUSEL_TYPE_OPTIONS,
  DEFAULT_CTAS,
  DEFAULT_FORMAT_SPECS,
  DEFAULT_TONES,
  GOOGLE_ADS_CAMPAIGN_OPTIONS,
  GOOGLE_ADS_FOCUS_OPTIONS,
  LP_GOAL_OPTIONS,
  META_ADS_OBJECTIVE_OPTIONS,
  META_ADS_PLACEMENT_OPTIONS,
  normalizeWriterFormat,
  parseFormatSpecs,
  REELS_DURATION_OPTIONS,
  REELS_STYLE_OPTIONS,
  type FormatSpecsConfig,
  type WriterFormatKey,
} from "@/modules/headlines/format-specs";

const control =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition";

const FORMAT_OPTIONS = [
  { id: "REELS", label: "Reels / Vídeo", mode: "SOCIAL_MEDIA", icon: Video, desc: "2 opções de roteiro cronometrado com falas, B-rolls e textos de tela." },
  { id: "CAPTION", label: "Feed (Legenda 4:5)", mode: "SOCIAL_MEDIA", icon: FileText, desc: "Copy completa para post de feed com abertura, desenvolvimento e CTA." },
  { id: "CAROUSEL", label: "Carrossel", mode: "SOCIAL_MEDIA", icon: Layers, desc: "2 estruturas slide a slide com limites de palavras e micro-ganchos." },
  { id: "LANDING_PAGE", label: "Site / Landing Page", mode: "SOCIAL_MEDIA", icon: Globe, desc: "Seções completas de oferta, benefícios, dores, FAQ e conversão." },
  { id: "META_ADS", label: "Anúncio Meta Ads", mode: "ADS", icon: Target, desc: "Copy de alta conversão para tráfego pago (Feed, Stories e Reels Ads)." },
  { id: "GOOGLE_ADS", label: "Anúncio Google Ads", mode: "ADS", icon: Search, desc: "Títulos (30 carac.), descrições (90 carac.) e extensões Search/PMax." },
] as const;

type FormatType = WriterFormatKey;
const materialByFormat: Record<FormatType, string> = {
  REELS: "selected_reels",
  CAPTION: "selected_caption",
  CAROUSEL: "selected_carousel",
  LANDING_PAGE: "copy_site_lp",
  META_ADS: "copy_meta_ads",
  GOOGLE_ADS: "copy_google_ads",
};

interface ContentWriterPanelProps {
  clientId: string;
  companyName: string;
  contentId: string | null;
  headline: string;
  subheadline?: string;
  angle?: string;
  initialFormat?: string;
  initialCentralIdea?: string;
  initialOfferName?: string;
  initialTone?: string;
  initialCta?: string;
  initialAudience?: string;
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
  initialCentralIdea,
  initialOfferName,
  initialTone,
  initialCta,
  initialAudience,
  onAdvanceToImagePrompt,
  onBackToHeadlines,
}: ContentWriterPanelProps) {
  const [activeFormat, setActiveFormat] = useState<FormatType>(() => normalizeWriterFormat(initialFormat));
  useEffect(() => {
    if (!initialFormat) return;
    setActiveFormat(normalizeWriterFormat(initialFormat));
  }, [initialFormat]);

  const [specs, setSpecs] = useState<FormatSpecsConfig>(() => ({
    ...DEFAULT_FORMAT_SPECS,
    contentMode:
      normalizeWriterFormat(initialFormat) === "META_ADS" || normalizeWriterFormat(initialFormat) === "GOOGLE_ADS"
        ? "ADS"
        : "SOCIAL_MEDIA",
  }));

  const [tone, setTone] = useState(initialTone || "");
  const [cta, setCta] = useState(initialCta || "");
  const [offerName, setOfferName] = useState(initialOfferName || "");
  const [centralIdea, setCentralIdea] = useState(initialCentralIdea || "");
  const [audienceName, setAudienceName] = useState(initialAudience || "");
  const [customPrompt, setCustomPrompt] = useState("");
  const [promptEdited, setPromptEdited] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

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
  const [editVersion, setEditVersion] = useState("");
  const [hasStoredHeadline, setHasStoredHeadline] = useState(false);
  const [staleMaterials, setStaleMaterials] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!contentId) return;
    const controller = new AbortController();
    const loadSaved = async () => {
      try {
        const res = await fetch(`/api/content-studio/posts/${contentId}`, { signal: controller.signal });
        if (!res.ok) return;
        const d = await res.json();
        if (!controller.signal.aborted && d.data) {
          const item = d.data;
          setEditVersion(item.edit_version || "");
          setHasStoredHeadline(Boolean(item.selected_headline && String(item.selected_headline).trim()));
          setStaleMaterials(item.stale_materials || []);
          if (item.format_config && Object.keys(item.format_config).length > 0) {
            setSpecs(parseFormatSpecs(item.format_config));
          }
          if (item.tone_of_voice && !tone) setTone(item.tone_of_voice);
          if (item.call_to_action && !cta) setCta(item.call_to_action);
          if (item.offer_name && !offerName) setOfferName(item.offer_name);
          if (item.central_idea && !centralIdea) setCentralIdea(item.central_idea);
          if (item.target_audience_name && !audienceName) setAudienceName(item.target_audience_name);
          setContentTexts({
            REELS: item.selected_reels || "",
            CAPTION: item.selected_caption || "",
            CAROUSEL: item.selected_carousel || "",
            LANDING_PAGE: item.copy_site_lp || "",
            META_ADS: item.copy_meta_ads || "",
            GOOGLE_ADS: item.copy_google_ads || "",
          });
        }
      } catch {}
    };
    loadSaved();
    return () => controller.abort();
  }, [contentId]);

  const builtPrompt = useMemo(() => {
    const lines: string[] = [
      "Atue como Diretor Criativo e Redator Sênior de Marketing. Escreva em português brasileiro com alto rigor editorial.",
      "",
      `CLIENTE / MARCA: ${companyName}`,
      `FORMATO: ${FORMAT_OPTIONS.find((f) => f.id === activeFormat)?.label || activeFormat}`,
      `PÚBLICO-ALVO: ${audienceName || "Público principal cadastrado da marca"}`,
      `TOM DE VOZ: ${tone || "Conforme DNA da marca"}`,
      `CHAMADA PARA AÇÃO (CTA): ${cta || "Conforme objetivo da peça"}`,
    ];
    if (offerName && offerName !== "Institucional / Marca") {
      lines.push(`OFERTA / SERVIÇO EM FOCO: ${offerName}`);
    }
    if (headline) {
      lines.push(`HEADLINE APROVADA: "${headline}"`);
      if (subheadline) lines.push(`SUBHEADLINE DE APOIO: "${subheadline}"`);
    }
    lines.push("", "PAUTA / IDEIA CENTRAL:", centralIdea || subheadline || headline || "[Ideia central da peça]");
    lines.push("", "ESPECIFICAÇÕES TÉCNICAS & REGRAS DO FORMATO:");
    lines.push(...buildTechnicalFormatPromptLines(activeFormat, specs));
    return lines.join("\n");
  }, [activeFormat, audienceName, centralIdea, companyName, cta, headline, offerName, specs, subheadline, tone]);

  const effectivePrompt = promptEdited ? customPrompt : builtPrompt;

  const updateSpecs = (patch: Partial<FormatSpecsConfig>) => {
    setSpecs((prev) => ({ ...prev, ...patch }));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/ai/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          contentId: contentId || undefined,
          format: activeFormat,
          selectedHeadline: headline || undefined,
          centralIdea: centralIdea || subheadline || headline,
          serviceName: offerName && offerName !== "Institucional / Marca" ? offerName : undefined,
          prompt: promptEdited ? customPrompt : effectivePrompt,
          formatConfig: specs,
        }),
      });

      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || "Erro ao gerar texto com IA.");

      let generatedText = "";
      if (activeFormat === "REELS") {
        if (Array.isArray(d.reelsOptions) && d.reelsOptions.length) {
          generatedText = (d.reelsOptions as Record<string, unknown>[])
            .map((r, i) => `=== OPÇÃO ${i + 1}: ${String(r.title || "Roteiro")} ===\n\n${r.hook ? `GANCHO:\n${String(r.hook)}\n\n` : ""}${String(r.script || r.text || JSON.stringify(r, null, 2))}`)
            .join("\n\n------------------------\n\n");
        } else {
          generatedText = d.text || d.result || "";
        }
      } else if (activeFormat === "CAROUSEL") {
        if (Array.isArray(d.carouselOptions) && d.carouselOptions.length) {
          generatedText = (d.carouselOptions as Record<string, unknown>[])
            .map((c, i) => `=== CARROSSEL OPÇÃO ${i + 1} ===\n\n` + (Array.isArray(c.slides) ? (c.slides as Record<string, unknown>[]).map((s, idx) => `[SLIDE ${idx + 1}] ${String(s.title || "")}\n${String(s.body || s.text || "")}`).join("\n\n") : JSON.stringify(c, null, 2)))
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

      if (contentId && generatedText.trim()) {
        const savedOk = await persistContent({ [activeFormat]: generatedText }, true);
        if (savedOk) {
          setFeedback({
            type: "success",
            text: `Conteúdo gerado via ${d.modelUsed || "IA"} e salvo automaticamente na peça!`,
          });
          return;
        }
      }

      setFeedback({ type: "success", text: `Conteúdo gerado via ${d.modelUsed || "IA"} com todas as especificações técnicas!` });
    } catch (e: unknown) {
      const err = e as Error;
      setFeedback({ type: "error", text: err.message || "Erro na geração." });
    } finally {
      setGenerating(false);
    }
  };

  const persistContent = async (
    overrideTexts?: Partial<Record<FormatType, string>>,
    silent = false,
  ): Promise<boolean> => {
    if (!contentId) {
      if (!silent) setFeedback({ type: "error", text: "Nenhuma peça associada encontrada." });
      return false;
    }
    const mergedTexts = { ...contentTexts, ...(overrideTexts || {}) };
    const payload: Record<string, unknown> = {
      clientId,
      editVersion: editVersion || undefined,
      confirmContentRevision: true,
      formatConfig: specs,
      toneOfVoice: tone || undefined,
      callToAction: cta || undefined,
      promptUsed: effectivePrompt,
      ...(!hasStoredHeadline && headline?.trim() ? { selectedHeadline: headline.trim() } : {}),
    };

    if (mergedTexts.REELS.trim()) payload.selectedReels = mergedTexts.REELS;
    if (mergedTexts.CAROUSEL.trim()) payload.selectedCarousel = mergedTexts.CAROUSEL;
    if (mergedTexts.CAPTION.trim()) payload.selectedCaption = mergedTexts.CAPTION;
    if (mergedTexts.LANDING_PAGE.trim()) payload.copySiteLp = mergedTexts.LANDING_PAGE;
    if (mergedTexts.META_ADS.trim()) payload.copyMetaAds = mergedTexts.META_ADS;
    if (mergedTexts.GOOGLE_ADS.trim()) payload.copyGoogleAds = mergedTexts.GOOGLE_ADS;

    // Se o formato ativo estiver vazio (usuário apagou intencionalmente), envia string vazia para o campo ativo
    if (activeFormat === "REELS" && payload.selectedReels === undefined) payload.selectedReels = mergedTexts.REELS;
    else if (activeFormat === "CAROUSEL" && payload.selectedCarousel === undefined) payload.selectedCarousel = mergedTexts.CAROUSEL;
    else if (activeFormat === "CAPTION" && payload.selectedCaption === undefined) payload.selectedCaption = mergedTexts.CAPTION;
    else if (activeFormat === "LANDING_PAGE" && payload.copySiteLp === undefined) payload.copySiteLp = mergedTexts.LANDING_PAGE;
    else if (activeFormat === "META_ADS" && payload.copyMetaAds === undefined) payload.copyMetaAds = mergedTexts.META_ADS;
    else if (activeFormat === "GOOGLE_ADS" && payload.copyGoogleAds === undefined) payload.copyGoogleAds = mergedTexts.GOOGLE_ADS;

    const doPut = async (ver?: string) => {
      const res = await fetch(`/api/content-studio/posts/${contentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, editVersion: ver || undefined }),
      });
      return res;
    };

    try {
      let res = await doPut(editVersion);
      if (res.status === 409) {
        const latestRes = await fetch(`/api/content-studio/posts/${contentId}`);
        const latestJson = await latestRes.json().catch(() => null);
        const latestVer = latestJson?.data?.edit_version;
        if (latestVer) {
          res = await doPut(latestVer);
        }
      }
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao salvar texto no sistema.");
      setEditVersion(result.data.edit_version);
      setStaleMaterials(result.data.stale_materials || []);
      return true;
    } catch (e: unknown) {
      if (!silent) {
        const err = e as Error;
        setFeedback({ type: "error", text: err.message || "Falha ao salvar texto." });
      }
      return false;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const ok = await persistContent();
      if (ok) {
        setFeedback({ type: "success", text: "Texto e especificações salvos na peça!" });
        setTimeout(() => setFeedback(null), 3500);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAdvance = async () => {
    const text = contentTexts[activeFormat];
    if (contentId && text.trim()) {
      setSaving(true);
      await persistContent(undefined, true);
      setSaving(false);
    }
    onAdvanceToImagePrompt({
      format: activeFormat,
      text,
      contentId: contentId || "",
    });
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
              Voltar para Headlines
            </button>
            <span className="text-zinc-300">·</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 border border-zinc-200 px-3 py-0.5 text-xs font-bold text-zinc-800">
              Etapa 3: Texto, Roteiro & Especificações Técnicas
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
              Salvar Texto & Specs
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleAdvance()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer disabled:opacity-50"
            >
              Avançar para Prompt de Arte
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* CARTÃO DA HEADLINE E CONTEXTO HERDADO */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Headline / Direcionamento Ativo:
            </span>
            <h2 className="mt-1 text-lg font-semibold text-zinc-950">{headline || centralIdea || "Sem headline definida"}</h2>
            {subheadline && <p className="mt-0.5 text-xs font-medium text-emerald-950">{subheadline}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {angle && (
                <span className="inline-block rounded-md bg-white/80 border border-emerald-300 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                  Ângulo: {angle}
                </span>
              )}
              {offerName && (
                <span className="inline-block rounded-md bg-white/80 border border-emerald-300 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                  Oferta: {offerName}
                </span>
              )}
              {audienceName && (
                <span className="inline-block rounded-md bg-white/80 border border-emerald-300 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                  Público: {audienceName}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 min-w-[300px] flex-1 max-w-xl">
            <label className="text-[11px] font-bold text-zinc-700">
              Tom de Voz da Redação
              <input
                list="writer-tone-suggestions"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="Ex: Consultivo e direto"
                className={control}
              />
              <datalist id="writer-tone-suggestions">
                {DEFAULT_TONES.map((t) => <option key={t} value={t} />)}
              </datalist>
            </label>
            <label className="text-[11px] font-bold text-zinc-700">
              CTA (Chamada para Ação)
              <input
                list="writer-cta-suggestions"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="Ex: Chamar no WhatsApp"
                className={control}
              />
              <datalist id="writer-cta-suggestions">
                {DEFAULT_CTAS.map((c) => <option key={c} value={c} />)}
              </datalist>
            </label>
          </div>
        </div>
      </div>

      {/* SWITCHER SOCIAL MEDIA VS TRÁFEGO PAGO + SELETOR DE FORMATOS */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
            Formato & Canal da Peça
          </span>
          <div className="flex items-center bg-zinc-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                updateSpecs({ contentMode: "SOCIAL_MEDIA" });
                if (activeFormat === "META_ADS" || activeFormat === "GOOGLE_ADS") setActiveFormat("CAPTION");
              }}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                specs.contentMode === "SOCIAL_MEDIA"
                  ? "bg-white text-zinc-950 shadow-2xs font-bold"
                  : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-pink-600" />
              Social Media (Feed 4:5)
            </button>
            <button
              type="button"
              onClick={() => {
                updateSpecs({ contentMode: "ADS" });
                if (!["META_ADS", "GOOGLE_ADS", "REELS", "CAROUSEL", "LANDING_PAGE"].includes(activeFormat)) {
                  setActiveFormat("META_ADS");
                }
              }}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                specs.contentMode === "ADS"
                  ? "bg-white text-zinc-950 shadow-2xs font-bold"
                  : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              <Megaphone className="w-3.5 h-3.5 text-blue-600" />
              Tráfego Pago & Ads
            </button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {FORMAT_OPTIONS.map((fmt) => {
            const Icon = fmt.icon;
            const active = activeFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                type="button"
                onClick={() => {
                  setActiveFormat(fmt.id);
                  if (fmt.id === "META_ADS" || fmt.id === "GOOGLE_ADS") {
                    updateSpecs({ contentMode: "ADS" });
                  }
                }}
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
                {staleMaterials.includes(materialByFormat[fmt.id]) && (
                  <span className="mt-1 text-[10px] font-semibold text-amber-800">Revisar</span>
                )}
              </button>
            );
          })}
        </div>

        {/* PAINEL DE ESPECIFICAÇÕES TÉCNICAS DO FORMATO ATIVO */}
        <div className="p-4 bg-zinc-50 border border-zinc-200/90 rounded-2xl space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-900">
                Especificações Técnicas: {FORMAT_OPTIONS.find((f) => f.id === activeFormat)?.label}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-zinc-500">
              Parâmetros técnicos aplicados diretamente na geração pela IA
            </span>
          </div>

          {activeFormat === "REELS" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                    Duração Estimada
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {REELS_DURATION_OPTIONS.map((dur) => (
                      <button
                        key={dur.id}
                        type="button"
                        onClick={() => updateSpecs({ reelsDuration: dur.id })}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition border cursor-pointer whitespace-nowrap ${
                          specs.reelsDuration === dur.id
                            ? "bg-zinc-950 text-white border-zinc-950 shadow-xs"
                            : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                        }`}
                      >
                        {dur.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                    Estilo de Gravação
                  </label>
                  <select
                    value={specs.reelsStyle}
                    onChange={(e) => updateSpecs({ reelsStyle: e.target.value })}
                    className={control}
                  >
                    {REELS_STYLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 select-none">
                  <input
                    type="checkbox"
                    checked={specs.reelsIncludeOnScreen}
                    onChange={(e) => updateSpecs({ reelsIncludeOnScreen: e.target.checked })}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-medium">Indicações de [Texto na Tela]</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 select-none">
                  <input
                    type="checkbox"
                    checked={specs.reelsIncludeBroll}
                    onChange={(e) => updateSpecs({ reelsIncludeBroll: e.target.checked })}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-medium">Sugestões de cortes & B-roll</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 select-none">
                  <input
                    type="checkbox"
                    checked={specs.reelsIncludeDeliveryNotes}
                    onChange={(e) => updateSpecs({ reelsIncludeDeliveryNotes: e.target.checked })}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-medium">Instruções de tom & energia</span>
                </label>
              </div>
            </div>
          )}

          {activeFormat === "CAPTION" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                    Tamanho da Legenda
                  </label>
                  <select
                    value={specs.captionLength}
                    onChange={(e) => updateSpecs({ captionLength: e.target.value })}
                    className={control}
                  >
                    {CAPTION_LENGTH_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                    Estrutura de Copywriting
                  </label>
                  <select
                    value={specs.captionStructure}
                    onChange={(e) => updateSpecs({ captionStructure: e.target.value })}
                    className={control}
                  >
                    {CAPTION_STRUCTURE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                    Uso de Emojis
                  </label>
                  <select
                    value={specs.captionEmojiLevel}
                    onChange={(e) => updateSpecs({ captionEmojiLevel: e.target.value })}
                    className={control}
                  >
                    {CAPTION_EMOJI_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 select-none">
                  <input
                    type="checkbox"
                    checked={specs.captionIncludeAltHook}
                    onChange={(e) => updateSpecs({ captionIncludeAltHook: e.target.checked })}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-medium">Gerar gancho de abertura alternativo (Teste A/B)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 select-none">
                  <input
                    type="checkbox"
                    checked={specs.captionIncludeHashtags}
                    onChange={(e) => updateSpecs({ captionIncludeHashtags: e.target.checked })}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-medium">Incluir 4 a 6 hashtags estratégicas no rodapé</span>
                </label>
              </div>
            </div>
          )}

          {activeFormat === "CAROUSEL" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                    Quantidade de Slides
                  </label>
                  <div className="flex gap-1.5">
                    {CAROUSEL_SLIDE_COUNTS.map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => updateSpecs({ carouselSlides: count })}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                          specs.carouselSlides === count
                            ? "bg-zinc-950 text-white border-zinc-950 shadow-xs"
                            : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                    Estrutura Temática
                  </label>
                  <select
                    value={specs.carouselType}
                    onChange={(e) => updateSpecs({ carouselType: e.target.value })}
                    className={control}
                  >
                    {CAROUSEL_TYPE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                    Densidade de Texto
                  </label>
                  <select
                    value={specs.carouselWordLimit}
                    onChange={(e) => updateSpecs({ carouselWordLimit: e.target.value })}
                    className={control}
                  >
                    {CAROUSEL_DENSITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 select-none pt-1">
                <input
                  type="checkbox"
                  checked={specs.carouselIncludeSaveShare}
                  onChange={(e) => updateSpecs({ carouselIncludeSaveShare: e.target.checked })}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium">Slide final com CTA de alta conversão para SALVAR e COMPARTILHAR</span>
              </label>
            </div>
          )}

          {activeFormat === "LANDING_PAGE" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                  Objetivo da Landing Page
                </label>
                <select
                  value={specs.lpGoal}
                  onChange={(e) => updateSpecs({ lpGoal: e.target.value })}
                  className={control}
                >
                  {LP_GOAL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                  Seções Estruturais
                </label>
                <div className="flex flex-wrap gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 select-none">
                    <input
                      type="checkbox"
                      checked={specs.lpIncludePains}
                      onChange={(e) => updateSpecs({ lpIncludePains: e.target.checked })}
                      className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Dores do ICP</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 select-none">
                    <input
                      type="checkbox"
                      checked={specs.lpIncludeFaq}
                      onChange={(e) => updateSpecs({ lpIncludeFaq: e.target.checked })}
                      className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>FAQ de Objeções</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 select-none">
                    <input
                      type="checkbox"
                      checked={specs.lpIncludeGuarantee}
                      onChange={(e) => updateSpecs({ lpIncludeGuarantee: e.target.checked })}
                      className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Alívio de Risco / Garantia</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeFormat === "META_ADS" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                    Posicionamento do Criativo
                  </label>
                  <select
                    value={specs.metaAdsPlacement}
                    onChange={(e) => updateSpecs({ metaAdsPlacement: e.target.value })}
                    className={control}
                  >
                    {META_ADS_PLACEMENT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                    Objetivo / Ângulo da Campanha
                  </label>
                  <select
                    value={specs.metaAdsObjective}
                    onChange={(e) => updateSpecs({ metaAdsObjective: e.target.value })}
                    className={control}
                  >
                    {META_ADS_OBJECTIVE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 select-none">
                <input
                  type="checkbox"
                  checked={specs.metaAdsVariations}
                  onChange={(e) => updateSpecs({ metaAdsVariations: e.target.checked })}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium">Gerar 2 variações de copy principal (Dor vs Transformação)</span>
              </label>
            </div>
          )}

          {activeFormat === "GOOGLE_ADS" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                    Tipo de Campanha
                  </label>
                  <select
                    value={specs.googleAdsCampaignType}
                    onChange={(e) => updateSpecs({ googleAdsCampaignType: e.target.value })}
                    className={control}
                  >
                    {GOOGLE_ADS_CAMPAIGN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                    Intenção de Busca
                  </label>
                  <select
                    value={specs.googleAdsFocus}
                    onChange={(e) => updateSpecs({ googleAdsFocus: e.target.value })}
                    className={control}
                  >
                    {GOOGLE_ADS_FOCUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 select-none">
                <input
                  type="checkbox"
                  checked={specs.googleAdsIncludeExtensions}
                  onChange={(e) => updateSpecs({ googleAdsIncludeExtensions: e.target.checked })}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium">Incluir sugestões de Sitelinks e Frases de Destaque</span>
              </label>
            </div>
          )}
        </div>

        {/* PROMPT ESTRUTURADO RECOLHÍVEL E EDITÁVEL */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <button
              type="button"
              onClick={() => setPromptOpen((v) => !v)}
              className="flex items-center gap-2 text-xs font-bold text-zinc-800 cursor-pointer"
            >
              <FileText size={14} className="text-zinc-500" />
              Prompt Técnico Estruturado {promptEdited && "(Editado manualmente)"}
              {promptOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <div className="flex items-center gap-2">
              {promptEdited && (
                <button
                  type="button"
                  onClick={() => {
                    setPromptEdited(false);
                    setCustomPrompt("");
                  }}
                  className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 underline cursor-pointer"
                >
                  Restaurar automático
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(effectivePrompt);
                  setCopiedPrompt(true);
                  setTimeout(() => setCopiedPrompt(false), 2000);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
              >
                {copiedPrompt ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                {copiedPrompt ? "Copiado!" : "Copiar Prompt"}
              </button>
            </div>
          </div>
          {promptOpen && (
            <div className="p-3 bg-zinc-50/40">
              <textarea
                rows={10}
                value={effectivePrompt}
                onChange={(e) => {
                  setPromptEdited(true);
                  setCustomPrompt(e.target.value);
                }}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          )}
        </div>
      </div>

      {/* ÁREA DO EDITOR DE TEXTO / ROTEIRO */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-950">
              Redação: {FORMAT_OPTIONS.find((f) => f.id === activeFormat)?.label}
            </h3>
            <p className="text-xs text-zinc-500">
              Escreva diretamente ou gere com IA seguindo a headline, o briefing do projeto e as especificações técnicas acima.
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
              {generating ? "Redigindo com IA..." : staleMaterials.includes(materialByFormat[activeFormat]) ? "Regenerar este material" : "Gerar com IA"}
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
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition min-h-[380px] font-mono text-xs leading-relaxed"
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
            disabled={saving}
            onClick={() => void handleAdvance()}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
          >
            Avançar para Etapa 4: Prompt de Imagem & Arte
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
