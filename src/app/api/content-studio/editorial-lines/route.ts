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
      `SELECT el.*, ca.name as audience_name
       FROM client_editorial_lines el
       LEFT JOIN client_audiences ca ON ca.id = el.target_audience_id
       WHERE el.client_id = $1 AND el.is_active = true
       ORDER BY el.pillar_name ASC, el.theme ASC`,
      [clientId]
    );
    return NextResponse.json({ editorialLines: res.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao buscar linhas editoriais.";
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
    const { clientId, pillarName, theme, objective, targetAudienceId, preferredFormats, frequencyPerMonth, notes } = body;

    if (!clientId || !pillarName?.trim() || !theme?.trim()) {
      return NextResponse.json({ error: "Cliente, Pilar e Tema são obrigatórios." }, { status: 400 });
    }

    const res = await query(
      `INSERT INTO client_editorial_lines (
        client_id, pillar_name, theme, objective, target_audience_id,
        preferred_formats, frequency_per_month, notes, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      RETURNING *`,
      [
        clientId,
        pillarName.trim(),
        theme.trim(),
        objective?.trim() || null,
        targetAudienceId || null,
        preferredFormats || ["Reels", "Carrossel", "Post estático"],
        frequencyPerMonth || 4,
        notes?.trim() || null
      ]
    );

    return NextResponse.json({ editorialLine: res.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao criar linha editorial.";
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
    const { id, pillarName, theme, objective, targetAudienceId, preferredFormats, frequencyPerMonth, notes } = body;

    if (!id || !pillarName?.trim() || !theme?.trim()) {
      return NextResponse.json({ error: "ID, Pilar e Tema são obrigatórios." }, { status: 400 });
    }

    const res = await query(
      `UPDATE client_editorial_lines SET
        pillar_name = $1,
        theme = $2,
        objective = $3,
        target_audience_id = $4,
        preferred_formats = $5,
        frequency_per_month = $6,
        notes = $7,
        updated_at = now()
      WHERE id = $8
      RETURNING *`,
      [
        pillarName.trim(),
        theme.trim(),
        objective?.trim() || null,
        targetAudienceId || null,
        preferredFormats || ["Reels", "Carrossel", "Post estático"],
        frequencyPerMonth || 4,
        notes?.trim() || null,
        id
      ]
    );

    return NextResponse.json({ editorialLine: res.rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar linha editorial.";
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
    await query(`UPDATE client_editorial_lines SET is_active = false, updated_at = now() WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao desativar linha editorial.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

