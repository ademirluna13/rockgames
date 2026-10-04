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
import type { CatalogPageData, HomePageData, HowPageData } from "./view-models";

export interface RockGamesRepository {
  getGames(): Promise<Game[]>;
  getGameBySlug(slug: string): Promise<Game | null>;
  getGameVariants(gameId?: Game["id"]): Promise<GameVariant[]>;
  getCollections(): Promise<Collection[]>;
  getCollectionItems(collectionId?: Collection["id"]): Promise<CollectionItem[]>;
  getSiteSettings(): Promise<SiteSettings>;
  getTestimonials(): Promise<Testimonial[]>;
  getGenres(): Promise<Genre[]>;
  getTags(): Promise<Tag[]>;
  getPlatforms(): Promise<{ families: PlatformFamily[]; platforms: Platform[] }>;
  getSections(): Promise<SiteSection[]>;
  getRecommendationMoods(): Promise<RecommendationMood[]>;
  getHomePageData(): Promise<HomePageData>;
  getCatalogPageData(): Promise<CatalogPageData>;
  getHowPageData(): Promise<HowPageData>;
}
