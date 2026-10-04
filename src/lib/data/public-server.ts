import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from "astro:env/server";

// Server-only module. Do not import from React components or client entry points.
let client: SupabaseClient | undefined;

export function getPublicServerClient(): SupabaseClient {
  if (client) return client;

  const url = PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) {
    throw new Error("DATA_SOURCE=supabase requiere PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_PUBLISHABLE_KEY. No se usará JSON como fallback.");
  }
  if (!/^https:\/\//i.test(url)) {
    throw new Error("PUBLIC_SUPABASE_URL debe ser una URL HTTPS válida.");
  }

  client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
