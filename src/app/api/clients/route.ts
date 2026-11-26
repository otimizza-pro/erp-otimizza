import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { listClients, createClient, purgeClient } from "@/modules/clients/service";
import { getDbPool } from "@/lib/db/pool";

export async function GET(request: Request) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as "ACTIVE" | "ARCHIVED") || undefined;
    const type = (searchParams.get("type") as "PF" | "PJ") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;

    const relationship = searchParams.get("relationship");
    const includeInternal = searchParams.get("includeInternal") === "true";
    const result = await listClients({ search, status, type, limit, offset, includeInternal, relationship: relationship === "former" || relationship === "current" ? relationship : undefined });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno ao listar clientes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const body = await request.json();
    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: "Nome e Tipo (PF ou PJ) são obrigatórios." },
        { status: 400 }
      );
    }

    const client = await createClient(body);
    return NextResponse.json(client, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao cadastrar cliente.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * Exclusão em Massa de Clientes com expurgo definitivo de documentos e arquivos
 */
export async function DELETE(request: Request) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "Nenhum cliente selecionado para exclusão." }, { status: 400 });
    }

    let purgedDocsTotal = 0;
    let deletedCount = 0;
    const failed: { id: string; error: string }[] = [];

    for (const clientId of ids) {
      try {
        const res = await purgeClient(clientId);
        purgedDocsTotal += res.purgedDocumentsCount || 0;
        deletedCount++;
      } catch (err) {
        const reason = err instanceof Error ? err.message : "Erro ao excluir cliente.";
        failed.push({ id: clientId, error: reason });
        console.error(`Erro ao expurgar cliente ${clientId}:`, err);
      }
    }

    if (deletedCount === 0 && failed.length > 0) {
      return NextResponse.json(
        {
          success: false,
          totalRequested: ids.length,
          deletedCount: 0,
          archivedCount: 0,
          failed,
          error: failed[0].error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: failed.length === 0,
      totalRequested: ids.length,
      deletedCount,
      archivedCount: 0,
      failedCount: failed.length,
      failed,
      purgedDocumentsCount: purgedDocsTotal,
      message:
        failed.length > 0
          ? `${deletedCount} cliente(s) excluído(s); ${failed.length} não pôde/puderam ser excluído(s) (${failed[0].error}).`
          : `${deletedCount} cliente(s) excluído(s) definitivamente. ${purgedDocsTotal} arquivo(s) expurgados do armazenamento.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao excluir clientes em lote.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Edição em Massa de Clientes (Status, Tipo PF/PJ)
 */
export async function PATCH(request: Request) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    const updates = body.updates || {};

    if (ids.length === 0) {
      return NextResponse.json({ error: "Nenhum cliente selecionado para atualização." }, { status: 400 });
    }

    const pool = getDbPool();
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (updates.status === "ARCHIVED" || updates.status === "INACTIVE") {
      if (ids.includes("00000000-0000-4000-8000-000000000001")) {
        return NextResponse.json({ error: "A empresa interna da Otimizza não pode ser arquivada." }, { status: 400 });
      }
      setClauses.push(`status = $${paramIdx++}`);
      values.push(updates.status);
      if (updates.status === "ARCHIVED") {
        setClauses.push(`archived_at = CURRENT_TIMESTAMP`);
      }
    } else if (updates.status === "ACTIVE") {
      const dupCheck = await pool.query<{ id: string }>(
        `SELECT c1.id FROM clients c1
         JOIN clients c2 ON c1.document = c2.document AND c1.id <> c2.id
         WHERE c1.id = ANY($1::uuid[]) AND c1.document IS NOT NULL AND c1.document <> '' AND c2.archived_at IS NULL`,
        [ids]
      );
      if (dupCheck.rows.length > 0) {
        return NextResponse.json({ error: "Não é possível reativar cliente com CPF/CNPJ já ativo em outro cadastro." }, { status: 409 });
      }
      setClauses.push(`status = $${paramIdx++}`);
      values.push("ACTIVE");
      setClauses.push(`archived_at = NULL`);
    }
    if (updates.type === "PF" || updates.type === "PJ") {
      setClauses.push(`type = $${paramIdx++}`);
      values.push(updates.type);
    }

    if (setClauses.length > 0) {
      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(ids);
      await pool.query(
        `UPDATE clients SET ${setClauses.join(", ")} WHERE id = ANY($${paramIdx}::uuid[])`,
        values
      );
    }

    return NextResponse.json({
      success: true,
      updatedCount: ids.length,
      message: `${ids.length} cliente(s) atualizado(s) com sucesso.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar clientes em lote.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
