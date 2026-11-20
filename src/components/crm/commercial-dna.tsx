"use client";
import { useEffect, useRef, useState } from "react";
import { commercialDnaFields, emptyCommercialDna, type CommercialDna } from "@/modules/crm/commercial-dna-schema";

export function CommercialDnaFields({
  value,
  onChange,
  onBlur,
  showBusinessDescription = true,
  audiences = [],
  onScrollToAudiences,
}: {
  value: CommercialDna;
  onChange: (value: CommercialDna) => void;
  onBlur?: () => void;
  showBusinessDescription?: boolean;
  audiences?: string[];
  onScrollToAudiences?: () => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {commercialDnaFields
        .filter(field => showBusinessDescription || field.key !== "businessDescription")
        .map(field => (
          <div key={field.key} className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700 block">
              {field.label}
              {"required" in field && field.required && (
                <span className="ml-1 text-amber-700">(para gerar com IA)</span>
              )}
            </label>
            <textarea
              rows={5}
              value={value[field.key]}
              onChange={event => onChange({ ...value, [field.key]: event.target.value })}
              onBlur={onBlur}
              placeholder={field.placeholder}
              className="mt-1 block w-full min-h-[120px] resize-y rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-xs font-normal leading-relaxed text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {field.key === "idealCustomer" && (
              <div className="pt-1">
                {audiences && audiences.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-zinc-500 font-medium">Públicos cadastrados:</span>
                    {audiences.map(aud => {
                      const isIncluded = (value.idealCustomer || "").toLowerCase().includes(aud.toLowerCase());
                      return (
                        <button
                          key={aud}
                          type="button"
                          onClick={() => {
                            if (isIncluded) return;
                            const current = (value.idealCustomer || "").trim();
                            const separator = current ? (current.endsWith(",") ? " " : ", ") : "";
                            onChange({ ...value, idealCustomer: `${current}${separator}${aud}` });
                            onBlur?.();
                          }}
                          title={isIncluded ? "Público já citado" : "Clique para incluir no campo"}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition cursor-pointer border ${
                            isIncluded
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200"
                          }`}
                        >
                          {isIncluded ? "✓ " : "+ "}
                          {aud}
                        </button>
                      );
                    })}
                    {onScrollToAudiences && (
                      <button
                        type="button"
                        onClick={onScrollToAudiences}
                        className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 underline ml-1 cursor-pointer"
                      >
                        Gerenciar públicos ↓
                      </button>
                    )}
                  </div>
                ) : (
                  onScrollToAudiences && (
                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>Atende múltiplos públicos?</span>
                      <button
                        type="button"
                        onClick={onScrollToAudiences}
                        className="font-semibold text-purple-600 hover:text-purple-800 underline cursor-pointer"
                      >
                        Cadastrar públicos segmentados com IA ↓
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

export function CommercialDnaPanel({
  leadId,
  clientId,
  onReady,
  onSaved,
  showBusinessDescription = true,
  showProposalTexts = true,
  audiences = [],
  onScrollToAudiences,
}: {
  leadId?: string;
  clientId?: string;
  onReady?: (ready: boolean) => void;
  onSaved?: () => void;
  showBusinessDescription?: boolean;
  showProposalTexts?: boolean;
  audiences?: string[];
  onScrollToAudiences?: () => void;
}) {
  const [dna, setDna] = useState<CommercialDna>(emptyCommercialDna);
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const [autoSavedTime, setAutoSavedTime] = useState<string | null>(null);
  const [proposalTexts, setProposalTexts] = useState<Record<string,string> | null>(null);
  const callbacks = useRef({ onReady, onSaved });
  useEffect(() => { callbacks.current = { onReady, onSaved }; }, [onReady,onSaved]);
  
  const dirtyRef = useRef(dirty);
  const dnaRef = useRef(dna);
  useEffect(() => {
    dirtyRef.current = dirty;
    dnaRef.current = dna;
  }, [dirty, dna]);

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

  async function save(silent = false) {
    setSaving(true);
    if (!silent) {
      setError("");
      setMessage("");
    }
    try {
      const currentDna = dnaRef.current;
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...currentDna,
          businessDescription: showBusinessDescription ? currentDna.businessDescription : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar o DNA.");
      setDna(data.dna);
      setMissing(data.missing);
      setDirty(false);
      const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      setAutoSavedTime(time);
      callbacks.current.onReady?.(data.missing.length === 0);
      callbacks.current.onSaved?.();
      setMessage(silent ? `✓ Salvo automaticamente às ${time}` : "DNA salvo e disponível no cadastro e nas próximas gerações da proposta.");
    } catch (error) {
      if (!silent) setError(error instanceof Error ? error.message : "Falha ao salvar DNA.");
    } finally {
      setSaving(false);
    }
  }

  const handleFieldBlur = () => {
    if (dirtyRef.current && !saving) {
      void save(true);
    }
  };

  return <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
      <div>
        <h2 className="text-sm font-bold text-zinc-900">DNA comercial inicial</h2>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          Preencha desde o primeiro contato. As alterações são salvas automaticamente ao clicar fora dos campos.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {saving && (
          <span className="text-xs text-purple-600 font-medium animate-pulse flex items-center gap-1">
            Salvando...
          </span>
        )}
        {!saving && autoSavedTime && (
          <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            ✓ Salvo {autoSavedTime}
          </span>
        )}
      </div>
    </header>
    {loading ? <p role="status" className="text-xs text-zinc-500">Carregando DNA...</p> : <fieldset disabled={saving || Boolean(error && !dirty)} className="disabled:opacity-70"><CommercialDnaFields value={dna} showBusinessDescription={showBusinessDescription} audiences={audiences} onScrollToAudiences={onScrollToAudiences} onBlur={handleFieldBlur} onChange={value => { setDna(value); setDirty(true); setMessage(""); callbacks.current.onReady?.(false); }} /></fieldset>}
    {!loading && missing.length > 0 && <p className="text-xs text-amber-800">Para gerar foco e indicadores com IA, preencha: {missing.join("; ")}.</p>}
    {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    {error && !dirty && <button type="button" onClick={() => setReload(value => value + 1)} className="text-xs font-semibold underline">Recarregar DNA</button>}
    {message && !autoSavedTime && <p role="status" className="text-xs text-emerald-700">{message}</p>}
    {showProposalTexts && proposalTexts && <details className="rounded-xl border border-zinc-200 p-3 text-xs"><summary className="cursor-pointer font-semibold">Textos salvos para a próxima proposta</summary><dl className="mt-3 space-y-3">{[["currentScenario","Cenário e desafios"],["partnershipFocus","Foco da parceria"],["trackingMetrics","Métricas e indicadores"]].map(([key,label]) => <div key={key}><dt className="font-semibold">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-zinc-600">{proposalTexts[key] || "Não preenchido"}</dd></div>)}</dl></details>}
    <div className="flex items-center justify-between pt-2">
      <span className="text-[11px] text-zinc-400">
        💡 Salvamento automático ativo ao sair de qualquer campo.
      </span>
      <button type="button" onClick={() => save(false)} disabled={loading || saving || !dirty} className="rounded-xl bg-zinc-900 hover:bg-zinc-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 transition cursor-pointer">
        {saving ? "Salvando DNA..." : "Salvar DNA comercial"}
      </button>
    </div>
  </section>;
}
