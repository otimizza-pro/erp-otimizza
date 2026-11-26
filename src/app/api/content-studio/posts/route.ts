import {requireAdminUser} from "@/lib/auth/require-auth";
import {contentBriefSchema} from "@/modules/clients/content-brief";
import { NextResponse } from "next/server";
import { query } from "@/lib/db/pool";

export async function GET(request: Request) {
  try { await requireAdminUser(); } catch { return NextResponse.json({success:false,error:"Acesso não autorizado"},{status:401}); }
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const contentType = searchParams.get("contentType"); // 'SOCIAL_MEDIA' | 'ADS' | 'ALL'
    const adStatus = searchParams.get("adStatus"); // 'ACTIVE' | 'PAUSED' | 'FINISHED' | 'ALL'

    let sql = `
      SELECT 
        cci.id,
        cci.client_id as "clientId",
        c.name as "clientName",
        c.trade_name as "clientTradeName",
        cci.title,
        cci.central_idea as "centralIdea",
        cci.format,
        cci.status,
        cci.content_type as "contentType",
        cci.ad_status as "adStatus",
        cci.image_url as "imageUrl",
        cci.post_tag as "postTag",
        cci.scheduled_date as "scheduledDate",
        cci.scheduled_time as "scheduledTime",
        cci.selected_headline as "selectedHeadline",
        cci.selected_caption as "selectedCaption",
        cci.selected_reels as "selectedReels",
        cci.selected_carousel as "selectedCarousel",
        cci.prompt_used as "promptUsed",
        cci.tone_of_voice as "toneOfVoice",
        cci.call_to_action as "callToAction",
        cci.created_at as "createdAt",
        cci.updated_at as "updatedAt"
      FROM content_calendar_items cci
      JOIN clients c ON c.id = cci.client_id
      WHERE cci.archived_at IS ${searchParams.get("archived")==="true"?"NOT ":""}NULL
    `;

    const params: unknown[] = [];

    if (clientId && clientId !== "ALL") {
      params.push(clientId);
      sql += ` AND cci.client_id = $${params.length}`;
    }

    if (contentType && contentType !== "ALL") {
      params.push(contentType);
      sql += ` AND cci.content_type = $${params.length}`;
    }

    if (adStatus && adStatus !== "ALL") {
      params.push(adStatus);
      sql += ` AND cci.ad_status = $${params.length}`;
    }

    sql += ` ORDER BY cci.created_at DESC LIMIT 200`;

    const res = await query(sql, params);
    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: unknown) {
    console.error("Erro ao listar posts salvos:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao listar posts." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try { await requireAdminUser(); } catch { return NextResponse.json({success:false,error:"Acesso não autorizado"},{status:401}); }
  try {
    const body = await request.json();
    const editorialBrief=body.editorialBrief?contentBriefSchema.parse(body.editorialBrief):null;

    const sql = `
      INSERT INTO content_calendar_items (
        client_id, title, central_idea, format, status,
        content_type, ad_status, image_url, post_tag,
        selected_headline, selected_caption, selected_reels, selected_carousel,
        prompt_used, tone_of_voice, call_to_action, scheduled_date, editorial_brief, editorial_line_id, id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, COALESCE($20::uuid, gen_random_uuid())
      ) ON CONFLICT (id) DO NOTHING
      RETURNING *, xmin::text AS edit_version
    `;

    const res = await query(sql, [
      body.clientId,
      body.title || "Novo Conteúdo",
      body.centralIdea || "",
      body.format || "HEADLINES",
      body.status || "PLANNED",
      body.contentType || "SOCIAL_MEDIA",
      body.adStatus || "ACTIVE",
      body.imageUrl || null,
      body.postTag || (body.contentType === "ADS" ? "Campanha Ads" : "Social Media"),
      body.selectedHeadline || null,
      body.selectedCaption || null,
      body.selectedReels || null,
      body.selectedCarousel || null,
      body.promptUsed || null,
      body.toneOfVoice || null,
      body.callToAction || null,
      body.scheduledDate || new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }),
      editorialBrief?JSON.stringify(editorialBrief):null,
      editorialBrief?.themeId||null,
      body.draftId || null,
    ]);

    const data = res.rows[0] || (await query(
      "SELECT *, xmin::text AS edit_version FROM content_calendar_items WHERE id=$1 AND client_id=$2 AND archived_at IS NULL",
      [body.draftId, body.clientId],
    )).rows[0];
    if (!data) return NextResponse.json({ success: false, error: "Identificador da peça indisponível." }, { status: 409 });
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("Erro ao salvar post:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao salvar post." },
      { status: 500 }
    );
  }
}

