import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const fileRes = await query<{
      id: string;
      file_name: string;
      mime_type: string;
      payload_base64: string;
      is_published: boolean;
      page_status: string;
    }>(
      `SELECT f.*, p.status as page_status
       FROM knowledge_page_files f
       JOIN knowledge_pages p ON p.id = f.page_id
       WHERE f.id = $1`,
      [id]
    );

    if (fileRes.rows.length === 0) {
      return new NextResponse("Arquivo não encontrado.", { status: 404 });
    }

    const file = fileRes.rows[0];
    const isPublic = file.is_published && file.page_status === "PUBLISHED";

    if (!isPublic) {
      // Se não for público, valida autenticação do usuário
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return new NextResponse("Acesso não autorizado ao anexo em rascunho.", { status: 401 });
      }
    }

    const buffer = Buffer.from(file.payload_base64, "base64");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": file.mime_type,
        "Content-Length": buffer.length.toString(),
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.file_name)}"`,
        "Cache-Control": isPublic ? "public, max-age=3600, stale-while-revalidate=86400" : "private, no-cache",
        "X-Robots-Tag": "noindex, nofollow, noarchive"
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao carregar anexo.";
    return new NextResponse(message, { status: 500 });
  }
}
