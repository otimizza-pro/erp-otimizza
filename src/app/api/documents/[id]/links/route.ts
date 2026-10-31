import { NextResponse } from "next/server";
import { DocumentService } from "@/modules/documents/service";
import { LinkDocumentInputSchema } from "@/modules/documents/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const parsed = LinkDocumentInputSchema.safeParse({ ...body, documentId: id });
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: `Dados inválidos: ${msg}` }, { status: 400 });
    }

    const link = await DocumentService.linkDocument(parsed.data);
    return NextResponse.json(link, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao vincular documento.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
