"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

const confirmListeners = new Set<(req: PendingConfirm) => void>();

/**
 * Prompts the user with a consistent in-app confirmation modal instead of window.confirm.
 * Falls back safely to window.confirm only if no provider is mounted.
 */
export function confirmAction(options: ConfirmOptions | string): Promise<boolean> {
  const normalized: ConfirmOptions =
    typeof options === "string"
      ? {
          title: "Confirmar ação",
          message: options,
          confirmLabel: "Confirmar",
          cancelLabel: "Cancelar",
          tone: "default",
        }
      : options;

  if (typeof window === "undefined" || confirmListeners.size === 0) {
    return Promise.resolve(
      typeof window !== "undefined" ? window.confirm(normalized.message) : false
    );
  }

  return new Promise<boolean>((resolve) => {
    const firstListener = confirmListeners.values().next().value;
    if (firstListener) {
      firstListener({ ...normalized, resolve });
    } else {
      resolve(false);
    }
  });
}

export function ConfirmProvider({ children }: { children?: React.ReactNode }) {
  const [queue, setQueue] = useState<PendingConfirm[]>([]);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (req: PendingConfirm) => {
      setQueue((prev) => [...prev, req]);
    };
    confirmListeners.add(handler);
    return () => {
      confirmListeners.delete(handler);
    };
  }, []);

  const current = queue[0] ?? null;

  const finish = useCallback((accepted: boolean) => {
    setQueue((prev) => {
      const [head, ...rest] = prev;
      head?.resolve(accepted);
      return rest;
    });
  }, []);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => confirmBtnRef.current?.focus(), 20);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [current, finish]);

  return (
    <>
      {children}
      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          onClick={() => finish(false)}
          className="fixed inset-0 z-[140] flex items-center justify-center bg-zinc-950/45 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    current.tone === "danger"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-zinc-200 bg-zinc-50 text-zinc-700"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 id="confirm-dialog-title" className="text-sm font-semibold text-zinc-950">
                    {current.title}
                  </h3>
                  <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-zinc-600">
                    {current.message}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => finish(false)}
                aria-label="Fechar confirmação"
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => finish(false)}
                className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                {current.cancelLabel || "Cancelar"}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={() => finish(true)}
                className={`rounded-lg px-3.5 py-2 text-xs font-medium text-white transition-colors cursor-pointer ${
                  current.tone === "danger"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-zinc-900 hover:bg-zinc-800"
                }`}
              >
                {current.confirmLabel || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
