"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { nextProjectMonth, type SocialMediaSchedule } from "@/modules/projects/social-media-schedule";

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const defaultSchedule = { postsPerMonth: 12, weekdays: [1, 3, 5] };
const statusLabels: Record<string, string> = {
  PLANNED: "Planejado", IN_CREATION: "Em criação", APPROVED: "Aprovado",
  SCHEDULED: "Agendado", PUBLISHED: "Publicado",
};

export function SocialMediaScheduleFields({ value, onChange }: {
  value: SocialMediaSchedule;
  onChange: (value: SocialMediaSchedule) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block text-sm">Posts por mês
        <input className="ml-2 w-20 rounded-md border px-2 py-1" type="number" min={1} max={31} required
          value={value.postsPerMonth || ""} onChange={event => onChange({ ...value, postsPerMonth: Number(event.target.value) })} />
      </label>
      <fieldset>
        <legend className="text-sm">Dias de publicação</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {weekdays.map((day, index) => (
            <label key={day} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={value.weekdays.includes(index)} onChange={event => onChange({
                ...value,
                weekdays: event.target.checked ? [...value.weekdays, index] : value.weekdays.filter(item => item !== index),
              })} /> {day}
            </label>
          ))}
        </div>
      </fieldset>
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
