"use client";

import React, { useEffect, useState } from "react";
import { X, CalendarClock, Loader2 } from "lucide-react";
import {
  inferChecklistProductionDefaults,
  PRODUCTION_TASK_TYPE_LABELS,
} from "@/modules/production-tasks/helpers";
import type { ProductionTaskRecord, ProductionTaskType } from "@/modules/production-tasks/types";
import { toast } from "@/components/ui/toast-provider";

export interface QuickChecklistContext {
  checklistId: string;
  checklistTitle: string;
  projectId: string;
  projectName: string;
  clientId: string | null;
  clientName?: string | null;
  projectTaskId: string;
  projectTaskNumber?: string;
  projectTaskTitle?: string;
  projectTaskDueDate?: string | null;
}

interface QuickProductionTaskModalProps {
  context: QuickChecklistContext | null;
  onClose: () => void;
  onCreated: (task: ProductionTaskRecord) => void;
}

export function QuickProductionTaskModal({
  context,
  onClose,
  onCreated,
}: QuickProductionTaskModalProps) {
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState<ProductionTaskType>("OTHER");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!context) return;
    const inferred = inferChecklistProductionDefaults(
      context.checklistTitle,
      context.projectTaskDueDate,
    );
    setTitle(context.checklistTitle);
    setTaskType(inferred.taskType);
    setDueDate(inferred.dueDate || "");
    setDescription("");
  }, [context]);

  if (!context) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/production-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: context.clientId || null,
          projectId: context.projectId,
          projectTaskId: context.projectTaskId,
          checklistItemId: context.checklistId,
          taskType,
          title: title.trim(),
          description: description.trim() || null,
          dueDate: dueDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Não foi possível criar a tarefa de produção.");
      }
      toast.success("Tarefa de Produção criada e vinculada ao checklist!");
      onCreated(json.item as ProductionTaskRecord);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar tarefa de produção.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CalendarClock className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-zinc-950">Nova Tarefa de Produção</h3>
              <p className="text-[11px] text-zinc-500">
                Vinculada ao checklist de {context.projectName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-600 space-y-0.5">
          {context.clientName && (
            <p>
              <strong className="text-zinc-800">Cliente:</strong> {context.clientName}
            </p>
          )}
          <p>
            <strong className="text-zinc-800">Tarefa:</strong>{" "}
            {context.projectTaskNumber ? `${context.projectTaskNumber} · ` : ""}
            {context.projectTaskTitle || "Tarefa do Projeto"}
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-zinc-700">
            Título da Tarefa de Produção *
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-zinc-700">
              Tipo
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as ProductionTaskType)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900"
              >
                {Object.entries(PRODUCTION_TASK_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold text-zinc-700">
              Data Prevista
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900"
              />
            </label>
          </div>

          <label className="block text-xs font-semibold text-zinc-700">
            Observações (Opcional)
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes de gravação, pauta, local ou responsável..."
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Criando..." : "Criar Tarefa de Produção"}
          </button>
        </div>
      </form>
    </div>
  );
}
