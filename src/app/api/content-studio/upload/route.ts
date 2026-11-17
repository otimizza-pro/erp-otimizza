import { NextResponse } from "next/server";
import { DocumentStorage } from "@/modules/documents/storage";
import { getEnv } from "@/lib/env";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const docId = crypto.randomUUID();

    // Upload seguro usando Supabase Storage
    const uploadResult = await DocumentStorage.uploadFile(
      buffer,
      docId,
      1,
      file.name,
      file.type || "image/jpeg"
    );

    // Se estiver no Supabase Storage, podemos obter a URL pública
    const env = getEnv();
    let imageUrl = "";

    if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
      const { data } = supabase.storage.from("client-documents").getPublicUrl(uploadResult.storagePath);
      imageUrl = data.publicUrl;
    }

    // Se não tiver gerado URL pública ou bucket for privado, usar rota de download/stream
    if (!imageUrl || imageUrl.includes("undefined")) {
      imageUrl = `/api/documents/stream?path=${encodeURIComponent(uploadResult.storagePath)}`;
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
