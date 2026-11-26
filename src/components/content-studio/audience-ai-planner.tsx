"use client";
import React, { useState, useEffect } from "react";
import { Sparkles, X } from "lucide-react";

interface Audience {
  name: string;
  description: string;
  painPoints: string[];
  desires: string[];
  objections: string[];
}

export function AudienceAiPlanner({
  clientId,
  onSaved,
  buttonClassName,
}: {
  clientId: string;
  onSaved: () => void;
  buttonClassName?: string;
}) {
  const [draft, setDraft] = useState<Audience[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  async function run(action: "GENERATE" | "SAVE") {
    setBusy(true);
    setError("");
    setOpen(true);
    if (action === "GENERATE") setDraft([]);
    try {
      const response = await fetch("/api/content-studio/audiences/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          action,
          audiences: action === "SAVE" ? draft : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success || (action === "GENERATE" && data.source !== "OPENROUTER")) {
        throw new Error(data.error || "Não foi possível gerar públicos");
      }
      if (action === "GENERATE") {
        setDraft(data.audiences);
      } else {
        setDraft([]);
        setOpen(false);
        onSaved();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erro ao gerar públicos");
    } finally {
      setBusy(false);
    }
  }

  const update = (index: number, field: keyof Audience, value: string) =>
    setDraft((current) =>
      current.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]:
                field === "name" || field === "description"
                  ? value
                  : value.split("\n").filter(Boolean),
            }
          : item
      )
    );

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => run("GENERATE")}
        className={
          buttonClassName ||
          "inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition disabled:opacity-50 cursor-pointer"
        }
      >
        <Sparkles className="h-3 w-3 text-emerald-600" />
        Sugerir públicos com IA
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/45 p-4"
          onClick={() => setOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Revisar públicos sugeridos"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Revisar públicos sugeridos pela IA
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Valide os públicos e hipóteses antes de salvar diretamente na base do cliente.
            </p>

            {busy && (
              <p className="text-xs text-emerald-600 font-medium">
                Gerando públicos com base no nicho e DNA do cliente...
              </p>
            )}

            {error && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {error}
              </p>
            )}

            {draft.map((item, index) => (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3" key={index}>
                {(
                  [
                    ["name", "Nome"],
                    ["description", "Descrição"],
                    ["painPoints", "Dores (uma por linha)"],
                    ["desires", "Desejos"],
                    ["objections", "Objeções"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block text-xs font-semibold text-zinc-700">
                    {label}
                    <textarea
                      rows={key === "name" ? 1 : 3}
                      className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white p-2 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={Array.isArray(item[key]) ? (item[key] as string[]).join("\n") : item[key]}
                      onChange={(e) => update(index, key, e.target.value)}
                    />
                  </label>
                ))}
                <button
                  type="button"
                  className="text-xs text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                  onClick={() => setDraft(draft.filter((_, i) => i !== index))}
                >
                  Remover sugestão
                </button>
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                disabled={busy || !draft.length}
                onClick={() => run("SAVE")}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-2xs transition disabled:opacity-50 cursor-pointer"
              >
                Salvar públicos revisados
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
