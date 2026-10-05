import type { APIRoute } from "astro";
import { sameOrigin } from "../../../lib/admin/auth";
import { AdminInputError, mutate } from "../../../lib/admin/mutations";

function safeReturn(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value.startsWith("/admin") || value.startsWith("//")) return "/admin";
  try {
    const parsed = new URL(value, "https://admin.invalid");
    if (parsed.origin !== "https://admin.invalid" || !/^\/admin(?:\/(?:games(?:\/[0-9a-f-]+|\/new)?|collections|testimonials|home|media|settings))?$/.test(parsed.pathname)) return "/admin";
    return parsed.pathname + parsed.search;
  } catch { return "/admin"; }
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!sameOrigin(request)) return new Response("Origen inválido", { status: 403 });
  if (!locals.admin || !locals.adminClient) return new Response("Acceso denegado", { status: 403 });
  const form = await request.formData();
  const back = safeReturn(form.get("return_to"));
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;
  try {
    const result = await mutate(locals.adminClient, locals.admin, form);
    if (wantsJson) return Response.json({ ok: true, result: result.result });
    const url = new URL(result.destination, request.url);
    url.searchParams.set("ok", result.result);
    return redirect(url.pathname + url.search, 303);
  } catch (error) {
    const code = error instanceof AdminInputError ? error.code : "save";
    if (!(error instanceof AdminInputError)) console.error("[ROCK GAMES admin] Unexpected mutation failure");
    if (wantsJson) return Response.json({ ok: false, code }, { status: code === "access" ? 403 : 400 });
    const url = new URL(back, request.url);
    url.searchParams.set("error", code);
    return redirect(url.pathname + url.search, 303);
  }
};
