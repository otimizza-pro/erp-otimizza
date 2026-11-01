import React from "react";
import Link from "next/link";
import { getConsolidatedDocument } from "@/modules/knowledge/service";
import { BookOpen, Calendar, Clock, Tag, ExternalLink, Compass } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConsolidatedStrategyPage() {
  const doc = await getConsolidatedDocument();

  const infoTypeConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
    DIRECTIVE: {
      label: "Diretriz Aprovada",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200"
    },
    HYPOTHESIS: {
      label: "Hipótese em Avaliação",
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200"
    },
    HISTORICAL: {
      label: "Registro Histórico",
      bg: "bg-slate-100",
      text: "text-slate-700",
      border: "border-slate-200"
    }
  };

  return (
    <article className="space-y-12">
      {/* Header do Documento Consolidado */}
      <header className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Compass className="w-3.5 h-3.5" />
            Documento Consolidado Oficial
          </span>
          <span className="text-xs text-slate-500">
            {doc.pages_count} {doc.pages_count === 1 ? "página publicada" : "páginas publicadas"}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
          Manual Vivo da Estratégia e Identidade — Otimizza
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed mb-6">
          Visão integral e contínua das diretrizes aprovadas, posicionamento, portfólio de ofertas e regras de comunicação da Otimizza. Este documento reúne todas as páginas públicas em um único fluxo de leitura semântico, ideal para navegação linear e leitura contextual por ferramentas externas de inteligência artificial.
        </p>

        {/* Metadados Globais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Gerado em: <strong>{new Date(doc.generated_at).toLocaleString("pt-BR")}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Última atualização do conteúdo: <strong>{new Date(doc.last_updated_at).toLocaleString("pt-BR")}</strong></span>
          </div>
        </div>

        {/* Atalhos para IA */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/estrategia-otimizza/contexto.md"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <span>Ver formato Markdown (.md)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/estrategia-otimizza"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <span>Voltar ao Índice por Páginas</span>
          </Link>
        </div>
      </header>

      {/* Sumário com links âncora */}
      <nav aria-label="Sumário da Documentação" className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          Sumário do Conteúdo Publicado
        </h2>

        {doc.all_published_pages.length === 0 ? (
          <p className="text-sm text-slate-500 italic">
            Nenhuma página pública disponível no momento.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {doc.all_published_pages.map((p) => {
              const conf = infoTypeConfig[p.info_type] || infoTypeConfig.DIRECTIVE;
              const indentClass = p.breadcrumbs.length > 1 ? "ml-6 pl-2 border-l border-slate-200" : "";
              return (
                <li key={p.id} className={indentClass}>
                  <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                    <a
                      href={`#${p.slug}`}
                      className="font-medium text-slate-800 hover:text-indigo-600 transition-colors"
                    >
                      {p.title}
                    </a>
                    <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md border ${conf.bg} ${conf.text} ${conf.border}`}>
                      {conf.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* Corpo de Todas as Páginas em Ordem Hierárquica */}
      <section className="space-y-16">
        {doc.all_published_pages.map((page, index) => {
          const conf = infoTypeConfig[page.info_type] || infoTypeConfig.DIRECTIVE;
          const breadcrumbStr = page.breadcrumbs.map((b) => b.title).join(" > ");

          return (
            <article
              key={page.id}
              id={page.slug}
              className="bg-white rounded-xl border border-slate-200 p-6 sm:p-10 shadow-xs scroll-mt-24"
            >
              {/* Cabeçalho da Seção */}
              <header className="border-b border-slate-200 pb-6 mb-8">
                {/* Caminho Hierárquico */}
                <div className="text-xs font-semibold text-slate-500 mb-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-400">#{index + 1}</span>
                  <span>•</span>
                  <span>{breadcrumbStr}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {page.title}
                  </h2>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${conf.bg} ${conf.text} ${conf.border}`}>
                    {conf.label}
                  </span>
                </div>

                {/* Resumo se houver */}
                {page.summary && (
                  <p className="text-sm sm:text-base text-slate-600 italic bg-slate-50 p-3.5 rounded-lg border-l-4 border-indigo-500 mb-4">
                    {page.summary}
                  </p>
                )}

                {/* Metadados Específicos */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
                  {page.last_reviewed_at && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Revisado em: <strong>{new Date(page.last_reviewed_at).toLocaleDateString("pt-BR")}</strong></span>
                    </div>
                  )}

                  {page.next_review_at && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Próxima revisão: <strong>{new Date(page.next_review_at).toLocaleDateString("pt-BR")}</strong></span>
                    </div>
                  )}

                  <Link
                    href={`/estrategia-otimizza/${page.slug}`}
                    className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-medium ml-auto"
                  >
                    <span>Ver página individual</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                {page.tags && page.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {page.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600"
                      >
                        <Tag className="w-3 h-3 text-slate-400" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </header>

              {/* Conteúdo HTML Sanitizado entregue diretamente no SSR */}
              <div
                className="prose prose-slate max-w-none text-slate-800 leading-relaxed
                           prose-headings:text-slate-900 prose-headings:font-bold prose-headings:tracking-tight
                           prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                           prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
                           prose-table:border-collapse prose-table:w-full prose-table:border prose-table:border-slate-200
                           prose-th:bg-slate-100 prose-th:p-2.5 prose-th:text-left prose-th:border prose-th:border-slate-200
                           prose-td:p-2.5 prose-td:border prose-td:border-slate-200
                           prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:p-4 prose-pre:rounded-lg
                           prose-blockquote:border-l-4 prose-blockquote:border-slate-300 prose-blockquote:pl-4 prose-blockquote:italic"
                dangerouslySetInnerHTML={{ __html: page.content_html }}
              />
            </article>
          );
        })}
      </section>
    </article>
  );
}
