import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { movePage } from "@/modules/knowledge/service";

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { id, parentId, orderIndex } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "ID da página é obrigatório." }, { status: 400 });
    }

    await movePage(id, parentId || null, orderIndex ?? 0);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao mover página.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
