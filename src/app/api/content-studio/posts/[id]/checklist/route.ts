import { z } from "zod";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { query, withTransaction } from "@/lib/db/pool";
import { productionChecklistTemplate, type ProductionChecklist } from "@/modules/clients/production-checklist";

type Context = { params: Promise<{ id: string }> };
const scope = z.object({ id: z.uuid(), clientId: z.uuid() });
const updateSchema = scope.extend({ formatKey: z.string(), itemKey: z.string(), completed: z.boolean() });
const pieceSql = "SELECT format, content_type FROM content_calendar_items WHERE id = $1 AND client_id = $2 AND archived_at IS NULL";
type Piece = { format: string; content_type: string };
const notFound = () => Response.json({ error: "Peça indisponível para este cliente." }, { status: 404 });

async function readChecklist(execute: typeof query, id: string, piece: Piece): Promise<ProductionChecklist> {
  const template = piece.content_type === "SOCIAL_MEDIA" ? productionChecklistTemplate(piece.format) : null;
  if (!template) return { formatKey: null, items: [] };
  const { rows } = await execute<{ item_key: string }>(
    "SELECT item_key FROM content_production_checklist WHERE content_id = $1 AND format_key = $2 AND completed_at IS NOT NULL",
    [id, template.formatKey],
  );
  const done = new Set(rows.map(row => row.item_key));
  return { formatKey: template.formatKey, items: template.items.map(item => ({ ...item, completed: done.has(item.key) })) };
}

export async function GET(request: Request, context: Context) {
  try { await requireAdminUser(); } catch { return Response.json({ error: "Acesso não autorizado." }, { status: 401 }); }
  const input = scope.safeParse({ id: (await context.params).id, clientId: new URL(request.url).searchParams.get("clientId") });
  if (!input.success) return Response.json({ error: "Selecione uma peça e um cliente válidos." }, { status: 400 });
  try {
    const { id, clientId } = input.data;
    const { rows: [piece] } = await query<Piece>(pieceSql, [id, clientId]);
    return piece ? Response.json(await readChecklist(query, id, piece)) : notFound();
  } catch {
    return Response.json({ error: "Não foi possível carregar o checklist." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Context) {
  try { await requireAdminUser(); } catch { return Response.json({ error: "Acesso não autorizado." }, { status: 401 }); }
  const body = await request.json().catch(() => null);
  const input = updateSchema.safeParse({ ...body, id: (await context.params).id });
  if (!input.success) return Response.json({ error: "Confira o item a atualizar." }, { status: 400 });
  try {
    const { id, clientId, formatKey, itemKey, completed } = input.data;
    return await withTransaction(async db => {
      const { rows: [piece] } = await db.query<Piece>(pieceSql + " FOR UPDATE", [id, clientId]);
      if (!piece) return notFound();
      const template = piece.content_type === "SOCIAL_MEDIA" ? productionChecklistTemplate(piece.format) : null;
      if (!template || template.formatKey !== formatKey || !template.items.some(item => item.key === itemKey)) {
        return Response.json({ error: "O checklist mudou. Recarregue antes de marcar este item." }, { status: 409 });
      }
      await db.query(
        `INSERT INTO content_production_checklist (content_id, format_key, item_key, completed_at)
         VALUES ($1, $2, $3, CASE WHEN $4 THEN now() ELSE NULL END)
         ON CONFLICT (content_id, format_key, item_key) DO UPDATE SET completed_at = EXCLUDED.completed_at
         WHERE (content_production_checklist.completed_at IS NOT NULL) IS DISTINCT FROM $4::boolean`,
        [id, formatKey, itemKey, completed],
      );
      return Response.json(await readChecklist(db.query.bind(db), id, piece));
    });
  } catch {
    return Response.json({ error: "Não foi possível salvar o checklist." }, { status: 500 });
  }
}
