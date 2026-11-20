import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CrmService } from "@/modules/crm/service";
import { LeadStatus, AcquisitionType } from "@/modules/crm/types";
import { getDbPool } from "@/lib/db/pool";

export async function GET(request: Request) {
  try { await requireAdminUser(); } catch { return NextResponse.json({error:"Acesso não autorizado"},{status:401}); }
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as LeadStatus | "ALL") || undefined;
    const source = searchParams.get("source") || undefined;
    const acquisitionType = (searchParams.get("acquisitionType") as AcquisitionType | "ALL") || undefined;
    const leadSource = searchParams.get("leadSource") || undefined;
    const firstContactChannel = searchParams.get("firstContactChannel") || undefined;
    const pipelineId = searchParams.get("pipelineId") || undefined;
    const stageId = searchParams.get("stageId") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;

    const result = await CrmService.listLeads({
      ownerClientId: searchParams.get("ownerClientId") || undefined,
      search,
      status,
      source,
      acquisitionType,
      leadSource,
      firstContactChannel,
      pipelineId,
      stageId,
      limit,
      offset,
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao listar leads.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try { await requireAdminUser(); } catch { return NextResponse.json({error:"Acesso não autorizado"},{status:401}); }
  try {
    const body = await request.json();
    const lead = await CrmService.createLead(body);
    return NextResponse.json(lead, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const msg = error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erro ao cadastrar lead.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * Exclusão em Massa de Leads com expurgo de documentos e arquivos
 */
export async function DELETE(request: Request) {
  try { await requireAdminUser(); } catch { return NextResponse.json({error:"Acesso não autorizado"},{status:401}); }
  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "Nenhum lead selecionado para exclusão." }, { status: 400 });
    }

    let purgedDocsTotal = 0;
    let deletedCount = 0;

    for (const leadId of ids) {
      try {
        const res = await CrmService.purgeLead(leadId);
        purgedDocsTotal += res.purgedDocumentsCount || 0;
        deletedCount++;
      } catch (err) {
        console.error(`Erro ao expurgar lead ${leadId}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      purgedDocumentsCount: purgedDocsTotal,
      message: `${deletedCount} lead(s) excluído(s) com sucesso. ${purgedDocsTotal} arquivo(s) expurgados do armazenamento.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao excluir leads em lote.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Edição em Massa de Leads (Status, Origem, Vinculação ao Funil & Etapa)
 */
export async function PATCH(request: Request) {
  try { await requireAdminUser(); } catch { return NextResponse.json({error:"Acesso não autorizado"},{status:401}); }
  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    const updates = body.updates || {};

    if (updates.status === "CONVERTED") {
      return NextResponse.json({ error: "Utilize a conversão para criar ou vincular o cadastro do cliente." }, { status: 400 });
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: "Nenhum lead selecionado para atualização." }, { status: 400 });
    }

    const pool = getDbPool();

    // 1. Atualização dos campos do lead (Status, Origem)
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (updates.status) {
      setClauses.push(`status = $${paramIdx++}`);
      values.push(updates.status);
    }
    if (updates.source) {
      setClauses.push(`source = $${paramIdx++}`);
      values.push(updates.source);
    }

    if (setClauses.length > 0) {
      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(ids);
      await pool.query(
        `UPDATE crm_leads SET ${setClauses.join(", ")} WHERE id = ANY($${paramIdx}::uuid[]) AND converted_client_id IS NULL AND status <> 'CONVERTED'`,
        values
      );
    }

    // 2. Vinculação ao Funil & Etapa em massa (se fornecido)
    if (updates.pipelineId) {
      for (const leadId of ids) {
        const oppRes = await pool.query<{ id: string }>(
          `SELECT id FROM crm_opportunities WHERE lead_id = $1 AND status = 'OPEN' LIMIT 1`,
          [leadId]
        );

        if (oppRes.rows.length > 0) {
          // Já tem oportunidade: move para o novo funil/etapa
          if (updates.stageId) {
            await CrmService.moveOpportunity({
              opportunityId: oppRes.rows[0].id,
              toPipelineId: updates.pipelineId,
              toStageId: updates.stageId,
              notes: "Movimentação em lote via CRM",
            });
          }
        } else {
          // Não tem oportunidade aberta: cria uma no funil e etapa solicitados
          const leadRes = await pool.query<{ name: string; source: string }>(
            `SELECT name, source FROM crm_leads WHERE id = $1`,
            [leadId]
          );
          const leadName = leadRes.rows[0]?.name || "Lead";
          await CrmService.createOpportunity({
            title: `Negociação - ${leadName}`,
            leadId,
            pipelineId: updates.pipelineId,
            stageId: updates.stageId || undefined,
            amount: 0,
            billingPeriod: "MONTHLY",
            probability: 20,
            source: leadRes.rows[0]?.source || "OUTBOUND",
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount: ids.length,
      message: `${ids.length} lead(s) atualizado(s) com sucesso.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar leads em lote.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
