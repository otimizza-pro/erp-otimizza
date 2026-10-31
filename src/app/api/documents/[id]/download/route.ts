import { NextResponse } from "next/server";
import { DocumentService } from "@/modules/documents/service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const versionParam = searchParams.get("version");
    const versionNumber = versionParam ? Number(versionParam) : undefined;

    const fileData = await DocumentService.getDocumentFile(id, versionNumber);

    // Converte Buffer para Uint8Array para compatibilidade estrita com NextResponse
    const body = new Uint8Array(fileData.buffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": fileData.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileData.filename)}"`,
        "Content-Length": String(fileData.buffer.length),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao baixar arquivo do documento.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
