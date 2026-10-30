"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { SupplierRecord, SupplierPayableItem, SupplierContractedServiceItem } from "@/modules/suppliers/types";
import {
  Truck,
  ArrowLeft,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Archive,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Layers,
  Calendar,
} from "lucide-react";
import { formatDocument, validateDocument } from "@/shared/cpf-cnpj";

const SUPPLIER_CATEGORIES = [
  "Infraestrutura & Cloud",
  "SaaS & Softwares",
  "Consultoria & Assessoria",
  "Terceirização & Mão de Obra",
  "Jurídico & Contábil",
  "Marketing & Tráfego",
  "Equipamentos & Hardware",
  "Telecomunicação & Internet",
  "Geral / Outros",
];

export default function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [supplier, setSupplier] = useState<SupplierRecord | null>(null);
  const [payables, setPayables] = useState<SupplierPayableItem[]>([]);
  const [contractedServices, setContractedServices] = useState<SupplierContractedServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "payables" | "contracts">("details");

  // Form edit state
  const [formData, setFormData] = useState<Partial<SupplierRecord>>({});

  const loadSupplierData = async () => {
    setLoading(true);
    try {
      const [supRes, payRes, conRes] = await Promise.all([
        fetch(`/api/suppliers/${id}`),
        fetch(`/api/analytics/suppliers?type=payables&supplierId=${id}`),
        fetch(`/api/analytics/suppliers?type=contracted&supplierId=${id}`),
      ]);

      if (!supRes.ok) throw new Error("Fornecedor não encontrado.");
      const supData = await supRes.json();
      setSupplier(supData);
      setFormData(supData);

      if (payRes.ok) setPayables(await payRes.json());
      if (conRes.ok) setContractedServices(await conRes.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados do fornecedor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupplierData();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.name?.trim()) {
      setError("Razão social ou nome é obrigatório.");
      return;
    }

    if (formData.document?.trim() && !validateDocument(formData.document.trim())) {
      setError("Documento informado é inválido.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao atualizar dados.");
      }

      const updated = await res.json();
      setSupplier(updated);
      setFormData(updated);
      setSuccess("Cadastro do fornecedor atualizado com sucesso!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro na atualização.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!supplier) return;
    const action = supplier.status === "ACTIVE" ? "archive" : "reactivate";
    const msg =
      action === "archive"
        ? "Deseja arquivar este fornecedor? Ele não poderá ser selecionado em novos custos."
        : "Deseja reativar este fornecedor?";

    if (!confirm(msg)) return;

    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao alterar status.");
        return;
      }
      await loadSupplierData();
    } catch (e) {
      alert("Erro na operação.");
    }
  };

  if (loading) {
    return (
      <AppShell activeSection="suppliers">
        <div className="py-24 text-center text-xs text-zinc-400">
          Carregando dados do fornecedor...
        </div>
      </AppShell>
    );
  }

  if (!supplier) {
    return (
      <AppShell activeSection="suppliers">
        <div className="py-12 text-center space-y-3">
          <p className="text-sm font-semibold text-zinc-800">Fornecedor não encontrado</p>
          <Link
            href="/suppliers"
            className="inline-block px-4 py-2 rounded-full bg-zinc-900 text-white text-xs font-semibold"
          >
            Voltar para Fornecedores
          </Link>
        </div>
      </AppShell>
    );
  }

  const totalOriginal = payables.reduce((acc, p) => acc + (p.originalAmount || 0), 0);
  const totalPaid = payables.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
  const totalBalance = payables.reduce((acc, p) => acc + (p.balanceAmount || 0), 0);
  const totalAllocated = payables.reduce((acc, p) => acc + (p.allocatedAmount || 0), 0);

  return (
    <AppShell activeSection="suppliers">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-2">
          <Link
            href="/suppliers"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para Fornecedores</span>
          </Link>
          <span className="text-[11px] font-mono text-zinc-400">{supplier.supplierCode}</span>
        </div>

        {/* Header Profile */}
        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 text-zinc-800 flex items-center justify-center shrink-0">
              {supplier.personType === "PJ" ? (
                <Building2 className="w-6 h-6 text-blue-600" />
              ) : (
                <User className="w-6 h-6 text-emerald-600" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-zinc-950">
                  {supplier.name}
                </h1>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                  {supplier.supplierCode}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                    supplier.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-zinc-100 text-zinc-600 border-zinc-200"
                  }`}
                >
                  {supplier.status === "ACTIVE" ? "Ativo" : "Arquivado"}
                </span>
              </div>
              <div className="text-xs text-zinc-500 flex items-center gap-3 flex-wrap">
                {supplier.tradeName && <span>Fantasia: {supplier.tradeName}</span>}
                <span>
                  Doc: {supplier.document ? formatDocument(supplier.document) : "Não informado"}
                </span>
                <span>Categoria: {supplier.category || "Geral"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <button
              onClick={handleToggleArchive}
              className={`px-3.5 py-2 rounded-full border text-xs font-semibold transition shadow-2xs flex items-center gap-1.5 ${
                supplier.status === "ACTIVE"
                  ? "border-zinc-200 text-zinc-600 hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50"
                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{supplier.status === "ACTIVE" ? "Arquivar" : "Reativar"}</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-xs">
            <div className="text-[11px] font-medium text-zinc-400">Total Despesas Lançadas</div>
            <div className="text-lg font-bold font-mono text-zinc-950 mt-1">
              R$ {totalOriginal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">{payables.length} título(s)</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-xs">
            <div className="text-[11px] font-medium text-zinc-400">Total Liquidado (Pago)</div>
            <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
              R$ {totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">Baixas efetivadas</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-xs">
            <div className="text-[11px] font-medium text-zinc-400">Saldo em Aberto</div>
            <div className={`text-lg font-bold font-mono mt-1 ${totalBalance > 0 ? "text-amber-700" : "text-zinc-950"}`}>
              R$ {totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">Pendente de pagamento</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-xs">
            <div className="text-[11px] font-medium text-zinc-400">Rateado a Contratos</div>
            <div className="text-lg font-bold font-mono text-blue-700 mt-1">
              R$ {totalAllocated.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">
              {contractedServices.length} serviço(s) vinculado(s)
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-zinc-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("details")}
            className={`pb-3 px-3 transition border-b-2 flex items-center gap-2 ${
              activeTab === "details"
                ? "border-zinc-900 text-zinc-950 font-bold"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Dados Cadastrais & Edição</span>
          </button>

          <button
            onClick={() => setActiveTab("payables")}
            className={`pb-3 px-3 transition border-b-2 flex items-center gap-2 ${
              activeTab === "payables"
                ? "border-zinc-900 text-zinc-950 font-bold"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Títulos & Contas a Pagar ({payables.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("contracts")}
            className={`pb-3 px-3 transition border-b-2 flex items-center gap-2 ${
              activeTab === "contracts"
                ? "border-zinc-900 text-zinc-950 font-bold"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Contratos Vinculados ({contractedServices.length})</span>
          </button>
        </div>

        {/* Tab 1: Dados Cadastrais & Edição */}
        {activeTab === "details" && (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-xs space-y-4">
              <h2 className="text-sm font-semibold text-zinc-900">Identificação Geral</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="font-medium text-zinc-700">Razão Social / Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-zinc-700">Nome Fantasia</label>
                  <input
                    type="text"
                    value={formData.tradeName || ""}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-zinc-700">CPF / CNPJ</label>
                  <input
                    type="text"
                    value={formData.document || ""}
                    onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-zinc-700">Categoria</label>
                  <select
                    value={formData.category || ""}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 transition"
                  >
                    {SUPPLIER_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-xs space-y-4">
              <h2 className="text-sm font-semibold text-zinc-900">Contatos & Localização</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-medium text-zinc-700">E-mail Comercial</label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-zinc-700">Telefone</label>
                  <input
                    type="text"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-zinc-700">WhatsApp</label>
                  <input
                    type="text"
                    value={formData.whatsapp || ""}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 transition"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="font-medium text-zinc-700">Logradouro / Cidade</label>
                  <input
                    type="text"
                    value={formData.street || ""}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="Rua, Av..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-zinc-700">Cidade / UF</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.city || ""}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Cidade"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 transition"
                    />
                    <input
                      type="text"
                      maxLength={2}
                      value={formData.state || ""}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                      placeholder="UF"
                      className="w-16 px-2.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 transition uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs pt-2">
                <label className="font-medium text-zinc-700">Observações & Anotações</label>
                <textarea
                  rows={3}
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 transition"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition shadow-xs disabled:opacity-50 active:scale-[0.98]"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Títulos e Contas a Pagar */}
        {activeTab === "payables" && (
          <div className="rounded-2xl bg-white border border-zinc-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-800">Títulos Financeiros do Fornecedor</span>
              <Link
                href="/financial/payables"
                className="text-blue-600 hover:underline font-medium flex items-center gap-1"
              >
                <span>Novo Lançamento no Contas a Pagar</span>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-600">
                <thead className="text-[10px] uppercase tracking-wider text-zinc-400 bg-zinc-50/50 border-b border-zinc-100">
                  <tr>
                    <th className="py-3 px-4">Título</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4">Valor Original</th>
                    <th className="py-3 px-4">Valor Alocado</th>
                    <th className="py-3 px-4">Não Alocado</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {payables.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-zinc-400 italic">
                        Nenhum título a pagar registrado para este fornecedor.
                      </td>
                    </tr>
                  ) : (
                    payables.map((p) => (
                      <tr key={p.payableId} className="hover:bg-zinc-50/80 transition">
                        <td className="py-3.5 px-4 font-mono font-semibold text-zinc-900">
                          {p.payableNumber}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-800 font-medium">
                          {p.description}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600">
                          {p.dueDate}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-zinc-950">
                          R$ {p.originalAmount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-blue-700">
                          R$ {p.allocatedAmount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-500">
                          R$ {p.unallocatedAmount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              p.status === "PAID"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : p.status === "PARTIALLY_PAID"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Contratos Vinculados */}
        {activeTab === "contracts" && (
          <div className="rounded-2xl bg-white border border-zinc-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-800">
                Serviços e Contratos com Custos Atribuídos a este Fornecedor
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-600">
                <thead className="text-[10px] uppercase tracking-wider text-zinc-400 bg-zinc-50/50 border-b border-zinc-100">
                  <tr>
                    <th className="py-3 px-4">Contrato</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Serviço / Componente</th>
                    <th className="py-3 px-4">Custo Unitário</th>
                    <th className="py-3 px-4">Periodicidade</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {contractedServices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-zinc-400 italic">
                        Nenhum contrato ativo utilizando serviços vinculados a este fornecedor.
                      </td>
                    </tr>
                  ) : (
                    contractedServices.map((cs, idx) => (
                      <tr key={`${cs.contractId}-${idx}`} className="hover:bg-zinc-50/80 transition">
                        <td className="py-3.5 px-4 font-mono font-semibold text-zinc-900">
                          <Link href={`/contracts`} className="hover:underline">
                            {cs.contractNumber}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-800 font-medium">
                          {cs.clientName}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-900">
                          {cs.serviceName}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-zinc-950">
                          R$ {cs.unitCost.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-mono text-[10px]">
                            {cs.costPeriodicity}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              cs.contractStatus === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-zinc-100 text-zinc-600 border-zinc-200"
                            }`}
                          >
                            {cs.contractStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
