"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ProjectPostPicker, type PlannedProjectPost } from "@/components/content-studio/project-post-picker";
import { SocialWorkflowStepper } from "@/components/content-studio/social-workflow-stepper";
import { toast } from "@/components/ui/toast-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompany } from "@/lib/context/company-context";
import { contentCompanyId } from "@/modules/clients/internal-company";
import { briefSchema, blankBrief, fieldGroups, structures, angles, triggers, awareness, formats, missingBrief, sameBrief, type HeadlineBrief } from "@/modules/headlines/schema";
import { makeHeadlinePrompt } from "@/modules/headlines/prompt";
import {
  brainstormModes,
  type BrainstormMode,
  BRAINSTORM_ANGLES,
  type BrainstormAngleId,
  type FocusSuggestion,
} from "@/modules/headlines/brainstorm-modes";
import { suggestPostFits } from "@/modules/headlines/brainstorm-post-fit";
import { ProductionChecklist } from "@/components/content-studio/production-checklist";
import { ContentDeliveryPanel } from "@/components/content-studio/content-delivery-panel";
import type { Context, WorkspaceState, Run, Candidate, ModelSlot } from "@/modules/headlines/types";
import { ContentWriterPanel } from "@/components/headlines/content-writer-panel";
import { ImagePromptPanel } from "@/components/headlines/image-prompt-panel";
import { SchedulePanel } from "@/components/headlines/schedule-panel";
import {
  ThumbsUp,
  ThumbsDown,
  Check,
  Sparkles,
  RefreshCw,
  Pencil,
  BarChart3,
  Lightbulb,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Layers,
  Target,
  Compass,
  CheckCircle2,
  BookOpen,
  Bookmark,
  Ban,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Calendar,
  FileText,
  Image as ImageIcon,
  Package,
} from "lucide-react";

const control = "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition";
const button = "inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-950 disabled:opacity-40 transition cursor-pointer";
const buttonPrimary = "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-40 transition cursor-pointer";

interface IdeaSource {
  source_title?: string | null;
  source_url?: string | null;
  source_date?: string | null;
}

function BrainstormIdeaSource({ source }: { source: IdeaSource }) {
  if (!source.source_title) return null;
  const date = source.source_date?.slice(0, 10).split("-").reverse().join("/");
  return (
    <p className="text-xs text-zinc-600">
      {source.source_url ? (
        <a href={source.source_url} target="_blank" rel="noreferrer" className="font-medium text-emerald-800 underline">
          {source.source_title}
        </a>
      ) : source.source_title}
      {date && <span className="ml-2 text-zinc-500">{date}</span>}
    </p>
  );
}

interface SavedIdea extends IdeaSource {
  id: string;
  client_id: string;
  pillar_id: string | null;
  editorial_line_id: string | null;
  pillar_name: string;
  theme_name: string;
  title: string;
  angle: string;
  format: string;
  target_audience: string;
  pain_or_desire: string;
  goal: string;
  rationale: string;
  status: "IDEA" | "SAVED_FOR_LATER" | "REJECTED" | "HEADLINES_IN_PROGRESS" | "HEADLINE_CHOSEN" | "IN_CREATION" | "DONE" | "ARCHIVED";
  rejection_reason?: string;
  team?: "A" | "B";
  model_name?: string | null;
  refinement_history?: {
    generator_team: "A" | "B";
    generator_model: string;
    reviewer_team: "A" | "B";
    reviewer_model: string;
    ai_score: number;
    reviewer_reason: string;
    reviewer_suggestion: string;
    initial_title: string;
    initial_rationale: string;
  } | null;
  workspace_id: string | null;
  content_id: string | null;
  post_status?: string | null;
  project_id?: string | null;
  created_at: string;
  offer_name?: string;
  offer_id?: string | null;
  audience_angle?: string;
  angle_focus?: string;
  required_material?: string;
  is_hypothesis?: boolean;
}

interface Pillar {
  id: string;
  name: string;
}

interface BrainstormAiIdea extends IdeaSource {
  id?: string;
  is_new?: boolean;
  status?: SavedIdea["status"];
  title: string;
  pillar_id?: string | null;
  editorial_line_id?: string | null;
  pillar_name?: string;
  theme_name?: string;
  angle?: string;
  format?: string;
  target_audience?: string;
  pain_or_desire?: string;
  goal?: string;
  rationale?: string;
  team?: "A" | "B";
  model_name?: string | null;
  refinement_history?: SavedIdea["refinement_history"];
  offer_name?: string;
  offer_id?: string | null;
  audience_angle?: string;
  angle_focus?: string;
  required_material?: string;
  is_hypothesis?: boolean;
}

interface EditorialLine {
  id: string;
  pillar_id: string | null;
  pillar_name: string;
  theme: string;
  objective: string | null;
  preferred_formats: string[];
}

function ExperimentForm({ workspaceId, candidates, onSaved }: { workspaceId: string; candidates: Candidate[]; onSaved: () => void }) {
  const [form, setForm] = useState({ a: "", b: "", hypothesis: "", variable: "", controls: "", metric: "CTR" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <details className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
      <summary className="font-bold cursor-pointer text-sm text-zinc-950">Planejar teste A/B entre duas opções</summary>
      <p className="my-3 text-xs text-zinc-500">Os times A e B de modelos não são, por si só, um experimento. Defina uma variável e mantenha as demais condições comparáveis.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {(["a", "b"] as const).map((key) => (
          <label className="text-xs font-semibold text-zinc-700" key={key}>
            Opção {key.toUpperCase()}
            <select className={control} value={form[key]} onChange={(e) => setForm((v) => ({ ...v, [key]: e.target.value }))}>
              <option value="">Escolher</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>{c.headline}</option>
              ))}
            </select>
          </label>
        ))}
        {(["hypothesis", "variable", "controls", "metric"] as const).map((key, i) => (
          <label className="text-xs font-semibold text-zinc-700" key={key}>
            {["Hipótese", "Única variável alterada", "Condições mantidas iguais", "Métrica principal"][i]}
            <input className={control} value={form[key]} onChange={(e) => setForm((v) => ({ ...v, [key]: e.target.value }))} />
          </label>
        ))}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
      <button
        className={button + " mt-3"}
        disabled={saving || Object.values(form).some((v) => !v.trim())}
        onClick={() => {
          setSaving(true);
          setError("");
          fetch("/api/headlines", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "EXPERIMENT", data: { ...form, workspaceId } }),
          })
            .then(async (r) => {
              if (!r.ok) {
                const d = await r.json();
                throw new Error(d.error || "Erro ao salvar");
              }
              onSaved();
            })
            .catch((e) => setError(e.message))
            .finally(() => setSaving(false));
        }}
      >
        Salvar hipótese de teste
      </button>
    </details>
  );
}

async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch("/api/headlines" + path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Não foi possível concluir.");
  return data;
}

function CandidateCard({
  value,
  winner,
  onRate,
  onSelect,
  onInspire,
  inspired,
  blind,
}: {
  value: Candidate;
  winner: boolean;
  onRate: (n: number, reason: string) => void;
  onSelect: () => void;
  onInspire: () => void;
  inspired: boolean;
  blind: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [reason, setReason] = useState(value.reason || "");

  useEffect(() => {
    const el = ref.current;
    if (!el || value.presented_at) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        void api("", { action: "PRESENT", ids: [value.id] }).catch(() => {});
        observer.disconnect();
      }
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [value.id, value.presented_at]);

  return (
    <article ref={ref} className={"space-y-3 rounded-xl border p-4 shadow-2xs " + (winner ? "border-emerald-500 bg-emerald-50/70" : "border-zinc-200 bg-white")}>
      <p className="text-base font-bold leading-snug text-zinc-950">{value.headline}</p>
      {value.subheadline && <p className="text-sm text-zinc-600">{value.subheadline}</p>}
      <p className="text-[11px] text-zinc-500">
        {value.headline.length} caracteres · {value.metadata.structure} · {value.metadata.angle}
        {value.source === "HUMAN" ? " · Autoria própria" : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          aria-label="Gostei"
          aria-pressed={value.rating === 1}
          onClick={() => onRate(value.rating === 1 ? 0 : 1, reason)}
          className={button + (value.rating === 1 ? " !bg-emerald-100 !text-emerald-900 border-emerald-300" : "")}
        >
          <ThumbsUp size={16} />
        </button>
        <button
          aria-label="Não gostei"
          aria-pressed={value.rating === -1}
          onClick={() => onRate(value.rating === -1 ? 0 : -1, reason)}
          className={button + (value.rating === -1 ? " !bg-rose-100 !text-rose-900 border-rose-300" : "")}
        >
          <ThumbsDown size={16} />
        </button>
        <button
          aria-label="Escolher esta headline"
          aria-pressed={winner}
          onClick={onSelect}
          className={winner ? buttonPrimary : button}
        >
          <Check size={16} />
          {winner ? "Escolhida" : "Escolher"}
        </button>
      </div>
      <input
        aria-label="Motivo da avaliação"
        placeholder="Motivo opcional: genérica, artificial, clara..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        onBlur={() => {
          if (value.rating && reason !== value.reason) onRate(value.rating, reason);
        }}
        className={control}
      />
      <button onClick={onInspire} aria-pressed={inspired} className="text-xs font-semibold underline text-zinc-600 hover:text-zinc-900 cursor-pointer">
        {inspired ? "✓ Usar como inspiração" : "Marcar como inspiração"}
      </button>
      <details className="text-xs text-zinc-600">
        <summary className="cursor-pointer font-medium text-zinc-700">Justificativa e revisão</summary>
        <p className="mt-2">{value.metadata.rationale}</p>
        {Object.entries(value.metadata.review || {}).map(([k, v]) => (
          <p key={k}>{k}: {v}</p>
        ))}
        {value.metadata.warnings?.map((v, i) => (
          <p key={i} className="mt-1 text-amber-800">{v}</p>
        ))}
        {Object.entries(value.metadata.scores || {}).map(([key, v]) => (
          <p key={key}>{key}: {v.score}/5 · {v.reason}</p>
        ))}
        <p className="mt-2 text-zinc-400">Autoavaliação editorial da IA, sem previsão de CTR ou garantia de aprovação.</p>
      </details>
      {!blind && value.source === "HUMAN" && (
        <p className="text-xs text-zinc-500">Exemplo positivo do seu estilo. Sem vitória atribuída a uma IA.</p>
      )}
    </article>
  );
}

function HeadlineWorkspace() {
  const { selectedCompany } = useCompany();
  const params = useSearchParams();
  const postId = params.get("projectPostId");
  const [result, setResult] = useState<{ id: string; post?: PlannedProjectPost; error?: string } | null>(null);

  useEffect(() => {
    if (!postId) return;
    const controller = new AbortController();
    fetch("/api/content-studio/project-posts?" + new URLSearchParams({ id: postId }), { signal: controller.signal })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setResult({ id: postId, post: body.posts[0] });
      })
      .catch(reason => { if (!controller.signal.aborted) setResult({ id: postId, error: reason.message }); });
    return () => controller.abort();
  }, [postId]);

  if (postId && result?.id !== postId) return <p className="p-6" role="status">Carregando post do projeto…</p>;
  if (postId && !result?.post) return <div className="space-y-2 p-6">
    <p role="alert">{result?.error || "Post de projeto indisponível."}</p>
    <Link href="/prompt-creator/brainstorm" className="underline">Voltar ao brainstorm</Link>
  </div>;

  const projectPost = postId ? result?.post : undefined;
  const clientId = projectPost?.clientId || contentCompanyId(selectedCompany);
  return <Workspace key={projectPost?.id || clientId} clientId={clientId}
    companyName={projectPost?.companyName || selectedCompany.name} projectPost={projectPost} />;
}

