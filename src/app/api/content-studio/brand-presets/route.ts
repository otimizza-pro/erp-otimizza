import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { getBrandPreset, saveBrandPreset } from "@/modules/clients/brand-preset";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try { await requireAdminUser(); } catch { return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 }); }
  try { return NextResponse.json({ preset: await getBrandPreset(new URL(request.url).searchParams.get("clientId") || "") }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar DNA." }, { status: 400 }); }
}
export async function POST(request: NextRequest) {
  try { await requireAdminUser(); } catch { return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 }); }
  try { return NextResponse.json({ preset: await saveBrandPreset(await request.json()) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao salvar DNA." }, { status: 400 }); }
}