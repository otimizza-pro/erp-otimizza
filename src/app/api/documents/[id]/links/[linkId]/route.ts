import { NextResponse } from "next/server";
import { DocumentService } from "@/modules/documents/service";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const { id, linkId } = await context.params;
    await DocumentService.unlinkDocument(id, linkId);
    return NextResponse.json({ success: true, message: "Vínculo desfeito com sucesso." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao remover vínculo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
