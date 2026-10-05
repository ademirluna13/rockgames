import type { APIRoute } from "astro";
import { createAdminClient, sameOrigin } from "../../../lib/admin/auth";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (!sameOrigin(request)) return new Response("Origen inválido", { status: 403 });
  const client = createAdminClient(request, cookies);
  await client.auth.signOut({ scope: "local" });
  return redirect("/admin/login?ok=signedout", 303);
};
