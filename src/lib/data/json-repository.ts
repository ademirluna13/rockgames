import site from "../../data/site.json";
import { platformTheme } from "../platforms";
import type {
  Collection,
  CollectionItem,
  Game,
  GameVariant,
  Genre,
  Platform,
  PlatformFamily,
  RecommendationMood,
  SiteSection,
  SiteSettings,
  Tag,
  Testimonial,
} from "./contracts";
import type { RockGamesRepository } from "./repository";
import type {
  CatalogCard,
  CatalogPageData,
  FeaturedCard,
  HomePageData,
  HomePortal,
  HowPageData,
  RecommendationMoodView,
  TestimonialViewModel,
  UpcomingItem,
  CatalogVariant,
} from "./view-models";

type LegacyGame = (typeof site.games)[number];
type LegacyTestimonial = {
  id: string;
  alias: string;
  quote: string;
  platform: string;
  date?: string;
  origin?: string;
  rating?: number;
  avatar?: string;
};

const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const families: PlatformFamily[] = [
  { id: "playstation", slug: "playstation", name: "PlayStation", sortOrder: 1, isActive: true },
  { id: "xbox", slug: "xbox", name: "Xbox", sortOrder: 2, isActive: true },
  { id: "nintendo", slug: "nintendo", name: "Nintendo", sortOrder: 3, isActive: true },
];

const platforms: Platform[] = [
  { id: "ps4", familyId: "playstation", slug: "ps4", name: "PS4", sortOrder: 1, isActive: true },
  { id: "ps5", familyId: "playstation", slug: "ps5", name: "PS5", sortOrder: 2, isActive: true },
  { id: "xbox-one", familyId: "xbox", slug: "xbox-one", name: "Xbox One", sortOrder: 1, isActive: true },
  { id: "xbox-series-xs", familyId: "xbox", slug: "xbox-series-xs", name: "Xbox Series X|S", sortOrder: 2, isActive: true },
  { id: "nintendo-switch", familyId: "nintendo", slug: "nintendo-switch", name: "Nintendo Switch", sortOrder: 1, isActive: true },
  { id: "nintendo-switch-2", familyId: "nintendo", slug: "nintendo-switch-2", name: "Nintendo Switch 2", sortOrder: 2, isActive: true },
];

const familyForLabel = (label: string): PlatformFamily["slug"] => label.startsWith("Nintendo") ? "nintendo" : label === "Xbox" ? "xbox" : "playstation";
const exactPlatformForLabel = (label: string): Platform["id"] | null => {
  if (label === "Nintendo Switch") return "nintendo-switch";
  if (label === "Nintendo Switch 2") return "nintendo-switch-2";
  // The existing JSON only says PlayStation or Xbox; it does not identify generation.
  return null;
};

const gameRows = site.games as LegacyGame[];
const games: Game[] = gameRows.map((row) => ({
  id: row.id,
  slug: row.id,
  title: row.title,
  shortDescription: row.description,
  description: row.description,
  isPublished: true,
}));

const variants: GameVariant[] = gameRows.map((row, index) => ({
  id: `json-variant:${row.id}`,
  gameId: row.id,
  platformId: exactPlatformForLabel(row.platform),
  legacyPlatformLabel: row.platform,
  accountType: null,
  versionLabel: null,
  price: row.price,
  compareAtPrice: row.oldPrice,
  availability: row.available ? "available" : "unavailable",
  releaseDate: null,
  newUntil: null,
  stockQuantity: null,
  isActive: true,
  createdAt: undefined,
  updatedAt: undefined,
}));

const genres: Genre[] = [...new Set(gameRows.map((row) => row.genre))].map((name, index) => ({
  id: `genre:${slugify(name)}`,
  slug: slugify(name),
  name,
  sortOrder: index + 1,
  isActive: true,
}));

const tags: Tag[] = [...new Set(gameRows.map((row) => row.tag))].map((name) => ({
  id: `tag:${slugify(name)}`,
  slug: slugify(name),
  name,
  isActive: true,
}));

const recommendationMoods: RecommendationMood[] = site.recommendationMoods.map((mood) => ({
  id: mood.id,
  slug: mood.id,
  label: mood.label,
  tagIds: [],
  genreIds: [],
  platformFamilyId: null,
  maxPrice: null,
  sortMode: "editorial",
  maxResults: 3,
  isActive: true,
  gameIds: mood.gameIds,
}));
const testimonialRows = site.testimonials as LegacyTestimonial[];

