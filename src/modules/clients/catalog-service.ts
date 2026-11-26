import { query, withTransaction } from "@/lib/db/pool";
import type { PoolClient } from "pg";

export interface ClientCatalogItem {
  id: string;
  client_id: string;
  type: "SERVICE" | "PRODUCT";
  name: string;
  description: string;
  differentials: string;
  deliverables: string;
  target_pain_points: string;
  solution_approach: string;
  target_audience_ids: string[];
  linked_audiences?: Array<{ id: string; name: string }>;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export async function getCatalogItemsByClientId(
  clientId: string,
  db?: PoolClient | { query: typeof query }
): Promise<ClientCatalogItem[]> {
  const runner = db ? db.query.bind(db) : query;
  const res = await runner<ClientCatalogItem>(
    `
    SELECT 
      c.id, c.client_id, c.type, c.name, c.description, c.differentials, c.deliverables,
      c.target_pain_points, c.solution_approach,
      COALESCE(
        (
          SELECT array_agg(ca.audience_id)
          FROM public.client_audience_catalog_items ca
          WHERE ca.catalog_item_id = c.id
        ),
        c.target_audience_ids
      ) as target_audience_ids,
      COALESCE(
        (
          SELECT json_agg(json_build_object('id', a.id, 'name', a.name))
          FROM public.client_audience_catalog_items ca
          JOIN public.client_audiences a ON a.id = ca.audience_id
          WHERE ca.catalog_item_id = c.id AND a.archived_at IS NULL
        ),
        '[]'::json
      ) as linked_audiences,
      c.is_active, c.order_index, c.created_at, c.updated_at
    FROM public.client_catalog_items c
    WHERE c.client_id = $1
    ORDER BY c.order_index ASC, c.created_at ASC
    `,
    [clientId]
  );
  return res.rows;
}

export async function upsertCatalogItem(
  clientId: string,
  item: {
    id?: string;
    type?: "SERVICE" | "PRODUCT";
    name: string;
    description?: string;
    differentials?: string;
    deliverables?: string;
    target_pain_points?: string;
    solution_approach?: string;
    target_audience_ids?: string[];
    is_active?: boolean;
    order_index?: number;
  },
  db?: PoolClient | { query: typeof query }
): Promise<ClientCatalogItem> {
  const runner = db ? db.query.bind(db) : query;

  let savedItem: ClientCatalogItem;

  if (item.id) {
    const res = await runner<ClientCatalogItem>(
      `
      UPDATE public.client_catalog_items
      SET 
        type = COALESCE($1, type),
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        differentials = COALESCE($4, differentials),
        deliverables = COALESCE($5, deliverables),
        target_pain_points = COALESCE($6, target_pain_points),
        solution_approach = COALESCE($7, solution_approach),
        target_audience_ids = COALESCE($8, target_audience_ids),
        is_active = COALESCE($9, is_active),
        order_index = COALESCE($10, order_index),
        updated_at = NOW()
      WHERE id = $11 AND client_id = $12
      RETURNING *
      `,
      [
        item.type,
        item.name,
        item.description,
        item.differentials,
        item.deliverables,
        item.target_pain_points,
        item.solution_approach,
        item.target_audience_ids,
        item.is_active,
        item.order_index,
        item.id,
        clientId,
      ]
    );
    if (res.rows.length === 0) {
      throw new Error("Item do catálogo não encontrado para este cliente.");
    }
    savedItem = res.rows[0];
  } else {
    const insertRes = await runner<ClientCatalogItem>(
      `
      INSERT INTO public.client_catalog_items (
        client_id, type, name, description, differentials, deliverables,
        target_pain_points, solution_approach, target_audience_ids, is_active, order_index
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
      RETURNING *
      `,
      [
        clientId,
        item.type || "SERVICE",
        item.name,
        item.description || "",
        item.differentials || "",
        item.deliverables || "",
        item.target_pain_points || "",
        item.solution_approach || "",
        item.target_audience_ids || [],
        item.is_active ?? true,
        item.order_index ?? 0,
      ]
    );
    savedItem = insertRes.rows[0];
  }

  // Sincronizar tabela N:N client_audience_catalog_items com validação estrita de cliente
  if (Array.isArray(item.target_audience_ids)) {
    // 1. Remover vínculos antigos desta oferta
    await runner(
      `DELETE FROM public.client_audience_catalog_items WHERE catalog_item_id = $1 AND client_id = $2`,
      [savedItem.id, clientId]
    );

    // 2. Inserir apenas públicos que de fato pertençam a este cliente
    if (item.target_audience_ids.length > 0) {
      await runner(
        `
        INSERT INTO public.client_audience_catalog_items (client_id, audience_id, catalog_item_id)
        SELECT $1, a.id, $2
        FROM public.client_audiences a
        WHERE a.client_id = $1 AND a.id = ANY($3::uuid[])
        ON CONFLICT (audience_id, catalog_item_id) DO NOTHING
        `,
        [clientId, savedItem.id, item.target_audience_ids]
      );
    }
  }

  return savedItem;
}

export async function deleteCatalogItem(
  clientId: string,
  itemId: string,
  db?: PoolClient | { query: typeof query }
): Promise<boolean> {
  const runner = db ? db.query.bind(db) : query;
  // Remover vínculos N:N
  await runner(
    `DELETE FROM public.client_audience_catalog_items WHERE catalog_item_id = $1 AND client_id = $2`,
    [itemId, clientId]
  );
  const res = await runner(
    `DELETE FROM public.client_catalog_items WHERE id = $1 AND client_id = $2`,
    [itemId, clientId]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function syncCatalogItems(
  clientId: string,
  items: Array<{
    id?: string;
    type?: "SERVICE" | "PRODUCT";
    name: string;
    description?: string;
    differentials?: string;
    deliverables?: string;
    target_pain_points?: string;
    solution_approach?: string;
    target_audience_ids?: string[];
    is_active?: boolean;
    order_index?: number;
  }>,
  externalClient?: PoolClient
): Promise<ClientCatalogItem[]> {
  const run = async (client: PoolClient) => {
    const existing = await getCatalogItemsByClientId(clientId, client);
    const existingIds = new Set(existing.map((e) => e.id));
    const processedIds = new Set<string>();

    const saved: ClientCatalogItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.name || !it.name.trim()) continue;

      const result = await upsertCatalogItem(
        clientId,
        {
          ...it,
          name: it.name.trim(),
          order_index: it.order_index ?? i,
        },
        client
      );
      saved.push(result);
      if (result.id) processedIds.add(result.id);
    }

    if (items.length > 0) {
      for (const oldId of existingIds) {
        if (!processedIds.has(oldId)) {
          await deleteCatalogItem(clientId, oldId, client);
        }
      }
    }

    return saved;
  };
  return externalClient ? run(externalClient) : withTransaction(run);
}

export async function getCatalogItemsForAudience(
  clientId: string,
  audienceId: string,
  db?: PoolClient | { query: typeof query }
): Promise<ClientCatalogItem[]> {
  const runner = db ? db.query.bind(db) : query;
  const res = await runner<ClientCatalogItem>(
    `
    SELECT 
      c.id, c.client_id, c.type, c.name, c.description, c.differentials, c.deliverables,
      c.target_pain_points, c.solution_approach, c.is_active, c.order_index, c.created_at, c.updated_at
    FROM public.client_catalog_items c
    JOIN public.client_audience_catalog_items ca ON ca.catalog_item_id = c.id
    WHERE ca.audience_id = $1 AND ca.client_id = $2 AND c.is_active = true
    ORDER BY c.order_index ASC, c.created_at ASC
    `,
    [audienceId, clientId]
  );
  return res.rows;
}

export async function linkAudienceCatalogItems(
  clientId: string,
  audienceId: string,
  catalogItemIds: string[],
  db?: PoolClient | { query: typeof query }
): Promise<void> {
  const runner = db ? db.query.bind(db) : query;

  // 1. Validar que o público pertence a este cliente
  const audCheck = await runner(
    `SELECT id FROM public.client_audiences WHERE id = $1 AND client_id = $2`,
    [audienceId, clientId]
  );
  if (audCheck.rows.length === 0) {
    throw new Error("Público não pertence ao cliente informado.");
  }

  // 2. Limpar vínculos anteriores deste público
  await runner(
    `DELETE FROM public.client_audience_catalog_items WHERE audience_id = $1 AND client_id = $2`,
    [audienceId, clientId]
  );

  // 3. Inserir apenas ofertas que pertençam a este cliente
  if (catalogItemIds.length > 0) {
    await runner(
      `
      INSERT INTO public.client_audience_catalog_items (client_id, audience_id, catalog_item_id)
      SELECT $1, $2, c.id
      FROM public.client_catalog_items c
      WHERE c.client_id = $1 AND c.id = ANY($3::uuid[])
      ON CONFLICT (audience_id, catalog_item_id) DO NOTHING
      `,
      [clientId, audienceId, catalogItemIds]
    );
  }
}
