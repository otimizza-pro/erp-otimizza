import { createBrowserClient } from "@supabase/ssr";
import { getEnv } from "@/lib/env";

export function createClient() {
  const env = getEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createBrowserClient(url, key);
}
