"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Utilitário global exportado para chamadas imperativas em qualquer componente
export const toast = {
  success: (title: string, message?: string, duration = 4000) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("otimizza-toast", {
          detail: { type: "success", title, message, duration },
        })
      );
    }
  },
  error: (title: string, message?: string, duration = 6000) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("otimizza-toast", {
          detail: { type: "error", title, message, duration },
        })
      );
    }
  },
  warning: (title: string, message?: string, duration = 5000) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("otimizza-toast", {
          detail: { type: "warning", title, message, duration },
        })
      );
    }
  },
  info: (title: string, message?: string, duration = 4000) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("otimizza-toast", {
          detail: { type: "info", title, message, duration },
        })
      );
    }
  },
};

export function ToastProvider({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // mantém no máximo 5 na tela

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  useEffect(() => {
    const handleCustomToast = (e: Event) => {
      const customEvent = e as CustomEvent<Omit<ToastItem, "id">>;
      if (customEvent.detail && customEvent.detail.title) {
        showToast(customEvent.detail);
      }
    };

    window.addEventListener("otimizza-toast", handleCustomToast);
    return () => {
      window.removeEventListener("otimizza-toast", handleCustomToast);
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Container Flutuante de Notificações / Toasts (Unslop & Otimizza Identity) */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-5 right-5 z-[130] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((item) => {
          const isSuccess = item.type === "success";
          const isError = item.type === "error";
          const isWarning = item.type === "warning";

          return (
            <div
              key={item.id}
              role="alert"
              className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-zinc-200/90 shadow-xl transition-all duration-200 ease-out animate-in slide-in-from-top-2 fade-in"
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
                  isSuccess
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : isError
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : isWarning
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
              >
                {isSuccess && <CheckCircle2 className="w-4 h-4" />}
                {isError && <AlertCircle className="w-4 h-4" />}
                {isWarning && <AlertTriangle className="w-4 h-4" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4" />}
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <h5 className="text-xs font-bold text-zinc-950 leading-tight">{item.title}</h5>
                {item.message && (
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed break-words">
                    {item.message}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg transition shrink-0 cursor-pointer"
                title="Fechar notificação"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: toast.info,
      removeToast: () => {},
    };
  }
  return context;
}
