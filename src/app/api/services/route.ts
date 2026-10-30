import { NextResponse } from "next/server";
import { listServices, createService, listServiceCategories, createServiceCategory } from "@/modules/catalog/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "services" ou "categories"

    if (type === "categories") {
      const status = (searchParams.get("status") as "ACTIVE" | "ARCHIVED") || undefined;
      const categories = await listServiceCategories({ status });
      return NextResponse.json(categories);
    }

    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as "ACTIVE" | "ARCHIVED") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;

    const services = await listServices({ search, status, categoryId });
    return NextResponse.json(services);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao listar serviços.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.type === "CATEGORY") {
      const category = await createServiceCategory({
        name: body.name,
        description: body.description,
        parentId: body.parentId,
      });
      return NextResponse.json(category, { status: 201 });
    }

    const service = await createService({
      categoryId: body.categoryId,
      name: body.name,
      description: body.description,
      defaultPrice: parseFloat(body.defaultPrice || "0"),
      defaultCost: parseFloat(body.defaultCost || "0"),
      billingUnit: body.billingUnit || "MES",
    });
    return NextResponse.json(service, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao criar serviço/categoria.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