function Workspace({ clientId, companyName, projectPost }: {
  clientId: string;
  companyName: string;
  projectPost?: PlannedProjectPost;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const tabParam = params.get("tab");
  const [linkedProjectPostId, setLinkedProjectPostId] = useState<string | null>(null);
  const productionTab = tabParam === "headlines" || tabParam === "content" || tabParam === "imagePrompt" || tabParam === "schedule" ? tabParam : null;
  const workspaceId = params.get("workspaceId") || (productionTab ? projectPost?.workspaceId : null);
  const contentId = projectPost ? (productionTab && (projectPost.hasIdea || linkedProjectPostId === projectPost.id) ? projectPost.id : null) : params.get("contentId");
  const projectPostId = projectPost?.id;
  const activeTab = productionTab || (tabParam === "brainstorm" ? "brainstorm" :
    workspaceId || contentId ? "headlines" : "brainstorm");
  const setActiveTab = (tab: typeof activeTab) => {
    const next = new URLSearchParams(params.toString());
    next.set("tab", tab);
    if (workspaceId) next.set("workspaceId", workspaceId);
    router.replace("?" + next, { scroll: false });
  };

  useEffect(() => {
    if (tabParam === "strategy") {
      router.replace(`/strategy?clientId=${encodeURIComponent(clientId)}`);
    }
  }, [tabParam, clientId, router]);

  const [availablePosts, setAvailablePosts] = useState<PlannedProjectPost[]>([]);
  const [weeklyReview, setWeeklyReview] = useState<{
    recommendations: { ideaId: string; postId: string }[];
    tokens: number | null;
    adopted: number;
    tokensPerAdopted: number | null;
  } | null>(null);
  const [refreshingReview, setRefreshingReview] = useState(false);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());

  // Times A e B no Brainstorm e dados do fluxo de criação
  const [brainstormTeam, setBrainstormTeam] = useState<"BOTH" | "A" | "B">("BOTH");
  const [refineWithOpposingTeam, setRefineWithOpposingTeam] = useState(true);
  const [filterTeam, setFilterTeam] = useState<"ALL" | "A" | "B">("ALL");
  const [activeContentData, setActiveContentData] = useState<{
    format: string;
    text: string;
    contentId: string;
  } | null>(null);

  // Estado do Brainstorm de Conteúdo & Oferta/Ângulo
  const [strategySummaryOpen, setStrategySummaryOpen] = useState(false);
  const [catalogOffers, setCatalogOffers] = useState<{ id: string; name: string; type: string; category?: string }[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<string>("");
  const [customOfferName, setCustomOfferName] = useState("");
  const [selectedAngleId, setSelectedAngleId] = useState<BrainstormAngleId>("EXPLORE");
  const [angleFocusText, setAngleFocusText] = useState("");
  const [suggestingFocus, setSuggestingFocus] = useState(false);
  const [focusSuggestions, setFocusSuggestions] = useState<FocusSuggestion[]>([]);

  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [editorialLines, setEditorialLines] = useState<EditorialLine[]>([]);
  const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>([]);
  const [rejectedIdeas, setRejectedIdeas] = useState<SavedIdea[]>([]);
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [loadingBrainstorm, setLoadingBrainstorm] = useState(false);
  const [selectedPillarId, setSelectedPillarId] = useState<string>("");
  const [selectedLineId, setSelectedLineId] = useState<string>("");
  const [brainstormDirection, setBrainstormDirection] = useState("");

  useEffect(() => {
    setSelectedOffer("");
    setCustomOfferName("");
    setSelectedAngleId("EXPLORE");
    setAngleFocusText("");
    setFocusSuggestions([]);
    setAiGeneratedIdeas([]);
  }, [clientId]);

  useEffect(() => {
    if (typeof window !== "undefined" && clientId) {
      const saved = localStorage.getItem(`otimizza_brainstorm_dir_${clientId}`);
      if (saved) setBrainstormDirection(saved);
      else setBrainstormDirection("");
    }
  }, [clientId]);

  const handleDirectionChange = (val: string) => {
    setBrainstormDirection(val);
    if (typeof window !== "undefined" && clientId) {
      localStorage.setItem(`otimizza_brainstorm_dir_${clientId}`, val);
    }
  };
  const [brainstormMode, setBrainstormMode] = useState<BrainstormMode>("PILLARS");
  const [brainstormView, setBrainstormView] = useState<"discover" | "bank" | "rejected">("discover");
  const [brainstormFormat, setBrainstormFormat] = useState("Todos");
  const [aiGeneratedIdeas, setAiGeneratedIdeas] = useState<BrainstormAiIdea[]>([]);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAngle, setManualAngle] = useState("Passo a Passo Prático");
  const [manualFormat, setManualFormat] = useState("Carrossel");
  const [manualAudience, setManualAudience] = useState("");
  const [manualPain, setManualPain] = useState("");
  const [manualGoal, setManualGoal] = useState("");
  const [manualRationale, setManualRationale] = useState("");
  const [convertingIdeaId, setConvertingIdeaId] = useState<string | null>(null);
  const convertingIdea = useRef(false);

  // Filtros de exibição do mural
  const [filterPillar, setFilterPillar] = useState<string>("ALL");
  const [filterFormat, setFilterFormat] = useState<string>("ALL");
  const [activeIdeaForHeadline, setActiveIdeaForHeadline] = useState<SavedIdea | null>(null);

  // Estado do Laboratório de Headlines
  const [data, setData] = useState<WorkspaceState | null>(null);
  const [context, setContext] = useState<Context | null>(null);
  const [brief, setBrief] = useState<HeadlineBrief>(blankBrief);
  const [list, setList] = useState<{ id: string; title: string; format: string }[]>([]);
  const [models, setModels] = useState<Record<string, ModelSlot[]>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeRound, setActiveRound] = useState("");
  const [services, setServices] = useState<{ id: string; name: string; description?: string }[]>([]);
  const [blind, setBlind] = useState(false);
  const [manual, setManual] = useState(false);
  const [humanHeadline, setHumanHeadline] = useState("");
  const [humanSub, setHumanSub] = useState("");
  const [inspired, setInspired] = useState<string[]>([]);
  const [style, setStyle] = useState("");
  const [styleInfo, setStyleInfo] = useState("");
  const [suggestedStyle, setSuggestedStyle] = useState("");
  const [catalog, setCatalog] = useState<{ team: string; slot: number; model: string; available: boolean }[]>([]);
  const revision = useRef(1);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const mounted = useRef(true);
  const initialized = useRef("");

  // 1. Carrega dados do Brainstorm (Pilares, Linhas, Ideias, Catálogo e Lista Negra)
  const loadBrainstormData = async () => {
    setLoadingBrainstorm(true);
    try {
      const [res, catRes] = await Promise.all([
        fetch(`/api/headlines/brainstorm?clientId=${clientId}`),
        fetch(`/api/clients/${encodeURIComponent(clientId)}/catalog`),
      ]);
      if (!res.ok) throw new Error("Erro ao carregar dados do brainstorm");
      const d = await res.json();
      setPillars(d.pillars || []);
      setEditorialLines(d.lines || []);
      setSavedIdeas(d.ideas || []);
      setRejectedIdeas(d.rejectedIdeas || []);
      setWeeklyReview(d.weeklyReview || null);

      if (catRes.ok) {
        const catData = await catRes.json();
        if (Array.isArray(catData.items)) {
          setCatalogOffers(catData.items.map((i: { id: string; name: string; type: string; category?: string }) => ({
            id: i.id,
            name: i.name,
            type: i.type || "PRODUCT",
            category: i.category,
          })));
        }
      }
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || "Falha ao carregar brainstorm.");
    } finally {
      setLoadingBrainstorm(false);
    }
  };

  const refreshWeeklyReview = async () => {
    setRefreshingReview(true);
    try {
      const response = await fetch("/api/headlines/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REFRESH_WEEKLY_REVIEW", clientId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar a curadoria.");
      setWeeklyReview(result.weeklyReview);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Não foi possível atualizar a curadoria.");
    } finally {
      setRefreshingReview(false);
    }
  };

  useEffect(() => {
    loadBrainstormData();
  }, [clientId]);

  // Carrega serviços
  useEffect(() => {
    fetch("/api/services")
      .then(async (r) => {
        if (!r.ok) return;
        const v = await r.json();
        if (mounted.current && Array.isArray(v)) setServices(v);
      })
      .catch(() => {});
  }, []);

  // Preenche dados do DNA
  useEffect(() => {
    if (!data || !context || initialized.current === data.workspace.id) return;
    initialized.current = data.workspace.id;
    const dna = context.identity;
    const profile = dna.commercial_profile as Record<string, string> | undefined;
    const first = (value: unknown) => (Array.isArray(value) ? String(value[0] || "") : "");
    setBrief((old) => ({
      ...old,
      value: old.value || String(dna.value_proposition || ""),
      differential: old.differential || (Array.isArray(dna.differentials) ? dna.differentials.join("; ") : ""),
      tone: old.tone || first(dna.tone_of_voice),
      cta: old.cta || first(dna.default_ctas),
      forbiddenWords: old.forbiddenWords || (Array.isArray(dna.forbidden_words) ? dna.forbidden_words.join("; ") : ""),
      goal: old.goal || profile?.commercialObjective || "",
      speaker: old.speaker || (context.communicationProfile?.speakerTypes.length === 1 ? context.communicationProfile.speakerTypes[0] : ""),
      voice: old.voice || (context.communicationProfile?.contentVoices.length === 1 ? context.communicationProfile.contentVoices[0] : ""),
    }));
  }, [data?.workspace.id, context]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Contexto e peças
  useEffect(() => {
    const abort = new AbortController();
    setError("");
    Promise.all([
      fetch("/api/headlines?action=context&clientId=" + clientId, { signal: abort.signal }).then(async (r) => {
        const v = await r.json();
        if (!r.ok) throw new Error(v.error);
        return v as Context;
      }),
      api<Record<string, ModelSlot[]>>("?action=models"),
      api<{ id: string; title: string; format: string }[]>("?clientId=" + clientId),
    ])
      .then(([c, m, l]) => {
        if (!abort.signal.aborted) {
          setContext(c);
          setModels(m);
          setList(l);
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [clientId]);

  // Carrega workspace ativo
  useEffect(() => {
    if (!workspaceId) return;
    let alive = true;
    api<WorkspaceState>("?id=" + workspaceId)
      .then((v) => {
        if (!alive) return;
        if (v.workspace.client_id !== clientId) throw new Error("Esta peça pertence a outro cliente. Selecione-o no cabeçalho.");
        if (projectPostId && v.workspace.content_id !== projectPostId) throw new Error("Esta criação pertence a outro post.");
        setData(v);
        revision.current = v.workspace.revision;
        setBrief(briefSchema.parse(v.workspace.brief));
        setActiveRound(v.rounds.at(-1)?.id || "");
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [workspaceId, clientId, projectPostId]);

  useEffect(() => {
    if (!contentId || workspaceId) return;
    let alive = true;
    api<{ id: string }>("", { action: "CREATE", clientId, contentId })
      .then((v) => {
        if (alive) {
          const next = new URLSearchParams({ workspaceId: v.id });
          if (projectPostId) next.set("projectPostId", projectPostId);
          if (productionTab) next.set("tab", productionTab);
          router.replace("/prompt-creator/headlines?" + next, { scroll: false });
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [contentId, workspaceId, clientId, projectPostId, productionTab, router]);

  useEffect(() => {
    let alive = true;
    api<{ guidance: string; positive: unknown[]; negative: unknown[]; initial: boolean }>(
      "?action=style&clientId=" + clientId + "&format=" + encodeURIComponent(brief.format)
    )
      .then((v) => {
        if (alive) {
          setStyle(v.guidance);
          setStyleInfo(`${v.positive.length} positivas · ${v.negative.length} negativas · ${v.initial ? "Personalização inicial" : "Histórico disponível"}`);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [clientId, brief.format, data?.candidates.map((c) => `${c.id}:${c.rating}:${c.reason}`).join("|")]);

  const update = (key: keyof HeadlineBrief, value: unknown) =>
    setBrief((old) => {
      if (key === "audience") {
        const selected = context?.audiences.find((a) => a.name === value);
        const first = (v: unknown) => (Array.isArray(v) ? String(v[0] || "") : "");
        return {
          ...old,
          audience: String(value),
          pain: old.pain || first(selected?.pain_points),
          desire: old.desire || first(selected?.desires),
          objection: old.objection || first(selected?.objections),
        };
      }
      return { ...old, [key]: value };
    });

  async function perform(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "Falha na operação");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function refresh() {
    if (!data) return;
    const v = await api<WorkspaceState>("?id=" + data.workspace.id);
    if (mounted.current) setData(v);
    return v;
  }

  async function save() {
    if (!data) throw new Error("Abra uma peça.");
    const id = data.workspace.id;
    const payload = brief;
    const next = saveQueue.current.catch(() => {}).then(async () => {
      const v = await api<WorkspaceState>("", { action: "SAVE", id, brief: payload, revision: revision.current });
      revision.current = v.workspace.revision;
      if (mounted.current) {
        setData(v);
        setMessage("Briefing salvo.");
      }
      return v;
    });
    saveQueue.current = next;
    return next as Promise<WorkspaceState>;
  }

  const dirty = Boolean(data && !sameBrief(brief, data.workspace.brief));

  useEffect(() => {
    if (!dirty || !data || busy || generating) return;
    const timer = setTimeout(() => {
      void save().catch((e) => setError(e.message));
    }, 1800);
    return () => clearTimeout(timer);
  }, [brief, dirty, data?.workspace.id, busy, generating]);

  async function executePending(state: WorkspaceState, roundId: string) {
    setGenerating(true);
    try {
      const pending = state.runs.filter((r) => r.round_id === roundId && r.status === "PENDING");
      const slots = [...new Set(pending.map((r) => r.team + ":" + r.slot))];
      await Promise.allSettled(
        slots.map(async (slot) => {
          for (const run of pending.filter((r) => r.team + ":" + r.slot === slot)) {
            try {
              await api("", { action: "RUN", id: run.id });
            } finally {
              await refresh();
            }
          }
        })
      );
      await refresh();
    } finally {
      if (mounted.current) setGenerating(false);
    }
  }

  async function startRound() {
    await perform(async () => {
      const saved = await save();
      const round = await api<{ id: string }>("", { action: "ROUND", id: saved.workspace.id, revision: saved.workspace.revision });
      setActiveRound(round.id);
      const fresh = await refresh();
      if (fresh) await executePending(fresh, round.id);
    });
  }

  async function batch(team: "A" | "B", regenerate: boolean) {
    await perform(async () => {
      const original = data?.rounds.find((r) => r.id === activeRound);
      if (original && !sameBrief(original.brief, brief)) {
        throw new Error("O briefing mudou. Inicie uma nova rodada para comparar os mesmos dados.");
      }
      await api("", { action: "BATCH", roundId: activeRound, team, regenerate });
      const fresh = await refresh();
      if (fresh) await executePending(fresh, activeRound);
    });
  }

  async function rate(c: Candidate, rating: number, reason: string) {
    await perform(async () => {
      await api("", { action: "RATE", id: c.id, rating, reason });
      await refresh();
    });
  }

  async function choose(c: Candidate) {
    await perform(async () => {
      await api("", { action: "SELECT", id: c.id });
      await refresh();
      setMessage("Headline escolhida e inserida na criação de conteúdo!");
    });
  }

  // =========================================================================
  // AÇÕES DO BRAINSTORM (USAR AGORA, DEIXAR PARA A PRÓXIMA, REJEITAR)
  // =========================================================================

  // 1. Gerar Ideias com IA
  async function handleGenerateAiIdeas() {
    setGeneratingIdeas(true);
    setError("");
    setMessage("");
    try {
      const activeOfferName =
        selectedOffer === "custom"
          ? customOfferName.trim()
          : selectedOffer
          ? catalogOffers.find((o) => o.id === selectedOffer)?.name
          : undefined;
      const activeOfferId = selectedOffer && selectedOffer !== "custom" ? selectedOffer : undefined;
      const activeAngle = BRAINSTORM_ANGLES.find((a) => a.id === selectedAngleId)?.label;

      const res = await fetch("/api/headlines/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GENERATE",
          clientId,
          mode: brainstormMode,
          pillarId: selectedPillarId || undefined,
          editorialLineId: selectedLineId || undefined,
          direction: brainstormDirection.trim() || undefined,
          count: 5,
          team: brainstormTeam,
          refineWithOpposingTeam,
          format: brainstormFormat === "Todos" ? undefined : brainstormFormat,
          offerName: activeOfferName,
          offerId: activeOfferId,
          audienceAngle: activeAngle,
          angleFocus: angleFocusText.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || "Erro ao gerar ideias de conteúdo.");
      setAiGeneratedIdeas(d.ideas || []);
      setMessage(d.checking ? "Já existe uma consulta em andamento. Consulte novamente em instantes."
        : d.refreshFailed ? "A atualização falhou. Confira as ideias já salvas."
        : d.newCount ? `${d.newCount} ideias novas salvas. As ideias anteriores continuam disponíveis.`
        : d.ideas?.length ? "Sem novas ideias nesta consulta. Veja as sugestões já salvas."
        : "Nenhuma sugestão disponível para esta consulta.");
      if (d.newCount) await loadBrainstormData();
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || "Falha na geração de ideias.");
    } finally {
      setGeneratingIdeas(false);
    }
  }

  // 1.1 Sugestão assistida de foco
  async function handleSuggestFocus() {
    setSuggestingFocus(true);
    setError("");
    try {
      const activeOfferName =
        selectedOffer === "custom"
          ? customOfferName.trim()
          : selectedOffer
          ? catalogOffers.find((o) => o.id === selectedOffer)?.name
          : undefined;
      const res = await fetch("/api/headlines/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUGGEST_FOCUS",
          clientId,
          offerName: activeOfferName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Não foi possível sugerir caminhos.");
      const paths = data.paths || [];
      setFocusSuggestions(paths);
      if (paths.length > 0) {
        toast.success(`${paths.length} caminhos de foco sugeridos logo abaixo!`);
      } else {
        toast.info("Nenhum caminho sugerido para os dados atuais.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao sugerir caminhos de foco.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSuggestingFocus(false);
    }
  }

  // 2. Ação A: Usar essa ideia (Avança imediatamente para Headlines)
  async function handleUseIdeaNow(idea: BrainstormAiIdea | SavedIdea, linkOnly = false, suggestedPostId?: string) {
    if (convertingIdea.current) return;
    convertingIdea.current = true;
    setConvertingIdeaId(idea.id || null);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/headlines/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: linkOnly ? "LINK_TO_POST" : "USE_NOW",
          clientId,
          projectPostId: suggestedPostId || projectPost?.id || ("project_id" in idea && idea.project_id ? idea.content_id : undefined),
          ideaId: idea.id || undefined,
          title: idea.title,
          pillarId: idea.pillar_id || null,
          editorialLineId: idea.editorial_line_id || null,
          pillarName: idea.pillar_name || "",
          themeName: idea.theme_name || "",
          angle: idea.angle || "",
          format: idea.format || "Carrossel",
          targetAudience: idea.target_audience || "",
          painOrDesire: idea.pain_or_desire || "",
          goal: idea.goal || "",
          rationale: idea.rationale || "",
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || "Erro ao avançar com a ideia.");
      
      // Remove da lista temporária de sugestões
      setAiGeneratedIdeas((prev) => prev.filter((i) => i.title !== idea.title));
      if (linkOnly) {
        setLinkedProjectPostId(d.contentId);
        setAvailablePosts(posts => posts.filter(post => post.id !== d.contentId));
        setBrainstormView("bank");
        await loadBrainstormData();
        setMessage("Ideia vinculada ao post planejado.");
        return;
      }
      setActiveIdeaForHeadline({ ...idea, content_id: d.contentId } as SavedIdea);
      const destination = new URLSearchParams({ workspaceId: d.workspaceId });
      if (projectPost || ("project_id" in idea && idea.project_id)) destination.set("projectPostId", d.contentId);
      router.push(`/prompt-creator/headlines?${destination}`);
      setMessage(`Ideia selecionada! Configure e gere as headlines no Passo 3.`);
      await loadBrainstormData();
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || "Erro ao avançar para headlines.");
    } finally {
      convertingIdea.current = false;
      setConvertingIdeaId(null);
    }
  }

  // 3. Ação B: Deixar para a próxima (Salva no mural para aparecer no pilar/assunto)
  async function handleSaveForLater(idea: BrainstormAiIdea | SavedIdea) {
    try {
      const res = await fetch("/api/headlines/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_FOR_LATER",
          clientId,
          ideaId: idea.id || undefined,
          title: idea.title,
          pillarId: idea.pillar_id || null,
          editorialLineId: idea.editorial_line_id || null,
          pillarName: idea.pillar_name || "",
          themeName: idea.theme_name || "",
          angle: idea.angle || "",
          format: idea.format || "Carrossel",
          targetAudience: idea.target_audience || "",
          painOrDesire: idea.pain_or_desire || "",
          goal: idea.goal || "",
          rationale: idea.rationale || "",
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || "Erro ao salvar para a próxima.");
      setAiGeneratedIdeas((prev) => prev.filter((i) => i.title !== idea.title));
      setMessage(`Ideia guardada no mural para a próxima! Ela ficará disponível no pilar selecionado.`);
      await loadBrainstormData();
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || "Erro ao guardar ideia.");
    }
  }

  // 4. Ação C: Rejeitar (Move para a Lista Negra de Brainstorm)
  async function handleRejectIdea(idea: BrainstormAiIdea | SavedIdea, customReason?: string) {
    try {
      const reason = customReason || "Rejeitado no brainstorm";
      const res = await fetch("/api/headlines/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          clientId,
          ideaId: idea.id || undefined,
          title: idea.title,
          pillarId: idea.pillar_id || null,
          editorialLineId: idea.editorial_line_id || null,
          pillarName: idea.pillar_name || "",
          themeName: idea.theme_name || "",
          angle: idea.angle || "",
          format: idea.format || "Carrossel",
          targetAudience: idea.target_audience || "",
          painOrDesire: idea.pain_or_desire || "",
          goal: idea.goal || "",
          rationale: idea.rationale || "",
          reason,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || "Erro ao rejeitar ideia.");
      setAiGeneratedIdeas((prev) => prev.filter((i) => i.title !== idea.title));
      setMessage(`Ideia movida para a lista negra. A IA aprenderá a não sugerir temas semelhantes.`);
      await loadBrainstormData();
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || "Erro ao rejeitar ideia.");
    }
  }

  // 5. Restaurar ideia rejeitada da lista negra
  async function handleRestoreIdea(ideaId: string) {
    try {
      const res = await fetch("/api/headlines/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESTORE", ideaId }),
      });
      if (!res.ok) throw new Error("Erro ao restaurar ideia.");
      setMessage("Ideia restaurada para o mural de temas com sucesso!");
      await loadBrainstormData();
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || "Erro ao restaurar.");
    }
  }

  // 6. Salvar ideia manual
  async function handleSaveManualIdea(e: React.FormEvent) {
    e.preventDefault();
    if (!manualTitle.trim()) {
      setError("Informe o tema/título da ideia.");
      return;
    }
    const matchedPillar = pillars.find((p) => p.id === selectedPillarId);
    const matchedLine = editorialLines.find((l) => l.id === selectedLineId);

    try {
      const res = await fetch("/api/headlines/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_FOR_LATER",
          clientId,
          title: manualTitle.trim(),
          pillarId: selectedPillarId || null,
          editorialLineId: selectedLineId || null,
          pillarName: matchedPillar?.name || "",
          themeName: matchedLine?.theme || "",
          angle: manualAngle,
          format: manualFormat,
          targetAudience: manualAudience,
          painOrDesire: manualPain,
          goal: manualGoal,
          rationale: manualRationale,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || "Erro ao cadastrar ideia.");
      setMessage("Ideia guardada com sucesso no mural!");
      setShowManualModal(false);
      setManualTitle("");
      setManualPain("");
      setManualGoal("");
      setManualRationale("");
      await loadBrainstormData();
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || "Erro ao salvar ideia.");
    }
  }

  async function handleDeleteIdea(ideaId: string) {
    if (!confirm("Deseja realmente excluir esta ideia de conteúdo definitivamente?")) return;
    try {
      const res = await fetch("/api/headlines/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE", ideaId }),
      });
      if (!res.ok) throw new Error("Erro ao excluir ideia.");
      setSavedIdeas((prev) => prev.filter((i) => i.id !== ideaId));
      setRejectedIdeas((prev) => prev.filter((i) => i.id !== ideaId));
      setMessage("Ideia removida definitivamente.");
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || "Erro ao excluir.");
    }
  }

  const round = data?.rounds.find((r) => r.id === activeRound);
  const roundRuns = data?.runs.filter((r) => r.round_id === activeRound) || [];
  const roundCandidates = data?.candidates.filter((c) => c.round_id === activeRound) || [];
  const preview = context ? makeHeadlinePrompt(brief, context) : "Carregando o contexto do cliente...";

  const targetContentId = data?.workspace?.content_id || contentId || activeIdeaForHeadline?.content_id || null;
  const currentIdea = activeIdeaForHeadline?.content_id === targetContentId ? activeIdeaForHeadline : null;
  const currentContent = activeContentData?.contentId === targetContentId ? activeContentData : null;

  const select = (key: keyof HeadlineBrief, label: string, options: { value: string; label: string }[]) => (
    <label className="text-xs font-semibold text-zinc-700">
      {label}
      <select aria-label={label} value={String(brief[key])} onChange={(e) => update(key, e.target.value)} className={control}>
        <option value="">Selecionar</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );

  const options = (items: string[]) => items.map((value) => ({ value, label: value }));
  const multi = (key: "structures" | "angles" | "triggers", label: string, values: string[]) => (
    <fieldset className="space-y-2">
      <legend className="text-sm font-bold text-zinc-900">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={brief[key].includes(v)}
            onClick={() => update(key, brief[key].includes(v) ? brief[key].filter((x) => x !== v) : [...brief[key], v])}
            className={
              "rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition " +
              (brief[key].includes(v) ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-2xs" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50")
            }
          >
            {v}
          </button>
        ))}
      </div>
    </fieldset>
  );

  // Ideias filtradas para exibição no mural ativo
  const filteredIdeas = savedIdeas.filter((idea) => {
    if (filterPillar !== "ALL" && idea.pillar_id !== filterPillar) return false;
    if (filterFormat !== "ALL" && idea.format !== filterFormat) return false;
    if (filterTeam !== "ALL" && idea.team !== filterTeam) return false;
    return true;
  });
  const renderSuggestedPosts = (idea: BrainstormAiIdea | SavedIdea) => {
    if (!idea.id || ("content_id" in idea && idea.content_id)) return null;
    const suggestions = suggestPostFits(availablePosts, idea, today, projectPost?.projectId);
    if (!suggestions.length) return null;
    return (
      <details className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs">
        <summary className="cursor-pointer font-semibold text-zinc-800">Encaixes sugeridos</summary>
        <ul className="mt-2 space-y-2">
          {suggestions.map(({ post, sameFormat }) => (
            <li key={post.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0">
                <span className="block font-medium text-zinc-900">{post.projectName} · {post.title}</span>
                <span className="text-zinc-600">
                  {post.scheduledDate?.split("-").reverse().join("/")}
                  {sameFormat ? " · Mesmo formato" : ` · Sugestão em ${idea.format || post.format || "formato aberto"}`}
                </span>
              </span>
              <button type="button" disabled={convertingIdeaId !== null} className={button + " px-2 py-1"}
                onClick={() => handleUseIdeaNow(idea, true, post.id)}>Vincular</button>
            </li>
          ))}
        </ul>
      </details>
    );
  };
  const destinationReady = !!data && data.workspace.id === workspaceId;
  const needsProductionWorkspace = activeTab === "content" || activeTab === "imagePrompt" || activeTab === "schedule";

  return (
    <main className="mx-auto max-w-[1800px] space-y-6 p-4 md:p-8 text-zinc-900">
      <SocialWorkflowStepper activeStep="brainstorm" />
      <section className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4">
        <ProjectPostPicker clientId={clientId} selected={projectPost} onPostsLoaded={setAvailablePosts} />
        {projectPost && <div className="flex flex-wrap gap-4 text-sm">
          <Link className="text-emerald-700 underline" href={`/projects/${projectPost.projectId}`}>{projectPost.projectName}</Link>
          {projectPost.workspaceId && <Link className="text-emerald-700 underline"
            href={`/prompt-creator/headlines?workspaceId=${projectPost.workspaceId}&projectPostId=${projectPost.id}`}>Continuar criação</Link>}
        </div>}
      </section>
      {/* CABEÇALHO PRINCIPAL COM CONTEXTO DA EMPRESA E ABAS DE SEQUÊNCIA CRIATIVA */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
              <Compass size={13} className="text-zinc-500" />
              {companyName}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            {activeTab === "brainstorm"
              ? "Brainstorm de Conteúdo"
              : activeTab === "headlines"
              ? "Laboratório de Headlines"
              : activeTab === "content"
              ? "Redação do Texto & Roteiro"
              : activeTab === "imagePrompt"
              ? "Prompt de Imagem & Arte"
              : "Calendário & Agendamento"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 max-w-3xl">
            {activeTab === "brainstorm"
              ? "Defina os temas e ideias dos próximos conteúdos com base nos pilares estratégicos e gere com os Times A e B de IA."
              : activeTab === "headlines"
              ? "Desdobre suas ideias de conteúdo em headlines de alto impacto com os times de IA, avalie opções e escolha a melhor."
              : activeTab === "content"
              ? "Redija ou gere com IA o conteúdo completo no formato escolhido (Reels, Feed, Carrossel, Site, Meta Ads ou Google Ads)."
              : activeTab === "imagePrompt"
              ? "Gere prompts visuais detalhados para Capa de Reels, Cards de Carrossel ou Artes de Feed e anexe a imagem da peça."
              : "Defina a data e horário de postagem sem conflitos e envie automaticamente para o Calendário e Feed & Criativos."}
          </p>
        </div>

        {/* NAVEGAÇÃO DE FLUXO SEQUENCIAL (5 PASSOS) & ATALHOS */}
        <div className="flex flex-wrap items-center gap-2">
          {/* MENU DAS 5 SEQUÊNCIAS DE CRIAÇÃO */}
          <div className="inline-flex rounded-xl bg-zinc-100 p-1 border border-zinc-200 shadow-2xs">
            <button
              onClick={() => setActiveTab("brainstorm")}
              className={
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer " +
                (activeTab === "brainstorm" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-600 hover:text-zinc-950")
              }
            >
              <Lightbulb size={14} className={activeTab === "brainstorm" ? "text-zinc-900" : "text-zinc-400"} />
              1. Brainstorm
              {savedIdeas.length > 0 && (
                <span className="ml-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-mono font-medium text-zinc-700 border border-zinc-200 tabular-nums">
                  {savedIdeas.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("headlines")}
              className={
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer " +
                (activeTab === "headlines" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-600 hover:text-zinc-950")
              }
            >
              <Sparkles size={14} className={activeTab === "headlines" ? "text-zinc-900" : "text-zinc-400"} />
              2. Headlines
            </button>
            <button
              onClick={() => setActiveTab("content")}
              className={
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer " +
                (activeTab === "content" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-600 hover:text-zinc-950")
              }
            >
              <FileText size={14} className={activeTab === "content" ? "text-zinc-900" : "text-zinc-400"} />
              3. Texto & Roteiro
            </button>
            <button
              onClick={() => setActiveTab("imagePrompt")}
              className={
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer " +
                (activeTab === "imagePrompt" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-600 hover:text-zinc-950")
              }
            >
              <ImageIcon size={14} className={activeTab === "imagePrompt" ? "text-zinc-900" : "text-zinc-400"} />
              4. Prompt de Arte
            </button>
            <button
              onClick={() => setActiveTab("schedule")}
              className={
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer " +
                (activeTab === "schedule" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-600 hover:text-zinc-950")
              }
            >
              <Calendar size={14} className={activeTab === "schedule" ? "text-zinc-900" : "text-zinc-400"} />
              5. Calendário & Post
            </button>
          </div>

          {destinationReady && targetContentId && <Link className={button} href={`/prompt-creator?contentId=${targetContentId}`}>Briefing da peça</Link>}
          <Link className={button} href={`/strategy?clientId=${encodeURIComponent(clientId)}`} title="Abrir Estratégia da Marca">
            <Compass size={16} className="text-emerald-600" />
            Estratégia & DNA
          </Link>
          <Link className={button} href="/social/editorial" title="Gerenciar Linha Editorial">
            <BookOpen size={16} />
            Linha Editorial
          </Link>
          <Link className={button} href="/prompt-creator/headlines/bi" title="BI de Performance e Modelos">
            <BarChart3 size={16} />
            BI dos modelos
          </Link>
        </div>
      </header>

      {/* NOTIFICAÇÕES */}
      {error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="font-bold underline text-xs cursor-pointer">Fechar</button>
        </p>
      )}
      {message && (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="font-bold underline text-xs cursor-pointer">Fechar</button>
        </p>
      )}

      {/* ========================================================================= */}
      {/* PASSO 1: BRAINSTORM DE CONTEÚDO (PILARES, ASSUNTOS E BANCO DE IDEIAS)     */}
      {/* ========================================================================= */}
      {activeTab === "brainstorm" && (
        <div className="space-y-6">
          {/* RESUMO RECOLHÍVEL DA ESTRATÉGIA DO CLIENTE */}
          <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-zinc-50/70 border-b border-zinc-100">
              <button
                type="button"
                onClick={() => setStrategySummaryOpen((prev) => !prev)}
                className="flex items-center gap-2 text-left font-bold text-zinc-900 text-sm hover:text-emerald-700 transition cursor-pointer"
              >
                <Compass className="w-4 h-4 text-emerald-600" />
                <span>Estratégia & DNA de {companyName}</span>
                {strategySummaryOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
              </button>
              <Link
                href={`/strategy?clientId=${encodeURIComponent(clientId)}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-lg border border-emerald-200 transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir estratégia completa
              </Link>
            </div>
            {strategySummaryOpen && (
              <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200/70">
                  <span className="font-semibold text-zinc-800 text-xs block">
                    Posicionamento & Promessa
                  </span>
                  <p className="text-zinc-700 leading-relaxed font-medium">
                    {String(context?.identity?.value_proposition || "Posicionamento não definido no cadastro da estratégia.")}
                  </p>
                  {Boolean(context?.identity?.market_niche) && (
                    <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded bg-zinc-200/70 text-zinc-800">
                      Nicho: {String(context?.identity?.market_niche)}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200/70">
                  <span className="font-semibold text-zinc-800 text-xs block">
                    Públicos-Alvo Cadastrados ({context?.audiences?.length || 0})
                  </span>
                  {context?.audiences && context.audiences.length > 0 ? (
                    <div className="space-y-1">
                      {context.audiences.slice(0, 3).map((a: Record<string, unknown>, idx: number) => {
                        const pains = Array.isArray(a.pain_points) ? (a.pain_points as string[]) : [];
                        return (
                          <div key={String(a.name || idx)} className="border-b border-zinc-200/50 pb-1 last:border-0 last:pb-0">
                            <p className="font-bold text-zinc-800">{String(a.name || "Público")}</p>
                            {pains[0] && (
                              <p className="text-zinc-500 line-clamp-1 text-[11px]">Dor: {pains[0]}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-zinc-500">Nenhum público detalhado cadastrado.</p>
                  )}
                </div>

                <div className="space-y-1.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200/70">
                  <span className="font-semibold text-zinc-800 text-xs block">
                    Tom de Voz & Diretrizes
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(context?.identity?.tone_of_voice) && context.identity.tone_of_voice.length > 0 ? (
                      (context.identity.tone_of_voice as string[]).map((tone: string) => (
                        <span key={tone} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-medium">
                          {tone}
                        </span>
                      ))
                    ) : (
                      <span className="text-zinc-500">Tom de voz não especificado.</span>
                    )}
                  </div>
                  {Array.isArray(context?.identity?.forbidden_words) && context.identity.forbidden_words.length > 0 && (
                    <p className="text-rose-700 text-[11px] pt-1 line-clamp-1">
                      Proibido: {(context.identity.forbidden_words as string[]).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <nav aria-label="Brainstorm" className="flex flex-wrap gap-2">
            {([["discover", "Descobrir"], ["bank", "Banco de ideias"], ["rejected", "Rejeitadas"]] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={brainstormView === value}
                className={brainstormView === value ? buttonPrimary : button}
                onClick={() => { setBrainstormView(value); if (value === "rejected") setShowBlacklist(true); }}>
                {label}
              </button>
            ))}
          </nav>
          {/* SEÇÃO 1: VISÃO DE PILARES E ASSUNTOS DO CLIENTE */}
          <section hidden={brainstormView !== "discover"} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-950">
                  <Layers size={20} className="text-emerald-600" />
                  Pilares Estratégicos & Assuntos da Linha Editorial
                </h2>
                <p className="text-xs text-zinc-500">
                  Selecione um pilar ou assunto para focar o brainstorm de temas para os próximos conteúdos.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowManualModal(true)}
                  className={button + " text-emerald-700 border-emerald-300 hover:bg-emerald-50"}
                >
                  <Plus size={16} />
                  + Nova Ideia Manual
                </button>
              </div>
            </div>

            {/* SELEÇÃO DE PILARES */}
            {pillars.length === 0 && !loadingBrainstorm ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-center justify-between">
                <div>
                  <p className="font-bold">Nenhum pilar cadastrado para {companyName}.</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Defina os pilares estratégicos (ex: Educativo, Autoridade, Vendas, Bastidores) na Linha Editorial para guiar a produção de conteúdo.
                  </p>
                </div>
                <Link className={buttonPrimary} href="/prompt-creator?tab=EDITORIAL">
                  Cadastrar Linha Editorial
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPillarId("");
                      setSelectedLineId("");
                    }}
                    className={
                      "rounded-xl px-3.5 py-1.5 text-xs font-bold border transition cursor-pointer inline-flex items-center gap-1.5 " +
                      (!selectedPillarId
                        ? "bg-zinc-900 text-white border-zinc-900 shadow-2xs"
                        : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100")
                    }
                  >
                    <Layers size={13} />
                    Todos os Pilares ({pillars.length})
                  </button>
                  {selectedPillarId && (
                    <span className="text-xs text-emerald-700 font-semibold">
                      Filtro ativo: {pillars.find((p) => p.id === selectedPillarId)?.name}
                      {selectedLineId ? ` → ${editorialLines.find((l) => l.id === selectedLineId)?.theme || ""}` : ""}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pillars.map((pillar) => {
                    const pillarLines = editorialLines.filter((l) => l.pillar_id === pillar.id);
                    const countPillarIdeas = savedIdeas.filter((i) => i.pillar_id === pillar.id).length;
                    const isSelected = selectedPillarId === pillar.id;
                    return (
                      <div
                        key={pillar.id}
                        className={
                          "rounded-2xl border p-4 transition flex flex-col justify-between gap-3 " +
                          (isSelected
                            ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/15 shadow-xs"
                            : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300")
                        }
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPillarId(isSelected ? "" : pillar.id);
                                setSelectedLineId("");
                              }}
                              className="text-left group cursor-pointer flex-1"
                            >
                              <h3
                                className={
                                  "text-xs font-bold leading-snug transition " +
                                  (isSelected ? "text-emerald-900" : "text-zinc-900 group-hover:text-emerald-700")
                                }
                              >
                                {pillar.name}
                              </h3>
                            </button>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="rounded-full bg-white border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                                {pillarLines.length} {pillarLines.length === 1 ? "tema" : "temas"}
                              </span>
                              {countPillarIdeas > 0 && (
                                <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                  {countPillarIdeas}
                                </span>
                              )}
                            </div>
                          </div>

                          {pillarLines.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {pillarLines.map((line) => {
                                const isLineSelected = selectedLineId === line.id;
                                return (
                                  <button
                                    key={line.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedPillarId(pillar.id);
                                      setSelectedLineId(isLineSelected ? "" : line.id);
                                    }}
                                    className={
                                      "rounded-lg px-2 py-1 text-[11px] font-medium border transition cursor-pointer text-left " +
                                      (isLineSelected
                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs font-semibold"
                                        : "bg-white text-zinc-700 border-zinc-200 hover:border-emerald-300 hover:bg-emerald-50/40")
                                    }
                                    title={line.objective || line.theme}
                                  >
                                    {line.theme}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[11px] text-zinc-400 italic">Nenhum tema cadastrado neste pilar.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ASSUNTOS DO PILAR SELECIONADO */}
                {selectedPillarId && (
                  <div className="pt-2 border-t border-zinc-100">
                    <p className="text-xs font-semibold text-zinc-500 mb-2">Assuntos / Temas cadastrados neste pilar:</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedLineId("")}
                        className={
                          "rounded-lg px-2.5 py-1 text-xs font-medium border cursor-pointer transition " +
                          (!selectedLineId ? "bg-emerald-50 text-emerald-900 border-emerald-300 font-bold" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50")
                        }
                      >
                        Qualquer assunto do pilar
                      </button>
                      {editorialLines
                        .filter((line) => line.pillar_id === selectedPillarId)
                        .map((line) => {
                          const isLineSelected = selectedLineId === line.id;
                          return (
                            <button
                              key={line.id}
                              onClick={() => setSelectedLineId(isLineSelected ? "" : line.id)}
                              className={
                                "rounded-lg px-2.5 py-1 text-xs font-medium border cursor-pointer transition " +
                                (isLineSelected ? "bg-emerald-50 text-emerald-900 border-emerald-300 font-bold" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50")
                              }
                            >
                              {line.theme}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* SEÇÃO 2: GERADOR DE IDEIAS COM IA */}
          <section hidden={brainstormView !== "discover"} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-950">
                  <Sparkles size={20} className="text-amber-500" />
                  Brainstorm Inteligente com IA
                </h2>
                <p className="text-xs text-zinc-500">
                  Gere sugestões de temas e pautas concretas para os próximos conteúdos, alinhadas aos pilares, dores e preferências históricas do cliente.
                </p>
              </div>
            </div>

            <div role="group" aria-label="Fonte das ideias" className="flex flex-wrap gap-2">
              {(Object.keys(brainstormModes) as BrainstormMode[]).map(value => (
                <button key={value} type="button" disabled={generatingIdeas} aria-pressed={brainstormMode === value}
                  className={brainstormMode === value ? buttonPrimary : button}
                  onClick={() => {
                    setBrainstormMode(value);
                    setAiGeneratedIdeas([]);
                    setMessage("");
                  }}>{brainstormModes[value]}</button>
              ))}
            </div>

            {/* SELEÇÃO DE PRODUTO/SERVIÇO & ÂNGULO DE ABORDAGEM */}
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Qual produto ou serviço vamos trabalhar? */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-emerald-600" />
                    Qual produto ou serviço vamos trabalhar?
                  </label>
                  <select
                    className={control}
                    value={selectedOffer}
                    onChange={(e) => setSelectedOffer(e.target.value)}
                  >
                    <option value="">🏢 Institucional / Marca (divulgação geral)</option>
                    {catalogOffers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.type === "SERVICE" ? "🛠️ Serviço" : "📦 Produto"}: {item.name}
                      </option>
                    ))}
                    <option value="custom">➕ Outra oferta para esta rodada...</option>
                  </select>

                  {selectedOffer === "custom" && (
                    <input
                      type="text"
                      className={control + " mt-2"}
                      placeholder="Nome do produto ou serviço para esta rodada..."
                      value={customOfferName}
                      onChange={(e) => setCustomOfferName(e.target.value)}
                    />
                  )}
                  <p className="text-[11px] text-zinc-500">
                    O que a marca {companyName} vende ao seu cliente final.
                  </p>
                </div>

                {/* 2. Por qual ângulo você quer abordar esse assunto? */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-purple-600" />
                    Por qual ângulo você quer abordar esse assunto?
                  </label>
                  <select
                    className={control}
                    value={selectedAngleId}
                    onChange={(e) => setSelectedAngleId(e.target.value as BrainstormAngleId)}
                  >
                    {BRAINSTORM_ANGLES.map((angle) => (
                      <option key={angle.id} value={angle.id}>
                        {angle.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-zinc-500">
                    Define a psicologia e a alavanca de interesse que guia os temas gerados.
                  </p>
                </div>
              </div>

              {/* Pergunta adaptativa ao ângulo selecionado */}
              <div className="space-y-1 pt-1 border-t border-zinc-200/60">
                <label className="block text-xs font-semibold text-zinc-800">
                  {BRAINSTORM_ANGLES.find((a) => a.id === selectedAngleId)?.questionPrompt || "Qual foco específico você quer trabalhar?"}
                </label>
                <input
                  type="text"
                  className={control}
                  placeholder="Ex: Não tenho tempo para treinar, dor ao sentar por muitas horas, resultado antes do verão..."
                  value={angleFocusText}
                  onChange={(e) => setAngleFocusText(e.target.value)}
                />
              </div>

              {/* Botão Assistente de Foco */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSuggestFocus}
                  disabled={suggestingFocus}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  {suggestingFocus ? "Analisando estratégia e públicos..." : "✨ Me ajude a escolher um foco"}
                </button>
                {focusSuggestions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFocusSuggestions([])}
                    className="text-xs text-zinc-400 hover:text-zinc-600 underline cursor-pointer"
                  >
                    Limpar sugestões
                  </button>
                )}
              </div>

              {/* Cards com 3 caminhos de foco sugeridos */}
              {focusSuggestions.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                  {focusSuggestions.map((path) => (
                    <button
                      key={path.id}
                      type="button"
                      onClick={() => {
                        setSelectedAngleId(path.angleId);
                        setAngleFocusText(path.angleFocus);
                        setBrainstormDirection(path.description);
                      }}
                      className="text-left p-3 rounded-xl bg-white border border-amber-200 hover:border-amber-400 hover:shadow-xs transition space-y-1 cursor-pointer group"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                        {BRAINSTORM_ANGLES.find((a) => a.id === path.angleId)?.label || "Ângulo"}
                      </span>
                      <p className="text-xs font-bold text-zinc-900 group-hover:text-amber-800 line-clamp-1">
                        {path.title}
                      </p>
                      <p className="text-[11px] text-zinc-600 line-clamp-2 leading-relaxed">
                        {path.description}
                      </p>
                      <span className="text-[10px] text-amber-600 font-semibold inline-block pt-1">
                        Aplicar este foco →
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700">
                    Direcionamento Estratégico (Opcional):
                  </label>
                  <textarea
                    rows={2}
                    maxLength={1000}
                    className={control}
                    value={brainstormDirection}
                    onChange={(e) => handleDirectionChange(e.target.value)}
                    placeholder="Ex: Foco em quebrar objeções sobre preço, dúvidas mais comuns de clientes novos, campanha de fim de ano, bastidores da equipe..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Time de IA para Geração:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-100 rounded-xl border border-zinc-200">
                    <button
                      type="button"
                      onClick={() => setBrainstormTeam("BOTH")}
                      className={
                        "rounded-lg py-1.5 text-xs font-bold transition cursor-pointer " +
                        (brainstormTeam === "BOTH" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-600 hover:text-zinc-950")
                      }
                    >
                      Ambos os Times
                    </button>
                    <button
                      type="button"
                      onClick={() => setBrainstormTeam("A")}
                      className={
                        "rounded-lg py-1.5 text-xs font-bold transition cursor-pointer " +
                        (brainstormTeam === "A" ? "bg-emerald-600 text-white shadow-2xs" : "text-zinc-600 hover:text-zinc-950")
                      }
                    >
                      Time A (Performance)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBrainstormTeam("B")}
                      className={
                        "rounded-lg py-1.5 text-xs font-bold transition cursor-pointer " +
                        (brainstormTeam === "B" ? "bg-indigo-600 text-white shadow-2xs" : "text-zinc-600 hover:text-zinc-950")
                      }
                    >
                      Time B (Storytelling)
                    </button>
                  </div>
                  <label className="mt-2.5 flex items-center gap-2 text-xs text-zinc-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={refineWithOpposingTeam}
                      onChange={(e) => setRefineWithOpposingTeam(e.target.checked)}
                      className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                    />
                    <span className="font-semibold">Lapidação Anti-IA (Time A ↔ Time B)</span>
                    <span className="text-[11px] text-zinc-500">
                      — O time oposto avalia de 0 a 10 se soa como IA e devolve para lapidação final
                    </span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700">
                  Formato Pretendido:
                </label>
                <select
                  className={control}
                  value={brainstormFormat}
                  onChange={(e) => setBrainstormFormat(e.target.value)}
                >
                  <option value="Todos">Todos os Formatos (Variado)</option>
                  <option value="Carrossel">Carrossel</option>
                  <option value="Reels">Reels</option>
                  <option value="Post estático">Post estático</option>
                  <option value="Stories">Stories</option>
                </select>

                <div className="mt-6">
                  <button
                    onClick={handleGenerateAiIdeas}
                    disabled={generatingIdeas || !context}
                    className={buttonPrimary + " w-full py-2.5"}
                  >
                    <Sparkles size={16} className={generatingIdeas ? "animate-spin" : ""} />
                    {generatingIdeas ? "Consultando ideias..." : "Buscar ideias"}
                  </button>
                </div>
              </div>
            </div>

            {/* SUGESTÕES GERADAS PELA IA COM OS 3 CAMPOS (USAR AGORA, GUARDAR PARA A PRÓXIMA, REJEITAR) */}
            {aiGeneratedIdeas.length > 0 && (
              <div className="pt-4 border-t border-zinc-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    Ideias da consulta ({aiGeneratedIdeas.length})
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Escolha: <strong>Usar agora</strong> (vai para headlines), <strong>Guardar para a próxima</strong> (salva no mural) ou <strong>Rejeitar</strong> (lista negra).
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {aiGeneratedIdeas.map((idea) => (
                    <article key={idea.id || idea.title} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3 flex flex-col justify-between shadow-2xs">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                            {idea.is_new ? "Nova" : "Já salva"}
                          </span>
                          {idea.team && (
                            <span
                              className={
                                "rounded-md px-2 py-0.5 text-[10px] font-bold " +
                                (idea.team === "A" ? "bg-emerald-700 text-white" : "bg-indigo-700 text-white")
                              }
                            >
                              {idea.team === "A" ? "Time A" : "Time B"}
                            </span>
                          )}
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            {idea.pillar_name || "Geral"}
                          </span>
                          <span className="rounded-md bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-700">
                            {idea.theme_name}
                          </span>
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            {idea.format}
                          </span>
                          {idea.offer_name && (
                            <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-900 flex items-center gap-1">
                              <Package size={11} className="text-purple-700" />
                              {idea.offer_name}
                            </span>
                          )}
                          {idea.audience_angle && (
                            <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-900">
                              {idea.audience_angle}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-zinc-950 leading-snug">{idea.title}</h4>
                        <BrainstormIdeaSource source={idea} />
                        <p className="text-xs text-zinc-600">
                          <strong className="text-zinc-800">Ângulo:</strong> {idea.angle}
                        </p>
                        <p className="text-xs text-zinc-600">
                          <strong className="text-zinc-800">Público:</strong> {idea.target_audience} · {idea.pain_or_desire}
                        </p>
                        <p className="text-[11px] text-zinc-500 italic leading-relaxed">{idea.rationale}</p>
                      </div>

                      {/* OS 3 CAMPOS SOLICITADOS PELO USUÁRIO */}
                      <div className="pt-3 border-t border-zinc-200 space-y-2">
                        {/* 1. USAR AGORA -> AVANÇA PARA HEADLINES */}
                        <button
                          onClick={() => handleUseIdeaNow(idea)}
                          className={buttonPrimary + " text-xs w-full py-2"}
                          title="Usar esta ideia agora e avançar para o Laboratório de Headlines"
                        >
                          <Sparkles size={14} />
                          Usar essa ideia (Avançar para Headlines)
                        </button>
                        {renderSuggestedPosts(idea)}
                        {projectPost && <button type="button" className={button + " w-full"} disabled={convertingIdeaId === idea.id}
                          onClick={() => handleUseIdeaNow(idea, true)}>Vincular ao post planejado</button>}

                        <div className="flex gap-2">
                          {/* 2. DEIXAR PARA A PRÓXIMA -> FICA SALVA NO SISTEMA */}
                          <button
                            onClick={() => handleSaveForLater(idea)}
                            disabled={idea.status === "SAVED_FOR_LATER"}
                            className={button + " text-xs flex-1 py-1.5 text-zinc-700"}
                            title="Guardar esta ideia no mural para produzir no futuro"
                          >
                            <Bookmark size={14} className="text-emerald-700" />
                            {idea.status === "SAVED_FOR_LATER" ? "Guardada" : "Guardar p/ próxima"}
                          </button>

                          {/* 3. REJEITAR -> VAI PARA A LISTA NEGRA */}
                          <button
                            onClick={() => handleRejectIdea(idea)}
                            className={button + " text-xs py-1.5 text-rose-700 border-rose-200 hover:bg-rose-50"}
                            title="Rejeitar ideia e adicionar à lista negra para a IA nunca mais sugerir parecida"
                          >
                            <Ban size={14} />
                            Rejeitar
                          </button>
                        </div>

                        {idea.refinement_history && (
                          <details className="pt-2 border-t border-zinc-200/70 text-[11px] text-zinc-600">
                            <summary className="cursor-pointer font-semibold text-emerald-800 hover:text-emerald-950 flex items-center justify-between select-none">
                              <span>Ver histórico da lapidação entre IAs</span>
                              <span
                                className={
                                  "px-1.5 py-0.5 rounded font-mono text-[10px] font-bold " +
                                  (idea.refinement_history.ai_score <= 3
                                    ? "bg-emerald-100 text-emerald-800"
                                    : idea.refinement_history.ai_score <= 6
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800")
                                }
                              >
                                Nota IA: {idea.refinement_history.ai_score}/10
                              </span>
                            </summary>
                            <div className="mt-2 space-y-2 rounded-lg bg-white border border-zinc-200 p-2.5 text-[11px] leading-relaxed">
                              <div>
                                <span className="font-bold text-zinc-800 block">
                                  1. Ideia Inicial (Time {idea.refinement_history.generator_team} · {idea.refinement_history.generator_model}):
                                </span>
                                <p className="text-zinc-600 italic">{idea.refinement_history.initial_title}</p>
                              </div>
                              <div>
                                <span className="font-bold text-zinc-800 block">
                                  2. Auditoria Anti-IA (Time {idea.refinement_history.reviewer_team} · {idea.refinement_history.reviewer_model}):
                                </span>
                                <p className="text-zinc-600">
                                  <strong>Motivo:</strong> {idea.refinement_history.reviewer_reason}
                                </p>
                                <p className="text-zinc-600">
                                  <strong>Sugestão:</strong> {idea.refinement_history.reviewer_suggestion}
                                </p>
                              </div>
                            </div>
                          </details>
                        )}

                        {idea.model_name && (
                          <div className="pt-2 border-t border-zinc-200/70 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                            <span>Gerado por:</span>
                            <span className="truncate max-w-[200px] font-semibold text-zinc-700" title={idea.model_name}>
                              {idea.model_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SEÇÃO 3: MURAL DE TEMAS & IDEIAS DOS PRÓXIMOS CONTEÚDOS */}
          <section hidden={brainstormView !== "bank"} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-5">
            <aside aria-label="Curadoria semanal" className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-900">Curadoria semanal</h3>
                <button type="button" className={button} disabled={refreshingReview} onClick={refreshWeeklyReview}>
                  {refreshingReview ? "Atualizando…" : "Atualizar curadoria"}
                </button>
              </div>
              <p className="text-xs text-zinc-600">
                {weeklyReview?.tokensPerAdopted == null ? "Ainda sem dados de tokens por pauta aproveitada." :
                  `${weeklyReview.tokensPerAdopted.toLocaleString("pt-BR")} tokens por pauta aproveitada em ${weeklyReview.adopted} vínculos medidos.`}
              </p>
              {(() => {
                const suggestions = (weeklyReview?.recommendations || []).flatMap(({ ideaId, postId }) => {
                  const idea = savedIdeas.find(item => item.id === ideaId && !item.content_id);
                  const post = availablePosts.find(item => item.id === postId && item.availableForIdea);
                  return idea && post ? [{ idea, post }] : [];
                });
                return suggestions.length ? <ul className="space-y-2">{suggestions.map(({ idea, post }) => (
                  <li key={idea.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div><strong>{idea.title}</strong><p className="text-zinc-600">{post.projectName} · {post.title} · {post.scheduledDate?.split("-").reverse().join("/")}</p></div>
                    <button type="button" className={button} disabled={convertingIdeaId !== null}
                      onClick={() => handleUseIdeaNow(idea, true, post.id)}>Vincular</button>
                  </li>
                ))}</ul> : <p className="text-xs text-zinc-600">Nenhum encaixe disponível para esta semana.</p>;
              })()}
            </aside>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-950">
                  <Lightbulb size={20} className="text-amber-500" />
                  Mural de Temas Guardados para os Próximos Conteúdos ({filteredIdeas.length})
                </h2>
                <p className="text-xs text-zinc-500">
                  Ideias guardadas no sistema por pilar e tema. Quando estiver pronto para produzir, clique em <strong>&ldquo;Usar essa ideia&rdquo;</strong> para gerar as headlines.
                </p>
              </div>

              {/* FILTROS DO MURAL */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterTeam}
                  onChange={(e) => setFilterTeam(e.target.value as "ALL" | "A" | "B")}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs"
                >
                  <option value="ALL">Todos os Times</option>
                  <option value="A">Time A (Performance)</option>
                  <option value="B">Time B (Storytelling)</option>
                </select>

                <select
                  value={filterPillar}
                  onChange={(e) => setFilterPillar(e.target.value)}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs"
                >
                  <option value="ALL">Todos os Pilares</option>
                  {pillars.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <select
                  value={filterFormat}
                  onChange={(e) => setFilterFormat(e.target.value)}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs"
                >
                  <option value="ALL">Todos os Formatos</option>
                  <option value="Carrossel">Carrossel</option>
                  <option value="Reels">Reels</option>
                  <option value="Post estático">Post estático</option>
                  <option value="Stories">Stories</option>
                </select>
              </div>
            </div>

            {/* LISTA / GRID DE IDEIAS */}
            {filteredIdeas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center space-y-3">
                <Lightbulb size={32} className="mx-auto text-zinc-400" />
                <h3 className="text-base font-bold text-zinc-800">Nenhuma ideia guardada para este filtro</h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Use o <strong>Brainstorm com IA</strong> acima ou clique em <strong>&ldquo;+ Nova Ideia Manual&rdquo;</strong> para definir os temas dos próximos conteúdos da {companyName}.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredIdeas.map((idea) => {
                  const isConverting = convertingIdeaId === idea.id;
                  return (
                    <article
                      key={idea.id}
                      className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4 flex flex-col justify-between shadow-2xs hover:border-zinc-300 transition"
                    >
                      <div className="space-y-3">
                        {/* TAGS */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {idea.team && (
                            <span
                              className={
                                "rounded-md px-2 py-0.5 text-[10px] font-bold " +
                                (idea.team === "A" ? "bg-emerald-700 text-white" : "bg-indigo-700 text-white")
                              }
                            >
                              {idea.team === "A" ? "Time A" : "Time B"}
                            </span>
                          )}
                          <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">
                            {idea.pillar_name || "Geral"}
                          </span>
                          {idea.theme_name && (
                            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700">
                              {idea.theme_name}
                            </span>
                          )}
                          <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            {idea.format}
                          </span>
                          {idea.offer_name && (
                            <span className="rounded-md bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-900 flex items-center gap-1">
                              <Package size={11} className="text-purple-700" />
                              {idea.offer_name}
                            </span>
                          )}
                          {idea.audience_angle && (
                            <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-900">
                              {idea.audience_angle}
                            </span>
                          )}
                        </div>

                        {/* TÍTULO / TEMA */}
                        <h3 className="text-base font-bold text-zinc-950 leading-snug">{idea.title}</h3>
                        <BrainstormIdeaSource source={idea} />
                        {idea.content_id && <Link className="text-xs font-medium text-emerald-800 underline"
                          href={`/prompt-creator?contentId=${idea.content_id}`}>Abrir peça vinculada</Link>}
                        {idea.post_status && <p className="text-xs text-zinc-600">
                          {({ PLANNED: "Planejado", IN_CREATION: "Em criação", APPROVED: "Aprovado", SCHEDULED: "Agendado", PUBLISHED: "Publicado" } as Record<string, string>)[idea.post_status] || idea.post_status}
                        </p>}

                        {/* ÂNGULO E DETALHES */}
                        <div className="space-y-1 text-xs text-zinc-600 bg-zinc-50 rounded-lg p-2.5">
                          {idea.angle && (
                            <p>
                              <strong className="text-zinc-800">🎯 Ângulo:</strong> {idea.angle}
                            </p>
                          )}
                          {idea.target_audience && (
                            <p>
                              <strong className="text-zinc-800">👥 Público:</strong> {idea.target_audience}
                            </p>
                          )}
                          {idea.pain_or_desire && (
                            <p>
                              <strong className="text-zinc-800">⚡ Dor/Desejo:</strong> {idea.pain_or_desire}
                            </p>
                          )}
                          {idea.goal && (
                            <p>
                              <strong className="text-zinc-800">🎯 Objetivo:</strong> {idea.goal}
                            </p>
                          )}
                        </div>

                        {idea.rationale && (
                          <p className="text-[11px] text-zinc-500 italic leading-relaxed">
                            &ldquo;{idea.rationale}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* AÇÕES DA IDEIA NO MURAL */}
                      <div className="pt-3 border-t border-zinc-100 space-y-2">
                        {/* BOTÃO PRINCIPAL: USAR ESSA IDEIA */}
                        <button
                          onClick={() => handleUseIdeaNow(idea)}
                          disabled={isConverting}
                          className={buttonPrimary + " w-full py-2"}
                          title="Usar esta ideia e avançar para o Passo 3: Headlines"
                        >
                          <Sparkles size={16} className={isConverting ? "animate-spin" : ""} />
                          {isConverting ? "Preparando headlines..." : "🎯 Usar essa ideia (Criar Headlines)"}
                        </button>
                        {renderSuggestedPosts(idea)}
                        {projectPost && !idea.content_id && <button type="button" className={button + " w-full"} disabled={isConverting}
                          onClick={() => handleUseIdeaNow(idea, true)}>Vincular ao post planejado</button>}

                        <div className="flex items-center justify-between text-xs pt-1">
                          <button
                            onClick={() => handleRejectIdea(idea)}
                            className="text-zinc-500 hover:text-rose-700 text-xs flex items-center gap-1 cursor-pointer"
                            title="Mover para a lista negra"
                          >
                            <Ban size={13} />
                            Rejeitar p/ lista negra
                          </button>

                          <button
                            onClick={() => handleDeleteIdea(idea.id)}
                            className="text-zinc-400 hover:text-rose-600 transition p-1 cursor-pointer"
                            title="Excluir ideia definitivamente"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {idea.refinement_history && (
                          <details className="pt-2 border-t border-zinc-200/70 text-[11px] text-zinc-600">
                            <summary className="cursor-pointer font-semibold text-emerald-800 hover:text-emerald-950 flex items-center justify-between select-none">
                              <span>Ver histórico da lapidação entre IAs</span>
                              <span
                                className={
                                  "px-1.5 py-0.5 rounded font-mono text-[10px] font-bold " +
                                  (idea.refinement_history.ai_score <= 3
                                    ? "bg-emerald-100 text-emerald-800"
                                    : idea.refinement_history.ai_score <= 6
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800")
                                }
                              >
                                Nota IA: {idea.refinement_history.ai_score}/10
                              </span>
                            </summary>
                            <div className="mt-2 space-y-2 rounded-lg bg-white border border-zinc-200 p-2.5 text-[11px] leading-relaxed">
                              <div>
                                <span className="font-bold text-zinc-800 block">
                                  1. Ideia Inicial (Time {idea.refinement_history.generator_team} · {idea.refinement_history.generator_model}):
                                </span>
                                <p className="text-zinc-600 italic">{idea.refinement_history.initial_title}</p>
                              </div>
                              <div>
                                <span className="font-bold text-zinc-800 block">
                                  2. Auditoria Anti-IA (Time {idea.refinement_history.reviewer_team} · {idea.refinement_history.reviewer_model}):
                                </span>
                                <p className="text-zinc-600">
                                  <strong>Motivo:</strong> {idea.refinement_history.reviewer_reason}
                                </p>
                                <p className="text-zinc-600">
                                  <strong>Sugestão:</strong> {idea.refinement_history.reviewer_suggestion}
                                </p>
                              </div>
                            </div>
                          </details>
                        )}

                        {idea.model_name && (
                          <div className="pt-2 border-t border-zinc-200/70 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                            <span>Gerado por:</span>
                            <span className="truncate max-w-[200px] font-semibold text-zinc-700" title={idea.model_name}>
                              {idea.model_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* SEÇÃO 4: LISTA NEGRA DE BRAINSTORM (IDEIAS REJEITADAS & APRENDIZADO DA IA) */}
          <section hidden={brainstormView !== "rejected"} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3">
            <button
              onClick={() => setShowBlacklist((v) => !v)}
              className="w-full flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Ban size={18} className="text-rose-600" />
                <h3 className="font-bold text-sm text-zinc-950">
                  Lista Negra de Ideias Rejeitadas ({rejectedIdeas.length})
                </h3>
                <span className="text-xs text-zinc-500 hidden sm:inline">
                  — A IA lê estes temas e é proibida de sugerir abordagens parecidas
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-zinc-500 font-semibold">
                {showBlacklist ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {showBlacklist && (
              <div className="pt-3 border-t border-zinc-100 space-y-3">
                <p className="text-xs text-zinc-500">
                  Todas as ideias rejeitadas abaixo são enviadas como <strong>Lista Negra</strong> no prompt de brainstorm. Se mudou de ideia, clique em <strong>Restaurar</strong> para trazê-la de volta ao mural ativo.
                </p>

                {rejectedIdeas.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic py-2">Nenhuma ideia na lista negra no momento.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {rejectedIdeas.map((idea) => (
                      <article key={idea.id} className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="rounded bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold">
                            Rejeitada
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {idea.pillar_name || "Geral"}
                          </span>
                        </div>
                        <p className="font-bold text-zinc-900 leading-snug">{idea.title}</p>
                        {idea.rejection_reason && (
                          <p className="text-[11px] text-zinc-600">
                            <strong>Motivo:</strong> {idea.rejection_reason}
                          </p>
                        )}
                        <div className="pt-2 border-t border-rose-100 flex items-center justify-between">
                          <button
                            onClick={() => handleRestoreIdea(idea.id)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                          >
                            <RotateCcw size={12} />
                            Restaurar para o Mural
                          </button>
                          <button
                            onClick={() => handleDeleteIdea(idea.id)}
                            className="text-zinc-400 hover:text-rose-600 p-1 cursor-pointer"
                            title="Excluir definitivamente"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* MODAL / FORMULÁRIO DE NOVA IDEIA MANUAL */}
          {showManualModal && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-lg w-full p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-zinc-950">Nova Ideia de Conteúdo</h3>
                  <button onClick={() => setShowManualModal(false)} className="text-zinc-400 hover:text-zinc-700 font-bold cursor-pointer">
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveManualIdea} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700">Tema / Ideia Central do Conteúdo *</label>
                    <textarea
                      rows={2}
                      required
                      className={control}
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="Ex: 3 erros silenciosos de fluxo de caixa que comem o lucro da empresa"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700">Pilar Estratégico</label>
                      <select
                        className={control}
                        value={selectedPillarId}
                        onChange={(e) => {
                          setSelectedPillarId(e.target.value);
                          setSelectedLineId("");
                        }}
                      >
                        <option value="">Selecionar Pilar</option>
                        {pillars.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700">Assunto / Linha Editorial</label>
                      <select
                        className={control}
                        value={selectedLineId}
                        onChange={(e) => setSelectedLineId(e.target.value)}
                      >
                        <option value="">Selecionar Assunto</option>
                        {editorialLines
                          .filter((l) => !selectedPillarId || l.pillar_id === selectedPillarId)
                          .map((l) => (
                            <option key={l.id} value={l.id}>{l.theme}</option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700">Formato Pretendido</label>
                      <select
                        className={control}
                        value={manualFormat}
                        onChange={(e) => setManualFormat(e.target.value)}
                      >
                        <option value="Carrossel">Carrossel</option>
                        <option value="Reels">Reels</option>
                        <option value="Post estático">Post estático</option>
                        <option value="Stories">Stories</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700">Ângulo / Abordagem</label>
                      <select
                        className={control}
                        value={manualAngle}
                        onChange={(e) => setManualAngle(e.target.value)}
                      >
                        <option value="Passo a Passo Prático">Passo a Passo Prático</option>
                        <option value="Erro Comum que Custa Caro">Erro Comum que Custa Caro</option>
                        <option value="Mito vs Realidade">Mito vs Realidade</option>
                        <option value="Estudo de Caso / Bastidores">Estudo de Caso / Bastidores</option>
                        <option value="Checklist de Aplicação Rápida">Checklist de Aplicação Rápida</option>
                        <option value="Visão Contraintuitiva">Visão Contraintuitiva</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700">Público-alvo e Dor/Desejo</label>
                    <input
                      type="text"
                      className={control}
                      value={manualPain}
                      onChange={(e) => setManualPain(e.target.value)}
                      placeholder="Ex: Donos de pequenas empresas que misturam conta física com jurídica"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowManualModal(false)} className={button}>
                      Cancelar
                    </button>
                    <button type="submit" className={buttonPrimary}>
                      Guardar para a Próxima
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: LABORATÓRIO DE HEADLINES (PASSO 3 DA SEQUÊNCIA)                    */}
      {/* ========================================================================= */}
      {activeTab === "headlines" && (
        <div className="space-y-6">
          {/* BANNER DE NAVEGAÇÃO ENTRE OS PASSOS */}
          <div className="flex items-center justify-between bg-zinc-100 rounded-xl p-3 border border-zinc-200 shadow-2xs">
            <button
              onClick={() => setActiveTab("brainstorm")}
              className="inline-flex items-center gap-2 text-xs font-bold text-zinc-700 hover:text-zinc-950 transition cursor-pointer"
            >
              <ArrowLeft size={16} />
              ← Voltar ao Passo 2: Brainstorm
            </button>

            {activeIdeaForHeadline && (
              <span className="text-xs text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                📌 Pauta Ativa: &ldquo;{activeIdeaForHeadline.title}&rdquo;
              </span>
            )}

            {targetContentId && (
              <button
                onClick={() => setActiveTab("content")}
                className="inline-flex items-center gap-2 text-xs font-bold text-indigo-700 hover:text-indigo-950 transition cursor-pointer"
              >
                Avançar para Passo 4: Redação Completa →
              </button>
            )}
          </div>

          {!data && projectPost && <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">
            {workspaceId ? "Carregando a criação deste post…" : "Escolha uma ideia no brainstorm para iniciar a criação deste post."}
          </p>}
          {!data && !projectPost && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
              <h2 className="font-bold text-base text-zinc-950">Peças com Headlines deste cliente</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Selecione uma peça abaixo ou volte para o <strong>Passo 1: Brainstorm</strong> para escolher uma ideia e desdobrá-la em headlines.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {list.map((v) => (
                  <Link className={button + " justify-start text-left"} href={"?workspaceId=" + v.id} key={v.id}>
                    <Sparkles size={14} className="text-emerald-600 shrink-0" />
                    <span className="truncate">{v.title} · {v.format}</span>
                  </Link>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-100 flex gap-2">
                <button
                  className={buttonPrimary}
                  onClick={() =>
                    void perform(async () => {
                      const v = await api<{ id: string }>("", { action: "CREATE", clientId });
                      router.push("/prompt-creator/headlines?workspaceId=" + v.id);
                    })
                  }
                  disabled={busy}
                >
                  <Plus size={16} />
                  Nova Peça do Zero
                </button>
                <button onClick={() => setActiveTab("brainstorm")} className={button}>
                  <Lightbulb size={16} />
                  Ver Ideias do Brainstorm
                </button>
              </div>
            </section>
          )}

          {data && (
            <>
              {/* BRIEFING DA HEADLINE */}
              <section className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-950">Briefing e Configuração Criativa da Peça</h2>
                    <p className="text-xs text-zinc-500">
                      Os parâmetros abaixo orientam a geração das headlines nos times de IA.
                    </p>
                  </div>
                  <button className={button} disabled={busy} onClick={() => void perform(async () => { await save(); })}>
                    {dirty ? "Salvar alterações" : "Briefing salvo"}
                  </button>
                </div>

                <button
                  className={button + " text-xs"}
                  onClick={() => {
                    if (!context) return;
                    const id = context.identity;
                    const profile = id.commercial_profile as Record<string, string> | undefined;
                    setBrief((old) => ({
                      ...old,
                      value: old.value || String(id.value_proposition || ""),
                      differential: old.differential || (Array.isArray(id.differentials) ? id.differentials.join("; ") : ""),
                      tone: old.tone || (Array.isArray(id.tone_of_voice) ? id.tone_of_voice.join("; ") : ""),
                      forbiddenWords: old.forbiddenWords || (Array.isArray(id.forbidden_words) ? id.forbidden_words.join("; ") : ""),
                      cta: old.cta || (Array.isArray(id.default_ctas) ? id.default_ctas[0] || "" : ""),
                      goal: old.goal || profile?.commercialObjective || "",
                      offer: old.offer || profile?.requestedScope || "",
                    }));
                  }}
                >
                  Preencher campos vazios com o DNA da marca
                </button>

                <div className="grid gap-4 md:grid-cols-3">
                  {select(
                    "audience",
                    "Público desta peça",
                    options([...new Set([...(context?.audiences.map((a) => String(a.name)) || []), ...(context?.communicationProfile?.audienceTypes || [])])])
                  )}
                  {select(
                    "themeId",
                    "Pilar e tema",
                    context?.editorialLines.map((t) => ({ value: String(t.id), label: String(t.pillar_name) + " · " + String(t.theme) })) || []
                  )}
                  {select("speaker", "Quem comunica", options(context?.communicationProfile?.speakerTypes || []))}
                  {select("voice", "Porta-voz / apresentação", options(context?.communicationProfile?.contentVoices || []))}
                  {select("awareness", "Nível de consciência", options(awareness))}
                  {select("funnel", "Funil", [
                    { value: "TOP", label: "Topo" },
                    { value: "MIDDLE", label: "Meio" },
                    { value: "BOTTOM", label: "Fundo" },
                    { value: "AFTER_SALE", label: "Pós-venda" },
                  ])}
                  {select("journey", "Jornada", [
                    { value: "DISCOVERY", label: "Descoberta" },
                    { value: "PROBLEM", label: "Reconhece problema" },
                    { value: "CONSIDERATION", label: "Consideração" },
                    { value: "DECISION", label: "Decisão" },
                    { value: "RETENTION", label: "Relacionamento" },
                  ])}
                  {select("channel", "Canal", options(["Instagram", "Facebook", "Google", "YouTube", "LinkedIn", "WhatsApp", "Site"]))}
                  {select("placement", "Posicionamento", options(["Feed", "Stories", "Reels", "Pesquisa", "Página de destino", "Vídeo", "Banner"]))}
                  {select("format", "Formato", options(formats))}
                  {select("length", "Tamanho", options(["Curta", "Média", "Contextualizada"]))}
                  <label className="text-xs font-semibold text-zinc-700">
                    Limite de caracteres
                    <input
                      type="number"
                      min={10}
                      max={2000}
                      className={control}
                      value={brief.maxCharacters}
                      onChange={(e) => update("maxCharacters", Number(e.target.value))}
                    />
                  </label>
                  {select("creativity", "Criatividade", options(["Conservadora", "Equilibrada", "Exploratória"]))}
                  {select("intensity", "Intensidade", options(["Sutil", "Moderada", "Forte"]))}
                </div>

                {Object.entries(fieldGroups).map(([group, fields]) => (
                  <details key={group} open={group === "Estratégia"} className="rounded-xl border border-zinc-200 p-4">
                    <summary className="font-bold cursor-pointer text-zinc-900">{group}</summary>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {fields.map(([key, label]) => (
                        <label className="text-xs font-semibold text-zinc-700" key={key}>
                          {label}
                          <textarea
                            aria-label={label}
                            rows={3}
                            className={control}
                            value={String(brief[key])}
                            onChange={(e) => update(key, e.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                  </details>
                ))}

                {multi("structures", "Estruturas: distribua entre as versões", structures)}
                {multi("angles", "Ângulos", angles)}
                {multi("triggers", "Gatilhos psicológicos", triggers)}
              </section>

              {/* PROMPT COMPLETO E DISPARO DE RODADA */}
              <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
                <h2 className="text-xl font-bold text-zinc-950">Prompt completo</h2>
                <textarea aria-label="Prompt completo" readOnly rows={12} className={control + " font-mono text-xs"} value={preview} />
                {missingBrief(brief).length > 0 && <p className="text-sm text-amber-800">Falta: {missingBrief(brief).join(", ")}.</p>}
                <div className="flex flex-wrap gap-3">
                  <button
                    className={buttonPrimary}
                    disabled={busy || generating || missingBrief(brief).length > 0}
                    onClick={() => void startRound()}
                  >
                    <Sparkles size={16} />
                    Gerar nova rodada de Headlines com Time A
                  </button>
                  <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
                    <input type="checkbox" checked={blind} onChange={(e) => setBlind(e.target.checked)} />
                    Avaliação cega (ocultar nome dos modelos)
                  </label>
                </div>
              </section>

              {/* RESULTADOS DAS RODADAS */}
              {!!data.rounds.length && (
                <section className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-zinc-950">Headlines Geradas</h2>
                    <select
                      aria-label="Rodada"
                      value={activeRound}
                      onChange={(e) => {
                        setActiveRound(e.target.value);
                        setInspired([]);
                        setManual(false);
                      }}
                      className={control + " !w-auto"}
                    >
                      {data.rounds.map((r, i) => (
                        <option key={r.id} value={r.id}>
                          Rodada {i + 1} · {new Date(r.created_at).toLocaleString("pt-BR")}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(["A", "B"] as const).map((team) => (
                    <section key={team} className="space-y-4">
                      <div className="flex flex-wrap justify-between gap-3">
                        <h3 className="text-lg font-bold text-zinc-950">Time {team}</h3>
                        <div className="flex flex-wrap gap-2">
                          {team === "B" && !roundRuns.some((r) => r.team === "B") ? (
                            <button className={button} disabled={busy || generating} onClick={() => void batch("B", false)}>
                              Gerar com Time B
                            </button>
                          ) : (
                            <button className={button} disabled={busy || generating} onClick={() => void batch(team, true)}>
                              <RefreshCw size={15} />
                              Gerar outras 4 por modalidade em cada IA
                            </button>
                          )}
                          {roundRuns.some((r) => r.team === team && r.status === "PENDING") && (
                            <button className={button} disabled={busy || generating} onClick={() => void executePending(data, activeRound)}>
                              Continuar gerações pendentes
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid items-start gap-4 lg:grid-cols-4">
                        {[1, 2, 3, 4].map((slot) => (
                          <div key={slot} className="space-y-3 rounded-2xl bg-zinc-100 p-3 shadow-2xs">
                            <h4 className="font-bold text-sm text-zinc-950">IA {slot}{team}</h4>
                            {!blind && (
                              <p className="break-all text-xs text-zinc-500">
                                {roundRuns.find((r) => r.team === team && r.slot === slot)?.requested_model || models[team]?.find((m) => m.slot === slot)?.model}
                              </p>
                            )}
                            {(["PROMPT", "STYLE"] as const).map((mode) => (
                              <div key={mode} className="space-y-3">
                                <h5 className="border-b py-2 text-xs font-bold uppercase text-zinc-600">
                                  {mode === "PROMPT" ? "Pelo prompt" : "Com meu estilo"}
                                  {mode === "STYLE" && round?.style.initial ? " · inicial" : ""}
                                </h5>
                                {roundRuns
                                  .filter((r) => r.team === team && r.slot === slot && r.mode === mode)
                                  .map((run: Run) => (
                                    <div key={run.id} className="space-y-2">
                                      <p className="text-[11px] text-zinc-500">
                                        Tentativa {run.attempt} · {run.status}
                                        {run.duration_ms ? ` · ${(run.duration_ms / 1000).toFixed(1)}s` : ""}
                                      </p>
                                      {roundCandidates
                                        .filter((c) => c.run_id === run.id)
                                        .map((c) => (
                                          <CandidateCard
                                            key={c.id}
                                            value={c}
                                            blind={blind}
                                            winner={data.workspace.headline_candidate_id === c.id}
                                            onRate={(n, r) => void rate(c, n, r)}
                                            onSelect={() => void choose(c)}
                                            inspired={inspired.includes(c.id)}
                                            onInspire={() =>
                                              setInspired((old) => (old.includes(c.id) ? old.filter((v) => v !== c.id) : [...old, c.id]))
                                            }
                                          />
                                        ))}
                                    </div>
                                  ))}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}

                  {/* CRIAÇÃO PRÓPRIA */}
                  <div className="pt-2">
                    <button className={button} onClick={() => setManual((v) => !v)}>
                      <Pencil size={16} />
                      Criar minha própria headline
                    </button>
                    {manual && (
                      <section className="mt-3 space-y-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
                        <p className="text-sm font-semibold text-zinc-950">
                          Sua adaptação entra na biblioteca positiva. Inspirações selecionadas: {inspired.length}.
                        </p>
                        <input
                          aria-label="Minha headline"
                          className={control}
                          value={humanHeadline}
                          onChange={(e) => setHumanHeadline(e.target.value)}
                          placeholder="Sua headline"
                        />
                        <textarea
                          aria-label="Minha subheadline"
                          className={control}
                          value={humanSub}
                          onChange={(e) => setHumanSub(e.target.value)}
                          placeholder="Subheadline complementar"
                        />
                        <button
                          className={buttonPrimary}
                          disabled={busy || !humanHeadline.trim()}
                          onClick={() =>
                            void perform(async () => {
                              const result = await api<{ id: string }>("", {
                                action: "HUMAN",
                                roundId: activeRound,
                                headline: humanHeadline,
                                subheadline: humanSub,
                                inspiredBy: inspired,
                              });
                              await api("", { action: "SELECT", id: result.id });
                              await refresh();
                              setManual(false);
                              setMessage("Sua criação foi salva como exemplo positivo e escolhida para a peça.");
                            })
                          }
                        >
                          Salvar e escolher minha criação
                        </button>
                      </section>
                    )}
                  </div>
                </section>
              )}

              {/* HEADLINE ESCOLHIDA -> AVANÇAR PARA PASSO 4: REDAÇÃO DO CONTEÚDO */}
              {data.workspace.headline_candidate_id && (
                <section className="space-y-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-6 shadow-2xs">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      ✓ Headline Vencedora da Peça
                    </span>
                    <h2 className="text-xl font-extrabold text-emerald-950 mt-1">{data.workspace.selected_headline}</h2>
                    {data.workspace.selected_subheadline && (
                      <p className="text-sm text-emerald-800 mt-1">{data.workspace.selected_subheadline}</p>
                    )}
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setActiveTab("content")}
                      className={buttonPrimary + " py-2.5 px-6 text-sm"}
                    >
                      Avançar para Passo 4: Redação Completa →
                    </button>
                    <button onClick={() => setActiveTab("brainstorm")} className={button}>
                      Voltar ao Brainstorm
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: REDAÇÃO COMPLETA DO CONTEÚDO (PASSO 4 DA SEQUÊNCIA)                */}
      {/* ========================================================================= */}
      {needsProductionWorkspace && destinationReady && targetContentId && (
        <div key={`${clientId}:${targetContentId}:${activeTab}`} className="space-y-3">
          <ProductionChecklist clientId={clientId} contentId={targetContentId} />
          <ContentDeliveryPanel clientId={clientId} contentId={targetContentId} />
        </div>
      )}
      {needsProductionWorkspace && !destinationReady && (
        <p role="status" className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">
          {workspaceId || contentId ? "Carregando a peça…" : "Selecione uma pauta no Brainstorm para abrir esta etapa."}
        </p>
      )}
      {activeTab === "content" && destinationReady && (
        <ContentWriterPanel
          clientId={clientId}
          companyName={companyName}
          contentId={targetContentId}
          headline={data?.workspace?.selected_headline || currentIdea?.title || ""}
          subheadline={data?.workspace?.selected_subheadline || ""}
          angle={currentIdea?.angle || ""}
          initialFormat={currentIdea?.format || brief.format || "Reels"}
          onAdvanceToImagePrompt={(contentData) => {
            setActiveContentData(contentData);
            setActiveTab("imagePrompt");
          }}
          onBackToHeadlines={() => setActiveTab("headlines")}
        />
      )}

      {/* ========================================================================= */}
      {/* ABA 5: PROMPT DE IMAGEM & UPLOAD DE ARTE (PASSO 5 DA SEQUÊNCIA)           */}
      {/* ========================================================================= */}
      {activeTab === "imagePrompt" && destinationReady && (
        <ImagePromptPanel
          clientId={clientId}
          companyName={companyName}
          contentId={targetContentId}
          headline={data?.workspace?.selected_headline || currentIdea?.title || ""}
          subheadline={data?.workspace?.selected_subheadline || ""}
          format={currentContent?.format || currentIdea?.format || brief.format || "Reels"}
          textContent={currentContent?.text || ""}
          onAdvanceToSchedule={() => setActiveTab("schedule")}
          onBackToContent={() => setActiveTab("content")}
        />
      )}

      {/* ========================================================================= */}
      {/* ABA 6: CALENDÁRIO & AGENDAMENTO (PASSO 6 DA SEQUÊNCIA)                     */}
      {/* ========================================================================= */}
      {activeTab === "schedule" && destinationReady && (
        <SchedulePanel
          clientId={clientId}
          companyName={companyName}
          contentId={targetContentId}
          headline={data?.workspace?.selected_headline || currentIdea?.title || "Conteúdo"}
          format={currentContent?.format || currentIdea?.format || brief.format || "Reels"}
          onFinish={() => {
            setMessage("Conteúdo agendado com sucesso no Calendário!");
            const next = new URLSearchParams({ tab: "CALENDAR" });
            if (targetContentId) next.set("contentId", targetContentId);
            router.push("/prompt-creator?" + next);
          }}
          onBackToImagePrompt={() => setActiveTab("imagePrompt")}
        />
      )}
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="p-8">Carregando...</p>}>
      <HeadlineWorkspace />
    </Suspense>
  );
}
