"use client";
import { useEffect, useRef, useState } from "react";
import { commercialDnaFields, emptyCommercialDna, type CommercialDna } from "@/modules/crm/commercial-dna-schema";

export function CommercialDnaFields({ value, onChange, showBusinessDescription = true }: { value: CommercialDna; onChange: (value: CommercialDna) => void; showBusinessDescription?: boolean }) {
  return <div className="grid gap-4 sm:grid-cols-2">{commercialDnaFields.filter(field => showBusinessDescription || field.key !== "businessDescription").map(field => <label key={field.key} className="text-xs font-semibold text-zinc-700">{field.label}{"required" in field && field.required && <span className="ml-1 text-amber-700">(para gerar com IA)</span>}<textarea rows={3} value={value[field.key]} onChange={event => onChange({ ...value, [field.key]: event.target.value })} placeholder={field.placeholder} className="mt-1.5 block w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-normal text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" /></label>)}</div>;
}

export function CommercialDnaPanel({ leadId, clientId, onReady, onSaved, showBusinessDescription = true, showProposalTexts = true }: { leadId?: string; clientId?: string; onReady?: (ready: boolean) => void; onSaved?: () => void; showBusinessDescription?: boolean; showProposalTexts?: boolean }) {
  const [dna, setDna] = useState<CommercialDna>(emptyCommercialDna);
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const [proposalTexts, setProposalTexts] = useState<Record<string,string> | null>(null);
  const callbacks = useRef({ onReady, onSaved });
  useEffect(() => { callbacks.current = { onReady, onSaved }; }, [onReady,onSaved]);
  const url = leadId ? `/api/crm/leads/${leadId}/dna` : `/api/clients/${clientId}/commercial-dna`;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setMessage(""); setDirty(false); setDna(emptyCommercialDna);
    callbacks.current.onReady?.(false);
    fetch(url, { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar o DNA comercial.");
      if (controller.signal.aborted) return;
      setDna(data.dna); setMissing(data.missing); setProposalTexts(data.proposalTextDraft || null); callbacks.current.onReady?.(data.missing.length === 0);
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [url, reload]);
  async function save() {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...dna, businessDescription: showBusinessDescription ? dna.businessDescription : undefined }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar o DNA.");
      setDna(data.dna); setMissing(data.missing); setDirty(false);
      callbacks.current.onReady?.(data.missing.length === 0); callbacks.current.onSaved?.();
      setMessage("DNA salvo e disponível no cadastro e nas próximas gerações da proposta.");
    } catch (error) { setError(error instanceof Error ? error.message : "Falha ao salvar DNA."); }
    finally { setSaving(false); }
  }
  return <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
    <header><h2 className="text-sm font-bold text-zinc-900">DNA comercial inicial</h2><p className="mt-1 text-xs leading-relaxed text-zinc-500">Preencha desde o primeiro contato. Estes dados são compartilhados entre o cadastro, a proposta e o DNA do cliente após a conversão. Não é necessário criar uma oportunidade.</p></header>
    {loading ? <p role="status" className="text-xs text-zinc-500">Carregando DNA...</p> : <fieldset disabled={saving || Boolean(error && !dirty)} className="disabled:opacity-70"><CommercialDnaFields value={dna} showBusinessDescription={showBusinessDescription} onChange={value => { setDna(value); setDirty(true); setMessage(""); callbacks.current.onReady?.(false); }} /></fieldset>}
    {!loading && missing.length > 0 && <p className="text-xs text-amber-800">Para gerar foco e indicadores com IA, preencha: {missing.join("; ")}.</p>}
    {dirty && <p className="text-xs text-amber-800">Salve as alterações do DNA antes de gerar os textos da proposta.</p>}
    {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    {error && !dirty && <button type="button" onClick={() => setReload(value => value + 1)} className="text-xs font-semibold underline">Recarregar DNA</button>}
    {message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
    {showProposalTexts && proposalTexts && <details className="rounded-xl border border-zinc-200 p-3 text-xs"><summary className="cursor-pointer font-semibold">Textos salvos para a próxima proposta</summary><dl className="mt-3 space-y-3">{[["currentScenario","Cenário e desafios"],["partnershipFocus","Foco da parceria"],["trackingMetrics","Métricas e indicadores"]].map(([key,label]) => <div key={key}><dt className="font-semibold">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-zinc-600">{proposalTexts[key] || "Não preenchido"}</dd></div>)}</dl></details>}
    <button type="button" onClick={save} disabled={loading || saving || !dirty} className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Salvando DNA..." : "Salvar DNA comercial"}</button>
  </section>;
}
