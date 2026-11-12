import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const clientsRes = await query(`
      SELECT id, name, trade_name, type, status
      FROM clients
      WHERE status = 'ACTIVE'
      ORDER BY name ASC
    `);

    const clients = clientsRes.rows;
    return NextResponse.json({ clients });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao carregar clientes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
