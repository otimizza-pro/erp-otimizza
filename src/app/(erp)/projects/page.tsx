"use client";
import React from "react";
import { useCompany } from "@/lib/context/company-context";

import { ProjectViews } from "@/components/projects/project-views";
import Link from "next/link";
import { FolderKanban, Plus, CopyCheck } from "lucide-react";

export default function ProjectsPage() {
  const { selectedCompany } = useCompany();
  return (
    <>
      <div className="space-y-6 pb-16">
        {/* Header Elegante e Moderno alinhado com o padrão ERP */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-zinc-950 text-white shadow-2xs">
              <FolderKanban className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
                Projetos & Demandas
              </h1>
              <p className="text-xs text-zinc-500">
                Acompanhe o fluxo de produção, controle cronogramas e movimente entregas em tempo real no Kanban.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/projects/templates"
              className="px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            >
              <CopyCheck className="w-4 h-4 text-zinc-500" />
              Modelos de Projeto
            </Link>
            <Link
              href="/projects/new"
              className="px-4 py-2 text-xs font-bold text-white bg-zinc-950 hover:bg-zinc-800 rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Projeto
            </Link>
          </div>
        </div>

        {/* Módulo de Visualizações e Kanban Funcional */}
        <ProjectViews clientId={selectedCompany.isOtimizza ? undefined : selectedCompany.id} />
      </div>
    </>
  );
}
