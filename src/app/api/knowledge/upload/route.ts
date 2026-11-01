import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { query } from "@/lib/db/pool";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml"
];

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const pageId = formData.get("pageId") as string | null;
    const altText = (formData.get("altText") as string) || null;
    const caption = (formData.get("caption") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    if (!pageId) {
      return NextResponse.json({ error: "ID da página associada é obrigatório." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: `Formato de arquivo não suportado (${file.type}). Permitidos: JPEG, PNG, WebP, GIF, SVG.`
      }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: "Arquivo muito grande. Limite máximo permitido: 5 MB."
      }, { status: 400 });
    }

    // Checa se a página existe e se já está publicada
    const pageRes = await query<{ id: string; status: string }>(
      `SELECT id, status FROM knowledge_pages WHERE id = $1`,
      [pageId]
    );

    if (pageRes.rows.length === 0) {
      return NextResponse.json({ error: "Página informada não existe." }, { status: 400 });
    }

    const isPublished = pageRes.rows[0].status === "PUBLISHED";

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const insertRes = await query<{ id: string }>(
      `INSERT INTO knowledge_page_files (
        page_id, file_name, mime_type, file_size_bytes,
        payload_base64, alt_text, caption, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id;`,
      [
        pageId,
        file.name,
        file.type,
        file.size,
        base64,
        altText,
        caption,
        isPublished
      ]
    );

    const fileId = insertRes.rows[0].id;
    const fileUrl = `/api/knowledge/files/${fileId}`;

    return NextResponse.json({
      id: fileId,
      url: fileUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      altText,
      caption
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro no upload do arquivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
