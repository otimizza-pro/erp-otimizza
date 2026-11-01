"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function KnowledgeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[KNOWLEDGE PAGE ERROR]:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">
        Não foi possível carregar a documentação estratégica
      </h2>

      <p className="text-sm text-slate-600 max-w-md mb-4">
        {error.message || "Ocorreu uma instabilidade temporária ao consultar os dados publicados."}
      </p>

      {error.digest && (
        <p className="text-xs font-mono text-slate-400 mb-6 bg-slate-100 px-3 py-1 rounded">
          Código de referência: {error.digest}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Tentar novamente</span>
        </button>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Página inicial</span>
        </Link>
      </div>
    </div>
  );
}
