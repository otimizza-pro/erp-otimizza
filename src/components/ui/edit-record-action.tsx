"use client";
import { useEffect, useState } from "react";
import { readJsonResponse } from "@/lib/http/read-json-response";

interface Field {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "datetime-local";
  required?: boolean;
  maxLength?: number;
}

export function EditRecordAction({
  url,
  label,
  data,
  fields,
  onSaved,
}: {
  url: string;
  label: string;
  data: Record<string, unknown>;
  fields: Field[];
  onSaved: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy]);

  function edit() {
    const values: Record<string, string> = {};
    for (const field of fields) {
      let value = String(data[field.key] ?? "");
      if (field.type === "date") value = value.slice(0, 10);
      if (field.type === "datetime-local" && value) {
        const date = new Date(value);
        value = Number.isNaN(date.getTime())
          ? ""
          : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      }
      values[field.key] = value;
    }
    setDraft(values);
    setError("");
    setOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = Object.fromEntries(
        fields.map((field) => {
          const value = draft[field.key] || "";
          return [
            field.key,
            field.type === "number"
              ? Number(value)
              : field.type === "datetime-local"
              ? value
                ? new Date(value).toISOString()
                : null
              : field.type === "date"
              ? value || null
              : value,
          ];
        })
      );
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "A edição não foi confirmada.");
      try {
        await onSaved();
        setOpen(false);
      } catch {
        setError("A edição foi salva, mas a tela não pôde ser atualizada. Recarregue antes de repetir a operação.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível editar.");
    } finally {
      setBusy(false);
    }
  }

  const control = "mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none";

  return (
    <>
      <button
        type="button"
        onClick={edit}
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
      >
        Editar
      </button>
      {open && (
        <div
          onClick={() => !busy && setOpen(false)}
          className="fixed inset-0 z-[75] flex items-center justify-center bg-zinc-950/45 p-4"
        >
          <form
            onSubmit={save}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={"Editar " + label}
            className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-xl"
          >
            <h2 className="text-base font-semibold text-zinc-950">Editar {label}</h2>
            {fields.map((field) => (
              <label key={field.key} className="block text-xs font-medium text-zinc-600">
                {field.label}
                {field.type === "textarea" ? (
                  <textarea
                    className={control}
                    disabled={busy}
                    required={field.required}
                    maxLength={field.maxLength || 6000}
                    value={draft[field.key] || ""}
                    onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
                  />
                ) : (
                  <input
                    className={control}
                    disabled={busy}
                    required={field.required}
                    maxLength={field.maxLength || 200}
                    min={field.type === "number" ? 0 : undefined}
                    step={field.type === "number" ? "0.01" : undefined}
                    type={field.type || "text"}
                    value={draft[field.key] || ""}
                    onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
                  />
                )}
              </label>
            ))}
            {error && (
              <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </p>
            )}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={busy}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {busy ? "Salvando..." : "Salvar edição"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
