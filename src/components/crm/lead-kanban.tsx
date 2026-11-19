import Link from "next/link";
import { ArrowUpRight, Clock, MapPin, Phone } from "lucide-react";
import type { LeadRecord } from "@/modules/crm/types";
import { getLeadKanbanStatus, leadKanbanColumns } from "@/modules/crm/lead-kanban";

export function LeadKanban({ leads, loading }: { leads: LeadRecord[]; loading: boolean }) {
  if (loading) return <div role="status" className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">Carregando quadro de leads...</div>;
  const columns = leadKanbanColumns.filter(column =>
    !["CONVERTED", "ARCHIVED"].includes(column.status) || leads.some(lead => getLeadKanbanStatus(lead) === column.status)
  );
  return (
    <section aria-label="Kanban de status dos leads" className="min-w-0 space-y-3">
      <p className="text-xs text-zinc-500">{leads.length} lead(s) nos filtros atuais. Abra um cartão para consultar a ficha e atualizar o status.</p>
      <div tabIndex={0} role="region" aria-label="Colunas do kanban, role horizontalmente para ver todos os status" className="flex gap-4 overflow-x-auto pb-4 focus-visible:outline-2 focus-visible:outline-emerald-600">
        {columns.map(column => {
          const items = leads.filter(lead => getLeadKanbanStatus(lead) === column.status);
          return (
            <section key={column.status} aria-label={column.label} className={`w-72 shrink-0 rounded-2xl border border-zinc-200 border-t-4 bg-zinc-50 ${column.color}`}>
              <header className="flex items-center justify-between gap-2 border-b border-zinc-200 p-4">
                <h2 className="text-xs font-bold text-zinc-800">{column.label}</h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-zinc-600">{items.length}</span>
              </header>
              <div className="space-y-3 p-3">
                {items.length === 0 && <p className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400">Nenhum lead nesta etapa</p>}
                {items.map(lead => (
                  <Link key={lead.id} href={`/crm/leads/${lead.id}`} className="block space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-xs transition hover:border-emerald-400 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-emerald-600">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono text-zinc-400">{lead.leadCode}</p>
                        <h3 className="break-words text-sm font-bold text-zinc-900">{lead.name}</h3>
                        {lead.tradeName && <p className="mt-1 break-words text-xs text-zinc-500">{lead.tradeName}</p>}
                      </div>
                      <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-zinc-400" />
                    </div>
                    <span className="inline-block max-w-full break-words rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-600">{lead.leadSource || lead.source || "Origem não informada"}</span>
                    {(lead.whatsapp || lead.phone) && <p className="flex items-center gap-1.5 text-xs text-zinc-500"><Phone className="h-3 w-3 shrink-0" />{lead.whatsapp || lead.phone}</p>}
                    {lead.city && <p className="flex items-center gap-1.5 text-xs text-zinc-500"><MapPin className="h-3 w-3 shrink-0" />{lead.city}{lead.state ? ` / ${lead.state}` : ""}</p>}
                    {lead.serviceOfInterest && <p className="break-words text-xs text-zinc-600">Interesse: {lead.serviceOfInterest}</p>}
                    {lead.nextActivity && <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900"><p className="flex items-start gap-1.5"><Clock className="mt-0.5 h-3 w-3 shrink-0" /><span className="break-words">{lead.nextActivity.title}</span></p>{lead.nextActivity.dueDate && <p className="mt-1 text-[10px]">{new Date(lead.nextActivity.dueDate).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>}</div>}
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
