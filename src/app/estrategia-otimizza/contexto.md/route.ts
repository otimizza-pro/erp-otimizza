import { NextResponse } from "next/server";
import { getConsolidatedMarkdown } from "@/modules/knowledge/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const markdown = await getConsolidatedMarkdown();

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao gerar contexto Markdown.";
    return new NextResponse(`Erro ao gerar documentação: ${message}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}
