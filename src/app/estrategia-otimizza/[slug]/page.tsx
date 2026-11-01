import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPublicPageBySlug } from "@/modules/knowledge/service";
import { Calendar, Clock, Tag, ChevronRight, BookOpen, FileText, ArrowLeft, ExternalLink, Share2 } from "lucide-react";
import { PageShareButton } from "./share-button";

export const dynamic = "force-dynamic";

export default async function PublicPageDetail({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { page, redirectSlug } = await getPublicPageBySlug(slug);

  if (redirectSlug) {
    redirect(`/estrategia-otimizza/${redirectSlug}`);
  }

  if (!page) {
    notFound();
  }

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

  const conf = infoTypeConfig[page.info_type] || infoTypeConfig.DIRECTIVE;

  return (
    <article className="space-y-8">
      {/* Breadcrumbs e Botão Voltar */}
      <nav aria-label="Navegação estrutural" className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link href="/estrategia-otimizza" className="hover:text-indigo-600 transition-colors font-medium">
            Estratégia Otimizza
          </Link>
          {page.breadcrumbs.slice(0, -1).map((crumb) => (
            <React.Fragment key={crumb.slug}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <Link
                href={`/estrategia-otimizza/${crumb.slug}`}
                className="hover:text-indigo-600 transition-colors font-medium"
              >
                {crumb.title}
              </Link>
            </React.Fragment>
          ))}
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-800 font-semibold truncate max-w-[200px] sm:max-w-none">
            {page.title}
          </span>
        </div>

        <PageShareButton title={page.title} />
      </nav>

      {/* Cartão Principal do Conteúdo */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 sm:p-10 shadow-xs">
        {/* Cabeçalho da Página */}
        <header className="border-b border-slate-200 pb-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${conf.bg} ${conf.text} ${conf.border}`}>
              {conf.label}
            </span>

            <div className="flex items-center gap-2">
              <Link
                href={`/estrategia-otimizza/completo#${page.slug}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-md border border-slate-200 transition-colors"
                title="Ver no documento contínuo completo"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Ver no Completo</span>
              </Link>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
            {page.title}
          </h1>

          {page.summary && (
            <p className="text-sm sm:text-base text-slate-600 italic bg-slate-50 p-4 rounded-lg border-l-4 border-indigo-500 mb-6">
              {page.summary}
            </p>
          )}

          {/* Metadados para IA e Equipe */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
            {page.last_reviewed_at && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Última revisão: <strong>{new Date(page.last_reviewed_at).toLocaleDateString("pt-BR")}</strong></span>
              </div>
            )}

            {page.next_review_at && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Próxima revisão prevista: <strong>{new Date(page.next_review_at).toLocaleDateString("pt-BR")}</strong></span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span>Publicado em: <strong>{new Date(page.published_at).toLocaleDateString("pt-BR")}</strong></span>
            </div>
          </div>

          {page.tags && page.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {page.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
                >
                  <Tag className="w-3 h-3 text-slate-400" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Conteúdo HTML Sanitizado entregue no SSR */}
        <div
          className="prose prose-slate max-w-none text-slate-800 leading-relaxed
                     prose-headings:text-slate-900 prose-headings:font-bold prose-headings:tracking-tight
                     prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                     prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
                     prose-table:border-collapse prose-table:w-full prose-table:border prose-table:border-slate-200
                     prose-th:bg-slate-100 prose-th:p-3 prose-th:text-left prose-th:border prose-th:border-slate-200
                     prose-td:p-3 prose-td:border prose-td:border-slate-200
                     prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:p-4 prose-pre:rounded-lg
                     prose-blockquote:border-l-4 prose-blockquote:border-slate-300 prose-blockquote:pl-4 prose-blockquote:italic"
          dangerouslySetInnerHTML={{ __html: page.content_html }}
        />

        {/* Subpáginas se houver */}
        {page.subpages && page.subpages.length > 0 && (
          <div className="mt-12 pt-8 border-t border-slate-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Subpáginas desta Seção
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {page.subpages.map((sub) => {
                const subConf = infoTypeConfig[sub.info_type] || infoTypeConfig.DIRECTIVE;
                return (
                  <Link
                    key={sub.slug}
                    href={`/estrategia-otimizza/${sub.slug}`}
                    className="p-4 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md border ${subConf.bg} ${subConf.text} ${subConf.border} mb-1.5`}>
                        {subConf.label}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                        {sub.title}
                      </h3>
                      {sub.summary && (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                          {sub.summary}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </article>
  );
}
