import { NextResponse } from "next/server";
import { DocumentService } from "@/modules/documents/service";
import { CreateDocumentInputSchema, DocumentFilterOptions } from "@/modules/documents/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters: DocumentFilterOptions = {
      search: searchParams.get("search") || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      status: (searchParams.get("status") as "ACTIVE" | "ARCHIVED" | "ALL") || undefined,
      entityType: (searchParams.get("entityType") as DocumentFilterOptions["entityType"]) || undefined,
      entityId: searchParams.get("entityId") || undefined,
      tag: searchParams.get("tag") || undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      offset: searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined,
    };

    const result = await DocumentService.listDocuments(filters);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao listar documentos.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "Arquivo obrigatório não enviado." }, { status: 400 });
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());

      let links = [];
      const linksRaw = formData.get("links");
      if (typeof linksRaw === "string" && linksRaw.trim()) {
        try {
          links = JSON.parse(linksRaw);
        } catch {
          links = [];
        }
      }

      let tags: string[] = [];
      const tagsRaw = formData.get("tags");
      if (typeof tagsRaw === "string" && tagsRaw.trim()) {
        try {
          tags = JSON.parse(tagsRaw);
        } catch {
          tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
        }
      }

      const rawInput = {
        title: formData.get("title") || file.name,
        description: formData.get("description") || null,
        categoryId: formData.get("categoryId") || "OTHER",
        tags,
        issueDate: formData.get("issueDate") || null,
        expirationDate: formData.get("expirationDate") || null,
        originalFilename: file.name,
        mimeType: file.type || "application/octet-stream",
        links,
        actorName: (formData.get("actorName") as string) || "Administrador",
      };

      const parsed = CreateDocumentInputSchema.safeParse(rawInput);
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => i.message).join(", ");
        return NextResponse.json({ error: `Dados inválidos: ${msg}` }, { status: 400 });
      }

      const created = await DocumentService.createDocument(parsed.data, fileBuffer);
      return NextResponse.json(created, { status: 201 });
    }

    // JSON com payload base64
    const body = await request.json();
    if (!body.fileBase64) {
      return NextResponse.json({ error: "Campo fileBase64 é obrigatório para upload JSON." }, { status: 400 });
    }

    const fileBuffer = Buffer.from(body.fileBase64, "base64");
    const parsed = CreateDocumentInputSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: `Dados inválidos: ${msg}` }, { status: 400 });
    }

    const created = await DocumentService.createDocument(parsed.data, fileBuffer);
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao criar documento.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
