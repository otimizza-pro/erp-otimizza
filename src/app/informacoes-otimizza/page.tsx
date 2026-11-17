import React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { listAdminPages, getAdminPageTree } from "@/modules/knowledge/service";
import { AdminKnowledgeListClient } from "./admin-list-client";
import { AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminKnowledgePage() {
  try {
    const rawPages = await listAdminPages({ status: "ALL" });
    const rawTree = await getAdminPageTree();

    const pages = JSON.parse(JSON.stringify(rawPages));
    const tree = JSON.parse(JSON.stringify(rawTree));

    return (
      <AppShell activeSection="knowledge_manual">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <AdminKnowledgeListClient initialPages={pages} initialTree={tree} />
        </div>
      </AppShell>
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno ao carregar a base de conhecimento.";
    console.error("[ADMIN KNOWLEDGE PAGE ERROR]:", error);

    return (
      <AppShell activeSection="knowledge_manual">
        <div className="p-6 sm:p-8 max-w-4xl mx-auto my-8 bg-white border border-amber-200 rounded-2xl shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Base de Conhecimento em Atualização
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            {message}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/informacoes-otimizza"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recarregar
            </Link>
            <Link
              href="/estrategia-otimizza"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              Ver Manual Público
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }
}
