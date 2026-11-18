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
        targetAudiences: [],
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
      targetAudiences: row.target_audiences || [],
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
        value_proposition = EXCLUDED.value_proposition,
        market_niche = EXCLUDED.market_niche,
        archetype = EXCLUDED.archetype,
        tone_of_voice = EXCLUDED.tone_of_voice,
        brand_context = EXCLUDED.brand_context,
        target_audiences = EXCLUDED.target_audiences,
        pain_points = EXCLUDED.pain_points,
        differentials = EXCLUDED.differentials,
        forbidden_words = EXCLUDED.forbidden_words,
        mandatory_terms = EXCLUDED.mandatory_terms,
        default_ctas = EXCLUDED.default_ctas,
        instagram_handle = EXCLUDED.instagram_handle,
        website_url = EXCLUDED.website_url,
        whatsapp_cta = EXCLUDED.whatsapp_cta,
        notes = EXCLUDED.notes,
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

