import { NextResponse } from "next/server";
import { DocumentService } from "@/modules/documents/service";

export async function GET() {
  try {
    const categories = await DocumentService.getCategories();
    return NextResponse.json(categories);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao carregar categorias documentais.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
