import { defineConfig, envField } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  env: {
    schema: {
      DATA_SOURCE: envField.enum({ context: "server", access: "secret", values: ["json", "supabase"], default: "json" }),
      PUBLIC_SUPABASE_URL: envField.string({ context: "server", access: "public", optional: true }),
      PUBLIC_SUPABASE_PUBLISHABLE_KEY: envField.string({ context: "server", access: "public", optional: true }),
    },
  },
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
