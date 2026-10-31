"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import Link from "next/link";
import {
  Layers,
  ArrowLeft,
  Clock,
  Calendar,
  CheckSquare,
  RefreshCw,
  AlertCircle,
  Briefcase,
} from "lucide-react";
import { ProjectTemplateRecord } from "@/modules/projects/types";

export default function ProjectTemplatesPage() {
  const [templates, setTemplates] = useState<ProjectTemplateRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects/templates")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setTemplates(json.data);
        else setError(json.error || "Erro ao carregar templates");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>Operações</span>
                <span>/</span>
                <span className="text-slate-900 font-semibold">Modelos de Projeto</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                <Layers className="w-6 h-6 text-indigo-600" />
                Modelos & Templates Operacionais
              </h1>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
            Carregando modelos de projeto...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {tmpl.code}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Ativo
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-1">{tmpl.name}</h3>
                  <p className="text-xs text-slate-600 mb-4 line-clamp-3">
                    {tmpl.description || "Modelo pré-configurado com etapas e tarefas padronizadas."}
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>{tmpl.estimatedHours} horas estimadas</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{tmpl.estimatedDays} dias de duração</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Utilizável em contratos e projetos avulsos
                  </span>
                  <Link
                    href={`/projects/new?templateId=${tmpl.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Criar com este Modelo &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
