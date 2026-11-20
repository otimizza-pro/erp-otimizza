import { buildWeeklyReview } from "@/modules/headlines/brainstorm-weekly";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Acesso não autorizado." }, { status: 401 });
  }
  const updated = await buildWeeklyReview();
  return Response.json({ updated });
}
