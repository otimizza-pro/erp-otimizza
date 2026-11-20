import {contentBriefSchema} from "@/modules/clients/content-brief";
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";
import {z} from "zod";

export const dynamic = "force-dynamic";

export async function PATCH(request:NextRequest){
  try{await requireAdminUser();}catch{return NextResponse.json({error:"Acesso não autorizado."},{status:401});}
  try{
    const body=z.object({id:z.string().uuid(),clientId:z.string().uuid(),archived:z.boolean()}).parse(await request.json());
    const result=await query("UPDATE content_calendar_items SET archived_at=CASE WHEN $3 THEN NOW() ELSE NULL END WHERE id=$1 AND client_id=$2 RETURNING id",[body.id,body.clientId,body.archived]);
    if(!result.rows.length)return NextResponse.json({error:"Conteúdo não encontrado nesta empresa."},{status:404});
    return NextResponse.json({success:true});
  }catch{return NextResponse.json({error:"Não foi possível alterar o arquivamento."},{status:400});}
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const month = searchParams.get("month"); // YYYY-MM

  try {
    const conditions: string[] = [searchParams.get("archived")==="true"?"c.archived_at IS NOT NULL":"c.archived_at IS NULL"];
    const params: unknown[] = [];
    let pIdx = 1;

    if (clientId) {
      conditions.push(`c.client_id = $${pIdx++}`);
      params.push(clientId);
    }

    if (month) {
      conditions.push(`TO_CHAR(c.scheduled_date, 'YYYY-MM') = $${pIdx++}`);
      params.push(month);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const res = await query(
      `SELECT c.*, cl.name as client_name, el.pillar_name, el.theme as line_theme
       FROM content_calendar_items c
       JOIN clients cl ON cl.id = c.client_id
       LEFT JOIN client_editorial_lines el ON el.id = c.editorial_line_id
       ${where}
       ORDER BY c.scheduled_date DESC NULLS LAST, c.created_at DESC`,
      params
    );

    return NextResponse.json({ items: res.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao carregar calendário.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const editorialBrief=body.editorialBrief?contentBriefSchema.parse(body.editorialBrief):null;
    const {
      clientId,
      editorialLineId,
      scheduledDate,
      scheduledTime,
      format,
      status,
      title,
      centralIdea,
      targetAudienceName,
      toneOfVoice,
      callToAction,
      promptUsed,
      headlinesGenerated,
      selectedHeadline,
      captionsGenerated,
      selectedCaption,
      reelsOptions,
      selectedReels,
      carouselOptions,
      selectedCarousel,
      notes
    } = body;

    if (!clientId || !title?.trim() || !centralIdea?.trim()) {
      return NextResponse.json({ error: "Cliente, Título e Ideia Central são obrigatórios." }, { status: 400 });
    }

    const res = await query(
      `INSERT INTO content_calendar_items (
        client_id, editorial_line_id, scheduled_date, scheduled_time,
        format, status, title, central_idea, target_audience_name,
        tone_of_voice, call_to_action, prompt_used,
        headlines_generated, selected_headline,
        captions_generated, selected_caption,
        reels_options, selected_reels,
        carousel_options, selected_carousel,
        notes, editorial_brief, id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, COALESCE($23::uuid, gen_random_uuid())
      ) ON CONFLICT (id) DO NOTHING RETURNING *, xmin::text AS edit_version`,
      [
        clientId,
        editorialLineId || null,
        scheduledDate || null,
        scheduledTime || null,
        format || "Post estático",
        status || "PLANNED",
        title.trim(),
        centralIdea.trim(),
        targetAudienceName || null,
        toneOfVoice || null,
        callToAction || null,
        promptUsed || null,
        JSON.stringify(headlinesGenerated || []),
        selectedHeadline || null,
        JSON.stringify(captionsGenerated || []),
        selectedCaption || null,
        JSON.stringify(reelsOptions || []),
        selectedReels || null,
        JSON.stringify(carouselOptions || []),
        selectedCarousel || null,
        notes || null,
        editorialBrief?JSON.stringify(editorialBrief):null,
        body.draftId || null,
      ]
    );

    const item = res.rows[0] || (await query(
      "SELECT *, xmin::text AS edit_version FROM content_calendar_items WHERE id=$1 AND client_id=$2 AND archived_at IS NULL",
      [body.draftId, clientId],
    )).rows[0];
    if (!item) return NextResponse.json({ error: "Identificador da peça indisponível." }, { status: 409 });
    return NextResponse.json({ item }, { status: res.rows.length ? 201 : 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao salvar item no calendário.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      id,
      scheduledDate,
      scheduledTime,
      format,
      status,
      title,
      centralIdea,
      targetAudienceName,
      toneOfVoice,
      callToAction,
      promptUsed,
      headlinesGenerated,
      selectedHeadline,
      captionsGenerated,
      selectedCaption,
      reelsOptions,
      selectedReels,
      carouselOptions,
      selectedCarousel,
      notes
    } = body;

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório." }, { status: 400 });
    }

    const res = await query(
      `UPDATE content_calendar_items SET
        scheduled_date = COALESCE($1, scheduled_date),
        scheduled_time = COALESCE($2, scheduled_time),
        format = COALESCE($3, format),
        status = COALESCE($4, status),
        title = COALESCE($5, title),
        central_idea = COALESCE($6, central_idea),
        target_audience_name = COALESCE($7, target_audience_name),
        tone_of_voice = COALESCE($8, tone_of_voice),
        call_to_action = COALESCE($9, call_to_action),
        prompt_used = COALESCE($10, prompt_used),
        headlines_generated = COALESCE($11, headlines_generated),
        selected_headline = COALESCE($12, selected_headline),
        captions_generated = COALESCE($13, captions_generated),
        selected_caption = COALESCE($14, selected_caption),
        reels_options = COALESCE($15, reels_options),
        selected_reels = COALESCE($16, selected_reels),
        carousel_options = COALESCE($17, carousel_options),
        selected_carousel = COALESCE($18, selected_carousel),
        notes = COALESCE($19, notes),
        updated_at = now()
      WHERE id = $20
      RETURNING *`,
      [
        scheduledDate,
        scheduledTime,
        format,
        status,
        title,
        centralIdea,
        targetAudienceName,
        toneOfVoice,
        callToAction,
        promptUsed,
        headlinesGenerated ? JSON.stringify(headlinesGenerated) : null,
        selectedHeadline,
        captionsGenerated ? JSON.stringify(captionsGenerated) : null,
        selectedCaption,
        reelsOptions ? JSON.stringify(reelsOptions) : null,
        selectedReels,
        carouselOptions ? JSON.stringify(carouselOptions) : null,
        selectedCarousel,
        notes,
        id
      ]
    );

    return NextResponse.json({ item: res.rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar item do calendário.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID é obrigatório." }, { status: 400 });
  }

  try {
    const clientId=searchParams.get("clientId");
    if(!clientId)return NextResponse.json({error:"Selecione uma empresa."},{status:400});
    const removed=await query(`DELETE FROM content_calendar_items WHERE id = $1 AND client_id=$2 RETURNING id`, [id,clientId]);
    if(!removed.rows.length)return NextResponse.json({error:"Conteúdo não encontrado nesta empresa."},{status:404});
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao excluir item do calendário.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

