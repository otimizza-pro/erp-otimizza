import {requireAdminUser} from "@/lib/auth/require-auth";
import {contentBriefSchema} from "@/modules/clients/content-brief";
import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db/pool";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return NextResponse.json({success:false,error:"Acesso não autorizado"},{status:401}); }
  try {
    const { id } = await params;
    const res = await query(
      `SELECT * FROM content_calendar_items WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Post não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao carregar post." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return NextResponse.json({success:false,error:"Acesso não autorizado"},{status:401}); }
  try {
    const { id } = await params;
    const body = await request.json();
    const editorialBrief=body.editorialBrief?contentBriefSchema.parse(body.editorialBrief):null;
    const sharedPatch:Record<string,unknown>={...(editorialBrief||{})};
    if(typeof body.centralIdea==='string')sharedPatch.bigIdea=body.centralIdea;
    if(typeof body.toneOfVoice==='string')sharedPatch.tone=body.toneOfVoice;
    if(typeof body.callToAction==='string')sharedPatch.cta=body.callToAction;
    if(typeof body.format==='string')sharedPatch.format=body.format==='Post estático'?'Estático':body.format;
    const normalizedFormat=body.format==='Estático'?'Post estático':body.format;

    const sql = `
      UPDATE content_calendar_items SET
        title = COALESCE($1, title),
        central_idea = COALESCE($2, central_idea),
        selected_headline = COALESCE($3, selected_headline),
        headline_candidate_id = CASE WHEN $3::text IS NOT NULL AND selected_headline IS DISTINCT FROM $3 THEN NULL ELSE headline_candidate_id END,
        selected_subheadline = CASE WHEN $3::text IS NOT NULL AND selected_headline IS DISTINCT FROM $3 THEN '' ELSE selected_subheadline END,
        selected_caption = COALESCE($4, selected_caption),
        selected_reels = COALESCE($5, selected_reels),
        selected_carousel = COALESCE($6, selected_carousel),
        content_type = COALESCE($7, content_type),
        ad_status = COALESCE($8, ad_status),
        image_url = COALESCE($9, image_url),
        post_tag = COALESCE($10, post_tag),
        format = COALESCE($11, format),
        status = COALESCE($12, status),
        scheduled_date = COALESCE($13, scheduled_date),
        scheduled_time = COALESCE($17, scheduled_time),
        visual_prompt = COALESCE($18, visual_prompt),
        visual_format = COALESCE($19, visual_format),
        copy_site_lp = COALESCE($20, copy_site_lp),
        copy_meta_ads = COALESCE($21, copy_meta_ads),
        copy_google_ads = COALESCE($22, copy_google_ads),
        editorial_brief = COALESCE($15::jsonb, editorial_brief),
        headline_brief = CASE WHEN headline_brief IS NOT NULL THEN headline_brief || $16::jsonb ELSE headline_brief END,
        headline_content_stale = CASE WHEN $4::text IS NOT NULL OR $5::text IS NOT NULL OR $6::text IS NOT NULL THEN false
          WHEN (headline_brief IS NOT NULL AND headline_brief IS DISTINCT FROM headline_brief || $16::jsonb OR $3::text IS NOT NULL AND selected_headline IS DISTINCT FROM $3)
          AND (selected_caption IS NOT NULL OR selected_reels IS NOT NULL OR selected_carousel IS NOT NULL) THEN true ELSE headline_content_stale END,
        updated_at = NOW()
      WHERE id = $14
      RETURNING *
    `;

    const res = await withTransaction(async db=>{
      await db.query('SELECT id FROM content_calendar_items WHERE id=$1 FOR UPDATE',[id]);
      const result=await db.query(sql, [
      body.title,
      body.centralIdea,
      body.selectedHeadline,
      body.selectedCaption,
      body.selectedReels,
      body.selectedCarousel,
      body.contentType,
      body.adStatus,
      body.imageUrl,
      body.postTag,
      normalizedFormat,
      body.status,
      body.scheduledDate,
      id,
      editorialBrief?JSON.stringify(editorialBrief):null,
      JSON.stringify(sharedPatch),
      body.scheduledTime || null,
      body.visualPrompt || null,
      body.visualFormat || null,
      body.copySiteLp || null,
      body.copyMetaAds || null,
      body.copyGoogleAds || null,
    ]);
      if(result.rowCount&&Object.keys(sharedPatch).length)await db.query('UPDATE headline_workspaces SET brief=brief || $2::jsonb,revision=revision+1,updated_at=NOW() WHERE content_id=$1',[id,JSON.stringify(sharedPatch)]);
      return result;
    });

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Post não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error: unknown) {
    console.error("Erro ao atualizar post:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao atualizar post." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return NextResponse.json({success:false,error:"Acesso não autorizado"},{status:401}); }
  try {
    const { id } = await params;
    await query(`UPDATE content_calendar_items SET archived_at=NOW(),updated_at=NOW() WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: "Post arquivado. Histórico de criação e avaliações preservado." });
  } catch (error: unknown) {
    console.error("Erro ao excluir post:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao excluir post." },
      { status: 500 }
    );
  }
}

