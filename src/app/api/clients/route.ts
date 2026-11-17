import { NextResponse } from "next/server";
import { listClients, createClient, purgeClient } from "@/modules/clients/service";
import { getDbPool } from "@/lib/db/pool";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as "ACTIVE" | "ARCHIVED") || undefined;
    const type = (searchParams.get("type") as "PF" | "PJ") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;

    const result = await listClients({ search, status, type, limit, offset });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno ao listar clientes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "Nenhum cliente selecionado para exclusão." }, { status: 400 });
    }

    let purgedDocsTotal = 0;
    let deletedCount = 0;
    let archivedCount = 0;

    for (const clientId of ids) {
      try {
        const res = await purgeClient(clientId);
        purgedDocsTotal += res.purgedDocumentsCount || 0;
        if (res.clientDeleted) {
          deletedCount++;
        } else {
          archivedCount++;
        }
      } catch (err) {
        console.error(`Erro ao expurgar cliente ${clientId}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      totalRequested: ids.length,
      deletedCount,
      archivedCount,
      purgedDocumentsCount: purgedDocsTotal,
      message: `${deletedCount} cliente(s) excluído(s) definitivamente e ${archivedCount} arquivado(s) (para preservar histórico de caixa). ${purgedDocsTotal} arquivo(s) expurgados do armazenamento.`,
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

    if (updates.status) {
      setClauses.push(`status = $${paramIdx++}`);
      values.push(updates.status);
    }
    if (updates.type) {
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
