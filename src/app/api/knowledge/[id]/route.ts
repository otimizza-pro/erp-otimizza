import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { getAdminPageById, updatePage, archivePage } from "@/modules/knowledge/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  try {
    const page = await getAdminPageById(id);
    if (!page) {
      return NextResponse.json({ error: "Página não encontrada." }, { status: 404 });
    }
    return NextResponse.json({ page });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao buscar página.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const updated = await updatePage(id, body, user.id);
    return NextResponse.json({ page: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar página.";
    const status = message.includes("CONCORRÊNCIA") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  try {
    const archived = await archivePage(id);
    return NextResponse.json({ page: archived });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao arquivar página.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
