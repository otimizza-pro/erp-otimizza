import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { clientFiles, clientHistory, organizeClientFiles } from "@/modules/clients/workspace-service";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try { await requireAdminUser(); const { id } = await context.params; const url = new URL(request.url); return NextResponse.json(url.searchParams.get("view") === "history" ? await clientHistory(id, url.searchParams.get("category") || undefined) : await clientFiles(id)); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao carregar" }, { status: 400 }); }
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { await requireAdminUser(); const { id } = await context.params; return NextResponse.json(await organizeClientFiles(id, await request.json())); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao organizar" }, { status: 400 }); }
}
