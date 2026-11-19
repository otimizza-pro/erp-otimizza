import type { LeadRecord, LeadStatus } from "./types";

export const leadKanbanColumns = [
  { status: "NOVO", label: "Novo (Triagem)", color: "border-t-blue-400" },
  { status: "QUALIFICANDO", label: "Em Qualificação", color: "border-t-violet-400" },
  { status: "NUTRICAO", label: "Em Nutrição", color: "border-t-amber-400" },
  { status: "STAND_BY", label: "Stand-by", color: "border-t-slate-400" },
  { status: "QUALIFICADO", label: "Qualificado", color: "border-t-emerald-400" },
  { status: "OPORTUNIDADE", label: "Oportunidade Comercial", color: "border-t-indigo-400" },
  { status: "DESQUALIFICADO", label: "Desqualificado", color: "border-t-rose-400" },
  { status: "CONVERTED", label: "Convertido em Cliente", color: "border-t-teal-400" },
  { status: "ARCHIVED", label: "Arquivado", color: "border-t-zinc-400" },
] as const;

export function getLeadKanbanStatus(lead: Pick<LeadRecord, "status" | "convertedClientId">): LeadStatus {
  if (lead.convertedClientId) return "CONVERTED";
  switch (lead.status) {
    case "NEW": return "NOVO";
    case "CONTACTED": return "QUALIFICANDO";
    case "QUALIFIED": return "QUALIFICADO";
    case "UNQUALIFIED": return "DESQUALIFICADO";
    default: return lead.status;
  }
}
