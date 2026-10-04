import { defineConfig, envField } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  session: false,
  env: {
    schema: {
      DATA_SOURCE: envField.enum({ context: "server", access: "secret", values: ["json", "supabase"], default: "json" }),
      // PUBLIC_* is Supabase's key name; Astro keeps these runtime-only because the app reads them server-side.
      PUBLIC_SUPABASE_URL: envField.string({ context: "server", access: "secret", optional: true }),
      PUBLIC_SUPABASE_PUBLISHABLE_KEY: envField.string({ context: "server", access: "secret", optional: true }),
    },
  },
  integrations: [react()],
  // Keep PUBLIC_SUPABASE_* available only through astro:env/server at runtime;
  // the frontend does not consume custom Vite environment variables.
  vite: { envPrefix: "VITE_", plugins: [tailwindcss()] },
});
