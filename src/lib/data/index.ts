import type { RockGamesRepository } from "./repository";
import { JsonRepository } from "./json-repository";
import { DATA_SOURCE } from "astro:env/server";

const source = DATA_SOURCE;

async function createRepository(): Promise<RockGamesRepository> {
  if (source === "json") return new JsonRepository();
  if (source === "supabase") {
    const { SupabaseRepository } = await import("./supabase-repository");
    return new SupabaseRepository();
  }
  throw new Error(`DATA_SOURCE no reconocido: ${String(source)}. Usa json o supabase.`);
}

const repositoryPromise = createRepository();
const withRepository = async <T>(operation: (repository: RockGamesRepository) => Promise<T>) => operation(await repositoryPromise);

export const getGames = () => withRepository((repository) => repository.getGames());
export const getGameBySlug = (slug: string) => withRepository((repository) => repository.getGameBySlug(slug));
export const getGameVariants = (gameId?: string) => withRepository((repository) => repository.getGameVariants(gameId));
export const getCollections = () => withRepository((repository) => repository.getCollections());
export const getCollectionItems = (collectionId?: string) => withRepository((repository) => repository.getCollectionItems(collectionId));
export const getSiteSettings = () => withRepository((repository) => repository.getSiteSettings());
export const getTestimonials = () => withRepository((repository) => repository.getTestimonials());
export const getGenres = () => withRepository((repository) => repository.getGenres());
export const getTags = () => withRepository((repository) => repository.getTags());
export const getPlatforms = () => withRepository((repository) => repository.getPlatforms());
export const getSections = () => withRepository((repository) => repository.getSections());
export const getRecommendationMoods = () => withRepository((repository) => repository.getRecommendationMoods());
export const getHomePageData = () => withRepository((repository) => repository.getHomePageData());
export const getCatalogPageData = () => withRepository((repository) => repository.getCatalogPageData());
export const getHowPageData = () => withRepository((repository) => repository.getHowPageData());

export type { RockGamesRepository } from "./repository";
export type * from "./contracts";
export type * from "./view-models";
