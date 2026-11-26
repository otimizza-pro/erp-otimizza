import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextRequest, NextResponse } from "next/server";
import { toggleChecklistItem, updateChecklistItem, deleteChecklistItem } from "@/modules/projects/service";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await params;
    const body = await req.json();
    const updated =
      typeof body.title === "string"
        ? await updateChecklistItem(id, {
            title: body.title,
            ...(typeof body.isCompleted === "boolean" ? { isCompleted: body.isCompleted } : {}),
          })
        : await toggleChecklistItem(id, Boolean(body.isCompleted));
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error("Erro ao alterar checklist:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao alterar checklist." },
      { status: 400 }
    );
  }
}

export const PATCH = PUT;

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await params;
    await deleteChecklistItem(id);
    return NextResponse.json({ success: true, message: "Item excluído com sucesso." });
  } catch (error: unknown) {
    console.error("Erro ao excluir checklist:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao excluir checklist." },
      { status: 400 }
    );
  }
}
