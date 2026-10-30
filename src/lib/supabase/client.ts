import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ffbdrcfokhoyouiiajzq.supabase.co";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "sb_publishable_cZrTL7UjlqOC1GzQxz92Ow_yzoFE81E";

  return createBrowserClient(url, key);
}
