import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { DocumentStorage } from "@/modules/documents/storage";
import crypto from "node:crypto";
import path from "node:path";

const IMAGE_MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

const MAX_INLINE_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB fallback quando bucket remoto não estiver ativo

function inferImageMime(storagePath: string): string {
  const ext = path.extname(storagePath).toLowerCase();
  return IMAGE_MIME_BY_EXT[ext] || "image/jpeg";
}

export async function GET(request: Request) {
  try {
    await requireAdminUser();
  } catch {
    return Response.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const storagePath = (searchParams.get("path") || "").trim();

    if (!storagePath || !storagePath.startsWith("documents/") || storagePath.includes("..")) {
      return NextResponse.json({ success: false, error: "Caminho de imagem inválido." }, { status: 400 });
    }

    const buffer = await DocumentStorage.downloadFile(storagePath);
    if (!buffer) {
      return NextResponse.json({ success: false, error: "Imagem não encontrada." }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": inferImageMime(storagePath),
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao servir imagem de post:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao carregar imagem." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
  } catch {
    return Response.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const docId = crypto.randomUUID();
    const mimeType = file.type && file.type.startsWith("image/") ? file.type : inferImageMime(file.name);

    const uploadResult = await DocumentStorage.uploadFile(
      buffer,
      docId,
      1,
      file.name,
      mimeType
    );

    // Sempre servir imagens do bucket privado "documents" pela rota autenticada deste endpoint
    let imageUrl = "";
    if (uploadResult.storageProvider === "SUPABASE_STORAGE") {
      imageUrl = `/api/content-studio/upload?path=${encodeURIComponent(uploadResult.storagePath)}`;
    } else if (buffer.length <= MAX_INLINE_IMAGE_BYTES) {
      imageUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
    } else {
      return NextResponse.json(
        { success: false, error: "Storage indisponível para arquivos acima de 4 MB." },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      storagePath: uploadResult.storagePath,
    });
  } catch (error: unknown) {
    console.error("Erro no upload de imagem de post:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro no upload." },
      { status: 500 }
    );
  }
}
