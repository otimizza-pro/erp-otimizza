import React from "react";
import Link from "next/link";
import { getConsolidatedDocument } from "@/modules/knowledge/service";
import { Compass, BookOpen, FileText, Search, Tag, Calendar, ChevronRight, Share2, Sparkles, AlertCircle } from "lucide-react";
import { PublicKnowledgeClient } from "./client-view";

export const dynamic = "force-dynamic";

export default async function StrategyIndexPage() {
  const doc = await getConsolidatedDocument();

  return (
    <div className="space-y-8">
      {/* Banner Principal com Aviso de Leitura para IA */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Informações e Estratégia da Otimizza
              </h1>
              <p className="text-xs text-slate-500">
                Manual vivo de posicionamento, diretrizes, modelo de negócio e identidade.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/estrategia-otimizza/completo"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <BookOpen className="w-4 h-4" />
              <span>Leitura Completa para IA</span>
            </Link>

            <Link
              href="/estrategia-otimizza/contexto.md"
              target="_blank"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              <FileText className="w-4 h-4" />
              <span>contexto.md</span>
            </Link>
          </div>
        </div>

        <p className="text-sm text-slate-600 max-w-3xl leading-relaxed mb-6">
          Esta documentação reúne as diretrizes oficiais aprovadas, hipóteses em validação e histórico de decisões da Otimizza. O conteúdo é versionado na administração e entregue aqui para alinhamento estratégico e para ser consumido como contexto por ferramentas externas de inteligência artificial.
        </p>

        {/* Metadados e Contador */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Última atualização: <strong>{new Date(doc.last_updated_at).toLocaleString("pt-BR")}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">{doc.pages_count}</span>
            <span>{doc.pages_count === 1 ? "página pública ativa" : "páginas públicas ativas"}</span>
          </div>
        </div>
      </section>

      {/* Componente Client com Busca Interativa e Árvore de Navegação */}
      <PublicKnowledgeClient
        initialPages={doc.all_published_pages}
        tree={doc.tree}
      />
    </div>
  );
}
