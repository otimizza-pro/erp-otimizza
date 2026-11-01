"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { PublicKnowledgePage, KnowledgePageTreeNode } from "@/modules/knowledge/types";
import { Search, Tag, Calendar, ChevronRight, Share2, Check, BookOpen, AlertCircle } from "lucide-react";

interface Props {
  initialPages: PublicKnowledgePage[];
  tree: KnowledgePageTreeNode[];
}

export function PublicKnowledgeClient({ initialPages, tree }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const filteredPages = useMemo(() => {
    if (!searchTerm.trim()) return initialPages;
    const term = searchTerm.toLowerCase().trim();
    return initialPages.filter(p =>
      p.title.toLowerCase().includes(term) ||
      (p.summary && p.summary.toLowerCase().includes(term)) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(term)))
    );
  }, [initialPages, searchTerm]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const infoTypeBadges: Record<string, { label: string; bg: string; text: string; border: string }> = {
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
    <div className="space-y-6">
      {/* Barra de Busca e Ação de Compartilhar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar páginas, diretrizes, termos ou tags públicas..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <button
          onClick={handleCopyLink}
          type="button"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs shrink-0 cursor-pointer"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-600">Link copiado!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Copiar link</span>
            </>
          )}
        </button>
      </div>

      {/* Lista de Resultados / Páginas */}
      {filteredPages.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">
            {searchTerm ? "Nenhuma página encontrada para esta busca." : "Nenhuma página publicada no momento."}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm
              ? "Tente buscar por termos mais genéricos ou limpe o campo de busca."
              : "As páginas criadas na administração precisam ser publicadas para ficarem visíveis aqui."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPages.map((page) => {
            const badge = infoTypeBadges[page.info_type] || infoTypeBadges.DIRECTIVE;
            return (
              <Link
                key={page.id}
                href={`/estrategia-otimizza/${page.slug}`}
                className="group bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md border ${badge.bg} ${badge.text} ${badge.border}`}>
                      {badge.label}
                    </span>
                    <span className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-1.5">
                    {page.title}
                  </h2>

                  {page.summary && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                      {page.summary}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 mt-2">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Atualizado em {new Date(page.updated_at).toLocaleDateString("pt-BR")}</span>
                  </div>

                  {page.tags && page.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Tag className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-500 font-medium">{page.tags.slice(0, 2).join(", ")}</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
