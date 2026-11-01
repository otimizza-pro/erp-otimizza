import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { Compass, BookOpen, FileText, ArrowRight, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Informações e Estratégia da Otimizza — Manual Vivo",
  description: "Manual vivo da estratégia e identidade da Otimizza ERP para alinhamento estratégico e IAs externas.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true
    }
  }
};

export default function PublicStrategyLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/estrategia-otimizza"
            className="flex items-center gap-2.5 font-bold text-lg text-slate-900 hover:text-indigo-600 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Compass className="w-5 h-5" />
            </div>
            <span>Estratégia Otimizza</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/estrategia-otimizza/completo"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
              title="Reúne todas as páginas publicadas em um único documento contínuo"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Leitura Completa</span>
              <span className="sm:hidden">Completo</span>
            </Link>

            <Link
              href="/estrategia-otimizza/contexto.md"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
              title="Versão em texto puro Markdown para copiar ou alimentar IAs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Markdown</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-600">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Documentação oficial de posicionamento, estratégia e diretrizes da Otimizza.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/estrategia-otimizza" className="hover:underline">Índice</Link>
            <Link href="/estrategia-otimizza/completo" className="hover:underline">Texto Consolidado</Link>
            <Link href="/estrategia-otimizza/contexto.md" className="hover:underline">contexto.md</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
