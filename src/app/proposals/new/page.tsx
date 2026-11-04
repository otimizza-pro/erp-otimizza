"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AppShell } from "@/components/layout/app-shell";
import {
  FileText,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Calendar,
  Layers,
  DollarSign,
  AlertCircle,
  Building,
  UserCheck,
  TrendingUp,
  Save,
  Send,
  Sparkles,
  CheckCircle2,
  Circle,
  Eye,
  Check,
  ChevronRight,
  ChevronLeft,
  Settings,
  HelpCircle,
} from "lucide-react";
import { allocateTotal, servicePeriod } from "@/modules/contracts/billing-plan";
import { ProposalPeriodicity } from "@/modules/proposals/types";
import {
  PREDEFINED_SCENARIOS,
  DEFAULT_SERVICE_DELIVERABLES,
  HOW_WE_WORK_STEPS,
  PredefinedScenario,
} from "@/modules/proposals/constants";

interface ServiceOption {
  id: string;
  name: string;
  defaultPrice: number;
  billingUnit?: string;
}

interface ComboOption {
  id: string;
  name: string;
  items: Array<{
    serviceId: string;
    serviceName: string;
    componentPrice: number;
  }>;
}

interface ItemDraft {
  tempId: string;
  sourceType: "SERVICE" | "COMBO";
  serviceId?: string;
  comboId?: string;
  name: string;
  descriptionSnapshot?: string;
  periodicity: ProposalPeriodicity;
  quantity: number;
  referenceUnitPrice: number;
  negotiatedUnitPrice: number;
  discountAmount: number;
  totalAmount: number;
}

interface DeliverableState {
  included: string[];
  excluded: string[];
}

function NewProposalWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Wizard Step (1: Diagnóstico, 2: Escopo/Serviços, 3: Investimento, 4: Prévia/Emissão)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Recipient
  const [recipientType, setRecipientType] = useState<"LEAD" | "CLIENT">("CLIENT");
  const [leads, setLeads] = useState<Array<{ id: string; name: string; tradeName?: string | null; companyName?: string | null }>>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string; tradeName?: string | null }>>([]);
  const [opportunities, setOpportunities] = useState<Array<{ id: string; title: string }>>([]);

  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string>("");

  // Step 1: Diagnóstico e Cenários
  const [title, setTitle] = useState("");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("sem_presenca");
  const [currentScenario, setCurrentScenario] = useState<string>(PREDEFINED_SCENARIOS[0].description);
  const [partnershipFocus, setPartnershipFocus] = useState<string>(PREDEFINED_SCENARIOS[0].focus);
  const [trackingMetrics, setTrackingMetrics] = useState<string>(PREDEFINED_SCENARIOS[0].metrics);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string>("");

  // Step 2: Serviços e Entregáveis
  const [availableServices, setAvailableServices] = useState<ServiceOption[]>([]);
  const [availableCombos, setAvailableCombos] = useState<ComboOption[]>([]);
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [serviceDeliverables, setServiceDeliverables] = useState<Record<string, DeliverableState>>({});
  const [newDeliverableInput, setNewDeliverableInput] = useState<Record<string, string>>({});

  // Step 3: Investimento & Condições
  const [targetTotal, setTargetTotal] = useState<string>("");
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().slice(0, 10);
  });
  const [startLeadTimeDays, setStartLeadTimeDays] = useState(5);
  const [paymentTerms, setPaymentTerms] = useState(
    "Cobrança conforme periodicidade de cada serviço. Avulso em até 3x sem juros. Vencimentos definidos na aprovação do contrato."
  );
  const [clientNotes, setClientNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [globalDiscount, setGlobalDiscount] = useState(0);

  // Step 4: Prévia de Slides
  const [previewSlideIdx, setPreviewSlideIdx] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Nome do cliente para labels
  const currentClientName =
    recipientType === "CLIENT"
      ? clients.find((c) => c.id === selectedClientId)?.tradeName ||
        clients.find((c) => c.id === selectedClientId)?.name ||
        "Cliente"
      : leads.find((l) => l.id === selectedLeadId)?.tradeName ||
        leads.find((l) => l.id === selectedLeadId)?.companyName ||
        leads.find((l) => l.id === selectedLeadId)?.name ||
        "Lead";

  // Pre-fill from query params if coming from Lead or Client
  useEffect(() => {
    const leadIdParam = searchParams.get("leadId");
    const clientIdParam = searchParams.get("clientId");
    const oppIdParam = searchParams.get("opportunityId");

    if (leadIdParam) {
      setRecipientType("LEAD");
      setSelectedLeadId(leadIdParam);
      fetch(`/api/crm/leads/${leadIdParam}`)
        .then((r) => r.json())
        .then((lead) => {
          if (lead && lead.id) {
            setLeads((prev) => {
              if (prev.some((x) => x.id === lead.id)) return prev;
              return [{ id: lead.id, name: lead.name, tradeName: lead.tradeName }, ...prev];
            });
            setTitle((prev) => (prev ? prev : `Proposta Comercial - ${lead.name}`));
          }
        })
        .catch(() => {});
    } else if (clientIdParam) {
      setRecipientType("CLIENT");
      setSelectedClientId(clientIdParam);
      fetch(`/api/clients/${clientIdParam}`)
        .then((r) => r.json())
        .then((client) => {
          if (client && client.id) {
            setClients((prev) => {
              if (prev.some((x) => x.id === client.id)) return prev;
              return [{ id: client.id, name: client.name, tradeName: client.tradeName }, ...prev];
            });
            setTitle((prev) => (prev ? prev : `Proposta Comercial - ${client.tradeName || client.name}`));
          }
        })
        .catch(() => {});
    }

    if (oppIdParam) {
      setSelectedOpportunityId(oppIdParam);
      fetch(`/api/crm/opportunities/${oppIdParam}`)
        .then((r) => r.json())
        .then((data) => {
          const opp = data?.opportunity || data;
          if (opp && opp.title) {
            setTitle((prev) => (prev ? prev : `Proposta - ${opp.title}`));
            if (opp.leadId && !leadIdParam && !clientIdParam) {
              setRecipientType("LEAD");
              setSelectedLeadId(opp.leadId);
            } else if (opp.clientId && !leadIdParam && !clientIdParam) {
              setRecipientType("CLIENT");
              setSelectedClientId(opp.clientId);
            }
          }
        })
        .catch(() => {});
    }
  }, [searchParams]);

  // Load Catalogs
  useEffect(() => {
    async function loadData() {
      try {
        const [servicesRes, combosRes, clientsRes, leadsRes] = await Promise.all([
          fetch("/api/services?status=ACTIVE"),
          fetch("/api/combos?status=ACTIVE"),
          fetch("/api/clients?limit=100"),
          fetch("/api/crm/leads?limit=100"),
        ]);

        if (servicesRes.ok) {
          const data = await servicesRes.json();
          setAvailableServices(
            Array.isArray(data)
              ? data
                  .filter((s) => !s.name?.toLowerCase().includes("teste") && !s.name?.toLowerCase().includes("mock"))
                  .map((s) => ({
                    id: s.id,
                    name: s.name,
                    defaultPrice: Number(s.defaultPrice ?? s.price ?? s.default_price ?? 0),
                    billingUnit: s.billingUnit || s.billing_unit,
                  }))
              : []
          );
        }

        if (combosRes.ok) {
          const data = await combosRes.json();
          setAvailableCombos(
            Array.isArray(data)
              ? data
                  .filter((c) => !c.name?.toLowerCase().includes("teste") && !c.name?.toLowerCase().includes("mock"))
                  .map((c) => ({
                    id: c.id,
                    name: c.name,
                    items: Array.isArray(c.items)
                      ? c.items.map((i: { serviceId?: string; service_id?: string; serviceName?: string; service_name?: string; componentPrice?: number | string; component_price?: number | string }) => ({
                          serviceId: i.serviceId || i.service_id || "",
                          serviceName: i.serviceName || i.service_name || "Componente",
                          componentPrice: Number(i.componentPrice || i.component_price || 0),
                        }))
                      : [],
                  }))
              : []
          );
        }

        if (clientsRes.ok) {
          const data = await clientsRes.json();
          setClients(data.clients || []);
        }

        if (leadsRes.ok) {
          const data = await leadsRes.json();
          setLeads(data.leads || []);
        }
      } catch (err) {
        console.error("Erro ao carregar catálogos:", err);
      }
    }
    loadData();
  }, []);

  // Recipient change loads opportunities
  useEffect(() => {
    async function loadOpps() {
      try {
        const param =
          recipientType === "LEAD" && selectedLeadId
            ? `leadId=${selectedLeadId}`
            : selectedClientId
            ? `clientId=${selectedClientId}`
            : "";
        if (!param) {
          setOpportunities([]);
          return;
        }
        const res = await fetch(`/api/crm/opportunities?${param}`);
        if (res.ok) {
          const data = await res.json();
          setOpportunities(data.opportunities || []);
        }
      } catch (err) {
        console.error("Erro ao carregar oportunidades:", err);
      }
    }
    loadOpps();
  }, [recipientType, selectedLeadId, selectedClientId]);

  // Handler for Predefined Scenario Pill Click
  const handleSelectScenario = (sc: PredefinedScenario) => {
    setSelectedScenarioId(sc.id);
    setCurrentScenario(sc.description);
    setPartnershipFocus(sc.focus);
    setTrackingMetrics(sc.metrics);
  };

  // AI Assist Refinement
  const handleAiRefinement = async () => {
    setIsAiLoading(true);
    setAiSuccessMessage("");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/proposals/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: currentClientName,
          currentScenario,
          partnershipFocus,
          trackingMetrics,
          services: items.map((i) => i.name),
        }),
      });

      if (!res.ok) throw new Error("Não foi possível refinar os textos com IA.");
      const data = await res.json();
      if (data.currentScenario) setCurrentScenario(data.currentScenario);
      if (data.partnershipFocus) setPartnershipFocus(data.partnershipFocus);
      if (data.trackingMetrics) setTrackingMetrics(data.trackingMetrics);
      setAiSuccessMessage("✨ Textos refinados com tom executivo e persuasivo da Otimizza!");
      setTimeout(() => setAiSuccessMessage(""), 5000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao ajustar com IA.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Initialize deliverables for a service
  const initDeliverablesForService = (serviceId: string, serviceName: string) => {
    setServiceDeliverables((prev) => {
      if (prev[serviceId]) return prev;
      const defaults = DEFAULT_SERVICE_DELIVERABLES[serviceName] || [
        "Planejamento e alinhamento de escopo",
        "Execução profissional conforme cronograma acordado",
        "Acompanhamento e suporte da equipe Otimizza",
      ];
      return {
        ...prev,
        [serviceId]: {
          included: defaults,
          excluded: [],
        },
      };
    });
  };

  // Add individual service
  const handleAddService = (serviceId: string) => {
    const s = availableServices.find((x) => x.id === serviceId);
    if (!s) return;

    initDeliverablesForService(s.id, s.name);

    const newItem: ItemDraft = {
      tempId: Math.random().toString(36).substring(2, 9),
      sourceType: "SERVICE",
      serviceId: s.id,
      name: s.name,
      descriptionSnapshot: s.name,
      periodicity: servicePeriod(s.billingUnit),
      quantity: 1,
      referenceUnitPrice: s.defaultPrice,
      negotiatedUnitPrice: s.defaultPrice,
      discountAmount: 0,
      totalAmount: s.defaultPrice,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Add combo with components
  const handleAddCombo = (comboId: string) => {
    const c = availableCombos.find((x) => x.id === comboId);
    if (!c || c.items.length === 0) return;

    const newItems: ItemDraft[] = c.items.map((comp) => {
      const match = availableServices.find((s) => s.id === comp.serviceId);
      if (match) {
        initDeliverablesForService(match.id, match.name);
      }
      return {
        tempId: Math.random().toString(36).substring(2, 9),
        sourceType: "COMBO",
        comboId: c.id,
        serviceId: comp.serviceId,
        name: `${c.name} — ${comp.serviceName}`,
        descriptionSnapshot: comp.serviceName,
        periodicity: servicePeriod(match?.billingUnit),
        quantity: 1,
        referenceUnitPrice: comp.componentPrice,
        negotiatedUnitPrice: comp.componentPrice,
        discountAmount: 0,
        totalAmount: comp.componentPrice,
      };
    });

    setItems((prev) => [...prev, ...newItems]);
  };

  // Toggle deliverable between included and excluded
  const handleToggleDeliverable = (serviceId: string, itemText: string, isCurrentlyIncluded: boolean) => {
    setServiceDeliverables((prev) => {
      const current = prev[serviceId] || { included: [], excluded: [] };
      if (isCurrentlyIncluded) {
        return {
          ...prev,
          [serviceId]: {
            included: current.included.filter((i) => i !== itemText),
            excluded: [...current.excluded, itemText],
          },
        };
      } else {
        return {
          ...prev,
          [serviceId]: {
            included: [...current.included, itemText],
            excluded: current.excluded.filter((i) => i !== itemText),
          },
        };
      }
    });
  };

  // Add custom deliverable to a service
  const handleAddCustomDeliverable = (serviceId: string) => {
    const text = newDeliverableInput[serviceId]?.trim();
    if (!text) return;
    setServiceDeliverables((prev) => {
      const current = prev[serviceId] || { included: [], excluded: [] };
      return {
        ...prev,
        [serviceId]: {
          ...current,
          included: [...current.included, text],
        },
      };
    });
    setNewDeliverableInput((prev) => ({ ...prev, [serviceId]: "" }));
  };

  const handleRemoveItem = (tempId: string) => {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  // Total calculations
  const totalOneTime = items
    .filter((i) => i.periodicity === "ONE_TIME")
    .reduce((sum, i) => sum + i.totalAmount, 0);

  const totalMonthly = items
    .filter((i) => i.periodicity === "MONTHLY")
    .reduce((sum, i) => sum + i.totalAmount, 0);

  const totalYearly = items
    .filter((i) => i.periodicity === "YEARLY")
    .reduce((sum, i) => sum + i.totalAmount, 0);

  const grossTotal = totalOneTime + totalMonthly + totalYearly;
  const netTotal = Math.max(0, grossTotal - globalDiscount);

  // Apply total negotiated price
  const handleApplyTargetTotal = () => {
    const desired = parseFloat(targetTotal.replace(/\./g, "").replace(",", "."));
    if (isNaN(desired) || desired <= 0 || items.length === 0) return;
    const weights = items.map((i) => i.referenceUnitPrice || i.totalAmount || 1);
    const allocated = allocateTotal(desired, weights);
    setItems((prev) =>
      prev.map((item, idx) => ({
        ...item,
        negotiatedUnitPrice: allocated[idx],
        totalAmount: allocated[idx],
      }))
    );
    setGlobalDiscount(0);
    setTargetTotal("");
  };

  // Submit Proposal
  const handleSubmit = async (sendDirectly = false) => {
    setErrorMessage(null);

    if (recipientType === "LEAD" && !selectedLeadId) {
      setErrorMessage("Por favor, selecione o Lead destinatário.");
      setCurrentStep(1);
      return;
    }
    if (recipientType === "CLIENT" && !selectedClientId) {
      setErrorMessage("Por favor, selecione o Cliente destinatário.");
      setCurrentStep(1);
      return;
    }
    if (!title.trim()) {
      setErrorMessage("Informe um título para a proposta.");
      setCurrentStep(1);
      return;
    }
    if (items.length === 0) {
      setErrorMessage("A proposta deve conter ao menos um serviço ou combo comercial.");
      setCurrentStep(2);
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          title: title.trim(),
          leadId: recipientType === "LEAD" ? selectedLeadId : null,
          clientId: recipientType === "CLIENT" ? selectedClientId : null,
          opportunityId: selectedOpportunityId || null,
          validUntil,
          startLeadTimeDays,
          paymentTerms: paymentTerms.trim(),
          scopeDescription: currentScenario.trim(),
          clientNotes: clientNotes.trim() || null,
          internalNotes: internalNotes.trim() || null,
          diagnostics: {
            currentScenario: currentScenario.trim(),
            partnershipFocus: partnershipFocus.trim(),
            trackingMetrics: trackingMetrics.trim(),
          },
          serviceDeliverables,
          globalDiscount,
          items: items.map((i) => ({
            sourceType: i.sourceType,
            serviceId: i.serviceId!,
            comboId: i.comboId || null,
            comboNameSnapshot: i.sourceType === "COMBO" ? i.name.split(" — ")[0] : null,
            periodicity: i.periodicity,
            quantity: i.quantity,
            negotiatedUnitPrice: i.negotiatedUnitPrice,
            discountAmount: i.discountAmount,
          })),
        };

        const res = await fetch("/api/proposals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Erro ao criar proposta comercial.");
        }

        const created = await res.json();

        if (sendDirectly) {
          await fetch(`/api/proposals/${created.id}/send`, { method: "POST" });
        }

        // Redireciona de volta para o cliente ou lead trabalhado
        if (recipientType === "CLIENT" && selectedClientId) {
          router.push(`/clients/${selectedClientId}?tab=proposals`);
        } else if (recipientType === "LEAD" && selectedLeadId) {
          router.push(`/crm/leads/${selectedLeadId}`);
        } else {
          router.push(`/proposals/${created.id}`);
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Erro inesperado ao salvar proposta.");
      }
    });
  };

  const backHref =
    recipientType === "CLIENT" && selectedClientId
      ? `/clients/${selectedClientId}?tab=proposals`
      : recipientType === "LEAD" && selectedLeadId
      ? `/crm/leads/${selectedLeadId}`
      : "/proposals";

  return (
    <AppShell activeSection="commercial">
      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar para {recipientType === "CLIENT" ? "Cliente" : "Lead"}
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 mt-1 flex items-center gap-2">
              <FileText className="w-6 h-6 text-emerald-600" />
              Nova Proposta Comercial
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Passo a passo estruturado para geração da apresentação de vendas da Otimizza.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isPending || items.length === 0}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-2xs disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Save className="w-4 h-4 text-slate-500" />
              Salvar como Rascunho
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isPending || items.length === 0}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              Emitir e Marcar como Enviada
            </button>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { num: 1, title: "1. Diagnóstico", desc: "Cliente & Cenário Atual" },
              { num: 2, title: "2. Escopo & Serviços", desc: "Checklist de Entregáveis" },
              { num: 3, title: "3. Investimento", desc: "Valores & Condições" },
              { num: 4, title: "4. Prévia & Emissão", desc: "Apresentação em Slides" },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;
              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => setCurrentStep(step.num)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    isActive
                      ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20"
                      : isPast
                      ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      : "bg-white border-slate-200/60 text-slate-400 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isActive ? "text-emerald-700" : isPast ? "text-slate-800" : "text-slate-400"
                      }`}
                    >
                      {step.title}
                    </span>
                    {isPast && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{step.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error / Feedback alerts */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {aiSuccessMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{aiSuccessMessage}</span>
          </div>
        )}

        {/* =========================================================================
            PASSO 1: CLIENTE & DIAGNÓSTICO ESTRATÉGICO
        ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Destinatário & Título */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-5">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <Building className="w-4 h-4 text-emerald-600" />
                Destinatário da Proposta
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tipo de Destinatário
                  </label>
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setRecipientType("CLIENT")}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                        recipientType === "CLIENT"
                          ? "bg-white text-emerald-700 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Cliente da Base
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientType("LEAD")}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                        recipientType === "LEAD"
                          ? "bg-white text-purple-700 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Lead do CRM
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Selecione o {recipientType === "CLIENT" ? "Cliente" : "Lead"} *
                  </label>
                  {recipientType === "CLIENT" ? (
                    <select
                      value={selectedClientId}
                      onChange={(e) => {
                        setSelectedClientId(e.target.value);
                        const cl = clients.find((c) => c.id === e.target.value);
                        if (cl) setTitle(`Proposta Comercial — ${cl.tradeName || cl.name}`);
                      }}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Selecione um cliente...</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.tradeName ? `${c.tradeName} (${c.name})` : c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={selectedLeadId}
                      onChange={(e) => {
                        setSelectedLeadId(e.target.value);
                        const ld = leads.find((l) => l.id === e.target.value);
                        if (ld) setTitle(`Proposta Comercial — ${ld.companyName || ld.name}`);
                      }}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Selecione um lead...</option>
                      {leads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.companyName ? `${l.companyName} — Contato: ${l.name}` : l.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Título da Proposta Comercial *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Proposta Comercial — Assessoria de Marketing e Crescimento"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Cenário Atual Pré-definido + Botão IA */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Cenário Atual da Empresa (Diagnóstico)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Escolha um cenário comum para pré-preencher ou personalize livremente.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAiRefinement}
                  disabled={isAiLoading}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold hover:brightness-105 shadow-sm transition disabled:opacity-50 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  {isAiLoading ? "Ajustando com IA..." : "✨ Ajustar Textos com IA"}
                </button>
              </div>

              {/* Pílulas de Seleção Rápida */}
              <div>
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Opções Rápidas de Cenário:
                </span>
                <div className="flex flex-wrap gap-2">
                  {PREDEFINED_SCENARIOS.map((sc) => {
                    const isSelected = selectedScenarioId === sc.id;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => handleSelectScenario(sc)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                            : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {sc.title}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedScenarioId("custom");
                      setCurrentScenario("");
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
                      selectedScenarioId === "custom"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-600 border-dashed border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    + Criar Outro Cenário
                  </button>
                </div>
              </div>

              {/* Texto do Cenário Atual */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Texto do Slide: Cenário Atual & Desafios Mapeados
                </label>
                <textarea
                  rows={3}
                  value={currentScenario}
                  onChange={(e) => setCurrentScenario(e.target.value)}
                  placeholder="Descreva o momento atual da empresa, desafios e o porquê de buscarem a parceria..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                />
              </div>

              {/* Foco da Parceria & Métricas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    O Foco Desta Parceria (Slide 05)
                  </label>
                  <textarea
                    rows={3}
                    value={partnershipFocus}
                    onChange={(e) => setPartnershipFocus(e.target.value)}
                    placeholder="Objetivo central acordado para a parceria..."
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    O Que Vamos Acompanhar (Métricas & Indicadores)
                  </label>
                  <textarea
                    rows={3}
                    value={trackingMetrics}
                    onChange={(e) => setTrackingMetrics(e.target.value)}
                    placeholder="Métricas como visitas, CPL, contatos gerados via WhatsApp..."
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Navigation Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs"
              >
                Avançar para Serviços & Entregáveis
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            PASSO 2: SERVIÇOS & ENTREGÁVEIS (CHECKLIST GRANULAR)
        ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Seleção de Serviços & Entregáveis Inclusos
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Selecione os serviços avulsos ou combos. Para cada um, marque ou desmarque o que está incluso no escopo.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Seletor de Serviços Avulsos */}
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddService(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="px-3 py-2 text-xs font-semibold bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 hover:bg-emerald-100 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      + Adicionar Serviço Avulso...
                    </option>
                    {availableServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.billingUnit === "MONTHLY" ? "Mensal" : s.billingUnit === "YEARLY" ? "Anual" : "Avulso"}) — R$ {s.defaultPrice.toFixed(2)}
                      </option>
                    ))}
                  </select>

                  {/* Seletor de Combos */}
                  {availableCombos.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddCombo(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="px-3 py-2 text-xs font-semibold bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-800 hover:bg-indigo-100 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        + Adicionar Combo Comercial...
                      </option>
                      {availableCombos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.items.length} itens)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {items.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
                  <Layers className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">Nenhum serviço adicionado ainda</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Use os botões acima para incluir serviços como Criação de WebSite, Tráfego Pago, Social Media, Domínio ou Hospedagem.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {items.map((item, idx) => {
                    const deliverables = item.serviceId ? serviceDeliverables[item.serviceId] : null;
                    const inc = deliverables?.included || [];
                    const exc = deliverables?.excluded || [];

                    return (
                      <div
                        key={item.tempId}
                        className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4 hover:border-slate-300 transition"
                      >
                        {/* Header do Serviço */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                              <span className="text-[11px] text-slate-500 font-medium">
                                Periodicidade:{" "}
                                <strong className="text-slate-700">
                                  {item.periodicity === "MONTHLY"
                                    ? "Mensal"
                                    : item.periodicity === "YEARLY"
                                    ? "Anual"
                                    : "Avulso (até 3x)"}
                                </strong>{" "}
                                • Valor base: R$ {item.totalAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">Valor do Item:</span>
                              <input
                                type="number"
                                min={0}
                                step={10}
                                value={item.totalAmount}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setItems((prev) =>
                                    prev.map((i) =>
                                      i.tempId === item.tempId
                                        ? { ...i, negotiatedUnitPrice: val, totalAmount: val }
                                        : i
                                    )
                                  );
                                }}
                                className="w-24 px-2 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg text-right"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.tempId)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                              title="Remover serviço"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Checklist de Entregáveis */}
                        {item.serviceId && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                Entregáveis & O que será feito:
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Clique para marcar/desmarcar itens do escopo
                              </span>
                            </div>

                            {/* Itens Inclusos */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {inc.map((dText) => (
                                <button
                                  key={dText}
                                  type="button"
                                  onClick={() => handleToggleDeliverable(item.serviceId!, dText, true)}
                                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-emerald-200 text-left hover:bg-emerald-50/50 transition group"
                                >
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                  <span className="text-xs text-slate-800 leading-snug font-medium">
                                    {dText}
                                  </span>
                                </button>
                              ))}

                              {/* Itens Excluídos / Fora de Escopo */}
                              {exc.map((dText) => (
                                <button
                                  key={dText}
                                  type="button"
                                  onClick={() => handleToggleDeliverable(item.serviceId!, dText, false)}
                                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-left hover:bg-slate-200 transition opacity-60"
                                >
                                  <Circle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                  <span className="text-xs text-slate-500 line-through leading-snug">
                                    {dText} (Fora do Escopo)
                                  </span>
                                </button>
                              ))}
                            </div>

                            {/* Adicionar Entregável Customizado */}
                            <div className="flex items-center gap-2 pt-2">
                              <input
                                type="text"
                                placeholder="+ Adicionar item ou entregável específico para este cliente..."
                                value={newDeliverableInput[item.serviceId] || ""}
                                onChange={(e) =>
                                  setNewDeliverableInput((prev) => ({
                                    ...prev,
                                    [item.serviceId!]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddCustomDeliverable(item.serviceId!);
                                  }
                                }}
                                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddCustomDeliverable(item.serviceId!)}
                                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 transition"
                              >
                                Incluir
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Diagnóstico
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                disabled={items.length === 0}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                Avançar para Investimento & Condições
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            PASSO 3: INVESTIMENTO, PRAZOS & CONDIÇÕES
        ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Totalizadores por Periodicidade */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Mensalidade */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Investimento Mensal (Recorrente)
                </span>
                <div className="text-2xl font-bold font-mono text-slate-950">
                  R$ {totalMonthly.toFixed(2)}
                  <span className="text-xs font-normal text-slate-500"> /mês</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  Campanhas de tráfego, gestão de social media e assessoria continuada.
                </p>
              </div>

              {/* Anuidade */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Investimento Anual
                </span>
                <div className="text-2xl font-bold font-mono text-slate-950">
                  R$ {totalYearly.toFixed(2)}
                  <span className="text-xs font-normal text-slate-500"> /ano</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  Infraestrutura de domínio e hospedagem de servidores.
                </p>
              </div>

              {/* Setup / Avulso */}
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-2xs space-y-1">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Setup / Avulso (Até 3x)
                </span>
                <div className="text-2xl font-bold font-mono text-emerald-950">
                  R$ {totalOneTime.toFixed(2)}
                </div>
                {totalOneTime > 0 ? (
                  <p className="text-[11px] font-semibold text-emerald-700 pt-1">
                    ou em até 3x de R$ {(totalOneTime / 3).toFixed(2)} sem juros
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 pt-1">Nenhum serviço avulso selecionado.</p>
                )}
              </div>
            </div>

            {/* Ajuste de Preço Total Negociado */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Negociação do Valor Global
              </h3>
              <p className="text-xs text-slate-600">
                Se você acordou um valor fechado com o cliente para o conjunto de serviços, digite-o abaixo para recalcular proporcionalmente cada item.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="Ex: 2500,00"
                  value={targetTotal}
                  onChange={(e) => setTargetTotal(e.target.value)}
                  className="w-full sm:w-60 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleApplyTargetTotal}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition shadow-2xs w-full sm:w-auto"
                >
                  Distribuir Valor Negociado
                </button>
              </div>
            </div>

            {/* Prazos & Condições */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Prazos & Validade
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Validade da Proposta *
                  </label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Previsão de Início (Dias Úteis após Kickoff)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={startLeadTimeDays}
                    onChange={(e) => setStartLeadTimeDays(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Condições de Pagamento
                </label>
                <textarea
                  rows={2}
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar aos Serviços
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs"
              >
                Avançar para Prévia dos Slides
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            PASSO 4: PRÉVIA DOS SLIDES & EMISSÃO
        ========================================================================= */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-600" />
                    Prévia Visual dos Slides da Apresentação
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Formato horizontal 16:9 no padrão visual executivo da Otimizza Data & Growth.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewSlideIdx((prev) => Math.max(0, prev - 1))}
                    disabled={previewSlideIdx === 0}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-700">
                    Slide {previewSlideIdx + 1} de {7 + items.length}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewSlideIdx((prev) => Math.min(6 + items.length, prev + 1))
                    }
                    disabled={previewSlideIdx >= 6 + items.length}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Moldura do Slide (16:9 Horizontal) */}
              <div className="aspect-[16/9] w-full max-w-4xl mx-auto rounded-2xl overflow-hidden border border-slate-300 shadow-md relative flex flex-col justify-between">
                {/* SLIDE 0: CAPA */}
                {previewSlideIdx === 0 && (
                  <div className="w-full h-full bg-[#05372c] text-white p-8 md:p-12 flex flex-col justify-between relative">
                    <div className="flex items-center justify-between">
                      <Image
                        src="/brand/principal-negativa.png"
                        alt="Otimizza"
                        width={140}
                        height={45}
                        className="h-10 w-auto object-contain"
                      />
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                        DATA & GROWTH • ESTRATÉGIA • RESULTADOS
                      </span>
                    </div>

                    <div className="space-y-3 my-auto">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        PROPOSTA COMERCIAL
                      </span>
                      <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight max-w-xl leading-tight">
                        {title || "Proposta Comercial"}
                      </h2>
                    </div>

                    <div className="border-t border-emerald-900/60 pt-4 flex items-center justify-between text-xs text-emerald-200/80">
                      <div>
                        <span className="text-[10px] uppercase text-emerald-400 block font-bold">
                          Preparada para:
                        </span>
                        <strong className="text-sm text-white">{currentClientName}</strong>
                      </div>
                      <div className="text-right">
                        <span>Validade: {validUntil}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SLIDE 1: DATA & GROWTH */}
                {previewSlideIdx === 1 && (
                  <div className="w-full h-full bg-[#05372c] text-white p-8 md:p-12 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <Image
                        src="/brand/principal-negativa.png"
                        alt="Otimizza"
                        width={120}
                        height={40}
                        className="h-8 w-auto object-contain"
                      />
                      <span className="text-[10px] font-bold text-emerald-400">01 / NOSSA ESSÊNCIA</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center my-auto">
                      <div className="space-y-4">
                        <h2 className="text-3xl md:text-5xl font-black text-emerald-300">Data & Growth</h2>
                        <p className="text-sm md:text-base text-emerald-100/90 leading-relaxed">
                          A Otimizza conecta <strong>análise de dados</strong>, <strong>planejamento de marketing</strong> e <strong>gestão de campanhas</strong> para ajudar sua empresa a identificar oportunidades e direcionar melhor seus investimentos.
                        </p>
                      </div>

                      <div className="p-6 md:p-8 rounded-2xl bg-[#10b981] text-[#05372c] space-y-3 shadow-lg">
                        <h3 className="text-xl md:text-2xl font-black leading-snug">
                          Clareza para decidir. <br />
                          Direção para crescer.
                        </h3>
                        <p className="text-xs md:text-sm leading-relaxed">
                          Nosso trabalho começa pelo entendimento do negócio e continua com prioridades claras, orientação à equipe e acompanhamento dos resultados.
                        </p>
                      </div>
                    </div>

                    <div className="text-[10px] text-emerald-400/60">Otimizza Data & Growth</div>
                  </div>
                )}

                {/* SLIDE 2: QUEM SOMOS */}
                {previewSlideIdx === 2 && (
                  <div className="w-full h-full bg-white text-slate-900 p-8 md:p-12 flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <Image
                        src="/brand/principal-cor.png"
                        alt="Otimizza"
                        width={120}
                        height={40}
                        className="h-8 w-auto object-contain"
                      />
                      <span className="text-[10px] font-bold text-slate-400">02 / POSICIONAMENTO</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center my-auto">
                      <div className="p-6 rounded-2xl bg-[#05372c] text-white space-y-2">
                        <span className="text-xs text-emerald-400 font-bold block">since</span>
                        <div className="text-4xl md:text-5xl font-black">2014.</div>
                        <p className="text-xs text-emerald-200">Criatividade, tecnologia e resultado.</p>
                      </div>

                      <div className="md:col-span-2 space-y-4">
                        <h2 className="text-2xl md:text-3xl font-black text-slate-950">Quem Somos?</h2>
                        <p className="text-sm md:text-base text-slate-600 leading-relaxed">
                          Desde 2014, ajudamos marcas a crescerem no digital com estratégia e propósito. Ao longo desses anos, ampliamos nossa atuação e hoje entregamos soluções completas em Social Media, Tráfego Pago, Website, Sistemas e Produção de Conteúdo, unindo criatividade, tecnologia e dados em cada projeto.
                        </p>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400">Otimizza Data & Growth</div>
                  </div>
                )}

                {/* SLIDE 3: CENÁRIO ATUAL */}
                {previewSlideIdx === 3 && (
                  <div className="w-full h-full bg-white text-slate-900 p-8 md:p-12 flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <Image
                        src="/brand/principal-cor.png"
                        alt="Otimizza"
                        width={120}
                        height={40}
                        className="h-8 w-auto object-contain"
                      />
                      <span className="text-[10px] font-bold text-slate-400">03 / DIAGNÓSTICO</span>
                    </div>

                    <div className="my-auto space-y-4 max-w-2xl">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                        DIAGNÓSTICO ESTRATÉGICO
                      </span>
                      <h2 className="text-2xl md:text-3xl font-black text-slate-950">Cenário Atual</h2>
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-sm md:text-base text-slate-700 leading-relaxed">
                        {currentScenario}
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400">Otimizza Data & Growth</div>
                  </div>
                )}

                {/* SLIDE 4: O FOCO DESTA PARCERIA */}
                {previewSlideIdx === 4 && (
                  <div className="w-full h-full bg-[#05372c] text-white p-8 md:p-12 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <Image
                        src="/brand/principal-negativa.png"
                        alt="Otimizza"
                        width={120}
                        height={40}
                        className="h-8 w-auto object-contain"
                      />
                      <span className="text-[10px] font-bold text-emerald-400">04 / OBJETIVOS</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-auto">
                      <div className="p-6 rounded-2xl bg-[#10b981] text-[#05372c] space-y-2.5">
                        <h4 className="text-xs font-black uppercase tracking-wider">
                          O FOCO DESTA PARCERIA
                        </h4>
                        <p className="text-sm md:text-base font-semibold leading-relaxed">
                          {partnershipFocus}
                        </p>
                      </div>

                      <div className="p-6 rounded-2xl bg-[#0a4d3c] text-white space-y-2.5">
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                          O QUE VAMOS ACOMPANHAR
                        </h4>
                        <p className="text-sm md:text-base text-emerald-50 leading-relaxed">
                          {trackingMetrics}
                        </p>
                      </div>
                    </div>

                    <div className="text-[10px] text-emerald-400/60">Otimizza Data & Growth</div>
                  </div>
                )}

                {/* SLIDES DE CADA SERVIÇO */}
                {previewSlideIdx >= 5 && previewSlideIdx < 5 + items.length && (
                  <div className="w-full h-full bg-white text-slate-900 p-8 md:p-12 flex flex-col justify-between">
                    {(() => {
                      const item = items[previewSlideIdx - 5];
                      const deliv = item.serviceId ? serviceDeliverables[item.serviceId] : null;
                      const inc = deliv?.included || [];
                      return (
                        <>
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <Image
                              src="/brand/principal-cor.png"
                              alt="Otimizza"
                              width={120}
                              height={40}
                              className="h-8 w-auto object-contain"
                            />
                            <span className="text-[10px] font-bold text-slate-400">
                              SERVIÇO {previewSlideIdx - 4}
                            </span>
                          </div>

                          <div className="my-auto space-y-4">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                              ESCOPO & ENTREGÁVEIS
                            </span>
                            <h2 className="text-2xl md:text-3xl font-black text-slate-950">
                              {item.name}
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              {inc.slice(0, 6).map((dText) => (
                                <div
                                  key={dText}
                                  className="flex items-start gap-2 text-xs md:text-sm text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80"
                                >
                                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                  <span>{dText}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-400">Otimizza Data & Growth</div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* SLIDE: COMO TRABALHAMOS */}
                {previewSlideIdx === 5 + items.length && (
                  <div className="w-full h-full bg-white text-slate-900 p-8 md:p-12 flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <Image
                        src="/brand/principal-cor.png"
                        alt="Otimizza"
                        width={120}
                        height={40}
                        className="h-8 w-auto object-contain"
                      />
                      <span className="text-[10px] font-bold text-slate-400">METODOLOGIA</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center my-auto">
                      <div className="space-y-3">
                        <h2 className="text-2xl md:text-3xl font-black text-slate-950">Como Trabalhamos</h2>
                        <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                          Nossa atuação é estruturada em etapas claras, do entendimento do negócio à avaliação contínua dos resultados.
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        {HOW_WE_WORK_STEPS.map((st) => (
                          <div
                            key={st.step}
                            className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950"
                          >
                            <span className="font-bold text-emerald-700 block">
                              {st.step}. {st.title}
                            </span>
                            <span className="text-[11px] text-slate-600">{st.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400">Otimizza Data & Growth</div>
                  </div>
                )}

                {/* SLIDE: INVESTIMENTO */}
                {previewSlideIdx === 6 + items.length && (
                  <div className="w-full h-full bg-[#05372c] text-white p-8 md:p-12 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <Image
                        src="/brand/principal-negativa.png"
                        alt="Otimizza"
                        width={120}
                        height={40}
                        className="h-8 w-auto object-contain"
                      />
                      <span className="text-[10px] font-bold text-emerald-400">INVESTIMENTO</span>
                    </div>

                    <div className="my-auto space-y-6">
                      <h2 className="text-2xl md:text-4xl font-black">Investimento Proposto</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {totalMonthly > 0 && (
                          <div className="p-4 rounded-xl bg-[#10b981] text-[#05372c]">
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              MENSALIDADE
                            </span>
                            <div className="text-xl md:text-2xl font-black font-mono">
                              R$ {totalMonthly.toFixed(2)}
                            </div>
                          </div>
                        )}
                        {totalYearly > 0 && (
                          <div className="p-4 rounded-xl bg-[#0a4d3c] text-white">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                              ANUIDADE
                            </span>
                            <div className="text-xl md:text-2xl font-black font-mono">
                              R$ {totalYearly.toFixed(2)}
                            </div>
                          </div>
                        )}
                        {totalOneTime > 0 && (
                          <div className="p-4 rounded-xl bg-[#0a4d3c] text-white">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                              AVULSO / SETUP
                            </span>
                            <div className="text-xl md:text-2xl font-black font-mono">
                              R$ {totalOneTime.toFixed(2)}
                            </div>
                            <span className="text-[10px] text-emerald-300">ou em até 3x sem juros</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-emerald-400/60">Otimizza Data & Growth</div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Investimento
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-2xs disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4 text-slate-500" />
                  Salvar Rascunho
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={isPending}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {isPending ? "Emitindo Proposta..." : "Emitir Proposta Comercial"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function NewProposalPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="p-8 text-center text-slate-500">
            Carregando criador de proposta comercial...
          </div>
        </AppShell>
      }
    >
      <NewProposalWizard />
    </Suspense>
  );
}
