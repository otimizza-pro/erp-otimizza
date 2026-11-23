"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { nextProjectMonth, type SocialMediaSchedule } from "@/modules/projects/social-media-schedule";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles, Check, RotateCcw } from "lucide-react";

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
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Quantos posts você quer produzir neste ciclo?
            </label>
            <span className="text-xs text-slate-500">Defina a meta de publicações para o mês</span>
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
              className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-bold text-indigo-700 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-xs font-semibold text-slate-600">posts</span>
          </div>
        </div>

        {/* Atalhos rápidos de quantidade */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-slate-500 mr-1">Atalhos rápidos:</span>
          {presetCounts.map(count => (
            <button
              key={count}
              type="button"
              onClick={() => onChange({ ...value, postsPerMonth: count, customDates: undefined })}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${value.postsPerMonth === count
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                }`}
            >
              {count} posts
            </button>
          ))}
        </div>
      </div>

      {/* 2. Dias da semana preferenciais */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Dias da semana preferenciais de postagem
          </label>
          <span className="text-xs text-slate-500">Usados para sugerir as datas automáticas</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
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
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${isSelected
                  ? "bg-indigo-50 text-indigo-700 border-indigo-300 shadow-xs font-bold"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Calendário Interativo para Planejamento de Datas */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
        {/* Cabeçalho do Calendário */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-bold capitalize">{monthLabel}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-barra com resumo e ações rápidas */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">
              📌 {selectedDates.length} de {value.postsPerMonth} posts planejados
            </span>
            {selectedDates.length === value.postsPerMonth ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
                <Check className="w-3 h-3" /> Completo
              </span>
            ) : selectedDates.length < value.postsPerMonth ? (
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium border border-amber-200">
                Faltam {value.postsPerMonth - selectedDates.length} datas
              </span>
            ) : (
              <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full font-medium border border-indigo-200">
                +{selectedDates.length - value.postsPerMonth} extras
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoDistribute}
              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
              title="Auto-distribuir pelos dias da semana"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-distribuir
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...value, customDates: [] })}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors"
              title="Limpar todas as datas deste mês"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar
            </button>
          </div>
        </div>

        {/* Grade dos dias da semana */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100/70 text-center text-[11px] font-bold text-slate-500 py-1.5">
          {weekdays.map(w => (
            <div key={w}>{w}</div>
          ))}
        </div>

        {/* Células do Calendário */}
        <div className="grid grid-cols-7 gap-1 p-2 bg-slate-50/50">
          {calendarGrid.map((cell, idx) => {
            if (!cell.isCurrentMonth) {
              return <div key={`empty-${idx}`} className="h-11 rounded-lg bg-transparent" />;
            }

            const isSelected = selectedDates.includes(cell.dateStr);
            const postOrder = isSelected ? selectedDates.indexOf(cell.dateStr) + 1 : null;

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => toggleDate(cell.dateStr)}
                className={`relative h-11 rounded-lg border text-xs flex flex-col items-center justify-center transition-all ${isSelected
                  ? "bg-indigo-600 text-white font-bold border-indigo-700 shadow-sm ring-2 ring-indigo-200"
                  : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50"
                  }`}
                title={isSelected ? `Post #${postOrder}: ${cell.dateStr} (Clique para remover)` : `Clique para agendar post em ${cell.dateStr}`}
              >
                <span className="text-xs leading-none">{cell.dayNumber}</span>
                {isSelected && (
                  <span className="text-[10px] font-extrabold text-indigo-100 mt-0.5 tracking-tight">
                    Post #{postOrder}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Lista/Timeline resumida dos posts */}
        {selectedDates.length > 0 && (
          <div className="p-3 bg-white border-t border-slate-200">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Cronograma de datas agendadas ({selectedDates.length} posts):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {selectedDates.map((dateStr, i) => {
                const [y, m, d] = dateStr.split("-");
                return (
                  <span
                    key={dateStr}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold"
                  >
                    <span className="text-[10px] text-indigo-500">#{i + 1}</span>
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

type ProjectPost = { id: string; title: string; scheduledDate: string | null; status: string; archivedAt: string | null };
type Plan = { schedule: SocialMediaSchedule | null; months: string[]; posts: ProjectPost[] };
const actionClass = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50";

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
  const [error, setError] = useState("");
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
      })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [url, month, revision]);

  const latest = plan?.months[0];
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

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">Planejamento de Social Media</h2>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {!plan && !error && <p className="text-sm text-slate-600">Carregando planejamento…</p>}
      {plan && !archived && (
        <form className="space-y-3" onSubmit={event => { event.preventDefault(); void save("SAVE"); }}>
          <SocialMediaScheduleFields value={schedule} onChange={setSchedule} />
          <button className={actionClass} disabled={busy || !dirty}>Salvar configuração</button>
        </form>
      )}
      {plan?.schedule && !archived && (
        <div className="flex flex-wrap items-center gap-3">
          {!latest && <label className="text-sm">Primeiro mês
            <input className="ml-2 rounded-lg border p-1" type="month" min={startDate.slice(0, 7)}
              value={firstMonth} onChange={event => setFirstMonth(event.target.value)} />
          </label>}
          <button type="button" className={actionClass} disabled={busy || dirty || !nextMonth} onClick={() => void save("PLAN")}>
            {latest ? "Planejar próximo mês" : "Planejar primeiro mês"} {nextMonth && `(${nextMonth.split("-").reverse().join("/")})`}
          </button>
        </div>
      )}
      {!!plan?.months.length && (
        <div className="space-y-2">
          <label className="text-sm">Mês planejado
            <select className="ml-2 rounded-lg border p-1" value={month || latest} onChange={event => setMonth(event.target.value)}>
              {plan.months.map(value => <option key={value} value={value}>{value.split("-").reverse().join("/")}</option>)}
            </select>
          </label>
          <ul className="divide-y divide-slate-100 text-sm">
            {plan.posts.map(post => (
              <li key={post.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{post.title} · {post.scheduledDate?.split("-").reverse().join("/") || "Sem data"} · {post.archivedAt ? "Arquivado" : statusLabels[post.status] || post.status}</span>
                {!post.archivedAt && !archived && <Link className="font-semibold text-emerald-700 underline"
                  href={`/prompt-creator/brainstorm?projectPostId=${post.id}`}>Abrir no brainstorm</Link>}
              </li>
            ))}
          </ul>
          {!plan.posts.length && <p className="text-sm text-slate-600">Nenhum post neste planejamento.</p>}
        </div>
      )}
    </section>
  );
}
