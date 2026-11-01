import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { restorePageVersion } from "@/modules/knowledge/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  let user;
  try {
    user = await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  const { id, version } = await params;
  const versionNum = parseInt(version, 10);

  if (isNaN(versionNum) || versionNum < 1) {
    return NextResponse.json({ error: "Número de versão inválido." }, { status: 400 });
  }

  try {
    const page = await restorePageVersion(id, versionNum, user.id);
    return NextResponse.json({ page });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao restaurar versão.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
