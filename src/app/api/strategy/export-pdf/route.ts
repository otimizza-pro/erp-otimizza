import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { StrategyService } from "@/modules/strategy/service";
import { generateStrategyPdf } from "@/modules/strategy/pdf";

export async function POST(request: Request) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const body = await request.json();
    if (!body.code) {
      return NextResponse.json({ error: "Código do documento obrigatório." }, { status: 400 });
    }

    const doc = await StrategyService.getDocumentByCode(body.code);
    if (!doc) {
      return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
    }

    const pdfBuffer = await generateStrategyPdf({
      document: doc,
      includeCover: body.includeCover !== false,
      selectedBlockIds: body.selectedBlockIds,
      customTitle: body.customTitle,
      customSubtitle: body.customSubtitle,
      notes: body.notes,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${doc.code}_planejamento_otimizza.pdf"`,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || "Erro ao gerar PDF." }, { status: 500 });
  }
}

