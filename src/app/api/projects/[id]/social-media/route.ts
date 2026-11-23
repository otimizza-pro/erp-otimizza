import { isEditorialTemplate, isOnboardingTemplate } from "@/modules/projects/editorial-template";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { query, withTransaction } from "@/lib/db/pool";
import { createSocialMediaMonth, saveSocialMediaSchedule } from "@/modules/projects/social-media-planning";
import { nextProjectMonth, projectMonthSchema, socialMediaScheduleSchema, type SocialMediaSchedule } from "@/modules/projects/social-media-schedule";

type RouteContext = { params: Promise<{ id: string }> };
const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("SAVE"), schedule: socialMediaScheduleSchema }),
  z.object({ action: z.literal("PLAN"), month: projectMonthSchema }),
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
    const [schedule, months] = await Promise.all([
      query<SocialMediaSchedule>(scheduleSql, [id]),
      query<{ month: string }>(monthsSql, [id]),
    ]);
    const month = requestedMonth ? projectMonthSchema.parse(requestedMonth) : months.rows[0]?.month;
    const posts = month ? await query(
      `SELECT id, title, scheduled_date::text AS "scheduledDate", status, archived_at AS "archivedAt"
       FROM content_calendar_items WHERE project_id = $1 AND project_month = $2
       ORDER BY project_post_number`,
      [id, month + "-01"],
    ) : null;
    return Response.json({ schedule: schedule.rows[0] ?? null, months: months.rows.map(row => row.month), posts: posts?.rows ?? [] });
  } catch {
    return Response.json({ error: "Não foi possível carregar o planejamento do projeto." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try { await requireAdminUser(); } catch { return Response.json({ error: "Acesso não autorizado." }, { status: 401 }); }
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "Informe uma quantidade, dias ou mês válidos." }, { status: 400 });
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
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível planejar o mês." }, { status: 400 });
  }
}
