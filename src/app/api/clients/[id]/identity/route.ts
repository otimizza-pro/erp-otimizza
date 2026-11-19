import {CommunicationProfileSchema,emptyCommunicationProfile} from "@/modules/clients/communication-profile";
import {requireAdminUser} from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { query } from "@/lib/db/pool";

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

    const audiences=await query("SELECT name FROM client_audiences WHERE client_id=$1 AND archived_at IS NULL ORDER BY is_default DESC,name",[id]);
    const targetAudiences=audiences.rows.map(row=>String(row.name));
    if (res.rows.length === 0) {
      // Retornar estrutura padrão vazia
      return NextResponse.json({
        clientId: id,
        communicationProfile:emptyCommunicationProfile,
        valueProposition: "",
        marketNiche: "",
        archetype: "",
        toneOfVoice: [],
        brandContext: "",
        targetAudiences,
        painPoints: [],
        differentials: [],
        forbiddenWords: [],
        mandatoryTerms: [],
        defaultCtas: [],
        instagramHandle: "",
        websiteUrl: "",
        whatsappCta: "",
        notes: "",
      });
    }

    const row = res.rows[0];
    return NextResponse.json({
      id: row.id,
      clientId: row.client_id,
      communicationProfile:CommunicationProfileSchema.parse(row.communication_profile || {}),
      valueProposition: row.value_proposition || "",
      marketNiche: row.market_niche || "",
      archetype: row.archetype || "",
      toneOfVoice: row.tone_of_voice || [],
      brandContext: row.brand_context || "",
      targetAudiences,
      painPoints: row.pain_points || [],
      differentials: row.differentials || [],
      forbiddenWords: row.forbidden_words || [],
      mandatoryTerms: row.mandatory_terms || [],
      defaultCtas: row.default_ctas || [],
      instagramHandle: row.instagram_handle || "",
      websiteUrl: row.website_url || "",
      whatsappCta: row.whatsapp_cta || "",
      notes: row.notes || "",
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
        client_id, value_proposition, market_niche, archetype,
        tone_of_voice, brand_context, target_audiences, pain_points,
        differentials, forbidden_words, mandatory_terms, default_ctas,
        instagram_handle, website_url, whatsapp_cta, notes, communication_profile, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, COALESCE($17::jsonb,'{}'::jsonb), NOW()
      )
      ON CONFLICT (client_id) DO UPDATE SET
        value_proposition = CASE WHEN $18::jsonb ? 'valueProposition' THEN EXCLUDED.value_proposition ELSE client_identities.value_proposition END,
        market_niche = CASE WHEN $18::jsonb ? 'marketNiche' THEN EXCLUDED.market_niche ELSE client_identities.market_niche END,
        archetype = CASE WHEN $18::jsonb ? 'archetype' THEN EXCLUDED.archetype ELSE client_identities.archetype END,
        tone_of_voice = CASE WHEN $18::jsonb ? 'toneOfVoice' THEN EXCLUDED.tone_of_voice ELSE client_identities.tone_of_voice END,
        brand_context = CASE WHEN $18::jsonb ? 'brandContext' THEN EXCLUDED.brand_context ELSE client_identities.brand_context END,
        target_audiences = CASE WHEN $18::jsonb ? 'targetAudiences' THEN EXCLUDED.target_audiences ELSE client_identities.target_audiences END,
        pain_points = CASE WHEN $18::jsonb ? 'painPoints' THEN EXCLUDED.pain_points ELSE client_identities.pain_points END,
        differentials = CASE WHEN $18::jsonb ? 'differentials' THEN EXCLUDED.differentials ELSE client_identities.differentials END,
        forbidden_words = CASE WHEN $18::jsonb ? 'forbiddenWords' THEN EXCLUDED.forbidden_words ELSE client_identities.forbidden_words END,
        mandatory_terms = CASE WHEN $18::jsonb ? 'mandatoryTerms' THEN EXCLUDED.mandatory_terms ELSE client_identities.mandatory_terms END,
        default_ctas = CASE WHEN $18::jsonb ? 'defaultCtas' THEN EXCLUDED.default_ctas ELSE client_identities.default_ctas END,
        instagram_handle = CASE WHEN $18::jsonb ? 'instagramHandle' THEN EXCLUDED.instagram_handle ELSE client_identities.instagram_handle END,
        website_url = CASE WHEN $18::jsonb ? 'websiteUrl' THEN EXCLUDED.website_url ELSE client_identities.website_url END,
        whatsapp_cta = CASE WHEN $18::jsonb ? 'whatsappCta' THEN EXCLUDED.whatsapp_cta ELSE client_identities.whatsapp_cta END,
        notes = CASE WHEN $18::jsonb ? 'notes' THEN EXCLUDED.notes ELSE client_identities.notes END,
        communication_profile = COALESCE($17::jsonb,client_identities.communication_profile),
        updated_at = NOW()
      RETURNING *
    `;

    const res = await query(sql, [
      id,
      body.valueProposition || null,
      body.marketNiche || null,
      body.archetype || null,
      body.toneOfVoice || [],
      body.brandContext || null,
      body.targetAudiences || [],
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
    ]);

    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error: unknown) {
    console.error("Erro ao salvar identidade do cliente:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao salvar." },
      { status: 500 }
    );
  }
}

