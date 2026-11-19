import { requireAdminUser } from "@/lib/auth/require-auth";
import { getProposalTextDraft, saveProposalTextDraft } from "@/modules/proposals/text-draft";
import { z } from "zod";

function recipient(request: Request) {
  const params = new URL(request.url).searchParams;
  const leadId = params.get("leadId"); const clientId = params.get("clientId");
  if (Boolean(leadId) === Boolean(clientId)) throw new Error("Selecione um único destinatário.");
  return leadId ? { leadId: z.string().uuid().parse(leadId) } : { clientId: z.string().uuid().parse(clientId) };
}
export async function GET(request: Request) {
  try { await requireAdminUser(); } catch { return Response.json({ error: "Acesso não autorizado." }, { status: 401 }); }
  try { return Response.json({ draft: await getProposalTextDraft(recipient(request)) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Erro ao carregar textos." }, { status: 400 }); }
}
export async function PUT(request: Request) {
  try { await requireAdminUser(); } catch { return Response.json({ error: "Acesso não autorizado." }, { status: 401 }); }
  try { return Response.json({ draft: await saveProposalTextDraft(recipient(request), await request.json()) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Erro ao salvar textos." }, { status: 400 }); }
}
