"use client";

import React, { useState, useEffect, Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Briefcase,
  ArrowLeft,
  Save,
  Layers,
  AlertCircle,
  Calendar,
  Clock,
  DollarSign,
  Building,
} from "lucide-react";
import { ProjectTemplateRecord, ProjectType, ProjectPriority } from "@/modules/projects/types";

function NewProjectFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get("clientId") || "";

  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [projectType, setProjectType] = useState<ProjectType>("STANDALONE");
  const [clientId, setClientId] = useState<string>(initialClientId);
  const [contractId, setContractId] = useState<string>("");

  const [templateId, setTemplateId] = useState<string>("");
  const [priority, setPriority] = useState<ProjectPriority>("MEDIUM");
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().substring(0, 10);
  });
  const [estimatedHours, setEstimatedHours] = useState<number>(20);
  const [estimatedBudget, setEstimatedBudget] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");

  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [contracts, setContracts] = useState<Array<{ id: string; contractNumber: string; clientName: string }>>([]);
  const [templates, setTemplates] = useState<ProjectTemplateRecord[]>([]);

  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Carregar clientes
    fetch("/api/clients?limit=100")
      .then((res) => res.json())
      .then(async (json) => {
        const clientList = Array.isArray(json) ? json : json.clients || (json.success && json.data) || [];
        if (initialClientId && !clientList.some((c: { id: string }) => c.id === initialClientId)) {
          try {
            const single = await fetch(`/api/clients/${initialClientId}`).then((r) => r.json());
            if (single && single.id) clientList.unshift(single);
          } catch {}
        }
        setClients(clientList);
        if (initialClientId) {
          setClientId(initialClientId);
        }
      })
      .catch((err) => console.error(err));

    // Carregar contratos
    fetch("/api/contracts?limit=100")
      .then((res) => res.json())
      .then((json) => {
        const contractList = Array.isArray(json) ? json : json.contracts || (json.success && json.data) || [];
        setContracts(contractList);
      })
      .catch((err) => console.error(err));

    // Carregar templates
    fetch("/api/projects/templates")
      .then((res) => res.json())
      .then((json) => {
        const tmpls = (json.success && json.data) || json.data || (Array.isArray(json) ? json : []);
        setTemplates(tmpls);
      })
      .catch((err) => console.error(err));
  }, [initialClientId]);

  const handleTemplateChange = (tmplId: string) => {
    setTemplateId(tmplId);
    if (!tmplId) return;

    const tmpl = templates.find((t) => t.id === tmplId);
    if (tmpl) {
      if (!name) setName(tmpl.name);
      if (!description) setDescription(tmpl.description || "");
      if (tmpl.estimatedHours > 0) setEstimatedHours(tmpl.estimatedHours);

      const d = new Date(startDate);
      d.setDate(d.getDate() + (tmpl.estimatedDays || 30));
      setDueDate(d.toISOString().substring(0, 10));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        name,
        description: description || null,
        projectType,
        clientId: projectType !== "INTERNAL" ? clientId || null : null,
        contractId: contractId || null,
        templateId: templateId || null,
        priority,
        startDate,
        dueDate,
        estimatedHours: Number(estimatedHours) || 0,
        estimatedBudget: Number(estimatedBudget) || 0,
        notes: notes || null,
        status: "PLANNED",
      };

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Erro ao cadastrar projeto");
      }

      router.push(`/projects/${json.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido ao salvar projeto.");
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
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
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-indigo-600" />
                Novo Projeto
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Cadastre um projeto avulso, recorrente por contrato ou interno.
              </p>
            </div>
          </div>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          {/* Tipo de Projeto e Modelo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo do Projeto *
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value as ProjectType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="STANDALONE">Projeto Avulso (Entrega Específica)</option>
                <option value="RECURRING">Projeto Recorrente (Operação Contratual)</option>
                <option value="INTERNAL">Projeto Interno (Sem Cliente)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Clonar Modelo / Template (Opcional)
              </label>
              <select
                value={templateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Nenhum (Começar com etapas padrão)</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.estimatedHours}h - {t.estimatedDays} dias)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Nome e Descrição */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome do Projeto *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Gestão de Tráfego Pago - Outubro/2026"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descrição e Escopo
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o escopo da entrega, objetivos e alinhamentos..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Vínculo com Cliente e Contrato */}
          {projectType !== "INTERNAL" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cliente Vinculado *
                </label>
                <select
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione o Cliente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contrato / Assinatura (Opcional)
                </label>
                <select
                  value={contractId}
                  onChange={(e) => setContractId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Sem contrato vinculado</option>
                  {contracts.map((co) => (
                    <option key={co.id} value={co.id}>
                      {co.contractNumber} - {co.clientName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Datas, Prioridade e Estimativas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data Inicial *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Previsão de Término *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Horas Estimadas
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              href="/projects"
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Criando Projeto..." : "Criar Projeto"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense
      fallback={
        <AppShell activeSection="projects">
          <div className="p-12 text-center text-xs text-zinc-400">Carregando formulário...</div>
        </AppShell>
      }
    >
      <NewProjectFormContent />
    </Suspense>
  );
}

