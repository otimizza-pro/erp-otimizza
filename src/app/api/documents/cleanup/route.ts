import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { processStorageCleanup } from "@/modules/documents/cleanup";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    try { await requireAdminUser(); }
    catch { return NextResponse.json({error:"Acesso não autorizado."},{status:401}); }
  }
  try {
    const result = await processStorageCleanup();
    return NextResponse.json({success: result.failed === 0, ...result}, {status:result.failed ? 503 : 200});
  } catch (error) {
    console.error("Falha na fila de limpeza", error);
    return NextResponse.json({success:false,error:"Não foi possível processar a limpeza de arquivos."},{status:500});
  }
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({error:"Acesso não autorizado."},{status:401});
  }
  return POST(request);
}
