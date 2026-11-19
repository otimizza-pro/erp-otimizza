import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Autenticação indisponível. Verifique a configuração do servidor." }, { status: 503 });
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isCronRoute =
    request.nextUrl.pathname === "/api/documents/cleanup" ||
    request.nextUrl.pathname === "/api/financial/recurrence/process" ||
    request.nextUrl.pathname === "/api/projects/recurrence/process";

  const isPublicKnowledgeRoute =
    request.nextUrl.pathname.startsWith("/estrategia-otimizza") ||
    request.nextUrl.pathname.startsWith("/api/knowledge/files/");

  const isPublicBriefingRoute =
    request.nextUrl.pathname.startsWith("/briefing/") ||
    request.nextUrl.pathname.startsWith("/api/briefing/");

  const isPublicRoute =
    request.nextUrl.pathname === "/login" ||
    isCronRoute ||
    isPublicKnowledgeRoute ||
    isPublicBriefingRoute;

  if (isPublicKnowledgeRoute || isPublicBriefingRoute) {
    supabaseResponse.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  if (!user && !isPublicRoute) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
