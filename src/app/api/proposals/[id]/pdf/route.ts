import { NextResponse } from "next/server";
import { ProposalService } from "@/modules/proposals/service";
import { generateProposalPdf } from "@/modules/proposals/pdf";
import { DocumentService } from "@/modules/documents/service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get("versionId") || undefined;

    const proposal = await ProposalService.getProposalById(id);
    if (!proposal) {
      return NextResponse.json({ error: "Proposta não encontrada." }, { status: 404 });
    }

    let version = proposal.currentVersion;
    if (versionId) {
      const found = proposal.versions?.find((v) => v.id === versionId);
      if (found) version = found;
    } else if (proposal.approvedVersionNumber) {
      const found = proposal.versions?.find((v) => v.versionNumber === proposal.approvedVersionNumber);
      if (found) version = found;
    }

    if (!version) {
      return NextResponse.json({ error: "Versão da proposta não encontrada." }, { status: 404 });
    }

    const pdfBuffer = await generateProposalPdf(proposal, version);
    const filename = `proposta-${proposal.proposalCode}-v${version.versionNumber}.pdf`;

    // Integrar ao repositório documental (Fase 9)
    try {
      const existingDocs = await DocumentService.getDocumentsForEntity("PROPOSAL", proposal.id);
      const isAlreadyAttached = existingDocs.some(
        (d) => d.title.includes(`Versão ${version.versionNumber}`) || d.title.includes(`v${version.versionNumber}`)
      );
      if (!isAlreadyAttached) {
        await DocumentService.attachProposalPdf(
          proposal.id,
          version.versionNumber,
          proposal.proposalCode,
          pdfBuffer
        );
      }
    } catch (docErr) {
      console.warn("Aviso: Falha ao arquivar PDF da proposta na Gestão Documental:", docErr);
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.byteLength),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao gerar PDF da proposta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
