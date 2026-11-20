"use client";

import { useEffect, useRef, useState } from "react";
import type { ProductionChecklist as Checklist } from "@/modules/clients/production-checklist";

export function ProductionChecklist({ clientId, contentId }: { clientId: string; contentId: string }) {
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const savingRef = useRef(false);
  const request = useRef<AbortController | null>(null);
  const url = `/api/content-studio/posts/${contentId}/checklist`;

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    fetch(url + "?" + new URLSearchParams({ clientId }), { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível carregar o checklist.");
        if (!controller.signal.aborted) {
          setChecklist(data);
          setError("");
        }
      })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [url, clientId, attempt]);

  async function toggle(itemKey: string, completed: boolean) {
    const signal = request.current?.signal;
    if (!checklist?.formatKey || savingRef.current || !signal || signal.aborted) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, formatKey: checklist.formatKey, itemKey, completed }),
        signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar o checklist.");
      if (!signal.aborted) setChecklist(data);
    } catch (err) {
      if (!signal.aborted) setError(err instanceof Error ? err.message : "Não foi possível salvar o checklist.");
    } finally {
      savingRef.current = false;
      if (!signal.aborted) setSaving(false);
    }
  }

  if (checklist && !checklist.formatKey) return null;
  const items = checklist?.items || [];
  const next = items.find(item => !item.completed);
  const completed = items.filter(item => item.completed).length;
  return (
    <section aria-label="Checklist de produção" className="space-y-2 rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <details open>
        <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
          Checklist de produção{checklist && ` · ${completed}/${items.length}`}
        </summary>
        {!checklist && !error && <p role="status" className="mt-2 text-xs text-zinc-600">Carregando checklist…</p>}
        {checklist && (
          <>
            <p aria-live="polite" className="mt-2 text-xs font-medium text-zinc-700">
              {next ? `Próximo item: ${next.label}` : "Produção concluída"}
            </p>
            <fieldset aria-label="Itens de produção" disabled={saving} className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {items.map(item => (
                <label key={item.key} className="inline-flex items-center gap-2 text-xs text-zinc-700">
                  <input type="checkbox" checked={item.completed} onChange={event => { void toggle(item.key, event.target.checked); }}
                    className="h-4 w-4 accent-emerald-700" />
                  {item.label}
                </label>
              ))}
            </fieldset>
          </>
        )}
      </details>
      {error && <p role="alert" className="text-xs text-rose-700">{error}{" "}
        <button type="button" className="font-semibold underline" onClick={() => { setError(""); setAttempt(value => value + 1); }}>
          Recarregar
        </button>
      </p>}
    </section>
  );
}
