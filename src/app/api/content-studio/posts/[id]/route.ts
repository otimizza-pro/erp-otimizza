import { NextResponse } from "next/server";
import { query } from "@/lib/db/pool";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
  try {
    const { id } = await params;
    const body = await request.json();

    const sql = `
      UPDATE content_calendar_items SET
        title = COALESCE($1, title),
        central_idea = COALESCE($2, central_idea),
        selected_headline = COALESCE($3, selected_headline),
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
  try {
    const { id } = await params;
    await query(`DELETE FROM content_calendar_items WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: "Post excluído com sucesso." });
  } catch (error: unknown) {
    console.error("Erro ao excluir post:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao excluir post." },
      { status: 500 }
    );
  }
}
