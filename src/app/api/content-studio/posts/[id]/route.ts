import {requireAdminUser} from "@/lib/auth/require-auth";
import {contentBriefSchema} from "@/modules/clients/content-brief";
import { NextResponse } from "next/server";
import { query } from "@/lib/db/pool";

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

    const sql = `
      UPDATE content_calendar_items SET
        title = COALESCE($1, title),
        central_idea = COALESCE($2, central_idea),
        selected_headline = COALESCE($3, selected_headline),
        headline_candidate_id = CASE WHEN $3::text IS NOT NULL AND selected_headline IS DISTINCT FROM $3 THEN NULL ELSE headline_candidate_id END,
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
        editorial_brief = COALESCE($15::jsonb, editorial_brief),
        updated_at = NOW()
      WHERE id = $14
      RETURNING *
    `;

    const res = await query(sql, [
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
      body.format,
      body.status,
      body.scheduledDate,
      id,
      editorialBrief?JSON.stringify(editorialBrief):null,
    ]);

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

