import { z } from "zod";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { query, withTransaction } from "@/lib/db/pool";
import { deliveryAction, reviewMaterials, publicationReady, type DeliveryState, type Measurement, type Publication, type Review } from "@/modules/clients/content-delivery";
import { productionChecklistTemplate } from "@/modules/clients/production-checklist";
import { NotificationService } from "@/modules/notifications/service";

type Context = { params: Promise<{ id: string }> };
const scope = z.object({ id: z.uuid(), clientId: z.uuid() });
const pieceSql = "SELECT * FROM content_calendar_items WHERE id=$1 AND client_id=$2 AND archived_at IS NULL";
const fail = (error: string, status = 409) => Response.json({ error }, { status });
const localDay = (date: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(date);

async function readDelivery(db: typeof query, id: string, clientId: string, piece: Record<string, unknown>): Promise<DeliveryState> {
  const root = typeof piece.origin_content_id === "string" ? piece.origin_content_id : id;
  const [reviews, publications, metrics, related] = await Promise.all([
    db<Review>("SELECT * FROM content_material_reviews WHERE content_id=$1 ORDER BY version DESC, submitted_at DESC", [id]),
    db<Publication>("SELECT * FROM content_publications WHERE content_id=$1", [id]),
    db<Measurement>(
      `SELECT id, date_from::text, date_to::text, impressions, clicks, leads, sales, source
       FROM content_delivery_measurements WHERE content_id=$1 ORDER BY date_from DESC`, [id],
    ),
    db<{ id: string; title: string; format: string }>(
      `SELECT id,title,format FROM content_calendar_items WHERE client_id=$1 AND archived_at IS NULL
       AND (id=$2 OR origin_content_id=$2) AND id<>$3 ORDER BY created_at DESC`, [clientId, root, id],
    ),
  ]);
  const materials = reviewMaterials(piece, reviews.rows);
  return {
    materials, reviews: reviews.rows, publication: publications.rows[0] || null, measurements: metrics.rows,
    totals: metrics.rows.reduce((total, row) => ({
      impressions: total.impressions + row.impressions, clicks: total.clicks + row.clicks,
      leads: total.leads + row.leads, sales: total.sales + row.sales,
    }), { impressions: 0, clicks: 0, leads: 0, sales: 0 }),
    ready: publicationReady(materials),
    origin: related.rows.find(row => row.id === root) || null,
    derivatives: related.rows.filter(row => row.id !== root),
  };
}

export async function GET(request: Request, context: Context) {
  try { await requireAdminUser(); } catch { return fail("Acesso não autorizado.", 401); }
  const input = scope.safeParse({ id: (await context.params).id, clientId: new URL(request.url).searchParams.get("clientId") });
  if (!input.success) return fail("Confira a peça e o cliente.", 400);
  const { id, clientId } = input.data;
  try {
    const { rows: [piece] } = await query(pieceSql, [id, clientId]);
    return piece ? Response.json(await readDelivery(query, id, clientId, piece)) : fail("Peça indisponível.", 404);
  } catch (error) {
    console.error("Falha ao consultar entrega", error);
    return fail("Não foi possível consultar a entrega.", 500);
  }
}

export async function POST(request: Request, context: Context) {
  let user;
  try { user = await requireAdminUser(); } catch { return fail("Acesso não autorizado.", 401); }
  const body = await request.json().catch(() => null);
  const input = scope.safeParse({ id: (await context.params).id, clientId: body?.clientId });
  const parsed = deliveryAction.safeParse(body);
  if (!input.success || !parsed.success) return fail("Confira os dados da ação.", 400);
  const { id, clientId } = input.data;
  const data = parsed.data;
  try {
    return await withTransaction(async db => {
      const { rows: [piece] } = await db.query(pieceSql + " FOR UPDATE", [id, clientId]);
      if (!piece) return fail("Peça indisponível.", 404);
      if (data.action === "DERIVE") {
        if (piece.content_type !== "SOCIAL_MEDIA" || !piece.central_idea?.trim()) return fail("Selecione uma pauta de social media com ideia central.");
        if (data.format === piece.format) return fail("Escolha um formato diferente do atual.", 400);
        const origin = piece.origin_content_id || id;
        const inserted = await db.query(
          `INSERT INTO content_calendar_items (id,client_id,editorial_line_id,title,central_idea,format,status,
             content_type,scheduled_date,editorial_brief,target_audience_name,tone_of_voice,call_to_action,origin_content_id)
           VALUES ($1,$2,$3,left($4,255),$5,$6,'PLANNED','SOCIAL_MEDIA',$7,$8,$9,$10,$11,$12)
           ON CONFLICT (id) DO NOTHING RETURNING id`,
          [data.draftId, clientId, piece.editorial_line_id, piece.title + " · " + data.format, piece.central_idea, data.format,
            data.date || null, piece.editorial_brief, piece.target_audience_name, piece.tone_of_voice, piece.call_to_action, origin],
        );
        if (!inserted.rowCount && !(await db.query(
          "SELECT id FROM content_calendar_items WHERE id=$1 AND client_id=$2 AND origin_content_id=$3 AND format=$4 AND archived_at IS NULL",
          [data.draftId, clientId, origin, data.format],
        )).rowCount) return fail("Identificador da peça derivada indisponível.");
        return Response.json({ derivedId: data.draftId });
      }

      const state = await readDelivery(db.query.bind(db), id, clientId, piece);
      if (data.action === "MEASURE") {
        if (!state.publication) return fail("Registre a publicação antes de adicionar resultados.");
        if (data.from > data.to || data.to > localDay(new Date()) ||
            data.from < localDay(new Date(state.publication.published_at)) || data.clicks > data.impressions) {
          return fail("Confira o período e as quantidades da medição.", 400);
        }
        const overlap = await db.query(
          "SELECT id FROM content_delivery_measurements WHERE content_id=$1 AND date_from <= $3::date AND date_to >= $2::date",
          [id, data.from, data.to],
        );
        if (overlap.rowCount) return fail("Já há uma medição registrada para parte deste período.");
        await db.query(
          `INSERT INTO content_publication_metrics (content_id,date_from,date_to,impressions,clicks,leads,sales,source,recorded_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [id, data.from, data.to, data.impressions, data.clicks, data.leads, data.sales, data.source, user.id],
        );
      } else {
        if (state.publication) return fail("A publicação já foi registrada.");
        if (data.action === "SUBMIT") {
          const item = state.materials.find(material => material.key === data.material);
          if (!item || item.stale || item.snapshot.text !== data.snapshot.text || item.snapshot.subtitle !== data.snapshot.subtitle) {
            return fail("O material mudou ou precisa de atualização. Reabra a peça antes de enviar.");
          }
          if (item.current && item.current.decision !== "CHANGES_REQUESTED") return fail("Esta versão já está em revisão ou foi aprovada.");
          if (item.current?.decision === "CHANGES_REQUESTED") return fail("Salve o ajuste antes de enviar uma nova versão.");
          await db.query(
            `INSERT INTO content_material_reviews (content_id,material,version,snapshot,submitted_by,submitted_by_email)
             SELECT $1,$2,COALESCE(max(version),0)+1,$3::jsonb,$4,$5 FROM content_material_reviews
             WHERE content_id=$1 AND material=$2`, [id, item.key, JSON.stringify(item.snapshot), user.id, user.email],
          );
          await NotificationService.createSafeNotification({
            type: "CONTENT_SUBMITTED",
            severity: "info",
            category: "CONTENT",
            entityType: "content_calendar_item",
            entityId: id,
            title: `Material enviado para revisão (${piece.title})`,
            message: `Material "${item.key}" aguardando aprovação`,
            linkUrl: `/prompt-creator?contentId=${id}`,
          });
        } else if (data.action === "DECIDE") {
          const item = state.materials.find(material => material.current?.id === data.reviewId);
          if (!item || item.stale || item.current?.decision !== "PENDING") return fail("Esta versão já mudou ou recebeu uma decisão.");
          if (data.decision === "CHANGES_REQUESTED" && !data.comment) return fail("Descreva o ajuste solicitado.", 400);
          await db.query(
            "UPDATE content_material_reviews SET decision=$2,comment=$3,decided_by=$4,decided_by_email=$5,decided_at=now() WHERE id=$1",
            [data.reviewId, data.decision, data.comment || null, user.id, user.email],
          );
          await NotificationService.createSafeNotification({
            type: data.decision === "APPROVED" ? "CONTENT_APPROVED" : "CONTENT_CHANGES_REQUESTED",
            severity: data.decision === "APPROVED" ? "success" : "warning",
            category: "CONTENT",
            entityType: "content_calendar_item",
            entityId: id,
            title: data.decision === "APPROVED" ? `Material aprovado (${piece.title})` : `Ajuste solicitado (${piece.title})`,
            message: data.comment || `Revisão do material "${item.key}" registrada`,
            linkUrl: `/prompt-creator?contentId=${id}`,
          });
        } else {
          if (piece.content_type !== "SOCIAL_MEDIA") return fail("Este registro de publicação é para peças de social media.");
          if (!state.ready) return fail("Aprove as versões atuais dos materiais antes de registrar a publicação.");
          if (new Date(data.publishedAt).getTime() > Date.now()) return fail("Informe o horário efetivo da publicação.", 400);
          const template = productionChecklistTemplate(piece.format);
          if (template) {
            const { rows } = await db.query<{ item_key: string }>(
              "SELECT item_key FROM content_production_checklist WHERE content_id=$1 AND format_key=$2 AND completed_at IS NOT NULL",
              [id, template.formatKey],
            );
            if (!template.items.every(item => rows.some(row => row.item_key === item.key))) return fail("Conclua o checklist de produção antes de registrar a publicação.");
          }
          const versions = state.materials.map(item => ({ material: item.key, reviewId: item.current!.id, version: item.current!.version }));
          await db.query(
            `INSERT INTO content_publications (content_id,platform,url,published_at,recorded_by,approved_versions,headline_candidate_id,objective,primary_metric)
             VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)`,
            [id, data.platform, data.url, data.publishedAt, user.id, JSON.stringify(versions), piece.headline_candidate_id,
              piece.editorial_brief?.goal || piece.headline_brief?.goal || null, data.primaryMetric],
          );
          await db.query("UPDATE content_calendar_items SET status='PUBLISHED',updated_at=now() WHERE id=$1", [id]);
          await NotificationService.createSafeNotification({
            type: "CONTENT_PUBLISHED",
            severity: "success",
            category: "CONTENT",
            entityType: "content_calendar_item",
            entityId: id,
            title: `Conteúdo publicado (${piece.title})`,
            message: `Publicação registrada em ${data.platform}`,
            linkUrl: `/prompt-creator/saved`,
          });
        }
      }
      return Response.json(await readDelivery(db.query.bind(db), id, clientId, piece));
    });
  } catch (error) {
    console.error("Falha ao atualizar entrega", error);
    return fail("Não foi possível atualizar a entrega.", 500);
  }
}
