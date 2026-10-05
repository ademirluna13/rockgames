import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import type { AdminIdentity } from "./auth";
import { getMediaUsage, listAdminMedia } from "./media";
import { getAdminGames, getPublicationReadiness } from "./game-list";

export class AdminInputError extends Error {
  constructor(public code: "invalid" | "conflict" | "file" | "access" | "save" | "variant_required" | "incomplete" | "partial_primary" | "partial_secondary") { super(code); }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const sectionKeys = new Set(["hero", "platforms", "featured", "best_sellers", "offers", "upcoming", "how_it_works", "trust", "testimonials", "final_cta"]);
const collectionSlugs = new Set(["featured", "best-sellers", "featured-offers", "recommended", "upcoming"]);
const availabilityValues = new Set(["upcoming", "preorder", "available", "unavailable"]);
const mediaRoles = new Set(["cover", "hero", "poster", "gallery", "video"]);

function raw(form: FormData, name: string): string { return String(form.get(name) ?? "").trim(); }
function required(form: FormData, name: string, max = 500): string {
  const value = raw(form, name);
  if (!value || value.length > max) throw new AdminInputError("invalid");
  return value;
}
function optional(form: FormData, name: string, max = 2000): string | null {
  const value = raw(form, name);
  if (value.length > max) throw new AdminInputError("invalid");
  return value || null;
}
function uuid(form: FormData, name: string): string {
  const value = raw(form, name);
  if (!uuidPattern.test(value)) throw new AdminInputError("invalid");
  return value;
}
function truth(form: FormData, name: string): boolean { return form.get(name) === "on" || form.get(name) === "true"; }
function date(form: FormData, name: string): string | null {
  const value = optional(form, name, 30);
  if (value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AdminInputError("invalid");
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new AdminInputError("invalid");
  }
  return value;
}
function datetime(form: FormData, name: string): string | null {
  const value = optional(form, name, 40);
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new AdminInputError("invalid");
  return new Date(parsed).toISOString();
}
function price(form: FormData, name: string, nullable = false): number | null {
  const value = raw(form, name);
  if (!value && nullable) return null;
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(value)) throw new AdminInputError("invalid");
  return Number(value);
}
function optionalUrl(form: FormData, name: string): string | null {
  const value = optional(form, name, 500);
  if (!value) return null;
  try { if (!["https:", "http:"].includes(new URL(value).protocol)) throw new Error(); }
  catch { throw new AdminInputError("invalid"); }
  return value;
}
function safeMediaPath(form: FormData, name: string): string | null {
  const value = optional(form, name, 300);
  if (!value) return null;
  const assetPath = value.startsWith("/assets/") && value.slice(8).split("/").every((part) => /^[a-zA-Z0-9._-]+$/.test(part) && part !== "." && part !== "..");
  const fileName = "[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}";
  const storagePath = new RegExp(`^(?:(?:cover|hero|poster|gallery|video|brand|misc)/${fileName}|games/${uuidPattern.source.slice(1, -1)}/${fileName}|sections/[a-z_]{2,40}/${fileName})$`, "i").test(value)
    && /\.(jpg|jpeg|png|webp|avif|mp4|svg)$/i.test(value);
  if (!assetPath && !storagePath) throw new AdminInputError("invalid");
  return value;
}
async function verifyStoragePath(client: SupabaseClient, path: string | null): Promise<void> {
  if (!path || path.startsWith("/assets/")) return;
  const segments = path.split("/");
  const parent = segments.slice(0, -1).join("/");
  const name = segments.at(-1)!;
  const { data, error } = await client.storage.from("public-media").list(parent, { search: name, limit: 100 });
  if (error || !data?.some((file) => file.name === name && file.id)) throw new AdminInputError("invalid");
}
async function saved<T>(query: PromiseLike<{ data: T; error: { code?: string; message: string } | null }>): Promise<T> {
  const { data, error } = await query;
  if (error) {
    console.error(`[ROCK GAMES admin] Mutation failed: ${error.code ?? "unknown"}`);
    throw new AdminInputError(error.code === "23505" ? "conflict" : "save");
  }
  return data;
}
function checkedIds(form: FormData, name: string): string[] {
  const ids = [...new Set(form.getAll(name).map(String))];
  if (ids.length > 30 || ids.some((id) => !uuidPattern.test(id))) throw new AdminInputError("invalid");
  return ids;
}
async function syncLinks(client: SupabaseClient, gameId: string, table: "game_genres" | "game_tags", field: "genre_id" | "tag_id", ids: string[]) {
  const { data: existing, error } = await client.from(table).select(field).eq("game_id", gameId);
  if (error) throw new AdminInputError("save");
  const existingIds = (existing ?? []).map((row: Record<string, string>) => row[field]);
  const removed = existingIds.filter((id: string) => !ids.includes(id));
  if (table === "game_genres" && existingIds.length) {
    await saved(client.from(table).update({ is_primary: false }).eq("game_id", gameId));
  }
  if (ids.length) {
    const rows = ids.map((id, index) => ({
      game_id: gameId, [field]: id,
      ...(table === "game_genres" ? { is_primary: index === 0, sort_order: index } : {}),
    }));
    await saved(client.from(table).upsert(rows, { onConflict: `game_id,${field}` }));
  }
  if (removed.length) await saved(client.from(table).delete().eq("game_id", gameId).in(field, removed));
}
async function requireActiveRefs(client: SupabaseClient, table: "genres" | "tags", ids: string[]) {
  if (!ids.length) return;
  const { data, error } = await client.from(table).select("id").in("id", ids).eq("is_active", true);
  if (error || data?.length !== ids.length) throw new AdminInputError("invalid");
}

