"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ArrowLeft, Save, AlertCircle, Info, Calendar, DollarSign, User } from "lucide-react";
import { Autocomplete, AutocompleteOption } from "@/components/ui/autocomplete";
import { CurrencyInput } from "@/components/ui/currency-input";

interface ClientOption {
  id: string;
  name: string;
  tradeName?: string | null;
  document?: string | null;
}

interface ContractOption {
  id: string;
  contractNumber: string;
  title: string;
}

export default function NewReceivablePage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form fields
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientOptions, setClientOptions] = useState<AutocompleteOption[]>([]);
  const [contractId, setContractId] = useState("");
  const [description, setDescription] = useState("");
  const [competency, setCompetency] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [originalAmount, setOriginalAmount] = useState<number | string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/clients?limit=100");
        if (res.ok) {
          const json = await res.json();
          const clientList: ClientOption[] = json.clients || [];
          setClients(clientList);
          const opts: AutocompleteOption[] = clientList.map((c) => ({
            id: c.id,
            label: c.name,
            sublabel: c.document ? `Documento: ${c.document}` : null,
          }));
          setClientOptions(opts);
        }
      } catch (err) {
        console.error("Erro ao carregar clientes:", err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  const fetchClients = async (q: string): Promise<AutocompleteOption[]> => {
    try {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(q)}&limit=20`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.clients || []).map((c: ClientOption) => ({
        id: c.id,
        label: c.name,
        sublabel: c.document ? `Documento: ${c.document}` : null,
      }));
    } catch {
      return [];
    }
  };

  // When client changes, optionally load active contracts
  useEffect(() => {
    if (!clientId) {
      setContracts([]);
      setContractId("");
      return;
    }
    async function loadContracts() {
      try {
        const res = await fetch(`/api/contracts?clientId=${clientId}&limit=50`);
        if (res.ok) {
          const json = await res.json();
          setContracts(json.contracts || []);
        }
      } catch (err) {
        console.error("Erro ao carregar contratos:", err);
      }
    }
    loadContracts();
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!clientId) {
      setErrorMsg("Selecione o cliente devedor.");
      return;
    }
    if (!description.trim()) {
      setErrorMsg("Informe a descrição do lançamento de cobrança.");
      return;
    }
    if (!competency || competency.length !== 7) {
      setErrorMsg("Competência deve estar no formato AAAA-MM.");
      return;
    }
    if (!dueDate) {
      setErrorMsg("Informe a data de vencimento.");
      return;
    }
    const amt = Number(originalAmount);
    if (!amt || amt <= 0) {
      setErrorMsg("Valor da cobrança deve ser maior que zero.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/financial/receivables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          contractId: contractId || undefined,
          description: description.trim(),
          competency,
          dueDate,
          originalAmount: amt,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Erro ao registrar conta a receber.");
      }

      const created = await res.json();
      router.push(`/financial/receivables/${created.id}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro desconhecido ao salvar cobrança.");
      setSaving(false);
    }
  };

  return (
    <AppShell activeSection="receivables">
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/financial/receivables"
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 transition text-slate-600"
              title="Voltar para Contas a Receber"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Nova Cobrança Avulsa
              </h1>
              <p className="text-sm text-slate-500">
                Lançamento manual de título a receber no contas a receber
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card: Dados Principais */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                Dados do Devedor e Obrigação
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Vincule o cliente responsável e informe o contrato quando aplicável.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Cliente <span className="text-red-500">*</span>
                </label>
                <Autocomplete
                  value={clientName}
                  selectedId={clientId}
                  onChange={(val, opt) => {
                    setClientName(val);
                    setClientId(opt?.id || "");
                  }}
                  fetchOptions={fetchClients}
                  options={clientOptions}
                  placeholder="Digite nome, razão social ou CNPJ do cliente..."
                  required
                  allowCustom={false}
                  disabled={loadingInitial || saving}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Contrato Vinculado (Opcional)
                </label>
                <select
                  value={contractId}
                  onChange={(e) => setContractId(e.target.value)}
                  disabled={!clientId || saving}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Nenhum contrato (Cobrança Avulsa)</option>
                  {contracts.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.contractNumber} - {ct.title}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Selecione para consolidar a receita e a rentabilidade deste contrato.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Descrição da Cobrança <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Mensalidade - Assessoria Tributária ou Taxa de Abertura"
                  disabled={saving}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Card: Valores e Datas */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Valores, Competência e Vencimento
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Defina o valor monetário e o regime de competência e caixa.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Competência (AAAA-MM) <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={competency}
                  onChange={(e) => setCompetency(e.target.value)}
                  disabled={saving}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Data de Vencimento <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={saving}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Valor Nominal <span className="text-red-500">*</span>
                </label>
                <CurrencyInput
                  value={originalAmount}
                  onChangeValue={(val) => setOriginalAmount(val)}
                  placeholder="0,00"
                  disabled={saving}
                  className="w-full py-2.5 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Observações / Histórico Auditado
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informações adicionais para faturamento ou acordos comerciais..."
                  disabled={saving}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              href="/financial/receivables"
              className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-sm transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Salvando Cobrança..." : "Salvar Cobrança"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
