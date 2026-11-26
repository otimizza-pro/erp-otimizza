import { isEditorialTemplate, isOnboardingTemplate } from "@/modules/projects/editorial-template";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { query, withTransaction } from "@/lib/db/pool";
import {
  buildAutoOrganizedPostAssignments,
  createSocialMediaMonth,
  saveSocialMediaSchedule,
} from "@/modules/projects/social-media-planning";
import { nextProjectMonth, projectMonthSchema, socialMediaScheduleSchema, type SocialMediaSchedule } from "@/modules/projects/social-media-schedule";

type RouteContext = { params: Promise<{ id: string }> };
const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("SAVE"), schedule: socialMediaScheduleSchema }),
  z.object({ action: z.literal("PLAN"), month: projectMonthSchema }),
  z.object({
    action: z.literal("UPDATE_POST"),
    postId: z.string().uuid(),
    title: z.string().trim().min(1).max(255).optional(),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    format: z.string().trim().max(100).nullable().optional(),
    editorialLineId: z.string().uuid().nullable().optional(),
    offerName: z.string().trim().max(255).nullable().optional(),
  }),
  z.object({
    action: z.literal("AUTO_ORGANIZE"),
    month: projectMonthSchema,
  }),
  z.object({
    action: z.literal("ADD_POST"),
    month: projectMonthSchema,
  }),
]);
const scheduleSql = `SELECT posts_per_month AS "postsPerMonth", weekdays
  FROM project_social_media_plans WHERE project_id = $1`;
const monthsSql = `SELECT to_char(month, 'YYYY-MM') AS month
  FROM project_social_media_months WHERE project_id = $1 ORDER BY month DESC`;

