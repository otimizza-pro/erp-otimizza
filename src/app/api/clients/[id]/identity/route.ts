import {CommunicationProfileSchema,emptyCommunicationProfile} from "@/modules/clients/communication-profile";
import {requireAdminUser} from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db/pool";
import { addIdentityAudiences } from "@/modules/clients/identity-audiences";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return NextResponse.json({error:"Acesso não autorizado"},{status:401}); }
  try {
    const { id } = await params;

    const res = await query(
      `SELECT * FROM client_identities WHERE client_id = $1`,
      [id]
    );

    const audiences = await query("SELECT name FROM client_audiences WHERE client_id=$1 AND archived_at IS NULL ORDER BY is_default DESC,name",[id]);
    const targetAudiences = audiences.rows.map(row=>String(row.name));

    // Verificar se há Instagram ou Site registrado em sessões de briefing do cliente
    let sessionInstagram = "";
    let sessionWebsite = "";
    try {
      const sessionRes = await query<{ instagram_url: string | null; website_url: string | null }>(
        `SELECT instagram_url, website_url FROM client_briefing_sessions 
         WHERE client_id = $1 AND (instagram_url IS NOT NULL OR website_url IS NOT NULL) 
         ORDER BY updated_at DESC LIMIT 1`,
        [id]
      );
      if (sessionRes?.rows && sessionRes.rows.length > 0) {
        sessionInstagram = sessionRes.rows[0].instagram_url || "";
        sessionWebsite = sessionRes.rows[0].website_url || "";
      }
    } catch {
      // Falha não impeditiva se briefing não estiver disponível
    }

    if (res.rows.length === 0) {
      // Retornar estrutura padrão vazia com fallback do briefing
      return NextResponse.json({
        clientId: id,
        communicationProfile:emptyCommunicationProfile,
        valueProposition: "",
        marketNiche: "",
        archetype: "",
        secondaryArchetype: "",
        toneOfVoice: [],
        brandContext: "",
        targetAudiences,
        painPoints: [],
        differentials: [],
        forbiddenWords: [],
        mandatoryTerms: [],
        defaultCtas: [],
        instagramHandle: sessionInstagram,
        websiteUrl: sessionWebsite,
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
    const instagramHandle = row.instagram_handle || sessionInstagram;
    const websiteUrl = row.website_url || sessionWebsite;

    // Se o DNA não tinha o Instagram ou Site mas a sessão do briefing tinha, auto-sincronizar no banco
    if ((!row.instagram_handle && sessionInstagram) || (!row.website_url && sessionWebsite)) {
      await query(
        `UPDATE client_identities 
         SET instagram_handle = COALESCE(NULLIF(instagram_handle, ''), $2),
             website_url = COALESCE(NULLIF(website_url, ''), $3),
             updated_at = NOW()
         WHERE client_id = $1`,
        [id, sessionInstagram || null, sessionWebsite || null]
      );
    }

    return NextResponse.json({
      id: row.id,
      clientId: row.client_id,
      communicationProfile:CommunicationProfileSchema.parse(row.communication_profile || {}),
      valueProposition: row.value_proposition || "",
      marketNiche: row.market_niche || "",
      archetype: row.archetype || "",
      secondaryArchetype: row.secondary_archetype || "",
      toneOfVoice: row.tone_of_voice || [],
      brandContext: row.brand_context || "",
      targetAudiences,
      painPoints: row.pain_points || [],
      differentials: row.differentials || [],
      forbiddenWords: row.forbidden_words || [],
      mandatoryTerms: row.mandatory_terms || [],
      defaultCtas: row.default_ctas || [],
      instagramHandle,
      websiteUrl,
      whatsappCta: row.whatsapp_cta || "",
      notes: row.notes || "",
      formatGuidelines: row.format_guidelines || { reelsStandard: "", headlinesStandard: "", carouselStandard: "" },
      brandHistory: row.brand_history || "",
      corePromise: row.core_promise || "",
      salesObjections: row.sales_objections || "",
      commercialProfile: row.commercial_profile || {},
      catalogItems: row.catalog_items || [],
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
  try { await requireAdminUser(); } catch { return NextResponse.json({error:"Acesso não autorizado"},{status:401}); }
  try {
    const { id } = await params;
    const body = await request.json();
    const profile=CommunicationProfileSchema.safeParse(body.communicationProfile);
    if(body.communicationProfile !== undefined && !profile.success)return NextResponse.json({error:"Perfil de comunicação inválido"},{status:400});

    const sql = `
      INSERT INTO client_identities (
        client_id, value_proposition, market_niche, archetype, secondary_archetype,
        tone_of_voice, brand_context, target_audiences, pain_points,
        differentials, forbidden_words, mandatory_terms, default_ctas,
        instagram_handle, website_url, whatsapp_cta, notes, communication_profile,
        brand_history, core_promise, sales_objections, commercial_profile, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, COALESCE($18::jsonb,'{}'::jsonb),
        $21, $22, $23, COALESCE($24::jsonb, '{}'::jsonb), NOW()
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
        communication_profile = COALESCE($18::jsonb,client_identities.communication_profile),
        brand_history = CASE WHEN $19::jsonb ? 'brandHistory' THEN EXCLUDED.brand_history ELSE client_identities.brand_history END,
        core_promise = CASE WHEN $19::jsonb ? 'corePromise' THEN EXCLUDED.core_promise ELSE client_identities.core_promise END,
        sales_objections = CASE WHEN $19::jsonb ? 'salesObjections' THEN EXCLUDED.sales_objections ELSE client_identities.sales_objections END,
        commercial_profile = CASE WHEN $19::jsonb ? 'commercialProfile' THEN COALESCE($24::jsonb, client_identities.commercial_profile) ELSE client_identities.commercial_profile END,
        updated_at = NOW()
      RETURNING *
    `;

    const res = await withTransaction(async db => {
      await addIdentityAudiences(db,id,body.targetAudiences);
      return db.query(sql, [
      id,
      body.valueProposition || null,
      body.marketNiche || null,
      body.archetype || null,
      body.secondaryArchetype || null,
      body.toneOfVoice || [],
      body.brandContext || null,
      [],
      body.painPoints || [],
      body.differentials || [],
      body.forbiddenWords || [],
      body.mandatoryTerms || [],
      body.defaultCtas || [],
      body.instagramHandle || null,
      body.websiteUrl || null,
      body.whatsappCta || null,
      body.notes || null,
      body.communicationProfile !== undefined && profile.success ? JSON.stringify(profile.data) : null,
      JSON.stringify(Object.keys(body)),
      JSON.stringify(body.formatGuidelines || {}),
      body.brandHistory || null,
      body.corePromise || null,
      body.salesObjections || null,
      body.commercialProfile ? JSON.stringify(body.commercialProfile) : null,
      ]);
    });

    if (body.instagramHandle || body.websiteUrl) {
      await query(
        `UPDATE client_briefing_sessions 
         SET instagram_url = COALESCE(NULLIF($2, ''), instagram_url),
             website_url = COALESCE(NULLIF($3, ''), website_url),
             updated_at = NOW()
         WHERE client_id = $1`,
        [id, body.instagramHandle || null, body.websiteUrl || null]
      );
    }

    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error: unknown) {
    console.error("Erro ao salvar identidade do cliente:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao salvar." },
      { status: 500 }
    );
  }
}

