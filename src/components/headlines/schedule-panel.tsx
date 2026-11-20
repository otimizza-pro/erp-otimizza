"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Image as ImageIcon,
  Check,
  CalendarDays,
} from "lucide-react";

const control =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition";

interface SchedulePanelProps {
  clientId: string;
  companyName: string;
  contentId: string | null;
  headline: string;
  format: string;
  imageUrl?: string | null;
  onFinish: () => void;
  onBackToImagePrompt: () => void;
}

interface CalendarPost {
  id: string;
  title: string;
  scheduled_date: string;
  scheduled_time?: string;
  status: string;
  format: string;
}

export function SchedulePanel({
  clientId,
  companyName,
  contentId,
  headline,
  format,
  imageUrl: initialImageUrl,
  onFinish,
  onBackToImagePrompt,
}: SchedulePanelProps) {
  const [scheduledDate, setScheduledDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today.toISOString().split("T")[0];
  });
  const [scheduledTime, setScheduledTime] = useState("18:00");
  const [status, setStatus] = useState<"SCHEDULED" | "PLANNED" | "APPROVED">("SCHEDULED");
  const [published, setPublished] = useState(false);
  const [imageUrl, setImageUrl] = useState(initialImageUrl || "");

  const [saving, setSaving] = useState(false);
  const [scheduledSuccess, setScheduledSuccess] = useState(false);
  const [calendarPosts, setCalendarPosts] = useState<CalendarPost[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Carrega posts do calendário deste cliente para mostrar dias ocupados
  useEffect(() => {
    if (!clientId) return;
    const fetchCalendar = async () => {
      setLoadingCalendar(true);
      try {
        const res = await fetch(`/api/content-studio/calendar?clientId=${clientId}`);
        if (!res.ok) return;
        const d = await res.json();
        setCalendarPosts(Array.isArray(d.items) ? d.items : Array.isArray(d.data) ? d.data : []);
      } catch {} finally {
        setLoadingCalendar(false);
      }
    };
    fetchCalendar();
  }, [clientId]);

  // Carrega se a peça já tiver agendamento salvo
  useEffect(() => {
    if (!contentId) return;
    const loadSaved = async () => {
      try {
        const res = await fetch(`/api/content-studio/posts/${contentId}`);
        if (!res.ok) return;
        const d = await res.json();
        if (d.data) {
          if (d.data.scheduled_date) setScheduledDate(d.data.scheduled_date.split("T")[0]);
          if (d.data.scheduled_time) setScheduledTime(d.data.scheduled_time.slice(0, 5));
          if (d.data.image_url) setImageUrl(d.data.image_url);
          if (d.data.status) {
            setPublished(d.data.status === "PUBLISHED");
            setStatus(
              d.data.status === "APPROVED" || d.data.status === "SCHEDULED" ? d.data.status : "PLANNED"
            );
          }
        }
      } catch {}
    };
    loadSaved();
  }, [contentId]);

  // Agendar post
  const handleSchedule = async () => {
    if (published) return;
    if (!contentId) {
      setFeedback({ type: "error", text: "Nenhuma peça associada encontrada." });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const chosenStatus = status || (imageUrl ? "SCHEDULED" : "PLANNED");
      const res = await fetch(`/api/content-studio/posts/${contentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          scheduledDate,
          scheduledTime: scheduledTime ? scheduledTime + ":00" : "18:00:00",
          status: chosenStatus,
        }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Erro ao agendar no calendário.");
      }

      setScheduledSuccess(true);
      setFeedback({ type: "success", text: "Publicação agendada no Calendário com sucesso!" });
    } catch (e: unknown) {
      const err = e as Error;
      setFeedback({ type: "error", text: err.message || "Falha ao agendar publicação." });
    } finally {
      setSaving(false);
    }
  };

  // Mapeia dias com posts do mês selecionado
  const postsByDate = new Map<string, CalendarPost[]>();
  calendarPosts.forEach((post) => {
    if (post.scheduled_date) {
      const dateKey = post.scheduled_date.split("T")[0];
      if (!postsByDate.has(dateKey)) postsByDate.set(dateKey, []);
      postsByDate.get(dateKey)!.push(post);
    }
  });

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIOR */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToImagePrompt}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-950 transition cursor-pointer"
            >
              <ArrowLeft size={14} />
              Voltar ao Passo 5: Prompt & Arte
            </button>
            <span className="text-zinc-300">·</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-xs font-bold text-emerald-800">
              Passo 6: Calendário de Conteúdo & Feed
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
              disabled={saving || published}
              onClick={handleSchedule}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calendar size={16} />}
              {saving ? "Agendando..." : "Confirmar Agendamento no Calendário"}
            </button>
          </div>
        </div>

        {/* CARTÃO DE RESUMO */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Conteúdo a Publicar:</span>
            <div className="text-sm font-extrabold text-zinc-900">{headline}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-white border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-700">
              {format}
            </span>
            <span
              className={
                "rounded-lg px-2.5 py-1 text-xs font-bold border " +
                (imageUrl
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : "bg-amber-100 text-amber-900 border-amber-200")
              }
            >
              {imageUrl ? "✓ Arte Anexada" : "⚠ Aguardando Arte (Pode subir depois)"}
            </span>
          </div>
        </div>
      </div>

      {scheduledSuccess ? (
        /* TELA DE SUCESSO APÓS AGENDAR */
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-2xs text-center space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={36} />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-zinc-950">Post Agendado com Sucesso!</h2>
            <p className="mt-1 text-sm text-zinc-600 max-w-md mx-auto">
              Sua publicação foi programada para o dia <strong>{scheduledDate.split("-").reverse().join("/")}</strong> às <strong>{scheduledTime}</strong> para o cliente <strong>{companyName}</strong>.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-3">
            <Link
              href="/prompt-creator?tab=CALENDAR"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition"
            >
              <CalendarDays size={16} />
              Ver no Calendário de Conteúdo
            </Link>
            <Link
              href="/prompt-creator/saved"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition"
            >
              <ImageIcon size={16} />
              Ver em Feed & Criativos
            </Link>
            <button
              type="button"
              onClick={onFinish}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition cursor-pointer"
            >
              <Sparkles size={16} />
              + Criar Próximo Conteúdo
            </button>
          </div>
        </div>
      ) : (
        /* FORMULÁRIO DE AGENDAMENTO + MINI-CALENDÁRIO */
        <div className="grid gap-6 md:grid-cols-2">
          {/* DEFINIÇÃO DE DATA E HORÁRIO */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-5">
            <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
              <Calendar size={18} className="text-emerald-600" />
              Programação da Postagem
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-zinc-700">Data de Publicação</label>
                <input
                  type="date"
                  className={control}
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">Horário Previsto</label>
                <input
                  type="time"
                  className={control}
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700">Status Inicial</label>
              <select
                className={control}
                value={status}
                onChange={(e) => setStatus(e.target.value as "SCHEDULED" | "PLANNED" | "APPROVED")}
              >
                <option value="SCHEDULED">Agendado (Pronto para postagem)</option>
                <option value="PLANNED">Planejado (Aguardando arte final)</option>
                <option value="APPROVED">Aprovado pelo cliente</option>
              </select>
              <p className="mt-1 text-[11px] text-zinc-500">
                {imageUrl
                  ? "Como a arte já foi anexada, o status padrão é 'Agendado'."
                  : "Se você ainda não subiu a imagem, selecione 'Planejado' para que ela apareça como pendente no Feed & Criativos."}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 text-xs text-emerald-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Sincronização Automática
              </div>
              <p className="text-emerald-800 leading-relaxed">
                Ao confirmar, este post será integrado instantaneamente ao <strong>Calendário de Conteúdo</strong> e à galeria de <strong>Feed & Criativos</strong>.
              </p>
            </div>
          </div>

          {/* VISÃO DOS DIAS OCUPADOS NO CALENDÁRIO DO CLIENTE */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                  <CalendarDays size={18} className="text-indigo-600" />
                  Próximos Posts Deste Cliente
                </h3>
                <p className="text-xs text-zinc-500">
                  Verifique a frequência para evitar conflitos de datas ou dias consecutivos sem postagem.
                </p>
              </div>
              {loadingCalendar && <RefreshCw size={14} className="animate-spin text-zinc-400" />}
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {calendarPosts.slice(0, 8).map((p) => {
                const dateFmt = p.scheduled_date ? p.scheduled_date.split("T")[0].split("-").reverse().join("/") : "Sem data";
                const isSelectedDate = p.scheduled_date?.split("T")[0] === scheduledDate;
                return (
                  <div
                    key={p.id}
                    className={
                      "flex items-center justify-between p-3 rounded-xl border text-xs transition " +
                      (isSelectedDate
                        ? "border-amber-300 bg-amber-50/70 font-semibold"
                        : "border-zinc-200 bg-zinc-50/50 text-zinc-700")
                    }
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-zinc-900 truncate">{p.title}</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {p.format} · Status: {p.status}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-zinc-900">{dateFmt}</span>
                      {isSelectedDate && (
                        <span className="block text-[10px] text-amber-800 font-bold">
                          Mesmo dia selecionado
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {calendarPosts.length === 0 && !loadingCalendar && (
                <div className="p-8 text-center border border-dashed border-zinc-200 rounded-xl text-xs text-zinc-400">
                  Nenhum post agendado anteriormente para este cliente. O calendário está livre!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