export type MutationResult = { destination: string; result: "saved" | "created" | "deleted" | "uploaded" };

export async function mutate(client: SupabaseClient, admin: AdminIdentity, form: FormData): Promise<MutationResult> {
  const intent = raw(form, "intent");
  if (intent === "game_quick") {
    const id = uuid(form, "id");
    const variantId = raw(form, "variant_id");
    if (variantId && !uuidPattern.test(variantId)) throw new AdminInputError("invalid");
    const title = required(form, "title", 200);
    const shortDescription = optional(form, "short_description", 500) ?? "";
    const description = optional(form, "description", 10000) ?? "";
    const amount = variantId ? price(form, "price") : null;
    const availability = variantId ? required(form, "availability", 20) : "unavailable";
    if (variantId && (!availabilityValues.has(availability) || amount === null || amount <= 0)) throw new AdminInputError("invalid");
    const genres = checkedIds(form, "genre_ids");
    const tags = checkedIds(form, "tag_ids");
    const publish = raw(form, "is_published");
    if (publish && publish !== "true" && publish !== "false") throw new AdminInputError("invalid");
    const [{ data: game, error: gameError }, { data: variant, error: variantError }] = await Promise.all([
      client.from("games").select("id,is_published").eq("id", id).maybeSingle(),
      variantId ? client.from("game_variants").select("id,game_id,compare_at_price").eq("id", variantId).eq("game_id", id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);
    if (gameError || variantError || !game || (variantId && !variant)) throw new AdminInputError("invalid");
    if (variant?.compare_at_price !== null && variant?.compare_at_price !== undefined && amount !== null && Number(variant.compare_at_price) <= amount) throw new AdminInputError("invalid");
    await Promise.all([requireActiveRefs(client, "genres", genres), requireActiveRefs(client, "tags", tags)]);
    if (publish === "true" && !game.is_published) {
      const readiness = await getPublicationReadiness(client, id);
      const resolved = new Set<string>();
      if (title) resolved.add("Título");
      if (shortDescription) resolved.add("Descripción corta");
      if (description) resolved.add("Descripción completa");
      if (genres.length) resolved.add("Género");
      if (amount !== null && amount > 0) resolved.add("Precio");
      if (variantId && availability !== "unavailable") resolved.add("Variante activa");
      if (readiness.missing.some((name) => !resolved.has(name))) throw new AdminInputError("incomplete");
    }
    await saved(client.from("games").update({ title, short_description: shortDescription, description }).eq("id", id).select("id").single());
    if (variantId) await saved(client.from("game_variants").update({ price: amount, availability }).eq("id", variantId).eq("game_id", id).select("id").single());
    await syncLinks(client, id, "game_genres", "genre_id", genres);
    await syncLinks(client, id, "game_tags", "tag_id", tags);
    if (publish) {
      await saved(client.from("games").update({ is_published: publish === "true" }).eq("id", id).select("id").single());
    }
    return { destination: "/admin/games", result: "saved" };
  }
  if (intent === "game_bulk_publish") {
    const ids = checkedIds(form, "ids");
    if (!ids.length) throw new AdminInputError("invalid");
    const publish = truth(form, "is_published");
    if (publish) {
      const readinessById = new Map((await getAdminGames(client)).map((game) => [game.id, game.ready]));
      for (const id of ids) {
        if (!readinessById.get(id)) continue;
        await saved(client.from("games").update({ is_published: true }).eq("id", id).select("id").single());
      }
    } else {
      await saved(client.from("games").update({ is_published: false }).in("id", ids));
    }
    return { destination: "/admin/games", result: "saved" };
  }
  if (intent === "game_save") {
    const id = raw(form, "id");
    if (id && !uuidPattern.test(id)) throw new AdminInputError("invalid");
    const slug = required(form, "slug", 120);
    if (!slugPattern.test(slug)) throw new AdminInputError("invalid");
    const payload = {
      title: required(form, "title", 200), slug,
      short_description: optional(form, "short_description", 500) ?? "",
      description: optional(form, "description", 10000) ?? "",
      is_published: id ? (form.has("publish_state") ? truth(form, "publish_state") : truth(form, "is_published")) : false,
    };
    const genres = checkedIds(form, "genre_ids");
    const tags = checkedIds(form, "tag_ids");
    if (id && payload.is_published) {
      const { data: current, error: currentError } = await client.from("games").select("is_published").eq("id", id).maybeSingle();
      if (currentError || !current) throw new AdminInputError("save");
      if (!current?.is_published) {
        const readiness = await getPublicationReadiness(client, id);
        if (!readiness.ready) throw new AdminInputError("incomplete");
      }
    }
    await Promise.all([requireActiveRefs(client, "genres", genres), requireActiveRefs(client, "tags", tags)]);
    const game = id
      ? await saved(client.from("games").update(payload).eq("id", id).select("id").single())
      : await saved(client.from("games").insert(payload).select("id").single());
    if (!game?.id) throw new AdminInputError("save");
    await syncLinks(client, game.id, "game_genres", "genre_id", genres);
    await syncLinks(client, game.id, "game_tags", "tag_id", tags);
    return { destination: `/admin/games/${game.id}`, result: id ? "saved" : "created" };
  }
  if (intent === "game_publish") {
    const id = uuid(form, "id");
    const publish = truth(form, "is_published");
    if (publish) {
      const readiness = await getPublicationReadiness(client, id);
      if (!readiness.ready) throw new AdminInputError("incomplete");
    }
    await saved(client.from("games").update({ is_published: publish }).eq("id", id).select("id").single());
    return { destination: "/admin/games", result: "saved" };
  }
  if (intent === "game_delete") {
    await saved(client.from("games").delete().eq("id", uuid(form, "id")).select("id").single());
    return { destination: "/admin/games", result: "deleted" };
  }
  if (intent === "variant_group_save") {
    const gameId = uuid(form, "game_id");
    const platformId = uuid(form, "platform_id");
    const versionKey = required(form, "version_key", 80);
    if (!slugPattern.test(versionKey)) throw new AdminInputError("invalid");
    const { data: existing, error } = await client.from("game_variants")
      .select("id,account_type").eq("game_id", gameId).eq("platform_id", platformId).eq("version_key", versionKey);
    if (error || !existing?.length || existing.length > 2 || new Set(existing.map((item) => item.account_type)).size !== existing.length) throw new AdminInputError("invalid");
    const updates = (["secondary", "primary"] as const).flatMap((type) => {
      const id = raw(form, `${type}_id`);
      const variant = existing.find((item) => item.account_type === type);
      if (Boolean(id) !== Boolean(variant) || (variant && id !== variant.id)) throw new AdminInputError("conflict");
      if (!variant) return [];
      const amount = price(form, `${type}_price`);
      const compare = price(form, `${type}_compare_at_price`, true);
      const availability = required(form, `${type}_availability`, 20);
      if (compare !== null && amount !== null && compare <= amount) throw new AdminInputError("invalid");
      if (!availabilityValues.has(availability)) throw new AdminInputError("invalid");
      return [{ type, id, payload: { price: amount, compare_at_price: compare, availability, release_date: date(form, `${type}_release_date`), is_active: truth(form, `${type}_is_active`) } }];
    });
    // Validate both modalities before writing either. PostgREST updates are separate requests:
    // if the second fails, report exactly which modality may need a retry.
    for (const [index, update] of updates.entries()) {
      try {
        await saved(client.from("game_variants").update(update.payload).eq("id", update.id).eq("game_id", gameId).eq("platform_id", platformId).eq("version_key", versionKey).eq("account_type", update.type).select("id").single());
      } catch (cause) {
        if (index === 0) throw cause;
        throw new AdminInputError(update.type === "primary" ? "partial_primary" : "partial_secondary");
      }
    }
    return { destination: `/admin/games/${gameId}`, result: "saved" };
  }
  if (intent === "variant_save") {
    const gameId = uuid(form, "game_id");
    const id = raw(form, "id");
    if (id && !uuidPattern.test(id)) throw new AdminInputError("invalid");
    const submittedVersionKey = optional(form, "version_key", 80);
    const versionLabel = optional(form, "version_label", 100) ?? "Estándar";
    const versionKey = submittedVersionKey ?? (versionLabel.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "standard");
    if (!slugPattern.test(versionKey)) throw new AdminInputError("invalid");
    const availability = required(form, "availability", 20);
    if (!availabilityValues.has(availability)) throw new AdminInputError("invalid");
    const accountType = required(form, "account_type", 20);
    if (accountType !== "primary" && accountType !== "secondary") throw new AdminInputError("invalid");
    const amount = price(form, "price");
    const compare = price(form, "compare_at_price", true);
    if (compare !== null && amount !== null && compare <= amount) throw new AdminInputError("invalid");
    const stockRaw = raw(form, "stock_quantity");
    if (stockRaw && (!/^\d{1,8}$/.test(stockRaw))) throw new AdminInputError("invalid");
    const payload = {
      game_id: gameId, platform_id: uuid(form, "platform_id"),
      account_type: accountType,
      version_key: versionKey, version_label: versionLabel,
      price: amount, compare_at_price: compare, availability,
      release_date: date(form, "release_date"), new_until: datetime(form, "new_until"),
      stock_quantity: stockRaw ? Number(stockRaw) : null,
      is_active: truth(form, "is_active"),
    };
    const { data: activePlatform, error: platformError } = await client.from("platforms").select("id").eq("id", payload.platform_id).eq("is_active", true).maybeSingle();
    if (platformError || !activePlatform) throw new AdminInputError("invalid");
    if (id) await saved(client.from("game_variants").update(payload).eq("id", id).eq("game_id", gameId).select("id").single());
    else await saved(client.from("game_variants").insert(payload).select("id").single());
    return { destination: `/admin/games/${gameId}`, result: id ? "saved" : "created" };
  }
  if (intent === "variant_delete") {
    const gameId = uuid(form, "game_id");
    await saved(client.from("game_variants").delete().eq("id", uuid(form, "id")).eq("game_id", gameId).select("id").single());
    return { destination: `/admin/games/${gameId}`, result: "deleted" };
  }
  if (intent === "collection_save") {
    const slug = required(form, "slug", 80);
    if (!collectionSlugs.has(slug)) throw new AdminInputError("invalid");
    const start = datetime(form, "start_at");
    const end = datetime(form, "end_at");
    if (start && end && end <= start) throw new AdminInputError("invalid");
    await saved(client.from("collections").update({
      is_active: truth(form, "is_active"), start_at: start, end_at: end,
    }).eq("slug", slug).select("id").single());
    return { destination: `/admin/collections?collection=${slug}`, result: "saved" };
  }
  if (intent === "collection_reorder") {
    const collectionId = uuid(form, "collection_id");
    const ids = [...new Set(form.getAll("variant_ids").map(String))];
    if (!ids.length || ids.length > 100 || ids.some((id) => !uuidPattern.test(id))) throw new AdminInputError("invalid");
    const { data, error } = await client.from("collection_items").select("game_variant_id,position").eq("collection_id", collectionId).order("position");
    if (error || !data || data.length !== ids.length || data.some((item) => !ids.includes(item.game_variant_id))) throw new AdminInputError("invalid");
    const slugResult = await client.from("collections").select("slug").eq("id", collectionId).maybeSingle();
    const slug = slugResult.data?.slug;
    if (slugResult.error || !slug || !collectionSlugs.has(slug)) throw new AdminInputError("invalid");
    const currentOrder = data.map((item) => item.game_variant_id);
    for (const [targetIndex, variantId] of ids.entries()) {
      let currentIndex = currentOrder.indexOf(variantId);
      while (currentIndex > targetIndex) {
        const { error: moveError } = await client.rpc("admin_move_collection_item", { p_collection_id: collectionId, p_variant_id: currentOrder[currentIndex], p_direction: -1 });
        if (moveError) throw new AdminInputError("save");
        [currentOrder[currentIndex - 1], currentOrder[currentIndex]] = [currentOrder[currentIndex], currentOrder[currentIndex - 1]];
        currentIndex -= 1;
      }
    }
    return { destination: `/admin/collections?collection=${slug}`, result: "saved" };
  }
  if (["collection_add", "collection_remove", "collection_move"].includes(intent)) {
    const collectionId = uuid(form, "collection_id");
    const variantId = uuid(form, "variant_id");
    const { data: collection } = await client.from("collections").select("slug").eq("id", collectionId).maybeSingle();
    if (!collection || !collectionSlugs.has(collection.slug)) throw new AdminInputError("invalid");
    const destination = `/admin/collections?collection=${collection.slug}`;
    if (intent === "collection_add") {
      const { data: last, error } = await client.from("collection_items").select("position").eq("collection_id", collectionId).order("position", { ascending: false }).limit(1);
      if (error) throw new AdminInputError("save");
      await saved(client.from("collection_items").insert({ collection_id: collectionId, game_variant_id: variantId, position: (last?.[0]?.position ?? 0) + 1 }));
      return { destination, result: "created" };
    }
    if (intent === "collection_remove") {
      await saved(client.from("collection_items").delete().eq("collection_id", collectionId).eq("game_variant_id", variantId).select("game_variant_id").single());
      return { destination, result: "deleted" };
    }
    const direction = raw(form, "direction") === "up" ? -1 : raw(form, "direction") === "down" ? 1 : 0;
    if (!direction) throw new AdminInputError("invalid");
    await saved(client.rpc("admin_move_collection_item", { p_collection_id: collectionId, p_variant_id: variantId, p_direction: direction }));
    return { destination, result: "saved" };
  }
  if (intent === "testimonial_save") {
    const id = raw(form, "id");
    if (id && !uuidPattern.test(id)) throw new AdminInputError("invalid");
    const consented = truth(form, "consented");
    const published = truth(form, "published");
    if (published && !consented) throw new AdminInputError("invalid");
    const familyId = raw(form, "platform_family_id");
    if (familyId && !uuidPattern.test(familyId)) throw new AdminInputError("invalid");
    const ratingRaw = raw(form, "rating");
    if (ratingRaw && !/^[1-5]$/.test(ratingRaw)) throw new AdminInputError("invalid");
    const orderRaw = raw(form, "sort_order") || "0";
    if (!/^\d{1,5}$/.test(orderRaw)) throw new AdminInputError("invalid");
    const payload = {
      alias: required(form, "alias", 100), text: required(form, "text", 2000),
      platform_family_id: familyId || null, source: optional(form, "source", 200),
      date: date(form, "date"), rating: ratingRaw ? Number(ratingRaw) : null,
      consented_at: consented ? new Date().toISOString() : null,
      published, sort_order: Number(orderRaw),
    };
    if (id) await saved(client.from("testimonials").update(payload).eq("id", id).select("id").single());
    else await saved(client.from("testimonials").insert(payload).select("id").single());
    return { destination: "/admin/testimonials", result: id ? "saved" : "created" };
  }
  if (intent === "testimonial_delete") {
    await saved(client.from("testimonials").delete().eq("id", uuid(form, "id")).select("id").single());
    return { destination: "/admin/testimonials", result: "deleted" };
  }
  if (intent === "section_save") {
    if (admin.role !== "owner") throw new AdminInputError("access");
    const key = required(form, "key", 40);
    if (!sectionKeys.has(key)) throw new AdminInputError("invalid");
    const orderRaw = required(form, "sort_order", 5);
    if (!/^\d{1,5}$/.test(orderRaw)) throw new AdminInputError("invalid");
    const ctaUrl = optional(form, "cta_url", 500);
    if (ctaUrl && !/^\/(?!\/)[a-zA-Z0-9/?=&%#._-]*$/.test(ctaUrl) && !/^https:\/\/[^\s]+$/.test(ctaUrl)) throw new AdminInputError("invalid");
    const payload: Record<string, unknown> = { is_visible: truth(form, "is_visible"), sort_order: Number(orderRaw) };
    for (const [field, max] of [["eyebrow", 160], ["title", 200], ["highlighted_text", 200], ["description", 2000], ["media_alt", 300], ["cta_label", 120]] as const) {
      if (form.has(field)) payload[field] = optional(form, field, max);
    }
    if (form.has("media_path")) { payload.media_path = safeMediaPath(form, "media_path"); await verifyStoragePath(client, payload.media_path as string | null); }
    if (form.has("poster_path")) { payload.poster_path = safeMediaPath(form, "poster_path"); await verifyStoragePath(client, payload.poster_path as string | null); }
    if (form.has("cta_url")) payload.cta_url = ctaUrl;
    await saved(client.from("site_sections").update(payload).eq("key", key).select("id").single());
    return { destination: `/admin/home?section=${key}`, result: "saved" };
  }
  if (intent === "media_link") {
    const gameId = uuid(form, "game_id");
    const id = raw(form, "id");
    if (id && !uuidPattern.test(id)) throw new AdminInputError("invalid");
    const role = required(form, "role", 20);
    if (!mediaRoles.has(role)) throw new AdminInputError("invalid");
    const path = safeMediaPath(form, "storage_path");
    if (!path || path.startsWith("/")) throw new AdminInputError("invalid");
    const parent = path.split("/").slice(0, -1).join("/");
    const filename = path.split("/").at(-1)!;
    const { data: objects, error: storageError } = await client.storage.from("public-media").list(parent, { search: filename, limit: 100 });
    if (storageError || !objects?.some((object) => object.name === filename)) throw new AdminInputError("invalid");
    const variantId = raw(form, "game_variant_id");
    if (variantId && !uuidPattern.test(variantId)) throw new AdminInputError("invalid");
    const orderRaw = raw(form, "sort_order") || "0";
    if (!/^\d{1,5}$/.test(orderRaw)) throw new AdminInputError("invalid");
    const payload = { game_id: gameId, game_variant_id: variantId || null,
      bucket: "public-media", storage_path: path, role,
      alt_text: optional(form, "alt_text", 300), sort_order: Number(orderRaw) };
    if (id) await saved(client.from("game_media").update(payload).eq("id", id).eq("game_id", gameId).select("id").single());
    else await saved(client.from("game_media").insert(payload).select("id").single());
    return { destination: `/admin/games/${gameId}`, result: id ? "saved" : "created" };
  }
  if (intent === "media_unlink") {
    const gameId = uuid(form, "game_id");
    await saved(client.from("game_media").delete().eq("id", uuid(form, "id")).eq("game_id", gameId).select("id").single());
    return { destination: `/admin/games/${gameId}`, result: "deleted" };
  }
  if (intent === "media_reorder") {
    const gameId = uuid(form, "game_id");
    const ids = [...new Set(form.getAll("media_ids").map(String))];
    if (!ids.length || ids.length > 200 || ids.some((id) => !uuidPattern.test(id))) throw new AdminInputError("invalid");
    const { data, error } = await client.from("game_media").select("id").eq("game_id", gameId).eq("role", "gallery");
    if (error || !data || data.length !== ids.length || data.some((item) => !ids.includes(item.id))) throw new AdminInputError("invalid");
    for (const [position, id] of ids.entries()) {
      await saved(client.from("game_media").update({ sort_order: position }).eq("game_id", gameId).eq("id", id));
    }
    return { destination: `/admin/games/${gameId}`, result: "saved" };
  }
  if (intent === "media_upload") {
    const role = required(form, "role", 20);
    if (!mediaRoles.has(role)) throw new AdminInputError("invalid");
    const gameIdRaw = raw(form, "game_id");
    if (gameIdRaw && !uuidPattern.test(gameIdRaw)) throw new AdminInputError("invalid");
    const gameId = gameIdRaw || null;
    const sectionKey = raw(form, "section_key");
    const targetField = raw(form, "target_field");
    const settingsTarget = targetField === "logo_path";
    if (sectionKey && (!sectionKeys.has(sectionKey) || !["media_path", "poster_path"].includes(targetField))) throw new AdminInputError("invalid");
    if (sectionKey && admin.role !== "owner") throw new AdminInputError("access");
    if (sectionKey && targetField === "poster_path" && role !== "poster") throw new AdminInputError("invalid");
    if (sectionKey && targetField === "media_path" && role !== "hero" && !(sectionKey === "hero" && role === "video")) throw new AdminInputError("invalid");
    if (settingsTarget && admin.role !== "owner") throw new AdminInputError("access");
    if (settingsTarget && role !== "cover") throw new AdminInputError("invalid");
    if (gameId && (sectionKey || settingsTarget)) throw new AdminInputError("invalid");
    if (!gameId && !sectionKey && !settingsTarget && targetField) throw new AdminInputError("invalid");
    const maxImageBytes = Number(process.env.ADMIN_IMAGE_MAX_BYTES ?? 20 * 1024 * 1024);
    const maxVideoBytes = Number(process.env.ADMIN_VIDEO_MAX_BYTES ?? 20 * 1024 * 1024);
    const files = form.getAll("files").length ? form.getAll("files") : form.getAll("file");
    const uploads = files.filter((file): file is File => file instanceof File && file.size > 0);
    if (!uploads.length || (role !== "gallery" && uploads.length !== 1)) throw new AdminInputError("file");
    if (gameId) {
      const { data: game, error: gameError } = await client.from("games").select("id").eq("id", gameId).maybeSingle();
      if (gameError || !game) throw new AdminInputError("invalid");
    }
    const altText = optional(form, "alt_text", 300);
    let order = 0;
    if (gameId && role === "gallery") {
      const { data, error } = await client.from("game_media").select("sort_order").eq("game_id", gameId).eq("role", "gallery").order("sort_order", { ascending: false }).limit(1);
      if (error) throw new AdminInputError("save");
      order = (data?.[0]?.sort_order ?? -1) + 1;
    }
    for (const file of uploads) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const mimeByExt: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", mp4: "video/mp4" };
      if (!ext || mimeByExt[ext] !== file.type || (role === "video") !== (ext === "mp4")) throw new AdminInputError("file");
      const maxBytes = role === "video" ? maxVideoBytes : maxImageBytes;
      if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || file.size > maxBytes) throw new AdminInputError("file");
      const source = Buffer.from(await file.arrayBuffer());
      let output: Buffer = source;
      let outputType = file.type;
      let outputExt = "mp4";
      let dimensions: { width: number; height: number } | undefined;
      if (role !== "video") {
        try {
          const image = sharp(source, { failOn: "error", limitInputPixels: 40_000_000 });
          const metadata = await image.metadata();
          const extFormat = ext === "jpg" || ext === "jpeg" ? "jpeg" : ext === "avif" ? "heif" : ext;
          if (!metadata.width || !metadata.height || metadata.format !== extFormat || metadata.mediaType !== file.type || !["jpeg", "png", "webp", "heif"].includes(metadata.format ?? "")) throw new Error("unsupported image");
          output = await image.rotate().resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer();
        } catch { throw new AdminInputError("file"); }
        outputType = "image/webp";
        outputExt = "webp";
        if (output.byteLength > 20 * 1024 * 1024) throw new AdminInputError("file");
        const optimizedMetadata = await sharp(output).metadata();
        if (optimizedMetadata.width && optimizedMetadata.height) dimensions = { width: optimizedMetadata.width, height: optimizedMetadata.height };
      } else {
        const bytes = new Uint8Array(source.subarray(0, 16));
        const ascii = (start: number, length: number) => String.fromCharCode(...bytes.slice(start, start + length));
        if (ascii(4, 4) !== "ftyp" || !["isom", "iso2", "mp41", "mp42", "avc1", "M4V "].includes(ascii(8, 4))) throw new AdminInputError("file");
      }
      const path = gameId
        ? `games/${gameId}/${role}-${crypto.randomUUID()}.${outputExt}`
        : sectionKey
          ? `sections/${sectionKey}/${targetField}-${crypto.randomUUID()}.${outputExt}`
          : settingsTarget
            ? `brand/logo-${crypto.randomUUID()}.${outputExt}`
            : `misc/${role}-${crypto.randomUUID()}.${outputExt}`;
      const { error } = await client.storage.from("public-media").upload(path, output, { contentType: outputType, upsert: false, cacheControl: "3600", metadata: dimensions });
      if (error) { console.error(`[ROCK GAMES admin] Upload failed: ${error.message}`); throw new AdminInputError("file"); }
      if (gameId) {
        const mediaPayload = { game_id: gameId, bucket: "public-media", storage_path: path, role, alt_text: altText, sort_order: order++ };
        const { data: currentMedia, error: currentMediaError } = role === "gallery"
          ? { data: [], error: null }
          : await client.from("game_media").select("id").eq("game_id", gameId).eq("role", role).order("sort_order").limit(1);
        if (currentMediaError) {
          await client.storage.from("public-media").remove([path]);
          throw new AdminInputError("save");
        }
        const mediaWrite = currentMedia?.length
          ? client.from("game_media").update(mediaPayload).eq("id", currentMedia[0].id).select("id").single()
          : client.from("game_media").insert(mediaPayload).select("id").single();
        const { error: mediaError } = await mediaWrite;
        if (mediaError) {
          await client.storage.from("public-media").remove([path]);
          throw new AdminInputError(mediaError.code === "23505" ? "conflict" : "save");
        }
      } else if (sectionKey) {
        const { error: sectionError } = await client.from("site_sections").update({ [targetField]: path }).eq("key", sectionKey).select("id").single();
        if (sectionError) {
          await client.storage.from("public-media").remove([path]);
          throw new AdminInputError("save");
        }
      } else if (settingsTarget) {
        const { error: settingsError } = await client.from("site_settings").update({ logo_path: path }).eq("id", 1).select("id").single();
        if (settingsError) {
          await client.storage.from("public-media").remove([path]);
          throw new AdminInputError("save");
        }
      }
    }
    return { destination: gameId ? `/admin/games/${gameId}` : sectionKey ? `/admin/home?section=${sectionKey}` : settingsTarget ? "/admin/settings" : "/admin/media", result: "uploaded" };
  }
  if (intent === "media_delete") {
    const path = safeMediaPath(form, "storage_path");
    if (!path || path.startsWith("/")) throw new AdminInputError("invalid");
    const [linked, sections, settings] = await Promise.all([
      client.from("game_media").select("id", { count: "exact", head: true }).eq("storage_path", path),
      client.from("site_sections").select("id", { count: "exact", head: true }).or(`media_path.eq.${path},poster_path.eq.${path}`),
      client.from("site_settings").select("id", { count: "exact", head: true }).eq("logo_path", path),
    ]);
    if (linked.error || sections.error || settings.error) throw new AdminInputError("save");
    if ((linked.count ?? 0) + (sections.count ?? 0) + (settings.count ?? 0) > 0) throw new AdminInputError("conflict");
    const { error } = await client.storage.from("public-media").remove([path]);
    if (error) throw new AdminInputError("save");
    return { destination: "/admin/media", result: "deleted" };
  }
  if (intent === "media_delete_unused") {
    const files = await listAdminMedia(client);
    const used = await getMediaUsage(client);
    const unused = files.filter((file) => !used.has(file.path));
    for (let index = 0; index < unused.length; index += 100) {
      const { error } = await client.storage.from("public-media").remove(unused.slice(index, index + 100).map((file) => file.path));
      if (error) throw new AdminInputError("save");
    }
    return { destination: "/admin/media", result: "deleted" };
  }
  if (intent === "settings_save") {
    if (admin.role !== "owner") throw new AdminInputError("access");
    const country = required(form, "country", 2).toUpperCase();
    const currency = required(form, "currency", 3).toUpperCase();
    if (!/^[A-Z]{2}$/.test(country) || !/^[A-Z]{3}$/.test(currency)) throw new AdminInputError("invalid");
    const whatsapp = optional(form, "whatsapp_number", 20);
    if (whatsapp && !/^\d{8,15}$/.test(whatsapp)) throw new AdminInputError("invalid");
    const email = optional(form, "email", 254);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AdminInputError("invalid");
    const analyticsId = optional(form, "analytics_id", 100);
    if (analyticsId && !/^(G-[A-Z0-9]+|UA-\d+-\d+)$/.test(analyticsId)) throw new AdminInputError("invalid");
    const logoPath = safeMediaPath(form, "logo_path");
    await verifyStoragePath(client, logoPath);
    await saved(client.from("site_settings").update({
      brand_name: required(form, "brand_name", 120), country, currency,
      whatsapp_number: whatsapp, facebook_url: optionalUrl(form, "facebook_url"),
      youtube_url: optionalUrl(form, "youtube_url"), email,
      analytics_id: analyticsId,
      logo_path: logoPath,
    }).eq("id", 1).select("id").single());
    return { destination: "/admin/settings", result: "saved" };
  }
  throw new AdminInputError("invalid");
}
