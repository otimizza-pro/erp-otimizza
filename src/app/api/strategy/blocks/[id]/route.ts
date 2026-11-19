import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { StrategyService } from "@/modules/strategy/service";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await params;
    await StrategyService.deleteBlock(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || "Erro ao excluir bloco." }, { status: 500 });
  }
}

