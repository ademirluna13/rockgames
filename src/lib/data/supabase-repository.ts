import type { SupabaseClient } from "@supabase/supabase-js";
import { platformTheme } from "../platforms";
import type {
  AvailabilityStatus,
  Collection,
  CollectionItem,
  Game,
  GameVariant,
  Genre,
  Platform,
  PlatformFamily,
  RecommendationMood,
  SiteSection,
  SiteSectionKey,
  SiteSettings,
  Tag,
  Testimonial,
} from "./contracts";
import type { RockGamesRepository } from "./repository";
import { getPublicServerClient } from "./public-server";
import type {
  BestsellerItem,
  CatalogCard,
  CatalogPageData,
  CatalogVariant,
  FeaturedCard,
  HomePageData,
  HomePortal,
  HowPageData,
  RecommendationMoodView,
  TestimonialViewModel,
  UpcomingItem,
} from "./view-models";
import { withCatalogVariant } from "./view-models";

type GenreRow = { id: string; slug: string; name: string; sort_order: number; is_active: boolean };
type TagRow = { id: string; slug: string; name: string; is_active: boolean };
type PlatformFamilyRow = { id: string; slug: string; name: string; sort_order: number; is_active: boolean };
type PlatformRow = { id: string; family_id: string; slug: string; name: string; sort_order: number; is_active: boolean };

type JoinedVariant = {
  id: string;
  game_id: string;
  platform_id: string;
  version_key: string;
  version_label: string | null;
  account_type: "primary" | "secondary";
  price: number | string;
  compare_at_price: number | string | null;
  availability: AvailabilityStatus;
  release_date: string | null;
  new_until: string | null;
  stock_quantity: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  platforms: (PlatformRow & { platform_families: PlatformFamilyRow | null }) | null;
};

type GameRow = {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  game_genres: { genre_id: string; is_primary: boolean; sort_order: number; genres: GenreRow | null }[];
  game_tags: { tag_id: string; tags: TagRow | null }[];
  game_variants: JoinedVariant[];
  game_media: { bucket: string; storage_path: string; role: string; alt_text: string | null; sort_order: number }[];
};

type CollectionRow = {
  id: string; slug: string; name: string; type: Collection["type"];
  is_active: boolean; start_at: string | null; end_at: string | null; sort_order: number;
};
type CollectionItemRow = { collection_id: string; game_variant_id: string; position: number };
type MoodRow = {
  id: string; slug: string; label: string; platform_family_id: string | null;
  max_price: number | string | null; sort_mode: RecommendationMood["sortMode"];
  max_results: number; is_active: boolean; sort_order: number;
  recommendation_mood_tags: { tag_id: string }[];
  recommendation_mood_genres: { genre_id: string }[];
};

const gameSelect = `
  id,slug,title,short_description,description,is_published,created_at,updated_at,
  game_genres(genre_id,is_primary,sort_order,genres(id,slug,name,sort_order,is_active)),
  game_tags(tag_id,tags(id,slug,name,is_active)),
  game_variants(
    id,game_id,platform_id,version_key,version_label,account_type,price,compare_at_price,availability,
    release_date,new_until,stock_quantity,is_active,created_at,updated_at,
    platforms(id,family_id,slug,name,sort_order,is_active,platform_families(id,slug,name,sort_order,is_active))
  ),
  game_media(bucket,storage_path,role,alt_text,sort_order)
`;

const platformSlug = (slug: string): PlatformFamily["slug"] => slug as PlatformFamily["slug"];
const numeric = (value: number | string | null): number | null => value === null ? null : Number(value);
const fromSiteSettings = (row: Record<string, unknown>): SiteSettings => ({
  brandName: String(row.brand_name ?? "ROCK GAMES"),
  country: String(row.country ?? "MX").trim(),
  currency: String(row.currency ?? "MXN").trim(),
  logoPath: String(row.logo_path ?? "") || "/assets/rock-games-logo.png",
  whatsappNumber: String(row.whatsapp_number ?? ""),
  socialLinks: {
    facebook: String(row.facebook_url ?? ""),
    youtube: String(row.youtube_url ?? ""),
  },
  email: String(row.email ?? ""),
  analyticsId: String(row.analytics_id ?? ""),
});

