"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { nextProjectMonth, type SocialMediaSchedule } from "@/modules/projects/social-media-schedule";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  RotateCcw,
  Trash2,
  Wand2,
  ArrowUpRight,
  Plus,
} from "lucide-react";

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const defaultSchedule = { postsPerMonth: 12, weekdays: [1, 3, 5] };
const statusLabels: Record<string, string> = {
  PLANNED: "Planejado", IN_CREATION: "Em criação", APPROVED: "Aprovado",
  SCHEDULED: "Agendado", PUBLISHED: "Publicado",
};

export function SocialMediaScheduleFields({
  value,
  onChange,
  baseDate,
}: {
  value: SocialMediaSchedule;
  onChange: (value: SocialMediaSchedule) => void;
  baseDate?: string;
}) {
  // Mês selecionado no calendário (YYYY-MM)
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    if (baseDate && /^\d{4}-\d{2}/.test(baseDate)) {
      return baseDate.slice(0, 7);
    }
    return new Date().toISOString().slice(0, 7);
  });

  // Atualiza se baseDate mudar e ainda não tiver sido mexido
  useEffect(() => {
    if (baseDate && /^\d{4}-\d{2}/.test(baseDate)) {
      setCurrentMonth(baseDate.slice(0, 7));
    }
  }, [baseDate]);

  // Lista de datas selecionadas
  const selectedDates = useMemo(() => {
    if (value.customDates && value.customDates.length > 0) {
      return [...new Set(value.customDates)].sort();
    }
    // Se não tiver customDates, gera as datas sugeridas a partir de postsPerMonth + weekdays
    try {
      const [year, monthNum] = currentMonth.split("-").map(Number);
      const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
      const matchingDates = Array.from({ length: lastDay }, (_, i) => {
        const d = new Date(Date.UTC(year, monthNum - 1, i + 1));
        return { str: d.toISOString().slice(0, 10), day: d.getUTCDay() };
      }).filter(item => value.weekdays.includes(item.day));

      if (matchingDates.length === 0) return [];

      const count = Math.min(value.postsPerMonth, matchingDates.length);
      const dates: string[] = [];
      for (let i = 0; i < count; i++) {
        const idx = count === 1 ? 0 : Math.round(i * (matchingDates.length - 1) / (count - 1));
        dates.push(matchingDates[idx].str);
      }
      return [...new Set(dates)].sort();
    } catch {
      return [];
    }
  }, [value.customDates, value.postsPerMonth, value.weekdays, currentMonth]);

  // Navegação de mês
  const handlePrevMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number);
    const prev = new Date(Date.UTC(y, m - 2, 1));
    setCurrentMonth(prev.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number);
    const next = new Date(Date.UTC(y, m, 1));
    setCurrentMonth(next.toISOString().slice(0, 7));
  };

  // Alterna data ao clicar no dia
  const toggleDate = (dateStr: string) => {
    const exists = selectedDates.includes(dateStr);
    let nextDates: string[];
    if (exists) {
      nextDates = selectedDates.filter(d => d !== dateStr);
    } else {
      nextDates = [...selectedDates, dateStr].sort();
    }
    onChange({
      ...value,
      postsPerMonth: nextDates.length > 0 ? nextDates.length : value.postsPerMonth,
      customDates: nextDates,
    });
  };

  // Auto-distribuir pelos dias da semana selecionados
  const handleAutoDistribute = () => {
    try {
      const [year, monthNum] = currentMonth.split("-").map(Number);
      const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
      const matchingDates = Array.from({ length: lastDay }, (_, i) => {
        const d = new Date(Date.UTC(year, monthNum - 1, i + 1));
        return { str: d.toISOString().slice(0, 10), day: d.getUTCDay() };
      }).filter(item => value.weekdays.includes(item.day));

      const count = Math.min(value.postsPerMonth, matchingDates.length);
      const dates: string[] = [];
      for (let i = 0; i < count; i++) {
        const idx = count === 1 ? 0 : Math.round(i * (matchingDates.length - 1) / (count - 1));
        dates.push(matchingDates[idx].str);
      }
      const unique = [...new Set(dates)].sort();
      onChange({
        ...value,
        postsPerMonth: unique.length,
        customDates: unique,
      });
    } catch { }
  };

  // Construir grade do calendário
  const calendarGrid = useMemo(() => {
    const [year, monthNum] = currentMonth.split("-").map(Number);
    const firstDayOfWeek = new Date(Date.UTC(year, monthNum - 1, 1)).getUTCDay();
    const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();

    const cells: Array<{ dayNumber: number; dateStr: string; isCurrentMonth: boolean }> = [];

    // Células em branco / dias anteriores
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ dayNumber: 0, dateStr: "", isCurrentMonth: false });
    }

    // Dias do mês
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${currentMonth}-${String(d).padStart(2, "0")}`;
      cells.push({ dayNumber: d, dateStr, isCurrentMonth: true });
    }

    return cells;
  }, [currentMonth]);

  // Formatação de nome do mês
  const monthLabel = useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  }, [currentMonth]);

  const presetCounts = [4, 8, 12, 16, 20];

  return (
    <div className="space-y-4 pt-1">
      {/* 1. Quantidade de posts com atalhos rápidos */}
      <div className="bg-zinc-50/70 border border-zinc-200 rounded-xl p-3.5 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="block text-xs font-medium text-zinc-900">
              Quantidade de publicações no ciclo
            </label>
            <span className="text-xs text-zinc-500">Meta mensal para geração de pautas</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={31}
              value={value.postsPerMonth || ""}
              onChange={e => {
                const num = Math.max(1, Math.min(31, Number(e.target.value) || 1));
                onChange({ ...value, postsPerMonth: num, customDates: undefined });
              }}
              className="w-18 h-8 px-2.5 bg-white border border-zinc-200 rounded-lg text-center font-mono font-medium text-zinc-900 text-sm focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
            />
            <span className="text-xs text-zinc-500">posts</span>
          </div>
        </div>

        {/* Atalhos rápidos de quantidade */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-xs text-zinc-400 mr-1">Atalhos:</span>
          {presetCounts.map(count => (
            <button
              key={count}
              type="button"
              onClick={() => onChange({ ...value, postsPerMonth: count, customDates: undefined })}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${value.postsPerMonth === count
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
            >
              {count} posts
            </button>
          ))}
        </div>
      </div>

      {/* 2. Dias da semana preferenciais */}
      <div className="bg-zinc-50/70 border border-zinc-200 rounded-xl p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-zinc-900">
            Dias da semana preferenciais
          </label>
          <span className="text-xs text-zinc-500">Distribuição sugerida</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {weekdays.map((day, idx) => {
            const isSelected = value.weekdays.includes(idx);
            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  const nextWeekdays = isSelected
                    ? value.weekdays.filter(item => item !== idx)
                    : [...value.weekdays, idx];
                  onChange({
                    ...value,
                    weekdays: nextWeekdays,
                    customDates: undefined, // recalcula baseado nos novos dias
                  });
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${isSelected
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                  }`}
              >
                {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={1.5} />}
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Calendário Interativo para Planejamento de Datas */}
      <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
        {/* Cabeçalho do Calendário */}
        <div className="bg-zinc-900 text-white px-3.5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
            <span className="text-xs font-medium capitalize">{monthLabel}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Sub-barra com resumo e ações rápidas */}
        <div className="px-3.5 py-2 bg-zinc-50 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-800 font-mono tabular-nums">
              {selectedDates.length} de {value.postsPerMonth} posts planejados
            </span>
            {selectedDates.length === value.postsPerMonth ? (
              <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.2 rounded font-medium border border-emerald-200 text-[11px]">
                <Check className="w-3 h-3" strokeWidth={1.5} /> Completo
              </span>
            ) : selectedDates.length < value.postsPerMonth ? (
              <span className="text-amber-800 bg-amber-50 px-2 py-0.2 rounded font-medium border border-amber-200 text-[11px]">
                Faltam {value.postsPerMonth - selectedDates.length} datas
              </span>
            ) : (
              <span className="text-zinc-700 bg-zinc-100 px-2 py-0.2 rounded font-medium border border-zinc-200 text-[11px]">
                +{selectedDates.length - value.postsPerMonth} extras
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoDistribute}
              className="inline-flex items-center gap-1 text-zinc-700 hover:text-zinc-950 font-medium px-2 py-1 rounded hover:bg-zinc-100 transition-colors text-[11px]"
              title="Auto-distribuir pelos dias da semana"
            >
              <Sparkles className="w-3 h-3 text-zinc-400" strokeWidth={1.5} />
              Auto-distribuir
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...value, customDates: [] })}
              className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-700 font-medium px-2 py-1 rounded hover:bg-zinc-100 transition-colors text-[11px]"
              title="Limpar todas as datas deste mês"
            >
              <RotateCcw className="w-3 h-3 text-zinc-400" strokeWidth={1.5} />
              Limpar
            </button>
          </div>
        </div>

        {/* Grade dos dias da semana */}
        <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 text-center text-[11px] font-medium text-zinc-500 py-1.5">
          {weekdays.map(w => (
            <div key={w}>{w}</div>
          ))}
        </div>

        {/* Células do Calendário */}
        <div className="grid grid-cols-7 gap-1 p-2 bg-zinc-50/40">
          {calendarGrid.map((cell, idx) => {
            if (!cell.isCurrentMonth) {
              return <div key={`empty-${idx}`} className="h-10 rounded-lg bg-transparent" />;
            }

            const isSelected = selectedDates.includes(cell.dateStr);
            const postOrder = isSelected ? selectedDates.indexOf(cell.dateStr) + 1 : null;

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => toggleDate(cell.dateStr)}
                className={`relative h-10 rounded-lg border text-xs flex flex-col items-center justify-center transition-all ${isSelected
                  ? "bg-zinc-900 text-white font-medium border-zinc-900"
                  : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                title={isSelected ? `Post #${postOrder}: ${cell.dateStr} (Clique para remover)` : `Clique para agendar post em ${cell.dateStr}`}
              >
                <span className="text-xs leading-none font-mono tabular-nums">{cell.dayNumber}</span>
                {isSelected && (
                  <span className="text-[9px] font-mono font-medium text-zinc-300 mt-0.5">
                    #{postOrder}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Lista/Timeline resumida dos posts */}
        {selectedDates.length > 0 && (
          <div className="p-3 bg-white border-t border-zinc-200">
            <span className="block text-[11px] font-medium text-zinc-500 mb-2">
              Cronograma de datas agendadas ({selectedDates.length} posts):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {selectedDates.map((dateStr, i) => {
                const [y, m, d] = dateStr.split("-");
                return (
                  <span
                    key={dateStr}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs font-mono tabular-nums"
                  >
                    <span className="text-[10px] text-zinc-400">#{i + 1}</span>
                    <span>{d}/{m}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type ProjectPost = {
  id: string;
  title: string;
  scheduledDate: string | null;
  status: string;
  archivedAt: string | null;
  format?: string | null;
  editorialLineId?: string | null;
  pillarId?: string | null;
  pillarName?: string | null;
  themeName?: string | null;
  offerName?: string | null;
  projectPostNumber?: number | null;
};
type EditorialLineOption = {
  id: string;
  pillarId: string | null;
  pillarName: string;
  theme: string;
  preferredFormats?: string[];
};
type CatalogOfferOption = {
  id: string;
  name: string;
  type: string;
  category?: string | null;
};
type Plan = {
  schedule: SocialMediaSchedule | null;
  months: string[];
  posts: ProjectPost[];
  editorialLines?: EditorialLineOption[];
  catalogOffers?: CatalogOfferOption[];
};
const POST_FORMATS = ["Carrossel", "Reels", "Post estático", "Stories", "Post em texto"];
const actionClass = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer";

export function ProjectSocialMediaPlan({ projectId, startDate, archived }: {
  projectId: string;
  startDate: string;
  archived: boolean;
}) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [schedule, setSchedule] = useState<SocialMediaSchedule>(defaultSchedule);
  const [month, setMonth] = useState("");
  const [firstMonth, setFirstMonth] = useState(startDate.slice(0, 7));
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [savingPostId, setSavingPostId] = useState<string | null>(null);
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const url = `/api/projects/${projectId}/social-media`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(month ? `${url}?month=${month}` : url, { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data as Plan;
      })
      .then(data => {
        setPlan(data);
        setSchedule(data.schedule ?? defaultSchedule);
        const drafts: Record<string, string> = {};
        for (const p of data.posts) drafts[p.id] = p.title;
        setTitleDrafts(drafts);
      })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [url, month, revision]);

  const latest = plan?.months[0];
  const activeMonth = month || latest || "";
  const nextMonth = latest ? nextProjectMonth(latest) : firstMonth;
  const dirty = !plan?.schedule || schedule.postsPerMonth !== plan.schedule.postsPerMonth ||
    schedule.weekdays.length !== plan.schedule.weekdays.length ||
    schedule.weekdays.some(day => !plan.schedule?.weekdays.includes(day));

  async function save(action: "SAVE" | "PLAN") {
    if (action === "SAVE" && !schedule.weekdays.length) {
      setError("Selecione pelo menos um dia de publicação.");
      return;
    }
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "SAVE" ? { action, schedule } : { action, month: nextMonth }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (action === "PLAN") setMonth(nextMonth);
      setRevision(value => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar o planejamento.");
    } finally {
      setBusy(false);
    }
  }

  async function updatePost(
    postId: string,
    patch: {
      title?: string;
      scheduledDate?: string | null;
      format?: string | null;
      editorialLineId?: string | null;
      offerName?: string | null;
    }
  ) {
    setSavingPostId(postId);
    setError("");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_POST", postId, ...patch }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRevision(v => v + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar o post.");
    } finally {
      setSavingPostId(null);
    }
  }

  async function autoOrganizeMonth() {
    if (!activeMonth) return;
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "AUTO_ORGANIZE", month: activeMonth }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setFeedback("Pilares, serviços e formatos distribuídos automaticamente nos posts deste mês.");
      setRevision(v => v + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível organizar os posts.");
    } finally {
      setBusy(false);
    }
  }

  async function addPostToMonth() {
    if (!activeMonth) return;
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_POST", month: activeMonth }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setFeedback("Novo post adicionado ao planejamento do mês.");
      setRevision(v => v + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível adicionar o post.");
    } finally {
      setBusy(false);
    }
  }

  async function deletePost(post: ProjectPost) {
    if (!confirm(`Excluir o post "${post.title}"? Esta ação remove o post do planejamento e do calendário.`)) return;
    setSavingPostId(post.id);
    setError("");
    setFeedback("");
    try {
      const response = await fetch(`${url}?postId=${encodeURIComponent(post.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRevision(v => v + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível excluir o post.");
    } finally {
      setSavingPostId(null);
    }
  }

  async function deleteMonth() {
    if (!activeMonth) return;
    if (!confirm(`Excluir TODOS os posts planejados do mês ${activeMonth.split("-").reverse().join("/")}?`)) return;
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const response = await fetch(`${url}?month=${encodeURIComponent(activeMonth)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMonth("");
      setFeedback("Mês removido do planejamento.");
      setRevision(v => v + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível excluir o mês.");
    } finally {
      setBusy(false);
    }
  }

  const editorialLines = plan?.editorialLines ?? [];
  const catalogOffers = plan?.catalogOffers ?? [];

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">Planejamento de Social Media</h2>
          <p className="text-xs text-slate-500">Defina a cadência, organize pilares, serviços e formatos antes de enviar para o Brainstorm.</p>
        </div>
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}
      {feedback && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{feedback}</p>}
      {!plan && !error && <p className="text-sm text-slate-600">Carregando planejamento…</p>}
      {plan && !archived && (
        <form className="space-y-3" onSubmit={event => { event.preventDefault(); void save("SAVE"); }}>
          <SocialMediaScheduleFields value={schedule} onChange={setSchedule} baseDate={nextMonth || startDate} />
          <button className={actionClass} disabled={busy || !dirty}>Salvar configuração</button>
        </form>
      )}
      {plan?.schedule && !archived && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          {!latest && <label className="text-sm font-medium text-slate-700">Primeiro mês
            <input className="ml-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" type="month" min={startDate.slice(0, 7)}
              value={firstMonth} onChange={event => setFirstMonth(event.target.value)} />
          </label>}
          <button type="button" className={actionClass} disabled={busy || dirty || !nextMonth} onClick={() => void save("PLAN")}>
            {latest ? "Planejar próximo mês" : "Planejar primeiro mês"} {nextMonth && `(${nextMonth.split("-").reverse().join("/")})`}
          </button>
        </div>
      )}
      {!!plan?.months.length && (
        <div className="space-y-4 border-t border-slate-200 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-semibold text-slate-700">Mês planejado
                <select
                  className="ml-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                  value={activeMonth}
                  onChange={event => setMonth(event.target.value)}
                >
                  {plan.months.map(value => <option key={value} value={value}>{value.split("-").reverse().join("/")}</option>)}
                </select>
              </label>
              <span className="rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 tabular-nums">
                {plan.posts.length} {plan.posts.length === 1 ? "post" : "posts"}
              </span>
            </div>

            {!archived && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void addPostToMonth()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                  title="Adicionar mais um post planejado neste mês"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar post
                </button>
                {!!plan.posts.length && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void autoOrganizeMonth()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
                    title="Distribui automaticamente pilares da linha editorial, produtos/serviços e formatos variados nos posts do mês"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    Organização Automática
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deleteMonth()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition cursor-pointer"
                  title="Excluir todos os posts deste mês"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir mês
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            {plan.posts.map((post, idx) => {
              const isSaving = savingPostId === post.id;
              const draftTitle = titleDrafts[post.id] ?? post.title;
              const numberLabel = String(post.projectPostNumber ?? idx + 1).padStart(2, "0");
              const locked = Boolean(post.archivedAt || archived);
              return (
                <div
                  key={post.id}
                  className={`rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-slate-300 ${isSaving ? "opacity-75" : ""}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex flex-1 min-w-[220px] items-center gap-2">
                      <span className="inline-flex h-6 min-w-7 items-center justify-center rounded-md bg-zinc-900 px-1.5 text-[11px] font-mono font-bold text-white">
                        #{numberLabel}
                      </span>
                      <input
                        type="text"
                        disabled={locked}
                        value={draftTitle}
                        onChange={e => setTitleDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onBlur={() => {
                          const trimmed = draftTitle.trim();
                          if (trimmed && trimmed !== post.title) {
                            void updatePost(post.id, { title: trimmed });
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        aria-label={`Título do post ${numberLabel}`}
                        className="w-full rounded-lg border border-transparent bg-slate-50/70 px-2.5 py-1 text-sm font-semibold text-slate-900 hover:border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-none disabled:opacity-60"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                        {post.archivedAt ? "Arquivado" : statusLabels[post.status] || post.status}
                      </span>
                      {!locked && (
                        <>
                          <Link
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                            href={`/prompt-creator/brainstorm?projectPostId=${post.id}`}
                          >
                            Abrir no brainstorm
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => void deletePost(post)}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                            title="Excluir post do planejamento"
                            aria-label={`Excluir ${post.title}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <label className="block">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Data agendada
                      </span>
                      <input
                        type="date"
                        disabled={locked}
                        value={post.scheduledDate?.slice(0, 10) || ""}
                        onChange={e => void updatePost(post.id, { scheduledDate: e.target.value || null })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                      />
                    </label>

                    <label className="block">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Pilar / Linha Editorial
                      </span>
                      <select
                        disabled={locked}
                        value={post.editorialLineId || ""}
                        onChange={e => void updatePost(post.id, { editorialLineId: e.target.value || null })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                      >
                        <option value="">Definir no brainstorm</option>
                        {editorialLines.map(line => (
                          <option key={line.id} value={line.id}>
                            [{line.pillarName}] {line.theme}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Serviço / Produto
                      </span>
                      <select
                        disabled={locked}
                        value={post.offerName === "Institucional / Marca" ? "" : (post.offerName || "")}
                        onChange={e => void updatePost(post.id, { offerName: e.target.value || null })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                      >
                        <option value="">Institucional / Marca</option>
                        {catalogOffers.map(offer => (
                          <option key={offer.id} value={offer.name}>
                            {offer.type === "SERVICE" ? "Serviço" : "Produto"}: {offer.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Tipo / Formato
                      </span>
                      <select
                        disabled={locked}
                        value={post.format || "Post estático"}
                        onChange={e => void updatePost(post.id, { format: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                      >
                        {POST_FORMATS.map(fmt => (
                          <option key={fmt} value={fmt}>
                            {fmt}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
          {!plan.posts.length && <p className="text-sm text-slate-600">Nenhum post neste planejamento.</p>}
        </div>
      )}
    </section>
  );
}