const settings: SiteSettings = {
  brandName: site.brand,
  country: site.country,
  currency: site.currency,
  logoPath: "/assets/rock-games-logo.png",
  whatsappNumber: site.whatsappNumber,
  socialLinks: site.socialLinks,
  email: "",
  analyticsId: site.analyticsId,
};

const sections: SiteSection[] = [
  {
    id: "hero",
    key: "hero",
    eyebrow: site.hero.eyebrow,
    title: site.hero.titleLead,
    highlightedText: site.hero.titleStrong,
    description: site.hero.description,
    mediaPath: site.hero.video,
    posterPath: site.hero.poster,
    mediaAlt: "",
    ctaLabel: "Ver catálogo",
    ctaUrl: "/catalogo",
    isVisible: true,
    sortOrder: 1,
  },
  {
    id: "offers",
    key: "offers",
    eyebrow: site.offer.eyebrow,
    title: site.offer.titleLead,
    highlightedText: site.offer.titleStrong,
    description: site.offer.description,
    mediaPath: "",
    posterPath: "",
    mediaAlt: "",
    ctaLabel: site.offer.cta,
    ctaUrl: "",
    isVisible: true,
    sortOrder: 5,
  },
];

const collectionRecords: Collection[] = [
  { id: "featured", slug: "featured", name: "En portada", type: "placement", isActive: true, startAt: null, endAt: null, sortOrder: 1 },
  { id: "best-sellers", slug: "best-sellers", name: "Más vendidos", type: "placement", isActive: true, startAt: null, endAt: null, sortOrder: 2 },
  { id: "featured-offers", slug: "featured-offers", name: "Ofertas destacadas", type: "placement", isActive: true, startAt: null, endAt: null, sortOrder: 3 },
  { id: "recommended", slug: "recommended", name: "Recomendados", type: "placement", isActive: true, startAt: null, endAt: null, sortOrder: 4 },
  { id: "upcoming", slug: "upcoming", name: "Próximamente", type: "placement", isActive: true, startAt: null, endAt: null, sortOrder: 5 },
];

const itemIdsByCollection: Record<string, string[]> = {
  featured: gameRows.filter((game) => game.featured).map((game) => game.id),
  "best-sellers": site.bestsellerIds,
  "featured-offers": gameRows.filter((game) => game.available && game.oldPrice !== null && game.oldPrice > game.price).slice(0, 2).map((game) => game.id),
  recommended: gameRows.filter((game) => game.tag === "Recomendado").map((game) => game.id),
  // Current upcoming entries are teaser artwork and are not game variants.
  upcoming: [],
};

const collectionItems: CollectionItem[] = collectionRecords.flatMap((collection) =>
  (itemIdsByCollection[collection.id] ?? []).flatMap((gameId, index) => {
    const variant = variants.find((candidate) => candidate.gameId === gameId);
    return variant ? [{ collectionId: collection.id, gameVariantId: variant.id, position: index + 1 }] : [];
  }),
);

const catalogCards: CatalogCard[] = gameRows.map((row) => {
  const genre = genres.find((item) => item.name === row.genre)!;
  const variant = variants.find((item) => item.gameId === row.id)!;
  const familySlug = familyForLabel(row.platform);
  const variantView: CatalogVariant = {
    id: variant.id,
    selectionId: row.id,
    platformId: variant.platformId,
    platform: row.platform,
    platformFamilySlug: familySlug,
    versionLabel: variant.versionLabel,
    accountType: variant.accountType,
    price: variant.price,
    oldPrice: variant.compareAtPrice,
    tag: row.tag,
    isBestseller: site.bestsellerIds.includes(row.id),
    availability: variant.availability,
    available: variant.isActive && variant.availability === "available",
    releaseDate: variant.releaseDate,
    newUntil: variant.newUntil,
  };
  return {
    id: row.id,
    selectionId: row.id,
    gameId: row.id,
    variantId: null,
    accountType: null,
    slug: row.id,
    title: row.title,
    platform: row.platform,
    platformFamilySlug: familySlug,
    variants: [variantView],
    genre: row.genre,
    genres: [row.genre],
    genreIds: [genre.id],
    tagIds: [tags.find((item) => item.name === row.tag)!.id],
    tags: [row.tag],
    description: row.description,
    cover: row.cover,
    featured: row.featured,
    price: variant.price,
    oldPrice: variant.compareAtPrice,
    tag: row.tag,
    art: row.art,
    symbol: row.symbol,
    available: variant.isActive && variant.availability === "available",
  };
});

const moodViews: RecommendationMoodView[] = recommendationMoods.map((mood) => ({
  id: mood.id,
  label: mood.label,
  games: (mood.gameIds ?? []).flatMap((id) => {
    const card = catalogCards.find((candidate) => candidate.id === id && candidate.available);
    return card ? [card] : [];
  }),
}));

