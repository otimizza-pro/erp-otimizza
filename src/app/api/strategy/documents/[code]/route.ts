import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { StrategyService } from "@/modules/strategy/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { code } = await params;
    const doc = await StrategyService.getDocumentByCode(code);
    if (!doc) {
      return NextResponse.json({ error: "Documento estratégico não encontrado." }, { status: 404 });
    }
    return NextResponse.json(doc);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || "Erro ao buscar documento." }, { status: 500 });
  }
}