/** Supabase-backed implementation of the same repository contract as the JSON provider. */
export class SupabaseRepository implements RockGamesRepository {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient = getPublicServerClient()) {
    this.client = client;
  }

  private async rows<T>(label: string, query: PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>): Promise<T> {
    const { data, error } = await query;
    if (error) throw new Error(`Supabase ${label} falló (${error.code ?? "sin código"}): ${error.message}`);
    if (data === null) throw new Error(`Supabase ${label} no devolvió datos.`);
    return data as T;
  }

  private mediaUrl(bucket: string, path: string): string {
    if (path.startsWith("/") || /^https?:\/\//i.test(path)) return path;
    return this.client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  private toGame(row: GameRow): Game {
    return {
      id: row.id, slug: row.slug, title: row.title,
      shortDescription: row.short_description, description: row.description,
      isPublished: row.is_published, createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }

  private toVariant(row: JoinedVariant): GameVariant {
    return {
      id: row.id,
      gameId: row.game_id,
      platformId: row.platform_id,
      versionLabel: row.version_label,
      accountType: row.account_type,
      price: Number(row.price),
      compareAtPrice: numeric(row.compare_at_price),
      availability: row.availability,
      releaseDate: row.release_date,
      newUntil: row.new_until,
      stockQuantity: row.stock_quantity,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private variantView(row: JoinedVariant, fallbackTag = "Disponible"): CatalogVariant | null {
    if (!row.platforms?.platform_families) return null;
    const family = row.platforms.platform_families;
    return {
      id: row.id,
      selectionId: row.id,
      platformId: row.platform_id,
      platform: row.platforms.name,
      platformFamilySlug: platformSlug(family.slug),
      versionLabel: row.version_label,
      accountType: row.account_type,
      price: Number(row.price),
      oldPrice: numeric(row.compare_at_price),
      tag: row.compare_at_price !== null && Number(row.compare_at_price) > Number(row.price)
        ? "Oferta"
        : row.new_until && new Date(row.new_until) > new Date() ? "Nuevo" : fallbackTag,
      availability: row.availability,
      available: row.is_active && row.availability === "available" && row.platforms.is_active && family.is_active,
      releaseDate: row.release_date,
      newUntil: row.new_until,
    };
  }

  private toCard(row: GameRow, selectedVariant: JoinedVariant, featured = false, badge?: string): CatalogCard {
    const genreLinks = [...(row.game_genres ?? [])]
      .filter((link) => link.genres?.is_active)
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
    const primaryGenre = genreLinks[0]?.genres;
    const tagLinks = (row.game_tags ?? []).filter((link) => link.tags?.is_active);
    const variantViews = (row.game_variants ?? [])
      .filter((variant) => variant.is_active)
      .sort((a, b) => (a.platforms?.sort_order ?? 999) - (b.platforms?.sort_order ?? 999) || a.version_key.localeCompare(b.version_key) || Number(a.price) - Number(b.price))
      .flatMap((variant) => {
        const view = this.variantView(variant, tagLinks[0]?.tags?.name ?? "Disponible");
        return view ? [view] : [];
      });
    const current = this.variantView(selectedVariant, tagLinks[0]?.tags?.name ?? "Disponible");
    if (!current) throw new Error(`La variante ${selectedVariant.id} no tiene una plataforma/familia pública activa.`);
    const cover = [...(row.game_media ?? [])]
      .filter((media) => media.role === "cover" || media.role === "poster")
      .sort((a, b) => a.sort_order - b.sort_order)[0];
    const tag = badge ?? current.tag;
    const card: CatalogCard = {
      id: row.id,
      gameId: row.id,
      slug: row.slug,
      title: row.title,
      selectionId: current.selectionId,
      variantId: current.id,
      accountType: current.accountType,
      platform: current.platform,
      platformFamilySlug: current.platformFamilySlug,
      variants: variantViews,
      genre: primaryGenre?.name ?? "Sin género",
      genres: genreLinks.flatMap((link) => link.genres ? [link.genres.name] : []),
      genreIds: genreLinks.flatMap((link) => link.genres ? [link.genres.id] : []),
      tagIds: tagLinks.flatMap((link) => link.tags ? [link.tags.id] : []),
      tags: tagLinks.flatMap((link) => link.tags ? [link.tags.name] : []),
      description: row.short_description || row.description,
      cover: cover ? this.mediaUrl(cover.bucket, cover.storage_path) : "/assets/rock-games-logo.png",
      featured,
      price: current.price,
      oldPrice: current.oldPrice,
      tag,
      art: row.slug,
      symbol: row.title.split(/\s+/).map((word) => word[0] ?? "").join("").slice(0, 2).toUpperCase(),
      available: current.available,
    };
    return card;
  }

  private async getJoinedGames(): Promise<GameRow[]> {
    return this.rows<GameRow[]>("games", this.client.from("games").select(gameSelect).eq("is_published", true).order("title"));
  }

  private async getCatalogCards(): Promise<{ rows: GameRow[]; cards: CatalogCard[] }> {
    const rows = await this.getJoinedGames();
    const cards = rows.flatMap((row) => {
      const variants = (row.game_variants ?? [])
        .filter((variant) => variant.is_active)
        .sort((a, b) => Number(b.availability === "available") - Number(a.availability === "available") || Number(a.price) - Number(b.price) || (a.platforms?.sort_order ?? 999) - (b.platforms?.sort_order ?? 999));
      const selected = variants.find((variant) => this.variantView(variant)?.available) ?? variants[0];
      return selected ? [this.toCard(row, selected)] : [];
    });
    return { rows, cards };
  }

  private toGenre(row: GenreRow): Genre {
    return { id: row.id, slug: row.slug, name: row.name, sortOrder: row.sort_order, isActive: row.is_active };
  }

  private toTag(row: TagRow): Tag {
    return { id: row.id, slug: row.slug, name: row.name, isActive: row.is_active };
  }

  private toFamily(row: PlatformFamilyRow): PlatformFamily {
    return { id: row.id, slug: platformSlug(row.slug), name: row.name, sortOrder: row.sort_order, isActive: row.is_active };
  }

  private toPlatform(row: PlatformRow): Platform {
    return { id: row.id, familyId: row.family_id, slug: row.slug, name: row.name, sortOrder: row.sort_order, isActive: row.is_active };
  }

  private toCollection(row: CollectionRow): Collection {
    return { id: row.id, slug: row.slug, name: row.name, type: row.type, isActive: row.is_active, startAt: row.start_at, endAt: row.end_at, sortOrder: row.sort_order };
  }

  private toSection(row: Record<string, unknown>): SiteSection {
    const path = (value: unknown) => {
      const text = String(value ?? "");
      return text && !text.startsWith("/") ? this.mediaUrl("public-media", text) : text;
    };
    return {
      id: String(row.id),
      key: String(row.key) as SiteSectionKey,
      eyebrow: String(row.eyebrow ?? ""),
      title: String(row.title ?? ""),
      highlightedText: String(row.highlighted_text ?? ""),
      description: String(row.description ?? ""),
      mediaPath: path(row.media_path),
      posterPath: path(row.poster_path),
      mediaAlt: String(row.media_alt ?? ""),
      ctaLabel: String(row.cta_label ?? ""),
      ctaUrl: String(row.cta_url ?? ""),
      isVisible: Boolean(row.is_visible),
      sortOrder: Number(row.sort_order ?? 0),
    };
  }

  private toMood(row: MoodRow): RecommendationMood {
    return {
      id: row.id,
      slug: row.slug,
      label: row.label,
      tagIds: (row.recommendation_mood_tags ?? []).map((link) => link.tag_id),
      genreIds: (row.recommendation_mood_genres ?? []).map((link) => link.genre_id),
      platformFamilyId: row.platform_family_id,
      maxPrice: numeric(row.max_price),
      sortMode: row.sort_mode,
      maxResults: row.max_results,
      isActive: row.is_active,
    };
  }

  async getGames(): Promise<Game[]> {
    const rows = await this.rows<GameRow[]>("games", this.client.from("games").select("id,slug,title,short_description,description,is_published,created_at,updated_at").eq("is_published", true).order("title"));
    return rows.map((row) => this.toGame(row));
  }

  async getGameBySlug(slug: string): Promise<Game | null> {
    const { data, error } = await this.client.from("games").select("id,slug,title,short_description,description,is_published,created_at,updated_at").eq("slug", slug).eq("is_published", true).maybeSingle();
    if (error) throw new Error(`Supabase games por slug falló (${error.code}): ${error.message}`);
    return data ? this.toGame(data as unknown as GameRow) : null;
  }

  async getGameVariants(gameId?: string): Promise<GameVariant[]> {
    let query = this.client.from("game_variants").select("id,game_id,platform_id,version_label,account_type,price,compare_at_price,availability,release_date,new_until,stock_quantity,is_active,created_at,updated_at").eq("is_active", true);
    if (gameId) query = query.eq("game_id", gameId);
    const rows = await this.rows<Omit<JoinedVariant, "platforms">[]>("game_variants", query.order("created_at"));
    return rows.map((row) => this.toVariant(row as JoinedVariant));
  }

  async getCollections(): Promise<Collection[]> {
    const rows = await this.rows<CollectionRow[]>("collections", this.client.from("collections").select("id,slug,name,type,is_active,start_at,end_at,sort_order").eq("is_active", true).order("sort_order"));
    return rows.map((row) => this.toCollection(row));
  }

  async getCollectionItems(collectionId?: string): Promise<CollectionItem[]> {
    let query = this.client.from("collection_items").select("collection_id,game_variant_id,position");
    if (collectionId) query = query.eq("collection_id", collectionId);
    const rows = await this.rows<CollectionItemRow[]>("collection_items", query.order("position"));
    return rows.map((row) => ({ collectionId: row.collection_id, gameVariantId: row.game_variant_id, position: row.position }));
  }

  async getSiteSettings(): Promise<SiteSettings> {
    const { data, error } = await this.client.from("site_settings").select("brand_name,country,currency,logo_path,whatsapp_number,facebook_url,youtube_url,email,analytics_id").eq("id", 1).maybeSingle();
    if (error) throw new Error(`Supabase site_settings falló (${error.code}): ${error.message}`);
    if (!data) throw new Error("Supabase no tiene site_settings.id=1. Aplica supabase/seed.sql en desarrollo o crea la configuración del sitio.");
    const settings = fromSiteSettings(data as unknown as Record<string, unknown>);
    if (settings.logoPath && !settings.logoPath.startsWith("/")) settings.logoPath = this.mediaUrl("public-media", settings.logoPath);
    return settings;
  }

  async getTestimonials(): Promise<Testimonial[]> {
    const rows = await this.rows<(Record<string, unknown> & { platform_families: { id: string } | null })[]>("testimonials", this.client.from("testimonials").select("id,alias,text,platform_family_id,source,date,rating,consented_at,published,sort_order,platform_families(id)").eq("published", true).not("consented_at", "is", null).order("sort_order"));
    return rows.map((row) => ({
      id: String(row.id), alias: String(row.alias), text: String(row.text),
      platformFamilyId: row.platform_family_id ? String(row.platform_family_id) : null,
      source: row.source ? String(row.source) : null,
      date: row.date ? String(row.date) : null,
      rating: row.rating === null ? null : Number(row.rating),
      consentedAt: row.consented_at ? String(row.consented_at) : null,
      published: Boolean(row.published), sortOrder: Number(row.sort_order),
    }));
  }

  async getGenres(): Promise<Genre[]> {
    const rows = await this.rows<GenreRow[]>("genres", this.client.from("genres").select("id,slug,name,sort_order,is_active").eq("is_active", true).order("sort_order"));
    return rows.map((row) => this.toGenre(row));
  }

  async getTags(): Promise<Tag[]> {
    const rows = await this.rows<TagRow[]>("tags", this.client.from("tags").select("id,slug,name,is_active").eq("is_active", true).order("name"));
    return rows.map((row) => this.toTag(row));
  }

  async getPlatforms(): Promise<{ families: PlatformFamily[]; platforms: Platform[] }> {
    const [familyRows, platformRows] = await Promise.all([
      this.rows<PlatformFamilyRow[]>("platform_families", this.client.from("platform_families").select("id,slug,name,sort_order,is_active").eq("is_active", true).order("sort_order")),
      this.rows<PlatformRow[]>("platforms", this.client.from("platforms").select("id,family_id,slug,name,sort_order,is_active").eq("is_active", true).order("sort_order")),
    ]);
    return { families: familyRows.map((row) => this.toFamily(row)), platforms: platformRows.map((row) => this.toPlatform(row)) };
  }

  async getSections(): Promise<SiteSection[]> {
    const rows = await this.rows<Record<string, unknown>[]>("site_sections", this.client.from("site_sections").select("id,key,eyebrow,title,highlighted_text,description,media_path,poster_path,media_alt,cta_label,cta_url,is_visible,sort_order").eq("is_visible", true).order("sort_order"));
    return rows.map((row) => this.toSection(row));
  }

  async getRecommendationMoods(): Promise<RecommendationMood[]> {
    const rows = await this.rows<MoodRow[]>("recommendation_moods", this.client.from("recommendation_moods").select("id,slug,label,platform_family_id,max_price,sort_mode,max_results,is_active,sort_order,recommendation_mood_tags(tag_id),recommendation_mood_genres(genre_id)").eq("is_active", true).order("sort_order"));
    return rows.map((row) => this.toMood(row));
  }

  private testimonialView(row: Testimonial, families: PlatformFamily[]): TestimonialViewModel {
    return {
      id: row.id,
      alias: row.alias,
      quote: row.text,
      platform: families.find((family) => family.id === row.platformFamilyId)?.name ?? "",
      date: row.date ?? undefined,
      origin: row.source ?? undefined,
      rating: row.rating ?? undefined,
    };
  }

  private recommendationViews(moods: RecommendationMood[], rows: GameRow[], cards: CatalogCard[]): RecommendationMoodView[] {
    return moods.filter((mood) => mood.isActive).map((mood) => {
      const candidates = rows.flatMap((row) => {
        const variants = (row.game_variants ?? []).filter((variant) => {
          const view = this.variantView(variant);
          if (!view?.available) return false;
          if (mood.platformFamilyId && variant.platforms?.family_id !== mood.platformFamilyId) return false;
          if (mood.maxPrice !== null && Number(variant.price) > mood.maxPrice) return false;
          const linkedGenres = row.game_genres.map((link) => link.genre_id);
          const linkedTags = row.game_tags.map((link) => link.tag_id);
          if (mood.genreIds.length && !mood.genreIds.some((id) => linkedGenres.includes(id))) return false;
          if (mood.tagIds.length && !mood.tagIds.some((id) => linkedTags.includes(id))) return false;
          return true;
        }).sort((a, b) => Number(a.price) - Number(b.price) || (a.platforms?.sort_order ?? 999) - (b.platforms?.sort_order ?? 999));
        const variant = variants[0];
        const card = cards.find((candidate) => candidate.gameId === row.id);
        return variant && card ? [{ row, variant, card }] : [];
      });
      candidates.sort((a, b) => {
        if (mood.sortMode === "price_asc") return Number(a.variant.price) - Number(b.variant.price) || a.row.title.localeCompare(b.row.title);
        if (mood.sortMode === "newest") return b.row.created_at.localeCompare(a.row.created_at) || a.row.title.localeCompare(b.row.title);
        return a.row.title.localeCompare(b.row.title) || a.row.slug.localeCompare(b.row.slug);
      });
      const recommended = candidates.slice(0, mood.maxResults).flatMap(({ row, variant, card }) => {
        try { return [this.toCard(row, variant, card.featured)]; } catch { return []; }
      });
      return { id: mood.id, label: mood.label, games: recommended };
    });
  }

  private portals(cards: CatalogCard[]): HomePortal[] {
    const definitions = [
      { id: "playstation", title: "PlayStation", copy: "Juegos para PS4 y PS5.", image: "/assets/featured-spider-v1.webp", href: "/catalogo?plataforma=PlayStation", family: "playstation" as const },
      { id: "xbox", title: "Xbox", copy: "Series X|S y Xbox One.", image: "/assets/featured-halo-v1.webp", href: "/catalogo?plataforma=Xbox", family: "xbox" as const },
      { id: "nintendo", title: "Nintendo", copy: "Switch y Switch 2.", image: "/assets/featured-zelda-v1.webp", href: "/catalogo?plataforma=Nintendo", family: "nintendo" as const },
    ];
    return [
      ...definitions.map((item) => ({
        id: item.id, title: item.title, copy: item.copy, image: cards.find((card) => card.variants.some((variant) => variant.available && variant.platformFamilySlug === item.family))?.cover ?? item.image,
        href: item.href, accent: platformTheme[item.title as keyof typeof platformTheme].accent,
        count: cards.filter((card) => card.variants.some((variant) => variant.available && variant.platformFamilySlug === item.family)).length,
      })),
      { id: "all", title: "Catálogo completo", copy: "Explora todos los juegos.", image: "/assets/featured-forza-v1.webp", href: "/catalogo", accent: platformTheme.Todos.accent, count: cards.filter((card) => card.variants.some((variant) => variant.available)).length, collage: true },
    ];
  }

  private collectionCards(collectionSlug: string, collectionId: string | undefined, rows: GameRow[], items: CollectionItem[], badge?: string): CatalogCard[] {
    if (!collectionId) return [];
    const collection = items
      .filter((item) => item.collectionId === collectionId)
      .sort((a, b) => a.position - b.position);
    return collection.flatMap((item) => {
      const row = rows.find((candidate) => candidate.game_variants.some((variant) => variant.id === item.gameVariantId));
      const variant = row?.game_variants.find((candidate) => candidate.id === item.gameVariantId && candidate.is_active);
      const isUpcoming = collectionSlug === "upcoming";
      if (!row || !variant || (isUpcoming ? !["upcoming", "preorder"].includes(variant.availability) : variant.availability !== "available")) return [];
      try { return [this.toCard(row, variant, collectionSlug === "featured", badge)]; } catch { return []; }
    });
  }

  async getHomePageData(): Promise<HomePageData> {
    const [base, settings, sections, genres, platformData, tags, collections, itemRows, moods, testimonials] = await Promise.all([
      this.getCatalogCards(), this.getSiteSettings(), this.getSections(), this.getGenres(), this.getPlatforms(),
      this.getTags(), this.getCollections(), this.getCollectionItems(), this.getRecommendationMoods(), this.getTestimonials(),
    ]);
    const items = itemRows.map((item) => item);
    const collectionId = (slug: string) => collections.find((collection) => collection.slug === slug)?.id;
    const featured = this.collectionCards("featured", collectionId("featured"), base.rows, items).filter((card): card is FeaturedCard => card.featured);
    const bestsellers = this.collectionCards("best-sellers", collectionId("best-sellers"), base.rows, items, "Más vendido")
      .map((card, index) => ({ ...card, rank: index + 1 } satisfies BestsellerItem));
    const offers = this.collectionCards("featured-offers", collectionId("featured-offers"), base.rows, items, "Oferta")
      .filter((card) => card.oldPrice !== null && card.oldPrice > card.price);
    const upcoming = this.collectionCards("upcoming", collectionId("upcoming"), base.rows, items).map((card): UpcomingItem => ({
      id: card.gameId,
      title: card.title,
      platform: card.platform,
      status: card.variants.find((variant) => variant.id === card.variantId)?.availability === "preorder" ? "Preventa" : "Próximamente",
      cover: card.cover,
    }));
    const heroSection = sections.find((section) => section.key === "hero");
    if (!heroSection) throw new Error("Supabase no tiene una sección 'hero' visible en site_sections.");
    const offerSection = sections.find((section) => section.key === "offers");
    const card = base.cards.find((item) => item.available);
    const hero: HomePageData["hero"] = {
      video: heroSection.mediaPath,
      poster: heroSection.posterPath || "/assets/hero-forest-art-poster-v1.jpg",
      eyebrow: heroSection.eyebrow,
      titleLead: heroSection.title,
      titleStrong: heroSection.highlightedText,
      description: heroSection.description,
      featuredTitle: featured[0]?.title ?? card?.title ?? "",
      featuredLabel: "En portada",
    };
    return {
      settings,
      sections,
      games: base.cards,
      genres,
      platformFamilies: platformData.families,
      platforms: platformData.platforms,
      hero,
      recommendationMoods: this.recommendationViews(moods, base.rows, base.cards),
      portals: this.portals(base.cards),
      featured,
      bestsellers,
      offers,
      offerSection: {
        eyebrow: offerSection?.eyebrow ?? "Ofertas",
        titleLead: offerSection?.title ?? "Un buen juego",
        titleStrong: offerSection?.highlightedText ?? "a buen precio.",
        description: offerSection?.description ?? "Consulta disponibilidad y precio.",
        cta: offerSection?.ctaLabel ?? "Consultar ofertas",
      },
      upcoming,
      testimonials: testimonials.map((testimonial) => this.testimonialView(testimonial, platformData.families)),
    };
  }

  async getCatalogPageData(): Promise<CatalogPageData> {
    const [base, settings, sections, genres, platformData, moods, collections, collectionItems] = await Promise.all([
      this.getCatalogCards(), this.getSiteSettings(), this.getSections(), this.getGenres(), this.getPlatforms(), this.getRecommendationMoods(),
      this.getCollections(), this.getCollectionItems(),
    ]);
    const bestsellerCollection = collections.find((collection) => collection.slug === "best-sellers");
    const bestsellerVariants = new Set(collectionItems.filter((item) => item.collectionId === bestsellerCollection?.id).map((item) => item.gameVariantId));
    return {
      settings, sections, games: base.cards.map((card) => ({
        ...card,
        variants: card.variants.map((variant) => ({ ...variant, isBestseller: bestsellerVariants.has(variant.id) })),
      })), genres,
      platformFamilies: platformData.families, platforms: platformData.platforms,
      recommendationMoods: this.recommendationViews(moods, base.rows, base.cards),
    };
  }

  async getHowPageData(): Promise<HowPageData> {
    const [settings, sections] = await Promise.all([this.getSiteSettings(), this.getSections()]);
    return { settings, sections };
  }
}
