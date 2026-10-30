import { NextResponse } from "next/server";
import { getServiceById, updateService, archiveService, reactivateService, deleteService } from "@/modules/catalog/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await getServiceById(id);
    if (!item) {
      return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao buscar serviço.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const item = await updateService(id, {
      ...body,
      defaultPrice: body.defaultPrice !== undefined ? parseFloat(body.defaultPrice) : undefined,
      defaultCost: body.defaultCost !== undefined ? parseFloat(body.defaultCost) : undefined,
    });
    return NextResponse.json(item);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar serviço.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (body.action === "ARCHIVE") {
      await archiveService(id);
      return NextResponse.json({ success: true, message: "Serviço arquivado." });
    }
    if (body.action === "REACTIVATE") {
      await reactivateService(id);
      return NextResponse.json({ success: true, message: "Serviço reativado." });
    }
    return NextResponse.json({ error: "Ação não suportada." }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao alterar status do serviço.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await deleteService(id);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao excluir serviço.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

