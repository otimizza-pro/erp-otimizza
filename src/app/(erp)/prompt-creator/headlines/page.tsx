"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompany } from "@/lib/context/company-context";
import { contentCompanyId } from "@/modules/clients/internal-company";
import { briefSchema, blankBrief, fieldGroups, structures, angles, triggers, awareness, formats, missingBrief, sameBrief, type HeadlineBrief } from "@/modules/headlines/schema";
import { makeHeadlinePrompt } from "@/modules/headlines/prompt";
import type { Context, WorkspaceState, Run, Candidate, ModelSlot } from "@/modules/headlines/types";
import { ClientStrategyPanel } from "@/components/headlines/client-strategy-panel";
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
} from "lucide-react";

const control = "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition";
const button = "inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-950 disabled:opacity-40 transition cursor-pointer";
const buttonPrimary = "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-40 transition cursor-pointer";

interface SavedIdea {
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
  workspace_id: string | null;
  content_id: string | null;
  created_at: string;
}

interface Pillar {
  id: string;
  name: string;
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
  return <Workspace key={contentCompanyId(selectedCompany)} clientId={contentCompanyId(selectedCompany)} companyName={selectedCompany.name} />;
}

function Workspace({ clientId, companyName }: { clientId: string; companyName: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const workspaceId = params.get("workspaceId");
  const contentId = params.get("contentId");

  // Sequência Criativa de 4 Passos: "strategy" | "brainstorm" | "headlines" | "studio"
  const tabParam = params.get("tab");
  const [activeTab, setActiveTab] = useState<"strategy" | "brainstorm" | "headlines" | "studio">(
    tabParam === "strategy"
      ? "strategy"
      : workspaceId || contentId
      ? "headlines"
      : "brainstorm"
  );

  // Estado do Brainstorm de Conteúdo
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [editorialLines, setEditorialLines] = useState<EditorialLine[]>([]);
  const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>([]);
  const [rejectedIdeas, setRejectedIdeas] = useState<SavedIdea[]>([]);
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [loadingBrainstorm, setLoadingBrainstorm] = useState(false);
  const [selectedPillarId, setSelectedPillarId] = useState<string>("");
  const [selectedLineId, setSelectedLineId] = useState<string>("");
  const [brainstormDirection, setBrainstormDirection] = useState("");
  const [brainstormFormat, setBrainstormFormat] = useState("Todos");
  const [aiGeneratedIdeas, setAiGeneratedIdeas] = useState<any[]>([]);
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

  // 1. Carrega dados do Brainstorm (Pilares, Linhas, Ideias e Lista Negra)
  const loadBrainstormData = async () => {
    setLoadingBrainstorm(true);
    try {
      const res = await fetch(`/api/headlines/brainstorm?clientId=${clientId}`);
      if (!res.ok) throw new Error("Erro ao carregar dados do brainstorm");
      const d = await res.json();
      setPillars(d.pillars || []);
      setEditorialLines(d.lines || []);
      setSavedIdeas(d.ideas || []);
      setRejectedIdeas(d.rejectedIdeas || []);
    } catch (e: any) {
      setError(e.message || "Falha ao carregar brainstorm.");
    } finally {
      setLoadingBrainstorm(false);
    }
  };

  useEffect(() => {
    loadBrainstormData();
  }, [clientId]);

  // Se houver workspaceId na URL, troca automaticamente para a aba headlines
  useEffect(() => {
    if (workspaceId || contentId) {
      setActiveTab("headlines");
    }
  }, [workspaceId, contentId]);

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
  }, [workspaceId, clientId]);

  useEffect(() => {
    if (!contentId || workspaceId) return;
    let alive = true;
    api<{ id: string }>("", { action: "CREATE", clientId, contentId })
      .then((v) => {
        if (alive) router.replace("/prompt-creator/headlines?workspaceId=" + v.id);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [contentId, workspaceId, clientId, router]);

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
      const res = await fetch("/api/headlines/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GENERATE",
          clientId,
          pillarId: selectedPillarId || undefined,
          editorialLineId: selectedLineId || undefined,
          direction: brainstormDirection.trim() || undefined,
          count: 5,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || "Erro ao gerar ideias de conteúdo.");
      setAiGeneratedIdeas(d.ideas || []);
      setMessage("5 ideias de conteúdo geradas! Você pode Usar Agora, Guardar para a Próxima ou Rejeitar.");
    } catch (e: any) {
      setError(e.message || "Falha na geração de ideias.");
    } finally {
      setGeneratingIdeas(false);
    }
  }

  // 2. Ação A: Usar essa ideia (Avança imediatamente para Headlines)
  async function handleUseIdeaNow(idea: any) {
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/headlines/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "USE_NOW",
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
      if (!res.ok || !d.success) throw new Error(d.error || "Erro ao avançar com a ideia.");
      
      // Remove da lista temporária de sugestões
      setAiGeneratedIdeas((prev) => prev.filter((i) => i.title !== idea.title));
      setActiveIdeaForHeadline(idea);
      setActiveTab("headlines");
      router.push(`/prompt-creator/headlines?workspaceId=${d.workspaceId}`);
      setMessage(`Ideia selecionada! Configure e gere as headlines no Passo 3.`);
      await loadBrainstormData();
    } catch (e: any) {
      setError(e.message || "Erro ao avançar para headlines.");
    }
  }

  // 3. Ação B: Deixar para a próxima (Salva no mural para aparecer no pilar/assunto)
  async function handleSaveForLater(idea: any) {
    try {
      const res = await fetch("/api/headlines/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_FOR_LATER",
          clientId,
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
    } catch (e: any) {
      setError(e.message || "Erro ao guardar ideia.");
    }
  }

  // 4. Ação C: Rejeitar (Move para a Lista Negra de Brainstorm)
  async function handleRejectIdea(idea: any, customReason?: string) {
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
    } catch (e: any) {
      setError(e.message || "Erro ao rejeitar ideia.");
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
    } catch (e: any) {
      setError(e.message || "Erro ao restaurar.");
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
    } catch (e: any) {
      setError(e.message || "Erro ao salvar ideia.");
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
    } catch (e: any) {
      setError(e.message || "Erro ao excluir.");
    }
  }

  const round = data?.rounds.find((r) => r.id === activeRound);
  const roundRuns = data?.runs.filter((r) => r.round_id === activeRound) || [];
  const roundCandidates = data?.candidates.filter((c) => c.round_id === activeRound) || [];
  const preview = context ? makeHeadlinePrompt(brief, context) : "Carregando o contexto do cliente...";

  const targetContentId = data?.workspace?.content_id || contentId || activeIdeaForHeadline?.content_id || null;

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
    return true;
  });

  return (
    <main className="mx-auto max-w-[1800px] space-y-6 p-4 md:p-8 text-zinc-900">
      {/* CABEÇALHO PRINCIPAL COM CONTEXTO DA EMPRESA E ABAS DE SEQUÊNCIA CRIATIVA */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
              <Compass size={13} />
              {companyName}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-950">
            {activeTab === "strategy"
              ? "Estratégia Completa & DNA"
              : activeTab === "brainstorm"
              ? "Brainstorm de Conteúdo"
              : activeTab === "headlines"
              ? "Laboratório de Headlines"
              : "Estúdio Criativo"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 max-w-3xl">
            {activeTab === "strategy"
              ? "Diretrizes estratégicas, posicionamento, públicos-alvo, dores, arquétipos, regras de voz e canais do cliente."
              : activeTab === "brainstorm"
              ? "Defina os temas e ideias dos próximos conteúdos com base nos pilares estratégicos e assuntos cadastrados antes de criar as headlines."
              : activeTab === "headlines"
              ? "Desdobre suas ideias de conteúdo em headlines de alto impacto com os times de IA, avalie opções e envie diretamente para o estúdio criativo."
              : "Redija o conteúdo completo (roteiro de Reels, Carrossel, Post ou Legenda) da pauta selecionada."}
          </p>
        </div>

        {/* NAVEGAÇÃO DE FLUXO SEQUENCIAL (4 PASSOS) & ATALHOS */}
        <div className="flex flex-wrap items-center gap-2">
          {/* MENU DAS 4 SEQUÊNCIAS DE CRIAÇÃO */}
          <div className="inline-flex rounded-xl bg-zinc-100 p-1 border border-zinc-200 shadow-2xs">
            <button
              onClick={() => setActiveTab("strategy")}
              className={
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition cursor-pointer " +
                (activeTab === "strategy" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-600 hover:text-zinc-950")
              }
            >
              <Compass size={16} className={activeTab === "strategy" ? "text-emerald-600" : ""} />
              1. Estratégia Completa
            </button>
            <button
              onClick={() => setActiveTab("brainstorm")}
              className={
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition cursor-pointer " +
                (activeTab === "brainstorm" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-600 hover:text-zinc-950")
              }
            >
              <Lightbulb size={16} className={activeTab === "brainstorm" ? "text-amber-500" : ""} />
              2. Brainstorm & Ideias
              {savedIdeas.length > 0 && (
                <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.2 text-[11px] font-bold text-emerald-800">
                  {savedIdeas.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("headlines")}
              className={
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition cursor-pointer " +
                (activeTab === "headlines" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-600 hover:text-zinc-950")
              }
            >
              <Sparkles size={16} className={activeTab === "headlines" ? "text-emerald-600" : ""} />
              3. Headlines
            </button>
            <button
              onClick={() => setActiveTab("studio")}
              className={
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition cursor-pointer " +
                (activeTab === "studio" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-600 hover:text-zinc-950")
              }
            >
              <ArrowRight size={16} className={activeTab === "studio" ? "text-indigo-600" : ""} />
              4. Estúdio Criativo
            </button>
          </div>

          <Link className={button} href="/prompt-creator?tab=EDITORIAL" title="Gerenciar Pilares e Linha Editorial">
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
      {/* PASSO 1: ESTRATÉGIA COMPLETA & DNA DO CLIENTE                             */}
      {/* ========================================================================= */}
      {activeTab === "strategy" && (
        <ClientStrategyPanel
          clientId={clientId}
          companyName={companyName}
          pillars={pillars}
          editorialLines={editorialLines}
          onAdvanceToBrainstorm={() => setActiveTab("brainstorm")}
        />
      )}

      {/* ========================================================================= */}
      {/* PASSO 2: BRAINSTORM DE CONTEÚDO (PILARES, ASSUNTOS E BANCO DE IDEIAS)     */}
      {/* ========================================================================= */}
      {activeTab === "brainstorm" && (
        <div className="space-y-8">
          {/* SEÇÃO 1: VISÃO DE PILARES E ASSUNTOS DO CLIENTE */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
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
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelectedPillarId("");
                      setSelectedLineId("");
                    }}
                    className={
                      "rounded-xl px-3.5 py-1.5 text-xs font-bold border transition cursor-pointer " +
                      (!selectedPillarId
                        ? "bg-zinc-900 text-white border-zinc-900 shadow-2xs"
                        : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100")
                    }
                  >
                    Todos os Pilares ({pillars.length})
                  </button>
                  {pillars.map((pillar) => {
                    const countPillarIdeas = savedIdeas.filter((i) => i.pillar_id === pillar.id).length;
                    const isSelected = selectedPillarId === pillar.id;
                    return (
                      <button
                        key={pillar.id}
                        onClick={() => {
                          setSelectedPillarId(isSelected ? "" : pillar.id);
                          setSelectedLineId("");
                        }}
                        className={
                          "rounded-xl px-3.5 py-1.5 text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer " +
                          (isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                            : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50")
                        }
                      >
                        {pillar.name}
                        {countPillarIdeas > 0 && (
                          <span className={"rounded-full px-1.5 py-0.2 text-[10px] " + (isSelected ? "bg-emerald-800 text-white" : "bg-zinc-100 text-zinc-600")}>
                            {countPillarIdeas}
                          </span>
                        )}
                      </button>
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
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
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

            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-700">
                  Direcionamento Estratégico (Opcional):
                </label>
                <textarea
                  rows={2}
                  className={control}
                  value={brainstormDirection}
                  onChange={(e) => setBrainstormDirection(e.target.value)}
                  placeholder="Ex: Foco em quebrar objeções sobre preço, dúvidas mais comuns de clientes novos, campanha de fim de ano, bastidores da equipe..."
                />
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

                <div className="mt-3">
                  <button
                    onClick={handleGenerateAiIdeas}
                    disabled={generatingIdeas || !context}
                    className={buttonPrimary + " w-full py-2.5"}
                  >
                    <Sparkles size={16} className={generatingIdeas ? "animate-spin" : ""} />
                    {generatingIdeas ? "Brainstormando temas..." : "Sugerir 5 Temas com IA"}
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
                    Novas Ideias Sugeridas ({aiGeneratedIdeas.length}):
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Escolha: <strong>Usar agora</strong> (vai para headlines), <strong>Guardar para a próxima</strong> (salva no mural) ou <strong>Rejeitar</strong> (lista negra).
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {aiGeneratedIdeas.map((idea, idx) => (
                    <article key={idx} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3 flex flex-col justify-between shadow-2xs">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            {idea.pillar_name}
                          </span>
                          <span className="rounded-md bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-700">
                            {idea.theme_name}
                          </span>
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            {idea.format}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-zinc-950 leading-snug">{idea.title}</h4>
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

                        <div className="flex gap-2">
                          {/* 2. DEIXAR PARA A PRÓXIMA -> FICA SALVA NO SISTEMA */}
                          <button
                            onClick={() => handleSaveForLater(idea)}
                            className={button + " text-xs flex-1 py-1.5 text-zinc-700"}
                            title="Guardar esta ideia no mural para produzir no futuro"
                          >
                            <Bookmark size={14} className="text-emerald-700" />
                            Guardar p/ próxima
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
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SEÇÃO 3: MURAL DE TEMAS & IDEIAS DOS PRÓXIMOS CONTEÚDOS */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-950">
                  <Lightbulb size={20} className="text-amber-500" />
                  Mural de Temas Guardados para os Próximos Conteúdos ({filteredIdeas.length})
                </h2>
                <p className="text-xs text-zinc-500">
                  Ideias guardadas no sistema por pilar e tema. Quando estiver pronto para produzir, clique em <strong>"Usar essa ideia"</strong> para gerar as headlines.
                </p>
              </div>

              {/* FILTROS DO MURAL */}
              <div className="flex flex-wrap items-center gap-2">
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
                  Use o <strong>Brainstorm com IA</strong> acima ou clique em <strong>"+ Nova Ideia Manual"</strong> para definir os temas dos próximos conteúdos da {companyName}.
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
                        </div>

                        {/* TÍTULO / TEMA */}
                        <h3 className="text-base font-bold text-zinc-950 leading-snug">{idea.title}</h3>

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
                            "{idea.rationale}"
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
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* SEÇÃO 4: LISTA NEGRA DE BRAINSTORM (IDEIAS REJEITADAS & APRENDIZADO DA IA) */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3">
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
      {/* ABA 2: LABORATÓRIO DE HEADLINES (PASSO 2 DA SEQUÊNCIA)                    */}
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
              ← Voltar ao Passo 1: Brainstorm
            </button>

            {activeIdeaForHeadline && (
              <span className="text-xs text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                📌 Pauta Ativa: "{activeIdeaForHeadline.title}"
              </span>
            )}

            {targetContentId && (
              <button
                onClick={() => setActiveTab("studio")}
                className="inline-flex items-center gap-2 text-xs font-bold text-indigo-700 hover:text-indigo-950 transition cursor-pointer"
              >
                Avançar para Passo 3: Estúdio Criativo →
              </button>
            )}
          </div>

          {!data && (
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

              {/* HEADLINE ESCOLHIDA -> AVANÇAR PARA PASSO 3: ESTÚDIO CRIATIVO */}
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
                      onClick={() => setActiveTab("studio")}
                      className={buttonPrimary + " py-2.5 px-6 text-sm"}
                    >
                      Avançar para Passo 3: Estúdio Criativo →
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
      {/* ABA 3: ESTÚDIO CRIATIVO (PASSO 3 DA SEQUÊNCIA - REDAÇÃO DO CONTEÚDO)       */}
      {/* ========================================================================= */}
      {activeTab === "studio" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-zinc-100 rounded-xl p-3 border border-zinc-200 shadow-2xs">
            <button
              onClick={() => setActiveTab("headlines")}
              className="inline-flex items-center gap-2 text-xs font-bold text-zinc-700 hover:text-zinc-950 transition cursor-pointer"
            >
              <ArrowLeft size={16} />
              ← Voltar ao Passo 3: Headlines
            </button>

            {targetContentId ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-indigo-900 font-bold bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg">
                  🚀 Passo 4: Redação Completa no Estúdio Criativo
                </span>
                <Link
                  href={`/prompt-creator?contentId=${targetContentId}`}
                  target="_blank"
                  className={button + " !py-1 !text-xs text-zinc-700"}
                  title="Abrir em aba cheia"
                >
                  <ExternalLink size={13} />
                  Abrir em nova aba
                </Link>
              </div>
            ) : (
              <span className="text-xs text-zinc-500 font-semibold">
                Nenhuma peça ativa selecionada
              </span>
            )}
          </div>

          {targetContentId ? (
            <div className="rounded-2xl border border-zinc-200 overflow-hidden shadow-2xs bg-white">
              <iframe
                src={`/prompt-creator?contentId=${targetContentId}&embedded=true`}
                className="w-full min-h-[1100px] border-0"
                title="Estúdio Criativo Integrado"
              />
            </div>
          ) : (
            <section className="rounded-2xl border border-zinc-200 bg-white p-8 text-center space-y-4 shadow-2xs">
              <Sparkles size={36} className="mx-auto text-zinc-400" />
              <h2 className="text-lg font-bold text-zinc-950">Selecione uma peça para abrir o Estúdio Criativo</h2>
              <p className="text-xs text-zinc-500 max-w-lg mx-auto">
                No fluxo de criação sequencial, primeiro você consulta a <strong>Estratégia Completa & DNA</strong>, define a ideia no <strong>Passo 2: Brainstorm</strong>, depois gera e escolhe a headline no <strong>Passo 3: Headlines</strong>, e por fim redige o roteiro de reels, carrossel ou post aqui no <strong>Passo 4: Estúdio Criativo</strong>.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button onClick={() => setActiveTab("strategy")} className={button}>
                  <Compass size={16} />
                  Passo 1: Estratégia
                </button>
                <button onClick={() => setActiveTab("brainstorm")} className={buttonPrimary}>
                  <Lightbulb size={16} />
                  Passo 2: Brainstorm
                </button>
                <button onClick={() => setActiveTab("headlines")} className={button}>
                  <Sparkles size={16} />
                  Passo 3: Headlines
                </button>
              </div>

              {list.length > 0 && (
                <div className="pt-6 border-t border-zinc-100 max-w-2xl mx-auto text-left">
                  <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-3">
                    Ou selecione uma peça recente deste cliente:
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {list.slice(0, 6).map((item) => (
                      <Link
                        key={item.id}
                        href={`/prompt-creator?contentId=${item.id}`}
                        className="rounded-xl border border-zinc-200 p-3 text-xs hover:border-zinc-300 hover:bg-zinc-50 transition flex items-center justify-between"
                      >
                        <span className="font-semibold text-zinc-900 truncate">{item.title}</span>
                        <span className="text-[10px] text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">{item.format}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
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
