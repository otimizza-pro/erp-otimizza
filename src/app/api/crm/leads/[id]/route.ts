import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return NextResponse.json({error:"Acesso não autorizado"},{status:401}); }
  try {
    const { id } = await params;
    const lead = await CrmService.getLeadById(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
    }
    const url = new URL(_request.url);
    if (url.searchParams.get("includeHistory") === "true") {
      const history = await CrmService.getLeadStatusHistory(id);
      return NextResponse.json({ ...lead, history });
    }
    return NextResponse.json(lead);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao buscar lead.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return NextResponse.json({error:"Acesso não autorizado"},{status:401}); }
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await CrmService.updateLead(id, body);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar lead.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return NextResponse.json({error:"Acesso não autorizado"},{status:401}); }
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const onlyArchive = url.searchParams.get("archive") === "true";

    if (onlyArchive) {
      await CrmService.archiveLead(id);
      return NextResponse.json({ success: true, message: "Lead arquivado com sucesso." });
    }

    const result = await CrmService.purgeLead(id);
    return NextResponse.json({
      success: true,
      message: `Lead e ${result.purgedDocumentsCount} documento(s) removidos do cadastro. A limpeza dos arquivos externos é processada separadamente e pode permanecer pendente.`,
      purgedDocumentsCount: result.purgedDocumentsCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao excluir lead.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
