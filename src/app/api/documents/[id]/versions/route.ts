import { NextResponse } from "next/server";
import { DocumentService } from "@/modules/documents/service";
import { AddDocumentVersionInputSchema } from "@/modules/documents/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "Novo arquivo obrigatório não enviado." }, { status: 400 });
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const rawInput = {
        documentId: id,
        originalFilename: file.name,
        mimeType: file.type || "application/octet-stream",
        reasonForChange: (formData.get("reasonForChange") as string) || "Atualização de versão",
        actorName: (formData.get("actorName") as string) || "Administrador",
      };

      const parsed = AddDocumentVersionInputSchema.safeParse(rawInput);
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => i.message).join(", ");
        return NextResponse.json({ error: `Dados inválidos: ${msg}` }, { status: 400 });
      }

      const updated = await DocumentService.addDocumentVersion(parsed.data, fileBuffer);
      return NextResponse.json(updated, { status: 201 });
    }

    const body = await request.json();
    if (!body.fileBase64) {
      return NextResponse.json({ error: "Campo fileBase64 é obrigatório." }, { status: 400 });
    }

    const fileBuffer = Buffer.from(body.fileBase64, "base64");
    const parsed = AddDocumentVersionInputSchema.safeParse({ ...body, documentId: id });
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: `Dados inválidos: ${msg}` }, { status: 400 });
    }

    const updated = await DocumentService.addDocumentVersion(parsed.data, fileBuffer);
    return NextResponse.json(updated, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao adicionar versão ao documento.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