export async function GET(request: Request, { params }: RouteContext) {
  try { await requireAdminUser(); } catch { return Response.json({ error: "Acesso não autorizado." }, { status: 401 }); }
  try {
    const { id } = await params;
    const requestedMonth = new URL(request.url).searchParams.get("month");
    const [projectMeta, schedule, months] = await Promise.all([
      query<{ clientId: string }>(
        `SELECT client_id AS "clientId" FROM projects WHERE id = $1 LIMIT 1`,
        [id],
      ),
      query<SocialMediaSchedule>(scheduleSql, [id]),
      query<{ month: string }>(monthsSql, [id]),
    ]);
    const clientId = projectMeta.rows[0]?.clientId;
    const month = requestedMonth ? projectMonthSchema.parse(requestedMonth) : months.rows[0]?.month;
    const [posts, editorialLines, catalogOffers] = await Promise.all([
      month ? query(
        `SELECT c.id, c.title, c.scheduled_date::text AS "scheduledDate", c.status, c.archived_at AS "archivedAt",
                c.format, c.editorial_line_id AS "editorialLineId", el.pillar_id AS "pillarId",
                el.pillar_name AS "pillarName", el.theme AS "themeName",
                c.offer_name AS "offerName", c.project_post_number AS "projectPostNumber"
         FROM content_calendar_items c
         LEFT JOIN client_editorial_lines el ON el.id = c.editorial_line_id
         WHERE c.project_id = $1 AND c.project_month = $2
         ORDER BY c.project_post_number, c.scheduled_date`,
        [id, month + "-01"],
      ) : Promise.resolve(null),
      clientId ? query(
        `SELECT id, pillar_id AS "pillarId", pillar_name AS "pillarName", theme,
                preferred_formats AS "preferredFormats"
         FROM client_editorial_lines
         WHERE client_id = $1 AND is_active = true AND archived_at IS NULL
         ORDER BY pillar_name, theme`,
        [clientId],
      ) : Promise.resolve({ rows: [] }),
      clientId ? query(
        `SELECT id, name, type
         FROM client_catalog_items
         WHERE client_id = $1 AND is_active = true
         ORDER BY order_index, created_at`,
        [clientId],
      ) : Promise.resolve({ rows: [] }),
    ]);
    return Response.json({
      schedule: schedule.rows[0] ?? null,
      months: months.rows.map(row => row.month),
      posts: posts?.rows ?? [],
      editorialLines: editorialLines.rows,
      catalogOffers: catalogOffers.rows,
    });
  } catch {
    return Response.json({ error: "Não foi possível carregar o planejamento do projeto." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try { await requireAdminUser(); } catch { return Response.json({ error: "Acesso não autorizado." }, { status: 401 }); }
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "Informe dados válidos para o planejamento." }, { status: 400 });
  try {
    const { id } = await params;
    const data = input.data;
    await withTransaction(async db => {
      const project = (await db.query<{ id: string; clientId: string; company: string; code: string | null; name: string | null; legacyPlan: boolean; startMonth: string }>(
        `SELECT t.code, t.name, (p.project_type='RECURRING' AND EXISTS(SELECT 1 FROM project_social_media_plans plan WHERE plan.project_id=p.id)) AS "legacyPlan", p.id, p.client_id AS "clientId", to_char(p.start_date, 'YYYY-MM') AS "startMonth",
                COALESCE(NULLIF(c.trade_name, ''), c.name) AS company
         FROM projects p JOIN clients c ON c.id = p.client_id
         LEFT JOIN project_templates t ON t.id=p.template_id
         WHERE p.id = $1 AND p.archived_at IS NULL FOR UPDATE OF p`,
        [id],
      )).rows[0];
      if (!project) throw new Error("Selecione um projeto ativo vinculado a uma empresa.");

      if (!isEditorialTemplate(project.code, project.name) && !(project.legacyPlan && !isOnboardingTemplate(project.code)))
        throw new Error("O planejamento de publicações exige um projeto de entrega editorial.");

      if (data.action === "SAVE") {
        await saveSocialMediaSchedule(db, id, data.schedule);
        return;
      }

      if (data.action === "UPDATE_POST") {
        const updates: string[] = [];
        const paramsList: unknown[] = [data.postId, id];
        if (data.title !== undefined) {
          paramsList.push(data.title);
          updates.push(`title = $${paramsList.length}`);
        }
        if (data.scheduledDate !== undefined) {
          paramsList.push(data.scheduledDate);
          updates.push(`scheduled_date = $${paramsList.length}`);
        }
        if (data.format !== undefined) {
          const nextFormat = data.format || "Post estático";
          paramsList.push(nextFormat);
          updates.push(`format = $${paramsList.length}`);
          updates.push(
            `post_tag = CASE WHEN NULLIF(btrim(COALESCE(post_tag, '')), '') IS NULL OR post_tag = format THEN $${paramsList.length} ELSE post_tag END`,
          );
        }
        if (data.editorialLineId !== undefined) {
          paramsList.push(data.editorialLineId);
          updates.push(`editorial_line_id = $${paramsList.length}`);
        }
        if (data.offerName !== undefined) {
          paramsList.push(data.offerName || null);
          updates.push(`offer_name = $${paramsList.length}`);
        }
        if (!updates.length) return;
        updates.push("updated_at = NOW()");
        const res = await db.query(
          `UPDATE content_calendar_items SET ${updates.join(", ")} WHERE id = $1 AND project_id = $2 RETURNING id`,
          paramsList,
        );
        if (!res.rows.length) throw new Error("Post planejado não encontrado neste projeto.");
        return;
      }

      if (data.action === "AUTO_ORGANIZE") {
        const [postsRes, linesRes, offersRes] = await Promise.all([
          db.query<{ id: string }>(
            `SELECT id FROM content_calendar_items
             WHERE project_id = $1 AND project_month = $2 AND archived_at IS NULL
             ORDER BY project_post_number, scheduled_date`,
            [id, data.month + "-01"],
          ),
          db.query<{ id: string; pillarId: string | null; pillarName: string; theme: string; preferredFormats: string[] }>(
            `SELECT id, pillar_id AS "pillarId", pillar_name AS "pillarName", theme,
                    preferred_formats AS "preferredFormats"
             FROM client_editorial_lines
             WHERE client_id = $1 AND is_active = true AND archived_at IS NULL
             ORDER BY pillar_name, theme`,
            [project.clientId],
          ),
          db.query<{ name: string }>(
            `SELECT name FROM client_catalog_items
             WHERE client_id = $1 AND is_active = true
             ORDER BY order_index, created_at`,
            [project.clientId],
          ),
        ]);
        const assignments = buildAutoOrganizedPostAssignments({
          postIds: postsRes.rows.map((r) => r.id),
          editorialLines: linesRes.rows,
          offers: offersRes.rows,
        });
        for (const item of assignments) {
          await db.query(
            `UPDATE content_calendar_items
             SET editorial_line_id = COALESCE($3, editorial_line_id),
                 offer_name = $4,
                 format = $5,
                 post_tag = CASE WHEN NULLIF(btrim(COALESCE(post_tag, '')), '') IS NULL OR post_tag = format THEN $5 ELSE post_tag END,
                 updated_at = NOW()
             WHERE id = $1 AND project_id = $2`,
            [item.postId, id, item.editorialLineId, item.offerName, item.format],
          );
        }
        return;
      }

      if (data.action === "ADD_POST") {
        const monthDate = data.month + "-01";
        const maxRes = await db.query<{ nextNum: number }>(
          `SELECT COALESCE(MAX(project_post_number), 0) + 1 AS "nextNum"
           FROM content_calendar_items
           WHERE project_id = $1 AND project_month = $2`,
          [id, monthDate],
        );
        const nextNum = Number(maxRes.rows[0]?.nextNum || 1);
        const [yr, mo] = data.month.split("-").map(Number);
        const monthShort = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][mo - 1] || data.month;
        const defaultTitle = `Post ${project.company} ${monthShort} #${String(nextNum).padStart(2, "0")}`;
        const defaultDate = `${yr}-${String(mo).padStart(2, "0")}-01`;
        await db.query(
          `INSERT INTO content_calendar_items
             (project_id, project_month, project_post_number, client_id, scheduled_date, title, central_idea, format, post_tag, status, content_type)
           VALUES ($1, $2, $3, $4, $5, $6, '', 'Carrossel', 'Carrossel', 'PLANNED', 'SOCIAL_MEDIA')`,
          [id, monthDate, nextNum, project.clientId, defaultDate, defaultTitle],
        );
        return;
      }

      const schedule = (await db.query<SocialMediaSchedule>(scheduleSql, [id])).rows[0];
      if (!schedule) throw new Error("Configure a quantidade de posts e os dias de publicação.");
      const months = (await db.query<{ month: string }>(monthsSql, [id])).rows;
      if (months.some(row => row.month === data.month)) return;
      const latest = months[0]?.month;
      if (latest ? data.month !== nextProjectMonth(latest) : data.month < project.startMonth) {
        throw new Error("Selecione o primeiro mês a partir do início do projeto ou atualize para planejar o próximo mês.");
      }
      await createSocialMediaMonth(db, project, data.month, schedule);
    });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar o planejamento." }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try { await requireAdminUser(); } catch { return Response.json({ error: "Acesso não autorizado." }, { status: 401 }); }
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");
    const monthParam = searchParams.get("month");
    const deleteAll = searchParams.get("all") === "true";

    await withTransaction(async db => {
      if (postId) {
        const validId = z.string().uuid().parse(postId);
        await db.query(`DELETE FROM headline_measurements WHERE content_id = $1`, [validId]);
        const del = await db.query(
          `DELETE FROM content_calendar_items WHERE id = $1 AND project_id = $2 RETURNING id`,
          [validId, id],
        );
        if (!del.rows.length) throw new Error("Post não encontrado neste projeto.");
        return;
      }

      if (monthParam) {
        const validMonth = projectMonthSchema.parse(monthParam);
        const monthDate = validMonth + "-01";
        await db.query(
          `DELETE FROM headline_measurements WHERE content_id IN (
            SELECT id FROM content_calendar_items WHERE project_id = $1 AND project_month = $2
          )`,
          [id, monthDate],
        );
        await db.query(
          `DELETE FROM content_calendar_items WHERE project_id = $1 AND project_month = $2`,
          [id, monthDate],
        );
        await db.query(
          `DELETE FROM project_social_media_months WHERE project_id = $1 AND month = $2`,
          [id, monthDate],
        );
        return;
      }

      if (deleteAll) {
        await db.query(
          `DELETE FROM headline_measurements WHERE content_id IN (
            SELECT id FROM content_calendar_items WHERE project_id = $1
          )`,
          [id],
        );
        await db.query(`DELETE FROM content_calendar_items WHERE project_id = $1`, [id]);
        await db.query(`DELETE FROM project_social_media_months WHERE project_id = $1`, [id]);
        return;
      }

      throw new Error("Informe postId, month ou all=true para excluir.");
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível excluir." }, { status: 400 });
  }
}
