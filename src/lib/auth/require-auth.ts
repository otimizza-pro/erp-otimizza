import { createClient } from "@/lib/supabase/server";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Valida a sessão do usuário administrativo em Route Handlers e Server Actions.
 * Retorna os dados do usuário autenticado ou lança um erro caso não autenticado.
 */
export async function requireAdminUser(): Promise<AuthenticatedUser> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !user.email) {
    throw new Error("UNAUTHORIZED: Usuário não autenticado.");
  }

  return {
    id: user.id,
    email: user.email,
  };
}
