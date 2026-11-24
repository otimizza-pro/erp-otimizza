import { CommunicationProfileSchema, emptyCommunicationProfile } from "@/modules/clients/communication-profile";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db/pool";
import { addIdentityAudiences } from "@/modules/clients/identity-audiences";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { id } = await params;

    // 1. Consulta estritamente somente leitura da identidade
    const res = await query(
      `SELECT * FROM client_identities WHERE client_id = $1`,
      [id]
    );

    const audiences = await query(
      `SELECT name FROM client_audiences WHERE client_id = $1 AND archived_at IS NULL ORDER BY is_default DESC, name ASC`,
      [id]
    );
    const targetAudiences = audiences.rows.map((row) => String(row.name));

    // Verificar se há Instagram, Site ou dados legados registrados em sessões de briefing ou brand voice presets
    let sessionInstagram = "";
    let sessionWebsite = "";
    let fallbackMandatoryTerms: string[] = [];
    let fallbackForbiddenWords: string[] = [];
    let fallbackToneOfVoice: string[] = [];
    let fallbackDefaultCtas: string[] = [];

    try {
      const presetRes = await query<{ forbidden_words: string[] | null; default_tones: string[] | null; default_ctas: string[] | null }>(
        `SELECT forbidden_words, default_tones, default_ctas FROM client_brand_voice_presets WHERE client_id = $1 LIMIT 1`,
        [id]
      );
      if (presetRes.rows.length > 0) {
        const p = presetRes.rows[0];
        if (Array.isArray(p.forbidden_words) && p.forbidden_words.length) fallbackForbiddenWords = p.forbidden_words;
        if (Array.isArray(p.default_tones) && p.default_tones.length) fallbackToneOfVoice = p.default_tones;
        if (Array.isArray(p.default_ctas) && p.default_ctas.length) fallbackDefaultCtas = p.default_ctas;
      }
    } catch {
      // Falha não impeditiva
    }

    try {
      const sessionRes = await query<{ instagram_url: string | null; website_url: string | null; extracted_identity: Record<string, unknown> | null }>(
        `SELECT instagram_url, website_url, extracted_identity FROM client_briefing_sessions 
         WHERE client_id = $1 AND (instagram_url IS NOT NULL OR website_url IS NOT NULL OR extracted_identity IS NOT NULL) 
         ORDER BY updated_at DESC LIMIT 1`,
        [id]
      );
      if (sessionRes?.rows && sessionRes.rows.length > 0) {
        sessionInstagram = sessionRes.rows[0].instagram_url || "";
        sessionWebsite = sessionRes.rows[0].website_url || "";
        const ext = sessionRes.rows[0].extracted_identity || {};
        if (!fallbackMandatoryTerms.length && Array.isArray(ext.mandatoryTerms)) {
          fallbackMandatoryTerms = ext.mandatoryTerms as string[];
        }
        if (!fallbackForbiddenWords.length && Array.isArray(ext.forbiddenWords)) {
          fallbackForbiddenWords = ext.forbiddenWords as string[];
        }
        if (!fallbackToneOfVoice.length && Array.isArray(ext.toneOfVoice)) {
          fallbackToneOfVoice = ext.toneOfVoice as string[];
        }
        if (!fallbackDefaultCtas.length && Array.isArray(ext.defaultCtas)) {
          fallbackDefaultCtas = ext.defaultCtas as string[];
        }
      }
    } catch {
      // Falha não impeditiva
    }

    if (res.rows.length === 0) {
      // Retornar estrutura padrão sem executar escrita no banco
      return NextResponse.json({
        clientId: id,
        version: 1,
        communicationProfile: emptyCommunicationProfile,
        valueProposition: "",
        marketNiche: "",
        archetype: "",
        secondaryArchetype: "",
        toneOfVoice: fallbackToneOfVoice,
        brandContext: "",
        targetAudiences,
        painPoints: [],
        differentials: [],
        forbiddenWords: fallbackForbiddenWords,
        mandatoryTerms: fallbackMandatoryTerms,
        defaultCtas: fallbackDefaultCtas,
        instagramHandle: "",
        websiteUrl: "",
        suggestedInstagram: sessionInstagram,
        suggestedWebsite: sessionWebsite,
        whatsappCta: "",
        notes: "",
        formatGuidelines: { reelsStandard: "", headlinesStandard: "", carouselStandard: "" },
        brandHistory: "",
        corePromise: "",
        salesObjections: "",
        commercialProfile: {},
        catalogItems: [],
      });
    }

    const row = res.rows[0];

    const resolvedToneOfVoice = (Array.isArray(row.tone_of_voice) && row.tone_of_voice.length > 0)
      ? row.tone_of_voice
      : fallbackToneOfVoice;

    const resolvedMandatoryTerms = (Array.isArray(row.mandatory_terms) && row.mandatory_terms.length > 0)
      ? row.mandatory_terms
      : fallbackMandatoryTerms;

    const resolvedForbiddenWords = (Array.isArray(row.forbidden_words) && row.forbidden_words.length > 0)
      ? row.forbidden_words
      : fallbackForbiddenWords;

    const resolvedDefaultCtas = (Array.isArray(row.default_ctas) && row.default_ctas.length > 0)
      ? row.default_ctas
      : fallbackDefaultCtas;

    // Consulta puramente idempotente: NÃO realiza UPDATE no banco em requisição GET
    return NextResponse.json({
      id: row.id,
      clientId: row.client_id,
      version: row.version || 1,
      communicationProfile: CommunicationProfileSchema.parse(row.communication_profile || {}),
      valueProposition: row.value_proposition || "",
      marketNiche: row.market_niche || "",
      archetype: row.archetype || "",
      secondaryArchetype: row.secondary_archetype || "",
      toneOfVoice: resolvedToneOfVoice,
      brandContext: row.brand_context || "",
      targetAudiences,
      painPoints: row.pain_points || [],
      differentials: row.differentials || [],
      forbiddenWords: resolvedForbiddenWords,
      mandatoryTerms: resolvedMandatoryTerms,
      defaultCtas: resolvedDefaultCtas,
      instagramHandle: row.instagram_handle || "",
      websiteUrl: row.website_url || "",
      suggestedInstagram: !row.instagram_handle ? sessionInstagram : "",
      suggestedWebsite: !row.website_url ? sessionWebsite : "",
      whatsappCta: row.whatsapp_cta || "",
      notes: row.notes || "",
      formatGuidelines: row.format_guidelines || { reelsStandard: "", headlinesStandard: "", carouselStandard: "" },
      brandHistory: row.brand_history || "",
      corePromise: row.core_promise || "",
      salesObjections: row.sales_objections || "",
      commercialProfile: row.commercial_profile || {},
      catalogItems: row.catalog_items || [],
      updatedAt: row.updated_at,
    });
  } catch (error: unknown) {
    console.error("Erro ao buscar identidade do cliente:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const profile = CommunicationProfileSchema.safeParse(body.communicationProfile);
    if (body.communicationProfile !== undefined && !profile.success) {
      return NextResponse.json({ error: "Perfil de comunicação inválido." }, { status: 400 });
    }

    const payloadKeys = Object.keys(body);

    const result = await withTransaction(async (db) => {
      // 1. Verificar registro atual para detecção de conflito de concorrência atômica
      const currentRes = await db.query(
        `SELECT version, updated_at, format_guidelines, communication_profile FROM client_identities WHERE client_id = $1 FOR UPDATE`,
        [id]
      );

      const existing = currentRes.rows[0];

      // Se o cliente forneceu versão prévia e ela diverge do banco, reporta conflito atômico
      if (existing && body.version !== undefined && Number(body.version) !== Number(existing.version || 1)) {
        return {
          conflict: true,
          currentVersion: existing.version || 1,
          message: "Este registro foi atualizado em outra sessão ou aba. Seus dados locais foram preservados.",
        };
      }

      // 2. Não ressuscitar públicos apagados: só sincroniza targetAudiences se foi explicitamente enviado no corpo da requisição
      if (Array.isArray(body.targetAudiences) && body.targetAudiences.length > 0) {
        await addIdentityAudiences(db, id, body.targetAudiences);
      }

      // 3. Mesclar propriedades existentes com novas para formatGuidelines e communicationProfile
      const mergedGuidelines = {
        ...(existing?.format_guidelines || {}),
        ...(body.formatGuidelines || {}),
      };

      const mergedProfile = {
        ...(existing?.communication_profile || {}),
        ...(profile.success ? profile.data : {}),
      };

      // 4. Executar INSERT / UPDATE atômico incluindo format_guidelines e version
      const sql = `
        INSERT INTO client_identities (
          client_id, value_proposition, market_niche, archetype, secondary_archetype,
          tone_of_voice, brand_context, target_audiences, pain_points,
          differentials, forbidden_words, mandatory_terms, default_ctas,
          instagram_handle, website_url, whatsapp_cta, notes, communication_profile,
          brand_history, core_promise, sales_objections, commercial_profile,
          format_guidelines, version, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
          COALESCE($18::jsonb, '{}'::jsonb),
          $21, $22, $23, COALESCE($24::jsonb, '{}'::jsonb),
          COALESCE($20::jsonb, '{}'::jsonb),
          1, NOW()
        )
        ON CONFLICT (client_id) DO UPDATE SET
          value_proposition = CASE WHEN $19::jsonb ? 'valueProposition' THEN EXCLUDED.value_proposition ELSE client_identities.value_proposition END,
          market_niche = CASE WHEN $19::jsonb ? 'marketNiche' THEN EXCLUDED.market_niche ELSE client_identities.market_niche END,
          archetype = CASE WHEN $19::jsonb ? 'archetype' THEN EXCLUDED.archetype ELSE client_identities.archetype END,
          secondary_archetype = CASE WHEN $19::jsonb ? 'secondaryArchetype' THEN EXCLUDED.secondary_archetype ELSE client_identities.secondary_archetype END,
          tone_of_voice = CASE WHEN $19::jsonb ? 'toneOfVoice' THEN EXCLUDED.tone_of_voice ELSE client_identities.tone_of_voice END,
          brand_context = CASE WHEN $19::jsonb ? 'brandContext' THEN EXCLUDED.brand_context ELSE client_identities.brand_context END,
          target_audiences = client_identities.target_audiences,
          pain_points = CASE WHEN $19::jsonb ? 'painPoints' THEN EXCLUDED.pain_points ELSE client_identities.pain_points END,
          differentials = CASE WHEN $19::jsonb ? 'differentials' THEN EXCLUDED.differentials ELSE client_identities.differentials END,
          forbidden_words = CASE WHEN $19::jsonb ? 'forbiddenWords' THEN EXCLUDED.forbidden_words ELSE client_identities.forbidden_words END,
          mandatory_terms = CASE WHEN $19::jsonb ? 'mandatoryTerms' THEN EXCLUDED.mandatory_terms ELSE client_identities.mandatory_terms END,
          default_ctas = CASE WHEN $19::jsonb ? 'defaultCtas' THEN EXCLUDED.default_ctas ELSE client_identities.default_ctas END,
          instagram_handle = CASE WHEN $19::jsonb ? 'instagramHandle' THEN EXCLUDED.instagram_handle ELSE client_identities.instagram_handle END,
          website_url = CASE WHEN $19::jsonb ? 'websiteUrl' THEN EXCLUDED.website_url ELSE client_identities.website_url END,
          whatsapp_cta = CASE WHEN $19::jsonb ? 'whatsappCta' THEN EXCLUDED.whatsapp_cta ELSE client_identities.whatsapp_cta END,
          notes = CASE WHEN $19::jsonb ? 'notes' THEN EXCLUDED.notes ELSE client_identities.notes END,
          format_guidelines = CASE WHEN $19::jsonb ? 'formatGuidelines' THEN $20::jsonb ELSE client_identities.format_guidelines END,
          communication_profile = CASE WHEN $19::jsonb ? 'communicationProfile' THEN $18::jsonb ELSE client_identities.communication_profile END,
          brand_history = CASE WHEN $19::jsonb ? 'brandHistory' THEN EXCLUDED.brand_history ELSE client_identities.brand_history END,
          core_promise = CASE WHEN $19::jsonb ? 'corePromise' THEN EXCLUDED.core_promise ELSE client_identities.core_promise END,
          sales_objections = CASE WHEN $19::jsonb ? 'salesObjections' THEN EXCLUDED.sales_objections ELSE client_identities.sales_objections END,
          commercial_profile = CASE WHEN $19::jsonb ? 'commercialProfile' THEN COALESCE($24::jsonb, client_identities.commercial_profile) ELSE client_identities.commercial_profile END,
          version = COALESCE(client_identities.version, 1) + 1,
          updated_at = NOW()
        RETURNING *
      `;

      const res = await db.query(sql, [
        id,
        body.valueProposition !== undefined ? body.valueProposition : null,
        body.marketNiche !== undefined ? body.marketNiche : null,
        body.archetype !== undefined ? body.archetype : null,
        body.secondaryArchetype !== undefined ? body.secondaryArchetype : null,
        body.toneOfVoice !== undefined ? body.toneOfVoice : [],
        body.brandContext !== undefined ? body.brandContext : null,
        [],
        body.painPoints !== undefined ? body.painPoints : [],
        body.differentials !== undefined ? body.differentials : [],
        body.forbiddenWords !== undefined ? body.forbiddenWords : [],
        body.mandatoryTerms !== undefined ? body.mandatoryTerms : [],
        body.defaultCtas !== undefined ? body.defaultCtas : [],
        body.instagramHandle !== undefined ? body.instagramHandle : null,
        body.websiteUrl !== undefined ? body.websiteUrl : null,
        body.whatsappCta !== undefined ? body.whatsappCta : null,
        body.notes !== undefined ? body.notes : null,
        JSON.stringify(mergedProfile),
        JSON.stringify(payloadKeys),
        JSON.stringify(mergedGuidelines),
        body.brandHistory !== undefined ? body.brandHistory : null,
        body.corePromise !== undefined ? body.corePromise : null,
        body.salesObjections !== undefined ? body.salesObjections : null,
        body.commercialProfile ? JSON.stringify(body.commercialProfile) : null,
      ]);

      return { success: true, data: res.rows[0] };
    });

    if ("conflict" in result && result.conflict) {
      return NextResponse.json(result, { status: 409 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Erro ao salvar identidade do cliente:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao salvar." },
      { status: 500 }
    );
  }
}
