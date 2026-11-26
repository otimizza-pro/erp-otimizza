import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { query } from "@/lib/db/pool";
import { encryptPassword, decryptPassword } from "@/modules/passwords/crypto";

const metadata = "id, title, username, website, updated_at";
const createSchema = z.object({
  title: z.string().trim().min(1).max(160),
  username: z.string().trim().max(320),
  website: z.string().trim().max(2048).refine(v => !v || (/^https?:\/\//i.test(v) && URL.canParse(v))),
  password: z.string().min(1).max(4096),
});
const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  username: z.string().trim().max(320),
  website: z.string().trim().max(2048).refine(v => !v || (/^https?:\/\//i.test(v) && URL.canParse(v))),
  password: z.string().max(4096).optional().default(""),
});
const uuid = z.string().uuid();
function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store, private", Pragma: "no-cache" } });
}
async function handle(request: NextRequest) {
  let user;
  try { user = await requireAdminUser(); } catch { return json({ error: "Acesso não autorizado." }, 401); }
  if (request.method !== "GET" && request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "Origem não autorizada." }, 403);
  try {
    if (request.method === "GET") {
      const result = await query(`SELECT ${metadata} FROM password_vault_entries WHERE owner_id=$1 AND archived_at IS ${request.nextUrl.searchParams.get("archived")==="true"?"NOT ":""}NULL ORDER BY title`, [user.id]);
      return json({ entries: result.rows });
    }
    const body = await request.json();
    if(request.method==="PATCH"){
      const archived=z.boolean().parse(body.archived);const id=uuid.parse(body.id);
      const changed=await query("UPDATE password_vault_entries SET archived_at=CASE WHEN $3 THEN NOW() ELSE NULL END,updated_at=NOW() WHERE id=$1 AND owner_id=$2 RETURNING id",[id,user.id,archived]);
      return changed.rowCount?json({ok:true}):json({error:"Registro não encontrado."},404);
    }
    if (request.method === "POST" && body.action === "reveal") {
      const id = uuid.parse(body.id);
      const result = await query<{ encrypted_password: string }>("SELECT encrypted_password FROM password_vault_entries WHERE id=$1 AND owner_id=$2", [id, user.id]);
      if (!result.rows[0]) return json({ error: "Registro não encontrado." }, 404);
      return json({ password: decryptPassword(result.rows[0].encrypted_password, `${user.id}:${id}`) });
    }
    if (request.method === "DELETE") {
      const result = await query("DELETE FROM password_vault_entries WHERE id=$1 AND owner_id=$2 RETURNING id", [uuid.parse(body.id), user.id]);
      return result.rowCount ? json({ ok: true }) : json({ error: "Registro não encontrado." }, 404);
    }
    if (request.method === "PUT") {
      const input = updateSchema.parse(body);
      const hasNewPassword = input.password.trim().length > 0;
      const result = hasNewPassword
        ? await query(
            `UPDATE password_vault_entries SET title=$3, username=$4, website=$5, encrypted_password=$6, updated_at=now() WHERE id=$1 AND owner_id=$2 RETURNING ${metadata}`,
            [input.id, user.id, input.title, input.username, input.website, encryptPassword(input.password, `${user.id}:${input.id}`)]
          )
        : await query(
            `UPDATE password_vault_entries SET title=$3, username=$4, website=$5, updated_at=now() WHERE id=$1 AND owner_id=$2 RETURNING ${metadata}`,
            [input.id, user.id, input.title, input.username, input.website]
          );
      return result.rows[0] ? json({ entry: result.rows[0] }, 200) : json({ error: "Registro não encontrado." }, 404);
    }
    const input = createSchema.parse(body);
    const id = randomUUID();
    const values = [id, user.id, input.title, input.username, input.website, encryptPassword(input.password, `${user.id}:${id}`)];
    const result = await query(`INSERT INTO password_vault_entries (id,owner_id,title,username,website,encrypted_password) VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${metadata}`, values);
    return result.rows[0] ? json({ entry: result.rows[0] }, 201) : json({ error: "Registro não encontrado." }, 404);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const hasWebsiteIssue = error.issues.some((i) => i.path.includes("website"));
      return json(
        {
          error: hasWebsiteIssue
            ? "Informe um endereço válido começando com http:// ou https://"
            : "Verifique os campos obrigatórios antes de salvar",
        },
        400
      );
    }
    if (error instanceof SyntaxError) return json({ error: "Dados da requisição inválidos." }, 400);
    if (error instanceof Error && error.message === "VAULT_NOT_CONFIGURED") return json({ error: "O administrador precisa configurar a chave do cofre." }, 503);
    return json({ error: "Não foi possível acessar o cofre. Tente novamente." }, 500);
  }
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const PATCH = handle;
