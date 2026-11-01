import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { listAdminPages, createPage } from "@/modules/knowledge/service";

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ALL";
    const infoType = searchParams.get("infoType") || "ALL";
    const search = searchParams.get("search") || "";

    const pages = await listAdminPages({ status, infoType, search });
    return NextResponse.json({ pages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao listar páginas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "O título da página é obrigatório." }, { status: 400 });
    }

    const page = await createPage(body, user.id);
    return NextResponse.json({ page }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao criar página.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
