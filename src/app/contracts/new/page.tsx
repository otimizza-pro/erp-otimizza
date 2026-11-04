"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Layers,
  Save,
  Info,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { ContractBillingPeriod, ContractItemInput } from "@/modules/contracts/types";
import { ProposalRecord } from "@/modules/proposals/types";
import { Autocomplete, AutocompleteOption } from "@/components/ui/autocomplete";
import { CurrencyInput } from "@/components/ui/currency-input";
import { formatMoney } from "@/shared/money";

interface ClientOption {
  id: string;
  name: string;
  tradeName?: string | null;
  document?: string | null;
}

interface ServiceOption {
  id: string;
  name: string;
  defaultPrice: number;
  defaultCost: number;
  billingUnit: string;
  defaultSupplierId?: string | null;
  defaultSupplierName?: string | null;
  defaultCostPeriodicity?: "ONE_TIME" | "MONTHLY" | "YEARLY" | "UNCLASSIFIED";
}

interface ComboOption {
  id: string;
  name: string;
  totalPrice: number;
  items?: Array<{
    serviceId: string;
    serviceName: string;
    componentPrice: number;
  }>;
}

function NewContractFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get("clientId") || "";
  const initialProposalId = searchParams.get("proposalId") || "";

  // Dados para seleção
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [combos, setCombos] = useState<ComboOption[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Dados de vínculo com Proposta Comercial
  const [proposalId, setProposalId] = useState(initialProposalId);
  const [proposalCode, setProposalCode] = useState("");
  const [proposalInfo, setProposalInfo] = useState<{
    code: string;
    title: string;
    recipientName: string;
    versionNumber: number;
  } | null>(null);

  // Formulário do contrato
  const [clientId, setClientId] = useState(initialClientId);
  const [clientName, setClientName] = useState("");
  const [clientOptions, setClientOptions] = useState<AutocompleteOption[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [billingPeriod, setBillingPeriod] = useState<ContractBillingPeriod>("MONTHLY");
  const [dueDay, setDueDay] = useState<number>(10);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [isIndefinite, setIsIndefinite] = useState(true);
  const [notes, setNotes] = useState("");

  // Itens da contratação
  const [items, setItems] = useState<ContractItemInput[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [cRes, sRes, cbRes, pRes] = await Promise.all([
          fetch("/api/clients?limit=100&status=ACTIVE"),
          fetch("/api/services?status=ACTIVE"),
          fetch("/api/combos?status=ACTIVE"),
          initialProposalId ? fetch(`/api/proposals/${initialProposalId}`) : Promise.resolve(null),
        ]);

        let loadedClients: ClientOption[] = [];
        let loadedServices: ServiceOption[] = [];

        if (cRes.ok) {
          const cData = await cRes.json();
          loadedClients = Array.isArray(cData) ? cData : (cData.clients || []);
        }

        if (sRes.ok) {
          const sData = await sRes.json();
          loadedServices = Array.isArray(sData) ? sData : (sData.services || []);
          setServices(loadedServices);
        }

        if (cbRes.ok) {
          const cbData = await cbRes.json();
          const list: ComboOption[] = Array.isArray(cbData) ? cbData : (cbData.combos || []);
          setCombos(list);
        }

        // Se houver clientId direto na URL, carregar se não estiver na lista inicial
        if (initialClientId && !loadedClients.some((c) => c.id === initialClientId)) {
          try {
            const singleRes = await fetch(`/api/clients/${initialClientId}`);
            if (singleRes.ok) {
              const single = await singleRes.json();
              if (single && single.id) {
                loadedClients.unshift({
                  id: single.id,
                  name: single.name,
                  tradeName: single.tradeName,
                  document: single.document,
                });
              }
            }
          } catch {
            // Silencioso
          }
        }

        // Se vier de uma Proposta Comercial (Cliente fechou proposta)
        if (pRes && pRes.ok) {
          const propData: ProposalRecord = await pRes.json();
          setProposalId(propData.id);
          setProposalCode(propData.proposalCode);

          const activeVer =
            propData.versions?.find((v) => v.versionNumber === propData.approvedVersionNumber) ||
            propData.currentVersion ||
            propData.versions?.[0];

          setProposalInfo({
            code: propData.proposalCode,
            title: propData.title,
            recipientName: propData.recipientName || "Cliente",
            versionNumber: activeVer?.versionNumber || propData.currentVersionNumber || 1,
          });

          // 1. Resolver Cliente da proposta (converte lead caso não tenha clientId ainda)
          let targetClientId = propData.clientId || "";
          let targetClientName = propData.recipientName || "";

          if (!targetClientId && propData.leadId) {
            try {
              const convRes = await fetch(`/api/crm/leads/${propData.leadId}/convert`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "NEW_CLIENT" }),
              });
              if (convRes.ok) {
                const convData = await convRes.json();
                if (convData.client) {
                  targetClientId = convData.client.id;
                  targetClientName = convData.client.name;
                  loadedClients.unshift({
                    id: convData.client.id,
                    name: convData.client.name,
                    tradeName: convData.client.tradeName,
                    document: convData.client.document,
                  });
                }
              }
            } catch (err) {
              console.error("Erro ao converter lead em cliente:", err);
            }
          }

          if (targetClientId) {
            setClientId(targetClientId);
            setClientName(targetClientName);
            if (!loadedClients.some((c) => c.id === targetClientId)) {
              loadedClients.unshift({
                id: targetClientId,
                name: targetClientName,
              });
            }
          }

          // 2. Preencher título baseado na proposta
          setTitle(propData.title || `Contrato - ${propData.proposalCode}`);

          // 3. Preencher descrição / escopo
          const scope = activeVer?.commercialTermsSnapshot?.scopeDescription || "";
          setDescription(scope);

          // 4. Preencher notas com termos comerciais e referência da proposta
          const terms = activeVer?.commercialTermsSnapshot?.paymentTerms || "";
          const clientNotes = activeVer?.commercialTermsSnapshot?.clientNotes || "";
          const notesCombined = [
            `Proposta de referência: ${propData.proposalCode} (v${activeVer?.versionNumber || 1})`,
            terms ? `Termos: ${terms}` : "",
            clientNotes ? `Observações do cliente: ${clientNotes}` : "",
          ]
            .filter(Boolean)
            .join("\n");
          setNotes(notesCombined);

          // 5. Periodicidade
          if (activeVer && activeVer.totalYearlyEffective > 0 && activeVer.totalMonthlyEffective === 0) {
            setBillingPeriod("YEARLY");
          } else if (activeVer && activeVer.totalOneTimeEffective > 0 && activeVer.totalMonthlyEffective === 0) {
            setBillingPeriod("ONE_TIME");
          } else {
            setBillingPeriod("MONTHLY");
          }

          // 6. Preencher itens da proposta de forma customizável
          if (activeVer && activeVer.items && activeVer.items.length > 0) {
            const prefilledItems: ContractItemInput[] = [];

            for (const item of activeVer.items) {
              const svc =
                loadedServices.find((s) => s.id === item.serviceId) ||
                loadedServices.find(
                  (s) => s.name.toLowerCase() === (item.descriptionSnapshot || "").toLowerCase()
                );

              if (svc) {
                prefilledItems.push({
                  serviceId: svc.id,
                  serviceName: item.descriptionSnapshot || svc.name,
                  comboId: item.comboId || null,
                  comboName: item.comboId ? (item.descriptionSnapshot || null) : null,
                  supplierId: svc.defaultSupplierId || null,
                  supplierNameSnapshot: svc.defaultSupplierName || null,
                  costPeriodicity: svc.defaultCostPeriodicity || "MONTHLY",
                  quantity: item.quantity || 1,
                  unitPrice: item.negotiatedUnitPrice ?? item.referenceUnitPrice ?? svc.defaultPrice ?? 0,
                  unitCost: svc.defaultCost || 0,
                });
              } else if (item.serviceId) {
                prefilledItems.push({
                  serviceId: item.serviceId,
                  serviceName: item.descriptionSnapshot || "Serviço",
                  comboId: item.comboId || null,
                  comboName: item.comboId ? (item.descriptionSnapshot || null) : null,
                  supplierId: null,
                  supplierNameSnapshot: null,
                  costPeriodicity: "MONTHLY",
                  quantity: item.quantity || 1,
                  unitPrice: item.negotiatedUnitPrice ?? item.referenceUnitPrice ?? 0,
                  unitCost: 0,
                });
              } else if (loadedServices.length > 0) {
                const fallbackSvc = loadedServices[0];
                prefilledItems.push({
                  serviceId: fallbackSvc.id,
                  serviceName: item.descriptionSnapshot || fallbackSvc.name,
                  comboId: item.comboId || null,
                  comboName: item.comboId ? (item.descriptionSnapshot || null) : null,
                  supplierId: fallbackSvc.defaultSupplierId || null,
                  supplierNameSnapshot: fallbackSvc.defaultSupplierName || null,
                  costPeriodicity: fallbackSvc.defaultCostPeriodicity || "MONTHLY",
                  quantity: item.quantity || 1,
                  unitPrice: item.negotiatedUnitPrice ?? item.referenceUnitPrice ?? fallbackSvc.defaultPrice,
                  unitCost: fallbackSvc.defaultCost || 0,
                });
              }
            }

            if (prefilledItems.length > 0) {
              setItems(prefilledItems);
            }
          }
        } else if (initialClientId) {
          const found = loadedClients.find((c) => c.id === initialClientId);
          if (found) {
            setClientId(found.id);
            setClientName(found.name);
          }
        }

        setClients(loadedClients);
        const opts: AutocompleteOption[] = loadedClients.map((c) => ({
          id: c.id,
          label: c.name,
          sublabel: c.tradeName ? `Fantasia: ${c.tradeName}` : null,
        }));
        setClientOptions(opts);
      } catch (err) {
        console.error("Erro ao carregar catálogo, clientes e proposta:", err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, [initialClientId, initialProposalId]);

  // Adicionar serviço avulso
  const handleAddService = (serviceId: string) => {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;

    setItems((prev) => [
      ...prev,
      {
        serviceId: svc.id,
        serviceName: svc.name,
        supplierId: svc.defaultSupplierId || null,
        supplierNameSnapshot: svc.defaultSupplierName || null,
        costPeriodicity: svc.defaultCostPeriodicity || "MONTHLY",
        quantity: 1,
        unitPrice: svc.defaultPrice,
        unitCost: svc.defaultCost,
      },
    ]);
  };

  // Importar itens de um Combo cadastrado
  const handleAddCombo = async (comboId: string) => {
    const combo = combos.find((c) => c.id === comboId);
    if (!combo) return;

    try {
      const res = await fetch(`/api/combos/${comboId}`);
      if (res.ok) {
        const fullCombo = await res.json();
        const newItems: ContractItemInput[] = (fullCombo.items || []).map(
          (ci: { serviceId: string; serviceName?: string; componentPrice: number }) => {
            const originalService = services.find((s) => s.id === ci.serviceId);
            return {
              serviceId: ci.serviceId,
              serviceName: ci.serviceName || originalService?.name || "Serviço",
              comboId: fullCombo.id,
              comboName: fullCombo.name,
              supplierId: originalService?.defaultSupplierId || null,
              supplierNameSnapshot: originalService?.defaultSupplierName || null,
              costPeriodicity: originalService?.defaultCostPeriodicity || "MONTHLY",
              quantity: 1,
              unitPrice: ci.componentPrice,
              unitCost: originalService?.defaultCost || 0,
            };
          }
        );

        setItems((prev) => [...prev, ...newItems]);
      }
    } catch (err) {
      console.error("Erro ao carregar componentes do combo:", err);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (
    index: number,
    field: "unitPrice" | "unitCost" | "quantity",
    value: number
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };
      return copy;
    });
  };

  // Cálculo dinâmico do total contratado
  const totalAmount = items.reduce(
    (acc, it) => acc + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
    0
  );

  const totalCost = items.reduce(
    (acc, it) => acc + (Number(it.quantity) || 1) * (Number(it.unitCost) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!clientId) {
      setErrorMsg("Selecione o cliente contratante.");
      return;
    }
    if (!title.trim()) {
      setErrorMsg("Informe o título da contratação.");
      return;
    }
    if (items.length === 0) {
      setErrorMsg("Adicione pelo menos um serviço ou combo à contratação.");
      return;
    }
    if (!isIndefinite && !endDate) {
      setErrorMsg("Para vigência determinada, informe a data de término.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          proposalId: proposalId || undefined,
          proposalCode: proposalCode || undefined,
          title: title.trim(),
          description: description.trim() || undefined,
          billingPeriod,
          dueDay: Number(dueDay),
          startDate,
          endDate: isIndefinite ? null : endDate,
          isIndefinite,
          notes: notes.trim() || undefined,
          items,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao registrar contratação.");
      }

      const created = await res.json();
      router.push(`/contracts/${created.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao salvar contratação.";
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell activeSection="contracts">
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link
            href="/contracts"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Assinaturas
          </Link>
        </div>

        {/* Title */}
        <div className="border-b border-zinc-200 pb-4">
          <span className="text-xs font-mono font-medium text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Financeiro • Nova Assinatura
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mt-2">
            Nova Assinatura de Serviços & Planos
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Defina o cliente, regras de recorrência e vigência, dia de vencimento e componha os serviços com preços e custos customizados.
          </p>
        </div>

        {proposalInfo && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                  Cliente fechou a proposta!
                  <span className="px-2 py-0.5 bg-emerald-200/80 text-emerald-900 text-xs rounded-full font-mono font-bold">
                    {proposalInfo.code}
                  </span>
                </h3>
                <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                  Os dados da proposta <strong>{proposalInfo.title}</strong> (destinada a {proposalInfo.recipientName}) foram pré-preenchidos automaticamente abaixo.
                  Você pode alterar qualquer informação (valores, quantidades, prazos, itens) livremente. Ao final, clique em{" "}
                  <strong>Salvar Contratação</strong>.
                </p>
              </div>
            </div>
            <Link
              href={`/proposals/${proposalId}`}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline shrink-0 mt-0.5"
              target="_blank"
            >
              Ver proposta
            </Link>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card: Dados Gerais */}
          <div className="bg-white p-6 rounded-xl border border-zinc-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-zinc-500" />
              Identificação & Cliente
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Cliente Contratante *
                </label>
                <Autocomplete
                  value={clientName}
                  selectedId={clientId}
                  onChange={(val, opt) => {
                    setClientName(val);
                    setClientId(opt?.id || "");
                  }}
                  options={clientOptions}
                  placeholder="Digite para buscar cliente..."
                  required
                  allowCustom={false}
                  disabled={loadingInitial || saving}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Título da Assinatura *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Gestão Contínua de Tráfego e SEO"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Descrição / Objeto do Contrato
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalhes do escopo e objetivos acordados..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                />
              </div>
            </div>
          </div>

          {/* Card: Vigência e Periodicidade */}
          <div className="bg-white p-6 rounded-xl border border-zinc-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              Vigência & Recorrência
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Periodicidade *
                </label>
                <select
                  value={billingPeriod}
                  onChange={(e) => setBillingPeriod(e.target.value as ContractBillingPeriod)}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                >
                  <option value="MONTHLY">Mensal</option>
                  <option value="YEARLY">Anual</option>
                  <option value="ONE_TIME">Avulsa / Pontual</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Dia de Vencimento (1 a 31) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={(e) => setDueDay(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                  required
                />
                <span className="text-[10px] text-zinc-400">
                  Meses curtos ajustam automaticamente para o último dia.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Data de Início *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-zinc-700">
                    Data de Término
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isIndefinite}
                      onChange={(e) => setIsIndefinite(e.target.checked)}
                      className="rounded border-zinc-300"
                    />
                    Indeterminada
                  </label>
                </div>
                <input
                  type="date"
                  disabled={isIndefinite}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none ${
                    isIndefinite
                      ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed"
                      : "bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-zinc-900/10"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Card: Composição de Serviços e Combos Personalizados */}
          <div className="bg-white p-6 rounded-xl border border-zinc-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-zinc-500" />
                  Serviços Contratados & Combos
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Adicione serviços individuais ou selecione combos com preços negociados e custos customizados.
                </p>
              </div>

              {/* Botões de Adicionar */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddService(e.target.value);
                    }
                  }}
                  disabled={services.length === 0}
                  className="px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg hover:bg-zinc-100 cursor-pointer font-medium text-zinc-700 disabled:opacity-50"
                >
                  <option value="" disabled>
                    + Adicionar Serviço {services.length > 0 ? `(${services.length})` : "(0 cadastrados)"}
                  </option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatMoney(s.defaultPrice)})
                    </option>
                  ))}
                </select>

                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddCombo(e.target.value);
                    }
                  }}
                  disabled={combos.length === 0}
                  className="px-3 py-1.5 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg hover:bg-emerald-100 cursor-pointer font-medium disabled:opacity-50"
                >
                  <option value="" disabled>
                    + Importar Combo {combos.length > 0 ? `(${combos.length})` : "(0 cadastrados)"}
                  </option>
                  {combos.map((cb) => (
                    <option key={cb.id} value={cb.id}>
                      {cb.name} (Total: {formatMoney(cb.totalPrice)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                <p className="text-zinc-600 text-xs font-medium">Nenhum componente incluído ainda.</p>
                <p className="text-zinc-400 text-[11px] mt-1">
                  Selecione serviços ou importe um combo acima para compor a contratação.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-medium">
                    <tr>
                      <th className="px-4 py-2.5">Serviço / Origem</th>
                      <th className="px-4 py-2.5 w-24">Qtd</th>
                      <th className="px-4 py-2.5 w-36">Preço Negociado</th>
                      <th className="px-4 py-2.5 w-36">Custo Específico</th>
                      <th className="px-4 py-2.5 w-32 text-right">Subtotal</th>
                      <th className="px-4 py-2.5 w-12 text-center">Excluir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/50">
                        <td className="px-4 py-3">
                          <span className="font-semibold text-zinc-900 block">
                            {it.serviceName}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            {it.comboName && (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 inline-block">
                                Do {it.comboName}
                              </span>
                            )}
                            {it.supplierNameSnapshot && (
                              <span className="text-[10px] text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200 inline-block">
                                Forn: {it.supplierNameSnapshot}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={it.quantity}
                            onChange={(e) =>
                              handleUpdateItem(idx, "quantity", Number(e.target.value))
                            }
                            className="w-16 px-2 py-1 bg-zinc-50 border border-zinc-200 rounded text-xs focus:bg-white"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <CurrencyInput
                            value={it.unitPrice}
                            onChangeValue={(val) => handleUpdateItem(idx, "unitPrice", val)}
                            className="w-28 py-1 bg-zinc-50 border border-zinc-200 rounded text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <CurrencyInput
                            value={it.unitCost}
                            onChangeValue={(val) => handleUpdateItem(idx, "unitCost", val)}
                            className="w-28 py-1 bg-zinc-50 border border-zinc-200 rounded text-xs text-zinc-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-zinc-900">
                          {formatMoney((it.quantity || 1) * (it.unitPrice || 0))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-zinc-400 hover:text-rose-600 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totalizadores */}
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <div className="text-xs text-zinc-500">
                <span>Custo Total Operacional Estimado: </span>
                <span className="font-semibold text-zinc-700">
                  {formatMoney(totalCost)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-500 uppercase tracking-wider block">
                  Valor Contratado Total (Soma dos Itens)
                </span>
                <span className="text-xl font-bold text-zinc-950">
                  {formatMoney(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
            <Link
              href="/contracts"
              className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Salvando Assinatura..." : "Salvar e Ativar Assinatura"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

export default function NewContractPage() {
  return (
    <Suspense
      fallback={
        <AppShell activeSection="contracts">
          <div className="p-12 text-center text-xs text-zinc-400">Carregando formulário...</div>
        </AppShell>
      }
    >
      <NewContractFormContent />
    </Suspense>
  );
}

