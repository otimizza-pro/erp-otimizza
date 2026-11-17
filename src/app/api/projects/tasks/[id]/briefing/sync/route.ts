import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const { id: taskId } = await params;

    // Buscar a sessão e a tarefa
    const res = await query<{
      session_id: string;
      client_id: string | null;
      extracted_identity: Record<string, unknown>;
      company_name: string;
      instagram_url: string | null;
      website_url: string | null;
      initial_notes: string | null;
      competitor_notes: string | null;
    }>(
      `
      SELECT 
        s.id as session_id,
        s.client_id,
        s.extracted_identity,
        s.company_name,
        s.instagram_url,
        s.website_url,
        s.initial_notes,
        s.competitor_notes
      FROM public.client_briefing_sessions s
      WHERE s.task_id = $1
      ORDER BY s.created_at DESC LIMIT 1
      `,
      [taskId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Sessão de briefing não encontrada para esta tarefa." }, { status: 404 });
    }

    const {
      client_id,
      extracted_identity,
      instagram_url,
      website_url,
      initial_notes,
      competitor_notes
    } = res.rows[0];

    if (!client_id) {
      return NextResponse.json({
        error: "Este projeto não possui um cliente associado diretamente na base de clientes."
      }, { status: 400 });
    }

    const ext = extracted_identity || {};
    const valueProposition = (ext.valueProposition as string) || (ext.differentials as string) || "";
    const marketNiche = (ext.marketNiche as string) || "";
    const archetype = (ext.archetype as string) || "SABIO";
    const toneOfVoice = Array.isArray(ext.toneOfVoice) ? ext.toneOfVoice : ["Direto e didático", "Focado em decisões e crescimento"];
    const targetAudiences = Array.isArray(ext.targetAudiences) ? ext.targetAudiences : (ext.targetAudience ? [String(ext.targetAudience)] : []);
    const painPoints = Array.isArray(ext.painPoints) ? ext.painPoints : [];
    const differentials = Array.isArray(ext.differentialsList) ? ext.differentialsList : (ext.differentials ? [String(ext.differentials)] : []);
    const forbiddenWords = Array.isArray(ext.forbiddenWords) ? ext.forbiddenWords : [];
    const mandatoryTerms = Array.isArray(ext.mandatoryTerms) ? ext.mandatoryTerms : [];
    const defaultCtas = Array.isArray(ext.defaultCtas) ? ext.defaultCtas : ["Iniciar uma conversa qualificada no WhatsApp"];
    const instagramHandle = (ext.instagramHandle as string) || (instagram_url ? instagram_url.replace(/https?:\/\/(www\.)?instagram\.com\/?/, "").replace(/\/$/, "") : "");
    const notes = [initial_notes, competitor_notes ? `Concorrentes & Referências: ${competitor_notes}` : ""].filter(Boolean).join("\n\n");

    // Inserir ou atualizar client_identities
    const upsertSql = `
      INSERT INTO public.client_identities (
        client_id, value_proposition, market_niche, archetype,
        tone_of_voice, brand_context, target_audiences, pain_points,
        differentials, forbidden_words, mandatory_terms, default_ctas,
        instagram_handle, website_url, notes, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()
      )
      ON CONFLICT (client_id) DO UPDATE SET
        value_proposition = COALESCE(NULLIF(EXCLUDED.value_proposition, ''), client_identities.value_proposition),
        market_niche = COALESCE(NULLIF(EXCLUDED.market_niche, ''), client_identities.market_niche),
        archetype = COALESCE(NULLIF(EXCLUDED.archetype, ''), client_identities.archetype),
        tone_of_voice = CASE WHEN array_length(EXCLUDED.tone_of_voice, 1) > 0 THEN EXCLUDED.tone_of_voice ELSE client_identities.tone_of_voice END,
        brand_context = COALESCE(NULLIF(EXCLUDED.brand_context, ''), client_identities.brand_context),
        target_audiences = CASE WHEN array_length(EXCLUDED.target_audiences, 1) > 0 THEN EXCLUDED.target_audiences ELSE client_identities.target_audiences END,
        pain_points = CASE WHEN array_length(EXCLUDED.pain_points, 1) > 0 THEN EXCLUDED.pain_points ELSE client_identities.pain_points END,
        differentials = CASE WHEN array_length(EXCLUDED.differentials, 1) > 0 THEN EXCLUDED.differentials ELSE client_identities.differentials END,
        forbidden_words = CASE WHEN array_length(EXCLUDED.forbidden_words, 1) > 0 THEN EXCLUDED.forbidden_words ELSE client_identities.forbidden_words END,
        mandatory_terms = CASE WHEN array_length(EXCLUDED.mandatory_terms, 1) > 0 THEN EXCLUDED.mandatory_terms ELSE client_identities.mandatory_terms END,
        default_ctas = CASE WHEN array_length(EXCLUDED.default_ctas, 1) > 0 THEN EXCLUDED.default_ctas ELSE client_identities.default_ctas END,
        instagram_handle = COALESCE(NULLIF(EXCLUDED.instagram_handle, ''), client_identities.instagram_handle),
        website_url = COALESCE(NULLIF(EXCLUDED.website_url, ''), client_identities.website_url),
        notes = COALESCE(NULLIF(EXCLUDED.notes, ''), client_identities.notes),
        updated_at = NOW()
      RETURNING *
    `;

    await query(upsertSql, [
      client_id,
      valueProposition,
      marketNiche,
      archetype,
      toneOfVoice,
      ext.brandContext || "",
      targetAudiences,
      painPoints,
      differentials,
      forbiddenWords,
      mandatoryTerms,
      defaultCtas,
      instagramHandle,
      website_url,
      notes,
    ]);

    // Marcar a tarefa como concluída se o briefing estiver pronto
    await query(
      `UPDATE public.project_tasks SET status = 'DONE', completed_at = NOW() WHERE id = $1`,
      [taskId]
    );

    return NextResponse.json({
      success: true,
      message: "Identidade do cliente sincronizada com sucesso e tarefa concluída!",
    });
  } catch (err: unknown) {
    console.error("Erro ao sincronizar briefing:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno." },
      { status: 500 }
    );
  }
}
