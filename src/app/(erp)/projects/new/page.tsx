"use client";

import { useCompany } from "@/lib/context/company-context";
import React, { useState, useEffect, Suspense } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { SocialMediaScheduleFields } from "@/components/projects/social-media-plan";
import type { SocialMediaSchedule } from "@/modules/projects/social-media-schedule";
import Link from "next/link";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
  Rocket,
  CheckCircle2,
} from "lucide-react";
import { ProjectTemplateRecord, ProjectType, ProjectPriority } from "@/modules/projects/types";
import { INTERNAL_COMPANY_ID } from "@/modules/clients/internal-company";

function NewProjectFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedCompany } = useCompany();
  const initialClientId = searchParams.get("clientId") || (selectedCompany.isOtimizza ? INTERNAL_COMPANY_ID : selectedCompany.id);

  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [projectType, setProjectType] = useState<ProjectType>("STANDALONE");
  const [clientId, setClientId] = useState<string>(initialClientId);
  const [contractId, setContractId] = useState<string>(searchParams.get("contractId") || "");

  const [templateId, setTemplateId] = useState<string>(() => searchParams.get("templateId") || "");
  const [priority, setPriority] = useState<ProjectPriority>("MEDIUM");
  const [startDate, setStartDate] = useState<string>(() => searchParams.get("startDate") || new Date().toISOString().substring(0, 10));
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
  const [templateDetail, setTemplateDetail] = useState<{
    stages: Array<{
      id: string;
      name: string;
      orderIndex: number;
      minDays: number;
      maxDays: number;
      tasks: Array<{
        id: string;
        title: string;
        description: string | null;
        relativeDueDays: number;
        estimatedHours: number;
      }>;
    }>;
  } | null>(null);

  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [planSocialMedia, setPlanSocialMedia] = useState(false);
  const [socialMediaSchedule, setSocialMediaSchedule] = useState<SocialMediaSchedule>({ postsPerMonth: 12, weekdays: [1, 3, 5] });

  // Resolução imediata do Cliente e Contratos passados por query param
  useEffect(() => {
    if (initialClientId) {
      setClientId(initialClientId);
      fetch(`/api/clients/${initialClientId}`)
        .then((r) => r.json())
        .then((client) => {
          if (client && client.id) {
            const formatted = {
              id: client.id,
              name: client.id === INTERNAL_COMPANY_ID
                ? "Otimizza Growth (Empresa Interna / Própria)"
                : `${client.name}${client.tradeName ? ` (${client.tradeName})` : ""}`,
            };
            setClients((prev) => {
              if (prev.some((c) => c.id === client.id)) return prev;
              return [formatted, ...prev];
            });
            setName((prev) => (prev ? prev : (client.id === INTERNAL_COMPANY_ID ? "" : `Projeto Operacional - ${client.tradeName || client.name}`)));
          }
        })
        .catch(() => {});

      // Carrega contratos deste cliente
      if (initialClientId !== INTERNAL_COMPANY_ID) {
        fetch(`/api/clients/${initialClientId}/contracts`)
          .then((r) => r.json())
          .then((data) => {
            const list = Array.isArray(data) ? data : data.contracts || [];
            if (list.length > 0) {
              setContracts(
                list.map((co: { id: string; contractNumber?: string; contract_number?: string; description?: string }) => ({
                  id: co.id,
                  contractNumber: co.contractNumber || co.contract_number || "Contrato",
                  clientName: co.description || "",
                }))
              );
            }
          })
          .catch(() => {});
      }
    }
  }, [initialClientId]);

  useEffect(() => {
    // Carregar clientes (inclui a Otimizza como empresa interna)
    fetch("/api/clients?limit=200&includeInternal=true")
      .then((res) => res.json())
      .then(async (json) => {
        const clientList = Array.isArray(json) ? json : json.clients || (json.success && json.data) || [];
        
        // Garante formatação especial para Otimizza Growth e posiciona no topo
        const otimizzaIndex = clientList.findIndex((c: { id: string }) => c.id === INTERNAL_COMPANY_ID);
        if (otimizzaIndex > -1) {
          const [otimizzaItem] = clientList.splice(otimizzaIndex, 1);
          clientList.unshift({
            ...otimizzaItem,
            name: "Otimizza Growth (Empresa Interna / Própria)",
          });
        } else {
          try {
            const single = await fetch(`/api/clients/${INTERNAL_COMPANY_ID}`).then((r) => r.json());
            if (single && single.id) {
              clientList.unshift({
                ...single,
                name: "Otimizza Growth (Empresa Interna / Própria)",
              });
            }
          } catch {}
        }

        if (initialClientId && !clientList.some((c: { id: string }) => c.id === initialClientId)) {
          try {
            const single = await fetch(`/api/clients/${initialClientId}`).then((r) => r.json());
            if (single && single.id) clientList.push(single);
          } catch {}
        }
        setClients(clientList);
        if (initialClientId) {
          setClientId(initialClientId);
        }
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

  // Carregar contratos filtrados exclusivamente pelo cliente selecionado
  useEffect(() => {
    if (!clientId) {
      setContracts([]);
      setContractId("");
      return;
    }

    fetch(`/api/contracts?clientId=${clientId}&status=ACTIVE`)
      .then((res) => res.json())
      .then((json) => {
        const list = Array.isArray(json) ? json : json.contracts || (json.success && json.data) || [];
        const formatted = list.map((co: { id: string; contractNumber?: string; contract_number?: string; clientTradeName?: string; clientName?: string; description?: string }) => ({
          id: co.id,
          contractNumber: co.contractNumber || co.contract_number || "Contrato",
          clientName: co.clientTradeName || co.clientName || co.description || "",
        }));
        setContracts(formatted);
        setContractId((prev) => (formatted.some((c: { id: string }) => c.id === prev) ? prev : ""));
      })
      .catch((err) => {
        console.error("Erro ao carregar contratos do cliente:", err);
        setContracts([]);
        setContractId("");
      });
  }, [clientId]);

  const loadTemplateDetail = async (tmplId: string) => {
    if (!tmplId) {
      setTemplateDetail(null);
      return;
    }
    try {
      const res = await fetch(`/api/projects/templates/${tmplId}`);
      const json = await res.json();
      if (json.success) {
        setTemplateDetail(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (templateId) {
      loadTemplateDetail(templateId);
    }
  }, [templateId]);

  const handleTemplateChange = (tmplId: string) => {
    setTemplateId(tmplId);
    if (!tmplId) {
      setTemplateDetail(null);
      return;
    }

    loadTemplateDetail(tmplId);

    const tmpl = templates.find((t) => t.id === tmplId);
    if (tmpl) {
      if (!name) setName(tmpl.name);
      if (!description) setDescription(tmpl.description || "");
      if (tmpl.estimatedHours > 0) setEstimatedHours(tmpl.estimatedHours);

      const d = new Date(startDate);
      d.setDate(d.getDate() + (tmpl.estimatedDays || 30));
      setDueDate(d.toISOString().substring(0, 10));

      const isSocialMedia = /social\s*media|editorial|post|grava/i.test(tmpl.name + " " + (tmpl.description || ""));
      if (isSocialMedia && !planSocialMedia) {
        setPlanSocialMedia(true);
      }
    }
  };

  const calculateDate = (baseDateStr: string, daysToAdd: number) => {
    if (!baseDateStr) return "-";
    const d = new Date(baseDateStr + "T12:00:00");
    d.setDate(d.getDate() + (daysToAdd || 0));
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (planSocialMedia && !socialMediaSchedule.weekdays.length) {
      setError("Selecione pelo menos um dia de publicação.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const payload = {
        name,
        description: description || null,
        projectType,
        clientId: (projectType === "INTERNAL" ? (clientId || INTERNAL_COMPANY_ID) : clientId) || null,
        socialMediaSchedule: planSocialMedia ? socialMediaSchedule : undefined,
        contractId: contractId || null,
        useServiceOnboarding: searchParams.get("onboarding") === "1" && !templateId,
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
    <>
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
                onChange={(e) => {
                  const val = e.target.value as ProjectType;
                  setProjectType(val);
                  if (val === "INTERNAL") {
                    setClientId(INTERNAL_COMPANY_ID);
                    setContractId("");
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="STANDALONE">Projeto Avulso (Entrega Específica)</option>
                <option value="RECURRING">Projeto Recorrente (Operação Contratual)</option>
                <option value="INTERNAL">Projeto Interno da Otimizza</option>
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
                <option value="">{searchParams.get("onboarding") === "1" ? "Onboarding dos serviços deste contrato" : "Nenhum (Começar com etapas padrão)"}</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.estimatedHours}h - {t.estimatedDays} dias)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Prévia Dinâmica das Fases com Datas Sugeridas */}
          {templateDetail && templateDetail.stages && templateDetail.stages.length > 0 && (
            <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2">
                <div className="flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-950">
                    Fases do Onboarding com Datas Sugeridas (Base: Início em {calculateDate(startDate, 0)})
                  </span>
                </div>
                <span className="text-[11px] font-mono font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                  {templateDetail.stages.length} fases estruturadas
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {templateDetail.stages.map((stage, idx) => {
                  const stageStart = calculateDate(startDate, stage.minDays > 0 ? stage.minDays - 1 : 0);
                  const stageEnd = calculateDate(startDate, stage.maxDays || 5);

                  return (
                    <div
                      key={stage.id}
                      className="bg-white p-3 rounded-xl border border-indigo-100/80 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          {stageStart} ~ {stageEnd}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-zinc-900">{stage.name}</h4>
                      <p className="text-[11px] text-zinc-500">
                        {stage.tasks?.length || 0} tarefas programadas
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Planejamento de Conteúdo e Grade de Social Media */}
          <section className="space-y-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50/50 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 text-sm font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planSocialMedia}
                  onChange={event => setPlanSocialMedia(event.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Planejar conteúdo de Social Media
                </span>
              </label>
              {planSocialMedia && (
                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-semibold">
                  Ativo
                </span>
              )}
            </div>

            {planSocialMedia && (
              <div className="space-y-4 pt-1 border-t border-indigo-100/70">
                <p className="text-xs text-slate-600">
                  Defina a quantidade de posts e clique nas datas desejadas no calendário para planejar a grade de publicações. Os posts serão automaticamente registrados no Calendário Editorial do cliente a partir do início do projeto.
                </p>
                <SocialMediaScheduleFields
                  value={socialMediaSchedule}
                  onChange={setSocialMediaSchedule}
                  baseDate={startDate}
                />
              </div>
            )}
          </section>

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
          {projectType === "INTERNAL" ? (
            <div className="bg-emerald-50 border border-emerald-200/90 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-emerald-950 text-sm">Projeto Interno Otimizza</span>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Este projeto pertence às demandas e operações da própria agência (Otimizza Growth), sem cobrança de cliente externo.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProjectType("STANDALONE")}
                className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 underline shrink-0 text-left cursor-pointer"
              >
                Vincular a cliente externo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 items-start">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cliente Vinculado *
                </label>
                <SearchableSelect
                  options={clients.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  value={clientId}
                  onChange={(val) => setClientId(val)}
                  placeholder="Selecione ou digite para buscar o cliente..."
                  searchPlaceholder="Buscar cliente por nome..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contrato / Assinatura (Opcional)
                </label>
                <select
                  value={contractId}
                  disabled={!clientId || clientId === INTERNAL_COMPANY_ID}
                  onChange={(e) => setContractId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {!clientId ? (
                    <option value="">Selecione um cliente primeiro...</option>
                  ) : clientId === INTERNAL_COMPANY_ID ? (
                    <option value="">Sem contrato (Operação Interna da Agência)</option>
                  ) : contracts.length === 0 ? (
                    <option value="">Nenhum contrato ativo encontrado para este cliente</option>
                  ) : (
                    <>
                      <option value="">Sem contrato vinculado</option>
                      {contracts.map((co) => (
                        <option key={co.id} value={co.id}>
                          {co.contractNumber} {co.clientName ? `- ${co.clientName}` : ""}
                        </option>
                      ))}
                    </>
                  )}
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
              className="inline-flex items-center gap-2 px-5 py-2 bg-zinc-950 text-white rounded-lg text-sm font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Criando Projeto..." : "Criar Projeto"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense
      fallback={
        <>
          <div className="p-12 text-center text-xs text-zinc-400">Carregando formulário...</div>
        </>
      }
    >
      <NewProjectFormContent />
    </Suspense>
  );
}

