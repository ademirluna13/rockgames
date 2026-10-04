export const platformNames = ["Todos", "PlayStation", "Xbox", "Nintendo"] as const;
export type PlatformFilter = (typeof platformNames)[number];
type GamePlatform = "Nintendo Switch" | "Nintendo Switch 2";

type Theme = { accent: string; border: string; glow: string; badge: string; ambient: string; slug: string; short: string };

export const platformTheme: Record<PlatformFilter | GamePlatform, Theme> = {
  Todos: { accent: "#b7f34a", border: "#b7f34a", glow: "#b7f34a20", badge: "#15200f", ambient: "#182414", slug: "all", short: "Todos" },
  PlayStation: { accent: "#5c9dff", border: "#79aeff", glow: "#5c9dff1c", badge: "#10223c", ambient: "#101b2d", slug: "playstation", short: "PlayStation" },
  Xbox: { accent: "#82d86a", border: "#9be57f", glow: "#82d86a1c", badge: "#152817", ambient: "#14251a", slug: "xbox", short: "Xbox" },
  Nintendo: { accent: "#ff6b68", border: "#ff827a", glow: "#ff6b681b", badge: "#351719", ambient: "#2a1518", slug: "nintendo", short: "Nintendo" },
  "Nintendo Switch": { accent: "#ff6b68", border: "#ff827a", glow: "#ff6b681b", badge: "#351719", ambient: "#2a1518", slug: "switch", short: "Switch" },
  "Nintendo Switch 2": { accent: "#e95b69", border: "#f27c87", glow: "#e95b691a", badge: "#2c121b", ambient: "#24121b", slug: "switch-2", short: "Switch 2" },
};

export function platformBrand(platform: string): Exclude<PlatformFilter, "Todos"> | GamePlatform {
  if (platform.startsWith("PlayStation")) return "PlayStation";
  if (platform.startsWith("Xbox")) return "Xbox";
  if (platform === "Nintendo Switch 2") return "Nintendo Switch 2";
  if (platform === "Nintendo Switch") return "Nintendo Switch";
  return "Nintendo";
}

export function themeForPlatform(platform: string): Theme {
  return platformTheme[platformBrand(platform)];
}
