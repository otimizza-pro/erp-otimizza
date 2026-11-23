import { requireAdminUser } from "@/lib/auth/require-auth";
import { query, withTransaction } from "@/lib/db/pool";
import { parseMeta } from "@/modules/client-results/import";
import { mergeRows, type MetricRow } from "@/modules/client-results/meta";
import { z } from "zod";

type Context = {params:Promise<{id:string}>};
class InputError extends Error {}
async function authorize(ctx: Context) {
  try { await requireAdminUser(); } catch { return Response.json({error:"Acesso não autorizado."},{status:401}); }
  const {id} = await ctx.params;
  return z.string().uuid().safeParse(id).success ? id : Response.json({error:"Selecione um cliente válido."},{status:400});
}
export async function GET(_: Request, ctx: Context) {
  const id = await authorize(ctx);
  if (typeof id !== "string") return id;
  const result = await query(`SELECT h.active_version AS active, v.metrics AS rows,
    (SELECT json_agg(json_build_object('id',s.id::text,'date',s.created_at,'name',s.filename) ORDER BY s.id DESC)
     FROM client_meta_versions s WHERE s.client_id=h.client_id) AS history
    FROM client_meta_reports h LEFT JOIN client_meta_versions v ON v.id=h.active_version AND v.client_id=h.client_id WHERE h.client_id=$1`,[id]);
  const record = result.rows[0];
  return Response.json({active:record?.active ?? null,rows:record?.rows ?? [],history:record?.history ?? []},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req: Request, ctx: Context) {
  const id = await authorize(ctx);
  if (typeof id !== "string") return id;
  try {
    const form = await req.formData();
    const file = form.get("file"), restore = form.get("restore");
    let imported: MetricRow[] = [];
    if (file instanceof File) {
      if (!/\.xlsx?$/i.test(file.name) || file.size>4*1024*1024) throw new InputError("Selecione um Excel .xls ou .xlsx de até 4 MB.");
      try { imported = parseMeta(Buffer.from(await file.arrayBuffer())); } catch (e) { throw new InputError(e instanceof Error ? e.message : "Arquivo Excel inválido."); }
    } else if (typeof restore !== "string" || !/^(empty|\d+)$/.test(restore)) throw new InputError("Selecione um arquivo ou uma versão.");
    const message = await withTransaction(async db => {
      await db.query("INSERT INTO client_meta_reports(client_id) VALUES ($1) ON CONFLICT DO NOTHING",[id]);
      const {rows:[head]} = await db.query("SELECT active_version FROM client_meta_reports WHERE client_id=$1 FOR UPDATE",[id]);
      if (String(head.active_version ?? "") !== form.get("active")) throw new InputError("O relatório mudou. Recarregue antes de continuar.");
      if (file instanceof File) {
        const prev = (await db.query<{metrics:MetricRow[]}>("SELECT metrics FROM client_meta_versions WHERE client_id=$1 AND id=$2",[id,head.active_version])).rows[0]?.metrics ?? [];
        let rows: MetricRow[];
        try { rows=mergeRows(prev,imported); } catch (e) {throw new InputError((e as Error).message);}
        // PostgreSQL jsonb does not preserve object key order.
        const {rows:[version]} = await db.query(`INSERT INTO client_meta_versions(client_id,filename,metrics)
          SELECT $1,$2,$3::jsonb WHERE NOT EXISTS(SELECT 1 FROM client_meta_versions WHERE client_id=$1 AND id=$4 AND metrics=$3::jsonb)
          RETURNING id`,[id,file.name,JSON.stringify(rows),head.active_version]);
        if (!version) return "Arquivo já incorporado. Nenhuma métrica foi alterada.";
        await db.query("UPDATE client_meta_reports SET active_version=$2 WHERE client_id=$1",[id,version.id]);
        await db.query("DELETE FROM client_meta_versions WHERE client_id=$1 AND id IN (SELECT id FROM client_meta_versions WHERE client_id=$1 ORDER BY id DESC OFFSET 10)",[id]);
        return "Métricas atualizadas.";
      }
      if (restore!=="empty" && !(await db.query("SELECT id FROM client_meta_versions WHERE client_id=$1 AND id=$2",[id,restore])).rowCount) throw new InputError("Versão indisponível para este cliente.");
      await db.query("UPDATE client_meta_reports SET active_version=$2 WHERE client_id=$1",[id,restore==="empty"?null:restore]);
      return "Relatório restaurado.";
    });
    return Response.json({message});
  } catch (e) {
    return Response.json({error:e instanceof InputError ? e.message : "Falha ao atualizar o relatório."},{status:e instanceof InputError ? 400 : 500});
  }
}
