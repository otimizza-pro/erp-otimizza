"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import {
  FileText,
  ArrowLeft,
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
  HelpCircle,
} from "lucide-react";
import { allocateTotal, servicePeriod } from "@/modules/contracts/billing-plan";
import { ProposalPeriodicity } from "@/modules/proposals/types";

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

function NewProposalForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Mode & Recipient
  const [recipientType, setRecipientType] = useState<"LEAD" | "CLIENT">("CLIENT");
  const [leads, setLeads] = useState<Array<{ id: string; name: string; tradeName?: string | null; companyName?: string | null }>>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string; tradeName?: string | null }>>([]);
  const [opportunities, setOpportunities] = useState<Array<{ id: string; title: string }>>([]);

  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string>("");

  // Metadata
  const [title, setTitle] = useState("");
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().slice(0, 10);
  });
  const [startLeadTimeDays, setStartLeadTimeDays] = useState(5);
  const [paymentTerms, setPaymentTerms] = useState("Cobrança conforme periodicidade de cada serviço. Avulso em até 3x. Vencimentos definidos na aprovação do contrato.");
  const [scopeDescription, setScopeDescription] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [globalDiscount, setGlobalDiscount] = useState(0);

  // Catalogs
  const [availableServices, setAvailableServices] = useState<ServiceOption[]>([]);
  const [availableCombos, setAvailableCombos] = useState<ComboOption[]>([]);

  // Items
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-fill from query params if coming from Lead or Opportunity or Client
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

  // Load Catalogs and Recipient options
  useEffect(() => {
    async function loadData() {
      try {
        const leadIdParam = searchParams.get("leadId");
        const clientIdParam = searchParams.get("clientId");

        const [servicesRes, combosRes, clientsRes, leadsRes] = await Promise.all([
          fetch("/api/services"),
          fetch("/api/combos"),
          fetch("/api/clients?limit=100"),
          fetch("/api/crm/leads?limit=100"),
        ]);

        if (servicesRes.ok) {
          const data = await servicesRes.json();
          setAvailableServices(
            Array.isArray(data)
              ? data.map((s) => ({ id: s.id, name: s.name, defaultPrice: Number(s.defaultPrice ?? s.price ?? s.default_price ?? 0), billingUnit: s.billingUnit || s.billing_unit }))
              : []
          );
        }

        if (combosRes.ok) {
          const data = await combosRes.json();
          setAvailableCombos(
            Array.isArray(data)
              ? data.map((c) => ({
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
          const list = data.clients || [];
          if (clientIdParam && !list.some((c: { id: string }) => c.id === clientIdParam)) {
            try {
              const singleRes = await fetch(`/api/clients/${clientIdParam}`);
              if (singleRes.ok) {
                const single = await singleRes.json();
                if (single && single.id) {
                  list.unshift({ id: single.id, name: single.name, tradeName: single.tradeName });
                }
              }
            } catch {
              // Silencioso
            }
          }
          setClients(list);
          if (clientIdParam) {
            setRecipientType("CLIENT");
            setSelectedClientId(clientIdParam);
          }
        }

        if (leadsRes.ok) {
          const data = await leadsRes.json();
          const list = data.leads || [];
          if (leadIdParam && !list.some((l: { id: string }) => l.id === leadIdParam)) {
            try {
              const singleRes = await fetch(`/api/crm/leads/${leadIdParam}`);
              if (singleRes.ok) {
                const single = await singleRes.json();
                if (single && single.id) {
                  list.unshift({ id: single.id, name: single.name, companyName: single.companyName });
                }
              }
            } catch {
              // Silencioso
            }
          }
          setLeads(list);
          if (leadIdParam) {
            setRecipientType("LEAD");
            setSelectedLeadId(leadIdParam);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar catálogos:", err);
      }
    }
    loadData();
  }, [searchParams]);

  // Load opportunities when recipient changes
  useEffect(() => {
    async function loadOpps() {
      try {
        const param = recipientType === "LEAD" && selectedLeadId ? `leadId=${selectedLeadId}` : selectedClientId ? `clientId=${selectedClientId}` : "";
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

  // Add individual service
  const handleAddService = (serviceId: string) => {
    const s = availableServices.find((x) => x.id === serviceId);
    if (!s) return;

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

    // Adiciona cada componente do combo de forma explícita preservando vínculo com o combo
    const newItems: ItemDraft[] = c.items.map((comp) => {
      const s = availableServices.find((x) => x.id === comp.serviceId);
      const refPrice = s ? s.defaultPrice : comp.componentPrice;
      const negPrice = comp.componentPrice > 0 ? comp.componentPrice : refPrice;
      return {
        tempId: Math.random().toString(36).substring(2, 9),
        sourceType: "COMBO",
        serviceId: comp.serviceId,
        comboId: c.id,
        name: `${c.name}: ${comp.serviceName}`,
        descriptionSnapshot: `${c.name} - ${comp.serviceName}`,
        periodicity: servicePeriod(s?.billingUnit),
        quantity: 1,
        referenceUnitPrice: refPrice,
        negotiatedUnitPrice: negPrice,
        discountAmount: 0,
        totalAmount: negPrice,
      };
    });

    setItems((prev) => [...prev, ...newItems]);
  };

  const handleUpdateItem = (tempId: string, updates: Partial<ItemDraft>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        const merged = { ...item, ...updates };
        const qty = merged.quantity > 0 ? merged.quantity : 1;
        const negPrice = merged.negotiatedUnitPrice >= 0 ? merged.negotiatedUnitPrice : 0;
        const disc = merged.discountAmount >= 0 ? merged.discountAmount : 0;
        const total = Math.max(0, Number((qty * negPrice - disc).toFixed(2)));
        return {
          ...merged,
          quantity: qty,
          negotiatedUnitPrice: negPrice,
          discountAmount: disc,
          totalAmount: total,
        };
      })
    );
  };

  const handleRemoveItem = (tempId: string) => {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  function negotiateTotal(value: number) {
    const prices = allocateTotal(value, items.map(i => i.totalAmount));
    setGlobalDiscount(0);
    setItems(items.map((i,n) => {
      const unitPrice = Math.ceil(Math.round(prices[n] * 100) / i.quantity) / 100;
      const discountAmount = (Math.round(i.quantity * Math.round(unitPrice * 100)) - Math.round(prices[n] * 100)) / 100;
      return {...i, negotiatedUnitPrice: unitPrice, totalAmount: prices[n], discountAmount};
    }));
  }

  // Calculation of segregated subtotals
  const totals = React.useMemo(() => {
    let oneTime = 0;
    let monthly = 0;
    let yearly = 0;

    items.forEach((it) => {
      if (it.periodicity === "ONE_TIME") oneTime += it.totalAmount;
      else if (it.periodicity === "MONTHLY") monthly += it.totalAmount;
      else if (it.periodicity === "YEARLY") yearly += it.totalAmount;
    });

    return {
      subtotalOneTime: Number(oneTime.toFixed(2)),
      subtotalMonthly: Number(monthly.toFixed(2)),
      subtotalYearly: Number(yearly.toFixed(2)),
      effectiveOneTime: Math.max(0, Number((oneTime - (oneTime > 0 ? globalDiscount : 0)).toFixed(2))),
      effectiveMonthly: Number(monthly.toFixed(2)),
      effectiveYearly: Number(yearly.toFixed(2)),
    };
  }, [items, globalDiscount]);

  const handleSubmit = async (e: React.FormEvent, sendDirectly = false) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("O título da proposta é obrigatório.");
      return;
    }

    if (recipientType === "CLIENT" && !selectedClientId) {
      setErrorMessage("Selecione um cliente para vincular a proposta.");
      return;
    }

    if (recipientType === "LEAD" && !selectedLeadId) {
      setErrorMessage("Selecione um lead para vincular a proposta.");
      return;
    }

    if (items.length === 0) {
      setErrorMessage("A proposta deve possuir pelo menos um serviço ou componente.");
      return;
    }

    const payload = {
      title: title.trim(),
      leadId: recipientType === "LEAD" ? selectedLeadId : null,
      clientId: recipientType === "CLIENT" ? selectedClientId : null,
      opportunityId: selectedOpportunityId || null,
      validUntil,
      paymentTerms: paymentTerms.trim() || null,
      startLeadTimeDays: Number(startLeadTimeDays) || 0,
      scopeDescription: scopeDescription.trim() || null,
      clientNotes: clientNotes.trim() || null,
      internalNotes: internalNotes.trim() || null,
      globalDiscount: Number(globalDiscount) || 0,
      items: items.map((it, idx) => ({
        sourceType: it.sourceType,
        serviceId: it.serviceId || null,
        comboId: it.comboId || null,
        descriptionSnapshot: it.name,
        periodicity: it.periodicity,
        quantity: it.quantity,
        referenceUnitPrice: it.referenceUnitPrice,
        negotiatedUnitPrice: it.negotiatedUnitPrice,
        discountAmount: it.discountAmount,
        displayOrder: idx + 1,
      })),
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/proposals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Falha ao criar proposta comercial.");
        }

        const created = await res.json();

        if (sendDirectly) {
          await fetch(`/api/proposals/${created.id}/send`, { method: "POST" });
        }

        router.push(`/proposals/${created.id}`);
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Erro desconhecido.");
      }
    });
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);
  };

  return (
    <AppShell activeSection="proposals">
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">A proposta será uma apresentação horizontal com a logo da Otimizza, capa, serviços, implantação e investimento. Preencha a seção “Apresentação na proposta” no cadastro de cada serviço para incluir seu conteúdo e imagem.</div>
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              href="/proposals"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nova Proposta Comercial</h1>
              <p className="text-sm text-slate-500">Configure o destinatário, selecione itens do catálogo e defina condições.</p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Não foi possível criar a proposta</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          {/* 1. Destinatário & Oportunidade */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              1. Destinatário Comercial
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Tipo de Destinatário</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientType("CLIENT");
                      setSelectedLeadId("");
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-2 transition-all ${
                      recipientType === "CLIENT"
                        ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    Cliente Cadastrado
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientType("LEAD");
                      setSelectedClientId("");
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-2 transition-all ${
                      recipientType === "LEAD"
                        ? "bg-amber-50 border-amber-500 text-amber-700 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    Lead do CRM
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {recipientType === "CLIENT" ? "Selecione o Cliente *" : "Selecione o Lead *"}
                </label>
                {recipientType === "CLIENT" ? (
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Selecione um cliente...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.tradeName ? `(${c.tradeName})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedLeadId}
                    onChange={(e) => setSelectedLeadId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Selecione um lead...</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} {l.tradeName || l.companyName ? `(${l.tradeName || l.companyName})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Oportunidade Vinculada Opcional */}
            {opportunities.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                  Vincular a Oportunidade Comercial (Opcional)
                </label>
                <select
                  value={selectedOpportunityId}
                  onChange={(e) => setSelectedOpportunityId(e.target.value)}
                  className="w-full sm:w-1/2 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Nenhuma oportunidade vinculada</option>
                  {opportunities.map((opp) => (
                    <option key={opp.id} value={opp.id}>
                      {opp.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. Informações Gerais da Proposta */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              2. Dados da Proposta
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Título da Proposta *</label>
                <input
                  type="text"
                  placeholder="Ex: Gestão de Tráfego Pago & Redes Sociais"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Validade da Proposta *</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Condições de Pagamento</label>
                <input
                  type="text"
                  placeholder="Ex: Boleto bancário ou PIX até o dia 10 de cada mês"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Prazo de Início (dias úteis)</label>
                <input
                  type="number"
                  min="0"
                  value={startLeadTimeDays}
                  onChange={(e) => setStartLeadTimeDays(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Escopo do Projeto & Entregáveis</label>
              <textarea
                rows={3}
                placeholder="Descreva detalhadamente o escopo que será apresentado no documento da proposta..."
                value={scopeDescription}
                onChange={(e) => setScopeDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 3. Catálogo de Itens & Precificação */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-600" />
                3. Itens, Serviços & Precificação Negociada
              </h2>

              <div className="flex items-center gap-2">
                {/* Add Service Selector */}
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddService(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  defaultValue=""
                >
                  <option value="" disabled>
                    + Adicionar Serviço Avulso...
                  </option>
                  {availableServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatBRL(s.defaultPrice)})
                    </option>
                  ))}
                </select>

                {items.length > 1 && <label className="text-sm">Total negociado dos serviços selecionados<input aria-label="Total negociado" type="number" min="0" step="0.01" className="border rounded p-2 mx-2" defaultValue="" placeholder="Informe o valor e saia do campo" onBlur={e => { if(e.target.value && Number(e.target.value)>=0) negotiateTotal(Number(e.target.value)); }} /><span className="block text-xs text-slate-500">Rateado entre os serviços; mensal, anual e avulso continuam discriminados. Avulso: até 3x na aprovação do contrato.</span></label>}
                {/* Add Combo Selector */}
                {availableCombos.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddCombo(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="px-2.5 py-1.5 text-xs font-medium bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">Nenhum item adicionado à proposta</p>
                <p className="text-xs text-slate-500 mt-1">
                  Selecione serviços avulsos ou combos comerciais nos seletores acima para compor a proposta.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="hidden sm:grid grid-cols-12 gap-3 px-3 text-xs font-semibold text-slate-500 uppercase">
                  <span className="col-span-4">Item / Serviço</span>
                  <span className="col-span-2">Periodicidade</span>
                  <span className="col-span-1 text-center">Qtd</span>
                  <span className="col-span-2 text-right">Preço Negociado</span>
                  <span className="col-span-2 text-right">Subtotal</span>
                  <span className="col-span-1 text-center">Ações</span>
                </div>

                {items.map((item) => (
                  <div
                    key={item.tempId}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                  >
                    <div className="sm:col-span-4">
                      <div className="flex items-center gap-1.5">
                        {item.sourceType === "COMBO" ? (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-800 rounded">
                            Combo
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700 rounded">
                            Serviço
                          </span>
                        )}
                        <span className="text-sm font-semibold text-slate-900 truncate">{item.name}</span>
                      </div>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        Ref: {formatBRL(item.referenceUnitPrice)}
                      </span>
                    </div>

                    <div className="sm:col-span-2">
                      <select
                        value={item.periodicity}
                        onChange={(e) =>
                          handleUpdateItem(item.tempId, {
                            periodicity: e.target.value as ProposalPeriodicity,
                          })
                        }
                        className="w-full text-xs py-1.5 px-2 bg-white border border-slate-200 rounded-md text-slate-800"
                      >
                        <option value="MONTHLY">Mensal</option>
                        <option value="ONE_TIME">Avulso / Implantação</option>
                        <option value="YEARLY">Anual</option>
                      </select>
                    </div>

                    <div className="sm:col-span-1">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItem(item.tempId, {
                            quantity: parseInt(e.target.value, 10) || 1,
                          })
                        }
                        className="w-full text-center text-xs py-1.5 px-1 bg-white border border-slate-200 rounded-md text-slate-800"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-xs text-slate-400">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.negotiatedUnitPrice}
                          onChange={(e) =>
                            handleUpdateItem(item.tempId, {
                              negotiatedUnitPrice: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full text-right text-xs py-1.5 pl-6 pr-2 bg-white border border-slate-200 rounded-md font-medium text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2 text-right">
                      <span className="text-sm font-bold text-slate-900">{formatBRL(item.totalAmount)}</span>
                      <span className="text-[11px] text-slate-400 block">
                        {item.periodicity === "MONTHLY"
                          ? "/mês"
                          : item.periodicity === "YEARLY"
                          ? "/ano"
                          : "(único)"}
                      </span>
                    </div>

                    <div className="sm:col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.tempId)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                        title="Remover Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totals Summary Segregated by Periodicity */}
            {items.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-200 bg-slate-50/80 p-4 rounded-xl">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                      Total Avulso / Implantação
                    </p>
                    <p className="text-lg font-bold text-amber-700 mt-1">{formatBRL(totals.subtotalOneTime)}</p>
                    <p className="text-[11px] text-slate-400">Pagamento avulso em até 3x</p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                      Total Recorrente Mensal
                    </p>
                    <p className="text-lg font-bold text-indigo-700 mt-1">{formatBRL(totals.subtotalMonthly)}</p>
                    <p className="text-[11px] text-slate-400">Assinatura mensal contínua</p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Total Anual</p>
                    <p className="text-lg font-bold text-purple-700 mt-1">{formatBRL(totals.subtotalYearly)}</p>
                    <p className="text-[11px] text-slate-400">Serviços com ciclo anual</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Observações Internas e Externas */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-900">4. Observações & Termos Adicionais</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Observações ao Cliente (Visíveis no PDF)
                </label>
                <textarea
                  rows={3}
                  placeholder="Informações adicionais que aparecerão no rodapé da proposta oficial..."
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                  Notas Internas da Agência (Confidencial)
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                    Não sai no PDF
                  </span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Estratégia comercial, alinhamentos da reunião, margem pretendida..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Link
              href="/proposals"
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isPending ? "Salvando Proposta..." : "Salvar como Rascunho"}
            </button>
          </div>
        </form>
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
            Carregando formulário de proposta comercial...
          </div>
        </AppShell>
      }
    >
      <NewProposalForm />
    </Suspense>
  );
}
