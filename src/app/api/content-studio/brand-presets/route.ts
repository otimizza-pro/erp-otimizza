import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId é obrigatório." }, { status: 400 });
  }

  try {
    const res = await query(
      `SELECT * FROM client_brand_voice_presets WHERE client_id = $1`,
      [clientId]
    );

    const preset = res.rows[0] || null;
    return NextResponse.json({ preset });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao carregar DNA de marca.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clientId, brandContext, defaultTones, defaultCtas, customGuidelines, forbiddenWords } = body;

    if (!clientId) {
      return NextResponse.json({ error: "clientId é obrigatório." }, { status: 400 });
    }

    const res = await query(
      `INSERT INTO client_brand_voice_presets (
        client_id, brand_context, default_tones, default_ctas, custom_guidelines, forbidden_words
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (client_id) DO UPDATE SET
        brand_context = EXCLUDED.brand_context,
        default_tones = EXCLUDED.default_tones,
        default_ctas = EXCLUDED.default_ctas,
        custom_guidelines = EXCLUDED.custom_guidelines,
        forbidden_words = EXCLUDED.forbidden_words,
        updated_at = now()
      RETURNING *`,
      [
        clientId,
        brandContext?.trim() || null,
        defaultTones || ["Direto e didático"],
        defaultCtas || ["Iniciar uma conversa qualificada no WhatsApp"],
        customGuidelines?.trim() || null,
        forbiddenWords || []
      ]
    );

    return NextResponse.json({ preset: res.rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao salvar DNA de marca.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
