import { requireAdminUser } from "@/lib/auth/require-auth";
import { contentBriefSchema } from "@/modules/clients/content-brief";
import { buildProjectPostTitle } from "@/modules/projects/social-media-schedule";
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
      `SELECT c.*, c.xmin::text AS edit_version, p.name AS project_name
       FROM content_calendar_items c LEFT JOIN projects p ON p.id = c.project_id
       WHERE c.id = $1 AND c.archived_at IS NULL`,
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
        content_type = CASE WHEN project_id IS NULL THEN COALESCE($7, content_type) ELSE content_type END,
        ad_status = CASE WHEN project_id IS NULL THEN COALESCE($8, ad_status) ELSE ad_status END,
        image_url = COALESCE($9, image_url),
        post_tag = COALESCE($10, post_tag),
        format = COALESCE($11, format),
        status = CASE WHEN status = 'PUBLISHED' THEN status ELSE COALESCE($12, status) END,
        scheduled_date = CASE WHEN status = 'PUBLISHED' THEN scheduled_date ELSE COALESCE($13, scheduled_date) END,
        scheduled_time = CASE WHEN status = 'PUBLISHED' THEN scheduled_time ELSE COALESCE($17, scheduled_time) END,
        visual_prompt = COALESCE($18, visual_prompt),
        visual_format = COALESCE($19, visual_format),
        copy_site_lp = COALESCE($20, copy_site_lp),
        copy_meta_ads = COALESCE($21, copy_meta_ads),
        copy_google_ads = COALESCE($22, copy_google_ads),
        published_url = CASE WHEN $26::boolean THEN NULLIF(btrim($27::text), '') ELSE published_url END,
        editorial_brief = COALESCE($15::jsonb, editorial_brief),
        format_config = COALESCE($28::jsonb, format_config),
        headline_brief = CASE WHEN headline_brief IS NOT NULL THEN headline_brief || $16::jsonb ELSE headline_brief END,
        headline_content_stale = CASE
          WHEN (headline_brief IS NOT NULL AND headline_brief IS DISTINCT FROM headline_brief || $16::jsonb OR $3::text IS NOT NULL AND selected_headline IS DISTINCT FROM $3)
            AND (selected_caption IS NOT NULL OR selected_reels IS NOT NULL OR selected_carousel IS NOT NULL
              OR $4::text IS NOT NULL OR $5::text IS NOT NULL OR $6::text IS NOT NULL) THEN true
          WHEN $25::boolean AND ($4::text IS NOT NULL OR $5::text IS NOT NULL OR $6::text IS NOT NULL) THEN false
          ELSE headline_content_stale END,
        updated_at = NOW()
      WHERE id = $14 AND archived_at IS NULL AND ($23::uuid IS NULL OR client_id = $23)
        AND ($24::text IS NULL OR xmin::text = $24)
      RETURNING *, xmin::text AS edit_version
    `;

    const res = await withTransaction(async db=>{
      const locked = await db.query<{
        status: string;
        project_id?: string | null;
        project_post_number?: number | null;
        format?: string | null;
        selected_headline?: string | null;
        central_idea?: string | null;
        client_name?: string | null;
      }>(
        `SELECT c.status, c.project_id, c.project_post_number, c.format, c.selected_headline, c.central_idea,
                COALESCE(NULLIF(cl.trade_name, ''), cl.name) AS client_name
         FROM content_calendar_items c
         LEFT JOIN clients cl ON cl.id = c.client_id
         WHERE c.id=$1 AND ($2::uuid IS NULL OR c.client_id=$2) FOR UPDATE OF c`,
        [id, body.clientId || null],
      );
      const lockedRow = locked.rows[0];
      if (lockedRow?.status === "PUBLISHED" && (body.scheduledDate || body.scheduledTime || (body.status && body.status !== "PUBLISHED"))) {
        return null;
      }
      const effectiveTitle = lockedRow?.project_id
        ? (normalizedFormat !== undefined || body.selectedHeadline !== undefined || body.centralIdea !== undefined
            ? buildProjectPostTitle({
                postNumber: lockedRow.project_post_number,
                clientName: lockedRow.client_name || "",
                format: normalizedFormat ?? lockedRow.format,
                headline: body.selectedHeadline !== undefined ? body.selectedHeadline : lockedRow.selected_headline,
                centralIdea: body.centralIdea !== undefined ? body.centralIdea : lockedRow.central_idea,
              })
            : null)
        : body.title;
      const result=await db.query(sql, [
      effectiveTitle,
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
      body.scheduledDate ? String(body.scheduledDate).slice(0, 10) : null,
      id,
      editorialBrief?JSON.stringify(editorialBrief):null,
      JSON.stringify(sharedPatch),
      body.scheduledTime || null,
      body.visualPrompt || null,
      body.visualFormat || null,
      body.copySiteLp || null,
      body.copyMetaAds || null,
      body.copyGoogleAds || null,
      body.clientId || null,
      body.editVersion || null,
      body.confirmContentRevision === true,
      body.publishedUrl !== undefined,
      typeof body.publishedUrl === "string" ? body.publishedUrl : null,
      body.formatConfig && typeof body.formatConfig === "object" ? JSON.stringify(body.formatConfig) : null,
    ]);
      if(result.rowCount&&Object.keys(sharedPatch).length)await db.query('UPDATE headline_workspaces SET brief=brief || $2::jsonb,revision=revision+1,updated_at=NOW() WHERE content_id=$1',[id,JSON.stringify(sharedPatch)]);
      return result;
    });

    if (!res) return NextResponse.json({ success: false, error: "Uma publicação concluída não pode ser reagendada." }, { status: 409 });
    if (res.rows.length === 0) {
      if (body.editVersion) {
        return NextResponse.json({ success: false, error: "A peça foi alterada em outra tela ou está indisponível. Reabra antes de salvar." }, { status: 409 });
      }
      return NextResponse.json({ success: false, error: "Post não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error: unknown) {
    console.error("Erro ao atualizar post:", error);
    const msg = error instanceof Error ? error.message : "Erro ao atualizar post.";
    const isTriggerRule =
      msg.includes("Aprove as versões") ||
      msg.includes("Salve e aprove pelo menos um material") ||
      msg.includes("Use Registrar publicação");
    return NextResponse.json(
      { success: false, error: msg },
      { status: isTriggerRule ? 422 : 500 }
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

