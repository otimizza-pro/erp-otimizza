import { NextResponse } from "next/server";
import { DocumentService } from "@/modules/documents/service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const document = await DocumentService.getDocumentById(id);
    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
    }
    return NextResponse.json(document);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao carregar documento.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get("reason") || "Arquivamento solicitado pelo usuário";

    const archived = await DocumentService.archiveDocument(id, reason);
    return NextResponse.json(archived);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao arquivar documento.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
