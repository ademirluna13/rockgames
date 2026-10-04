import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Faltan PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_PUBLISHABLE_KEY.");

const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const tables = [
  "platform_families", "platforms", "games", "game_variants", "genres",
  "game_genres", "tags", "game_tags", "collections", "collection_items",
  "recommendation_moods", "recommendation_mood_tags", "recommendation_mood_genres",
  "testimonials", "site_settings", "site_sections", "game_media",
];

for (const table of tables) {
  const { error } = await client.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`SELECT anon falló en ${table}: ${error.code} ${error.message}`);
}
console.log(`SELECT anon: OK en ${tables.length} tablas`);

const probeId = randomUUID();
const writes = [
  ["INSERT", () => client.from("games").insert({ id: probeId, slug: `rls-probe-${probeId}`, title: "RLS probe", is_published: false })],
  ["UPDATE", () => client.from("games").update({ title: "RLS probe" }).eq("id", probeId)],
  ["DELETE", () => client.from("games").delete().eq("id", probeId)],
];

for (const [verb, operation] of writes) {
  const { error } = await operation();
  if (!error) throw new Error(`${verb} anon no fue rechazado; detén la integración y revisa grants/RLS.`);
  console.log(`${verb} anon: rechazado (${error.code ?? "sin código"})`);
}

const png = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=",
  "base64",
));
const path = `security-probes/${probeId}.png`;
const upload = await client.storage.from("public-media").upload(path, png, { contentType: "image/png", upsert: false });
if (!upload.error) throw new Error("Upload anon fue aceptado; detén la integración y revisa Storage RLS.");
console.log(`Storage upload anon: rechazado (${upload.error.statusCode ?? "sin código"})`);

const existingPath = process.argv[2];
if (existingPath) {
  const publicUrl = client.storage.from("public-media").getPublicUrl(existingPath).data.publicUrl;
  const response = await fetch(publicUrl);
  if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
    throw new Error(`Storage read público falló (${response.status}).`);
  }
  console.log(`Storage read público: OK (${response.status})`);

  const update = await client.storage.from("public-media").update(existingPath, png, { contentType: "image/png" });
  if (!update.error) throw new Error("Storage update anon fue aceptado; revisa Storage RLS.");
  console.log(`Storage update anon: rechazado (${update.error.statusCode ?? "sin código"})`);

  const deletion = await client.storage.from("public-media").remove([existingPath]);
  if (deletion.error) {
    console.log(`Storage delete anon: rechazado (${deletion.error.statusCode ?? "sin código"})`);
  } else {
    if (!Array.isArray(deletion.data) || deletion.data.length !== 0) {
      throw new Error("Storage delete anon devolvió objetos borrados; revisa Storage RLS.");
    }
    const stillPublic = await fetch(publicUrl, { cache: "no-store" });
    if (!stillPublic.ok) throw new Error("Storage delete anon parece haber eliminado el objeto.");
    console.log("Storage delete anon: sin efecto (respuesta vacía; objeto sigue accesible)");
  }
}
