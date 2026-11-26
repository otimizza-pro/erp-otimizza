import { NextRequest, NextResponse } from "next/server";
import {
  getContractById,
  createContractVersion,
  cancelContract,
  getContractProjections,
  updateContract,
  deleteContract,
  setContractVisibility,
} from "@/modules/contracts/service";
import { query } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 }); }

  try {
    const { id } = await props.params;
    const contract = await getContractById(id);
    if (!contract) {
      return NextResponse.json({ error: "Contratação não encontrada." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const includeProjections = searchParams.get("projections") === "true";
    let projections = undefined;

    if (includeProjections) {
      const now = new Date();
      projections = getContractProjections(
        contract,
        { year: now.getFullYear(), month: now.getMonth() + 1 },
        12
      );
    }

    // Buscar logs de auditoria da contratação
    let auditLogs: unknown[] = [];
    try {
      const logsRes = await query(
        `SELECT id, user_id, action, old_data, new_data, created_at
         FROM audit_logs
         WHERE entity_name = 'contracts' AND entity_id = $1
         ORDER BY created_at DESC`,
        [id]
      );
      auditLogs = logsRes.rows;
    } catch (logErr) {
      console.warn("Aviso ao consultar audit_logs do contrato:", logErr);
    }

    return NextResponse.json({ contract, projections, auditLogs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno ao buscar contratação.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 }); }

  try {
    const { id } = await props.params;
    const body = await request.json();

    if (["archive", "restore", "reject"].includes(body.action)) {
      const contract = await setContractVisibility(id, body.action, typeof body.reason === "string" ? body.reason : "");
      return NextResponse.json({ success: true, contract });
    }
    // Se a requisição for para cancelamento
    if (body.action === "cancel") {
      if (!body.reason) {
        return NextResponse.json(
          { error: "Motivo do cancelamento é obrigatório." },
          { status: 400 }
        );
      }
      const updated = await cancelContract({
        contractId: id,
        cancellationReason: body.reason,
        canceledAt: body.canceledAt,
      });
      return NextResponse.json(updated);
    }

    // Caso contrário, trata-se de uma nova versão de vigência
    const newVersion = await createContractVersion({
      ...body,
      contractId: id,
    });
    return NextResponse.json(newVersion, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar contratação.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const { id } = await props.params;
    const body = await request.json();

    const updated = await updateContract(id, body);
    return NextResponse.json({ success: true, contract: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao editar contrato.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const { id } = await props.params;
    let reason = "Exclusão manual de contrato";

    try {
      const body = await request.json();
      if (body?.reason) reason = body.reason;
    } catch {
      const { searchParams } = new URL(request.url);
      const qReason = searchParams.get("reason");
      if (qReason) reason = qReason;
    }

    const result = await deleteContract(id, reason);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao excluir contrato.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
