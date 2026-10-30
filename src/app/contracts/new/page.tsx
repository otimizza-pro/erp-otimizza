"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { ContractBillingPeriod, ContractItemInput } from "@/modules/contracts/types";
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

export default function NewContractPage() {
  const router = useRouter();

  // Dados para seleção
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [combos, setCombos] = useState<ComboOption[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Formulário do contrato
  const [clientId, setClientId] = useState("");
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
        const [cRes, sRes, cbRes] = await Promise.all([
          fetch("/api/clients?limit=100&status=ACTIVE"),
          fetch("/api/services?status=ACTIVE"),
          fetch("/api/combos?status=ACTIVE"),
        ]);
        if (cRes.ok) {
          const cData = await cRes.json();
          const list: ClientOption[] = Array.isArray(cData) ? cData : (cData.clients || []);
          setClients(list);
          const opts: AutocompleteOption[] = list.map((c) => ({
            id: c.id,
            label: c.name,
            sublabel: c.tradeName ? `Fantasia: ${c.tradeName}` : null,
          }));
          setClientOptions(opts);
        }
        if (sRes.ok) {
          const sData = await sRes.json();
          const list: ServiceOption[] = Array.isArray(sData) ? sData : (sData.services || []);
          setServices(list);
        }
        if (cbRes.ok) {
          const cbData = await cbRes.json();
          const list: ComboOption[] = Array.isArray(cbData) ? cbData : (cbData.combos || []);
          setCombos(list);
        }
      } catch (err) {
        console.error("Erro ao carregar catálogo e clientes:", err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

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
            Voltar para Contratações
          </Link>
        </div>

        {/* Title */}
        <div className="border-b border-zinc-200 pb-4">
          <span className="text-xs font-mono font-medium text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Contratos • Formalização de Contrato
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mt-2">
            Nova Contratação de Serviços
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Defina o cliente, regras de vigência, dia de vencimento e componha os serviços com preços e custos customizados.
          </p>
        </div>

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
                  Título da Contratação *
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
              {saving ? "Salvando Contrato..." : "Salvar e Ativar Contratação"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
