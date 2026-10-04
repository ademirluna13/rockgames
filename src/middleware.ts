import { defineMiddleware } from "astro:middleware";

const staticAsset = (pathname: string) => pathname.startsWith("/_astro/") || pathname.startsWith("/assets/") || pathname === "/favicon.ico";

export const onRequest = defineMiddleware(async (context, next) => {
  try {
    const response = await next();
    if (!staticAsset(context.url.pathname)) {
      response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    }
    return response;
  } catch {
    // Keep the server log useful without printing provider errors, request headers, or credentials.
    console.error(`[ROCK GAMES] SSR data request failed for ${context.url.pathname}`);
    return new Response(`<!doctype html>
<html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0b0e0b"><title>Servicio temporalmente no disponible — ROCK GAMES</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0e0b;color:#f4f5ef;font:16px/1.6 system-ui,sans-serif}.panel{width:min(92vw,600px);padding:clamp(28px,6vw,56px);border:1px solid #293329;border-radius:24px;background:linear-gradient(145deg,#111711,#0d100d)}.mark{color:#b2f34a;font-size:13px;font-weight:800;letter-spacing:.16em}h1{margin:20px 0 12px;font-size:clamp(32px,7vw,54px);line-height:1.03;letter-spacing:-.05em}p{color:#bdc5b9}.retry{display:inline-flex;margin-top:16px;padding:12px 18px;border-radius:999px;background:#b2f34a;color:#10140d;font-weight:700;text-decoration:none}
</style></head><body><main class="panel"><span class="mark">ROCK GAMES</span><h1>Volvemos en un momento.</h1><p>No pudimos consultar el catálogo ahora. Inténtalo de nuevo en unos minutos.</p><a class="retry" href="">Reintentar</a></main></body></html>`, {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        "Retry-After": "60",
      },
    });
  }
});
