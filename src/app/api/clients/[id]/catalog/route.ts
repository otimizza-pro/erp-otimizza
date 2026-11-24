import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import {
  getCatalogItemsByClientId,
  upsertCatalogItem,
  deleteCatalogItem,
  syncCatalogItems,
} from "@/modules/clients/catalog-service";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const { id: clientId } = await params;
    const items = await getCatalogItemsByClientId(clientId);
    return NextResponse.json({ success: true, items });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erro ao buscar catálogo." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const { id: clientId } = await params;
    const body = await req.json();

    if (Array.isArray(body.items)) {
      const synced = await syncCatalogItems(clientId, body.items);
      return NextResponse.json({ success: true, items: synced });
    }

    const single = await upsertCatalogItem(clientId, body);
    return NextResponse.json({ success: true, item: single });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erro ao salvar catálogo." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const { id: clientId } = await params;
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json({ success: false, error: "itemId é obrigatório." }, { status: 400 });
    }

    const removed = await deleteCatalogItem(clientId, itemId);
    return NextResponse.json({ success: true, removed });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erro ao remover item do catálogo." },
      { status: 500 }
    );
  }
}
