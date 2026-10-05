export type AvailabilityStatus = "upcoming" | "preorder" | "available" | "unavailable";
export type AccountType = "primary" | "secondary";
export type CollectionType = "placement" | "campaign";
export type RecommendationSort = "editorial" | "price_asc" | "newest";
export type MediaRole = "cover" | "hero" | "gallery" | "poster" | "video";

export interface PlatformFamily {
  id: string;
  slug: "playstation" | "xbox" | "nintendo";
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Platform {
  id: string;
  familyId: PlatformFamily["id"];
  slug: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Game {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * The JSON adapter allows a null platformId for the current aggregate labels
 * "PlayStation" and "Xbox". Real Supabase variants will require a platform FK.
 */
export interface GameVariant {
  id: string;
  gameId: Game["id"];
  platformId: Platform["id"] | null;
  /** Null only for legacy JSON rows without a confirmed commercial modality. */
  accountType: AccountType | null;
  legacyPlatformLabel?: string;
  versionLabel: string | null;
  price: number;
  compareAtPrice: number | null;
  availability: AvailabilityStatus;
  releaseDate: string | null;
  newUntil: string | null;
  stockQuantity: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Genre {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Tag {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
}

export interface Collection {
  id: string;
  slug: string;
  name: string;
  type: CollectionType;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
  sortOrder: number;
}

export interface CollectionItem {
  collectionId: Collection["id"];
  gameVariantId: GameVariant["id"];
  position: number;
}

export interface Testimonial {
  id: string;
  alias: string;
  text: string;
  platformFamilyId: PlatformFamily["id"] | null;
  source: string | null;
  date: string | null;
  rating: number | null;
  consentedAt: string | null;
  published: boolean;
  sortOrder: number;
}

export interface SiteSettings {
  brandName: string;
  country: string;
  currency: string;
  logoPath: string;
  whatsappNumber: string;
  socialLinks: { facebook: string; youtube: string };
  email: string;
  analyticsId: string;
}

export type SiteSectionKey =
  | "hero"
  | "platforms"
  | "featured"
  | "best_sellers"
  | "offers"
  | "upcoming"
  | "how_it_works"
  | "trust"
  | "testimonials"
  | "final_cta";

export interface SiteSection {
  id: string;
  key: SiteSectionKey;
  eyebrow: string;
  title: string;
  highlightedText: string;
  description: string;
  mediaPath: string;
  posterPath: string;
  mediaAlt: string;
  ctaLabel: string;
  ctaUrl: string;
  isVisible: boolean;
  sortOrder: number;
}

export interface RecommendationMood {
  id: string;
  slug: string;
  label: string;
  tagIds: Tag["id"][];
  genreIds: Genre["id"][];
  platformFamilyId: PlatformFamily["id"] | null;
  maxPrice: number | null;
  sortMode: RecommendationSort;
  maxResults: number;
  isActive: boolean;
  /** Temporary JSON-only curation, retained until rules replace it. */
  gameIds?: string[];
}

export interface LegacyUpcomingItem {
  id: string;
  title: string;
  platform: string;
  status: string;
  cover: string;
}

export interface OfferSectionContent {
  eyebrow: string;
  titleLead: string;
  titleStrong: string;
  description: string;
  cta: string;
}
