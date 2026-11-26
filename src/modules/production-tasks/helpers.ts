import type { ProductionTaskType } from "./types";

export const PRODUCTION_TASK_TYPE_LABELS: Record<ProductionTaskType, string> = {
  FILMING: "Gravação / Captação",
  REPORT_DELIVERY: "Envio de Relatório",
  CONTENT_REVIEW: "Revisão de Conteúdo",
  CLIENT_MEETING: "Reunião / Alinhamento",
  SHOOTING_PREP: "Pré-Produção / Roteiro",
  DELIVERY: "Entrega / Publicação",
  OTHER: "Outro",
};

export const PRODUCTION_TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  RESCHEDULED: "Reagendada",
  COMPLETED: "Concluída",
  CANCELED: "Cancelada",
};

/**
 * Infers a suggested due date (YYYY-MM-DD) and taskType from a project checklist item title.
 */
export function inferChecklistProductionDefaults(
  title: string,
  fallbackDueDate?: string | null,
  referenceDateStr?: string,
): { dueDate: string | null; taskType: ProductionTaskType } {
  const lower = title.toLowerCase();

  let taskType: ProductionTaskType = "OTHER";
  if (/grava[çc]|capta[çc]|film|v[íi]deo|reels|c[âa]mera/.test(lower)) {
    taskType = "FILMING";
  } else if (/relat[óo]ri|kpi|m[ée]trica|resultado/.test(lower)) {
    taskType = "REPORT_DELIVERY";
  } else if (/reuni|call|alinh|apresenta/.test(lower)) {
    taskType = "CLIENT_MEETING";
  } else if (/revis|aprov|ajust/.test(lower)) {
    taskType = "CONTENT_REVIEW";
  } else if (/roteiro|pauta|prepara|briefing/.test(lower)) {
    taskType = "SHOOTING_PREP";
  } else if (/entreg|public|postar|dispar/.test(lower)) {
    taskType = "DELIVERY";
  }

  const todaySp =
    referenceDateStr ||
    new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const [refYear, refMonth, refDay] = todaySp.split("-").map(Number);

  const fullMatch = title.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (fullMatch) {
    const d = Number(fullMatch[1]);
    const m = Number(fullMatch[2]);
    const y = Number(fullMatch[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return {
        dueDate: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        taskType,
      };
    }
  }

  const shortMatch = title.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (shortMatch) {
    const d = Number(shortMatch[1]);
    const m = Number(shortMatch[2]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      let y = refYear;
      if (m < refMonth || (m === refMonth && d < refDay)) {
        y = refYear + 1;
      }
      return {
        dueDate: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        taskType,
      };
    }
  }

  return {
    dueDate: fallbackDueDate ? fallbackDueDate.slice(0, 10) : todaySp,
    taskType,
  };
}
