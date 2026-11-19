import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextRequest, NextResponse } from "next/server";
import { updateCostCenter, archiveCostCenter } from "@/modules/financial/dre/service";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateCostCenter(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error("Erro ao atualizar centro de custo:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao atualizar centro de custo." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await params;
    await archiveCostCenter(id);
    return NextResponse.json({ success: true, message: "Centro de custo arquivado com sucesso." });
  } catch (error: unknown) {
    console.error("Erro ao arquivar centro de custo:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao arquivar centro de custo." },
      { status: 400 }
    );
  }
}
