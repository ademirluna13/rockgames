import type {
  Collection,
  Game,
  GameVariant,
  Genre,
  OfferSectionContent,
  Platform,
  PlatformFamily,
  RecommendationMood,
  SiteSection,
  SiteSettings,
  Tag,
  Testimonial,
} from "./contracts";

export interface CatalogCard {
  /** Stable UI identity for the game, independent from its platform variants. */
  id: string;
  /** Wishlist identity for the currently selected variant. */
  selectionId: string;
  gameId: Game["id"];
  variantId: GameVariant["id"] | null;
  accountType: GameVariant["accountType"];
  slug: Game["slug"];
  title: Game["title"];
  platform: string;
  platformFamilySlug: PlatformFamily["slug"];
  variants: CatalogVariant[];
  genre: string;
  genres: string[];
  genreIds: Genre["id"][];
  tags: string[];
  tagIds: Tag["id"][];
  description: Game["description"];
  cover: string;
  featured: boolean;
  price: GameVariant["price"];
  oldPrice: GameVariant["compareAtPrice"];
  tag: string;
  art: string;
  symbol: string;
  available: boolean;
}

export interface CatalogVariant {
  id: GameVariant["id"];
  /** JSON preserves the legacy game key; Supabase uses the variant UUID. */
  selectionId: string;
  platformId: GameVariant["platformId"];
  platform: string;
  platformFamilySlug: PlatformFamily["slug"];
  accountType: GameVariant["accountType"];
  versionLabel: GameVariant["versionLabel"];
  price: GameVariant["price"];
  oldPrice: GameVariant["compareAtPrice"];
  tag: string;
  isBestseller?: boolean;
  availability: GameVariant["availability"];
  available: boolean;
  releaseDate: string | null;
  newUntil: string | null;
}

export interface FeaturedCard extends CatalogCard {
  featured: true;
}

export interface BestsellerItem extends CatalogCard {
  rank: number;
}

export interface HomePortal {
  id: string;
  title: string;
  copy: string;
  image: string;
  href: string;
  accent: string;
  count: number;
  collage?: boolean;
}

export interface UpcomingItem {
  id: string;
  title: string;
  platform: string;
  status: string;
  cover: string;
}

export interface RecommendationMoodView {
  id: RecommendationMood["id"];
  label: RecommendationMood["label"];
  games: CatalogCard[];
}

export interface HeroViewModel {
  video: string;
  poster: string;
  eyebrow: string;
  titleLead: string;
  titleStrong: string;
  description: string;
  featuredTitle: string;
  featuredLabel: string;
}

export interface TestimonialViewModel {
  id: Testimonial["id"];
  alias: Testimonial["alias"];
  quote: Testimonial["text"];
  platform: string;
  date?: string;
  origin?: string;
  rating?: number;
}

export interface SitePageData {
  settings: SiteSettings;
  sections: SiteSection[];
  games: CatalogCard[];
  genres: Genre[];
  platformFamilies: PlatformFamily[];
  platforms: Platform[];
}

export interface HomePageData extends SitePageData {
  hero: HeroViewModel;
  recommendationMoods: RecommendationMoodView[];
  portals: HomePortal[];
  featured: FeaturedCard[];
  bestsellers: BestsellerItem[];
  offers: CatalogCard[];
  offerSection: OfferSectionContent;
  upcoming: UpcomingItem[];
  testimonials: TestimonialViewModel[];
}

export interface CatalogPageData extends SitePageData {
  recommendationMoods: RecommendationMoodView[];
}

export interface HowPageData {
  settings: SiteSettings;
  sections: SiteSection[];
}

export const isFeaturedCard = (card: CatalogCard): card is FeaturedCard => card.featured;

export function withCatalogVariant(card: CatalogCard, variant: CatalogVariant): CatalogCard {
  return {
    ...card,
    selectionId: variant.selectionId,
    variantId: variant.id,
    accountType: variant.accountType,
    platform: variant.platform,
    platformFamilySlug: variant.platformFamilySlug,
    price: variant.price,
    oldPrice: variant.oldPrice,
    tag: variant.tag,
    available: variant.available,
  };
}
