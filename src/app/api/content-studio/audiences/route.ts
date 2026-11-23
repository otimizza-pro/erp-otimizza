import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId é obrigatório." }, { status: 400 });
  }

  try {
    const res = await query(
      `SELECT * FROM client_audiences WHERE client_id = $1 AND archived_at IS NULL ORDER BY is_default DESC, name ASC`,
      [clientId]
    );
    return NextResponse.json({ audiences: res.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao buscar públicos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clientId, name, description, demographics, painPoints, desires, objections, digitalBehavior, isDefault } = body;

    if (!clientId || !name?.trim()) {
      return NextResponse.json({ error: "Cliente e Nome do público são obrigatórios." }, { status: 400 });
    }

    if (isDefault) {
      await query(`UPDATE client_audiences SET is_default = false WHERE client_id = $1`, [clientId]);
    }

    const res = await query(
      `INSERT INTO client_audiences (
        client_id, name, description, demographics, pain_points, desires, objections, digital_behavior, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        clientId,
        name.trim(),
        description?.trim() || null,
        demographics?.trim() || null,
        painPoints || [],
        desires || [],
        objections || [],
        digitalBehavior?.trim() || null,
        Boolean(isDefault)
      ]
    );

    return NextResponse.json({ audience: res.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao criar público.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, description, demographics, painPoints, desires, objections, digitalBehavior, isDefault, clientId } = body;

    if (!id || !name?.trim()) {
      return NextResponse.json({ error: "ID e Nome são obrigatórios." }, { status: 400 });
    }

    if (isDefault && clientId) {
      await query(`UPDATE client_audiences SET is_default = false WHERE client_id = $1`, [clientId]);
    }

    const res = await query(
      `UPDATE client_audiences SET
        name = $1,
        description = $2,
        demographics = $3,
        pain_points = $4,
        desires = $5,
        objections = $6,
        digital_behavior = $7,
        is_default = $8,
        updated_at = now()
      WHERE id = $9
      RETURNING *`,
      [
        name.trim(),
        description?.trim() || null,
        demographics?.trim() || null,
        painPoints || [],
        desires || [],
        objections || [],
        digitalBehavior?.trim() || null,
        Boolean(isDefault),
        id
      ]
    );

    return NextResponse.json({ audience: res.rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar público.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID é obrigatório." }, { status: 400 });
  }

  try {
    await query(`DELETE FROM client_audiences WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao excluir público.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

