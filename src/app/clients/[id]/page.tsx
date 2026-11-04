"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import {
  ArrowLeft,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Archive,
  RefreshCw,
  Edit2,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Briefcase,
  Layers,
  Calendar,
  Plus,
  Clock,
  AlertCircle,
  ExternalLink,
  FolderOpen,
  History,
} from "lucide-react";
import { Client } from "@/modules/clients/types";
import { formatDocument } from "@/shared/cpf-cnpj";
import { formatMoney } from "@/shared/money";
import {
  formatProposalStatus,
  formatContractStatus,
  formatOpportunityStatus,
  formatFinancialStatus,
} from "@/shared/status-labels";
import { ProjectViews } from "@/components/projects/project-views";
import { ClientFiles, ClientHistory } from "@/components/clients/client-workspace";
import { WhatsAppIcon, WhatsAppLink } from "@/components/ui/whatsapp";

type ClientTab =
  | "overview"
  | "registration"
  | "opportunities"
  | "proposals"
  | "contracts"
  | "financial"
  | "projects"
  | "documents"
  | "activities";

interface ClientContractItem {
  id: string;
  contract_number?: string;
  contractNumber?: string;
  description?: string;
  status: string;
  recurrence_period?: string;
  recurrencePeriod?: string;
  billing_period?: string;
  amount_cents?: number;
  total_amount?: number;
  totalAmount?: number;
  due_day?: number;
}

interface ClientProposalItem {
  id: string;
  proposal_code?: string;
  proposalCode?: string;
  title?: string;
  status?: string;
  total_amount?: number;
  totalAmount?: number;
  totalMonthlyEffective?: number;
  totalOneTimeEffective?: number;
  totalYearlyEffective?: number;
  valid_until?: string;
  validUntil?: string;
}

interface ClientOpportunityItem {
  id: string;
  title: string;
  estimated_value?: number;
  estimatedValue?: number;
  amount?: number;
  probability?: number;
  stage_name?: string;
  stageName?: string;
  pipeline_title?: string;
  pipelineTitle?: string;
  status?: string;
}

interface ClientReceivableItem {
  id: string;
  description?: string;
  receivable_number?: string;
  receivableNumber?: string;
  due_date?: string;
  dueDate?: string;
  original_amount?: number;
  originalAmount?: number;
  paid_amount?: number;
  amount?: number;
  competency?: string;
  status: string;
}

interface ClientProjectItem {
  id: string;
  title?: string;
  name?: string;
  project_code?: string;
  projectCode?: string;
  project_type?: string;
  projectType?: string;
  status?: string;
  due_date?: string;
  target_delivery_date?: string;
  targetDeliveryDate?: string;
  actual_hours?: number;
  actualHours?: number;
}

interface ClientActivityItem {
  id: string;
  type?: string;
  activity_type?: string;
  activityType?: string;
  title: string;
  description?: string;
  due_date?: string;
  dueDate?: string;
  status?: string;
  completed?: boolean;
}

function ClientDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const queryTab = searchParams.get("tab") as ClientTab | null;
  const [activeTab, setActiveTab] = useState<ClientTab>(queryTab || "overview");

  useEffect(() => {
    const tabParam = searchParams.get("tab") as ClientTab | null;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Dados das abas vinculadas
  const [contracts, setContracts] = useState<ClientContractItem[]>([]);
  const [proposals, setProposals] = useState<ClientProposalItem[]>([]);
  const [opportunities, setOpportunities] = useState<ClientOpportunityItem[]>([]);
  const [receivables, setReceivables] = useState<ClientReceivableItem[]>([]);
  const [projects, setProjects] = useState<ClientProjectItem[]>([]);
  const [activities, setActivities] = useState<ClientActivityItem[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const loadClient = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) throw new Error("Cliente não encontrado");
      const data = await res.json();
      setClient(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClient();
  }, [id]);

  // Carregar dados específicos de cada aba ao alternar
  useEffect(() => {
    if (!id) return;

    async function loadTabData() {
      setTabLoading(true);
      try {
        if (activeTab === "overview" || activeTab === "contracts") {
          const res = await fetch(`/api/clients/${id}/contracts`);
          if (res.ok) {
            const data = await res.json();
            setContracts(Array.isArray(data) ? data : data.contracts || []);
          }
        }
        if (activeTab === "overview" || activeTab === "proposals") {
          const res = await fetch(`/api/proposals?clientId=${id}`);
          if (res.ok) {
            const data = await res.json();
            setProposals(Array.isArray(data) ? data : data.proposals || []);
          }
        }
        if (activeTab === "overview" || activeTab === "opportunities") {
          const res = await fetch(`/api/crm/opportunities?clientId=${id}`);
          if (res.ok) {
            const data = await res.json();
            setOpportunities(data.opportunities || []);
          }
        }
        if (activeTab === "overview" || activeTab === "financial") {
          const res = await fetch(`/api/financial/receivables?clientId=${id}`);
          if (res.ok) {
            const data = await res.json();
            setReceivables(Array.isArray(data) ? data : data.receivables || []);
          }
        }
        if (activeTab === "overview" || activeTab === "projects") {
          const res = await fetch(`/api/projects?clientId=${id}`);
          if (res.ok) {
            const data = await res.json();
            setProjects(data.data || []);
          }
        }
        if (activeTab === "overview" || activeTab === "activities") {
          const res = await fetch(`/api/crm/activities?clientId=${id}`);
          if (res.ok) {
            const data = await res.json();
            setActivities(Array.isArray(data) ? data : []);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados da aba:", err);
      } finally {
        setTabLoading(false);
      }
    }

    loadTabData();
  }, [id, activeTab]);

  const handleToggleArchive = async () => {
    if (!client) return;
    const isArchived = client.status === "ARCHIVED";
    const confirmMsg = isArchived
      ? "Deseja reativar este cliente?"
      : "Deseja arquivar este cliente? Nenhum histórico de vendas ou títulos será apagado.";

    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isArchived ? "REACTIVATE" : "ARCHIVE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadClient();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao alterar status.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell activeSection="clients">
        <div className="p-12 text-center text-xs text-zinc-400">Carregando dados do cliente...</div>
      </AppShell>
    );
  }

  if (!client) {
    return (
      <AppShell activeSection="clients">
        <div className="p-12 text-center text-xs text-zinc-500 space-y-3">
          <p>Cliente não encontrado.</p>
          <Link href="/clients" className="text-zinc-950 underline font-semibold">
            Voltar para lista de clientes
          </Link>
        </div>
      </AppShell>
    );
  }

  // Métricas rápidas de visão geral
  const activeContractsCount = contracts.filter((c) => c.status === "ACTIVE").length;
  const totalBilled = receivables
    .filter((r) => r.status === "PAID")
    .reduce((acc, r) => acc + Number(r.original_amount || r.paid_amount || 0), 0);
  const pendingReceivablesCount = receivables.filter((r) => r.status === "PENDING").length;

  const tabs: Array<{ id: ClientTab; label: string; icon: React.ElementType; count?: number }> = [
    { id: "overview", label: "Visão Geral", icon: Building2 },
    { id: "registration", label: "Dados Cadastrais", icon: User },
    { id: "opportunities", label: "Oportunidades", icon: TrendingUp, count: opportunities.length },
    { id: "proposals", label: "Propostas", icon: FileText, count: proposals.length },
    { id: "contracts", label: "Contratos", icon: RefreshCw, count: contracts.length },
    { id: "financial", label: "Financeiro", icon: DollarSign, count: receivables.length },
    { id: "projects", label: "Projetos", icon: Briefcase, count: projects.length },
    { id: "documents", label: "Documentos", icon: FolderOpen },
    { id: "activities", label: "Atividades", icon: History, count: activities.length },
  ];

  return (
    <AppShell activeSection="clients">
      <div className="space-y-6 max-w-6xl">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/clients"
              className="p-2 rounded-full bg-zinc-50 border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                    client.type === "PJ"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  {client.type}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    client.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-zinc-100 text-zinc-600 border-zinc-200"
                  }`}
                >
                  {client.status === "ACTIVE" ? "ATIVO" : "ARQUIVADO"}
                </span>
                {client.document && (
                  <span className="text-xs font-mono text-zinc-500">
                    {formatDocument(client.document)}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950 mt-1">
                {client.name}
              </h1>
              {client.tradeName && (
                <p className="text-xs text-zinc-500">Nome Fantasia: {client.tradeName}</p>
              )}
              {client.notes && client.notes.includes("Convertido a partir do Lead") && (
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <User className="w-3 h-3 text-amber-600" />
                    {client.notes.split(".")[0]}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {client.whatsapp && (
              <WhatsAppLink number={client.whatsapp} name={client.name} label="WhatsApp" />
            )}
            <button
              onClick={handleToggleArchive}
              disabled={actionLoading}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                client.status === "ACTIVE"
                  ? "bg-white border-zinc-200 text-zinc-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {client.status === "ACTIVE" ? "Arquivar" : "Reativar"}
            </button>
            <Link
              href={`/proposals/new?clientId=${client.id}`}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-xs flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              + Proposta
            </Link>
            <Link
              href={`/contracts/new?clientId=${client.id}`}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition shadow-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              + Contrato
            </Link>
            <Link
              href={`/clients/${client.id}/edit`}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-100 text-zinc-700 text-xs font-semibold hover:bg-zinc-200 transition flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Editar
            </Link>
          </div>
        </div>

        {/* Abas de Navegação Interna do Cliente */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 pb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-semibold transition border-b-2 whitespace-nowrap ${
                  isActive
                    ? "border-zinc-950 text-zinc-950 bg-white shadow-2xs"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/60"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-zinc-950" : "text-zinc-400"}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Conteúdo da Aba Ativa */}
        <div className="space-y-6">
          {/* ABA 1: VISÃO GERAL */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Cards de Resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white border border-zinc-200/80 shadow-2xs space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Contratos Ativos
                  </span>
                  <div className="text-xl font-bold text-zinc-900">{activeContractsCount}</div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-zinc-200/80 shadow-2xs space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Total Faturado / Pago
                  </span>
                  <div className="text-xl font-bold text-emerald-600">{formatMoney(totalBilled)}</div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-zinc-200/80 shadow-2xs space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Cobranças em Aberto
                  </span>
                  <div className="text-xl font-bold text-amber-600">{pendingReceivablesCount}</div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-zinc-200/80 shadow-2xs space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Projetos Operacionais
                  </span>
                  <div className="text-xl font-bold text-indigo-600">{projects.length}</div>
                </div>
              </div>

              {/* Informações Rápidas e Ações */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contratos Recentes */}
                <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
                      Contratos em Vigor
                    </h3>
                    <button
                      onClick={() => setActiveTab("contracts")}
                      className="text-xs text-indigo-600 hover:underline font-semibold"
                    >
                      Ver todos ({contracts.length})
                    </button>
                  </div>
                  {contracts.length === 0 ? (
                    <p className="text-xs text-zinc-400 py-3">Nenhum contrato ativo cadastrado.</p>
                  ) : (
                    <div className="space-y-2">
                      {contracts.slice(0, 3).map((c) => (
                        <div
                          key={c.id}
                          className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-zinc-900 block">
                              Contrato {c.contract_number}
                            </span>
                            <span className="text-zinc-500 text-[11px]">
                              {c.billing_period === "MONTHLY" ? "Mensalidade" : "Avulso"}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              c.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-zinc-200 text-zinc-700"
                            }`}
                          >
                            {formatContractStatus(c.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Propostas e Oportunidades */}
                <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-zinc-500" />
                      Propostas Recentes
                    </h3>
                    <button
                      onClick={() => setActiveTab("proposals")}
                      className="text-xs text-indigo-600 hover:underline font-semibold"
                    >
                      Ver todas ({proposals.length})
                    </button>
                  </div>
                  {proposals.length === 0 ? (
                    <p className="text-xs text-zinc-400 py-3">Nenhuma proposta registrada.</p>
                  ) : (
                    <div className="space-y-2">
                      {proposals.slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-zinc-900 block">
                              {p.proposal_code || p.proposalCode} • {p.title}
                            </span>
                            <span className="text-zinc-500 text-[11px]">
                              {formatMoney(Number(p.totalAmount || p.total_amount || p.totalMonthlyEffective || p.totalOneTimeEffective || p.totalYearlyEffective || 0))}
                            </span>
                          </div>
                          <Link
                            href={`/proposals/${p.id}`}
                            className="text-indigo-600 hover:underline font-semibold"
                          >
                            Ver
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: DADOS CADASTRAIS & CONTATOS */}
          {activeTab === "registration" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card de Identificação */}
                <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Identificação Fiscal
                  </h2>
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-zinc-400 block text-[11px]">Documento (CPF/CNPJ):</span>
                      <span className="font-mono font-medium text-zinc-900">
                        {client.document ? formatDocument(client.document) : "Não informado"}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[11px]">E-mail Comercial:</span>
                      <span className="text-zinc-900">{client.email || "-"}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[11px] flex items-center gap-1">
                        <Phone className="w-3 h-3 text-zinc-400" />
                        Telefone Principal:
                      </span>
                      {client.phone ? (
                        <a
                          href={`tel:${client.phone.replace(/\D/g, "")}`}
                          className="font-medium text-zinc-900 hover:text-indigo-600 transition"
                        >
                          {client.phone}
                        </a>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[11px] flex items-center gap-1 text-emerald-700 font-semibold">
                        <WhatsAppIcon className="w-3 h-3 text-emerald-600" />
                        WhatsApp Corporativo:
                      </span>
                      {client.whatsapp ? (
                        <div className="pt-0.5">
                          <WhatsAppLink number={client.whatsapp} name={client.name} />
                        </div>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card de Endereço */}
                <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Endereço
                  </h2>
                  <div className="space-y-2 text-xs text-zinc-700">
                    {client.street ? (
                      <>
                        <p className="font-medium text-zinc-900">
                          {client.street}, {client.number || "S/N"}
                        </p>
                        {client.complement && <p className="text-zinc-500">{client.complement}</p>}
                        <p className="text-zinc-500">
                          {client.neighborhood} • {client.city} - {client.state}
                        </p>
                        {client.postalCode && (
                          <p className="text-zinc-400 font-mono text-[11px]">CEP: {client.postalCode}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-zinc-400">Endereço não cadastrado.</p>
                    )}
                  </div>
                </div>

                {/* Rastreabilidade */}
                <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Histórico do Cadastro
                  </h2>
                  <div className="space-y-2 text-xs text-zinc-500">
                    <div>
                      <span>Cadastrado em:</span>
                      <span className="font-medium text-zinc-900 block">
                        {new Date(client.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div>
                      <span>Última atualização:</span>
                      <span className="font-medium text-zinc-900 block">
                        {new Date(client.updatedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contatos Vinculados */}
              <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
                <h2 className="text-sm font-semibold text-zinc-900">Contatos Autorizados</h2>
                {client.contacts && client.contacts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {client.contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-900">{contact.name}</span>
                          {contact.isPrimary && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              Principal
                            </span>
                          )}
                        </div>
                        {contact.role && <p className="text-zinc-500">{contact.role}</p>}
                        <div className="pt-1 text-zinc-600 space-y-1">
                          {contact.email && <p>E-mail: {contact.email}</p>}
                          {contact.phone && (
                            <p className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-zinc-400" />
                              <a href={`tel:${contact.phone.replace(/\D/g, "")}`} className="hover:underline">
                                {contact.phone}
                              </a>
                            </p>
                          )}
                          {contact.whatsapp && (
                            <div className="pt-0.5">
                              <WhatsAppLink number={contact.whatsapp} name={contact.name} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">Nenhum contato específico cadastrado.</p>
                )}
              </div>
            </div>
          )}

          {/* ABA 3: OPORTUNIDADES */}
          {activeTab === "opportunities" && (
            <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">Oportunidades Comerciais</h2>
                  <p className="text-xs text-zinc-500">Deals no funil de vendas associados a este cliente</p>
                </div>
                <Link
                  href={`/crm/opportunities/new?clientId=${client.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Oportunidade
                </Link>
              </div>

              {opportunities.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400">
                  Nenhuma oportunidade em andamento para este cliente.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {opportunities.map((opp) => (
                    <div key={opp.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <Link
                          href={`/crm/opportunities/${opp.id}`}
                          className="font-semibold text-zinc-900 hover:text-indigo-600 block"
                        >
                          {opp.title}
                        </Link>
                        <span className="text-zinc-500 text-[11px]">
                          Estágio: {opp.stage_name || "Funil"} • Probabilidade: {opp.probability}%
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-semibold text-zinc-900 block">
                          {formatMoney(Number(opp.amount || 0))}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 font-semibold text-zinc-600">
                          {formatOpportunityStatus(opp.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA 4: PROPOSTAS */}
          {activeTab === "proposals" && (
            <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">Propostas Comerciais</h2>
                  <p className="text-xs text-zinc-500">Cotações formais, versões emitidas e aprovações</p>
                </div>
                <Link
                  href={`/proposals/new?clientId=${client.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Proposta
                </Link>
              </div>

              {proposals.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400">
                  Nenhuma proposta comercial gerada para este cliente.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {proposals.map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <Link
                          href={`/proposals/${p.id}`}
                          className="font-semibold text-zinc-900 hover:text-indigo-600 block"
                        >
                          {p.proposal_code || p.proposalCode} • {p.title}
                        </Link>
                        <span className="text-zinc-500 text-[11px]">
                          Válido até: {p.valid_until || p.validUntil ? new Date(p.valid_until || p.validUntil || "").toLocaleDateString("pt-BR") : "-"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="font-mono font-semibold text-zinc-900 block">
                            {formatMoney(Number(p.totalAmount || p.total_amount || p.totalMonthlyEffective || p.totalOneTimeEffective || p.totalYearlyEffective || 0))}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              p.status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-800"
                                : p.status === "SENT"
                                ? "bg-blue-100 text-blue-800"
                                : p.status === "NEGOTIATING"
                                ? "bg-amber-100 text-amber-800"
                                : p.status === "REJECTED" || p.status === "CANCELED"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-zinc-100 text-zinc-700"
                            }`}
                          >
                            {formatProposalStatus(p.status)}
                          </span>
                        </div>
                        <Link
                          href={`/proposals/${p.id}`}
                          className="p-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-600"
                          title="Abrir proposta"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA 5: CONTRATOS */}
          {activeTab === "contracts" && (
            <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">Contratos & Assinaturas</h2>
                  <p className="text-xs text-zinc-500">Contratos vigentes, prazos e faturamento mensal</p>
                </div>
                <Link
                  href={`/contracts/new?clientId=${client.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo Contrato
                </Link>
              </div>

              {contracts.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400">
                  Nenhum contrato formal cadastrado para este cliente.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {contracts.map((c) => (
                    <div key={c.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <Link
                          href={`/contracts/${c.id}`}
                          className="font-semibold text-zinc-900 hover:text-indigo-600 block"
                        >
                          Contrato {c.contract_number}
                        </Link>
                        <span className="text-zinc-500 text-[11px]">
                          Vencimento: Dia {c.due_day || 10} • Periodicidade: {c.billing_period || "Mensal"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="font-mono font-semibold text-zinc-900 block">
                            {formatMoney(Number(c.total_amount || 0))}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              c.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {formatContractStatus(c.status)}
                          </span>
                        </div>
                        <Link
                          href={`/contracts/${c.id}`}
                          className="p-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-600"
                          title="Abrir contrato"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA 6: FINANCEIRO */}
          {activeTab === "financial" && (
            <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">Títulos a Receber</h2>
                  <p className="text-xs text-zinc-500">Cobranças, faturas e histórico de liquidações</p>
                </div>
                <Link
                  href={`/financial/receivables/new?clientId=${client.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Cobrança
                </Link>
              </div>

              {receivables.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400">
                  Nenhum título financeiro emitido para este cliente.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {receivables.map((r) => (
                    <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <Link
                          href={`/financial/receivables/${r.id}`}
                          className="font-semibold text-zinc-900 hover:text-emerald-700 block"
                        >
                          {r.receivable_number || r.receivableNumber} • {r.description}
                        </Link>
                        <span className="text-zinc-500 text-[11px]">
                          Vencimento: {r.due_date || r.dueDate ? new Date(r.due_date || r.dueDate || "").toLocaleDateString("pt-BR") : "-"} • Competência: {r.competency || "-"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-semibold text-zinc-900 block">
                          {formatMoney(Number(r.original_amount || r.originalAmount || 0))}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            r.status === "PAID"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.status === "PENDING"
                              ? "bg-amber-100 text-amber-800"
                              : r.status === "OVERDUE"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {formatFinancialStatus(r.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA 7: PROJETOS */}
          {activeTab === "projects" && (
            <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">Projetos Operacionais</h2>
                  <p className="text-xs text-zinc-500">Demandas ativas, entregas mensais e workspaces</p>
                </div>
                <Link
                  href={`/projects/new?clientId=${client.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo Projeto
                </Link>
              </div>

              <ProjectViews clientId={client.id} />
            </div>
          )}

          {/* ABA 8: DOCUMENTOS */}
          {activeTab === "documents" && (
            <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-2xs">
              <ClientFiles clientId={client.id} />
            </div>
          )}

          {/* ABA 9: ATIVIDADES */}
          {activeTab === "activities" && (
            <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
              <ClientHistory clientId={client.id} />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function ClientDetailsPage() {
  return (
    <Suspense
      fallback={
        <AppShell activeSection="clients">
          <div className="p-8 text-center text-zinc-400">Carregando detalhes do cliente...</div>
        </AppShell>
      }
    >
      <ClientDetailsContent />
    </Suspense>
  );
}
