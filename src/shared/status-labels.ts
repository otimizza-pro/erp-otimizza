export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  NEGOTIATING: "Em Negociação",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
  EXPIRED: "Vencida",
  CANCELED: "Cancelada",
};

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativo",
  ENDED: "Encerrado",
  SUSPENDED: "Suspenso",
  CANCELED: "Cancelado",
  EXPIRED: "Expirado",
};

export const OPPORTUNITY_STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberta",
  WON: "Ganha",
  LOST: "Perdida",
  CANCELED: "Cancelada",
};

export const FINANCIAL_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  PARTIALLY_PAID: "Parcial",
  OVERDUE: "Vencido",
  CANCELLED: "Cancelado",
  CANCELED: "Cancelado",
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planejado",
  IN_PROGRESS: "Em Andamento",
  PAUSED: "Pausado",
  COMPLETED: "Concluído",
  CANCELED: "Cancelado",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: "A Fazer",
  IN_PROGRESS: "Em Andamento",
  IN_REVIEW: "Em Revisão",
  DONE: "Concluído",
  CANCELED: "Cancelado",
};

export const ENTITY_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  ARCHIVED: "Arquivado",
  INACTIVE: "Inativo",
};

export function formatProposalStatus(status?: string | null): string {
  if (!status) return "";
  return PROPOSAL_STATUS_LABELS[status] || status;
}

export function formatContractStatus(status?: string | null): string {
  if (!status) return "";
  return CONTRACT_STATUS_LABELS[status] || status;
}

export function formatOpportunityStatus(status?: string | null): string {
  if (!status) return "";
  return OPPORTUNITY_STATUS_LABELS[status] || status;
}

export function formatFinancialStatus(status?: string | null): string {
  if (!status) return "";
  return FINANCIAL_STATUS_LABELS[status] || status;
}

export function formatProjectStatus(status?: string | null): string {
  if (!status) return "";
  return PROJECT_STATUS_LABELS[status] || status;
}

export function formatTaskStatus(status?: string | null): string {
  if (!status) return "";
  return TASK_STATUS_LABELS[status] || status;
}

export function formatEntityStatus(status?: string | null): string {
  if (!status) return "";
  return ENTITY_STATUS_LABELS[status] || status;
}
