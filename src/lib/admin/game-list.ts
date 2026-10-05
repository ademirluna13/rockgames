import type { SupabaseClient } from "@supabase/supabase-js";

export const collectionNames: Record<string, string> = {
  featured: "En portada", "best-sellers": "Más vendidos",
  "featured-offers": "Ofertas", upcoming: "Próximamente",
};

export type AdminGameRow = {
  id: string; title: string; slug: string; short_description: string; description: string;
  is_published: boolean; updated_at: string; cover: string | null;
  variants: Array<{ id: string; price: number; availability: string; is_active: boolean; platform: string; accountType: "primary" | "secondary" | null }>;
  primary: { id: string; price: number; availability: string; is_active: boolean; platform: string; accountType: "primary" | "secondary" | null } | null;
  genreIds: string[]; tagIds: string[]; collections: string[];
  completeness: number; missing: string[]; ready: boolean;
};

export async function getAdminGames(client: SupabaseClient): Promise<AdminGameRow[]> {
  const [gamesRes, mediaRes, genresRes, tagsRes, collectionsRes, itemsRes] = await Promise.all([
    client.from("games").select("id,title,slug,short_description,description,is_published,updated_at,game_variants(id,price,availability,is_active,account_type,platforms(name))").order("updated_at", { ascending: false }),
    client.from("game_media").select("game_id,storage_path,bucket,role,sort_order").eq("role", "cover").order("sort_order"),
    client.from("game_genres").select("game_id,genre_id"),
    client.from("game_tags").select("game_id,tag_id"),
    client.from("collections").select("id,slug"),
    client.from("collection_items").select("collection_id,game_variant_id"),
  ]);
  if ([gamesRes, mediaRes, genresRes, tagsRes, collectionsRes, itemsRes].some((result) => result.error)) throw new Error("No se pudo cargar el catálogo del Admin.");
  const mediaByGame = new Map<string, string>();
  for (const media of mediaRes.data ?? []) {
    if (!mediaByGame.has(media.game_id)) mediaByGame.set(media.game_id, media.storage_path.startsWith("/assets/") ? media.storage_path : client.storage.from(media.bucket).getPublicUrl(media.storage_path).data.publicUrl);
  }
  const collectionById = new Map((collectionsRes.data ?? []).map((item) => [item.id, item.slug]));
  return (gamesRes.data ?? []).map((game) => {
    const variants = (game.game_variants ?? []).map((variant) => ({
      id: variant.id, price: Number(variant.price), availability: variant.availability,
      is_active: variant.is_active, platform: Array.isArray(variant.platforms) ? (variant.platforms[0]?.name ?? "") : ((variant.platforms as { name?: string } | null)?.name ?? ""), accountType: variant.account_type as "primary" | "secondary" | null,
    }));
    const active = variants.filter((variant) => variant.is_active).sort((a, b) => Number(b.availability === "available") - Number(a.availability === "available") || a.price - b.price);
    const primary = active[0] ?? null;
    const genreIds = (genresRes.data ?? []).filter((item) => item.game_id === game.id).map((item) => item.genre_id);
    const tagIds = (tagsRes.data ?? []).filter((item) => item.game_id === game.id).map((item) => item.tag_id);
    const variantIds = new Set(variants.map((variant) => variant.id));
    const collections = [...new Set((itemsRes.data ?? []).filter((item) => variantIds.has(item.game_variant_id)).map((item) => collectionById.get(item.collection_id)).filter((slug): slug is string => Boolean(slug)))];
    const cover = mediaByGame.get(game.id) ?? null;
    const checks: Array<[string, boolean]> = [
      ["Título", Boolean(game.title?.trim())],
      ["Variante activa", active.some((variant) => variant.availability !== "unavailable" && Boolean(variant.accountType))],
      ["Precio", active.some((variant) => Number.isFinite(variant.price) && variant.price > 0 && variant.availability !== "unavailable" && Boolean(variant.accountType))],
      ["Plataforma", active.some((variant) => Boolean(variant.platform) && variant.availability !== "unavailable" && Boolean(variant.accountType))],
      ["Portada", Boolean(cover)],
      ["Descripción corta", Boolean(game.short_description?.trim())],
      ["Descripción completa", Boolean(game.description?.trim())],
      ["Género", genreIds.length > 0],
    ];
    const missing = checks.filter(([, present]) => !present).map(([label]) => label);
    return { id: game.id, title: game.title, slug: game.slug, short_description: game.short_description ?? "", description: game.description ?? "", is_published: game.is_published,
      updated_at: game.updated_at, cover, variants, primary, genreIds, tagIds, collections,
      completeness: checks.length - missing.length, missing, ready: missing.length === 0 };
  });
}

export async function getPublicationReadiness(client: SupabaseClient, id: string): Promise<{ ready: boolean; missing: string[] }> {
  const game = (await getAdminGames(client)).find((item) => item.id === id);
  if (!game) throw new Error("Juego no encontrado");
  return { ready: game.ready, missing: game.missing };
}
