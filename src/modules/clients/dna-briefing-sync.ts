import { query } from "@/lib/db/pool";
import type { PoolClient } from "pg";

export interface ClientDnaAudience {
  id: string;
  name: string;
  description: string | null;
  demographics?: string | null;
  pain_points?: string[] | null;
  desires?: string[] | null;
  objections?: string[] | null;
  is_default?: boolean;
}

export interface ClientDnaContext {
  clientId: string;
  category: string;
  servicesOffered: string;
  companyName: string;
  contactName: string;
  instagramUrl: string;
  websiteUrl: string;
  audiences: ClientDnaAudience[];
  compiledInitialNotes: string;
  initialExtractedIdentity: Record<string, unknown>;
  clientIdentity: Record<string, unknown> | null;
}

/**
 * Compila o contexto estratégico do DNA do cliente a partir de:
 * 1. client_identities (brand_context, commercial_profile, differentials, tone_of_voice, etc.)
 * 2. client_audiences (públicos segmentados reais, dores, desejos, objeções)
 * 3. clients e client_contacts
 */
export async function getClientDnaContext(
  clientId: string,
  db?: PoolClient | { query: typeof query }
): Promise<ClientDnaContext> {
  const runner = db ? db.query.bind(db) : query;

  // 1. Dados cadastrais do cliente
  const clientRes = await runner(
    `SELECT c.id, c.name, c.trade_name, c.type,
       (
         SELECT cc.name 
         FROM public.client_contacts cc 
         WHERE cc.client_id = c.id 
         ORDER BY cc.is_primary DESC, cc.created_at ASC 
         LIMIT 1
       ) as contact_person_name
     FROM public.clients c
     WHERE c.id = $1 LIMIT 1`,
    [clientId]
  );

  const clientRow = clientRes.rows[0];
  const companyName = clientRow?.trade_name || clientRow?.name || "Sua Empresa";
  const contactName = clientRow?.contact_person_name || (clientRow?.type === "PF" ? clientRow?.name : "") || "Parceiro";

  // 2. Identidade e DNA Comercial
  const idRes = await runner(
    `SELECT * FROM public.client_identities WHERE client_id = $1 LIMIT 1`,
    [clientId]
  );
  const ci = idRes.rows[0] || {};
  const cp = (typeof ci.commercial_profile === "object" && ci.commercial_profile !== null)
    ? ci.commercial_profile
    : {};

  // 3. Públicos Segmentados Reais
  const audRes = await runner(
    `SELECT id, name, description, demographics, pain_points, desires, objections, is_default
     FROM public.client_audiences
     WHERE client_id = $1 AND archived_at IS NULL
     ORDER BY is_default DESC, created_at ASC`,
    [clientId]
  );
  const audiences: ClientDnaAudience[] = (audRes.rows as unknown as ClientDnaAudience[]) || [];

  // Montar Instagram URL a partir do handle
  let instagramUrl = "";
  if (ci.instagram_handle) {
    const handle = String(ci.instagram_handle).trim();
    if (handle.startsWith("http")) {
      instagramUrl = handle;
    } else {
      instagramUrl = `https://instagram.com/${handle.replace("@", "")}`;
    }
  }

  const websiteUrl = ci.website_url ? String(ci.website_url).trim() : "";
  const category = String(ci.market_niche || "").trim();
  const servicesOffered = String(ci.value_proposition || cp.businessDescription || "").trim();

  // Compilar Notas Estratégicas Pré-existentes
  const noteSections: string[] = [];

  if (ci.brand_context && String(ci.brand_context).trim()) {
    noteSections.push(`Contexto da Marca:\n${String(ci.brand_context).trim()}`);
  }

  if (cp.businessDescription && String(cp.businessDescription).trim() && cp.businessDescription !== ci.brand_context) {
    noteSections.push(`O que o negócio faz:\n${String(cp.businessDescription).trim()}`);
  }

  if (cp.idealCustomer && String(cp.idealCustomer).trim()) {
    noteSections.push(`Cliente Ideal (DNA Comercial):\n${String(cp.idealCustomer).trim()}`);
  }

  if (cp.commercialObjective && String(cp.commercialObjective).trim()) {
    noteSections.push(`Objetivo Comercial:\n${String(cp.commercialObjective).trim()}`);
  }

  if (cp.requestedScope && String(cp.requestedScope).trim()) {
    noteSections.push(`Escopo Contratado:\n${String(cp.requestedScope).trim()}`);
  }

  if (cp.communicationGoal && String(cp.communicationGoal).trim()) {
    noteSections.push(`Objetivo da Comunicação:\n${String(cp.communicationGoal).trim()}`);
  }

  if (cp.spokesperson && String(cp.spokesperson).trim()) {
    noteSections.push(`Porta-voz / Quem comunica:\n${String(cp.spokesperson).trim()}`);
  }

  if (audiences.length > 0) {
    const audList = audiences
      .map((a, i) => `${i + 1}. ${a.name}${a.description ? ` (${a.description})` : ""}`)
      .join("\n");
    noteSections.push(`Públicos-Alvo Já Cadastrados no DNA:\n${audList}`);
  }

  if (Array.isArray(ci.differentials) && ci.differentials.length > 0) {
    noteSections.push(`Diferenciais da Marca Cadastrados:\n${ci.differentials.map((d: string) => `- ${d}`).join("\n")}`);
  }

  if (ci.notes && String(ci.notes).trim()) {
    noteSections.push(`Orientações Editoriais Complementares:\n${String(ci.notes).trim()}`);
  }

  const compiledInitialNotes = noteSections.join("\n\n");

  // Montar extracted_identity inicial para o briefing
  const audiencesDescriptions = audiences
    .map(a => `${a.name}${a.description ? `: ${a.description}` : ""}`)
    .join("\n");

  const initialExtractedIdentity: Record<string, unknown> = {
    marketNiche: category,
    valueProposition: servicesOffered,
    toneOfVoice: Array.isArray(ci.tone_of_voice) ? ci.tone_of_voice : [],
    differentials: Array.isArray(ci.differentials) ? ci.differentials.join("\n") : (ci.differentials || ""),
    targetAudiences: audiences.map(a => a.name),
    targetAudience: audiencesDescriptions || cp.idealCustomer || "",
    competitors: "",
  };

  return {
    clientId,
    category,
    servicesOffered,
    companyName,
    contactName,
    instagramUrl,
    websiteUrl,
    audiences,
    compiledInitialNotes,
    initialExtractedIdentity,
    clientIdentity: ci,
  };
}

/**
 * Sanitiza diferenciais para evitar ruídos conversacionais do chat
 */
export function sanitizeBriefingDifferentials(rawDifferentials: unknown): string[] {
  const items = Array.isArray(rawDifferentials)
    ? rawDifferentials
    : typeof rawDifferentials === "string"
    ? rawDifferentials.split(/\n|;/)
    : [];

  const invalidPatterns = [
    "só disse",
    "um público",
    "outro público",
    "tem mais",
    "não sei",
    "responder depois",
    "vamos lá",
    "start",
    "sim, vamos",
    "como vai funcionar",
    "clientes que",
    "pessoas que",
  ];

  return items
    .filter((item): item is string => typeof item === "string")
    .map(item => item.trim())
    .filter(item => {
      if (item.length < 5) return false;
      const lower = item.toLowerCase();
      return !invalidPatterns.some(pattern => lower.includes(pattern));
    });
}
