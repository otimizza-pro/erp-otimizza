import { structures, angles, triggers, awareness } from "./schema";

export interface CohesiveCatalogItem {
  id: string;
  name: string;
  type?: string;
  target_pain_points?: string | null;
  target_audience_ids?: string[];
  linked_audiences?: Array<{ id: string; name: string }>;
}

export interface CohesiveAudienceItem {
  id: string;
  name: string;
  pain_points?: string[];
  desires?: string[];
  objections?: string[];
}

export interface CohesiveSuggestionResult {
  offerName: string;
  pain: string;
  audience: string;
  awareness: string;
  structure: string;
  angle: string;
  trigger: string;
  nextIndex: number;
}

/**
 * Gera uma combinação 100% coesa cruzando Produto/Serviço -> Dor que ele resolve -> Público vinculado -> Framework de Copy.
 */
export function buildCohesiveHeadlineSuggestion(params: {
  catalogItems: CohesiveCatalogItem[];
  audiences: CohesiveAudienceItem[];
  cursor?: number;
}): CohesiveSuggestionResult {
  const { catalogItems, audiences, cursor = 0 } = params;
  const hasCatalog = catalogItems.length > 0;
  const item = hasCatalog ? catalogItems[cursor % catalogItems.length] : null;

  const offerName = item ? item.name : "Institucional / Marca";

  // 1. Dores do próprio produto/serviço têm prioridade máxima
  const itemPains = (item?.target_pain_points || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  // 2. Público vinculado ao produto/serviço (ou primeiro público cadastrado)
  const linkedAudIds = new Set([
    ...(item?.target_audience_ids || []),
    ...(item?.linked_audiences?.map((a) => a.id) || []),
  ]);
  const matchedAudience =
    audiences.find((a) => linkedAudIds.has(a.id)) || audiences[cursor % Math.max(1, audiences.length)] || null;

  const audiencePains = (matchedAudience?.pain_points || []).map((s) => s.trim()).filter(Boolean);
  const allPains = itemPains.length > 0 ? itemPains : audiencePains;
  const pain =
    allPains.length > 0
      ? allPains[cursor % allPains.length]
      : "Falta de previsibilidade e segurança para resolver o problema";

  const audience = matchedAudience?.name || "Público principal";

  return {
    offerName,
    pain,
    audience,
    awareness: awareness[cursor % awareness.length],
    structure: structures[cursor % structures.length],
    angle: angles[cursor % angles.length],
    trigger: triggers[cursor % triggers.length],
    nextIndex: cursor + 1,
  };
}