const upcoming: UpcomingItem[] = site.upcoming.map((item) => ({
  id: item.id,
  title: item.title,
  platform: item.platform,
  status: item.status,
  cover: item.cover,
}));

const testimonials: Testimonial[] = testimonialRows.map((item, index) => ({
  id: item.id,
  alias: item.alias,
  text: item.quote,
  platformFamilyId: item.platform ? familyForLabel(item.platform) : null,
  source: item.origin ?? null,
  date: item.date ?? null,
  rating: item.rating ?? null,
  consentedAt: null,
  published: true,
  sortOrder: index + 1,
}));

const testimonialViews: TestimonialViewModel[] = testimonialRows.map((item) => ({
  id: item.id,
  alias: item.alias,
  quote: item.quote,
  platform: item.platform,
  date: item.date,
  origin: item.origin,
  rating: item.rating,
}));

function createPortals(): HomePortal[] {
  const portalDefinitions = [
    { id: "playstation", title: "PlayStation", copy: "Juegos para PS4 y PS5.", image: "/assets/featured-spider-v1.webp", href: "/catalogo?plataforma=PlayStation", family: "playstation" as const },
    { id: "xbox", title: "Xbox", copy: "Series X|S y Xbox One.", image: "/assets/featured-halo-v1.webp", href: "/catalogo?plataforma=Xbox", family: "xbox" as const },
    { id: "nintendo", title: "Nintendo", copy: "Switch y Switch 2.", image: "/assets/featured-zelda-v1.webp", href: "/catalogo?plataforma=Nintendo", family: "nintendo" as const },
  ];
  return [
    ...portalDefinitions.map((portal) => ({
      ...portal,
      accent: platformTheme[portal.title as "PlayStation" | "Xbox" | "Nintendo"].accent,
      count: catalogCards.filter((game) => game.available && game.platformFamilySlug === portal.family).length,
    })),
    {
      id: "all",
      title: "Catálogo completo",
      copy: "Explora todos los juegos.",
      image: "/assets/featured-forza-v1.webp",
      href: "/catalogo",
      accent: platformTheme.Todos.accent,
      count: catalogCards.filter((game) => game.available).length,
      collage: true,
    },
  ];
}

export class JsonRepository implements RockGamesRepository {
  async getGames() { return games; }
  async getGameBySlug(slug: string) { return games.find((game) => game.slug === slug) ?? null; }
  async getGameVariants(gameId?: string) { return gameId ? variants.filter((variant) => variant.gameId === gameId) : variants; }
  async getCollections() { return collectionRecords; }
  async getCollectionItems(collectionId?: string) { return collectionId ? collectionItems.filter((item) => item.collectionId === collectionId) : collectionItems; }
  async getSiteSettings() { return settings; }
  async getTestimonials() { return testimonials; }
  async getGenres() { return genres; }
  async getTags() { return tags; }
  async getPlatforms() { return { families, platforms }; }
  async getSections() { return sections; }
  async getRecommendationMoods() { return recommendationMoods; }

  async getHomePageData(): Promise<HomePageData> {
    const featured = catalogCards.filter((game): game is FeaturedCard => game.featured);
    const bestsellers = site.bestsellerIds.flatMap((id, index) => {
      const game = catalogCards.find((candidate) => candidate.id === id && candidate.available);
      return game ? [{ ...game, rank: index + 1 }] : [];
    });
    const offers = catalogCards.filter((game) => game.available && game.oldPrice !== null && game.oldPrice > game.price).slice(0, 2);
    const firstFeatured = featured[0];
    return {
      settings,
      sections,
      games: catalogCards,
      genres,
      platformFamilies: families,
      platforms,
      hero: {
        video: site.hero.video,
        poster: site.hero.poster,
        eyebrow: site.hero.eyebrow,
        titleLead: site.hero.titleLead,
        titleStrong: site.hero.titleStrong,
        description: site.hero.description,
        featuredTitle: site.hero.featuredTitle || firstFeatured?.title || "",
        featuredLabel: site.hero.featuredLabel,
      },
      recommendationMoods: moodViews,
      portals: createPortals(),
      featured,
      bestsellers,
      offers,
      offerSection: site.offer,
      upcoming,
      testimonials: testimonialViews,
    };
  }

  async getCatalogPageData(): Promise<CatalogPageData> {
    return { settings, sections, games: catalogCards, genres, platformFamilies: families, platforms, recommendationMoods: moodViews };
  }

  async getHowPageData(): Promise<HowPageData> {
    return { settings, sections };
  }
}
