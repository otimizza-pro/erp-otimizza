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
      id, client_id, type, name, description, differentials, deliverables,
      target_pain_points, solution_approach, target_audience_ids,
      is_active, order_index, created_at, updated_at
    FROM public.client_catalog_items
    WHERE client_id = $1
    ORDER BY order_index ASC, created_at ASC
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
    if (res.rows.length > 0) return res.rows[0];
  }

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
  return insertRes.rows[0];
}

export async function deleteCatalogItem(
  clientId: string,
  itemId: string,
  db?: PoolClient | { query: typeof query }
): Promise<boolean> {
  const runner = db ? db.query.bind(db) : query;
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
  }>
): Promise<ClientCatalogItem[]> {
  return withTransaction(async (client) => {
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

    // Desativa ou remove itens que foram expressamente removidos se aplicável
    // (Apenas remove itens com ID existente que não constam mais na lista enviada se a lista enviada não estiver vazia)
    if (items.length > 0) {
      for (const oldId of existingIds) {
        if (!processedIds.has(oldId)) {
          await deleteCatalogItem(clientId, oldId, client);
        }
      }
    }

    return saved;
  });
}
