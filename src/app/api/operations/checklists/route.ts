import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { operationAreas, operationStatuses } from "@/modules/operations/catalog";
const scope = z.union([z.literal("otimizza"), z.string().uuid()]);
const schema = z.object({scope: scope, area: z.string().refine(v => Object.hasOwn(operationAreas, v)), tasks: z.record(z.string(),z.object({status: z.enum(operationStatuses), notes: z.string().max(4000)}))});
export async function GET(request: Request) {
 try { await requireAdminUser(); } catch { return NextResponse.json({error:"Acesso não autorizado"}, {status:401}); }
 try {
  const params = new URL(request.url).searchParams;
  const key = scope.parse(params.get("scope"));
  const area = params.get("area") || "";
  if (!Object.hasOwn(operationAreas, area)) return NextResponse.json({error:"Área inválida"},{status:400});
  const result = await query("SELECT tasks FROM operational_checklists WHERE scope_key = $1 AND area = $2", [key, area]);
  return NextResponse.json({tasks:result.rows[0]?.tasks || {}});
 } catch { return NextResponse.json({error:"Não foi possível carregar o acompanhamento. Verifique a migração 025."},{status:500}); }
}
export async function PUT(request: Request) {
 let user; try { user = await requireAdminUser(); } catch { return NextResponse.json({error:"Acesso não autorizado"},{status:401}); }
 try {
  const input = schema.parse(await request.json());
  const definition = operationAreas[input.area as keyof typeof operationAreas];
  if (Object.keys(input.tasks).some(key => !definition.tasks.includes(key as never))) return NextResponse.json({error:"Tarefa inválida"},{status:400});
  await query(
   "INSERT INTO operational_checklists (scope_key, client_id, area, tasks, updated_by) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (scope_key,area) DO UPDATE SET tasks=EXCLUDED.tasks, updated_by=EXCLUDED.updated_by, updated_at=NOW()",
   [input.scope, input.scope === "otimizza" ? null : input.scope, input.area, JSON.stringify(input.tasks), user.id]);
  return NextResponse.json({success:true});
 } catch(error) { return NextResponse.json({error:error instanceof z.ZodError ? "Dados inválidos" : "Não foi possível salvar o acompanhamento."},{status:400}); }
}
