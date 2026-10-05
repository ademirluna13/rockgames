import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminMediaObject = {
  path: string;
  fileName: string;
  folder: string;
  contentType: string;
  size: number | null;
  createdAt: string | null;
  width: number | null;
  height: number | null;
  publicUrl: string;
};

export async function listAdminMedia(client: SupabaseClient): Promise<AdminMediaObject[]> {
  const bucket = client.storage.from("public-media");
  const found: AdminMediaObject[] = [];
  const walk = async (folder: string, depth: number): Promise<void> => {
    if (depth > 5) return;
    const { data, error } = await bucket.list(folder, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw new Error("No se pudo consultar la biblioteca de medios.");
    const subfolders: Promise<void>[] = [];
    for (const entry of data ?? []) {
      const path = folder ? `${folder}/${entry.name}` : entry.name;
      if (!entry.id) {
        if (/^[A-Za-z0-9_-]{1,80}$/.test(entry.name)) subfolders.push(walk(path, depth + 1));
        continue;
      }
      const metadata = entry.metadata as Record<string, unknown> | null;
      found.push({
        path, fileName: entry.name, folder,
        contentType: typeof metadata?.mimetype === "string" ? metadata.mimetype : "application/octet-stream",
        size: typeof metadata?.size === "number" ? metadata.size : null,
        createdAt: entry.created_at ?? null,
        width: typeof metadata?.width === "number" ? metadata.width : null,
        height: typeof metadata?.height === "number" ? metadata.height : null,
        publicUrl: bucket.getPublicUrl(path).data.publicUrl,
      });
    }
    await Promise.all(subfolders);
    if (data?.length === 1000) throw new Error("La biblioteca contiene demasiados archivos en una carpeta para mostrarlos de una vez.");
  };
  await walk("", 0);
  return found.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function getMediaUsage(client: SupabaseClient): Promise<Map<string, string[]>> {
  const [media, sections, settings] = await Promise.all([
    client.from("game_media").select("storage_path,role,games(title)"),
    client.from("site_sections").select("key,title,media_path,poster_path"),
    client.from("site_settings").select("logo_path").eq("id", 1).maybeSingle(),
  ]);
  if (media.error || sections.error || settings.error) throw new Error("No se pudo revisar dónde se usan los archivos.");
  const usage = new Map<string, string[]>();
  const add = (path: string | null, label: string) => {
    if (!path) return;
    usage.set(path, [...(usage.get(path) ?? []), label]);
  };
  for (const row of media.data ?? []) {
    const game = row.games as unknown as { title: string } | null;
    const role = ({ cover: "portada", gallery: "galería", hero: "imagen principal", poster: "imagen de respaldo", video: "video" } as Record<string, string>)[row.role] ?? "archivo";
    add(row.storage_path, `${role} · ${game?.title ?? "juego"}`);
  }
  for (const row of sections.data ?? []) {
    const name = row.title || row.key;
    add(row.media_path, `${name} · imagen/video`);
    add(row.poster_path, `${name} · imagen de respaldo`);
  }
  add(settings.data?.logo_path ?? null, "logo de ROCK GAMES");
  return usage;
}

export function humanMediaName(media: AdminMediaObject, uses: string[] = []): string {
  const parts = media.path.split("/");
  const roleNames: Record<string, string> = { cover: "Portada", gallery: "Galería", hero: "Imagen principal", poster: "Imagen de respaldo", video: "Video", logo: "Logo" };
  const homeNames: Record<string, string> = { hero: "Portada principal", platforms: "Plataformas", featured: "En portada", best_sellers: "Más vendidos", offers: "Ofertas", upcoming: "Próximamente", how_it_works: "Cómo funciona", trust: "Confianza", testimonials: "Testimonios", final_cta: "Cierre" };
  const storedRole = parts.at(-1)?.split("-")[0] ?? "";
  const fallback = parts[0] === "sections" ? `Home · ${homeNames[parts[1]] ?? "sección"}`
    : parts[0] === "games" ? roleNames[storedRole] ?? "Juego"
      : parts[0] === "brand" ? "Logo de marca"
        : roleNames[storedRole] ?? "Archivo de biblioteca";
  const title = uses[0] ?? fallback;
  const format = media.contentType.startsWith("video/") ? "Video" : "Imagen";
  return `${title} · ${format} · ${media.createdAt ? new Date(media.createdAt).toLocaleDateString("es-MX") : "archivo"}`;
}
