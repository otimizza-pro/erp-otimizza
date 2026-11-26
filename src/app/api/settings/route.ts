import { z } from "zod";
import { NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";

const AGENCY_KEY = "agency_profile";
const TAGS_KEY = "agency_tags";

const putSchema = z.object({
  agency: z
    .object({
      name: z.string().trim().min(1).max(160),
      email: z.string().trim().max(160),
      slogan: z.string().trim().max(240),
      currency: z.string().trim().min(1).max(16),
    })
    .optional(),
  tags: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(100),
        name: z.string().trim().min(1).max(80),
        color: z.string().trim().min(1).max(32),
      })
    )
    .optional(),
});

const defaultAgency = {
  name: "Otimizza",
  email: "contato@otimizza.com.br",
  slogan: "Marketing, Data & Growth",
  currency: "BRL",
};

const defaultTags = [
  { id: "t1", name: "Prioridade Alta", color: "#dc2626" },
  { id: "t2", name: "Cliente Recorrente", color: "#059669" },
  { id: "t3", name: "Performance & Dados", color: "#2563eb" },
];

export async function GET() {
  try { await requireAdminUser(); } catch { return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 }); }

  try {
    const res = await query<{ key: string; value: unknown }>(
      `SELECT key, value FROM public.erp_settings WHERE key = ANY($1::text[])`,
      [[AGENCY_KEY, TAGS_KEY]]
    );
    const map = new Map(res.rows.map((r) => [r.key, r.value]));
    return NextResponse.json({
      agency: map.get(AGENCY_KEY) ?? defaultAgency,
      tags: Array.isArray(map.get(TAGS_KEY)) ? map.get(TAGS_KEY) : defaultTags,
    });
  } catch (err) {
    console.error("Erro ao carregar configurações:", err);
    return NextResponse.json({ error: "Não foi possível carregar as configurações." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try { await requireAdminUser(); } catch { return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 }); }

  const body = putSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Configurações inválidas." }, { status: 400 });
  }

  try {
    if (body.data.agency) {
      await query(
        `INSERT INTO public.erp_settings (key, value, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [AGENCY_KEY, JSON.stringify(body.data.agency)]
      );
    }
    if (body.data.tags) {
      await query(
        `INSERT INTO public.erp_settings (key, value, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [TAGS_KEY, JSON.stringify(body.data.tags)]
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erro ao salvar configurações:", err);
    return NextResponse.json({ error: "Não foi possível salvar as configurações." }, { status: 500 });
  }
}
