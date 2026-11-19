import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";
import { activityFiltersSchema } from "@/modules/crm/activity-filters";
import { z } from "zod";

export async function GET(request: Request) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId") || undefined;
    const clientId = searchParams.get("clientId") || undefined;
    const opportunityId = searchParams.get("opportunityId") || undefined;
    const status = z.enum(["PENDING", "COMPLETED", "CANCELED", "NO_SHOW", "RESCHEDULED"]).optional().parse(searchParams.get("status") || undefined);
    const overdueOnly = searchParams.get("overdueOnly") === "true";
    const { limit, offset } = z.object({ limit: z.coerce.number().int().min(1).max(500).default(100), offset: z.coerce.number().int().min(0).default(0) }).parse(Object.fromEntries(searchParams));

    const includeMetrics = searchParams.get("includeMetrics") === "true";
    const filters = {
      ...activityFiltersSchema.parse(Object.fromEntries(searchParams)),
      leadId, clientId, opportunityId,
      archived: searchParams.get("archived") === "true",
    };

    const [activities, metrics] = await Promise.all([
      CrmService.listActivities({
        ...filters,
        status,
        overdueOnly,
        limit,
        offset,
      }),
      includeMetrics ? CrmService.getActivityMetrics(filters) : Promise.resolve(undefined),
    ]);

    if (metrics) {
      return NextResponse.json({ activities, metrics });
    }
    return NextResponse.json(activities);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao listar atividades.";
    return NextResponse.json({ error: message }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues.map((e) => e.message).join(" ");
  }
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (Array.isArray(parsed) && parsed[0]?.message) {
        return parsed.map((e: { message: string }) => e.message).join(" ");
      }
    } catch {
      // Not JSON
    }
    return error.message;
  }
  return "Erro ao registrar atividade.";
}

export async function POST(request: Request) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const body = await request.json();
    const activity = await CrmService.createActivity(body);
    return NextResponse.json(activity, { status: 201 });
  } catch (error: unknown) {
    const message = formatErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
