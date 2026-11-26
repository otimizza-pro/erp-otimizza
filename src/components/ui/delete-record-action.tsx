"use client";
import { useState } from "react";
import { readJsonResponse } from "@/lib/http/read-json-response";
import { confirmAction } from "@/components/ui/confirm-dialog";

export function DeleteRecordAction({ url, label, onDeleted }: { url: string; label: string; onDeleted: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleted, setDeleted] = useState(false);

  async function remove() {
    const ok = await confirmAction({
      title: `Excluir ${label}`,
      message: `Excluir permanentemente ${label}? Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(url, { method: "DELETE" });
      const data = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "A exclusão não foi confirmada.");
      setDeleted(true);
      try {
        await onDeleted();
      } catch {
        setError("Registro excluído. Recarregue a lista para atualizar a tela.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível excluir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex max-w-sm flex-col gap-1">
      <button
        type="button"
        disabled={busy || deleted}
        onClick={remove}
        className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition-colors cursor-pointer"
      >
        {busy ? "Excluindo..." : deleted ? "Excluído" : "Excluir"}
      </button>
      {error && (
        <span role="alert" className="whitespace-normal text-xs text-rose-700">
          {error}
        </span>
      )}
    </span>
  );
}
