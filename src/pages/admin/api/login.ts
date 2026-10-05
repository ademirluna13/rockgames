import type { APIRoute } from "astro";
import { createAdminClient, resolveAdmin, sameOrigin } from "../../../lib/admin/auth";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (!sameOrigin(request)) return redirect("/admin/login?error=csrf", 303);
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password || email.length > 254) return redirect("/admin/login?error=login", 303);
  try {
    const client = createAdminClient(request, cookies);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) return redirect("/admin/login?error=login", 303);
    const admin = await resolveAdmin(client);
    if (!admin) {
      await client.auth.signOut();
      return redirect("/admin/login?error=access", 303);
    }
    return redirect("/admin", 303);
  } catch {
    return redirect("/admin/login?error=login", 303);
  }
};
