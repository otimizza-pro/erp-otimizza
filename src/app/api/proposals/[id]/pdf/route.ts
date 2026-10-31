import { NextResponse } from "next/server";
import { ProposalService } from "@/modules/proposals/service";
import { generateProposalPdf } from "@/modules/proposals/pdf";

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
