import { z } from "zod";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { query } from "@/lib/db/pool";

const scopeSchema = z.union([
  z.object({ id: z.string().uuid() }),
  z.object({ clientId: z.string().uuid() }),
]);

export async function GET(request: Request) {
  let user;
  try { user = await requireAdminUser(); } catch { return Response.json({ error: "Acesso não autorizado." }, { status: 401 }); }
  const scope = scopeSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!scope.success) return Response.json({ error: "Selecione um post ou uma empresa." }, { status: 400 });

  const byId = "id" in scope.data;
  try {
    const { rows } = await query(
      `SELECT c.id, c.client_id AS "clientId", COALESCE(NULLIF(cl.trade_name, ''), cl.name) AS "companyName",
              c.title, c.scheduled_date::text AS "scheduledDate", p.id AS "projectId", p.name AS "projectName",
              c.format, c.status, c.editorial_line_id AS "editorialLineId", el.pillar_id AS "pillarId",
              c.offer_name AS "offerName",
              (NULLIF(btrim(c.central_idea), '') IS NOT NULL) AS "hasIdea",
              (c.status = 'PLANNED'
                AND NULLIF(btrim(c.central_idea), '') IS NULL
                AND NOT EXISTS (SELECT 1 FROM headline_workspaces h WHERE h.content_id = c.id)
                AND NOT EXISTS (SELECT 1 FROM content_brainstorm_ideas i WHERE i.content_id = c.id)
              ) AS "availableForIdea",
              (SELECT h.id FROM headline_workspaces h WHERE h.content_id = c.id AND h.user_id = $2
               ORDER BY h.updated_at DESC LIMIT 1) AS "workspaceId"
       FROM content_calendar_items c
       JOIN projects p ON p.id = c.project_id AND p.client_id = c.client_id
       JOIN clients cl ON cl.id = c.client_id
       LEFT JOIN client_editorial_lines el ON el.id = c.editorial_line_id
       WHERE c.archived_at IS NULL AND p.archived_at IS NULL AND c.content_type = 'SOCIAL_MEDIA'
         AND ${byId ? "c.id" : "c.client_id"} = $1
       ORDER BY c.project_month DESC, p.name, c.project_post_number`,
      ["id" in scope.data ? scope.data.id : scope.data.clientId, user.id],
    );
    if (byId && !rows.length) return Response.json({ error: "Post de projeto indisponível." }, { status: 404 });
    return Response.json({ posts: rows });
  } catch {
    return Response.json({ error: "Não foi possível carregar os posts de projetos." }, { status: 500 });
  }
}
