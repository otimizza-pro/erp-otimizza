"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { materialLabels, performanceMetrics, publicationPlatforms, socialFormats, type DeliveryState } from "@/modules/clients/content-delivery";

const button = "rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-40";
const input = "mt-1 block w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs";
const decisionLabels = { PENDING: "Em revisão", APPROVED: "Aprovada", CHANGES_REQUESTED: "Ajustes solicitados" };

export function ContentDeliveryPanel({ clientId, contentId }: { clientId: string; contentId: string }) {
  const router = useRouter();
  const [state, setState] = useState<DeliveryState | null>(null);
  const [view, setView] = useState<"review" | "publication" | "derive" | "results" | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loadVersion, reload] = useState(0);
  const lock = useRef(false);
  const draftId = useRef<{ key: string; id: string } | null>(null);
  const controller = useRef<AbortController | null>(null);
  const url = `/api/content-studio/posts/${contentId}/delivery`;

  useEffect(() => {
    if (!view) return;
    const request = new AbortController();
    fetch(url + "?" + new URLSearchParams({ clientId }), { signal: request.signal, cache: "no-store" })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (!request.signal.aborted) setState(result);
      })
      .catch(error => { if (!request.signal.aborted) setError(error.message || "Não foi possível abrir a entrega."); });
    return () => request.abort();
  }, [url, clientId, view, loadVersion]);

  useEffect(() => () => controller.current?.abort(), []);

  async function run(payload: Record<string, unknown>) {
    if (lock.current) return;
    lock.current = true;
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: request.signal,
        body: JSON.stringify({ clientId, ...payload }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar a entrega.");
      if (request.signal.aborted) return;
      if (result.derivedId) {
        draftId.current = null;
        router.push("/prompt-creator?contentId=" + result.derivedId);
      } else {
        setState(result);
        setNotice("Alteração salva.");
        if (payload.action === "PUBLISH") router.refresh();
      }
    } catch (error) {
      if (!request.signal.aborted) setError(error instanceof Error ? error.message : "Não foi possível atualizar a entrega.");
    } finally {
      lock.current = false;
      if (!request.signal.aborted) setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>, action: "PUBLISH" | "DERIVE" | "MEASURE") {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    if (action === "PUBLISH") {
      const timestamp = new Date(String(fields.publishedAt));
      if (!Number.isFinite(timestamp.getTime())) { setError("Informe a data e a hora da publicação."); return; }
      void run({ action, ...fields, publishedAt: timestamp.toISOString() });
    } else if (action === "DERIVE") {
      const key = `${fields.format}:${fields.date}`;
      if (draftId.current?.key !== key) draftId.current = { key, id: crypto.randomUUID() };
      void run({ action, ...fields, date: fields.date || undefined, draftId: draftId.current.id });
    } else {
      void run({ action, ...fields, ...Object.fromEntries(Object.keys(performanceMetrics).map(metric => [metric, Number(fields[metric])])) });
    }
  }

  return <section aria-label="Entrega da peça" className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
    <nav aria-label="Etapas da entrega" className="flex flex-wrap gap-2">
      {([["review", "Revisão"], ["publication", "Publicação"], ["derive", "Desdobrar pauta"], ["results", "Resultados"]] as const).map(([key, label]) => (
        <button key={key} type="button" aria-pressed={view === key} disabled={busy}
          className={button + (view === key ? " border-emerald-600 bg-emerald-50 text-emerald-900" : "")}
          onClick={() => { setError(""); setNotice(""); setView(view === key ? null : key); }}>{label}</button>
      ))}
    </nav>
    {error && <p role="alert" className="text-xs text-rose-700">{error}{" "}
      <button type="button" className="underline" onClick={() => { setError(""); reload(version => version + 1); }}>Recarregar</button>
    </p>}
    {notice && <p role="status" className="text-xs text-emerald-800">{notice}</p>}
    {view && !state && !error && <p role="status" className="text-xs text-zinc-600">Carregando entrega…</p>}
    {view === "review" && state && (
      <div className="space-y-3">
        <p className="text-xs text-zinc-600">{state.ready ? "As versões atuais dos materiais estão aprovadas." : "Envie os materiais salvos para revisão interna."}</p>
        {state.materials.map(item => (
          <div key={item.key} className="space-y-2 rounded-lg border border-zinc-200 p-3">
            <p className="text-xs font-semibold text-zinc-900">{materialLabels[item.key]} · {item.stale ? "Atualização necessária" : item.current ? `Versão ${item.current.version} · ${decisionLabels[item.current.decision]}` : "Aguardando envio"}</p>
            <details><summary className="cursor-pointer text-xs text-zinc-600">Ver material</summary>
              {item.key === "image_url" && /^https?:\/\//i.test(item.snapshot.text)
                ? <a href={item.snapshot.text} target="_blank" rel="noreferrer" className="text-xs text-emerald-800 underline">Abrir imagem</a>
                : <p className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs">{item.snapshot.text}{item.snapshot.subtitle && "\n" + item.snapshot.subtitle}</p>}
            </details>
            {item.current?.comment && <p className="text-xs text-zinc-700">{item.current.comment}</p>}
            {!state.publication && !item.stale && !item.current && <button type="button" className={button} disabled={busy}
              onClick={() => void run({ action: "SUBMIT", material: item.key, snapshot: item.snapshot })}>Enviar para revisão</button>}
            {!state.publication && !item.stale && item.current?.decision === "PENDING" && (
              <div className="space-y-2">
                <label className="text-xs">Comentário<textarea className={input} maxLength={2000} value={comments[item.key] || ""}
                  onChange={event => setComments(current => ({ ...current, [item.key]: event.target.value }))} /></label>
                <div className="flex gap-2">{([["APPROVED", "Aprovar"], ["CHANGES_REQUESTED", "Pedir ajustes"]] as const).map(([decision, label]) => (
                  <button key={decision} type="button" className={button} disabled={busy || (decision === "CHANGES_REQUESTED" && !comments[item.key]?.trim())}
                    onClick={() => void run({ action: "DECIDE", reviewId: item.current?.id, decision, comment: comments[item.key] || "" })}>{label}</button>
                ))}</div>
              </div>
            )}
          </div>
        ))}
        {state.reviews.length > 0 && <details>
          <summary className="cursor-pointer text-xs font-semibold">Histórico de versões</summary>
          {state.reviews.map(review => <details key={review.id} className="my-2 rounded-lg border border-zinc-200 p-2 text-xs">
            <summary className="cursor-pointer">{materialLabels[review.material]} · v{review.version} · {decisionLabels[review.decision]}</summary>
            <p className="mt-1">Enviado em {new Date(review.submitted_at).toLocaleString("pt-BR")} por {review.submitted_by_email || review.submitted_by}</p>
            {review.decided_at && <p>Decidido em {new Date(review.decided_at).toLocaleString("pt-BR")} por {review.decided_by_email || review.decided_by}</p>}
            {review.comment && <p>{review.comment}</p>}
            <p className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words">{review.snapshot.text}{review.snapshot.subtitle && "\n" + review.snapshot.subtitle}</p>
          </details>)}
        </details>}
      </div>
    )}
    {view === "publication" && state && (state.publication ? (
      <p className="text-xs"><strong>Publicado em {state.publication.platform}</strong> · {new Date(state.publication.published_at).toLocaleString("pt-BR")} ·{" "}
        <a href={state.publication.url} target="_blank" rel="noreferrer" className="underline">Abrir publicação</a>
      </p>
    ) : <form onSubmit={event => submit(event, "PUBLISH")} className="space-y-2">
      {!state.ready && <p className="text-xs text-zinc-600">Aprove os materiais atuais antes de registrar a publicação.</p>}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs">Plataforma<select className={input} name="platform">{publicationPlatforms.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="text-xs">Link publicado<input className={input} type="url" name="url" required /></label>
        <label className="text-xs">Data e hora efetivas<input className={input} type="datetime-local" name="publishedAt" required /></label>
        <label className="text-xs">Indicador principal<select className={input} name="primaryMetric">{Object.entries(performanceMetrics).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      </div>
      <button className={button} disabled={busy || !state.ready}>Registrar publicação</button>
    </form>)}
    {view === "derive" && state && <div className="space-y-3">
      {state.origin && <Link href={`/prompt-creator?contentId=${state.origin.id}`} className="text-xs underline">Pauta original · {state.origin.title}</Link>}
      {state.derivatives.length > 0 && <ul className="space-y-1 text-xs">{state.derivatives.map(piece => (
        <li key={piece.id}><Link href={`/prompt-creator?contentId=${piece.id}`} className="underline">{piece.title}</Link></li>
      ))}</ul>}
      <form onSubmit={event => submit(event, "DERIVE")} className="flex flex-wrap items-end gap-2">
        <label className="text-xs">Novo formato<select className={input} name="format">{socialFormats.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="text-xs">Data prevista<input className={input} type="date" name="date" /></label>
        <button className={button} disabled={busy}>Criar peça derivada</button>
      </form>
    </div>}
    {view === "results" && state && (state.publication ? (
      <div className="space-y-3">
        <p className="text-xs text-zinc-700">{state.publication.objective || "Objetivo editorial em aberto"} · Indicador: <strong>{performanceMetrics[state.publication.primary_metric]}</strong></p>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(performanceMetrics).map(([key, label]) => (
          <div key={key} className="rounded-lg bg-zinc-50 p-2 text-xs"><dt>{label}</dt><dd className="font-semibold">{state.totals[key as keyof typeof performanceMetrics].toLocaleString("pt-BR")}</dd></div>
        ))}</dl>
        {state.measurements.length > 0 && <ul className="text-xs text-zinc-600">{state.measurements.map(row => <li key={row.id}>{row.date_from.split("-").reverse().join("/")} a {row.date_to.split("-").reverse().join("/")} · {row.source}</li>)}</ul>}
        <form onSubmit={event => submit(event, "MEASURE")} className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-xs">Data inicial<input type="date" className={input} name="from" required /></label>
            <label className="text-xs">Data final<input type="date" className={input} name="to" required /></label>
            <label className="text-xs">Fonte da medição<input className={input} name="source" maxLength={300} required /></label>
            {Object.entries(performanceMetrics).map(([key, label]) => <label key={key} className="text-xs">{label}<input className={input} type="number" min="0" step="1" name={key} defaultValue="0" required /></label>)}
          </div>
          <button className={button} disabled={busy}>Registrar período</button>
        </form>
      </div>
    ) : <p className="text-xs text-zinc-600">Registre a publicação para acompanhar os resultados.</p>)}
  </section>;
}
