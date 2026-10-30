import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ffbdrcfokhoyouiiajzq.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_cZrTL7UjlqOC1GzQxz92Ow_yzoFE81E";

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    });

    await supabase.auth.signOut();
    return NextResponse.json({ success: true, message: "Sessão encerrada com sucesso." });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao encerrar sessão.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
