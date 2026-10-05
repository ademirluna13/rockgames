import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { AstroCookies } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from "astro:env/server";

export type AdminRole = "owner" | "editor";
export type AdminIdentity = { id: string; email: string; role: AdminRole };

export function createAdminClient(request: Request, cookies: AstroCookies): SupabaseClient {
  const url = PUBLIC_SUPABASE_URL?.trim();
  const key = PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) throw new Error("Falta la configuración de Supabase para el panel.");
  return createServerClient(url, key, {
    cookies: {
      getAll: () => parseCookieHeader(request.headers.get("cookie") ?? ""),
      setAll: (items) => {
        for (const { name, value, options } of items) {
          cookies.set(name, value, {
            ...options,
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: new URL(request.url).protocol === "https:",
          });
        }
      },
    },
  });
}

export async function resolveAdmin(client: SupabaseClient): Promise<AdminIdentity | null> {
  // getUser contacts Auth and validates the cookie-backed session. getSession
  // alone would trust user data stored in the cookie.
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return null;
  const { data, error } = await client.from("admin_users")
    .select("role,is_active").eq("user_id", auth.user.id).maybeSingle();
  if (error) throw new Error(`No se pudo verificar admin_users: ${error.message}`);
  if (!data?.is_active || (data.role !== "owner" && data.role !== "editor")) return null;
  return { id: auth.user.id, email: auth.user.email ?? "", role: data.role };
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
