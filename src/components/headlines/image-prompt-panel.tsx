"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Layers,
  Video,
  Target,
} from "lucide-react";

const control =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition";

interface ImagePromptPanelProps {
  clientId: string;
  companyName: string;
  contentId: string | null;
  headline: string;
  subheadline?: string;
  format: string;
  textContent: string;
  onAdvanceToSchedule: () => void;
  onBackToContent: () => void;
}

export function ImagePromptPanel({
  clientId,
  companyName,
  contentId,
  headline,
  subheadline,
  format,
  textContent,
  onAdvanceToSchedule,
  onBackToContent,
}: ImagePromptPanelProps) {
  // Determina o visualType inicial com base no formato
  const getInitialVisualType = (): "REELS_COVER" | "CAROUSEL_CARDS" | "FEED_IMAGE" | "AD_CREATIVE" => {
    const f = format.toLowerCase();
    if (f.includes("reels") || f.includes("vídeo") || f.includes("video")) return "REELS_COVER";
    if (f.includes("carrossel") || f.includes("carousel")) return "CAROUSEL_CARDS";
    if (f.includes("anúncio") || f.includes("ads") || f.includes("meta") || f.includes("google")) return "AD_CREATIVE";
    return "FEED_IMAGE";
  };

  const [visualType, setVisualType] = useState<"REELS_COVER" | "CAROUSEL_CARDS" | "FEED_IMAGE" | "AD_CREATIVE">(
    getInitialVisualType()
  );

  const [promptEnglish, setPromptEnglish] = useState("");
  const [promptPortuguese, setPromptPortuguese] = useState("");
  const [coverTextSuggestion, setCoverTextSuggestion] = useState("");
  const [artDirectionNotes, setArtDirectionNotes] = useState("");
  const [recommendedAspect, setRecommendedAspect] = useState("4:5");

  const [imageUrl, setImageUrl] = useState("");
  const [staleMaterials, setStaleMaterials] = useState<string[]>([]);
  const [editVersion, setEditVersion] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingArt, setSavingArt] = useState(false);
  const [copiedEn, setCopiedEn] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Carrega se a peça já tiver prompt visual ou imagem salva
  useEffect(() => {
    if (!contentId) return;
    const loadSaved = async () => {
      try {
        const res = await fetch(`/api/content-studio/posts/${contentId}`);
        if (!res.ok) return;
        const d = await res.json();
        if (d.data) {
          setStaleMaterials(d.data.stale_materials || []);
          setEditVersion(d.data.edit_version || "");
          if (d.data.image_url) setImageUrl(d.data.image_url);
          if (d.data.visual_prompt) setPromptEnglish(d.data.visual_prompt);
          if (d.data.visual_format) setVisualType(d.data.visual_format);
        }
      } catch {}
    };
    loadSaved();
  }, [contentId]);

  // Gerar prompt com IA
  const handleGeneratePrompt = async () => {
    setGenerating(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/headlines/visual-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          contentId: contentId || undefined,
          headline,
          subheadline,
          format,
          textContent,
          visualType,
          draftOnly: true,
        }),
      });

      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || "Erro ao gerar prompt visual.");

      setPromptEnglish(d.promptEnglish || "");
      setPromptPortuguese(d.promptPortuguese || "");
      setCoverTextSuggestion(d.coverTextSuggestion || "");
      setArtDirectionNotes(d.artDirectionNotes || "");
      setRecommendedAspect(d.recommendedAspect || "4:5");
      setFeedback({ type: "success", text: "Prompt visual detalhado gerado com sucesso!" });
    } catch (e: unknown) {
      const err = e as Error;
      setFeedback({ type: "error", text: err.message || "Erro na geração do prompt." });
    } finally {
      setGenerating(false);
    }
  };

  // Salvar imagem na peça
  const handleSaveImage = async () => {
    if (!contentId) {
      setFeedback({ type: "error", text: "Nenhuma peça associada encontrada." });
      return;
    }
    setSavingArt(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/content-studio/posts/${contentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: imageUrl.trim() || null,
          visualPrompt: promptEnglish,
          visualFormat: visualType,
          clientId,
          editVersion,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao salvar arte na peça.");
      setEditVersion(result.data.edit_version);
      setStaleMaterials(result.data.stale_materials || []);

      setFeedback({ type: "success", text: "Arte salva com sucesso na peça!" });
      setTimeout(() => setFeedback(null), 3000);
    } catch (e: unknown) {
      const err = e as Error;
      setFeedback({ type: "error", text: err.message || "Falha ao salvar arte." });
    } finally {
      setSavingArt(false);
    }
  };

  // Upload de arquivo de imagem
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (contentId) formData.append("contentId", contentId);

      const res = await fetch("/api/content-studio/upload", {
        method: "POST",
        body: formData,
      });

      const d = await res.json();
      if (!res.ok || !d.url) throw new Error(d.error || "Falha ao fazer upload da imagem.");

      setImageUrl(d.url);

      // Salva automaticamente na peça
      if (contentId) {
        const linked = await fetch(`/api/content-studio/posts/${contentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: d.url, clientId, editVersion }),
        });
        if (!linked.ok) throw new Error("A imagem foi enviada, mas o vínculo falhou. Salve o link exibido para tentar de novo.");
        const result = await linked.json();
        setEditVersion(result.data.edit_version);
        setStaleMaterials(result.data.stale_materials || []);
      }
      setFeedback({ type: "success", text: contentId ? "Imagem vinculada à peça." : "Imagem enviada." });
    } catch (err: unknown) {
      const error = err as Error;
      setFeedback({ type: "error", text: error.message || "Erro no upload da imagem." });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCopyPrompt = () => {
    if (!promptEnglish) return;
    navigator.clipboard.writeText(promptEnglish);
    setCopiedEn(true);
    setTimeout(() => setCopiedEn(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIOR DE CONTEXTO */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToContent}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-950 transition cursor-pointer"
            >
              <ArrowLeft size={14} />
              Voltar ao Passo 4: Redação
            </button>
            <span className="text-zinc-300">·</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-xs font-bold text-emerald-800">
              Passo 5: Prompt de Imagem & Upload de Arte
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
              disabled={generating}
              onClick={handleGeneratePrompt}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
            >
              <Sparkles size={14} className={generating ? "animate-spin" : ""} />
              {generating ? "Gerando Prompt..." : staleMaterials.includes("visual_prompt") ? "Regenerar prompt visual" : "Gerar Prompt Visual com IA"}
            </button>

            <button
              type="button"
              onClick={onAdvanceToSchedule}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-zinc-800 transition cursor-pointer"
            >
              Avançar para Etapa 06: Agendamento & Calendário
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* CARTÃO DE RESUMO */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Headline da Peça:</span>
            <div className="text-sm font-extrabold text-zinc-900">{headline}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-white border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-700">
              Formato: {format}
            </span>
            <span className="rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-xs font-bold">
              Proporção: {recommendedAspect}
            </span>
          </div>
        </div>
      </div>

      {/* SELETOR DO TIPO VISUAL */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {([
          { id: "REELS_COVER", label: "Capa do Reels (9:16)", icon: Video, desc: "Foco na área central 1:1, expressão marcante e iluminação de estúdio." },
          { id: "CAROUSEL_CARDS", label: "Cards de Carrossel (4:5)", icon: Layers, desc: "Capa com alto contraste + direção de arte dos slides de conteúdo." },
          { id: "FEED_IMAGE", label: "Arte Post Estático (4:5)", icon: ImageIcon, desc: "Fotografia editorial de alta definição ou ilustração moderna." },
          { id: "AD_CREATIVE", label: "Criativo de Anúncio", icon: Target, desc: "Gancho visual imediato focado em clique e quebra de padrão." },
        ] as const).map((item) => {
          const Icon = item.icon;
          const active = visualType === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setVisualType(item.id)}
              className={
                "flex flex-col items-start p-4 rounded-xl border text-left transition cursor-pointer " +
                (active
                  ? "border-emerald-600 bg-emerald-50/70 shadow-2xs text-emerald-950 font-bold"
                  : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700")
              }
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className={active ? "text-emerald-700" : "text-zinc-500"} />
                <span className="text-xs font-bold">{item.label}</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{item.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* COLUNA 1: PROMPT GERADO PELA IA */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-600" />
                Prompt Visual Detalhado (Midjourney / DALL-E / Recraft)
              </h3>
              <p className="text-[11px] text-zinc-500">
                Copie e cole diretamente na ferramenta de imagem de sua preferência.
              </p>
            </div>

            {promptEnglish && (
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                {copiedEn ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copiedEn ? "Copiado!" : "Copiar Prompt"}
              </button>
            )}
          </div>

          {promptEnglish ? (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                  Prompt em Inglês (Otimizado para IAs de Imagem):
                </label>
                <div className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 font-mono text-xs leading-relaxed text-zinc-800 select-all">
                  {promptEnglish}
                </div>
              </div>

              {promptPortuguese && (
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    Significado em Português:
                  </label>
                  <p className="mt-1 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 text-xs text-zinc-700 leading-relaxed">
                    {promptPortuguese}
                  </p>
                </div>
              )}

              {coverTextSuggestion && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900">
                    Sugestão de Texto para Sobrepor na Arte/Capa:
                  </span>
                  <div className="text-xs font-extrabold text-indigo-950 mt-0.5">
                    &ldquo;{coverTextSuggestion}&rdquo;
                  </div>
                </div>
              )}

              {artDirectionNotes && (
                <div className="rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
                  <span className="font-bold text-zinc-800">Diretrizes de Arte: </span>
                  {artDirectionNotes}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center space-y-3">
              <Sparkles size={32} className="mx-auto text-zinc-300" />
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Clique no botão <strong>&ldquo;Gerar Prompt Visual com IA&rdquo;</strong> acima para criar o prompt detalhado desta peça.
              </p>
            </div>
          )}
        </div>

        {/* COLUNA 2: UPLOAD DA ARTE FINAL */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
              <ImageIcon size={16} className="text-indigo-600" />
              Arte Final da Peça
            </h3>
            <p className="text-[11px] text-zinc-500">
              Faça o upload do arquivo ou cole o link da imagem gerada. Se você ainda não tem a imagem, pode avançar para a Etapa 06 e subir depois!
            </p>
          </div>

          <div className="space-y-4">
            {/* Input URL */}
            <div>
              <label className="text-xs font-semibold text-zinc-700">URL da Imagem / Arte</label>
              {staleMaterials.includes("image_url") && <p className="text-xs font-semibold text-amber-800">A imagem salva precisa de revisão.</p>}
              <div className="mt-1 flex gap-2">
                <input
                  className={control}
                  placeholder="https://... ou faça upload abaixo"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <button
                  type="button"
                  disabled={savingArt}
                  onClick={handleSaveImage}
                  className="mt-1 inline-flex items-center rounded-xl bg-zinc-900 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </div>

            {/* Upload de arquivo */}
            <div>
              <label className="text-xs font-semibold text-zinc-700">Ou faça o Upload do Arquivo (PNG, JPG, WebP)</label>
              <label className="mt-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-6 text-center hover:bg-zinc-50 cursor-pointer transition">
                <Upload size={24} className="text-zinc-400 mb-2" />
                <span className="text-xs font-bold text-zinc-700">
                  {uploadingImage ? "Fazendo upload..." : "Clique para selecionar o arquivo"}
                </span>
                <span className="text-[10px] text-zinc-400 mt-0.5">Suporta até 15MB</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingImage}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Preview da Imagem */}
            {imageUrl && (
              <div className="rounded-xl border border-zinc-200 overflow-hidden bg-zinc-100 p-2 text-center">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                  Preview da Arte
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Arte do post"
                  className="mx-auto max-h-[220px] rounded-lg object-contain shadow-2xs"
                  onError={() => setFeedback({ type: "error", text: "Não foi possível carregar a imagem da URL." })}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
