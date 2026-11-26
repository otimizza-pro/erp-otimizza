"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  Square,
  Clock,
  Trash2,
  X,
  Plus,
  RefreshCw,
} from "lucide-react";
import { ProjectTaskRecord } from "@/modules/projects/types";

export interface ActiveTimerRecord {
  id: string;
  projectId: string;
  taskId?: string | null;
  taskTitle?: string | null;
  description: string;
  startedAt: string;
  lastStartedAt: string;
  accumulatedSeconds: number;
  isRunning: boolean;
  hourlyRate: number;
  currentSeconds: number;
}

export function formatTimerSeconds(totalSeconds: number): string {
  const safeSec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safeSec / 3600);
  const m = Math.floor((safeSec % 3600) / 60);
  const s = safeSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

// ----------------------------------------------------------------------
// 1. Badge / Controle de Cronômetro no Card da Tarefa do Kanban
// ----------------------------------------------------------------------
export function TaskCardTimer({
  task,
  activeTimers,
  onStart,
  onPause,
  onResume,
  onOpenStop,
}: {
  task: ProjectTaskRecord;
  activeTimers: ActiveTimerRecord[];
  onStart: (taskId: string, title: string) => void;
  onPause: (timerId: string) => void;
  onResume: (timerId: string) => void;
  onOpenStop: (timer: ActiveTimerRecord) => void;
}) {
  const taskTimer = activeTimers.find((timer) => timer.taskId === task.id);

  if (taskTimer) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={`mt-2 p-1.5 rounded-lg border flex items-center justify-between gap-1 text-xs shadow-2xs transition ${
          taskTimer.isRunning
            ? "bg-emerald-50/90 border-emerald-300 text-emerald-950"
            : "bg-amber-50/90 border-amber-300 text-amber-950"
        }`}
      >
        <div className="flex items-center gap-1.5 font-mono font-bold text-[11px] tabular-nums">
          <span className="relative flex h-2 w-2">
            {taskTimer.isRunning && (
              <span className=" absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                taskTimer.isRunning ? "bg-emerald-600" : "bg-amber-500"
              }`}
            ></span>
          </span>
          <span>{formatTimerSeconds(taskTimer.currentSeconds)}</span>
        </div>

        <div className="flex items-center gap-1">
          {taskTimer.isRunning ? (
            <button
              type="button"
              onClick={() => onPause(taskTimer.id)}
              title="Pausar cronômetro"
              className="p-1 rounded hover:bg-emerald-200/60 text-emerald-800 transition cursor-pointer"
            >
              <Pause className="w-3 h-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onResume(taskTimer.id)}
              title="Retomar cronômetro"
              className="p-1 rounded hover:bg-amber-200/60 text-amber-800 transition cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenStop(taskTimer)}
            title="Finalizar apontamento"
            className="px-2 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-bold hover:bg-emerald-800 transition shadow-2xs cursor-pointer"
          >
            Finalizar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mt-1.5 pt-1 border-t border-slate-100 flex items-center justify-end"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => onStart(task.id, task.title)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-0.5 rounded transition cursor-pointer"
        title="Iniciar cronômetro para esta tarefa"
      >
        <Play className="w-3 h-3 text-emerald-600 fill-current" />
        Iniciar Tempo
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. Indicador de Cronômetro no Header do Projeto
// ----------------------------------------------------------------------
export function ProjectActiveTimerHeaderPill({
  activeTimers,
  onPause,
  onResume,
  onOpenStop,
  onOpenStart,
}: {
  activeTimers: ActiveTimerRecord[];
  onPause: (timerId: string) => void;
  onResume: (timerId: string) => void;
  onOpenStop: (timer: ActiveTimerRecord) => void;
  onOpenStart: () => void;
}) {
  if (activeTimers.length === 0) {
    return (
      <button
        type="button"
        onClick={onOpenStart}
        className="inline-flex items-center gap-1.5 px-3 py-2 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 shadow-2xs transition cursor-pointer"
        title="Iniciar cronômetro de tempo real"
      >
        <Play className="w-3.5 h-3.5 text-emerald-700 fill-current" />
        Iniciar Cronômetro
      </button>
    );
  }

  const primaryTimer = activeTimers[0];

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 shadow-2xs">
      <span className="relative flex h-2.5 w-2.5">
        {primaryTimer.isRunning && (
          <span className=" absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        <span
          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
            primaryTimer.isRunning ? "bg-emerald-600" : "bg-amber-500"
          }`}
        ></span>
      </span>
      <span className="font-mono font-bold text-xs tabular-nums">
        {formatTimerSeconds(primaryTimer.currentSeconds)}
      </span>
      <span className="text-xs font-semibold truncate max-w-[120px] sm:max-w-[160px]">
        {primaryTimer.taskTitle || primaryTimer.description || "Em andamento"}
      </span>

      {primaryTimer.isRunning ? (
        <button
          type="button"
          onClick={() => onPause(primaryTimer.id)}
          title="Pausar cronômetro"
          className="p-1 rounded hover:bg-emerald-200/70 text-emerald-800 transition cursor-pointer"
        >
          <Pause className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onResume(primaryTimer.id)}
          title="Retomar cronômetro"
          className="p-1 rounded hover:bg-emerald-200/70 text-emerald-800 transition cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
        </button>
      )}

      <button
        type="button"
        onClick={() => onOpenStop(primaryTimer)}
        title="Finalizar e gravar horas"
        className="px-2 py-0.5 rounded bg-emerald-700 text-white text-[11px] font-bold hover:bg-emerald-800 transition shadow-2xs cursor-pointer"
      >
        Finalizar
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------
// 3. Widget de Cronômetro no Topo da Aba "Apontamento de Horas"
// ----------------------------------------------------------------------
export function ProjectTimesTabWidget({
  activeTimers,
  onPause,
  onResume,
  onOpenStop,
  onDiscard,
  onOpenStart,
}: {
  activeTimers: ActiveTimerRecord[];
  onPause: (timerId: string) => void;
  onResume: (timerId: string) => void;
  onOpenStop: (timer: ActiveTimerRecord) => void;
  onDiscard: (timerId: string) => void;
  onOpenStart: () => void;
}) {
  return (
    <div className="p-4 bg-slate-50/80 border-b border-slate-200">
      {activeTimers.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              Cronômetro(s) em Andamento
            </span>
            <span className="text-[11px] text-slate-500">
              O tempo continua rodando mesmo se você fechar ou recarregar a tela.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeTimers.map((timer) => (
              <div
                key={timer.id}
                className={`p-4 rounded-xl border transition shadow-xs flex flex-col justify-between gap-3 ${
                  timer.isRunning
                    ? "bg-white border-emerald-400 ring-2 ring-emerald-500/20"
                    : "bg-white border-amber-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        timer.isRunning
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          timer.isRunning ? "bg-emerald-600" : "bg-amber-600"
                        }`}
                      />
                      {timer.isRunning ? "Em Execução" : "Pausado"}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">
                      {timer.taskTitle || timer.description || "Atividade no Projeto"}
                    </h4>
                    {timer.taskTitle && timer.description && timer.description !== timer.taskTitle && (
                      <p className="text-xs text-slate-500 mt-0.5">{timer.description}</p>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-mono font-semibold text-slate-900 block tabular-nums">
                      {formatTimerSeconds(timer.currentSeconds)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ≈ {(timer.currentSeconds / 3600).toFixed(2)}h
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onDiscard(timer.id)}
                    className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Descartar
                  </button>

                  <div className="flex items-center gap-2">
                    {timer.isRunning ? (
                      <button
                        type="button"
                        onClick={() => onPause(timer.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs cursor-pointer"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        Pausar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onResume(timer.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold shadow-2xs cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Retomar
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenStop(timer)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      Finalizar & Gravar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-dashed border-slate-300">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">Nenhum cronômetro rodando agora</span>
              <span className="text-[11px] text-slate-500">Inicie um cronômetro para medir o tempo exato das suas entregas.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenStart}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Iniciar Cronômetro
          </button>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// 4. Modal para Iniciar Cronômetro (Escolha de Tarefa / Descrição)
// ----------------------------------------------------------------------
export function StartTimerModal({
  isOpen,
  onClose,
  tasks,
  onStart,
}: {
  isOpen: boolean;
  onClose: () => void;
  tasks: ProjectTaskRecord[];
  onStart: (taskId?: string, description?: string) => Promise<void>;
}) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onStart(selectedTaskId || undefined, description.trim() || undefined);
      onClose();
      setSelectedTaskId("");
      setDescription("");
    } catch {
      // erro tratado no caller
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/45 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Iniciar Cronômetro</h3>
              <p className="text-xs text-slate-500">O tempo começará a contar em tempo real.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vincular a uma Tarefa (Opcional):
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => {
                setSelectedTaskId(e.target.value);
                const t = tasks.find((task) => task.id === e.target.value);
                if (t && !description) {
                  setDescription(t.title);
                }
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Atividade Geral do Projeto (sem tarefa específica)</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.taskNumber ? `${t.taskNumber} • ` : ""}{t.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              O que você vai fazer agora? (Descrição):
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Alinhamento de briefing, revisão de criativos..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Começar a Contar Tempo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 5. Modal para Finalizar Cronômetro (Confirmação & Gravação de Horas)
// ----------------------------------------------------------------------
export function StopTimerModal({
  timer,
  onClose,
  onConfirmStop,
  onDiscard,
}: {
  timer: ActiveTimerRecord | null;
  onClose: () => void;
  onConfirmStop: (timer: ActiveTimerRecord, finalDescription: string) => Promise<void>;
  onDiscard: (timerId: string) => Promise<void>;
}) {
  const [desc, setDesc] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    if (timer) {
      setDesc(timer.description || timer.taskTitle || "Atividade no projeto");
    }
  }, [timer]);

  if (!timer) return null;

  const hoursDecimal = Math.max(0.02, Math.round((timer.currentSeconds / 3600) * 100) / 100);

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirmStop(timer, desc);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/45 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Square className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Finalizar Apontamento de Horas</h3>
              <p className="text-xs text-slate-500">Revise o tempo antes de salvar no projeto.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleFinish} className="p-5 space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tempo Percorrido
            </span>
            <div className="text-3xl font-mono font-semibold text-slate-900 tabular-nums">
              {formatTimerSeconds(timer.currentSeconds)}
            </div>
            <p className="text-xs font-semibold text-emerald-700">
              Registrará <strong>{hoursDecimal} horas</strong> no projeto
            </p>
          </div>

          {timer.taskTitle && (
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Tarefa vinculada:</span>
              <p className="text-xs font-bold text-slate-800">{timer.taskTitle}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descrição da Atividade Realizada:
            </label>
            <textarea
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="O que foi executado durante esse tempo..."
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={async () => {
                await onDiscard(timer.id);
                onClose();
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Descartar Tempo
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Continuar Rodando
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Square className="w-3 h-3 fill-current" />
                    Gravar Horas
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
