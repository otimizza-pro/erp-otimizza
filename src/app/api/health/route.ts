import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";

export async function GET() {
  try { await requireAdminUser(); } catch { return NextResponse.json({error:"Acesso não autorizado."},{status:401}); }
  const dbHealth = await checkDatabaseConnection();

  const responsePayload = {
    status: dbHealth.ok ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV ?? "development",
    services: {
      database: {
        provider: dbHealth.provider ?? "PostgreSQL",
        status: dbHealth.ok ? "connected" : "disconnected",
        latencyMs: dbHealth.latencyMs ?? null,
        error: dbHealth.error ?? null,
      },
    },
  };

  return NextResponse.json(responsePayload, { status: dbHealth.ok ? 200 : 503 });
}
