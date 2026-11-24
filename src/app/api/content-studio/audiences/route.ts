import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { linkAudienceCatalogItems } from "@/modules/clients/catalog-service";

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
      `
      SELECT 
        a.id, a.client_id, a.name, a.description, a.demographics,
        a.pain_points, a.desires, a.objections, a.digital_behavior,
        a.is_default, a.archived_at, a.created_at, a.updated_at,
        COALESCE(
          (
            SELECT array_agg(ca.catalog_item_id)
            FROM public.client_audience_catalog_items ca
            WHERE ca.audience_id = a.id AND ca.client_id = a.client_id
          ),
          '{}'::uuid[]
        ) as linked_catalog_item_ids,
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'type', c.type))
            FROM public.client_audience_catalog_items ca
            JOIN public.client_catalog_items c ON c.id = ca.catalog_item_id
            WHERE ca.audience_id = a.id AND ca.client_id = a.client_id AND c.is_active = true
          ),
          '[]'::json
        ) as linked_catalog_items
      FROM public.client_audiences a
      WHERE a.client_id = $1 AND a.archived_at IS NULL
      ORDER BY a.is_default DESC, a.name ASC
      `,
      [clientId]
    );

    const mapped = res.rows.map((row) => ({
      ...row,
      linkedCatalogItemIds: row.linked_catalog_item_ids || [],
      linkedCatalogItems: row.linked_catalog_items || [],
    }));

    return NextResponse.json({ audiences: mapped });
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
    const {
      clientId,
      name,
      description,
      demographics,
      painPoints,
      desires,
      objections,
      digitalBehavior,
      isDefault,
      catalogItemIds,
    } = body;

    if (!clientId || !name?.trim()) {
      return NextResponse.json({ error: "Cliente e Nome do público são obrigatórios." }, { status: 400 });
    }

    const createdAudience = await withTransaction(async (db) => {
      if (isDefault) {
        await db.query(`UPDATE client_audiences SET is_default = false WHERE client_id = $1`, [clientId]);
      }

      const res = await db.query(
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
          Boolean(isDefault),
        ]
      );

      const aud = res.rows[0];

      if (Array.isArray(catalogItemIds)) {
        await linkAudienceCatalogItems(clientId, aud.id, catalogItemIds, db);
      }

      return aud;
    });

    return NextResponse.json({ audience: createdAudience }, { status: 201 });
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
    const {
      id,
      name,
      description,
      demographics,
      painPoints,
      desires,
      objections,
      digitalBehavior,
      isDefault,
      clientId,
      catalogItemIds,
    } = body;

    if (!id || !name?.trim()) {
      return NextResponse.json({ error: "ID e Nome são obrigatórios." }, { status: 400 });
    }

    const updatedAudience = await withTransaction(async (db) => {
      if (isDefault && clientId) {
        await db.query(`UPDATE client_audiences SET is_default = false WHERE client_id = $1`, [clientId]);
      }

      const res = await db.query(
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
        WHERE id = $9 ${clientId ? "AND client_id = $10" : ""}
        RETURNING *`,
        clientId
          ? [
              name.trim(),
              description?.trim() || null,
              demographics?.trim() || null,
              painPoints || [],
              desires || [],
              objections || [],
              digitalBehavior?.trim() || null,
              Boolean(isDefault),
              id,
              clientId,
            ]
          : [
              name.trim(),
              description?.trim() || null,
              demographics?.trim() || null,
              painPoints || [],
              desires || [],
              objections || [],
              digitalBehavior?.trim() || null,
              Boolean(isDefault),
              id,
            ]
      );

      if (res.rows.length === 0) {
        throw new Error("Público não encontrado.");
      }

      const aud = res.rows[0];
      const targetClientId = clientId || aud.client_id;

      if (Array.isArray(catalogItemIds)) {
        await linkAudienceCatalogItems(targetClientId, aud.id, catalogItemIds, db);
      }

      return aud;
    });

    return NextResponse.json({ audience: updatedAudience });
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
  const clientId = searchParams.get("clientId");

  if (!id) {
    return NextResponse.json({ error: "ID é obrigatório." }, { status: 400 });
  }

  try {
    await withTransaction(async (db) => {
      // 1. Remover vínculos N:N
      if (clientId) {
        await db.query(
          `DELETE FROM public.client_audience_catalog_items WHERE audience_id = $1 AND client_id = $2`,
          [id, clientId]
        );
      } else {
        await db.query(
          `DELETE FROM public.client_audience_catalog_items WHERE audience_id = $1`,
          [id]
        );
      }

      // 2. Remover público
      if (clientId) {
        await db.query(`DELETE FROM client_audiences WHERE id = $1 AND client_id = $2`, [id, clientId]);
      } else {
        await db.query(`DELETE FROM client_audiences WHERE id = $1`, [id]);
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao excluir público.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
