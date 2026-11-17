import { NextResponse } from "next/server";
import { query } from "@/lib/db/pool";

export async function GET(request: Request) {
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
      WHERE 1=1
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
  try {
    const body = await request.json();

    const sql = `
      INSERT INTO content_calendar_items (
        client_id, title, central_idea, format, status,
        content_type, ad_status, image_url, post_tag,
        selected_headline, selected_caption, selected_reels, selected_carousel,
        prompt_used, tone_of_voice, call_to_action, scheduled_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )
      RETURNING *
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
      body.scheduledDate || new Date().toISOString().substring(0, 10),
    ]);

    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error: unknown) {
    console.error("Erro ao salvar post:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao salvar post." },
      { status: 500 }
    );
  }
}

